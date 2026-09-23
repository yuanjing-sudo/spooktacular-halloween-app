//
//  SpookyGameFeel.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Shared game-feel kit for mine + maze: haptics, number formatting,
//  progression curves, name generators, atmosphere presets, toast queue
//  and difficulty presets. Zero dependencies beyond SwiftUI/UIKit.
//

import SwiftUI
import UIKit

// ============================================================
// MARK: - 1. Haptics
// ============================================================

/// One-line haptics anywhere: `SpookyHaptics.play(.reward)`.
enum SpookyHaptics {
    case tap, light, medium, heavy, reward, warning, error, levelUp

    static func play(_ kind: SpookyHaptics) {
        switch kind {
        case .tap, .light:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .medium:
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case .heavy:
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case .reward, .levelUp:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .warning:
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case .error:
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }
}

// ============================================================
// MARK: - 2. Numbers
// ============================================================

/// Compact counters, clocks and percents for HUDs.
enum SpookyNumbers {
    /// 999 → "999", 1500 → "1.5K", 2.3M etc.
    static func compact(_ n: Int) -> String {
        let v = Double(n)
        if v < 1000 { return "\(n)" }
        if v < 1_000_000 {
            let k = v / 1000
            return k.truncatingRemainder(dividingBy: 1) == 0
                ? "\(Int(k))K" : String(format: "%.1fK", k)
        }
        let m = v / 1_000_000
        return m.truncatingRemainder(dividingBy: 1) == 0
            ? "\(Int(m))M" : String(format: "%.1fM", m)
    }

    static func clock(_ seconds: Double) -> String {
        let m = Int(seconds) / 60
        let s = Int(seconds) % 60
        return String(format: "%d:%02d", m, s)
    }

    static func percent(_ fraction: Double) -> String {
        "\(Int((fraction * 100).rounded()))%"
    }

    /// "+1,234" style signed grouping.
    static func signed(_ n: Int) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        let body = f.string(from: NSNumber(value: n)) ?? "\(n)"
        return n >= 0 ? "+\(body)" : body
    }

    /// Countdown words: 90 → "1m 30s".
    static func words(_ seconds: Double) -> String {
        let total = Int(seconds)
        if total < 60 { return "\(total)s" }
        let m = total / 60
        let s = total % 60
        if m < 60 { return s == 0 ? "\(m)m" : "\(m)m \(s)s" }
        return "\(m / 60)h \(m % 60)m"
    }
}

// ============================================================
// MARK: - 3. Curves
// ============================================================

/// Shared progression math so mine + maze feel like one game.
enum SpookyCurves {
    /// XP for level n (1-based): gentle exponential, 80 base.
    static func xpForLevel(_ level: Int) -> Int {
        max(50, Int((80.0 * pow(1.28, Double(max(1, level) - 1))).rounded()))
    }

    /// Diminishing returns: total effort → effective bonus, soft cap k.
    static func diminishing(_ total: Double, cap k: Double) -> Double {
        k * total / (k + total)
    }

    /// Combo payout multiplier: +5% per step, capped at 3×.
    static func comboMultiplier(combo: Int) -> Double {
        guard combo > 0 else { return 1.0 }
        return min(3.0, 1.0 + Double(combo) * 0.05)
    }

    /// Depth pay curve 0…1 → 1…6×.
    static func depthPay(fraction: Double) -> Double {
        1.0 + 5.0 * min(1, max(0, fraction))
    }

    /// Feed cost curve for bonded animals.
    static func feedCost(bondLevel: Int) -> Int {
        20 + max(1, bondLevel) * 15
    }

    /// Rebirth power: +15% per rebirth, no cap (earned, not given).
    static func rebirthPower(rebirths: Int) -> Double {
        1.0 + Double(max(0, rebirths)) * 0.15
    }

    /// Rarity roll: returns 0 common … 3 legendary.
    static func rarityRoll(legendaryOdds: Double = 0.02) -> Int {
        let r = Double.random(in: 0...1)
        if r < legendaryOdds { return 3 }
        if r < legendaryOdds + 0.08 { return 2 }
        if r < legendaryOdds + 0.28 { return 1 }
        return 0
    }

    static func rarityName(_ tier: Int) -> String {
        switch tier {
        case 3: return "Legendary"
        case 2: return "Epic"
        case 1: return "Rare"
        default: return "Common"
        }
    }
}

// ============================================================
// MARK: - 4. Names
// ============================================================

/// Flavor-name generators: tunnels, pets, expeditions, sectors.
enum SpookyNames {
    static let tunnelAdjectives = [
        "Whispering", "Gloomy", "Gilded", "Howling", "Velvet", "Creaking",
        "Luminous", "Forgotten", "Humming", "Mossy", "Echoing",
        "Ember", "Frosty", "Winding", "Silent", "Grinning", "Drowsy",
    ]

    static let tunnelNouns = [
        "Warrens", "Galleries", "Drifts", "Stopes", "Adits", "Winzes",
        "Caverns", "Passages", "Burrows", "Vaults", "Arcades", "Labyrinths",
    ]

    static let petNames = [
        "Pebbles", "Nibbles", "Boxy", "Corners", "Wobble", "Tess",
        "RightAngle", "Plumb", "Mortar", "RightSize",
        "Squarepants", "Bevel", "Chamfer", "Dice", "Rubik", "Tetris",
    ]

    static let expeditionCodenames = [
        "Operation Lantern", "Project Canary", "Deep Delve", "Midnight Shift",
        "The Long Dark", "Echo Run", "Goldfever", "Crystal Dawn",
        "Warrens Waltz", "Pickaxe Promenade", "The Big Dig", "Mole Patrol",
    ]

    static let sectorEpithets = [
        "where the lanterns never die", "where echoes file complaints",
        "where gold grows on walls", "where cubes say hello",
        "where the map gives up", "where picks sing",
        "where shadows clock in", "where legends commute",
        "where the dark is just paint",
    ]

    /// "Howling Warrens", "Gilded Drifts", …
    static func tunnelName() -> String {
        "\(tunnelAdjectives.randomElement()!) \(tunnelNouns.randomElement()!)"
    }

    static func petName() -> String {
        petNames.randomElement()!
    }

    static func expeditionCodename() -> String {
        expeditionCodenames.randomElement()!
    }

    static func sectorEpithet() -> String {
        sectorEpithets.randomElement()!
    }

    /// Deterministic name from a number (stable per chunk/sector).
    static func tunnelName(seed: Int) -> String {
        let a = tunnelAdjectives[abs(seed) % tunnelAdjectives.count]
        let n = tunnelNouns[(abs(seed) / tunnelAdjectives.count) % tunnelNouns.count]
        return "\(a) \(n)"
    }
}

// ============================================================
// MARK: - 5. Atmosphere presets
// ============================================================

/// Mood recipe per depth/region: fog, light, particles, sound label.
struct AtmospherePreset {
    var name: String
    var emoji: String
    var fog: String
    var light: String
    var particles: [String]
    var sound: String
    var mood: String
}

enum AtmosphereGuide {
    static var mineLayers: [AtmospherePreset] = [
        AtmospherePreset(
            name: "Sunlit Tops", emoji: "🌿",
            fog: "None — daylight shafts",
            light: "Warm gold, long shadows",
            particles: ["✨", "🍂", "🦋"],
            sound: "Birdsong + distant picks",
            mood: "Hopeful. Every legend starts here."
        ),
        AtmospherePreset(
            name: "Dirt Tunnels", emoji: "🟫",
            fog: "Thin dust",
            light: "Amber work lamps",
            particles: ["✨", "💨"],
            sound: "Creaking timber, drips",
            mood: "Cozy industry. The commute layer."
        ),
        AtmospherePreset(
            name: "Stone Depths", emoji: "🪨",
            fog: "Low stone haze",
            light: "Cool white lanterns",
            particles: ["✨", "💎"],
            sound: "Deep groans, humming seams",
            mood: "Serious mining. The pay bump smells metallic."
        ),
        AtmospherePreset(
            name: "Deepstone", emoji: "⬛",
            fog: "Thick violet gloom",
            light: "Sparse blue torches",
            particles: ["💜", "✨", "👻"],
            sound: "Wraith sighs (decorative)",
            mood: "Beautiful dread. Double pay cures fear."
        ),
        AtmospherePreset(
            name: "Crystal Hollows", emoji: "🔮",
            fog: "Prismatic shimmer",
            light: "Rainbow refractions",
            particles: ["🔮", "✨", "🌈"],
            sound: "Glass harmonics",
            mood: "A cathedral that pays you to visit."
        ),
        AtmospherePreset(
            name: "Magma Core", emoji: "🔥",
            fog: "Heat shimmer",
            light: "Pulsing red-orange",
            particles: ["🔥", "🧡", "✨"],
            sound: "Slow volcanic breathing",
            mood: "The bottom of the world. Five times the pay."
        ),
    ]

    static var mazeBands: [AtmospherePreset] = [
        AtmospherePreset(
            name: "Northgate", emoji: "🧱",
            fog: "Cold grey drift",
            light: "Faint green wisp-light",
            particles: ["🌫️", "✨"],
            sound: "Wind through ribs of stone",
            mood: "The edge of the known map."
        ),
        AtmospherePreset(
            name: "The Deeps", emoji: "🌬️",
            fog: "Howling mist",
            light: "Flickering amber",
            particles: ["🍂", "✨", "🔮"],
            sound: "The famous howling (scales included)",
            mood: "Loud, rich, slightly haunted."
        ),
        AtmospherePreset(
            name: "The Heart", emoji: "💜",
            fog: "Warm lantern glow",
            light: "Friendly orange pools",
            particles: ["🏮", "✨", "📦"],
            sound: "Distant clinks + boxy squeaks",
            mood: "The maze's living room."
        ),
        AtmospherePreset(
            name: "The Warrens", emoji: "🌀",
            fog: "Forking shadows",
            light: "Uneven torchlight",
            particles: ["✨", "🕸️"],
            sound: "Your own footsteps, twice",
            mood: "Delightfully lost."
        ),
        AtmospherePreset(
            name: "Far Reaches", emoji: "🌌",
            fog: "Starfield dark",
            light: "Wisp-glow only",
            particles: ["✨", "🌠", "💫"],
            sound: "Silence with reverb",
            mood: "Past the last torch. Legends only."
        ),
    ]

    static func minePreset(for layerTitle: String) -> AtmospherePreset? {
        mineLayers.first(where: { $0.name == layerTitle })
    }

    static func mazePreset(for band: String) -> AtmospherePreset? {
        mazeBands.first(where: { $0.name == band })
    }

    /// One mood per mine sector (3×3 atlas): prospectors read the air.
    static var sectorPresets: [AtmospherePreset] = [
        AtmospherePreset(
            name: "North-West Dig", emoji: "🧭",
            fog: "Cold draught from unmapped dark",
            light: "Sparse blue torches",
            particles: ["🌫️", "✨"],
            sound: "Wind + far-away drips",
            mood: "The frontier corner. Foxes roam here."
        ),
        AtmospherePreset(
            name: "North-Central Dig", emoji: "⛏️",
            fog: "Dust of a hundred swings",
            light: "Amber work lamps",
            particles: ["✨", "💨"],
            sound: "Pick-ring echo",
            mood: "The classic claim. Coal and confidence."
        ),
        AtmospherePreset(
            name: "North-East Dig", emoji: "🦇",
            fog: "Bat-wing draught",
            light: "Flickering orange",
            particles: ["🦇", "✨"],
            sound: "Squeaks and wingbeats",
            mood: "Bat country. They mean no harm (mostly warning shots)."
        ),
        AtmospherePreset(
            name: "Heart-West Dig", emoji: "💜",
            fog: "Warm lantern glow",
            light: "Friendly orange pools",
            particles: ["🏮", "✨"],
            sound: "Clinks + timber creaks",
            mood: "The mine's living room."
        ),
        AtmospherePreset(
            name: "Heart-Central Dig", emoji: "🛤️",
            fog: "Crossroads haze",
            light: "Crossing lamps all colors",
            particles: ["✨", "🚪"],
            sound: "Footsteps from every direction",
            mood: "All roads meet. Closets multiply near forks."
        ),
        AtmospherePreset(
            name: "Heart-East Dig", emoji: "🔥",
            fog: "Warm shimmer",
            light: "Lava-glow from below",
            particles: ["🧡", "✨"],
            sound: "Deep heat ticking",
            mood: "The shaft down starts here. Pack snacks."
        ),
        AtmospherePreset(
            name: "South-West Dig", emoji: "🔮",
            fog: "Prismatic shimmer",
            light: "Crystal refractions",
            particles: ["🔮", "🌈", "✨"],
            sound: "Glass harmonics",
            mood: "Cave country. Harvest whole rings for bonuses."
        ),
        AtmospherePreset(
            name: "South-Central Dig", emoji: "⬛",
            fog: "Heavy deepstone gloom",
            light: "Sparse white lanterns",
            particles: ["💜", "✨"],
            sound: "Stone settling its shoulders",
            mood: "Double pay, double dark. Worth it."
        ),
        AtmospherePreset(
            name: "South-East Dig", emoji: "🌋",
            fog: "Heat shimmer + ember drift",
            light: "Pulsing red-orange",
            particles: ["🔥", "♦️", "✨"],
            sound: "Volcanic breathing",
            mood: "The magma gate. Rubies, opals, rebirth rights."
        ),
    ]

    static func sectorPreset(col: Int, row: Int) -> AtmospherePreset? {
        let index = row * 3 + col
        guard sectorPresets.indices.contains(index) else { return nil }
        return sectorPresets[index]
    }
}

// ============================================================
// MARK: - 5b. More names: vaults, critter titles, toasts
// ============================================================

extension SpookyNames {
    static let vaultNames = [
        "The Gilded Pocket", "Mole's Retirement", "The Cobweb Vault",
        "Echo Chamber of Gold", "The Square Deal", "Wisp's Pantry",
        "The Deep Deposit", "Pickaxe Paradise", "The Shimmer Cache",
        "Fortuna's Toolbox", "The Velvet Seam", "Claim 13",
    ]

    static let critterTitles = [
        "Professional Loiterer", "Cube of Distinction", "Licensed Hopper",
        "Gift Economist", "Corner Enthusiast", "Squaresmith",
        "Ambassador of genteel angles", "Right-Angle Royalty",
    ]

    static let levelUpLines = [
        "Stronger pick arm! (Both arms. Legs too.)",
        "The mine respects you slightly more.",
        "Rank up! Your shadow looks tougher.",
        "New rank, same immortal you.",
    ]

    static let sellLines = [
        "The cart groans happily.",
        "Coins! Glorious, jingly coins!",
        "The surface economy thanks you.",
        "Sold! The vault echoes your name.",
    ]

    static func vaultName() -> String {
        vaultNames.randomElement()!
    }

    static func critterTitle() -> String {
        critterTitles.randomElement()!
    }

    static func levelUpLine() -> String {
        levelUpLines.randomElement()!
    }

    static func sellLine() -> String {
        sellLines.randomElement()!
    }
}

// ============================================================
// MARK: - 5c. Rotating tips (date-seeded tip of the day)
// ============================================================

/// Sixty loading-screen-grade tips across both games. `today()` is stable
/// per calendar day, so everyone gets the same wisdom.
enum SpookyTips {
    static var mine: [String] = [
        "Coal is never sold — it stays banked for the forge. Hoard it proudly.",
        "The surface cart pays +25%. The walk back is part of the job.",
        "Full backpack? That's not a problem, that's a payday.",
        "Speed pets multiply swing damage. Swing damage multiplies everything.",
        "Luck caps at +50% double-drops (difficulty can push it to 60%).",
        "Magma Core pays ×5. Everything before it is a warm-up.",
        "New sectors bloom forks, caves, closets and visitors. Walk into the dark.",
        "Closet crates open by hand. Fakes still count for quests.",
        "Clear whole crystal caves for harvest bonuses. Rings, not singles.",
        "Bombs ignore pick tiers. Bedrock and lava ignore bombs.",
        "Twenty blocks earns a bomb. Spend them loudly, stand back proudly.",
        "Rebirth needs rank 15 + a Magma visit. Each cycle: +15% forever.",
        "Gold pets fatten whole sales. Equip one before every big sell.",
        "Emeralds fund backpack tiers single-handedly. Respect the green.",
        "Opals hide at the melt's edge. Bring your best pick and patience.",
        "Timber takes backpack space too. Upgrade the pack, thank the beams.",
        "Quests pay gold + XP. Claim them — the board holds three at a time.",
        "Lore echoes unlock from how you play. Sixty fragments. Go find Mabel.",
        "Critters gift gold AND ore. Befriend all five species.",
        "The Wisp pays 20–40 gold per visit. Believe in the rumor.",
        "Sectors pay 150 gold × rebirth on first visit. Nine sectors, nine paydays.",
        "Deep rock is tougher (+5 in Magma). Drills laugh at toughness.",
        "Your forecast panel projects gold/hour. Trust the math, dig the plan.",
        "Death is off. Aggression is free. Fight like it.",
        "The map shows your dot, your layer, your mood. Check it before long trips.",
        "Eggs scale in price with your herd. The sixth egg is an investment.",
        "Only 3 pets ride. Retire Commons without mercy.",
        "Lava warns, never wounds. Admire the glow, mind the glare.",
        "Bats warn before they dive. Whack the red eyes for a reward.",
        "Tutorials can be replayed in Settings. No shame in a refresher.",
    ]

    static var maze: [String] = [
        "Cubes are friends. If it squeaks, feed it — don't swing.",
        "Combos over 10× pay bonus points. Chain captures, chain wealth.",
        "Shiny bosses pay 50× base. Save cooldowns for the sparkle.",
        "Every fresh 24-unit chunk stamps a fork. Sprint fresh ground.",
        "Far Reaches hold the best wisp odds. Pack a lunch. A big lunch.",
        "Orb rings pay densest per swing. Howling Deeps first.",
        "Roundabout chambers hide the best closets. Check every ring.",
        "Bond level 3+ pals share gems when near. Feed them to get there.",
        "Hurting a friend halves its bond. Apologize with snacks (feeding).",
        "The journal holds expeditions, atlas and bonds. One button, whole career.",
        "Expeditions pay score + gold. Claim them — three ride at once.",
        "Regions pay discovery bonuses. Ten bands, ten paydays.",
        "Bosses enrage under 30% HP. Save Crystal Shield for the tantrum.",
        "Treasure rooms glow at 0.5 light. Follow the shimmer, not the growl.",
        "Sprint toggle lives in the hotbar. Hydrate (emotionally).",
        "Gilded Warrens glitter and mean it. Highest treasure density around.",
        "Tangle Warrens: forks in forks. Bring chalk. Thank the chalk lobby.",
        "Lantern Row: safest odds, fattest combos. Farm here.",
        "Ember Deeps: warm walls, red seams, bestiary-heavy but rich.",
        "Northgate: where haulage thins and legends thicken.",
        "Dragon perches are punish windows. Everything you have, all at once.",
        "Wither skull rain? Pillar. Always pillar.",
        "Vexes phase through rock. Swing where they're going, not where they are.",
        "Shulkers ARE the wall now. Burst between volleys.",
        "Evokers first? No — summons first, evoker second. Never reverse.",
        "Ravagers charge in lines. Pillars are your best friends.",
        "Phantoms dive without warning. Keep moving, keep swinging.",
        "Creepers hiss first. The hiss is your cue to be elsewhere.",
        "Endermen: don't stare, hit the feet, apologize to no one.",
        "Golden Wisps vacation in the Far Reaches. Join them. Richly.",
    ]

    /// Stable tip of the day (mine + maze), seeded by calendar date.
    static func today() -> (mine: String, maze: String) {
        let day = Calendar.current.ordinality(of: .day, in: .era, for: Date()) ?? 0
        return (
            mine[abs(day) % mine.count],
            maze[abs(day * 7 + 3) % maze.count]
        )
    }

    static func randomMine() -> String { mine.randomElement()! }
    static func randomMaze() -> String { maze.randomElement()! }
}

// ============================================================
// MARK: - 6. Toast queue + view
// ============================================================

/// Lightweight toast model for non-blocking announcements.
struct SpookyToast: Identifiable {
    let id = UUID()
    var emoji: String
    var title: String
    var detail: String
    var date = Date()
}

/// Coalescing toast queue (max 3 visible, 6 stored).
final class SpookyToastQueue: ObservableObject {
    @Published private(set) var toasts: [SpookyToast] = []
    let maxStored = 6

    func show(emoji: String, title: String, detail: String = "") {
        // Collapse repeats within 5s.
        if var last = toasts.last,
           last.title == title,
           Date().timeIntervalSince(last.date) < 5 {
            last.date = Date()
            if !detail.isEmpty { last.detail = detail }
            toasts[toasts.count - 1] = last
            return
        }
        toasts.append(SpookyToast(emoji: emoji, title: title, detail: detail))
        if toasts.count > maxStored {
            toasts.removeFirst(toasts.count - maxStored)
        }
        // Auto-expire after 4s.
        let id = toasts[toasts.count - 1].id
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            self?.toasts.removeAll(where: { $0.id == id })
        }
    }

    func dismiss(_ id: UUID) {
        toasts.removeAll(where: { $0.id == id })
    }

    func clear() { toasts.removeAll() }
}

/// Floating toast stack (top-center, tap to dismiss).
struct SpookyToastView: View {
    @ObservedObject var queue: SpookyToastQueue

    var body: some View {
        VStack(spacing: 8) {
            ForEach(Array(queue.toasts.suffix(3))) { toast in
                Button(action: { queue.dismiss(toast.id) }) {
                    HStack(spacing: 10) {
                        Text(toast.emoji).font(.title2)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(toast.title)
                                .font(.subheadline.bold()).foregroundColor(.white)
                            if !toast.detail.isEmpty {
                                Text(toast.detail)
                                    .font(.caption).foregroundColor(.white.opacity(0.8))
                            }
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.75))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.orange.opacity(0.5), lineWidth: 1)
                    )
                }
                .transition(.move(edge: .top).combined(with: .opacity))
            }
            Spacer()
        }
        .padding(.top, 60)
        .padding(.horizontal, 16)
        .allowsHitTesting(!queue.toasts.isEmpty)
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: queue.toasts.count)
    }
}

// ============================================================
// MARK: - 7. Difficulty presets
// ============================================================

/// Global spice dial. God-mode stays on regardless — difficulty only
/// tunes monster aggression, loot luck and prices, never lethality.
struct SpookyDifficulty: Equatable {
    var name: String
    var emoji: String
    var monsterAggression: Double // 0.5…2.0 chase/damage scale
    var lootLuck: Double // bonus double-drop chance
    var priceFactor: Double // shop/upgrade cost scale
    var detail: String

    static var casual: SpookyDifficulty {
        SpookyDifficulty(
            name: "Casual", emoji: "🛋️",
            monsterAggression: 0.5, lootLuck: 0.05, priceFactor: 0.8,
            detail: "Chill dig. Sleepy monsters, kind prices."
        )
    }

    static var adventurer: SpookyDifficulty {
        SpookyDifficulty(
            name: "Adventurer", emoji: "🧭",
            monsterAggression: 1.0, lootLuck: 0.0, priceFactor: 1.0,
            detail: "The intended balance. Spicy but fair."
        )
    }

    static var gremlin: SpookyDifficulty {
        SpookyDifficulty(
            name: "Gremlin", emoji: "👺",
            monsterAggression: 1.6, lootLuck: 0.12, priceFactor: 1.25,
            detail: "Feisty monsters, lucky pockets, proud prices."
        )
    }

    static var all: [SpookyDifficulty] { [casual, adventurer, gremlin] }
}
