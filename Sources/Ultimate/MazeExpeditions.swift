//
//  MazeExpeditions.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Expedition board + region atlas for the Tunnel Maze: 12 rotating
//  objectives and 8 named regions with discovery bonuses. The maze manager
//  forwards one-line `record(...)` hooks; rewards land via `onReward`.
//  God-mode applies here too — expeditions never punish, only pay.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Events
// ============================================================

/// Maze events the expedition board listens to.
enum MazeExpeditionEvent {
    case closetOpened
    case caveHarvested
    case boxyMet
    case forkRaised
    case regionMapped(count: Int)
    case distanceBanked(meters: Int)
    case treasureFound
    case monsterSlain
    case crystalMined
    case scoreEarned(points: Int)
}

// ============================================================
// MARK: - 2. Expedition definition + catalog
// ============================================================

struct MazeExpedition: Identifiable {
    let id: String
    var title: String
    var detail: String
    var icon: String
    var target: Int
    var unit: String
    var rewardScore: Int
    var rewardGold: Int
    var tip: String
}

enum MazeExpeditionKind: String {
    case closets, caves, boxy, forks, regions, distance
    case treasure, monsters, crystals, score
}

enum MazeExpeditionCatalog {
    static var all: [MazeExpedition] = [
        MazeExpedition(
            id: "first-cache",
            title: "First Cache",
            detail: "Every expedition starts with a single creaking door.",
            icon: "🚪",
            target: 1, unit: "closets",
            rewardScore: 150, rewardGold: 60,
            tip: "Closet crates glow faintly orange. Tap to open."
        ),
        MazeExpedition(
            id: "fork-scout",
            title: "Fork Scout",
            detail: "Stand at 3 fresh forkroads. The mine keeps branching — keep up.",
            icon: "🔱",
            target: 3, unit: "forks",
            rewardScore: 250, rewardGold: 100,
            tip: "New chunks stamp Y-forks, T-junctions, crosses and chambers."
        ),
        MazeExpedition(
            id: "boxy-hello",
            title: "Boxy Hello",
            detail: "Witness 2 rare boxy encounters. Do not spook them. They spook easily. They are cubes.",
            icon: "📦",
            target: 2, unit: "friends",
            rewardScore: 400, rewardGold: 150,
            tip: "Roam far tunnels; the ticker fires ~0.5% per tick."
        ),
        MazeExpedition(
            id: "crystal-cutter",
            title: "Crystal Cutter",
            detail: "Mine 12 cave crystals. Cubes, spikes, orbs — all pay.",
            icon: "🔮",
            target: 12, unit: "crystals",
            rewardScore: 350, rewardGold: 140,
            tip: "Caves ping the log when they crack open nearby."
        ),
        MazeExpedition(
            id: "cave-comber",
            title: "Cave Comber",
            detail: "Fully harvest 2 crystal caves for their completion glow.",
            icon: "⛏️",
            target: 2, unit: "caves",
            rewardScore: 600, rewardGold: 250,
            tip: "Clear every growth in the ring to trigger the bonus."
        ),
        MazeExpedition(
            id: "cartographer-2",
            title: "Maze Cartographer",
            detail: "Map 4 of the 8 regions. Big maze. Bigger legend.",
            icon: "🗺️",
            target: 4, unit: "regions",
            rewardScore: 700, rewardGold: 300,
            tip: "Push past z ±120 — the far bands hide the best loot."
        ),
        MazeExpedition(
            id: "marathon",
            title: "Tunnel Marathon",
            detail: "Bank 500 meters of travel. Sprinting counts double-ish. (It counts the same. Run anyway.)",
            icon: "🏃",
            target: 500, unit: "meters",
            rewardScore: 450, rewardGold: 200,
            tip: "Sprint toggle is in the hotbar. Hydrate."
        ),
        MazeExpedition(
            id: "treasure-goblin",
            title: "Treasure Goblin",
            detail: "Pocket 6 treasures. Shiny things go in the pack, no questions asked.",
            icon: "💎",
            target: 6, unit: "treasures",
            rewardScore: 550, rewardGold: 260,
            tip: "Treasure rooms glow at 0.5 light. Follow the shimmer."
        ),
        MazeExpedition(
            id: "monster-bouncer",
            title: "Monster Bouncer",
            detail: "Defeat 10 monsters. The maze has a strict no-haunting policy, enforced by you.",
            icon: "⚔️",
            target: 10, unit: "monsters",
            rewardScore: 500, rewardGold: 220,
            tip: "Bosses pay 10×. Bring your meanest spell."
        ),
        MazeExpedition(
            id: "high-roller",
            title: "High Roller",
            detail: "Earn 5,000 score lifetime. Style points are real points here.",
            icon: "🎰",
            target: 5000, unit: "points",
            rewardScore: 1000, rewardGold: 500,
            tip: "Combos over 10× pay bonus points. Chain captures."
        ),
        MazeExpedition(
            id: "grand-tour",
            title: "Grand Tour",
            detail: "Map all 8 regions. See every band from Northgate to the Far Reaches.",
            icon: "🌍",
            target: 8, unit: "regions",
            rewardScore: 1500, rewardGold: 700,
            tip: "Check the atlas for the band you keep missing."
        ),
        MazeExpedition(
            id: "living-myth",
            title: "Living Myth",
            detail: "Earn 25,000 score lifetime. The tunnels will whisper your name. (That's the wind. Probably.)",
            icon: "👑",
            target: 25000, unit: "points",
            rewardScore: 3000, rewardGold: 1200,
            tip: "Shiny bosses + combos + expeditions stack fast."
        ),
        MazeExpedition(
            id: "fork-frenzy",
            title: "Fork Frenzy",
            detail: "Trigger 12 frontier forks. You don't explore the maze so much as unfold it.",
            icon: "🔱",
            target: 12, unit: "forks",
            rewardScore: 800, rewardGold: 350,
            tip: "Every fresh 24-unit chunk stamps a new junction."
        ),
        MazeExpedition(
            id: "closet-crawl",
            title: "Closet Crawl",
            detail: "Open 12 caches. At this point the cobwebs know your name too.",
            icon: "🚪",
            target: 12, unit: "closets",
            rewardScore: 700, rewardGold: 300,
            tip: "Frontier chunks restock closets near their forks."
        ),
        MazeExpedition(
            id: "wisp-whisperer",
            title: "Wisp Whisperer",
            detail: "Witness 6 boxy encounters. You are now officially the cube person.",
            icon: "✨",
            target: 6, unit: "friends",
            rewardScore: 900, rewardGold: 400,
            tip: "Far Reaches bands hold the best encounter odds."
        ),
        MazeExpedition(
            id: "ultra-marathon",
            title: "Ultra Marathon",
            detail: "Bank 2,000 meters. Your boots file a formal complaint. The maze files a compliment.",
            icon: "🥾",
            target: 2000, unit: "meters",
            rewardScore: 1000, rewardGold: 450,
            tip: "Sprint the Far Reaches spine end to end."
        ),
        MazeExpedition(
            id: "treasure-tycoon",
            title: "Treasure Tycoon",
            detail: "Pocket 15 treasures. Your inventory clinks when you walk. People notice.",
            icon: "🤑",
            target: 15, unit: "treasures",
            rewardScore: 900, rewardGold: 420,
            tip: "Gilded Warrens and roundabout chambers pay best."
        ),
        MazeExpedition(
            id: "extermination",
            title: "Extermination",
            detail: "Defeat 30 monsters. The maze's monster union requests a meeting. Decline.",
            icon: "💀",
            target: 30, unit: "monsters",
            rewardScore: 850, rewardGold: 380,
            tip: "Boss rooms respawn pressure — farm the warm band."
        ),
        MazeExpedition(
            id: "crystal-magnate",
            title: "Crystal Magnate",
            detail: "Mine 50 cave crystals. You don't cut gems; you harvest them like wheat.",
            icon: "💠",
            target: 50, unit: "crystals",
            rewardScore: 950, rewardGold: 430,
            tip: "Howling Deeps caves grow thickest. Clear whole rings."
        ),
        MazeExpedition(
            id: "score-legend",
            title: "Score Legend",
            detail: "Earn 100,000 score lifetime. There is no higher number. (There is. It's your next run.)",
            icon: "🌟",
            target: 100000, unit: "points",
            rewardScore: 5000, rewardGold: 2000,
            tip: "Legendary shinies + max combos + claimed expeditions."
        ),
        MazeExpedition(
            id: "closet-magnate",
            title: "Closet Magnate",
            detail: "Open 25 caches. You own a controlling share in doors.",
            icon: "🚪",
            target: 25, unit: "closets",
            rewardScore: 1200, rewardGold: 550,
            tip: "Every frontier chunk restocks. Never pass a 🚪."
        ),
        MazeExpedition(
            id: "fork-lord",
            title: "Fork Lord",
            detail: "Trigger 25 frontier forks. The maze unfolds at your command.",
            icon: "🔱",
            target: 25, unit: "forks",
            rewardScore: 1300, rewardGold: 600,
            tip: "Sprint fresh chunks — each stamps exactly one fork."
        ),
        MazeExpedition(
            id: "cube-royalty",
            title: "Cube Royalty",
            detail: "Witness 12 boxy encounters. The cubes hold court, and you are invited.",
            icon: "👑",
            target: 12, unit: "friends",
            rewardScore: 1400, rewardGold: 650,
            tip: "Bond early: high-level pals gift gems that fund everything."
        ),
        MazeExpedition(
            id: "gem-emperor",
            title: "Gem Emperor",
            detail: "Mine 100 cave crystals. The caves file a noise complaint. Frame it.",
            icon: "💠",
            target: 100, unit: "crystals",
            rewardScore: 1500, rewardGold: 700,
            tip: "Orb rings pay densest per swing. Howling Deeps first."
        ),
        MazeExpedition(
            id: "spelunker",
            title: "Master Spelunker",
            detail: "Fully harvest 6 crystal caves. The Hollows know your name and your pick.",
            icon: "🏺",
            target: 6, unit: "caves",
            rewardScore: 1600, rewardGold: 750,
            tip: "Track caves in the journal — finish rings before wandering off."
        ),
        MazeExpedition(
            id: "dragon-hoard",
            title: "Dragon Hoard",
            detail: "Pocket 30 treasures. Your inventory now has its own gravity.",
            icon: "🐉",
            target: 30, unit: "treasures",
            rewardScore: 1700, rewardGold: 800,
            tip: "Boss chambers + Gilded Warrens. Greed is a compass."
        ),
        MazeExpedition(
            id: "bounty-board",
            title: "Bounty Board",
            detail: "Defeat 60 monsters. The union meeting is cancelled. Permanently.",
            icon: "📌",
            target: 60, unit: "monsters",
            rewardScore: 1800, rewardGold: 850,
            tip: "Warm-band loops: dense spawns, short walks."
        ),
        MazeExpedition(
            id: "pathfinder",
            title: "Pathfinder",
            detail: "Bank 5,000 meters. Your boots achieve sentience and keep going without you.",
            icon: "🥾",
            target: 5000, unit: "meters",
            rewardScore: 1900, rewardGold: 900,
            tip: "Sprint the full spine Northgate to Far Reaches, twice."
        ),
        MazeExpedition(
            id: "mythic-score",
            title: "Mythic Score",
            detail: "Earn 250,000 score lifetime. Numbers this big need their own weather system.",
            icon: "🌠",
            target: 250000, unit: "points",
            rewardScore: 10000, rewardGold: 4000,
            tip: "Everything compounded: bonds, combos, shinies, claims."
        ),
    ]
}

// ============================================================
// MARK: - 3. Board engine
// ============================================================

/// Three live expeditions, catalog order, persisted completion.
final class MazeExpeditionBoard: ObservableObject {
    @Published private(set) var progress: [String: Int] = [:]
    @Published private(set) var completed: Set<String> = []
    @Published private(set) var claimed: Set<String> = []
    @Published private(set) var lifetimeScore: Int = 0
    @Published private(set) var lifetimeDistance: Int = 0

    var onReward: ((Int, Int) -> Void)? // (score, gold)

    let activeLimit = 3
    private let progressKey = "mazeExpProgress.v1"
    private let completedKey = "mazeExpCompleted.v1"
    private let claimedKey = "mazeExpClaimed.v1"
    private let scoreKey = "mazeExpScore.v1"
    private let distKey = "mazeExpDist.v1"

    init() { load() }

    var active: [MazeExpedition] {
        Array(MazeExpeditionCatalog.all.filter({ !completed.contains($0.id) }).prefix(activeLimit))
    }

    func progressOf(_ e: MazeExpedition) -> Int { progress[e.id, default: 0] }
    func fractionOf(_ e: MazeExpedition) -> Double {
        min(1, Double(progressOf(e)) / Double(max(1, e.target)))
    }
    func isDone(_ e: MazeExpedition) -> Bool {
        completed.contains(e.id) || progressOf(e) >= e.target
    }

    @discardableResult
    func claim(_ e: MazeExpedition) -> Bool {
        guard isDone(e), !claimed.contains(e.id) else { return false }
        claimed.insert(e.id)
        onReward?(e.rewardScore, e.rewardGold)
        save()
        return true
    }

    var doneCount: Int { completed.count }

    func record(_ event: MazeExpeditionEvent) {
        switch event {
        case .scoreEarned(let n): lifetimeScore += n
        case .distanceBanked(let n): lifetimeDistance += n
        default: break
        }
        var changed = false
        for e in active where !isDone(e) {
            let before = progressOf(e)
            let after = advance(expedition: e, from: before, event: event)
            if after != before {
                progress[e.id] = after
                changed = true
                if after >= e.target { completed.insert(e.id) }
            }
        }
        // Lifetime-backed expeditions read totals.
        for e in active where !isDone(e) {
            if e.id == "high-roller" || e.id == "living-myth" || e.id == "score-legend" || e.id == "mythic-score" {
                let v = min(lifetimeScore, e.target)
                if v != progressOf(e) {
                    progress[e.id] = v
                    changed = true
                    if v >= e.target { completed.insert(e.id) }
                }
            }
            if e.id == "marathon" || e.id == "ultra-marathon" || e.id == "pathfinder" {
                let v = min(lifetimeDistance, e.target)
                if v != progressOf(e) {
                    progress[e.id] = v
                    changed = true
                    if v >= e.target { completed.insert(e.id) }
                }
            }
        }
        if changed { save() }
    }

    private func kindOf(_ id: String) -> MazeExpeditionKind {
        switch id {
        case "first-cache", "closet-crawl", "closet-magnate": return .closets
        case "fork-scout", "fork-frenzy", "fork-lord": return .forks
        case "boxy-hello", "wisp-whisperer", "cube-royalty": return .boxy
        case "crystal-cutter", "crystal-magnate", "gem-emperor": return .crystals
        case "cave-comber", "spelunker": return .caves
        case "cartographer-2", "grand-tour": return .regions
        case "marathon", "ultra-marathon", "pathfinder": return .distance
        case "treasure-goblin", "treasure-tycoon", "dragon-hoard": return .treasure
        case "monster-bouncer", "extermination", "bounty-board": return .monsters
        case "high-roller", "living-myth", "score-legend", "mythic-score": return .score
        default: return .score
        }
    }

    private func advance(expedition e: MazeExpedition, from: Int, event: MazeExpeditionEvent) -> Int {
        func cap(_ v: Int) -> Int { min(e.target, v) }
        switch (kindOf(e.id), event) {
        case (.closets, .closetOpened): return cap(from + 1)
        case (.caves, .caveHarvested): return cap(from + 1)
        case (.boxy, .boxyMet): return cap(from + 1)
        case (.forks, .forkRaised): return cap(from + 1)
        case (.regions, .regionMapped(let n)): return cap(max(from, n))
        case (.treasure, .treasureFound): return cap(from + 1)
        case (.monsters, .monsterSlain): return cap(from + 1)
        case (.crystals, .crystalMined): return cap(from + 1)
        default: return from
        }
    }

    private func save() {
        UserDefaults.standard.set(progress, forKey: progressKey)
        UserDefaults.standard.set(Array(completed), forKey: completedKey)
        UserDefaults.standard.set(Array(claimed), forKey: claimedKey)
        UserDefaults.standard.set(lifetimeScore, forKey: scoreKey)
        UserDefaults.standard.set(lifetimeDistance, forKey: distKey)
    }

    private func load() {
        progress = UserDefaults.standard.dictionary(forKey: progressKey) as? [String: Int] ?? [:]
        completed = Set(UserDefaults.standard.stringArray(forKey: completedKey) ?? [])
        claimed = Set(UserDefaults.standard.stringArray(forKey: claimedKey) ?? [])
        lifetimeScore = UserDefaults.standard.integer(forKey: scoreKey)
        lifetimeDistance = UserDefaults.standard.integer(forKey: distKey)
    }

    func resetAll() {
        progress = [:]
        completed = []
        claimed = []
        lifetimeScore = 0
        lifetimeDistance = 0
        save()
    }
}

// ============================================================
// MARK: - 4. Region atlas
// ============================================================

/// Named bands of the endless mine with discovery bonuses.
struct MazeRegion {
    var id: String
    var name: String
    var emoji: String
    var bounds: String
    var flavor: String
    var tip: String
    var bonusScore: Int
}

enum MazeRegionAtlas {
    static var all: [MazeRegion] = [
        MazeRegion(
            id: "northgate-west", name: "Northgate Warren", emoji: "🧱",
            bounds: "z < −120, x < 0",
            flavor: "Where the haulage thins and the dark gets opinionated. First stop past civilization, last stop before stories.",
            tip: "Follow the west spine north until the torches give up.",
            bonusScore: 200
        ),
        MazeRegion(
            id: "northgate-east", name: "Northgate Galleries", emoji: "🖼️",
            bounds: "z < −120, x ≥ 0",
            flavor: "Natural galleries of stone ribs. Miners swear the ribs hum. The ribs decline to comment.",
            tip: "East spine, far north. Bring a light and an open mind.",
            bonusScore: 200
        ),
        MazeRegion(
            id: "deeps-west", name: "Howling Deeps", emoji: "🌬️",
            bounds: "−120 ≤ z < −40, x < 0",
            flavor: "The wind down here has a voice and it practices scales. Crystals grow thick where the howling is worst.",
            tip: "Best crystal odds in the west Deeps. Harvest whole caves.",
            bonusScore: 150
        ),
        MazeRegion(
            id: "deeps-east", name: "Ember Deeps", emoji: "🔥",
            bounds: "−120 ≤ z < −40, x ≥ 0",
            flavor: "Warm walls, red seams, the smell of old campfires. Something cozy lives here. It pays rent in gold.",
            tip: "Treasure rooms cluster in the warm band.",
            bonusScore: 150
        ),
        MazeRegion(
            id: "heart-west", name: "The Heart", emoji: "💜",
            bounds: "−40 ≤ z < 40, x < 0",
            flavor: "The maze's living room: forks, chambers, closets, friends. If you're lost, you're probably here, and that's fine.",
            tip: "Home base. Most closets per tunnel of anywhere.",
            bonusScore: 100
        ),
        MazeRegion(
            id: "heart-east", name: "Lantern Row", emoji: "🏮",
            bounds: "−40 ≤ z < 40, x ≥ 0",
            flavor: "Somebody lit every tunnel here, once, a century ago. The lanterns never went out. Nobody asks why. (It's the wiring. Probably.)",
            tip: "Safest monster odds. Farm combos here.",
            bonusScore: 100
        ),
        MazeRegion(
            id: "warrens-west", name: "Tangle Warrens", emoji: "🌀",
            bounds: "40 ≤ z < 120, x < 0",
            flavor: "Forks inside forks inside forks. Bring chalk. The chalk lobby thanks you for your continued patronage.",
            tip: "Fork Scout progress flies here.",
            bonusScore: 150
        ),
        MazeRegion(
            id: "warrens-east", name: "Gilded Warrens", emoji: "👑",
            bounds: "40 ≤ z < 120, x ≥ 0",
            flavor: "Everything glitters and most of it is actually gold. The maze's jewelry box, left slightly open.",
            tip: "Highest treasure density outside the Far Reaches.",
            bonusScore: 150
        ),
        MazeRegion(
            id: "far-west", name: "Far Reaches West", emoji: "🌌",
            bounds: "z ≥ 120, x < 0",
            flavor: "Past the last torch, past the last map, past the last sensible decision. Boxy wisps vacation here.",
            tip: "Golden Wisp odds peak at the edge of the world.",
            bonusScore: 300
        ),
        MazeRegion(
            id: "far-east", name: "Far Reaches East", emoji: "🌠",
            bounds: "z ≥ 120, x ≥ 0",
            flavor: "The end of the line and the start of legends. The tunnels here were dug by something enormous, friendly, and gone.",
            tip: "Marathon meters melt here. Sprint south to nowhere.",
            bonusScore: 300
        ),
    ]

    /// Region for a world position.
    static func at(x: Float, z: Float) -> MazeRegion {
        let band: String
        if z < -120 { band = "northgate" }
        else if z < -40 { band = "deeps" }
        else if z < 40 { band = "heart" }
        else if z < 120 { band = "warrens" }
        else { band = "far" }
        let side = x < 0 ? "west" : "east"
        return all.first(where: { $0.id == "\(band)-\(side)" }) ?? all[4]
    }
}

/// Tracks mapped regions + current region for the banner.
final class MazeRegionDirector: ObservableObject {
    @Published private(set) var mapped: Set<String> = []
    @Published private(set) var currentId: String = "heart-west"
    @Published private(set) var lastDiscovery: MazeRegion?

    var onDiscover: ((MazeRegion) -> Void)?

    private let key = "mazeRegionsMapped.v1"

    init() {
        mapped = Set(UserDefaults.standard.stringArray(forKey: key) ?? [])
    }

    var current: MazeRegion {
        MazeRegionAtlas.all.first(where: { $0.id == currentId }) ?? MazeRegionAtlas.all[4]
    }

    /// Call as the player moves. Returns true on a fresh region.
    @discardableResult
    func update(x: Float, z: Float) -> Bool {
        let region = MazeRegionAtlas.at(x: x, z: z)
        currentId = region.id
        guard !mapped.contains(region.id) else { return false }
        mapped.insert(region.id)
        lastDiscovery = region
        UserDefaults.standard.set(Array(mapped), forKey: key)
        onDiscover?(region)
        return true
    }

    var mappedCount: Int { mapped.count }
}

// ============================================================
// MARK: - 5. Views
// ============================================================

/// Expedition board sheet.
struct MazeExpeditionView: View {
    @ObservedObject var board: MazeExpeditionBoard
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🧭 Active (\(board.doneCount)/\(MazeExpeditionCatalog.all.count) done)")) {
                    if board.active.isEmpty {
                        VStack(spacing: 8) {
                            Text("👑").font(.system(size: 44))
                            Text("Every expedition complete.")
                                .font(.headline)
                            Text("The tunnels bow to you. They are tunnels. They bow anyway.")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    } else {
                        ForEach(board.active) { e in
                            expeditionCard(e)
                        }
                    }
                }
                if !board.claimed.isEmpty {
                    Section(header: Text("🏆 Claimed")) {
                        ForEach(MazeExpeditionCatalog.all.filter({ board.claimed.contains($0.id) })) { e in
                            HStack {
                                Text(e.icon)
                                Text(e.title).font(.subheadline)
                                Spacer()
                                Image(systemName: "checkmark.seal.fill").foregroundColor(.green)
                            }
                        }
                    }
                }
                Section(header: Text("📖 Coming up")) {
                    ForEach(MazeExpeditionCatalog.all.filter({
                        !board.completed.contains($0.id) && !board.active.map(\.id).contains($0.id)
                    }).prefix(4)) { e in
                        HStack {
                            Text(e.icon)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(e.title).font(.subheadline.bold())
                                Text("\(e.target) \(e.unit)")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Expeditions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func expeditionCard(_ e: MazeExpedition) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(e.icon).font(.title2)
                VStack(alignment: .leading, spacing: 2) {
                    Text(e.title).font(.headline)
                    Text("\(min(board.progressOf(e), e.target))/\(e.target) \(e.unit)")
                        .font(.caption).foregroundColor(.orange).monospacedDigit()
                }
                Spacer()
                if board.claimed.contains(e.id) {
                    Text("CLAIMED").font(.caption2.bold()).foregroundColor(.green)
                } else if board.isDone(e) {
                    Button("Claim") { _ = board.claim(e) }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                        .tint(.green)
                }
            }
            Text(e.detail).font(.subheadline).foregroundStyle(.secondary)
            ProgressView(value: board.fractionOf(e))
                .progressViewStyle(LinearProgressViewStyle(tint: board.isDone(e) ? .green : .orange))
            HStack {
                Text("Reward: \(e.rewardScore) pts +\(e.rewardGold)🪙")
                    .font(.caption).foregroundColor(.yellow)
                Spacer()
                Text("💡 \(e.tip)").font(.caption).foregroundColor(.gray)
            }
        }
        .padding(.vertical, 4)
    }
}

/// Current-region banner + atlas sheet launcher data.
struct MazeRegionBanner: View {
    @ObservedObject var director: MazeRegionDirector

    var body: some View {
        HStack(spacing: 6) {
            Text(director.current.emoji)
            Text(director.current.name)
                .font(.caption.bold()).foregroundColor(.white)
            Text("\(director.mappedCount)/\(MazeRegionAtlas.all.count)")
                .font(.caption2).foregroundColor(.white.opacity(0.7))
                .monospacedDigit()
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Color.black.opacity(0.6))
        .cornerRadius(10)
    }
}

/// Full region atlas with discovery state.
struct MazeRegionAtlasView: View {
    @ObservedObject var director: MazeRegionDirector
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🗺️ Atlas (\(director.mappedCount)/\(MazeRegionAtlas.all.count))")) {
                    ForEach(MazeRegionAtlas.all, id: \.id) { region in
                        let found = director.mapped.contains(region.id)
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(region.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(found ? region.name : "???")
                                        .font(.headline)
                                    Text(region.bounds)
                                        .font(.caption).foregroundStyle(.secondary)
                                        .monospaced()
                                }
                                Spacer()
                                if found {
                                    Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                                } else {
                                    Image(systemName: "lock.circle").foregroundColor(.gray)
                                }
                            }
                            Text(found ? region.flavor : "Unmapped dark. Walk there to chart it.")
                                .font(.caption).foregroundStyle(.secondary)
                            if found {
                                Text("💡 \(region.tip)")
                                    .font(.caption).foregroundColor(.gray)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Region Atlas")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
