//
//  MineSmoothKit.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Smoothness infrastructure for the Abandoned Mine: frame monitoring with
//  automatic quality scaling, a spatial hash for fast block queries,
//  a coalescing notification queue, chunk streaming hints, a session stat
//  tracker, and a guided tutorial. Dependency-free (Foundation + SwiftUI).
//
//  All types are standalone: the manager owns them and forwards a few
//  one-line hooks per loop. Nothing here can kill the player.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Quality levels
// ============================================================

/// Render-quality ladder. Auto mode slides down when frames sag and climbs
/// back up when headroom returns. Manual override sticks until re-autoed.
enum MineQualityLevel: String, CaseIterable {
    case potato, smooth, balanced, ultra

    var title: String {
        switch self {
        case .potato: return "Potato 🥔"
        case .smooth: return "Smooth 🧈"
        case .balanced: return "Balanced ⚖️"
        case .ultra: return "Ultra ✨"
        }
    }

    var detail: String {
        switch self {
        case .potato: return "Max FPS. No mist, tiny particles, short view."
        case .smooth: return "High FPS. Light mist, small particles."
        case .balanced: return "Default. Full mist, normal particles."
        case .ultra: return "Everything on. Long view, rich particles."
        }
    }

    /// Block streaming radius (world units) around the player.
    var viewDistance: Float {
        switch self {
        case .potato: return 8
        case .smooth: return 11
        case .balanced: return 14
        case .ultra: return 20
        }
    }

    /// Particle counts scale by this factor.
    var particleScale: Double {
        switch self {
        case .potato: return 0.3
        case .smooth: return 0.6
        case .balanced: return 1.0
        case .ultra: return 1.5
        }
    }

    /// Ambient mist puffs.
    var mistCount: Int {
        switch self {
        case .potato: return 0
        case .smooth: return 4
        case .balanced: return 8
        case .ultra: return 14
        }
    }

    /// Cap on live ambient bats.
    var batCap: Int {
        switch self {
        case .potato: return 2
        case .smooth: return 4
        case .balanced: return 7
        case .ultra: return 12
        }
    }

    var stepDown: MineQualityLevel? {
        switch self {
        case .potato: return nil
        case .smooth: return .potato
        case .balanced: return .smooth
        case .ultra: return .balanced
        }
    }

    var stepUp: MineQualityLevel? {
        switch self {
        case .potato: return .smooth
        case .smooth: return .balanced
        case .balanced: return .ultra
        case .ultra: return nil
        }
    }
}

// ============================================================
// MARK: - 2. Frame monitor with auto quality
// ============================================================

/// Rolling frame monitor. Feed it `dt` once per display-link tick; it
/// publishes smoothed FPS plus a quality recommendation. Hysteresis keeps
/// it from flapping between levels.
final class MineFrameMonitor: ObservableObject {
    @Published private(set) var fps: Double = 60
    @Published private(set) var quality: MineQualityLevel = .balanced
    @Published private(set) var hitches: Int = 0
    @Published private(set) var totalFrames: Int = 0
    @Published var autoQuality: Bool = true
    @Published var manualQuality: MineQualityLevel = .balanced

    private var ema: Double = 1.0 / 60.0
    private var lowTime: Double = 0
    private var highTime: Double = 0
    private var lastQualityChange: Date = .distantPast

    /// Smoothed FPS target bands.
    private let lowBand = 42.0
    private let highBand = 57.0
    private let lowHold = 2.5
    private let highHold = 8.0
    private let cooldown = 5.0

    func recordFrame(dt: Double) {
        guard dt > 0, dt < 1 else { return }
        totalFrames += 1
        // Exponential moving average of frame time (alpha ~ 1/30).
        ema += (dt - ema) * 0.033
        fps = 1.0 / max(ema, 1.0 / 240.0)
        if dt > 1.0 / 30.0 { hitches += 1 }
        guard autoQuality else {
            if quality != manualQuality { quality = manualQuality }
            return
        }
        let sinceChange = Date().timeIntervalSince(lastQualityChange)
        if fps < lowBand {
            lowTime += dt
            highTime = 0
        } else if fps > highBand {
            highTime += dt
            lowTime = 0
        } else {
            lowTime = 0
            highTime = 0
        }
        guard sinceChange > cooldown else { return }
        if lowTime >= lowHold, let down = quality.stepDown {
            quality = down
            lowTime = 0
            lastQualityChange = Date()
        } else if highTime >= highHold, let up = quality.stepUp {
            quality = up
            highTime = 0
            lastQualityChange = Date()
        }
    }

    func pin(_ level: MineQualityLevel) {
        autoQuality = false
        manualQuality = level
        quality = level
    }

    func resumeAuto() {
        autoQuality = true
        lowTime = 0
        highTime = 0
    }

    func reset() {
        ema = 1.0 / 60.0
        fps = 60
        hitches = 0
        totalFrames = 0
        lowTime = 0
        highTime = 0
    }

    var grade: String {
        if fps >= 55 { return "Buttery 🧈" }
        if fps >= 42 { return "Playable 🙂" }
        if fps >= 28 { return "Choppy 🌊" }
        return "Slideshow 📽️"
    }
}

// ============================================================
// MARK: - 3. Spatial hash for block queries
// ============================================================

/// Uniform-grid index over block positions so tap/mining queries stop
/// scanning the whole array. Cell size 2 world units. Rebuild when the
/// block list changes; otherwise it is pure query.
struct MineSpatialHash {
    private var buckets: [Int64: [Int]] = [:]
    private var builtForCount: Int = -1
    private var builtForDestroyed: Int = -1
    let cell: Float = 2.0

    private func key(x: Int, y: Int, z: Int) -> Int64 {
        // 21 bits per axis, biased — plenty for a ±60 mine.
        let bx = Int64(x + 512) & 0x1FFFFF
        let by = Int64(y + 512) & 0x1FFFFF
        let bz = Int64(z + 512) & 0x1FFFFF
        return (bx << 42) | (by << 21) | bz
    }

    private func cellOf(x: Float, y: Float, z: Float) -> (Int, Int, Int) {
        (Int(floor(x / cell)), Int(floor(y / cell)), Int(floor(z / cell)))
    }

    mutating func rebuild(positions: [(x: Float, y: Float, z: Float, live: Bool)]) {
        buckets.removeAll(keepingCapacity: true)
        for (i, p) in positions.enumerated() where p.live {
            let (cx, cy, cz) = cellOf(x: p.x, y: p.y, z: p.z)
            buckets[key(x: cx, y: cy, z: cz), default: []].append(i)
        }
        builtForCount = positions.count
        builtForDestroyed = positions.filter { !$0.live }.count
    }

    func needsRebuild(total: Int, destroyed: Int) -> Bool {
        total != builtForCount || destroyed != builtForDestroyed
    }

    /// Indices of live blocks whose cells touch the query sphere.
    func query(x: Float, y: Float, z: Float, radius: Float) -> [Int] {
        let r = Int(ceil(radius / cell))
        let (cx, cy, cz) = cellOf(x: x, y: y, z: z)
        var out: [Int] = []
        for dx in -r...r {
            for dy in -r...r {
                for dz in -r...r {
                    if let bucket = buckets[key(x: cx + dx, y: cy + dy, z: cz + dz)] {
                        out.append(contentsOf: bucket)
                    }
                }
            }
        }
        return out
    }

    var bucketCount: Int { buckets.count }
}

// ============================================================
// MARK: - 4. Coalescing notification queue
// ============================================================

/// Notification lines with repeat collapsing ("⛏️ Coal x3") and a hard cap
/// so digging sprees don't flood the HUD. Drop-in helper; the manager can
/// adopt it gradually.
final class MineNotificationQueue: ObservableObject {
    struct Item: Identifiable {
        let id = UUID()
        var text: String
        var count: Int
        var date = Date()
    }

    @Published private(set) var items: [Item] = []
    let maxItems = 30

    /// Push a line. Repeats of the newest line within 4s collapse to ×N.
    func push(_ text: String) {
        let key = fingerprint(text)
        if var last = items.last,
           fingerprint(last.text) == key,
           Date().timeIntervalSince(last.date) < 4 {
            last.count += 1
            last.date = Date()
            last.text = render(text, count: last.count)
            items[items.count - 1] = last
        } else {
            items.append(Item(text: text, count: 1))
        }
        if items.count > maxItems {
            items.removeFirst(items.count - maxItems)
        }
    }

    /// Fingerprint strips trailing numbers so "Coal x2" merges with "Coal".
    private func fingerprint(_ text: String) -> String {
        var s = text
        // Strip a trailing " xN" / "+N🪙" style suffix for merging.
        if let range = s.range(of: #" [x+]\d+.*$"#, options: .regularExpression) {
            s.removeSubrange(range)
        }
        return s
    }

    private func render(_ text: String, count: Int) -> String {
        count <= 1 ? text : "\(text) ×\(count)"
    }

    func clear() { items.removeAll() }

    /// Latest lines for HUD display (already oldest→newest).
    func latest(_ n: Int) -> [Item] { Array(items.suffix(n)) }
}

// ============================================================
// MARK: - 5. Chunk streaming hints
// ============================================================

/// Tracks which 8-unit chunks around the player are "hot" so future work
/// (prefetch, LOD) has one source of truth. Pure value logic, no nodes.
struct MineChunkStreamer {
    private(set) var hotKeys = Set<String>()
    private(set) var centerKey = ""
    private(set) var crossings = 0
    let chunk: Float = 8.0
    let radius = 2

    @discardableResult
    mutating func update(playerX: Float, playerZ: Float) -> Bool {
        let cx = Int(floor(playerX / chunk))
        let cz = Int(floor(playerZ / chunk))
        let key = "\(cx),\(cz)"
        guard key != centerKey else { return false }
        centerKey = key
        crossings += 1
        var next = Set<String>()
        for dx in -radius...radius {
            for dz in -radius...radius {
                next.insert("\(cx + dx),\(cz + dz)")
            }
        }
        hotKeys = next
        return true
    }

    func isHot(chunkX: Int, chunkZ: Int) -> Bool {
        hotKeys.contains("\(chunkX),\(chunkZ)")
    }

    func isHot(x: Float, z: Float) -> Bool {
        isHot(chunkX: Int(floor(x / chunk)), chunkZ: Int(floor(z / chunk)))
    }
}

// ============================================================
// MARK: - 6. Session stat tracker
// ============================================================

/// Everything-counts ledger for the session: swings, breaks, loot by
/// layer, distance, gifts, closets, caves, critters, play time.
final class MineStatTracker: ObservableObject {
    @Published private(set) var swings: Int = 0
    @Published private(set) var blocksBroken: Int = 0
    @Published private(set) var oresBanked: Int = 0
    @Published private(set) var goldEarned: Int = 0
    @Published private(set) var xpEarned: Int = 0
    @Published private(set) var distanceWalked: Double = 0
    @Published private(set) var closetsOpened: Int = 0
    @Published private(set) var cavesHarvested: Int = 0
    @Published private(set) var giftsReceived: Int = 0
    @Published private(set) var crittersMet: Int = 0
    @Published private(set) var bombsThrown: Int = 0
    @Published private(set) var playSeconds: Double = 0
    @Published private(set) var breaksByLayer: [String: Int] = [:]
    @Published private(set) var swingsPerBreak: Double = 0

    private var lastX: Float?
    private var lastZ: Float?

    func tick(dt: Double) {
        playSeconds += dt
    }

    func recordSwing() {
        swings += 1
        updateEfficiency()
    }

    func recordBreak(layer: String, oreUnits: Int, gold: Int, xp: Int) {
        blocksBroken += 1
        oresBanked += oreUnits
        goldEarned += gold
        xpEarned += xp
        breaksByLayer[layer, default: 0] += 1
        updateEfficiency()
    }

    func recordMove(x: Float, z: Float) {
        if let lx = lastX, let lz = lastZ {
            let dx = Double(x - lx), dz = Double(z - lz)
            let d = (dx * dx + dz * dz).squareRoot()
            if d < 5 { distanceWalked += d } // teleport guard
        }
        lastX = x
        lastZ = z
    }

    func recordCloset() { closetsOpened += 1 }
    func recordCave() { cavesHarvested += 1 }
    func recordGift() { giftsReceived += 1 }
    func recordCritter() { crittersMet += 1 }
    func recordBomb() { bombsThrown += 1 }

    private func updateEfficiency() {
        swingsPerBreak = blocksBroken > 0 ? Double(swings) / Double(blocksBroken) : 0
    }

    func reset() {
        swings = 0
        blocksBroken = 0
        oresBanked = 0
        goldEarned = 0
        xpEarned = 0
        distanceWalked = 0
        closetsOpened = 0
        cavesHarvested = 0
        giftsReceived = 0
        crittersMet = 0
        bombsThrown = 0
        playSeconds = 0
        breaksByLayer = [:]
        swingsPerBreak = 0
        lastX = nil
        lastZ = nil
    }

    var playClock: String {
        let m = Int(playSeconds) / 60
        let s = Int(playSeconds) % 60
        return String(format: "%d:%02d", m, s)
    }

    var favoriteLayer: String {
        breaksByLayer.max(by: { $0.value < $1.value })?.key ?? "—"
    }
}

// ============================================================
// MARK: - 7. Tutorial
// ============================================================

/// Twelve-step onboarding. Each step names the action; the view calls
/// `complete(_:)` when it observes the matching event. Skippable, and the
/// done flag persists across launches.
enum MineTutorialStep: Int, CaseIterable {
    case look, move, tapOre, mineFirst, readBackpack, sell
    case forge, layer, closet, pet, sector, free

    var title: String {
        switch self {
        case .look: return "Look around"
        case .move: return "Take a walk"
        case .tapOre: return "Tap a glowing ore"
        case .mineFirst: return "Break your first block"
        case .readBackpack: return "Check your backpack"
        case .sell: return "Sell at the cart"
        case .forge: return "Visit the forge"
        case .layer: return "Go deeper"
        case .closet: return "Open a closet"
        case .pet: return "Hatch a pet"
        case .sector: return "Map a new sector"
        case .free: return "Free miner!"
        }
    }

    var detail: String {
        switch self {
        case .look: return "Drag anywhere to turn the camera. The mine is yours."
        case .move: return "Use the D-pad or tap the floor to walk. Watch the walls slide by."
        case .tapOre: return "Glowing blocks are ore. Tap one to swing your pick."
        case .mineFirst: return "Keep tapping until it cracks. Loot lands in your backpack."
        case .readBackpack: return "The 🎒 meter fills as you dig. Full pack = time to sell."
        case .sell: return "Hit the 💰 button. The surface cart by the entrance pays +25%."
        case .forge: return "Open the ⛏️ panel. Coal buys sharper picks; gold buys bigger packs."
        case .layer: return "Ride the shaft down. Deeper layers pay up to 5× more."
        case .closet: return "Wooden 🚪 crates pop open by hand. Most hold loot… some hold cobwebs."
        case .pet: return "Hatch a mystery egg. Pets boost speed, luck, or gold."
        case .sector: return "Walk into dark map. New sectors pay discovery gold and grow the mine."
        case .free: return "Tutorial done! The Magma Core waits. Nothing down here can hurt you."
        }
    }

    var icon: String {
        switch self {
        case .look: return "👀"
        case .move: return "🚶"
        case .tapOre: return "👆"
        case .mineFirst: return "⛏️"
        case .readBackpack: return "🎒"
        case .sell: return "💰"
        case .forge: return "🔨"
        case .layer: return "🕳️"
        case .closet: return "🚪"
        case .pet: return "🥚"
        case .sector: return "🗺️"
        case .free: return "🎉"
        }
    }
}

final class MineTutorialState: ObservableObject {
    @Published private(set) var step: MineTutorialStep = .look
    @Published private(set) var done: Bool = false
    private let flag = "mineTutorialDone.v1"

    init() {
        done = UserDefaults.standard.bool(forKey: flag)
        if done { step = .free }
    }

    var progress: Double {
        Double(step.rawValue) / Double(MineTutorialStep.allCases.count - 1)
    }

    func complete(_ s: MineTutorialStep) {
        guard !done, s == step else { return }
        advance()
    }

    func advance() {
        guard !done else { return }
        if let next = MineTutorialStep(rawValue: step.rawValue + 1) {
            step = next
            if next == .free { finish() }
        } else {
            finish()
        }
    }

    func skip() { finish() }

    private func finish() {
        done = true
        step = .free
        UserDefaults.standard.set(true, forKey: flag)
    }

    func reset() {
        done = false
        step = .look
        UserDefaults.standard.set(false, forKey: flag)
    }
}

// ============================================================
// MARK: - 8. HUD + panels
// ============================================================

/// Tiny live FPS pill for the corner of the mine HUD.
struct MineFrameBadge: View {
    @ObservedObject var monitor: MineFrameMonitor

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(dot)
                .frame(width: 7, height: 7)
            Text("\(Int(monitor.fps))")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.black.opacity(0.6))
        .cornerRadius(8)
    }

    private var dot: Color {
        if monitor.fps >= 55 { return .green }
        if monitor.fps >= 42 { return .yellow }
        if monitor.fps >= 28 { return .orange }
        return .red
    }
}

/// Performance panel: quality control, frame stats, session ledger.
struct MinePerfPanel: View {
    @ObservedObject var monitor: MineFrameMonitor
    @ObservedObject var stats: MineStatTracker
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🎞️ Frames")) {
                    HStack {
                        Text("Now")
                        Spacer()
                        Text("\(Int(monitor.fps)) FPS • \(monitor.grade)")
                            .font(.subheadline.bold())
                    }
                    HStack {
                        Text("Hitches (>33ms)")
                        Spacer()
                        Text("\(monitor.hitches)").monospacedDigit()
                    }
                    HStack {
                        Text("Frames sampled")
                        Spacer()
                        Text("\(monitor.totalFrames)").monospacedDigit()
                    }
                    HStack {
                        Button("Reset counters") { monitor.reset() }
                            .font(.caption)
                        Spacer()
                        Button("Reset session stats") { stats.reset() }
                            .font(.caption)
                    }
                }
                Section(header: Text("🎚️ Quality")) {
                    Toggle("Auto quality", isOn: $monitor.autoQuality)
                    ForEach(MineQualityLevel.allCases, id: \.self) { level in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(level.title).bold().font(.subheadline)
                                Text(level.detail)
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if monitor.quality == level && monitor.autoQuality {
                                Text("AUTO").font(.caption2.bold()).foregroundColor(.green)
                            } else if !monitor.autoQuality && monitor.manualQuality == level {
                                Text("PINNED").font(.caption2.bold()).foregroundColor(.orange)
                            } else {
                                Button("Pin") { monitor.pin(level) }
                                    .buttonStyle(.bordered)
                                    .controlSize(.small)
                            }
                        }
                    }
                    if !monitor.autoQuality {
                        Button("Resume auto") { monitor.resumeAuto() }
                            .font(.subheadline.bold())
                    }
                }
                Section(header: Text("📊 Session ledger")) {
                    statRow("⏱️ Play time", stats.playClock)
                    statRow("⛏️ Swings", "\(stats.swings)")
                    statRow("🧱 Blocks broken", "\(stats.blocksBroken)")
                    statRow("🎯 Swings per break", String(format: "%.1f", stats.swingsPerBreak))
                    statRow("💎 Ore banked", "\(stats.oresBanked)")
                    statRow("💰 Gold earned", "\(stats.goldEarned)")
                    statRow("⭐ XP earned", "\(stats.xpEarned)")
                    statRow("🚶 Distance", "\(Int(stats.distanceWalked))m")
                    statRow("🚪 Closets opened", "\(stats.closetsOpened)")
                    statRow("🔮 Caves harvested", "\(stats.cavesHarvested)")
                    statRow("🎁 Gifts", "\(stats.giftsReceived)")
                    statRow("📦 Critters met", "\(stats.crittersMet)")
                    statRow("🧨 Bombs thrown", "\(stats.bombsThrown)")
                    statRow("❤️ Favorite layer", stats.favoriteLayer)
                }
                Section(header: Text("📈 Forecast")) {
                    MineForecastView(stats: stats, forecast: .compute(stats: stats, manager: manager))
                }
                Section(header: Text("⛏️ Breaks by layer")) {                    if stats.breaksByLayer.isEmpty {
                        Text("Dig something!").font(.caption).foregroundStyle(.secondary)
                    } else {
                        ForEach(stats.breaksByLayer.sorted(by: { $0.value > $1.value }), id: \.key) { key, value in
                            HStack {
                                Text(key)
                                Spacer()
                                Text("\(value)").bold().monospacedDigit()
                            }
                        }
                    }
                }
            }
            .navigationTitle("Performance")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func statRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value).bold().monospacedDigit()
        }
    }
}

/// Tutorial card overlay: current step with progress + skip.
struct MineTutorialView: View {    @ObservedObject var tutorial: MineTutorialState

    var body: some View {
        if !tutorial.done {
            VStack {
                Spacer()
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(tutorial.step.icon).font(.title)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Step \(tutorial.step.rawValue + 1)/\(MineTutorialStep.allCases.count)")
                                .font(.caption2.bold()).foregroundColor(.orange)
                            Text(tutorial.step.title)
                                .font(.headline).foregroundColor(.white)
                        }
                        Spacer()
                        Button("Skip") { tutorial.skip() }
                            .font(.caption).foregroundColor(.gray)
                    }
                    Text(tutorial.step.detail)
                        .font(.subheadline).foregroundColor(.white.opacity(0.9))
                    ProgressView(value: tutorial.progress)
                        .progressViewStyle(LinearProgressViewStyle(tint: .orange))
                    HStack {
                        Spacer()
                        Button("Next tip →") { tutorial.advance() }
                            .font(.subheadline.bold()).foregroundColor(.orange)
                    }
                }
                .padding(14)
                .background(Color.black.opacity(0.78))
                .cornerRadius(14)
                .padding(.horizontal, 16)
                .padding(.bottom, 120)
            }
            .allowsHitTesting(true)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}

// ============================================================
// MARK: - 9. Settings (difficulty, quality shortcuts, resets)
// ============================================================

/// Mine settings sheet: difficulty dial, quality shortcuts, tutorial
/// control and a danger zone. God-mode is not toggleable — it is geology.
struct MineSettingsView: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🎚️ Difficulty (never lethal)")) {
                    Text("Difficulty tunes monster feistiness, loot luck and prices. Death stays off — that switch does not exist.")
                        .font(.caption).foregroundStyle(.secondary)
                    ForEach(SpookyDifficulty.all, id: \.name) { preset in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(preset.emoji) \(preset.name)").bold().font(.subheadline)
                                Text(preset.detail)
                                    .font(.caption).foregroundStyle(.secondary)
                                Text("Monsters ×\(preset.monsterAggression, specifier: "%.1f") • Luck +\(Int(preset.lootLuck * 100))% • Prices ×\(preset.priceFactor, specifier: "%.2f")")
                                    .font(.caption2).foregroundStyle(.tertiary)
                            }
                            Spacer()
                            if manager.difficulty == preset {
                                Text("ACTIVE").font(.caption2.bold()).foregroundColor(.green)
                            } else {
                                Button("Use") { manager.difficulty = preset }
                                    .buttonStyle(.bordered)
                                    .controlSize(.small)
                            }
                        }
                    }
                }
                Section(header: Text("🎞️ Quality shortcuts")) {
                    HStack {
                        Text("Now: \(manager.frameMonitor.quality.title) • \(Int(manager.frameMonitor.fps)) FPS")
                            .font(.subheadline)
                        Spacer()
                    }
                    HStack {
                        Button("🥔 Potato") { manager.frameMonitor.pin(.potato) }
                            .buttonStyle(.bordered).controlSize(.small)
                        Button("🧈 Smooth") { manager.frameMonitor.pin(.smooth) }
                            .buttonStyle(.bordered).controlSize(.small)
                        Button("⚖️ Balanced") { manager.frameMonitor.pin(.balanced) }
                            .buttonStyle(.bordered).controlSize(.small)
                    }
                    if !manager.frameMonitor.autoQuality {
                        Button("Resume auto quality") { manager.frameMonitor.resumeAuto() }
                            .font(.subheadline.bold())
                    } else {
                        Text("Auto quality is steering. It downshifts on sag, climbs back on headroom.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                Section(header: Text("🎓 Tutorial")) {
                    HStack {
                        if manager.tutorial.done {
                            Text("Graduated 🎓 — free miner.")
                        } else {
                            Text("Step \(manager.tutorial.step.rawValue + 1): \(manager.tutorial.step.title)")
                        }
                        Spacer()
                        Button("Replay") { manager.tutorial.reset() }
                            .buttonStyle(.bordered).controlSize(.small)
                    }
                }
                Section(header: Text("☢️ Danger zone")) {
                    Text("Resets are session bookkeeping only — your tunnels, ores and position are never touched.")
                        .font(.caption).foregroundStyle(.secondary)
                    Button("Reset quests") { manager.questBoard.resetAll() }
                        .foregroundColor(.orange)
                    Button("Reset session stats") { manager.statTracker.reset() }
                        .foregroundColor(.orange)
                    Button("Reset frame counters") { manager.frameMonitor.reset() }
                        .foregroundColor(.orange)
                }
                Section(header: Text("🛡️ Guarantees")) {
                    Text("• No death, ever — HP floors at 1 and regenerates.")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("• No teleports — rebirth, resets and respawns keep your position.")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("• No waiting walls — generation streams behind play.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Mine Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// ============================================================
// MARK: - 10. Sector map (live position + discovery)
// ============================================================

/// 2D sector map: 3×3 atlas with the player's live dot, discovery state,
/// per-sector mood and fork style. Pure view over manager state.
struct MineMapView: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss

    private let cols = ["West", "Central", "East"]
    private let rows = ["North", "Heart", "South"]

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🗺️ Atlas (\(manager.player.sectorsFound.count)/9)")) {
                    VStack(spacing: 6) {
                        ForEach(0..<3, id: \.self) { row in
                            HStack(spacing: 6) {
                                ForEach(0..<3, id: \.self) { col in
                                    sectorCell(col: col, row: row)
                                }
                            }
                        }
                    }
                    .padding(.vertical, 6)
                    HStack {
                        Text("📍 You: \(playerSectorName)")
                            .font(.subheadline.bold())
                        Spacer()
                        Text("\(manager.currentLayer.emoji) \(manager.currentLayer.title)")
                            .font(.caption).foregroundColor(.yellow)
                    }
                    if let mood = SpookySectorMood.mood(col: playerCol, row: playerRow) {
                        Text("\(mood.emoji) \(mood.line)")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                Section(header: Text("📍 Sector ledger")) {
                    ForEach(0..<3, id: \.self) { row in
                        ForEach(0..<3, id: \.self) { col in
                            let key = "\(col),\(row)"
                            let found = manager.player.sectorsFound.contains(key)
                            HStack {
                                Text(found ? "✅" : "⬜")
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("\(rows[row])-\(cols[col]) Dig")
                                        .font(.subheadline.bold())
                                    Text(SpookySectorMood.detail(col: col, row: row))
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if isPlayerSector(col: col, row: row) {
                                    Text("YOU").font(.caption2.bold()).foregroundColor(.green)
                                }
                            }
                        }
                    }
                    Text("Deepest: \(Int(manager.player.deepestY)) (rebirth needs −4.5) • Forks rise on first visit: timber arches, caves, closets, visitors.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Sector Map")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private var playerCol: Int {
        min(2, max(0, Int((manager.player.position.x + 60) / 40)))
    }

    private var playerRow: Int {
        min(2, max(0, Int((manager.player.position.z + 60) / 40)))
    }

    private var playerSectorName: String {
        "\(rows[playerRow])-\(cols[playerCol]) Dig"
    }

    private func isPlayerSector(col: Int, row: Int) -> Bool {
        col == playerCol && row == playerRow
    }

    private func sectorCell(col: Int, row: Int) -> some View {
        let found = manager.player.sectorsFound.contains("\(col),\(row)")
        let here = isPlayerSector(col: col, row: row)
        return ZStack {
            RoundedRectangle(cornerRadius: 10)
                .fill(found ? Color.orange.opacity(0.35) : Color.gray.opacity(0.2))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(here ? Color.green : Color.clear, lineWidth: 3)
                )
                .frame(height: 84)
            VStack(spacing: 2) {
                Text(found ? ["🧭", "⛏️", "🦇", "💜", "🛤️", "🔥", "🔮", "⬛", "🌋"][row * 3 + col] : "⬜")
                    .font(.title2)
                Text("\(rows[row].prefix(1))-\(cols[col].prefix(1))")
                    .font(.caption2.bold()).foregroundColor(.white)
                if here {
                    Text("📍").font(.caption2)
                }
            }
        }
    }
}

/// One-line moods per sector for the map header.
enum SpookySectorMood {    static func mood(col: Int, row: Int) -> (emoji: String, line: String)? {
        let table: [[(String, String)]] = [
            [("🧭", "Frontier air. Foxes roam."), ("⛏️", "The classic claim."), ("🦇", "Bat country.")],
            [("💜", "The mine's living room."), ("🛤️", "All roads meet here."), ("🔥", "The shaft down starts here.")],
            [("🔮", "Cave country."), ("⬛", "Double pay, double dark."), ("🌋", "The magma gate.")],
        ]
        guard table.indices.contains(row), table[row].indices.contains(col) else { return nil }
        let (e, l) = table[row][col]
        return (e, l)
    }

    static func detail(col: Int, row: Int) -> String {
        mood(col: col, row: row).map({ "\($0.emoji) \($0.line)" }) ?? "Unmapped dark."
    }
}

// ============================================================
// MARK: - 11. Economy forecast (gold/hr projections)
// ============================================================

/// Projects earnings from session stats: gold per hour, XP per hour,
/// time-to-next-backpack, time-to-next-rebirth. Pure math, no hooks.
struct MineEconomyForecast {
    var goldPerHour: Double
    var xpPerHour: Double
    var breaksPerHour: Double
    var hoursToBackpack: Double?
    var tripsToRebirth: Double?

    static func compute(stats: MineStatTracker, manager: MineManager) -> MineEconomyForecast {
        let hours = max(stats.playSeconds / 3600, 1.0 / 60.0)
        let gph = Double(stats.goldEarned) / hours
        let xph = Double(stats.xpEarned) / hours
        let bph = Double(stats.blocksBroken) / hours
        var hoursToPack: Double?
        let packCost = Double(manager.backpackCost)
        if gph > 1 && manager.player.gold < manager.backpackCost {
            hoursToPack = Double(manager.backpackCost - manager.player.gold) / gph
        } else if gph > 1 {
            hoursToPack = packCost / gph
        }
        var trips: Double?
        let needXP = max(0, 15 * 100 - manager.player.experience)
        if xph > 1 {
            trips = Double(needXP) / xph
        }
        return MineEconomyForecast(
            goldPerHour: gph, xpPerHour: xph, breaksPerHour: bph,
            hoursToBackpack: hoursToPack, tripsToRebirth: trips
        )
    }

    var verdict: String {
        if goldPerHour < 500 { return "Cozy cottage industry. Dig deeper for real money." }
        if goldPerHour < 3000 { return "Respectable operation. The cart knows your name." }
        if goldPerHour < 12000 { return "Serious tycoon. Magma money flows." }
        return "Living legend economy. The mine works for you now."
    }
}

/// Forecast card: rates, projections, verdict.
struct MineForecastView: View {
    @ObservedObject var stats: MineStatTracker
    var forecast: MineEconomyForecast

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("📈 Economy forecast").font(.headline)
            Text(forecast.verdict).font(.caption).foregroundStyle(.secondary)
            row("💰 Gold / hour", SpookyNumbers.compact(Int(forecast.goldPerHour)))
            row("⭐ XP / hour", SpookyNumbers.compact(Int(forecast.xpPerHour)))
            row("🧱 Breaks / hour", SpookyNumbers.compact(Int(forecast.breaksPerHour)))
            if let h = forecast.hoursToBackpack {
                row("🎒 Next pack in", SpookyNumbers.words(h * 3600))
            } else {
                row("🎒 Next pack", "affordable now!")
            }
            if let t = forecast.tripsToRebirth {
                row("💫 Rank-15 pace", t < 1 ? "within the hour!" : SpookyNumbers.words(t * 3600))
            }
            Text("Projections assume you keep digging like this. Digging like this is encouraged.")
                .font(.caption2).foregroundStyle(.tertiary)
        }
        .padding(12)
        .background(Color.blue.opacity(0.08))
        .cornerRadius(12)
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.subheadline)
            Spacer()
            Text(value).bold().monospacedDigit()
        }
    }
}
