import SwiftUI
import SceneKit
import AVFoundation

// ============================================================
// MARK: - Abandoned Mine: third-person voxel mine (Minecraft-style)
// Companion to SpookyGraveyard's overworld: same engine conventions
// (staged mining, GameClock loops, coordinator sync, event forwarding),
// but rebuilt finer and bigger:
//
// - Blocks are 1/3-size (U=1/3 world units). Plain rock is ONE merged
//   mesh (a few draw calls); ores/beams/lava stay individual minable
//   nodes, so the tiny voxels don't melt the GPU.
// - Bigger tunnels (4 wide x 3 high), crossroad grid, lava cavern.
// - Visible miner avatar in third-person: tap-to-walk + D-pad + drag look.
// - Pickaxe tiers (coal unlocks) gate lapis/opal/ruby/diamond.
// - Monsters: spiders, slimes, wraiths + ambient ghost audio.
// ============================================================

/// Block edge length in world units (half-size boxes: finer detail than
/// full-size, but 4x the geometry instead of 9x — iPad-safe).
let mineU: Float = 0.5

// MARK: - Blocks

enum MNBlockType: String, CaseIterable {
    case stone, deepslate, dirt, gravel
    case coalOre, ironOre, goldOre, lapisOre
    case redstoneOre, emeraldOre, rubyOre, diamondOre, opalOre
    case woodBeam, planks
    case lava, bedrock
    // Roblox-expansion: minable crystal growths (square / triangle /
    // sphere) + openable closet crates (some are fakes).
    case crystalCube, crystalSpike, crystalOrb, closetCrate
    // Frostfall biome: winter ores for the cold pockets.
    case frostOre, glacierCrystal, snowstone

    var isOre: Bool {
        switch self {
        case .coalOre, .ironOre, .goldOre, .lapisOre, .redstoneOre,
             .emeraldOre, .rubyOre, .diamondOre, .opalOre: return true
        default: return false
        }
    }

    var isUnbreakable: Bool { self == .bedrock || self == .lava }

    /// Minimum pick tier that can scratch it.
    var requiredTier: MNPickTier {
        switch self {
        case .coalOre: return .wooden
        case .ironOre: return .stone
        case .goldOre, .lapisOre: return .stone
        case .redstoneOre, .emeraldOre: return .iron
        case .rubyOre: return .golden
        case .diamondOre, .opalOre: return .diamond
        case .crystalCube, .crystalSpike: return .stone
        case .crystalOrb: return .iron
        case .closetCrate: return .wooden
        case .frostOre: return .stone
        case .glacierCrystal: return .iron
        case .snowstone: return .wooden
        default: return .wooden
        }
    }

    /// Taps to break at the required tier (softer picks bounce off).
    /// Tuned snappy: wood takes stone in 2 taps, coal in 2.
    var toughness: Float {
        switch self {
        case .bedrock, .lava: return .greatestFiniteMagnitude
        case .dirt, .gravel: return 1
        case .woodBeam, .planks: return 2
        case .stone, .deepslate: return 2
        case .coalOre, .ironOre, .lapisOre: return 3
        case .goldOre, .redstoneOre: return 4
        case .emeraldOre, .rubyOre: return 5
        case .diamondOre, .opalOre: return 6
        case .crystalCube: return 3
        case .crystalSpike: return 4
        case .crystalOrb: return 5
        case .closetCrate: return 1
        case .frostOre: return 3
        case .glacierCrystal: return 5
        case .snowstone: return 1
        }
    }

    var goldValue: Int {
        switch self {
        case .coalOre: return 2
        case .ironOre: return 4
        case .lapisOre: return 8
        case .goldOre: return 10
        case .redstoneOre: return 6
        case .emeraldOre: return 20
        case .rubyOre: return 30
        case .diamondOre: return 25
        case .opalOre: return 40
        case .crystalCube: return 14
        case .crystalSpike: return 18
        case .crystalOrb: return 26
        case .closetCrate: return 5
        case .frostOre: return 12
        case .glacierCrystal: return 22
        case .snowstone: return 1
        case .woodBeam, .planks: return 1
        default: return 0
        }
    }

    var xpReward: Int {
        switch self {
        case .coalOre: return 4
        case .ironOre: return 6
        case .lapisOre: return 10
        case .goldOre: return 12
        case .redstoneOre: return 8
        case .emeraldOre: return 24
        case .rubyOre: return 36
        case .diamondOre: return 30
        case .opalOre: return 50
        case .crystalCube: return 16
        case .crystalSpike: return 22
        case .crystalOrb: return 32
        case .closetCrate: return 8
        case .frostOre: return 14
        case .glacierCrystal: return 26
        case .snowstone: return 1
        case .stone, .deepslate: return 1
        default: return 0
        }
    }

    var displayName: String {
        switch self {
        case .stone: return "Stone"
        case .deepslate: return "Deepslate"
        case .dirt: return "Dirt"
        case .gravel: return "Gravel"
        case .coalOre: return "Coal Ore"
        case .ironOre: return "Iron Ore"
        case .goldOre: return "Gold Ore"
        case .lapisOre: return "Lapis Ore"
        case .redstoneOre: return "Redstone Ore"
        case .emeraldOre: return "Emerald Ore"
        case .rubyOre: return "Ruby Ore"
        case .diamondOre: return "Diamond Ore"
        case .opalOre: return "Opal Ore"
        case .woodBeam: return "Timber"
        case .planks: return "Planks"
        case .lava: return "Lava"
        case .bedrock: return "Bedrock"
        case .crystalCube: return "Cube Crystal"
        case .crystalSpike: return "Spike Crystal"
        case .crystalOrb: return "Orb Crystal"
        case .closetCrate: return "Closet Crate"
        case .frostOre: return "Frost Ore"
        case .glacierCrystal: return "Glacier Crystal"
        case .snowstone: return "Snowstone"
        }
    }

    var emoji: String {
        switch self {
        case .coalOre: return "⬛"
        case .ironOre: return "🟫"
        case .goldOre: return "🟨"
        case .lapisOre: return "🟦"
        case .redstoneOre: return "🟥"
        case .emeraldOre: return "🟩"
        case .rubyOre: return "♦️"
        case .diamondOre: return "💎"
        case .opalOre: return "🔮"
        case .woodBeam, .planks: return "🪵"
        case .lava: return "🔥"
        case .crystalCube: return "🟪"
        case .crystalSpike: return "🔺"
        case .crystalOrb: return "🔮"
        case .closetCrate: return "🚪"
        case .frostOre: return "❄️"
        case .glacierCrystal: return "🧊"
        case .snowstone: return "⬜"
        default: return "🪨"
        }
    }
}

// MARK: - Pickaxe tiers (coal unlocks)

enum MNPickTier: Int, CaseIterable, Codable {
    case wooden = 0, stone, iron, golden, diamond, crystal, drill

    var name: String {
        switch self {
        case .wooden: return "Wooden Pick"
        case .stone: return "Stone Pick"
        case .iron: return "Iron Pick"
        case .golden: return "Golden Pick"
        case .diamond: return "Diamond Pick"
        case .crystal: return "Crystal Pick"
        case .drill: return "Void Drill"
        }
    }

    var emoji: String {
        switch self {
        case .wooden: return "🪵⛏️"
        case .stone: return "🪨⛏️"
        case .iron: return "⛏️"
        case .golden: return "🌟⛏️"
        case .diamond: return "💎⛏️"
        case .crystal: return "🔮⛏️"
        case .drill: return "🌀⛏️"
        }
    }

    /// Damage per hit.
    var damage: Float {
        switch self {
        case .wooden: return 1.5
        case .stone: return 2
        case .iron: return 2.5
        case .golden: return 3
        case .diamond: return 4.5
        case .crystal: return 6
        case .drill: return 8.5
        }
    }

    /// Coal cost to unlock (deducted from mined Coal Ore).
    var coalCost: Int {
        switch self {
        case .wooden: return 0
        case .stone: return 8
        case .iron: return 20
        case .golden: return 35
        case .diamond: return 60
        case .crystal: return 100
        case .drill: return 160
        }
    }

    /// Ores this tier newly unlocks (for the upgrade panel).
    var unlocks: String {
        switch self {
        case .wooden: return "Coal"
        case .stone: return "Iron, Gold, Lapis"
        case .iron: return "Redstone, Emerald"
        case .golden: return "Ruby"
        case .diamond: return "Diamond, Opal"
        case .crystal: return "Crystals, faster everything"
        case .drill: return "Magma Core at full speed"
        }
    }
}

struct MNBlock: Identifiable {
    let id = UUID()
    var type: MNBlockType
    var position: SCNVector3 // center, world units
    var health: Float
    var maxHealth: Float
    var isDestroyed: Bool
    var damage: Float = 0
}

// MARK: - Bats & monsters

enum MNBatState {
    case circling   // harmless ambience
    case stalking   // silently closing in
    case warning    // hovering + red eyes after the screech: whack it!
    case diving     // swooping at the camera
    case retreating // fleeing
}

struct MNBat: Identifiable {
    let id = UUID()
    var position: SCNVector3
    var anchor: SCNVector3
    var state: MNBatState = .circling
    var phase: Float = Float.random(in: 0...6.28)
    var radius: Float = 2.5
    var speed: Float = 1.2
    var stateTimer: Double = 0
    var target: SCNVector3? = nil
}

enum MNMonsterKind: String, CaseIterable {
    case spider, slime, wraith

    var emoji: String {
        switch self {
        case .spider: return "🕷️"
        case .slime: return "🟢"
        case .wraith: return "👻"
        }
    }

    var maxHP: Int {
        switch self {
        case .spider: return 2
        case .slime: return 3
        case .wraith: return 5
        }
    }

    var speed: Float {
        switch self {
        case .spider: return 3.0
        case .slime: return 1.4
        case .wraith: return 2.0
        }
    }

    var damage: Int {
        switch self {
        case .spider: return 6
        case .slime: return 8
        case .wraith: return 12
        }
    }

    var goldReward: Int {
        switch self {
        case .spider: return 6
        case .slime: return 10
        case .wraith: return 18
        }
    }
}

struct MNMonster: Identifiable {
    let id = UUID()
    var kind: MNMonsterKind
    var position: SCNVector3
    var hp: Int
    var anchor: SCNVector3
    var wanderTarget: SCNVector3? = nil
    var wanderTimer: Double = 0
    var attackCooldown: Double = 0
    var phase: Float = Float.random(in: 0...6.28)
    var isDead: Bool = false
}

/// Rare friendly visitors: boxy animals that hop over, say hi, and gift
/// ore + gold. Never hostile, never damage — pure Roblox-style encounters.
struct MNBoxyCritter: Identifiable {
    let id = UUID()
    var species: String
    var emoji: String
    var color: UIColor
    var position: SCNVector3
    var anchor: SCNVector3
    var phase: Float = Float.random(in: 0...6.28)
    var wanderTarget: SCNVector3? = nil
    var wanderTimer: Double = 0
    var giftCooldown: Double = 0
    var greeted: Bool = false
}

// MARK: - Mining-Sim tycoon (layers, backpack, pets, rebirth)

/// Vertical biomes, Mining-Sim style: the deeper the layer, the harder
/// the rock and the richer the payout. Nothing here can kill — depth is
/// pure profit incentive under god-mode.
enum MNDepthLayer: String, CaseIterable {
    case meadow, dirt, stone, deepstone, crystal, magma

    var emoji: String {
        switch self {
        case .meadow: return "🌿"
        case .dirt: return "🟫"
        case .stone: return "🪨"
        case .deepstone: return "⬛"
        case .crystal: return "🔮"
        case .magma: return "🔥"
        }
    }

    var title: String {
        switch self {
        case .meadow: return "Sunlit Tops"
        case .dirt: return "Dirt Tunnels"
        case .stone: return "Stone Depths"
        case .deepstone: return "Deepstone"
        case .crystal: return "Crystal Hollows"
        case .magma: return "Magma Core"
        }
    }

    /// Reward multiplier on ore value + XP at this depth.
    var rewardMultiplier: Double {
        switch self {
        case .meadow: return 1.0
        case .dirt: return 1.2
        case .stone: return 1.5
        case .deepstone: return 2.0
        case .crystal: return 3.0
        case .magma: return 5.0
        }
    }

    /// Extra toughness added to every block at this depth.
    var hardnessBonus: Float {
        switch self {
        case .meadow: return 0
        case .dirt: return 0
        case .stone: return 1
        case .deepstone: return 2
        case .crystal: return 3
        case .magma: return 5
        }
    }

    static func at(y: Float) -> MNDepthLayer {
        if y >= 3 { return .meadow }
        if y >= 1 { return .dirt }
        if y >= -1 { return .stone }
        if y >= -3 { return .deepstone }
        if y >= -4.5 { return .crystal }
        return .magma
    }
}

/// Hatchable pets: speed pets dig faster, luck pets double ore drops,
/// gold pets fatten every sale. Equip up to 3 at once.
struct MNPet: Identifiable {
    let id = UUID()
    var species: String
    var emoji: String
    var rarity: String // Common / Rare / Epic / Legendary
    var boostKind: String // Speed / Luck / Gold
    var boostValue: Double // e.g. 0.25 = +25%
    var isEquipped: Bool = false

    static func hatch(number: Int) -> MNPet {
        let species = [
            ("Mole", "🦔"), ("Bat", "🦇"), ("Axolotl", "🦎"),
            ("Fox", "🦊"), ("Wisp", "✨"), ("Dragon", "🐉"),
        ].randomElement()!
        let r = Int.random(in: 1...100)
        let rarity: String
        let value: Double
        if r <= 2 { rarity = "Legendary"; value = 1.0 }
        else if r <= 10 { rarity = "Epic"; value = 0.5 }
        else if r <= 30 { rarity = "Rare"; value = 0.25 }
        else { rarity = "Common"; value = 0.1 }
        let kinds = ["Speed", "Luck", "Gold"]
        return MNPet(species: species.0, emoji: species.1, rarity: rarity,
                     boostKind: kinds[(number + r) % kinds.count], boostValue: value)
    }
}

// MARK: - Roblox-kit registries (forkroads, crystal caves, closets)

/// Forkroad junction styles, mirroring the maze's forkroads.
enum MNForkStyle: String, CaseIterable {
    case yFork = "Y-Fork", tJunction = "T-Junction"
    case crossroads = "4-Way Cross", roundabout = "Round Chamber"

    var emoji: String {
        switch self {
        case .yFork: return "🔱"
        case .tJunction: return "🛤️"
        case .crossroads: return "➕"
        case .roundabout: return "⭕"
        }
    }
}

/// Crystal growth shapes: square cubes, triangle spikes, sphere orbs.
enum MNCrystalShape: String, CaseIterable {
    case cube, spike, orb

    var blockType: MNBlockType {
        switch self {
        case .cube: return .crystalCube
        case .spike: return .crystalSpike
        case .orb: return .crystalOrb
        }
    }

    var emoji: String {
        switch self {
        case .cube: return "🟪"
        case .spike: return "🔺"
        case .orb: return "🔮"
        }
    }
}

/// A tracked crystal cave: harvest every growth for a completion bonus.
/// Some caves are sealed: redeem minerals to break the lock first.
struct MNCrystalCave: Identifiable {
    let id = UUID()
    var center: SCNVector3
    var shape: MNCrystalShape
    var cells: Set<MNCell>
    var announced: Bool = false
    var harvested: Bool = false
    var isLocked: Bool = false
    var unlockCost: [String: Int] = [:]
}

/// Closet cache kinds: snacks, tools, treasure — and cobweb fakes.
enum MNClosetKind: String, CaseIterable {
    case snacks, tools, treasure, fake

    var emoji: String {
        switch self {
        case .snacks: return "🍬"
        case .tools: return "🔧"
        case .treasure: return "💎"
        case .fake: return "🕸️"
        }
    }
}

/// A tracked frost pocket: clear its winter growths for a bonus.
struct MNFrostPocket: Identifiable {
    let id = UUID()
    var center: SCNVector3
    var cells: Set<MNCell>
    var harvested: Bool = false
}

/// An openable block-built closet. The registry tracks opened state so a
/// closet pays out exactly once.
struct MNClosetCache: Identifiable {    let id = UUID()
    var cell: MNCell
    var position: SCNVector3
    var kind: MNClosetKind
    var isOpened: Bool = false
}

// MARK: - Player / events
struct MNPlayer {
    var position: SCNVector3
    var health: Int
    var maxHealth: Int
    var experience: Int
    var level: Int
    var gold: Int
    var ores: [String: Int]
    var blocksMined: Int
    var batsRepelled: Int
    var monstersSlain: Int
    var pickTier: MNPickTier
    var yaw: Float = 0
    var pitch: Float = 0
    /// Tap-to-walk destination (world units), nil when idle/D-pad driving.
    var moveTarget: SCNVector3? = nil
    // --- Mining-Sim tycoon state (all defaulted so old inits compile) ---
    var backpackCapacity: Int = 50
    var backpackTier: Int = 0
    var sellValue: Int = 0 // unsold ore value riding in the backpack
    var pets: [MNPet] = []
    var rebirths: Int = 0
    var deepestY: Float = 99
    var sectorsFound: Set<String> = []

    /// Ore units currently in the backpack.
    var backpackUsed: Int { ores.values.reduce(0, +) }
    var backpackFull: Bool { backpackUsed >= backpackCapacity }
}

/// Events forwarded to the Ultimate manager (gold / XP / score).
enum MNEvent {
    case minedOre(String, Int)
    case batRepelled(Bool)
    case monsterSlain(String)
    case leveledUp(Int)
}

// Integer cell coords in third-units (world pos = (cell + 0.5) * U).
struct MNCell: Hashable, Sendable {
    let x: Int
    let y: Int
    let z: Int
}

// ============================================================
// MARK: - Mine Manager
// ============================================================

/// Pure-data world description (Sendable so gen can run off-main).
struct MineWorldData: Sendable {
    struct Block: Sendable {
        let id: UUID
        let type: MNBlockType
        let cell: MNCell
        let health: Float
        let maxHealth: Float
    }
    let blocks: [Block]
    let rock: [Set<MNCell>]
    let torches: [SIMD3<Float>]
}

final class MineManager: ObservableObject {
    // Instant-play: scene is usable immediately; gen streams in behind.
    @Published var worldReady = true
    @Published var player = MNPlayer(
        position: SCNVector3(0, 1.0, -15),
        health: 100, maxHealth: 100,
        experience: 0, level: 1,
        gold: 0, ores: [:],
        blocksMined: 0, batsRepelled: 0, monstersSlain: 0,
        pickTier: .wooden
    )
    /// Interactive (minable) blocks only: ores, beams, lava.
    @Published var blocks: [MNBlock] = []
    /// Merged static rock cells, grouped by material 0/1/2 (coordinator
    /// flattens each group into ONE node). Never changes after gen.
    @Published var rockGroups: [Set<MNCell>] = [Set(), Set(), Set()]
    @Published var bats: [MNBat] = []
    @Published var monsters: [MNMonster] = []
    /// Rare friendly visitors (boxy animals). Never hostile.
    @Published var critters: [MNBoxyCritter] = []
    /// Roblox-kit registries: tracked crystal caves + closet caches.
    @Published var mineCaves: [MNCrystalCave] = []
    @Published var mineClosets: [MNClosetCache] = []
    /// Frostfall registry: tracked winter pockets.
    @Published var mineFrost: [MNFrostPocket] = []
    // Smoothness + progression kits (standalone engines, one-line hooks).
    @Published var questBoard = MineQuestBoard()
    @Published var statTracker = MineStatTracker()
    @Published var frameMonitor = MineFrameMonitor()
    @Published var tutorial = MineTutorialState()
    /// Spice dial: monster feistiness, loot luck, prices. Never lethality.
    @Published var difficulty = SpookyDifficulty.adventurer
    /// All-time records board.
    @Published var bestSale: Int = 0
    @Published var richestPack: Int = 0
    /// Live weather director for the HUD overlay.
    @Published var weather = MineWeatherDirector()
    /// Cinematic queue for big moments (rebirths, seals, legendaries).
    @Published var cinema = MineCinematicDirector()
    private var lastLegendCine = Date.distantPast
    private var sawMagmaCine = false
    /// Daily spin gate (calendar-day string in UserDefaults).
    private let spinKey = "mineLastSpinDay.v1"

    /// True when today's free spin is still available.
    var canSpinToday: Bool {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return UserDefaults.standard.string(forKey: spinKey) != fmt.string(from: Date())
    }

    /// Roll the daily wheel: applies gold/XP/bombs, stamps the day.
    /// Returns nil when today's spin is spent.
    @discardableResult
    func dailySpin() -> MineSpinPrize? {        guard canSpinToday else {
            notify("🎡 Wheel recharges at midnight. Come back tomorrow!")
            return nil
        }
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        UserDefaults.standard.set(fmt.string(from: Date()), forKey: spinKey)
        let prize = MineSpinTable.roll()
        applySpin(prize)
        return prize
    }

    /// Stamp today's spin as spent (the wheel view calls this on award).
    func stampSpinDay() {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        UserDefaults.standard.set(fmt.string(from: Date()), forKey: spinKey)
    }

    /// Apply a rolled prize (wheel view + daily roll share this path).
    func applySpin(_ prize: MineSpinPrize) {
        player.gold += prize.gold
        player.experience += prize.xp
        bombs = min(9, bombs + prize.bombs)
        checkLevelUp()
        var bits: [String] = []
        if prize.gold > 0 { bits.append("+\(prize.gold)🪙") }
        if prize.xp > 0 { bits.append("+\(prize.xp) XP") }
        if prize.bombs > 0 { bits.append("+\(prize.bombs)🧨") }
        notify("🎡 Wheel pays \(prize.emoji) \(bits.joined(separator: " "))!")
    }
    @Published var torches: [SCNVector3] = []
    @Published var notifications: [String] = []
    @Published var swingId = 0
    @Published var scareId = 0
    @Published var damageTick = 0
    @Published var hurtId = 0
    @Published var lavaWarning = false
    @Published var lastHitIndex: Int? = nil
    @Published var lastHitMonster: UUID? = nil
    @Published var isMoving = false
    /// God-mode switch: when off, nothing in the mine can hurt you.
    @Published var lifeLossEnabled: Bool {
        didSet { UserDefaults.standard.set(lifeLossEnabled, forKey: "mineLifeLoss") }
    }

    var onEvent: ((MNEvent) -> Void)?

    /// Playable bounds (world units) — endless-mine size.
    let bound: Float = 60
    let eye: Float = 1.6

    private var clock: GameClock?
    private var moveClock: GameClock?
    private var sneakCooldown: Double = 18
    private var ghostAudioCooldown: Double = 12
    private var lavaHurtCooldown: Double = 0
    private var monsterRespawn: Double = 30
    private var lastLifetimeXP: Int = 0

    init() {
        // God-mode mine: nothing down here can kill you or drag you back.
        self.lifeLossEnabled = false
        UserDefaults.standard.set(false, forKey: "mineLifeLoss")
        self.worldReady = true // play instantly; world streams in behind
        // Quest rewards land straight in the player wallet.
        self.questBoard.onReward = { [weak self] gold, xp in
            guard let self = self else { return }
            self.player.gold += gold
            self.player.experience += xp
            self.checkLevelUp()
            self.notify("📜 Quest complete! +\(gold)🪙 +\(xp) XP!")
        }
        // World gen runs off-main with no blocking veil.
        Task {
            let data = await Task.detached(priority: .userInitiated) {
                MineManager.computeWorldData()
            }.value
            self.applyWorldData(data)
            self.spawnAmbientBats()
            self.spawnMonsters()
            self.spawnBoxyCritters()
            self.startLoop()
            self.worldReady = true
        }
    }

    deinit {
        clock?.invalidate()
        moveClock?.invalidate()
    }

    // MARK: - World gen (third-unit cells, world-unit layouts)

    /// Tunnel air test in WORLD units (layouts stay readable).
    /// Roblox-style endless dig: 6-wide, 4-high haulage running to ±60,
    /// crossroads every 18 units, deep level + lava cavern to match.
    static func isAirWorld(_ x: Float, _ y: Float, _ z: Float) -> Bool {
        // Main haulage N-S: 6 wide, 4 high, stretching far.
        if abs(x) <= 3 && abs(z) <= 60 && y >= 1 && y < 5 { return true }
        // Crossroads E-W every 18 units.
        for cz: Float in [-54, -36, -27, -18, -9, 0, 9, 18, 27, 36, 54] {
            if abs(x) <= 60 && abs(z - cz) <= 2 && y >= 1 && y < 5 { return true }
        }
        // Endless side drifts: repeating N-S veins every 24 X.
        for ox: Float in [-48, -24, 24, 48] {
            if abs(x - ox) <= 2 && abs(z) <= 60 && y >= 1 && y < 5 { return true }
        }
        // Shaft down at x 6...10 (widened).
        if x >= 6 && x <= 10 && abs(z) <= 2 && y >= -5 && y < 5 { return true }
        // Deep haulage N-S (endless).
        if abs(x) <= 3 && abs(z) <= 60 && y >= -5 && y < -1 { return true }
        // Deep crossroads.
        for cz: Float in [-36, -18, 0, 18, 36] {
            if abs(x) <= 60 && abs(z - cz) <= 2 && y >= -5 && y < -1 { return true }
        }
        // Deep side drifts.
        for ox: Float in [-48, -24, 24, 48] {
            if abs(x - ox) <= 2 && abs(z) <= 60 && y >= -5 && y < -1 { return true }
        }
        // Lava cavern room (deep east, expanded).
        if x >= 8 && x <= 24 && z >= 8 && z <= 24 && y >= -5 && y < 0 { return true }
        // Crystal caves: hollow gem pockets (square / spike / orb growths
        // ring their walls — see crystalType().
        if inCrystalCave(SCNVector3(x, y, z)) { return true }
        // Frostfall pockets: cold air with winter ores on the walls.
        if inFrostPocket(SCNVector3(x, y, z)) { return true }
        return false
    }

    /// Crystal cave pockets (center, radius). Kept in one list so air,
    /// ore and closet placement all agree on where the caves are.
    /// Fourteen pockets across both levels, deep and far.
    static func crystalCaves() -> [(SCNVector3, Float)] {
        [
            (SCNVector3(32, -3, 0), 6),
            (SCNVector3(-30, -3, 20), 5),
            (SCNVector3(0, -3, -40), 7),
            (SCNVector3(-20, 2, 30), 5),
            (SCNVector3(44, 2, -32), 5),
            (SCNVector3(-44, 2, -20), 5),
            (SCNVector3(0, -4, 44), 6),
            (SCNVector3(0, -4, -8), 5),            (SCNVector3(48, -4, 20), 6),
            (SCNVector3(-52, 2, 40), 5),
            (SCNVector3(12, 2, -52), 5),
            (SCNVector3(-36, -4, -36), 6),
            (SCNVector3(24, -3, -12), 4),
            (SCNVector3(8, -5, 54), 5),
        ]
    }

    /// Seal price by depth: shallow iron, deep gold, magma diamonds.
    static func sealCost(centerY: Float) -> [String: Int] {
        if centerY >= 0 { return ["Iron Ore": 8, "Coal Ore": 15] }
        if centerY >= -3 { return ["Gold Ore": 6, "Iron Ore": 10] }
        if centerY >= -4.5 { return ["Emerald Ore": 4, "Gold Ore": 6] }
        return ["Diamond Ore": 3, "Ruby Ore": 3]
    }

    /// Every third pocket is sealed (deterministic by index).
    static func caveSeal(index: Int, center: SCNVector3) -> (locked: Bool, cost: [String: Int]) {
        guard index % 3 == 2 else { return (false, [:]) }
        return (true, sealCost(centerY: center.y))
    }

    // MARK: - Frostfall biome (cold pockets)

    /// Frost pockets (center, radius): winter air in the rock.
    static func frostPockets() -> [(SCNVector3, Float)] {
        [
            (SCNVector3(-10, 2, -28), 5),
            (SCNVector3(30, 2, 14), 5),
            (SCNVector3(-24, -3, 20), 5),
            (SCNVector3(48, -3, -20), 5),
            (SCNVector3(0, 2, 36), 5),
        ]
    }

    static func inFrostPocket(_ p: SCNVector3) -> Bool {
        for (c, r) in frostPockets() {
            let dx = p.x - c.x, dy = (p.y - c.y) * 0.7, dz = p.z - c.z
            if dx * dx + dy * dy + dz * dz < r * r { return true }
        }
        return false
    }

    /// Winter growth per wall cell (deterministic): frost ore, glacier
    /// crystals, and plain snowstone filler.
    static func frostType(at c: MNCell) -> MNBlockType? {
        let h = abs(c.x * 41 + c.y * 59 + c.z * 23) % 10
        if h < 4 { return .frostOre }
        if h < 7 { return .glacierCrystal }
        if h < 9 { return .snowstone }
        return nil
    }

    static func inCrystalCave(_ p: SCNVector3) -> Bool {
        for (c, r) in crystalCaves() {
            let dx = p.x - c.x, dy = (p.y - c.y) * 0.7, dz = p.z - c.z
            if dx * dx + dy * dy + dz * dz < r * r { return true }
        }
        return false
    }

    /// Which crystal growth belongs on a cave wall cell (deterministic per
    /// cell so gen stays stable): cubes, spikes and orbs by hash.
    static func crystalType(at c: MNCell) -> MNBlockType? {
        let h = abs(c.x * 73 + c.y * 37 + c.z * 11) % 10
        if h < 4 { return .crystalCube }
        if h < 7 { return .crystalSpike }
        if h < 9 { return .crystalOrb }
        return nil
    }

    /// World position → cell coords (inverse of cellCenter).
    static func cellForWorld(_ w: Float) -> Int { Int((w / mineU - 0.5).rounded()) }
    static func cellForPos(_ p: SCNVector3) -> MNCell {
        MNCell(x: cellForWorld(p.x), y: cellForWorld(p.y), z: cellForWorld(p.z))
    }

    /// Deterministic closet kind per cell: snacks, tools, treasure, fakes.
    static func closetKind(at c: MNCell) -> MNClosetKind {
        switch abs(c.x * 13 + c.y * 5 + c.z * 7) % 10 {
        case 0..<4: return .snacks
        case 4..<7: return .tools
        case 7..<9: return .treasure
        default: return .fake
        }
    }

    static func cellCenter(_ c: MNCell) -> SCNVector3 {
        SCNVector3((Float(c.x) + 0.5) * mineU, (Float(c.y) + 0.5) * mineU, (Float(c.z) + 0.5) * mineU)
    }

    static func isAirCell(_ c: MNCell) -> Bool {
        let p = cellCenter(c)
        return isAirWorld(p.x, p.y, p.z)
    }

    static func isLavaFloor(_ c: MNCell) -> Bool {
        // Deep lava pools + cavern lake (floor layer cells).
        let p = cellCenter(c)
        guard p.y < -5.4 && p.y > -6.2 else { return false }
        let pools: [(Float, Float)] = [(13, 13), (-13, -13), (13, -13), (-13, 13)]
        for (px, pz) in pools {
            if abs(p.x - px) <= 0.7 && abs(p.z - pz) <= 0.7 { return true }
        }
        // Cavern lake.
        if p.x >= 9 && p.x <= 15 && p.z >= 9 && p.z <= 15 { return true }
        return false
    }

    static func oreRoll(deep: Bool, cavern: Bool) -> MNBlockType? {
        let r = Int.random(in: 1...100)
        if cavern {
            if r <= 8 { return .rubyOre }
            if r <= 14 { return .diamondOre }
            if r <= 18 { return .opalOre }
            if r <= 24 { return .goldOre }
            if r <= 28 { return .emeraldOre }
            return nil
        }
        if deep {
            if r <= 7 { return .coalOre }
            if r <= 12 { return .ironOre }
            if r <= 15 { return .goldOre }
            if r <= 17 { return .lapisOre }
            if r <= 19 { return .redstoneOre }
            if r <= 21 { return .emeraldOre }
            if r <= 22 { return .rubyOre }
            if r <= 23 { return .diamondOre }
            if r <= 24 { return .opalOre }
            return nil
        }
        if r <= 6 { return .coalOre }
        if r <= 9 { return .ironOre }
        if r <= 11 { return .goldOre }
        if r <= 12 { return .lapisOre }
        return nil
    }

    static func inCavern(_ p: SCNVector3) -> Bool {
        p.x >= 8 && p.x <= 16 && p.z >= 8 && p.z <= 16 && p.y < -1
    }

    /// Pure world computation (no self access — safe off-main).
    /// Two phases: exposed shell (ores live here) + one backing layer so
    /// mined ores reveal rock instead of holes. Deep interior is skipped.
    static func computeWorldData() -> MineWorldData {
        var ores: [MineWorldData.Block] = []
        var beams: [MineWorldData.Block] = []
        var lavas: [MineWorldData.Block] = []
        var torches: [SIMD3<Float>] = []
        var exposed = Set<MNCell>()
        // Cell bounds for ±60 world at 1/2 units, y -8...4.
        let B = 120, yLo = -16, yHi = 8
        for ix in -B...B {
            for iz in -B...B {
                for iy in yLo...yHi {
                    let c = MNCell(x: ix, y: iy, z: iz)
                    if isAirCell(c) {
                        // Timber posts replace air at tunnel flanks.
                        let postMain = (iy >= 2 && iy <= 7) && (ix == -4 || ix == 3) && (iz % 8 == 0)
                        let postDeep = (iy >= -10 && iy <= -5) && (ix == -4 || ix == 3) && (iz % 8 == 0)
                        if postMain || postDeep {
                            beams.append(MineWorldData.Block(id: UUID(), type: .woodBeam, cell: c,
                                                             health: 2, maxHealth: 2))
                        }
                        continue
                    }
                    let p = cellCenter(c)
                    if isLavaFloor(c) {
                        lavas.append(MineWorldData.Block(id: UUID(), type: .lava, cell: c,
                                                         health: 1, maxHealth: 1))
                        continue
                    }
                    if !touchesAir(c) { continue }
                    exposed.insert(c)
                    // Bedrock shell cells that touch air stay visible rock.
                    if iy == yLo || iy == yHi || abs(ix) == B || abs(iz) == B { continue }
                    let deep = p.y < -2
                    if let ore = oreRoll(deep: deep, cavern: inCavern(p)) {
                        ores.append(MineWorldData.Block(id: UUID(), type: ore, cell: c,
                                                         health: ore.toughness, maxHealth: ore.toughness))
                    }
                    // Cave walls grow cube / spike / orb crystals.
                    if inCrystalCave(p), let xtal = crystalType(at: c), Int.random(in: 1...100) <= 55 {
                        ores.append(MineWorldData.Block(id: UUID(), type: xtal, cell: c,
                                                         health: xtal.toughness, maxHealth: xtal.toughness))
                    }
                    // Frost walls grow winter ores.
                    if inFrostPocket(p), let frost = frostType(at: c), Int.random(in: 1...100) <= 55 {
                        ores.append(MineWorldData.Block(id: UUID(), type: frost, cell: c,
                                                         health: frost.toughness, maxHealth: frost.toughness))
                    }
                }
            }
        }
        // Static rock: exposed cells + backing ONLY behind interactive
        // cells (so mined ores reveal rock, not holes). Everything else
        // deep/interior is never visible — zero nodes.
        var rock: [Set<MNCell>] = [Set(), Set(), Set()]
        let oreCells = Set(ores.map(\.cell))
        let beamCells = Set(beams.map(\.cell))
        let lavaCells = Set(lavas.map(\.cell))
        // Closet crates: openable cupboards parked on tunnel floors
        // (upper haulage + deep level). Some are fakes.
        var closets: [MineWorldData.Block] = []
        func cellFor(world: Float) -> Int { Int((world / mineU - 0.5).rounded()) }
        var closetSpots: [SCNVector3] = []
        for x in [-48.0, -24.0, 0.0, 24.0, 48.0] as [Float] {
            for z in stride(from: -54.0, through: 54.0, by: 18.0) {
                closetSpots.append(SCNVector3(x + 2.5, 1.75, Float(z)))
            }
        }
        for x in [-24.0, 0.0, 24.0] as [Float] {
            for z in [-36.0, 0.0, 36.0] as [Float] {
                closetSpots.append(SCNVector3(x - 2.5, -4.75, Float(z)))
            }
        }
        for spot in closetSpots {
            let cell = MNCell(x: cellFor(world: spot.x), y: cellFor(world: spot.y), z: cellFor(world: spot.z))
            guard isAirCell(cell) else { continue }
            guard !oreCells.contains(cell) && !beamCells.contains(cell) && !lavaCells.contains(cell) else { continue }
            guard !closets.contains(where: { $0.cell == cell }) else { continue }
            closets.append(MineWorldData.Block(id: UUID(), type: .closetCrate, cell: cell,
                                               health: MNBlockType.closetCrate.toughness,
                                               maxHealth: MNBlockType.closetCrate.toughness))
        }
        let interactive = oreCells.union(beamCells).union(lavaCells).union(Set(closets.map(\.cell)))
        func rockMaterial(_ c: MNCell) -> Int {
            abs(c.x * 73 + c.y * 37 + c.z * 11) % 3
        }
        var shell = Set<MNCell>()
        for c in exposed {
            // Plain exposed rock shows itself.
            if !interactive.contains(c) { shell.insert(c) }
            // Backing behind interactive cells so holes show rock.
            if interactive.contains(c) {
                shell.insert(MNCell(x: c.x + 1, y: c.y, z: c.z))
                shell.insert(MNCell(x: c.x - 1, y: c.y, z: c.z))
                shell.insert(MNCell(x: c.x, y: c.y + 1, z: c.z))
                shell.insert(MNCell(x: c.x, y: c.y - 1, z: c.z))
                shell.insert(MNCell(x: c.x, y: c.y, z: c.z + 1))
                shell.insert(MNCell(x: c.x, y: c.y, z: c.z - 1))
            }
        }
        for c in shell {
            if isAirCell(c) { continue }
            if interactive.contains(c) { continue }
            rock[rockMaterial(c)].insert(c)
        }
        // Bedrock shell faces (only where they touch air).
        for ix in -B...B {
            for iz in -B...B {
                for iy in [yLo, yHi] {
                    let c = MNCell(x: ix, y: iy, z: iz)
                    if touchesAir(c) { rock[0].insert(c) }
                }
            }
        }
        // Torch decor along both levels (positions only; coordinator renders).
        for z in stride(from: -60.0, through: 60.0, by: 4.0) {
            torches.append(SIMD3(2.6, 3.4, Float(z)))
            torches.append(SIMD3(-2.6, 3.4, Float(z)))
        }
        for cz in [-54.0, -36.0, -18.0, 0.0, 18.0, 36.0, 54.0] as [Float] {
            for x in stride(from: -56.0, through: 56.0, by: 8.0) {
                torches.append(SIMD3(Float(x), 3.4, cz + 1.6))
                torches.append(SIMD3(Float(x), 3.4, cz - 1.6))
            }
        }
        for z in stride(from: -60.0, through: 60.0, by: 4.0) {
            torches.append(SIMD3(2.6, -3.6, Float(z)))
            torches.append(SIMD3(-2.6, -3.6, Float(z)))
        }
        for x in stride(from: 8.0, through: 14.0, by: 3.0) {
            torches.append(SIMD3(Float(x), -2.6, 8.0))
            torches.append(SIMD3(Float(x), -2.6, 14.0))
        }
        return MineWorldData(blocks: ores + beams + lavas + closets, rock: rock, torches: torches)
    }

    private func applyWorldData(_ data: MineWorldData) {
        blocks = data.blocks.map { b in
            MNBlock(type: b.type, position: Self.cellCenter(b.cell),
                    health: b.health, maxHealth: b.maxHealth, isDestroyed: false)
        }
        // Stable order keeps node matching predictable.
        blocks.sort { $0.position.x < $1.position.x }
        rockGroups = data.rock
        torches = data.torches.map { SCNVector3($0.x, $0.y, $0.z) }
        registerStaticClosets()
        registerStaticCaves()
        registerStaticFrost()
    }

    /// Registry for the pre-generated closet crates (kind by cell hash).
    private func registerStaticClosets() {
        for b in blocks where b.type == .closetCrate && !b.isDestroyed {
            let cell = Self.cellForPos(b.position)
            guard !mineClosets.contains(where: { $0.cell == cell }) else { continue }
            mineClosets.append(MNClosetCache(cell: cell, position: b.position,
                                             kind: Self.closetKind(at: cell)))
        }
    }

    /// Registry for the pre-generated crystal caves: cluster wall growths
    /// around each pocket, majority vote decides the cave's shape.
    /// Every third pocket is sealed (minerals redeem it).
    private func registerStaticCaves() {
        for (index, pocket) in Self.crystalCaves().enumerated() {
            let (center, r) = pocket
            var cells = Set<MNCell>()
            var votes: [MNCrystalShape: Int] = [:]
            for b in blocks where !b.isDestroyed {
                let shape: MNCrystalShape?
                switch b.type {
                case .crystalCube: shape = .cube
                case .crystalSpike: shape = .spike
                case .crystalOrb: shape = .orb
                default: shape = nil
                }
                guard let shape = shape else { continue }
                let dx = b.position.x - center.x, dy = b.position.y - center.y, dz = b.position.z - center.z
                guard dx * dx + dy * dy + dz * dz < (r + 2) * (r + 2) else { continue }
                cells.insert(Self.cellForPos(b.position))
                votes[shape, default: 0] += 1
            }
            guard !cells.isEmpty else { continue }
            let shape = votes.max(by: { $0.value < $1.value })?.key ?? .cube
            let seal = Self.caveSeal(index: index, center: center)
            mineCaves.append(MNCrystalCave(center: center, shape: shape, cells: cells,
                                           isLocked: seal.locked, unlockCost: seal.cost))
        }
    }

    /// Registry for frost pockets: cluster winter growths per pocket.
    private func registerStaticFrost() {
        for (center, r) in Self.frostPockets() {
            var cells = Set<MNCell>()
            for b in blocks where !b.isDestroyed {
                switch b.type {
                case .frostOre, .glacierCrystal, .snowstone:
                    break
                default:
                    continue
                }
                let dx = b.position.x - center.x, dy = b.position.y - center.y, dz = b.position.z - center.z
                guard dx * dx + dy * dy + dz * dz < (r + 2) * (r + 2) else { continue }
                cells.insert(Self.cellForPos(b.position))
            }
            guard !cells.isEmpty else { continue }
            mineFrost.append(MNFrostPocket(center: center, cells: cells))
        }
    }

    static func touchesAir(_ c: MNCell) -> Bool {
        isAirCell(MNCell(x: c.x + 1, y: c.y, z: c.z)) ||
        isAirCell(MNCell(x: c.x - 1, y: c.y, z: c.z)) ||
        isAirCell(MNCell(x: c.x, y: c.y + 1, z: c.z)) ||
        isAirCell(MNCell(x: c.x, y: c.y - 1, z: c.z)) ||
        isAirCell(MNCell(x: c.x, y: c.y, z: c.z + 1)) ||
        isAirCell(MNCell(x: c.x, y: c.y, z: c.z - 1))
    }

    // MARK: - Movement (third-person avatar, tap-to-walk + D-pad)

    func eyePos() -> SCNVector3 {
        SCNVector3(player.position.x, player.position.y + 1.4, player.position.z)
    }

    func lookDir() -> SCNVector3 {
        let cp = cos(player.pitch)
        return SCNVector3(sin(player.yaw) * cp, sin(player.pitch), cos(player.yaw) * cp)
    }

    func look(deltaYaw: Float, deltaPitch: Float) {
        tutorial.complete(.look)
        player.yaw += deltaYaw
        player.pitch = max(-Float.pi / 2 + 0.01, min(Float.pi / 2 - 0.01, player.pitch + deltaPitch))
    }

    func turnPlayer(_ angle: Float) { player.yaw += angle }

    /// Analytic collision: slide along walls (no solid-cell storage needed).
    func tryMove(_ delta: SCNVector3) {
        let p = player.position
        func free(_ x: Float, _ z: Float) -> Bool {
            // Sample feet + head cells around a 0.25-radius body.
            for oy in [0.2, 1.0] as [Float] {
                for ox in [-0.25, 0.25] as [Float] {
                    for oz in [-0.25, 0.25] as [Float] {
                        if !pointIsAir(x: x + ox, y: p.y + oy, z: z + oz) { return false }
                    }
                }
            }
            return true
        }
        let nx = p.x + delta.x, nz = p.z + delta.z
        if free(nx, nz) {
            player.position.x = max(-bound, min(bound, nx))
            player.position.z = max(-bound, min(bound, nz))
        } else if free(nx, p.z) {
            player.position.x = max(-bound, min(bound, nx))
        } else if free(p.x, nz) {
            player.position.z = max(-bound, min(bound, nz))
        }
        snapToFloor()
    }

    private func pointIsAir(x: Float, y: Float, z: Float) -> Bool {
        // Timber posts are solid (slide around them); everything else
        // interactive is thin enough to ignore for collision.
        Self.isAirWorld(x, y, z)
    }

    /// Analytic air test for a world point (camera collision, tap walk).
    func isAirAt(_ p: SCNVector3) -> Bool {
        let c = MNCell(x: Int(floor(p.x / mineU)), y: Int(floor(p.y / mineU)), z: Int(floor(p.z / mineU)))
        return Self.isAirCell(c)
    }

    func snapToFloor() {
        player.position.y = floorHeightAt(x: player.position.x, z: player.position.z)
    }

    func floorHeightAt(x: Float, z: Float) -> Float {
        // Ramp through the shaft from the main level down to the deep level.
        if x >= 6.5 && x <= 9.5 && z >= -1.5 && z <= 1.5 {
            let k = min(1, max(0, (x - 6.5) / 3.0))
            return 0 + (-6 - 0) * k + 1.0
        }
        if player.position.y < -2 { return -5.0 }
        return 1.0
    }

    func moveForward(_ dist: Float) {
        let d = max(min(dist, 1.5), -1.5)
        tryMove(SCNVector3(sin(player.yaw) * d, 0, cos(player.yaw) * d))
    }

    func strafe(_ dist: Float) {
        let d = max(min(dist, 1.5), -1.5)
        let a = player.yaw + Float.pi / 2
        tryMove(SCNVector3(sin(a) * d, 0, cos(a) * d))
    }

    func movePlayer(dx: Float, dz: Float) {
        if dz != 0 { moveForward(-dz) }
        if dx != 0 { strafe(dx) }
    }

    /// D-pad: dx = strafe, dz = walk (held). Turning is drag-to-look.
    var strafeInput: Float = 0
    var walkInput: Float = 0
    func startMoving(dx: Float, dz: Float) {
        player.moveTarget = nil
        strafeInput = dx
        walkInput = -dz
        ensureMoveClock()
    }
    func stopMoving() {
        strafeInput = 0
        walkInput = 0
    }

    /// Tap-to-walk destination (world units).
    func walkTo(_ point: SCNVector3) {
        strafeInput = 0
        walkInput = 0
        player.moveTarget = SCNVector3(point.x, player.position.y, point.z)
        ensureMoveClock()
    }

    private func ensureMoveClock() {
        if moveClock != nil { return }
        let clock = GameClock(framesPerSecond: 60)
        clock.add { [weak self] dt in self?.drive(dt: Float(dt)) }
        moveClock = clock
    }

    private let walkSpeed: Float = 4.5
    private func drive(dt: Float) {
        let moving: Bool
        if strafeInput != 0 || walkInput != 0 {
            let fwd = SCNVector3(sin(player.yaw) * walkInput, 0, cos(player.yaw) * walkInput)
            let a = player.yaw + Float.pi / 2
            let side = SCNVector3(sin(a) * strafeInput, 0, cos(a) * strafeInput)
            tryMove(SCNVector3((fwd.x + side.x) * walkSpeed * dt, 0,
                               (fwd.z + side.z) * walkSpeed * dt))
            moving = true
        } else if let t = player.moveTarget {
            let dx = t.x - player.position.x, dz = t.z - player.position.z
            let dist = sqrt(dx * dx + dz * dz)
            if dist < 0.4 {
                player.moveTarget = nil
                moving = false
            } else {
                let want = atan2(dx, dz)
                var diff = want - player.yaw
                while diff > Float.pi { diff -= 2 * Float.pi }
                while diff < -Float.pi { diff += 2 * Float.pi }
                player.yaw += max(-2.5 * dt, min(2.5 * dt, diff))
                tryMove(SCNVector3(sin(player.yaw) * walkSpeed * dt, 0,
                                   cos(player.yaw) * walkSpeed * dt))
                moving = true
            }
        } else {
            moving = false
        }
        if moving != isMoving { isMoving = moving }
        if moving {
            trackExploration() // sectors + deepest depth
            statTracker.recordMove(x: player.position.x, z: player.position.z)
            tutorial.complete(.move)
            if currentLayer != .meadow { tutorial.complete(.layer) }
        }
        if !moving && player.moveTarget == nil && strafeInput == 0 && walkInput == 0 {
            moveClock?.invalidate()
            moveClock = nil
        }
    }

    // MARK: - Sim loop (bats, monsters, director, lava, ghost audio)

    private var simClock: GameClock?

    private func startLoop() {
        var phase = 0
        let clock = GameClock(framesPerSecond: 10)
        clock.add { [weak self] dt in
            guard let self = self else { return }
            self.updateBats(dt: Float(dt))
            self.updateMonsters(dt: Float(dt))
            self.updateCritters(dt: Float(dt))
            self.updateBombs(dt: Float(dt))
            self.frameMonitor.recordFrame(dt: dt)
            self.statTracker.tick(dt: dt)
            phase += 1
            if phase % 5 == 0 { self.updateSlow() }
        }
        simClock = clock
    }

    private func updateSlow() {
        // Lava aura.
        lavaHurtCooldown -= 0.5
        var nearLava = false
        for b in blocks where b.type == .lava && !b.isDestroyed {
            let dx = b.position.x - player.position.x
            let dy = b.position.y - player.position.y
            let dz = b.position.z - player.position.z
            if dx * dx + dy * dy + dz * dz < 2.4 * 2.4 { nearLava = true; break }
        }
        lavaWarning = nearLava
        if nearLava && lavaHurtCooldown <= 0 && player.health > 0 {
            lavaHurtCooldown = 2.0
            hurt(4, cause: "🔥 Lava burns! Back away!")
        }
        if !nearLava && player.health > 0 && player.health < player.maxHealth {
            player.health = min(player.maxHealth, player.health + 1)
        }
        // Occasional spooky ghost audio from the deep.
        ghostAudioCooldown -= 0.5
        if ghostAudioCooldown <= 0 {
            ghostAudioCooldown = Double.random(in: 25...50)
            switch Int.random(in: 0...2) {
            case 0: AWSound.shared.wail()
            case 1: AWSound.shared.moan()
            default: AWSound.shared.drip()
            }
        }
        // Monster respawns keep the mine lively (caps enforced).
        monsterRespawn -= 0.5
        if monsterRespawn <= 0 {
            monsterRespawn = 30
            topUpMonsters()
        }
        // Lifetime XP sync: catches every source (mining, closets, gifts).
        let gained = player.experience - lastLifetimeXP
        if gained > 0 {
            questBoard.record(.xpEarned(amount: gained))
            lastLifetimeXP = player.experience
        }
    }

    private func hurt(_ dmg: Int, cause: String) {
        // Immortal mine: damage is a warning + tiny chip that floors at 1.
        // Never respawns, never drags the player back to the entrance.
        guard player.health > 0 else { player.health = 1; return }
        if lifeLossEnabled {
            player.health = max(1, player.health - dmg)
        }
        hurtId += 1
        damageTick += 1
        notify("🛡️ \(cause) — protected (\(player.health)❤️)")
        if player.health < 1 { player.health = 1 }
    }

    private func respawn() {
        // In-place recovery only: stay exactly where you are.
        player.moveTarget = nil
        player.health = player.maxHealth
        notify("🛡️ Shielded! You hold your ground — no trip back to the entrance.")
    }

    func notify(_ msg: String) {
        notifications.append(msg)
        if notifications.count > 30 { notifications.removeFirst() }
    }

    // MARK: - Bats

    func spawnAmbientBats() {
        let anchors = [
            SCNVector3(0, 2.5, 0), SCNVector3(0, 2.5, -12), SCNVector3(-8, 2.5, 8),
            SCNVector3(8, 2.5, -8), SCNVector3(0, -3.5, 5), SCNVector3(-8, -3.5, -8),
            SCNVector3(12, -3, 12),
        ]
        for a in anchors {
            bats.append(MNBat(position: a, anchor: a,
                              phase: Float.random(in: 0...6.28),
                              radius: Float.random(in: 1.8...3.2),
                              speed: Float.random(in: 0.8...1.6)))
        }
    }

    private func updateBats(dt: Float) {
        sneakCooldown -= Double(dt)
        let busy = bats.contains { $0.state == .stalking || $0.state == .warning || $0.state == .diving }
        if sneakCooldown <= 0 && !busy && player.health > 0 {
            sneakCooldown = Double.random(in: 22...40)
            beginSneakAttack()
        }
        for i in bats.indices {
            switch bats[i].state {
            case .circling:
                bats[i].phase += dt * bats[i].speed
                let p = bats[i].phase
                bats[i].position = SCNVector3(
                    bats[i].anchor.x + cos(p) * bats[i].radius,
                    bats[i].anchor.y + sin(p * 1.7) * 0.5,
                    bats[i].anchor.z + sin(p) * bats[i].radius
                )
            case .stalking:
                bats[i].stateTimer -= Double(dt)
                let behind = SCNVector3(
                    player.position.x - sin(player.yaw) * 5,
                    player.position.y + 1.5,
                    player.position.z - cos(player.yaw) * 5
                )
                moveBatToward(i, target: behind, speed: 2.5 * dt)
                if bats[i].stateTimer <= 0 {
                    bats[i].state = .warning
                    bats[i].stateTimer = 0.9
                    scareId += 1
                    AWSound.shared.screech()
                    notify("🦇 SCREECH! Something dives at you — TAP IT!")
                }
            case .warning:
                bats[i].stateTimer -= Double(dt)
                bats[i].position.y += sin(Float(Date().timeIntervalSince1970 * 40)) * 0.02
                if bats[i].stateTimer <= 0 {
                    bats[i].state = .diving
                    bats[i].stateTimer = 1.1
                    bats[i].target = SCNVector3(player.position.x, player.position.y + 1.5, player.position.z)
                }
            case .diving:
                bats[i].stateTimer -= Double(dt)
                if let t = bats[i].target {
                    moveBatToward(i, target: t, speed: 9 * dt)
                }
                if bats[i].stateTimer <= 0 {
                    hurt(Int.random(in: 8...15), cause: "🦇 The bat slashes you!")
                    retreatBat(i)
                }
            case .retreating:
                bats[i].stateTimer -= Double(dt)
                bats[i].position.y += 3 * dt
                bats[i].position.x += sin(bats[i].phase) * 2 * dt
                if bats[i].stateTimer <= 0 {
                    bats[i].state = .circling
                    bats[i].anchor = SCNVector3(player.position.x + Float.random(in: -10...10),
                                                player.position.y + 1,
                                                player.position.z + Float.random(in: -10...10))
                }
            }
        }
    }

    private func moveBatToward(_ i: Int, target: SCNVector3, speed: Float) {
        let p = bats[i].position
        var d = SCNVector3(target.x - p.x, target.y - p.y, target.z - p.z)
        let len = sqrt(d.x * d.x + d.y * d.y + d.z * d.z)
        guard len > 0.05 else { return }
        d.x /= len; d.y /= len; d.z /= len
        bats[i].position = SCNVector3(p.x + d.x * speed, p.y + d.y * speed, p.z + d.z * speed)
    }

    private func beginSneakAttack() {
        let behind = SCNVector3(
            player.position.x - sin(player.yaw) * 7,
            player.position.y + 1.5,
            player.position.z - cos(player.yaw) * 7
        )
        bats.append(MNBat(position: behind, anchor: behind, state: .stalking,
                           speed: 2.0, stateTimer: 3.0))
    }

    private func retreatBat(_ i: Int) {
        guard bats.indices.contains(i) else { return }
        bats[i].state = .retreating
        bats[i].stateTimer = 2.0
    }

    /// Tap-to-whack: diving/warning bats within reach are repelled.
    func whackBat(id: UUID) {
        guard let i = bats.firstIndex(where: { $0.id == id }) else { return }
        let bp = bats[i].position
        let dx = bp.x - player.position.x, dy = bp.y - (player.position.y + 1.5), dz = bp.z - player.position.z
        guard sqrt(dx * dx + dy * dy + dz * dz) < 7 else {
            notify("🦇 Too far to swat!")
            return
        }
        switch bats[i].state {
        case .diving, .warning:
            repelBat(i)
        case .stalking:
            notify("🦇 You spot it lurking and scare it off!")
            retreatBat(i)
        case .circling:
            AWSound.shared.squeak()
            retreatBat(i)
        case .retreating:
            break
        }
    }

    /// Rewarded repel (tap whacks + blast scatter share this).
    private func repelBat(_ i: Int) {
        guard bats.indices.contains(i) else { return }
        player.batsRepelled += 1
        player.gold += 8
        player.experience += 15
        checkLevelUp()
        onEvent?(.batRepelled(true))
        notify("💥 WHACK! Bat repelled! +8🪙")
        retreatBat(i)
    }

    // MARK: - Monsters (spiders, slimes, wraiths)

    func spawnMonsters() {
        let defs: [(MNMonsterKind, SCNVector3)] = [
            (.spider, SCNVector3(-8, 1, 6)), (.spider, SCNVector3(8, 1, -4)),
            (.spider, SCNVector3(0, 1, 14)), (.spider, SCNVector3(-12, 1, -6)),
            (.slime, SCNVector3(12, -5, 12)), (.slime, SCNVector3(-12, -5, -12)),
            (.slime, SCNVector3(6, -5, -10)),
            (.wraith, SCNVector3(0, -4, -10)), (.wraith, SCNVector3(-10, -4, 8)),
            (.wraith, SCNVector3(12, -4, 12)),
        ]
        for (kind, pos) in defs {
            monsters.append(MNMonster(kind: kind, position: pos, hp: kind.maxHP, anchor: pos))
        }
    }

    private func topUpMonsters() {
        func count(_ k: MNMonsterKind) -> Int {
            monsters.filter { $0.kind == k && !$0.isDead }.count
        }
    let wants: [(MNMonsterKind, Int, SCNVector3)] = [
        (.spider, 4, SCNVector3(Float.random(in: -50...50), 1, Float.random(in: -50...50))),
        (.slime, 3, SCNVector3(Float.random(in: -50...50), -5, Float.random(in: -50...50))),
        (.wraith, 3, SCNVector3(Float.random(in: -50...50), -4, Float.random(in: -50...50))),
    ]
        for (kind, cap, pos) in wants where count(kind) < cap {
            monsters.append(MNMonster(kind: kind, position: pos, hp: kind.maxHP, anchor: pos))
        }
        monsters.removeAll { $0.isDead && Double.random(in: 0...1) < 0.5 }
    }

    /// Seed the mine's rare boxy visitors across both levels.
    func spawnBoxyCritters() {
        let defs: [(String, String, UIColor, SCNVector3)] = [
            ("Mole", "📦", UIColor(red: 0.6, green: 0.45, blue: 0.3, alpha: 1), SCNVector3(10, 1, 20)),
            ("Bat", "📦", UIColor(red: 0.35, green: 0.25, blue: 0.5, alpha: 1), SCNVector3(-18, 2.5, -8)),
            ("Axolotl", "📦", UIColor(red: 1.0, green: 0.6, blue: 0.75, alpha: 1), SCNVector3(14, -4, 12)),
            ("Fox", "📦", UIColor(red: 0.95, green: 0.5, blue: 0.2, alpha: 1), SCNVector3(-30, 1, 30)),
            ("Wisp", "✨", UIColor(red: 1.0, green: 0.85, blue: 0.3, alpha: 1), SCNVector3(0, -3.5, -44)),
        ]
        for (species, emoji, color, pos) in defs {
            critters.append(MNBoxyCritter(species: species, emoji: emoji, color: color,
                                          position: pos, anchor: pos))
        }
    }

    /// Curious hopping friends: drift toward the player when close, wander
    /// otherwise, and gift ore + gold on a cooldown. Never hostile.
    private func updateCritters(dt: Float) {
        guard critters.count < 12 else { return }
        for i in critters.indices {
            var c = critters[i]
            let dx = player.position.x - c.position.x
            let dz = player.position.z - c.position.z
            let dist = sqrt(dx * dx + dz * dz)
            c.phase += dt * 6
            c.giftCooldown -= Double(dt)
            if dist < 7 && dist > 0.5 {
                // Hop over to say hi (y locked near its floor).
                let step: Float = 1.6 * dt
                c.position.x += dx / max(dist, 0.01) * step
                c.position.z += dz / max(dist, 0.01) * step
            } else if dist >= 7 {
                c.wanderTimer -= Double(dt)
                if c.wanderTimer <= 0 || c.wanderTarget == nil {
                    c.wanderTimer = Double.random(in: 3...6)
                    c.wanderTarget = SCNVector3(
                        c.anchor.x + Float.random(in: -5...5), c.anchor.y,
                        c.anchor.z + Float.random(in: -5...5))
                }
                if let t = c.wanderTarget {
                    let wx = t.x - c.position.x, wz = t.z - c.position.z
                    let wd = sqrt(wx * wx + wz * wz)
                    if wd > 0.3 {
                        c.position.x += wx / wd * 0.8 * dt
                        c.position.z += wz / wd * 0.8 * dt
                    }
                }
            }
            c.position.y = c.anchor.y + abs(sin(c.phase)) * 0.25
            if dist < 1.8 && c.giftCooldown <= 0 {
                c.giftCooldown = 40
                let gold = c.species == "Wisp" ? Int.random(in: 20...40) : Int.random(in: 5...15)
                player.gold += gold
                player.experience += 10
                // Boxy friends also share pocket ore (bonus, never capacity-gated).
                let oreGifts = ["Iron Ore": 4, "Gold Ore": 10, "Diamond Ore": 25, "Emerald Ore": 20]
                let ore = oreGifts.keys.randomElement()!
                player.ores[ore, default: 0] += 2
                player.sellValue += (oreGifts[ore] ?? 0) * 2
                checkLevelUp()
                statTracker.recordGift()
                if !c.greeted {
                    questBoard.record(.critterGreeted)
                    statTracker.recordCritter()
                    if c.species == "Wisp" {
                        cinema.play(.wispGreeting)
                    }
                    c.greeted = true
                    notify("\(c.emoji) Rare encounter: Boxy \(c.species)! It likes you. (+\(gold)🪙, +2 \(ore))")
                } else {
                    notify("\(c.emoji) Boxy \(c.species) shares a gift! (+\(gold)🪙, +2 \(ore))")
                }
            }
            critters[i] = c
        }
    }

    private func updateMonsters(dt: Float) {
        for i in monsters.indices where !monsters[i].isDead {
            var m = monsters[i]
            let dx = player.position.x - m.position.x
            let dz = player.position.z - m.position.z
            let dist = sqrt(dx * dx + dz * dz)
        m.attackCooldown -= Double(dt)
        // Difficulty scales the chase radius (never the lethality).
        if dist < Float(9 * difficulty.monsterAggression) && player.health > 0 {
                // Chase (y locked to its floor).
                let step = m.kind.speed * dt
                m.position.x += dx / max(dist, 0.01) * step
                m.position.z += dz / max(dist, 0.01) * step
                m.phase += dt * 6
                if dist < 1.4 && m.attackCooldown <= 0 {
                    m.attackCooldown = 1.5
                    hurt(m.kind.damage, cause: "\(m.kind.emoji) \(m.kind.rawValue) hits you!")
                }
            } else {
                // Wander near anchor.
                m.wanderTimer -= Double(dt)
                if m.wanderTimer <= 0 || m.wanderTarget == nil {
                    m.wanderTimer = Double.random(in: 3...6)
                    m.wanderTarget = SCNVector3(
                        m.anchor.x + Float.random(in: -4...4), m.anchor.y,
                        m.anchor.z + Float.random(in: -4...4))
                }
                if let t = m.wanderTarget {
                    let wx = t.x - m.position.x, wz = t.z - m.position.z
                    let wd = sqrt(wx * wx + wz * wz)
                    if wd > 0.3 {
                        m.position.x += wx / wd * m.kind.speed * 0.4 * dt
                        m.position.z += wz / wd * m.kind.speed * 0.4 * dt
                        m.phase += dt * 3
                    }
                }
            }
            // Slimes hop; wraiths hover.
            if m.kind == .slime {
                m.position.y = m.anchor.y + abs(sin(m.phase)) * 0.3
            } else if m.kind == .wraith {
                m.position.y = m.anchor.y + 0.5 + sin(m.phase * 0.7) * 0.3
            }
            monsters[i] = m
        }
    }

    /// Tap a monster: pick damage, knockback, loot on kill.
    func whackMonster(id: UUID) {
        guard let i = monsters.firstIndex(where: { $0.id == id && !$0.isDead }) else { return }
        let m = monsters[i]
        let dx = m.position.x - player.position.x, dz = m.position.z - player.position.z
        let dist = sqrt(dx * dx + dz * dz)
        guard dist < 7 else {
            notify("\(m.kind.emoji) Too far to hit!")
            return
        }
        swingId += 1
        damageMonster(i, amount: Int(player.pickTier.damage), from: player.position)
    }

    /// Shared damage path for taps and blasts.
    private func damageMonster(_ i: Int, amount: Int, from: SCNVector3) {
        guard monsters.indices.contains(i), !monsters[i].isDead else { return }
        var m = monsters[i]
        lastHitMonster = m.id
        damageTick += 1
        // Clear the flash shortly after so it reads as a hit, not a state.
        let hitId = m.id
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            if self?.lastHitMonster == hitId { self?.lastHitMonster = nil }
        }
        m.hp -= amount
        // Knockback away from the hit.
        let dx = m.position.x - from.x, dz = m.position.z - from.z
        let dist = max(sqrt(dx * dx + dz * dz), 0.01)
        m.position.x += dx / dist * 0.8
        m.position.z += dz / dist * 0.8
        if m.hp <= 0 {
            m.isDead = true
            player.monstersSlain += 1
            player.gold += m.kind.goldReward
            player.experience += m.kind.goldReward * 2
            checkLevelUp()
            onEvent?(.monsterSlain(m.kind.rawValue))
            notify("\(m.kind.emoji) \(m.kind.rawValue.capitalized) slain! +\(m.kind.goldReward)🪙")
            questBoard.record(.monsterSlain)
        }
        monsters[i] = m
    }

    // MARK: - Bombs (blast mining for when tapping is too slow)

    struct LiveBomb: Identifiable {
        let id = UUID()
        var position: SCNVector3
        var target: SCNVector3
        var fuse: Double
    }

    @Published var bombs = 3
    @Published var liveBombs: [LiveBomb] = []
    @Published var lastBlastId: UUID?
    @Published var lastBlastPos = SCNVector3(0, 0, 0)
    /// Hold-to-mine flag (view drag gestures flip this).
    var miningHeld = false
    private var bombCooldown = 0.0
    private var lastBombAward = 0

    func throwBomb() {
        guard bombs > 0 else {
            notify("🧨 Out of bombs! Mine 20 blocks to earn one.")
            return
        }
        guard bombCooldown <= 0 else { return }
        bombs -= 1
        questBoard.record(.bombThrown)
        statTracker.recordBomb()
        bombCooldown = 3
        let eye = eyePos(), dir = lookDir()
        let target = SCNVector3(
            eye.x + dir.x * 3.5,
            max(eye.y + dir.y * 3.5 - 0.6, player.position.y + 0.3),
            eye.z + dir.z * 3.5
        )
        liveBombs.append(LiveBomb(position: eye, target: target, fuse: 1.2))
        AWSound.shared.hiss()
        notify("🧨 Fire in the hole!")
    }

    private func updateBombs(dt: Float) {
        bombCooldown = max(0, bombCooldown - Double(dt))
        for i in liveBombs.indices {
            liveBombs[i].fuse -= Double(dt)
            let p = liveBombs[i].position, t = liveBombs[i].target
            let dx = t.x - p.x, dy = t.y - p.y, dz = t.z - p.z
            let len = sqrt(dx * dx + dy * dy + dz * dz)
            if len > 0.1 {
                let step = min(6 * dt, len)
                liveBombs[i].position = SCNVector3(p.x + dx / len * step, p.y + dy / len * step, p.z + dz / len * step)
            }
        }
        let blowing = liveBombs.filter { $0.fuse <= 0 }
        if !blowing.isEmpty {
            liveBombs.removeAll { $0.fuse <= 0 }
            for b in blowing { explode(at: b.target) }
        }
    }

    private func explode(at pos: SCNVector3) {
        let R: Float = 2.2
        lastBlastPos = pos
        lastBlastId = UUID()
        AWSound.shared.boom()
        // Blocks: no tier gate — bombs blast anything but bedrock/lava.
        var loot: [String: Int] = [:]
        for i in blocks.indices where !blocks[i].isDestroyed && !blocks[i].type.isUnbreakable {
            let bp = blocks[i].position
            let dx = bp.x - pos.x, dy = bp.y - pos.y, dz = bp.z - pos.z
            if sqrt(dx * dx + dy * dy + dz * dz) < R {
                if let (name, _, _) = breakBlock(i) {
                    loot[name, default: 0] += 1
                }
            }
        }
        // Monsters caught in the blast take 3.
        for i in monsters.indices where !monsters[i].isDead {
            let mp = monsters[i].position
            let dx = mp.x - pos.x, dz = mp.z - pos.z
            if sqrt(dx * dx + dz * dz) < R + 0.5 {
                damageMonster(i, amount: 3, from: pos)
            }
        }
        // Bats in the blast scatter (rewarded if they were attacking).
        for i in bats.indices {
            let bp = bats[i].position
            let dx = bp.x - pos.x, dy = bp.y - pos.y, dz = bp.z - pos.z
            if sqrt(dx * dx + dy * dy + dz * dz) < R + 1,
               bats[i].state == .diving || bats[i].state == .warning {
                repelBat(i)
            }
        }
        // Self-damage up close.
        let px = player.position.x - pos.x, pz = player.position.z - pos.z
        if sqrt(px * px + pz * pz) < 1.6 {
            hurt(8, cause: "💥 Own blast! Careful!")
        }
        let summary = loot.map { "\($0.value)x \($0.key)" }.joined(separator: ", ")
        notify(summary.isEmpty ? "💥 Ka-boom! (solid rock)" : "💥 Ka-boom! \(summary) → 🎒 backpack (\(player.backpackUsed)/\(player.backpackCapacity))")
    }

    /// Destroys a block with full drops/stats/events. Returns loot or nil.
    @discardableResult
    private func breakBlock(_ idx: Int) -> (String, Int, Int)? {
        guard blocks.indices.contains(idx) else { return nil }
        var b = blocks[idx]
        guard !b.isDestroyed, !b.type.isUnbreakable else { return nil }
        // Closet crates pop open with themed loot (or a fake-out).
        if b.type == .closetCrate {
            return openMineCloset(idx)
        }
        b.isDestroyed = true
        blocks[idx] = b
        damageTick += 1
        player.blocksMined += 1
        let name = b.type.displayName
        // Tycoon loop: ore rides in the backpack, value accrues unsold.
        // Luck pets can double the drop; depth multiplies value + XP.
        let layer = MNDepthLayer.at(y: b.position.y)
        var n = 1
        var lucky = false
        if Double.random(in: 0...1) < luckChance { n = 2; lucky = true }
        player.ores[name, default: 0] += n
        // Coal is pick-forge currency, never sold: it rides along but
        // accrues no sale value (still takes backpack space — upgrade!).
        let unit = (name == "Coal Ore") ? 0 : Int(Double(b.type.goldValue) * layer.rewardMultiplier)
        player.sellValue += unit * n
        let xp = Int(Double(b.type.xpReward) * layer.rewardMultiplier * rebirthMult)
        if b.type.goldValue > 0 || b.type.xpReward > 0 {
            player.experience += xp
            checkLevelUp()
            onEvent?(.minedOre(name, n))
        }
        if player.blocksMined - lastBombAward >= 20, bombs < 9 {
            lastBombAward = player.blocksMined
            bombs += 1
        }
        let luckyTag = lucky ? "🍀 Lucky double! " : ""
        if b.type.goldValue > 0 || b.type.xpReward > 0 {
            var msg = "⛏️ \(luckyTag)\(name) x\(n)! +\(xp) XP → 🎒 (\(player.backpackUsed)/\(player.backpackCapacity))"
            if player.backpackFull { msg += " FULL — go sell!" }
            notify(msg)
        }
        // Quest / stat / tutorial hooks.
        questBoard.record(.blockBroken)
        questBoard.record(.oreMined(name: name, count: n))
        questBoard.record(.layerReached(name: layer.title))
        statTracker.recordBreak(layer: layer.title, oreUnits: n, gold: unit * n, xp: xp)
        richestPack = max(richestPack, player.sellValue)
        tutorial.complete(.mineFirst)
        if player.backpackUsed >= 5 { tutorial.complete(.readBackpack) }
        // Crystal harvest tracking: clearing a whole cave pays a bonus.
        if [.crystalCube, .crystalSpike, .crystalOrb].contains(b.type) {
            checkCaveHarvest(cell: Self.cellForPos(b.position))
        }
        // Frost harvest tracking: clearing a pocket pays a smaller bonus.
        if [.frostOre, .glacierCrystal, .snowstone].contains(b.type) {
            checkFrostHarvest(cell: Self.cellForPos(b.position))
        }
        // Legendary pulls get the slow-mo treatment (throttled).
        if (b.type == .diamondOre || b.type == .opalOre),
           Date().timeIntervalSince(lastLegendCine) > 120 {
            lastLegendCine = Date()
            cinema.play(.legendaryDrop(name: name))
        }
        return (name, unit * n, xp)
    }

    /// Bonus when every winter growth in a frost pocket is mined out.
    private func checkFrostHarvest(cell: MNCell) {
        guard let fi = mineFrost.firstIndex(where: { !$0.harvested && $0.cells.contains(cell) }) else { return }
        let destroyed = Set(blocks.filter { $0.isDestroyed }.map { Self.cellForPos($0.position) })
        guard mineFrost[fi].cells.isSubset(of: destroyed) else { return }
        mineFrost[fi].harvested = true
        let bonus = Int(80 * rebirthMult)
        player.gold += bonus
        player.experience += 40
        checkLevelUp()
        notify("❄️ Frost pocket fully harvested! +\(bonus)🪙")
    }

    /// Bonus when every growth in a tracked cave is mined out.
    private func checkCaveHarvest(cell: MNCell) {
        guard let ci = mineCaves.firstIndex(where: { !$0.harvested && $0.cells.contains(cell) }) else { return }
        let destroyed = Set(blocks.filter { $0.isDestroyed }.map { Self.cellForPos($0.position) })
        guard mineCaves[ci].cells.isSubset(of: destroyed) else { return }
        mineCaves[ci].harvested = true
        let bonus = Int(120 * rebirthMult)
        player.gold += bonus
        player.experience += 60
        checkLevelUp()
        notify("\(mineCaves[ci].shape.emoji) Crystal cave fully harvested! +\(bonus)🪙")
        questBoard.record(.caveHarvested)
        statTracker.recordCave()
    }

    /// The sealed cave (if any) containing a cell.
    func lockedCaveContaining(cell: MNCell) -> MNCrystalCave? {
        mineCaves.first(where: { $0.isLocked && $0.cells.contains(cell) })
    }

    /// Human-readable seal price: "8× Iron Ore + 15× Coal Ore".
    func sealSummary(_ cave: MNCrystalCave) -> String {
        cave.unlockCost
            .sorted(by: { $0.key < $1.key })
            .map { "\($0.value)× \($0.key)" }
            .joined(separator: " + ")
    }

    /// Redeem minerals to break a cave seal. Minerals leave the backpack.
    /// Returns false (with guidance) when the purse is short.
    @discardableResult
    func unlockCave(_ id: UUID) -> Bool {
        guard let ci = mineCaves.firstIndex(where: { $0.id == id && $0.isLocked }) else { return false }
        for (ore, need) in mineCaves[ci].unlockCost {
            guard player.ores[ore, default: 0] >= need else {
                notify("🔒 Need \(need)× \(ore) (have \(player.ores[ore, default: 0])). Keep digging!")
                return false
            }
        }
        for (ore, need) in mineCaves[ci].unlockCost {
            player.ores[ore, default: 0] -= need
        }
        mineCaves[ci].isLocked = false
        questBoard.record(.caveUnlocked)
        statTracker.recordCaveOpened()
        cinema.play(.sealBroken(shape: mineCaves[ci].shape.rawValue.capitalized))
        notify("\(mineCaves[ci].shape.emoji) Seal broken! The \(mineCaves[ci].shape.rawValue) cave stands open — mine it clean!")
        return true
    }

    /// Pops a closet crate: snacks pay gold, tool caches grant a bomb,
    /// treasure caches burst gold + XP, fakes are cobwebs. Returns nil so
    /// the generic "mined" message doesn't double up.
    private func openMineCloset(_ idx: Int) -> (String, Int, Int)? {
        guard blocks.indices.contains(idx) else { return nil }
        var b = blocks[idx]
        guard !b.isDestroyed else { return nil }
        b.isDestroyed = true
        blocks[idx] = b
        damageTick += 1
        player.blocksMined += 1
        if player.blocksMined - lastBombAward >= 20, bombs < 9 {
            lastBombAward = player.blocksMined
            bombs += 1
        }
        // Registry kind (marks opened so a closet pays once); positional
        // hash covers any unregistered crate.
        let cell = Self.cellForPos(b.position)
        let kind: MNClosetKind
        if let ci = mineClosets.firstIndex(where: { $0.cell == cell }) {
            mineClosets[ci].isOpened = true
            kind = mineClosets[ci].kind
        } else {
            kind = Self.closetKind(at: cell)
        }
        if kind == .snacks {
            let g = Int.random(in: 8...15)
            player.gold += g
            player.experience += 6
            checkLevelUp()
            notify("🍬 Snack stash! +\(g)🪙")
        } else if kind == .tools {
            bombs = min(9, bombs + 1)
            player.experience += 8
            checkLevelUp()
            notify("🔧 Tool cache! +1 bomb! (have \(bombs))")
        } else if kind == .treasure {
            let g = Int.random(in: 40...80)
            player.gold += g
            player.experience += 30
            checkLevelUp()
            onEvent?(.minedOre("Closet Treasure", 1))
            notify("💎 Treasure closet! +\(g)🪙")
        } else {
            player.experience += 2
            notify("🕸️ Fake closet… just cobwebs!")
        }
        questBoard.record(.closetOpened)
        statTracker.recordCloset()
        tutorial.complete(.closet)
        return nil
    }

    // MARK: - Mining (staged hits, pick tiers, debris-worthy)

    func mineBlock(at worldPos: SCNVector3) {
        swingId += 1
        statTracker.recordSwing()
        tutorial.complete(.tapOre)
        let eye = eyePos()
        var bestIdx: Int? = nil
        var bestTap: Float = 0.9
        for i in blocks.indices where !blocks[i].isDestroyed {
            let bp = blocks[i].position
            let ex = bp.x - eye.x, ey = bp.y - eye.y, ez = bp.z - eye.z
            guard sqrt(ex * ex + ey * ey + ez * ez) <= 5.0 else { continue }
            let dx = bp.x - worldPos.x, dy = bp.y - worldPos.y, dz = bp.z - worldPos.z
            let tap = sqrt(dx * dx + dy * dy + dz * dz)
            if tap < bestTap { bestTap = tap; bestIdx = i }
        }
        guard let idx = bestIdx else { return }
        applyMineHit(idx)
    }

    func mineNearestBlock() {
        swingId += 1
        statTracker.recordSwing()
        let eye = eyePos()
        var bestIdx: Int? = nil
        var bestDist: Float = 4.5
        for i in blocks.indices where !blocks[i].isDestroyed && !blocks[i].type.isUnbreakable {
            let dx = blocks[i].position.x - eye.x
            let dy = blocks[i].position.y - eye.y
            let dz = blocks[i].position.z - eye.z
            let dist = sqrt(dx * dx + dy * dy + dz * dz)
            if dist < bestDist { bestDist = dist; bestIdx = i }
        }
        guard let idx = bestIdx else {
            notify("⛏️ Aim at a glowing ore!")
            return
        }
        applyMineHit(idx)
    }

    private func applyMineHit(_ idx: Int) {
        lastHitIndex = idx
        guard blocks.indices.contains(idx) else { return }
        let b = blocks[idx]
        if b.type.isUnbreakable {
            notify(b.type == .lava ? "🔥 Molten! Best keep your distance." : "⬛ Bedrock is unbreakable!")
            return
        }
        // Sealed caves bounce picks — redeem minerals to open them.
        let hitCell = Self.cellForPos(blocks[idx].position)
        if [.crystalCube, .crystalSpike, .crystalOrb].contains(b.type),
           let sealed = lockedCaveContaining(cell: hitCell) {
            notify("🔒 Sealed \(sealed.shape.rawValue) cave! Redeem \(sealSummary(sealed)) in the 🔒 Caves panel.")
            return
        }
        // Tier gate: harder gems need better picks.
        if player.pickTier.rawValue < b.type.requiredTier.rawValue {
            notify("🔒 \(b.type.displayName) needs a \(b.type.requiredTier.name)! (\(player.pickTier.name) bounces off)")
            return
        }
        // Full backpack: ore blocks bounce off until you sell (closets
        // always open — they're bonuses, not backpack fill).
        if player.backpackFull && b.type != .closetCrate {
            notify("🎒 Backpack full (\(player.backpackCapacity))! Hit 💰 to sell — the surface cart pays +25%.")
            return
        }
        let before = bombs
        // Speed pets + rebirth power up every swing; deep rock is tougher.
        blocks[idx].damage += player.pickTier.damage * Float(speedMult * rebirthMult)
        if Int.random(in: 1...10) == 1 { blocks[idx].damage += 1 } // lucky crack
        if blocks[idx].damage >= effectiveToughness(b.type, atY: blocks[idx].position.y) {
            _ = breakBlock(idx)
            if bombs > before { notify("🧨 +1 bomb!") }
        } else {
            damageTick += 1
        }
    }

    // MARK: - Pickaxe progression (coal is currency)

    /// Spends mined coal to unlock the next tier. Returns false if short.
    @discardableResult
    func upgradePick() -> Bool {
        guard let next = MNPickTier(rawValue: player.pickTier.rawValue + 1) else { return false }
        let have = player.ores["Coal Ore", default: 0]
        guard have >= next.coalCost else {
            notify("⛏️ Need \(next.coalCost) coal for \(next.name) (have \(have))!")
            return false
        }
        player.ores["Coal Ore"] = have - next.coalCost
        player.pickTier = next
        notify("\(next.emoji) Forged \(next.name)! Unlocks: \(next.unlocks).")
        questBoard.record(.pickForged)
        tutorial.complete(.forge)
        return true
    }

    func checkLevelUp() {
        let lv = player.experience / 100 + 1
        if lv > player.level {
            player.level = lv
            player.maxHealth += 10
            player.health = player.maxHealth
            onEvent?(.leveledUp(lv))
            notify("⬆️ Miner rank \(lv)! Health restored!")
            cinema.play(.levelUp(level: lv))
        }
    }

    // MARK: - Mining-Sim tycoon (backpack, sell, pets, rebirth, sectors)

    /// Permanent +15% power per rebirth (damage, sale value, XP).
    var rebirthMult: Double { 1.0 + Double(player.rebirths) * 0.15 }

    var speedMult: Double {
        1.0 + player.pets.filter { $0.isEquipped && $0.boostKind == "Speed" }
            .reduce(0.0) { $0 + $1.boostValue }
    }

    var luckChance: Double {
        min(0.6, player.pets.filter { $0.isEquipped && $0.boostKind == "Luck" }
            .reduce(0.0) { $0 + $1.boostValue } + difficulty.lootLuck)
    }

    var petGoldMult: Double {
        1.0 + player.pets.filter { $0.isEquipped && $0.boostKind == "Gold" }
            .reduce(0.0) { $0 + $1.boostValue }
    }

    var currentLayer: MNDepthLayer { MNDepthLayer.at(y: player.position.y) }

    /// The surface sell cart (by the entrance): selling here pays +25%.
    var sellPad: SCNVector3 { SCNVector3(0, 1.0, -15) }

    var isAtSellPad: Bool {
        let dx = player.position.x - sellPad.x, dz = player.position.z - sellPad.z
        return sqrt(dx * dx + dz * dz) < 6
    }

    func effectiveToughness(_ type: MNBlockType, atY y: Float) -> Float {
        type.toughness + MNDepthLayer.at(y: y).hardnessBonus
    }

    /// Cash in the backpack. Surface cart pays +25%.
    func sellBackpack() {
        guard player.backpackUsed > 0 else {
            notify("🎒 Backpack is empty — go dig something shiny!")
            return
        }
        let bonus = isAtSellPad ? 1.25 : 1.0
        let payout = Int(Double(player.sellValue) * bonus * petGoldMult * rebirthMult)
        let units = player.backpackUsed
        // Coal stays banked for the pick forge — everything else sells.
        let coal = player.ores["Coal Ore", default: 0]
        player.gold += payout
        player.ores = coal > 0 ? ["Coal Ore": coal] : [:]
        player.sellValue = 0
        if isAtSellPad {
            notify("💰 Sold \(units) ores at the surface cart! +\(payout)🪙 (surface bonus!)")
        } else {
            notify("💰 Sold \(units) ores! +\(payout)🪙 (tip: the surface cart pays +25%)")
        }
        questBoard.record(.goldSold(amount: payout))
        tutorial.complete(.sell)
        bestSale = max(bestSale, payout)
    }

    /// Bigger backpack, stay down longer. Gold cost grows quadratically.
    var backpackCost: Int {
        Int(Double(250 * (player.backpackTier + 1) * (player.backpackTier + 1)) * difficulty.priceFactor)
    }

    @discardableResult
    func upgradeBackpack() -> Bool {
        guard player.gold >= backpackCost else {
            notify("🎒 Need \(backpackCost)🪙 for a bigger pack (have \(player.gold))!")
            return false
        }
        player.gold -= backpackCost
        player.backpackTier += 1
        player.backpackCapacity += 50
        notify("🎒 Backpack Mk.\(player.backpackTier + 1)! Capacity \(player.backpackCapacity).")
        questBoard.record(.packUpgraded)
        return true
    }

    /// Hatch a mystery egg. Duplicates are fine — more pets, more stacking.
    var petEggCost: Int { Int(Double(400 * (player.pets.count + 1)) * difficulty.priceFactor) }

    func hatchPet() {
        guard player.gold >= petEggCost else {
            notify("🥚 Need \(petEggCost)🪙 to hatch an egg (have \(player.gold))!")
            return
        }
        player.gold -= petEggCost
        var pet = MNPet.hatch(number: player.pets.count)
        // Auto-equip while there is room.
        if player.pets.filter({ $0.isEquipped }).count < 3 { pet.isEquipped = true }
        player.pets.append(pet)
        notify("\(pet.emoji) Hatched \(pet.rarity) \(pet.species)! +\(Int(pet.boostValue * 100))% \(pet.boostKind).")
        questBoard.record(.petHatched)
        tutorial.complete(.pet)
    }

    func togglePetEquip(_ id: UUID) {
        guard let i = player.pets.firstIndex(where: { $0.id == id }) else { return }
        if !player.pets[i].isEquipped && player.pets.filter({ $0.isEquipped }).count >= 3 {
            notify("🐾 Only 3 pets can ride along — unequip one first!")
            return
        }
        player.pets[i].isEquipped.toggle()
    }

    /// Rebirth: reach the Magma Core at rank 15+, reset the grind for a
    /// permanent +15% everything. You stay exactly where you stand.
    var canRebirth: Bool { player.level >= 15 && player.deepestY <= -4.5 }

    func doRebirth() {
        guard canRebirth else {
            notify("💫 Rebirth needs rank 15 + a trip to the Magma Core (Lv.\(player.level), depth \(Int(player.deepestY))).")
            return
        }
        player.rebirths += 1
        player.gold = 0
        player.ores = [:]
        player.sellValue = 0
        player.experience = 0
        player.level = 1
        player.pickTier = .wooden
        player.backpackTier = 0
        player.backpackCapacity = 50
        player.pets = []
        player.health = player.maxHealth
        notify("💫 REBIRTH #\(player.rebirths)! Permanent +\(Int(rebirthMult * 100 - 100))% power. The mine remembers you.")
        questBoard.record(.rebirthed)
        cinema.play(.rebirth(number: player.rebirths))
        lastLifetimeXP = 0
    }

    /// Maze half of the loop: 9 named sectors pay discovery bonuses, and
    /// the deepest depth is tracked for rebirth. Called while moving.
    func trackExploration() {
        if player.position.y < player.deepestY { player.deepestY = player.position.y }
        let col = min(2, max(0, Int((player.position.x + 60) / 40)))
        let row = min(2, max(0, Int((player.position.z + 60) / 40)))
        let key = "\(col),\(row)"
        guard !player.sectorsFound.contains(key) else { return }
        player.sectorsFound.insert(key)
        let cols = ["West", "Central", "East"], rows = ["North", "Heart", "South"]
        let bonus = Int(150 * rebirthMult)
        player.gold += bonus
        notify("🗺️ New sector mapped: \(rows[row])-\(cols[col]) Dig! +\(bonus)🪙 (\(player.sectorsFound.count)/9)")
        questBoard.record(.sectorMapped(count: player.sectorsFound.count))
        questBoard.record(.depthReached(y: player.deepestY))
        if !sawMagmaCine && player.deepestY <= -4.5 {
            sawMagmaCine = true
            cinema.play(.firstMagma)
        }
        tutorial.complete(.sector)
        expandMineFrontier(col: col, row: row)
    }

    /// Frontier growth, maze-style: a fresh sector raises a timber forkroad
    /// arch, cracks open a crystal cave, stocks closet caches, and may lure
    /// a rare boxy visitor. Everything rides the dynamic block pipeline
    /// (rock mesh is static, so growths sit in open tunnel air). Caps apply.
    private func expandMineFrontier(col: Int, row: Int) {
        let cx: Float = Float(col * 40 - 40)
        let cz: Float = Float(row * 40 - 40)
        guard let foothold = nearestAirCell(x: cx, z: cz) else { return }
        var taken = Set(blocks.filter { !$0.isDestroyed }.map { Self.cellForPos($0.position) })
        let fx = foothold.x, fy = foothold.y, fz = foothold.z

        // 1. Timber forkroad arch in the tunnel.
        let style = MNForkStyle.allCases[(col + row * 3) % MNForkStyle.allCases.count]
        var raised = 0
        var arch: [MNCell] = []
        for dy in 0...4 {
            arch.append(MNCell(x: fx - 6, y: fy + dy, z: fz))
            arch.append(MNCell(x: fx + 6, y: fy + dy, z: fz))
        }
        for dx in -6...6 { arch.append(MNCell(x: fx + dx, y: fy + 5, z: fz)) }
        for c in arch where Self.isAirCell(c) && !taken.contains(c) {
            taken.insert(c)
            blocks.append(MNBlock(type: .woodBeam, position: Self.cellCenter(c),
                                  health: 2, maxHealth: 2, isDestroyed: false))
            raised += 1
        }
        if raised > 0 {
            notify("\(style.emoji) Forkroad raised: \(style.rawValue)! Timber marks the way.")
        }

        // 2. Fresh crystal cave: floor growths in open air (never inside
        // the static rock mesh), tracked for a harvest bonus.
        if mineCaves.count < 24 {
            let shape = MNCrystalShape.allCases.randomElement()!
            let spots = caveFloorSpots(shape: shape, fx: fx, fy: fy, fz: fz, taken: taken)
            if !spots.isEmpty {
                var cells = Set<MNCell>()
                for c in spots {
                    taken.insert(c)
                    cells.insert(c)
                    blocks.append(MNBlock(type: shape.blockType, position: Self.cellCenter(c),
                                          health: shape.blockType.toughness,
                                          maxHealth: shape.blockType.toughness, isDestroyed: false))
                }
                // Two in five frontier caves arrive sealed (minerals redeem).
                let sealed = Int.random(in: 1...100) <= 40
                let cost = sealed ? Self.sealCost(centerY: Self.cellCenter(foothold).y) : [:]
                mineCaves.append(MNCrystalCave(center: Self.cellCenter(foothold), shape: shape,
                                               cells: cells, announced: true,
                                               isLocked: sealed, unlockCost: cost))
                if sealed {
                    notify("🔒 The rock groans… a SEALED \(shape.rawValue) cave cracked open nearby! Redeem minerals to open it.")
                } else {
                    notify("\(shape.emoji) The rock groans… a new \(shape.rawValue) crystal cave cracked open nearby!")
                }
            }
        }

        // 3. Restock closets near the new fork.
        if mineClosets.count < 60, Int.random(in: 1...100) <= 60 {
            var stocked = 0
            for (ox, oz) in [(8, 4), (-8, -4)] as [(Int, Int)] {
                let c = MNCell(x: fx + ox, y: fy, z: fz + oz)
                guard Self.isAirCell(c), !taken.contains(c) else { continue }
                taken.insert(c)
                let pos = Self.cellCenter(c)
                blocks.append(MNBlock(type: .closetCrate, position: pos,
                                      health: 1, maxHealth: 1, isDestroyed: false))
                mineClosets.append(MNClosetCache(cell: c, position: pos, kind: Self.closetKind(at: c)))
                stocked += 1
            }
            if stocked > 0 { notify("🚪 Explorers stashed \(stocked) closet cache(s) by the fork!") }
        }

        // 4. Rare boxy visitor wanders in from the new tunnels.
        if critters.count < 8, Int.random(in: 1...100) <= 35 {
            let table: [(String, String, UIColor)] = [
                ("Mole", "📦", UIColor(red: 0.6, green: 0.45, blue: 0.3, alpha: 1)),
                ("Bat", "📦", UIColor(red: 0.35, green: 0.25, blue: 0.5, alpha: 1)),
                ("Axolotl", "📦", UIColor(red: 1.0, green: 0.6, blue: 0.75, alpha: 1)),
                ("Fox", "📦", UIColor(red: 0.95, green: 0.5, blue: 0.2, alpha: 1)),
                ("Wisp", "✨", UIColor(red: 1.0, green: 0.85, blue: 0.3, alpha: 1)),
            ]
            let pick = table.randomElement()!
            let pos = Self.cellCenter(foothold)
            critters.append(MNBoxyCritter(species: pick.0, emoji: pick.1, color: pick.2,
                                          position: pos, anchor: pos))
            notify("\(pick.1) Rare encounter: a Boxy \(pick.0) wandered in from the new tunnels!")
        }
    }

    /// Floor growth pattern for a frontier cave, open-air cells only.
    private func caveFloorSpots(shape: MNCrystalShape, fx: Int, fy: Int, fz: Int, taken: Set<MNCell>) -> [MNCell] {
        var rel: [(Int, Int, Int)] = []
        switch shape {
        case .cube:
            for dx in -1...1 { for dz in -1...1 { rel.append((dx * 2, 0, dz * 2)) } }
        case .spike:
            rel = [(0, 0, 0), (4, 0, 2), (-4, 0, -2), (2, 0, -5), (-3, 0, 5), (0, 6, 0), (3, 6, -3)]
        case .orb:
            for a in stride(from: 0.0, through: 2 * Double.pi, by: Double.pi / 3) {
                rel.append((Int((cos(a) * 5).rounded()), 3, Int((sin(a) * 5).rounded())))
            }
            rel.append((0, 3, 0))
        }
        var out: [MNCell] = []
        for (dx, dy, dz) in rel {
            let c = MNCell(x: fx + dx, y: fy + dy, z: fz + dz)
            guard Self.isAirCell(c), !taken.contains(c) else { continue }
            guard !out.contains(c) else { continue }
            out.append(c)
            if out.count >= 14 { break }
        }
        return out
    }

    /// Nearest tunnel air cell to a world x/z (upper level, then deep).
    private func nearestAirCell(x: Float, z: Float) -> MNCell? {
        let bx = Self.cellForWorld(x), bz = Self.cellForWorld(z)
        for r in 0...24 {
            for y in [3, -10] as [Int] {
                for dx in -r...r {
                    for dz in -r...r {
                        guard max(abs(dx), abs(dz)) == r else { continue }
                        let c = MNCell(x: bx + dx, y: y, z: bz + dz)
                        if Self.isAirCell(c) { return c }
                    }
                }
            }
        }
        return nil
    }
}

// ============================================================
// MARK: - Block visuals (1/3-size boxes)
// ============================================================

func mineBlockColor(_ type: MNBlockType) -> UIColor {
    switch type {
    case .stone: return UIColor(red: 0.48, green: 0.48, blue: 0.5, alpha: 1)
    case .deepslate: return UIColor(red: 0.23, green: 0.23, blue: 0.27, alpha: 1)
    case .dirt: return UIColor(red: 0.42, green: 0.29, blue: 0.18, alpha: 1)
    case .gravel: return UIColor(red: 0.6, green: 0.58, blue: 0.54, alpha: 1)
    case .coalOre: return UIColor(red: 0.16, green: 0.16, blue: 0.18, alpha: 1)
    case .ironOre: return UIColor(red: 0.79, green: 0.63, blue: 0.42, alpha: 1)
    case .goldOre: return UIColor(red: 1.0, green: 0.85, blue: 0.3, alpha: 1)
    case .lapisOre: return UIColor(red: 0.15, green: 0.3, blue: 0.9, alpha: 1)
    case .redstoneOre: return UIColor(red: 1.0, green: 0.23, blue: 0.19, alpha: 1)
    case .emeraldOre: return UIColor(red: 0.24, green: 1.0, blue: 0.48, alpha: 1)
    case .rubyOre: return UIColor(red: 0.9, green: 0.1, blue: 0.25, alpha: 1)
    case .diamondOre: return UIColor(red: 0.37, green: 0.95, blue: 1.0, alpha: 1)
    case .opalOre: return UIColor(red: 0.95, green: 0.9, blue: 1.0, alpha: 1)
    case .woodBeam: return UIColor(red: 0.48, green: 0.32, blue: 0.19, alpha: 1)
    case .planks: return UIColor(red: 0.66, green: 0.49, blue: 0.31, alpha: 1)
    case .lava: return UIColor(red: 1.0, green: 0.35, blue: 0.0, alpha: 1)
    case .bedrock: return UIColor(red: 0.08, green: 0.08, blue: 0.09, alpha: 1)
    case .crystalCube: return UIColor(red: 0.55, green: 0.3, blue: 0.9, alpha: 1)
    case .crystalSpike: return UIColor(red: 0.3, green: 0.75, blue: 0.9, alpha: 1)
    case .crystalOrb: return UIColor(red: 0.9, green: 0.6, blue: 1.0, alpha: 1)
    case .closetCrate: return UIColor(red: 0.5, green: 0.33, blue: 0.2, alpha: 1)
    case .frostOre: return UIColor(red: 0.6, green: 0.85, blue: 1.0, alpha: 1)
    case .glacierCrystal: return UIColor(red: 0.75, green: 0.95, blue: 1.0, alpha: 1)
    case .snowstone: return UIColor(red: 0.88, green: 0.9, blue: 0.94, alpha: 1)
    }
}

func mineBlockEmissive(_ type: MNBlockType) -> UIColor? {
    switch type {
    case .goldOre: return UIColor(red: 1.0, green: 0.8, blue: 0.2, alpha: 1)
    case .lapisOre: return UIColor(red: 0.1, green: 0.25, blue: 0.9, alpha: 1)
    case .redstoneOre: return UIColor(red: 1.0, green: 0.2, blue: 0.15, alpha: 1)
    case .emeraldOre: return UIColor(red: 0.2, green: 1.0, blue: 0.4, alpha: 1)
    case .rubyOre: return UIColor(red: 1.0, green: 0.1, blue: 0.3, alpha: 1)
    case .diamondOre: return UIColor(red: 0.3, green: 0.9, blue: 1.0, alpha: 1)
    case .opalOre: return UIColor(red: 0.9, green: 0.85, blue: 1.0, alpha: 1)
    case .lava: return UIColor(red: 1.0, green: 0.4, blue: 0.0, alpha: 1)
    case .crystalCube: return UIColor(red: 0.5, green: 0.25, blue: 0.9, alpha: 1)
    case .crystalSpike: return UIColor(red: 0.25, green: 0.7, blue: 0.9, alpha: 1)
    case .crystalOrb: return UIColor(red: 0.85, green: 0.55, blue: 1.0, alpha: 1)
    case .closetCrate: return UIColor(red: 1.0, green: 0.6, blue: 0.2, alpha: 1)
    case .frostOre: return UIColor(red: 0.5, green: 0.8, blue: 1.0, alpha: 1)
    case .glacierCrystal: return UIColor(red: 0.7, green: 0.92, blue: 1.0, alpha: 1)
    case .snowstone: return UIColor(red: 0.85, green: 0.88, blue: 0.92, alpha: 1)
    default: return nil
    }
}

/// Shared rock materials for the merged static mesh (3 draw calls total).
func mineRockMaterial(_ group: Int) -> UIColor {
    switch group {
    case 0: return UIColor(red: 0.45, green: 0.45, blue: 0.48, alpha: 1)
    case 1: return UIColor(red: 0.36, green: 0.36, blue: 0.4, alpha: 1)
    default: return UIColor(red: 0.26, green: 0.26, blue: 0.3, alpha: 1)
    }
}

// ============================================================
// MARK: - Scene (third-person follow cam)
// ============================================================

struct MineSceneView: UIViewRepresentable {
    @ObservedObject var manager: MineManager

    func makeCoordinator() -> Coordinator { Coordinator(manager: manager) }

    func makeUIView(context: Context) -> SCNView {
        let v = SCNView()
        v.scene = context.coordinator.scene
        v.backgroundColor = .black
        v.autoenablesDefaultLighting = false
        v.allowsCameraControl = false
        v.preferredFramesPerSecond = 30
        v.isPlaying = true
        setupGestures(v, context: context)
        context.coordinator.rebuild()
        return v
    }

    func setupGestures(_ view: SCNView, context: Context) {
        let pan = UIPanGestureRecognizer()
        pan.addTarget(context.coordinator, action: #selector(Coordinator.handlePan(_:)))
        view.addGestureRecognizer(pan)
        let tap = UITapGestureRecognizer()
        tap.addTarget(context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        view.addGestureRecognizer(tap)
        let swipeUp = UISwipeGestureRecognizer()
        swipeUp.direction = .up
        swipeUp.addTarget(context.coordinator, action: #selector(Coordinator.handleSwipe(_:)))
        view.addGestureRecognizer(swipeUp)
        let swipeDown = UISwipeGestureRecognizer()
        swipeDown.direction = .down
        swipeDown.addTarget(context.coordinator, action: #selector(Coordinator.handleSwipe(_:)))
        view.addGestureRecognizer(swipeDown)
    }

    func updateUIView(_ view: SCNView, context: Context) {
        context.coordinator.manager = manager
        context.coordinator.sync()
    }

    final class Coordinator: NSObject {
        var manager: MineManager
        let scene = SCNScene()
        private var lastBuildHash = 0
        private var lastDamageTick = 0
        private var lastSwingSeen = 0
        private var lastHitMonster: UUID?
        private var destroyedBlockIds = Set<UUID>()
        private var divingBatIds = Set<UUID>()

        init(manager: MineManager) {
            self.manager = manager
            super.init()
            setupLights()
            buildStaticRock()
            buildDecor()
        }

        // MARK: Gestures (drag look, tap mine/whack/walk, swipe step)

        @objc func handlePan(_ gesture: UIPanGestureRecognizer) {
            let translation = gesture.translation(in: gesture.view)
            if gesture.state == .changed || gesture.state == .ended {
                manager.look(deltaYaw: Float(-translation.x) / 90.0,
                             deltaPitch: Float(-translation.y) / 90.0)
                gesture.setTranslation(.zero, in: gesture.view)
            }
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard gesture.state == .ended, let view = gesture.view as? SCNView else { return }
            let loc = gesture.location(in: view)
            for h in view.hitTest(loc, options: nil) {
                var node: SCNNode? = h.node
                var found: String? = nil
                while node != nil {
                    let nm = node!.name ?? ""
                    if nm == "bat" { found = "bat"; break }
                    if nm == "monster" { found = "monster"; break }
                    if nm == "block" { found = "block"; break }
                    if nm == "rock" { found = "rock"; break }
                    node = node!.parent
                }
                if found == "bat" {
                    var up: SCNNode? = h.node
                    while up != nil && up!.name != "bat" { up = up!.parent }
                    if let s = up?.value(forKey: "batId") as? String, let id = UUID(uuidString: s) {
                        manager.whackBat(id: id)
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        return
                    }
                }
                if found == "monster" {
                    var up: SCNNode? = h.node
                    while up != nil && up!.name != "monster" { up = up!.parent }
                    if let s = up?.value(forKey: "monsterId") as? String, let id = UUID(uuidString: s) {
                        manager.whackMonster(id: id)
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        return
                    }
                }
                if found == "block" {
                    manager.mineBlock(at: h.worldCoordinates)
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    return
                }
                if found == "rock" {
                    // Tap-to-walk: plain rock isn't minable — walk there instead.
                    manager.walkTo(h.worldCoordinates)
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    return
                }
            }
            manager.mineNearestBlock()
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }

        @objc func handleSwipe(_ gesture: UISwipeGestureRecognizer) {
            if gesture.direction == .up { manager.moveForward(1.0) }
            else if gesture.direction == .down { manager.moveForward(-1.0) }
        }

        // MARK: Lights

        func setupLights() {
            let amb = SCNNode(); amb.light = SCNLight()
            amb.light?.type = .ambient
            amb.light?.color = UIColor(red: 0.22, green: 0.25, blue: 0.42, alpha: 1)
            scene.rootNode.addChildNode(amb)

            let lamp = SCNNode(); lamp.light = SCNLight()
            lamp.light?.type = .omni
            lamp.light?.color = UIColor(red: 1.0, green: 0.78, blue: 0.5, alpha: 1)
            lamp.light?.intensity = 900
            lamp.light?.attenuationEndDistance = 16
            lamp.name = "lamp"
            scene.rootNode.addChildNode(lamp)

            for (i, z) in [-7.5, 0.0, 7.5].enumerated() {
                let t = SCNNode(); t.light = SCNLight()
                t.light?.type = .omni
                t.light?.color = UIColor(red: 1.0, green: 0.6, blue: 0.2, alpha: 1)
                t.light?.intensity = 450
                t.light?.attenuationEndDistance = 10
                t.position = SCNVector3(0, 2.6, Float(z))
                t.name = "torchLight\(i)"
                scene.rootNode.addChildNode(t)
            }
            let lavaGlow = SCNNode(); lavaGlow.light = SCNLight()
            lavaGlow.light?.type = .omni
            lavaGlow.light?.color = UIColor(red: 1.0, green: 0.3, blue: 0.05, alpha: 1)
            lavaGlow.light?.intensity = 1000
            lavaGlow.light?.attenuationEndDistance = 14
            lavaGlow.position = SCNVector3(12, -3.5, 12)
            lavaGlow.name = "lavaGlow"
            scene.rootNode.addChildNode(lavaGlow)

            // Blast flash (explosions spike this, then it decays in sync).
            let blast = SCNNode(); blast.light = SCNLight()
            blast.light?.type = .omni
            blast.light?.color = UIColor(red: 1.0, green: 0.7, blue: 0.3, alpha: 1)
            blast.light?.intensity = 0
            blast.light?.attenuationEndDistance = 20
            blast.name = "blastLight"
            scene.rootNode.addChildNode(blast)

            let cam = SCNNode(); cam.camera = SCNCamera()
            cam.camera?.fieldOfView = 70
            cam.camera?.zNear = 0.05
            cam.camera?.zFar = 150
            cam.name = "camera"
            scene.rootNode.addChildNode(cam)
        }

        // MARK: Static merged rock (built ONCE — plain rock is backdrop)

        func buildStaticRock() {
            // One shared material per group so flattening merges each
            // group into a single draw call.
            let shared = (0..<3).map { i -> SCNMaterial in
                let m = SCNMaterial()
                m.diffuse.contents = mineRockMaterial(i)
                return m
            }
            for (group, cells) in manager.rockGroups.enumerated() {
                guard !cells.isEmpty else { continue }
                let parent = SCNNode()
                parent.name = "rockStatic"
                for c in cells {
                    let p = SCNVector3((Float(c.x) + 0.5) * mineU,
                                       (Float(c.y) + 0.5) * mineU,
                                       (Float(c.z) + 0.5) * mineU)
                    let n = SCNNode(geometry: SCNBox(width: CGFloat(mineU), height: CGFloat(mineU),
                                                     length: CGFloat(mineU), chamferRadius: 0))
                    n.geometry?.firstMaterial = shared[group]
                    n.position = p
                    parent.addChildNode(n)
                }
                scene.rootNode.addChildNode(parent.flattenedClone())
                parent.removeFromParentNode()
            }
        }

        // MARK: Decor (rails, torch sticks + flames)

        func buildDecor() {
            for z in stride(from: -17.0, through: 17.0, by: 1.0) {
                for x in [-0.35, 0.35] as [Float] {
                    addDecorBox(at: SCNVector3(x, 1.04, Float(z)), size: SCNVector3(0.09, 0.06, 1.0),
                                color: UIColor(white: 0.35, alpha: 1), name: "rail")
                    addDecorBox(at: SCNVector3(x, -4.96, Float(z)), size: SCNVector3(0.09, 0.06, 1.0),
                                color: UIColor(white: 0.35, alpha: 1), name: "rail")
                }
                if Int(z) % 2 == 0 {
                    addDecorBox(at: SCNVector3(0, 1.02, Float(z)), size: SCNVector3(0.85, 0.05, 0.2),
                                color: UIColor(red: 0.4, green: 0.28, blue: 0.16, alpha: 1), name: "sleeper")
                    addDecorBox(at: SCNVector3(0, -4.98, Float(z)), size: SCNVector3(0.85, 0.05, 0.2),
                                color: UIColor(red: 0.4, green: 0.28, blue: 0.16, alpha: 1), name: "sleeper")
                }
            }
            for pos in manager.torches {
                addDecorBox(at: pos, size: SCNVector3(0.1, 0.4, 0.1),
                            color: UIColor(red: 0.4, green: 0.26, blue: 0.14, alpha: 1), name: "torch")
                let flame = SCNNode(geometry: SCNSphere(radius: 0.1))
                flame.geometry?.firstMaterial?.diffuse.contents = UIColor.orange
                flame.geometry?.firstMaterial?.emission.contents = UIColor(red: 1, green: 0.55, blue: 0.1, alpha: 1)
                flame.position = SCNVector3(pos.x, pos.y + 0.27, pos.z)
                flame.name = "flame"
                scene.rootNode.addChildNode(flame)
            }
        }

        private func addDecorBox(at pos: SCNVector3, size: SCNVector3, color: UIColor, name: String) {
            let n = SCNNode(geometry: SCNBox(width: CGFloat(size.x), height: CGFloat(size.y),
                                             length: CGFloat(size.z), chamferRadius: 0))
            n.geometry?.firstMaterial?.diffuse.contents = color
            n.position = pos
            n.name = name
            scene.rootNode.addChildNode(n)
        }

        // MARK: Interactive blocks (ores, beams, lava — staged damage)

        func blockNode(_ b: MNBlock) -> SCNNode {
            let s = CGFloat(mineU)
            // Crystal growths get their shape: spikes are pyramids,
            // orbs are spheres, everything else stays a box.
            let geo: SCNGeometry
            switch b.type {
            case .crystalSpike:
                geo = SCNPyramid(width: s, height: s * 2.2, length: s)
            case .crystalOrb:
                geo = SCNSphere(radius: s * 0.55)
            default:
                geo = SCNBox(width: s, height: s, length: s, chamferRadius: 0)
            }
            let n = SCNNode(geometry: geo)
            n.geometry?.firstMaterial?.diffuse.contents = mineBlockColor(b.type)
            if let e = mineBlockEmissive(b.type) {
                n.geometry?.firstMaterial?.emission.contents = e
            }
            // Crack stages: darken + shrink as damage grows.
            if b.damage > 0 && b.maxHealth > 0 {
                let k = min(b.damage / b.maxHealth, 0.9)
                n.opacity = CGFloat(1 - k * 0.4)
                let sc = Float(1 - k * 0.12)
                n.scale = SCNVector3(sc, sc, sc)
            }
            n.position = b.position
            n.name = "block"
            return n
        }

        func rebuild() {
            let destroyed = manager.blocks.filter { $0.isDestroyed }.count
            let structHash = (destroyed << 16) ^ (manager.blocks.count << 4)
            if structHash != lastBuildHash {
                lastBuildHash = structHash
                for b in manager.blocks where b.isDestroyed && !destroyedBlockIds.contains(b.id) {
                    spawnDebris(at: b.position, color: mineBlockColor(b.type))
                    destroyedBlockIds.insert(b.id)
                }
                destroyedBlockIds = destroyedBlockIds.intersection(manager.blocks.map { $0.id })
                for child in scene.rootNode.childNodes where child.name == "block" {
                    child.removeFromParentNode()
                }
                for b in manager.blocks where !b.isDestroyed {
                    scene.rootNode.addChildNode(blockNode(b))
                }
            } else if manager.damageTick != lastDamageTick {
                lastDamageTick = manager.damageTick
                refreshHitBlock()
            }
            syncDynamicNodes()
        }

        func refreshHitBlock() {
            guard let idx = manager.lastHitIndex, manager.blocks.indices.contains(idx) else { return }
            let b = manager.blocks[idx]
            for child in scene.rootNode.childNodes where child.name == "block" {
                let p = child.position
                if abs(p.x - b.position.x) < 0.01 && abs(p.y - b.position.y) < 0.01 && abs(p.z - b.position.z) < 0.01 {
                    child.removeFromParentNode()
                    break
                }
            }
            if b.isDestroyed {
                if !destroyedBlockIds.contains(b.id) {
                    destroyedBlockIds.insert(b.id)
                    spawnDebris(at: b.position, color: mineBlockColor(b.type))
                }
            } else {
                let n = blockNode(b)
                n.scale = SCNVector3(0.82, 0.82, 0.82) // punch…
                scene.rootNode.addChildNode(n)
                n.runAction(.scale(to: CGFloat(1 - min(b.damage / max(b.maxHealth, 0.01), 0.9) * 0.12), duration: 0.12))
            }
        }

        func sync() { rebuild() }

        func syncDynamicNodes() {
            let p = manager.player
            if let lamp = scene.rootNode.childNode(withName: "lamp", recursively: false) {
                lamp.position = SCNVector3(p.position.x, p.position.y + 1.5, p.position.z)
            }
            // Third-person follow cam with collision: reel in when a wall
            // is behind the avatar (tunnels are tight; never park in rock).
            if let cam = scene.rootNode.childNode(withName: "camera", recursively: false) {
                let cp = cos(p.pitch)
                let base = SCNVector3(p.position.x, p.position.y + 2.4, p.position.z)
                let back = SCNVector3(-sin(p.yaw) * cp * 4.2, -sin(p.pitch) * 2.1, -cos(p.yaw) * cp * 4.2)
                var t: Float = 1.0
                while t > 0.12 {
                    let c = SCNVector3(base.x + back.x * t, base.y + back.y * t, base.z + back.z * t)
                    if manager.isAirAt(c) { break }
                    t -= 0.07
                }
                t = max(t, 0.12)
                cam.position = SCNVector3(base.x + back.x * t, base.y + back.y * t, base.z + back.z * t)
                cam.look(at: SCNVector3(p.position.x, p.position.y + 1.1, p.position.z))
                // Hide the avatar when the camera is right on top of it.
                if let av = scene.rootNode.childNode(withName: "avatar", recursively: false) {
                    av.isHidden = t < 0.3
                }
            }
            syncAvatar()
            // Torch flicker (visual only).
            let t = CACurrentMediaTime()
            for child in scene.rootNode.childNodes where child.name == "flame" {
                let s = 1 + 0.18 * sin(t * 9 + Double(child.position.x * 3 + child.position.z))
                child.scale = SCNVector3(Float(s), Float(1 + 0.25 * sin(t * 13)), Float(s))
            }
            for i in 0..<3 {
                if let l = scene.rootNode.childNode(withName: "torchLight\(i)", recursively: false),
                   let omni = l.light {
                    omni.intensity = 450 + CGFloat(80 * sin(t * 7 + Double(i) * 2))
                }
            }
            if manager.swingId != lastSwingSeen {
                lastSwingSeen = manager.swingId
                swingPick()
            }
            syncBats(now: t)
            syncMonsters(now: t)
            syncCritters(now: t)
            syncBombsAndBlast(now: t)
        }

        private var lastBlastSeen: UUID?

        /// Live bomb projectiles + explosion flash/shake/debris.
        func syncBombsAndBlast(now: Double) {
            // Projectile nodes keyed by bomb id.
            var nodes = scene.rootNode.childNodes.filter { $0.name == "liveBomb" }
            let ids = Set(manager.liveBombs.map(\.id))
            for n in nodes {
                let key = n.value(forKey: "bombId") as? String
                let known = key.flatMap { UUID(uuidString: $0) }.map { ids.contains($0) } ?? false
                if !known { n.removeFromParentNode() }
            }
            nodes = scene.rootNode.childNodes.filter { $0.name == "liveBomb" }
            for b in manager.liveBombs {
                if let n = nodes.first(where: { ($0.value(forKey: "bombId") as? String) == b.id.uuidString }) {
                    n.position = b.position
                    // Fuse blink accelerates as it burns down.
                    let rate = 6 + (1.2 - min(max(b.fuse, 0), 1.2)) * 14
                    let s = 1 + 0.25 * sin(now * rate)
                    n.scale = SCNVector3(Float(s), Float(s), Float(s))
                } else {
                    let n = SCNNode(geometry: SCNSphere(radius: 0.16))
                    n.geometry?.firstMaterial?.diffuse.contents = UIColor(white: 0.08, alpha: 1)
                    n.geometry?.firstMaterial?.emission.contents = UIColor(red: 1, green: 0.4, blue: 0.1, alpha: 1)
                    n.position = b.position
                    n.name = "liveBomb"
                    n.setValue(b.id.uuidString, forKey: "bombId")
                    scene.rootNode.addChildNode(n)
                }
            }
            // Blast flash: light pulse + camera kick, decaying over ~0.4s.
            if manager.lastBlastId != lastBlastSeen {
                lastBlastSeen = manager.lastBlastId
                blastTime = now
                if let blast = scene.rootNode.childNode(withName: "blastLight", recursively: false) {
                    blast.position = manager.lastBlastPos
                    blast.light?.intensity = 4000
                }
                // Big debris star.
                for _ in 0..<14 {
                    let s = CGFloat(mineU) * CGFloat.random(in: 0.25...0.6)
                    let bit = SCNNode(geometry: SCNBox(width: s, height: s, length: s, chamferRadius: 0))
                    bit.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.5, green: 0.35, blue: 0.25, alpha: 1)
                    bit.geometry?.firstMaterial?.emission.contents = UIColor(red: 1, green: 0.5, blue: 0.15, alpha: 1)
                    bit.position = manager.lastBlastPos
                    bit.name = "breakBit"
                    scene.rootNode.addChildNode(bit)
                    bit.runAction(.sequence([
                        .moveBy(x: CGFloat.random(in: -2.5...2.5), y: CGFloat.random(in: 1...3), z: CGFloat.random(in: -2.5...2.5), duration: 0.6),
                        .fadeOut(duration: 0.3),
                        .removeFromParentNode(),
                    ]))
                }
            }
            let age = now - blastTime
            if let blast = scene.rootNode.childNode(withName: "blastLight", recursively: false),
               let omni = blast.light {
                omni.intensity = age < 0.5 ? CGFloat(4000 * (1 - age / 0.5)) : 0
            }
            if age < 0.35,
               let cam = scene.rootNode.childNode(withName: "camera", recursively: false) {
                let k = Float(1 - age / 0.35) * 0.25
                cam.position.x += Float.random(in: -k...k)
                cam.position.y += Float.random(in: -k...k)
            }
        }

        private var blastTime: Double = -10

        // MARK: Avatar (visible miner, walks + swings)

        func avatarNode() -> SCNNode {
            let root = SCNNode()
            root.name = "avatar"
            func box(_ w: CGFloat, _ h: CGFloat, _ d: CGFloat, _ color: UIColor, _ x: Float, _ y: Float, _ z: Float, _ name: String) -> SCNNode {
                let n = SCNNode(geometry: SCNBox(width: w, height: h, length: d, chamferRadius: 0.02))
                n.geometry?.firstMaterial?.diffuse.contents = color
                n.position = SCNVector3(x, y, z)
                n.name = name
                return n
            }
            let skin = UIColor(red: 0.95, green: 0.76, blue: 0.6, alpha: 1)
            let shirt = UIColor(red: 0.2, green: 0.4, blue: 0.85, alpha: 1)
            let pants = UIColor(red: 0.25, green: 0.25, blue: 0.35, alpha: 1)
            root.addChildNode(box(0.16, 0.5, 0.16, pants, -0.11, 0.25, 0, "legL"))
            root.addChildNode(box(0.16, 0.5, 0.16, pants, 0.11, 0.25, 0, "legR"))
            root.addChildNode(box(0.44, 0.55, 0.24, shirt, 0, 0.78, 0, "torso"))
            root.addChildNode(box(0.13, 0.5, 0.13, skin, -0.3, 0.78, 0, "armL"))
            let armR = SCNNode()
            armR.position = SCNVector3(0.3, 1.0, 0)
            armR.name = "armR"
            let armMesh = box(0.13, 0.5, 0.13, skin, 0, -0.22, 0, "armMesh")
            armR.addChildNode(armMesh)
            // Pickaxe in hand.
            let handle = box(0.05, 0.55, 0.05, UIColor(red: 0.4, green: 0.27, blue: 0.15, alpha: 1), 0, -0.35, 0.12, "pickHandle")
            let pickHead = box(0.3, 0.07, 0.07, UIColor(white: 0.7, alpha: 1), 0, -0.12, 0.14, "pickHead")
            armR.addChildNode(handle)
            armR.addChildNode(pickHead)
            root.addChildNode(armR)
            let head = SCNNode(geometry: SCNSphere(radius: 0.21))
            head.geometry?.firstMaterial?.diffuse.contents = skin
            head.position = SCNVector3(0, 1.28, 0)
            head.name = "head"
            root.addChildNode(head)
            let helmet = SCNNode(geometry: SCNSphere(radius: 0.23))
            helmet.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.95, green: 0.75, blue: 0.15, alpha: 1)
            helmet.scale = SCNVector3(1, 0.62, 1)
            helmet.position = SCNVector3(0, 1.36, 0)
            helmet.name = "helmet"
            root.addChildNode(helmet)
            let lampBit = SCNNode(geometry: SCNSphere(radius: 0.05))
            lampBit.geometry?.firstMaterial?.emission.contents = UIColor(white: 1, alpha: 1)
            lampBit.position = SCNVector3(0, 1.42, 0.2)
            lampBit.name = "helmetLamp"
            root.addChildNode(lampBit)
            return root
        }

        func syncAvatar() {
            let p = manager.player
            let av: SCNNode
            if let existing = scene.rootNode.childNode(withName: "avatar", recursively: false) {
                av = existing
            } else {
                av = avatarNode()
                scene.rootNode.addChildNode(av)
            }
            av.position = p.position
            av.eulerAngles.y = p.yaw
            // Walk cycle.
            let t = CACurrentMediaTime()
            let swing = manager.isMoving ? sin(t * 11) * 0.55 : 0
            av.childNode(withName: "legL", recursively: false)?.eulerAngles.x = Float(swing)
            av.childNode(withName: "legR", recursively: false)?.eulerAngles.x = Float(-swing)
            av.childNode(withName: "armL", recursively: false)?.eulerAngles.x = Float(-swing * 0.7)
            // Bob while walking.
            var pos = av.position
            pos.y += manager.isMoving ? Float(abs(sin(t * 11)) * 0.05) : 0
            av.position = pos
        }

        func swingPick() {
            guard let arm = scene.rootNode.childNode(withName: "armR", recursively: true) else { return }
            arm.removeAllActions()
            arm.runAction(.sequence([
                .rotateBy(x: -1.1, y: 0, z: 0, duration: 0.1),
                .rotateBy(x: 1.1, y: 0, z: 0, duration: 0.22),
            ]))
        }

        // MARK: Bats

        func batNode(_ b: MNBat) -> SCNNode {
            let root = SCNNode()
            root.name = "bat"
            root.setValue(b.id.uuidString, forKey: "batId")
            root.position = b.position
            let body = SCNNode(geometry: SCNSphere(radius: 0.14))
            body.geometry?.firstMaterial?.diffuse.contents = UIColor(white: 0.12, alpha: 1)
            root.addChildNode(body)
            for side in [-1.0, 1.0] {
                let wing = SCNNode(geometry: SCNPlane(width: 0.4, height: 0.2))
                wing.geometry?.firstMaterial?.diffuse.contents = UIColor(white: 0.08, alpha: 1)
                wing.geometry?.firstMaterial?.isDoubleSided = true
                wing.position = SCNVector3(Float(side) * 0.24, 0.02, 0)
                wing.name = side < 0 ? "wingL" : "wingR"
                root.addChildNode(wing)
            }
            let angry = b.state == .warning || b.state == .diving
            for side in [-1.0, 1.0] {
                let eye = SCNNode(geometry: SCNSphere(radius: 0.028))
                eye.geometry?.firstMaterial?.diffuse.contents = UIColor.darkGray
                eye.geometry?.firstMaterial?.emission.contents = angry ? UIColor.red : UIColor.clear
                eye.position = SCNVector3(Float(side) * 0.06, 0.05, 0.13)
                eye.name = "batEye"
                root.addChildNode(eye)
            }
            return root
        }

        func syncBats(now: Double) {            var nodes = scene.rootNode.childNodes.filter { $0.name == "bat" }
            if nodes.count < manager.bats.count {
                for b in manager.bats.dropFirst(nodes.count) {
                    scene.rootNode.addChildNode(batNode(b))
                }
                nodes = scene.rootNode.childNodes.filter { $0.name == "bat" }
            }
            for (i, b) in manager.bats.enumerated() where i < nodes.count {
                let n = nodes[i]
                n.setValue(b.id.uuidString, forKey: "batId")
                if b.state == .diving && !divingBatIds.contains(b.id) {
                    divingBatIds.insert(b.id)
                    if let cam = scene.rootNode.childNode(withName: "camera", recursively: false) {
                        var target = cam.position
                        target.y -= 0.4
                        n.removeAllActions()
                        n.runAction(.sequence([
                            .move(to: target, duration: 0.85),
                            .fadeOut(duration: 0.15),
                        ]))
                    }
                } else if b.state != .diving {
                    if divingBatIds.contains(b.id) {
                        divingBatIds.remove(b.id)
                        n.removeAllActions()
                        n.opacity = 1
                    }
                    n.position = b.position
                    n.look(at: SCNVector3(manager.player.position.x, b.position.y, manager.player.position.z))
                }
                let flap = sin(now * 18 + Double(b.phase)) * 0.75
                n.childNode(withName: "wingL", recursively: false)?.eulerAngles.z = Float(flap)
                n.childNode(withName: "wingR", recursively: false)?.eulerAngles.z = Float(-flap)
                let angry = b.state == .warning || b.state == .diving
                n.childNodes.filter { $0.name == "batEye" }.forEach {
                    $0.geometry?.firstMaterial?.emission.contents = angry ? UIColor.red : UIColor.clear
                }
            }
        }

        // MARK: Boxy critters (rare friendly visitors)

        func critterNode(_ c: MNBoxyCritter) -> SCNNode {
            // Boxy by construction: cube body + glow eyes.
            let root = SCNNode()
            root.name = "critter"
            root.setValue(c.id.uuidString, forKey: "critterId")
            root.position = c.position
            let s = CGFloat(mineU) * 0.9
            let body = SCNNode(geometry: SCNBox(width: s, height: s, length: s, chamferRadius: 0.06))
            body.geometry?.firstMaterial?.diffuse.contents = c.color
            body.geometry?.firstMaterial?.emission.contents = c.color
            body.geometry?.firstMaterial?.emission.intensity = 0.15
            body.name = "critterBody"
            root.addChildNode(body)
            for side in [-1.0, 1.0] {
                let eye = SCNNode(geometry: SCNSphere(radius: 0.03))
                eye.geometry?.firstMaterial?.diffuse.contents = UIColor.white
                eye.geometry?.firstMaterial?.emission.contents = UIColor.white
                eye.position = SCNVector3(Float(side) * 0.07, 0.05, Float(s) * 0.45)
                eye.name = "critterEye"
                root.addChildNode(eye)
            }
            return root
        }

        func syncCritters(now: Double) {
            _ = now
            var nodes = scene.rootNode.childNodes.filter { $0.name == "critter" }
            if nodes.count > manager.critters.count {
                for n in nodes { n.removeFromParentNode() }
                nodes = []
            }
            if nodes.count < manager.critters.count {
                for c in manager.critters.dropFirst(nodes.count) {
                    scene.rootNode.addChildNode(critterNode(c))
                }
                nodes = scene.rootNode.childNodes.filter { $0.name == "critter" }
            }
            for (i, c) in manager.critters.enumerated() where i < nodes.count {
                let n = nodes[i]
                n.setValue(c.id.uuidString, forKey: "critterId")
                n.position = c.position
                // Happy hop squash.
                let hop = abs(sin(c.phase))
                n.scale = SCNVector3(1 + Float(hop) * 0.08, 1 - Float(hop) * 0.08, 1 + Float(hop) * 0.08)
            }
        }

        // MARK: Monsters

        func monsterNode(_ m: MNMonster) -> SCNNode {
            let root = SCNNode()
            root.name = "monster"
            root.setValue(m.id.uuidString, forKey: "monsterId")
            root.position = m.position
            switch m.kind {
            case .spider:
                let body = SCNNode(geometry: SCNSphere(radius: 0.2))
                body.geometry?.firstMaterial?.diffuse.contents = UIColor(white: 0.1, alpha: 1)
                body.name = "flashBody"
                root.addChildNode(body)
                for l in 0..<6 {
                    let a = Float(l) / 6 * Float.pi * 2
                    let leg = SCNNode(geometry: SCNBox(width: 0.05, height: 0.05, length: 0.4, chamferRadius: 0))
                    leg.geometry?.firstMaterial?.diffuse.contents = UIColor(white: 0.12, alpha: 1)
                    leg.position = SCNVector3(cos(a) * 0.28, -0.05, sin(a) * 0.28)
                    leg.eulerAngles.y = -a
                    leg.name = "leg\(l)"
                    root.addChildNode(leg)
                }
                for side in [-1.0, 1.0] {
                    let eye = SCNNode(geometry: SCNSphere(radius: 0.035))
                    eye.geometry?.firstMaterial?.emission.contents = UIColor.red
                    eye.position = SCNVector3(Float(side) * 0.08, 0.08, 0.17)
                    root.addChildNode(eye)
                }
            case .slime:
                let body = SCNNode(geometry: SCNSphere(radius: 0.28))
                body.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.2, green: 0.9, blue: 0.3, alpha: 0.75)
                body.name = "slimeBody"
                root.addChildNode(body)
            case .wraith:
                let body = SCNNode(geometry: SCNCone(topRadius: 0.05, bottomRadius: 0.3, height: 0.9))
                body.geometry?.firstMaterial?.diffuse.contents = UIColor(white: 0.85, alpha: 0.55)
                body.name = "wraithBody"
                root.addChildNode(body)
                for side in [-1.0, 1.0] {
                    let eye = SCNNode(geometry: SCNSphere(radius: 0.04))
                    eye.geometry?.firstMaterial?.emission.contents = UIColor(red: 0.7, green: 0.1, blue: 0.9, alpha: 1)
                    eye.position = SCNVector3(Float(side) * 0.09, 0.2, 0.2)
                    root.addChildNode(eye)
                }
            }
            return root
        }

        func syncMonsters(now: Double) {
            var nodes = scene.rootNode.childNodes.filter { $0.name == "monster" }
            let alive = manager.monsters.filter { !$0.isDead }
            // Remove the slain.
            if nodes.count > alive.count {
                // Simplest robust: rebuild monster nodes (few of them).
                for n in nodes { n.removeFromParentNode() }
                nodes = []
            }
            if nodes.count < alive.count {
                for m in alive.dropFirst(nodes.count) {
                    scene.rootNode.addChildNode(monsterNode(m))
                }
                nodes = scene.rootNode.childNodes.filter { $0.name == "monster" }
            }
            for (i, m) in alive.enumerated() where i < nodes.count {
                let n = nodes[i]
                n.setValue(m.id.uuidString, forKey: "monsterId")
                n.position = m.position
                n.look(at: SCNVector3(manager.player.position.x, m.position.y, manager.player.position.z))
                if m.kind == .slime,
                   let body = n.childNode(withName: "slimeBody", recursively: false) {
                    let s = 1 + 0.12 * sin(now * 8 + Double(m.phase))
                    body.scale = SCNVector3(Float(s), Float(2 - s), Float(s))
                }
                // Hit flash on the body only (eyes keep their own glow).
                let body = n.childNode(withName: "flashBody", recursively: false)
                    ?? n.childNode(withName: "slimeBody", recursively: false)
                    ?? n.childNode(withName: "wraithBody", recursively: false)
                body?.geometry?.firstMaterial?.emission.contents =
                    (manager.lastHitMonster == m.id) ? UIColor.red : UIColor.clear
            }
        }

        func spawnDebris(at pos: SCNVector3, color: UIColor) {
            // Ore shatters into small chunks (the "breaks into pieces" feel).
            for _ in 0..<9 {
                let s = CGFloat(mineU) * CGFloat.random(in: 0.2...0.45)
                let bit = SCNNode(geometry: SCNBox(width: s, height: s, length: s, chamferRadius: 0))
                bit.geometry?.firstMaterial?.diffuse.contents = color
                bit.position = SCNVector3(pos.x, pos.y, pos.z)
                bit.name = "breakBit"
                scene.rootNode.addChildNode(bit)
                bit.runAction(.sequence([
                    .moveBy(x: CGFloat.random(in: -1.2...1.2), y: CGFloat.random(in: 0.6...1.8), z: CGFloat.random(in: -1.2...1.2), duration: 0.5),
                    .fadeOut(duration: 0.25),
                    .removeFromParentNode(),
                ]))
            }
        }
    }
}

// ============================================================
// MARK: - Mine tab view (third-person avatar)
// The previous Spells/Potions/Brew UI lives on as
// UltimateSpellbookView, opened from 📖 so nothing is lost.
// ============================================================

struct UltimateMagicView: View {
    @EnvironmentObject var ultimate: HalloweenUltimateManager
    @StateObject private var manager = MineManager()
    @State private var showSpellbook = false
    @State private var showPickPanel = false
    @State private var didBank = false
    @State private var scareFlash = false
    @State private var hurtFlash = false
    @State private var blastFlash = false

    /// Hold-to-mine: repeats the swing every 0.3s until released.
    /// The flag lives on the manager (reference type) so the delayed
    /// loop always sees the live value, not a stale struct copy.
    private func startAutoMine() {
        guard !manager.miningHeld else { return }
        manager.miningHeld = true
        autoMineTick()
    }

    private func autoMineTick() {
        guard manager.miningHeld else { return }
        manager.mineNearestBlock()
        ultimate.triggerHaptic(.light)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { autoMineTick() }
    }

    /// Hotbar order (fixed so slots don't jump around).
    private let hotbar: [(name: String, emoji: String)] = [
        ("Coal Ore", "⬛"), ("Iron Ore", "🟫"), ("Gold Ore", "🟨"),
        ("Lapis Ore", "🟦"), ("Redstone Ore", "🟥"), ("Emerald Ore", "🟩"),
        ("Ruby Ore", "♦️"), ("Diamond Ore", "💎"), ("Opal Ore", "🔮"),
        ("Timber", "🪵"),
    ]

    var body: some View {
        ZStack {
            MineSceneView(manager: manager)
                .ignoresSafeArea()

            // Crosshair.
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Text("+")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white.opacity(0.9))
                        .shadow(color: .black, radius: 2)
                    Spacer()
                }
                Spacer()
            }
            .allowsHitTesting(false)

            // Screech + hurt vignettes.
            Color.red.opacity(scareFlash ? 0.32 : 0)
                .ignoresSafeArea()
                .allowsHitTesting(false)
                .animation(.easeOut(duration: 0.4), value: scareFlash)
            Color.red.opacity(hurtFlash ? 0.22 : 0)
                .ignoresSafeArea()
                .allowsHitTesting(false)
                .animation(.easeOut(duration: 0.3), value: hurtFlash)
            Color.orange.opacity(blastFlash ? 0.28 : 0)
                .ignoresSafeArea()
                .allowsHitTesting(false)
                .animation(.easeOut(duration: 0.35), value: blastFlash)

            VStack(spacing: 0) {
                // Top HUD.
                HStack(spacing: 8) {
                    VStack(spacing: 0) {
                        Text("🦇 Abandoned Mine").font(.subheadline.bold()).foregroundColor(.white)
                        Text("Lv.\(manager.player.level) • 💰\(manager.player.gold) • 🎒\(manager.player.backpackUsed)/\(manager.player.backpackCapacity) • 👾\(manager.player.monstersSlain)")
                            .font(.system(size: 9)).foregroundColor(.white.opacity(0.85))
                        Text("\(manager.currentLayer.emoji) \(manager.currentLayer.title)\(manager.player.rebirths > 0 ? " • 💫\(manager.player.rebirths)" : "")")
                            .font(.system(size: 9)).foregroundColor(.yellow.opacity(0.95))
                        if manager.lavaWarning {
                            Text("🔥 LAVA — MOVE!").font(.system(size: 9).bold()).foregroundColor(.red)
                        }
                    }
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Color.brown.opacity(0.75)).cornerRadius(8)
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill").foregroundColor(.red).font(.caption2)
                        Text("\(manager.player.health)/\(manager.player.maxHealth)").foregroundColor(.white).font(.caption2.bold())
                    }
                    .padding(.horizontal, 8).padding(.vertical, 6)
                    .background(Color.black.opacity(0.7)).cornerRadius(8)
                    Button(action: { showPickPanel = true }) {
                        Text(manager.player.pickTier.emoji).font(.title3)
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(Color.orange.opacity(0.8)).cornerRadius(8)
                    }
                    Button(action: { showSpellbook = true }) {
                        Text("📖").font(.title3)
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(Color.purple.opacity(0.8)).cornerRadius(8)
                    }
                    Button(action: { manager.sellBackpack() }) {
                        VStack(spacing: 0) {
                            Text("💰").font(.title3)
                            Text("\(manager.player.sellValue)").font(.system(size: 8).bold()).foregroundColor(.white)
                        }
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Color.green.opacity(manager.player.backpackUsed > 0 ? 0.85 : 0.4)).cornerRadius(8)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.top, 4)

                // Recent notifications.
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(manager.notifications.suffix(2), id: \.self) { note in
                        Text(note)
                            .font(.system(size: 10))
                            .foregroundColor(.white)
                            .padding(.horizontal, 8).padding(.vertical, 3)
                            .background(Color.black.opacity(0.55)).cornerRadius(6)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 8)
                .padding(.top, 4)

                Spacer()

                // Ore hotbar (the bucket): what you've mined, live counts.
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(hotbar, id: \.name) { slot in
                            let n = manager.player.ores[slot.name, default: 0]
                            VStack(spacing: 0) {
                                Text(slot.emoji).font(.title3)
                                Text("\(n)").font(.system(size: 10).bold()).foregroundColor(.white)
                            }
                            .frame(width: 44, height: 48)
                            .background(Color.black.opacity(n > 0 ? 0.65 : 0.3))
                            .cornerRadius(8)
                            .opacity(n > 0 ? 1 : 0.45)
                        }
                    }
                    .padding(.horizontal, 8)
                }
                .padding(.bottom, 4)

                // D-pad (up/down walk, left/right strafe — drag to turn) + mine/bomb.
                HStack(alignment: .bottom) {
                    VStack(spacing: 6) {
                        DPadButton(icon: "arrow.up") { manager.startMoving(dx: 0, dz: -1) } end: { manager.stopMoving() }
                        HStack(spacing: 6) {
                            DPadButton(icon: "arrow.left") { manager.startMoving(dx: -1, dz: 0) } end: { manager.stopMoving() }
                            DPadButton(icon: "arrow.down") { manager.startMoving(dx: 0, dz: 1) } end: { manager.stopMoving() }
                            DPadButton(icon: "arrow.right") { manager.startMoving(dx: 1, dz: 0) } end: { manager.stopMoving() }
                        }
                        Text("D-pad moves · drag turns · tap floor to walk · tap ore to mine")
                            .font(.system(size: 8)).foregroundColor(.white.opacity(0.7))
                    }
                    .padding(.leading, 8)
                    Spacer()
                    VStack(spacing: 8) {
                        Button(action: { manager.throwBomb(); ultimate.triggerHaptic(.heavy) }) {
                            ZStack(alignment: .topTrailing) {
                                Text("🧨")
                                    .font(.system(size: 26))
                                    .frame(width: 56, height: 56)
                                    .background(Color.red.opacity(0.9)).cornerRadius(28)
                                Text("\(manager.bombs)")
                                    .font(.system(size: 11).bold())
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6).padding(.vertical, 2)
                                    .background(Color.black.opacity(0.7)).cornerRadius(8)
                                    .offset(x: 6, y: -6)
                            }
                        }
                        Button(action: {}) {
                            Text("⛏️")
                                .font(.system(size: 30))
                                .frame(width: 64, height: 64)
                                .background(Color.orange.opacity(0.9)).cornerRadius(32)
                        }
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { _ in startAutoMine() }
                                .onEnded { _ in manager.miningHeld = false }
                        )
                    }
                    .padding(.trailing, 8)
                }
                .padding(.bottom, 8)
            }

            // World-gen streams in behind play: slim non-blocking pill only,
            // never a full-screen "Digging..." wait.
            if !manager.worldReady {
                VStack {
                    HStack(spacing: 8) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .orange))
                        Text("Expanding tunnels…")
                            .font(.caption2.bold()).foregroundColor(.orange)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.55)).cornerRadius(12)
                    .padding(.top, 54)
                    Spacer()
                }
                .allowsHitTesting(false)
                .transition(.opacity)
            }
        }
        .navigationTitle("Mine")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showSpellbook) {
            UltimateSpellbookView()
                .environmentObject(ultimate)
        }
        .sheet(isPresented: $showPickPanel) {
            MinePickPanel(manager: manager)
        }
        .onChange(of: manager.scareId) { _, _ in
            scareFlash = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { scareFlash = false }
        }
        .onChange(of: manager.hurtId) { _, _ in
            hurtFlash = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { hurtFlash = false }
        }
        .onChange(of: manager.lastBlastId) { _, _ in
            blastFlash = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { blastFlash = false }
        }
        .onAppear {
            manager.onEvent = { event in
                switch event {
                case .minedOre(let name, let n):
                    ultimate.gold += n * 5
                    ultimate.experience += n * 8
                    ultimate.score += n * 10
                    ultimate.addNotification("⛏️ Mine ore: \(name) x\(n)!")
                    ultimate.checkLevelUp()
                case .batRepelled:
                    ultimate.gold += 10
                    ultimate.experience += 20
                    ultimate.score += 60
                    ultimate.addNotification("🦇 Bat repelled! The mine is safer.")
                    ultimate.checkLevelUp()
                    ultimate.checkAchievements()
                case .monsterSlain(let kind):
                    ultimate.gold += 15
                    ultimate.experience += 30
                    ultimate.score += 100
                    ultimate.addNotification("👾 \(kind.capitalized) slain in the mine!")
                    ultimate.checkLevelUp()
                    ultimate.checkAchievements()
                case .leveledUp(let lv):
                    ultimate.addNotification("⬆️ Miner rank \(lv)! The crew salutes you!")
                }
            }
        }
        .onDisappear { bankOnce() }
        .overlay(alignment: .bottom) {
            MineTutorialView(tutorial: manager.tutorial)
        }
        .overlay {
            MineWeatherOverlay(layerTitle: manager.currentLayer.title, director: manager.weather)
        }
        .overlay {
            MineCinematicHost(director: manager.cinema)
        }
        .overlay(alignment: .topTrailing) {
            MineFrameBadge(monitor: manager.frameMonitor)
                .padding(.trailing, 8)
                .padding(.top, 96)
        }
    }

    func bankOnce() {
        guard !didBank else { return }
        didBank = true
        let s = manager.player.gold + manager.player.blocksMined * 2
            + manager.player.batsRepelled * 15 + manager.player.monstersSlain * 25
        if s > 0 {
            _ = ultimate.reportArcadeScore(.abandonedMine, score: s, gameName: "Abandoned Mine")
        }
    }
}

// MARK: - Pickaxe forge (coal unlocks higher tiers + new gems)

struct MinePickPanel: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss
    @State private var showQuests = false
    @State private var showCodex = false
    @State private var showPerf = false
    @State private var showSettings = false
    @State private var showLore = false
    @State private var showMap = false
    @State private var showCaves = false
    @State private var showGhosts = false
    @State private var showCrystals = false
    @State private var showLights = false
    @State private var showParticles = false
    @State private var showDioramas = false
    @State private var showGhosts2 = false
    @State private var showCrystals2 = false
    @State private var showCinema = false
    @State private var showMotion = false
    @State private var showSectors = false
    @State private var showWeather = false
    @State private var showBosses = false
    @State private var showPets = false
    @State private var showSpin = false
    @State private var showParty = false
    @State private var showShop = false
    @State private var showSwap = false
    @State private var showArcade = false
    @State private var showMenu = false
    @State private var showWater = false
    @State private var showFire = false
    @State private var showHub = false
    @State private var showForest = false
    @State private var showGameFX = false
    @State private var showDaily = false
    @State private var showWelcome = !SpookyStore.onboardingDone

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("⛏️ \(manager.player.pickTier.name) equipped")) {
                    let coal = manager.player.ores["Coal Ore"] ?? 0
                    Text("Coal banked: \(coal) ⬛ — coal buys better picks.")
                        .font(.caption).foregroundColor(.secondary)
                }
                Section(header: Text("Forge")) {
                    ForEach(MNPickTier.allCases, id: \.rawValue) { tier in
                        HStack {
                            Text(tier.emoji).font(.title2)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(tier.name).bold().font(.subheadline)
                                Text("DMG \(tier.damage, specifier: "%.1f") • Unlocks: \(tier.unlocks)")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if tier == manager.player.pickTier {
                                Text("EQUIPPED").font(.caption2.bold()).foregroundColor(.green)
                            } else if tier.rawValue == manager.player.pickTier.rawValue + 1 {
                                Button("\(tier.coalCost)⬛") { _ = manager.upgradePick() }
                                    .buttonStyle(.borderedProminent)
                                    .controlSize(.small)
                            } else if tier.rawValue < manager.player.pickTier.rawValue {
                                Text("Owned").font(.caption).foregroundStyle(.secondary)
                            } else {
                                Text("\(tier.coalCost)⬛").font(.caption).foregroundStyle(.tertiary)
                            }
                        }
                    }
                }
                Section(header: Text("Gem guide")) {
                    Text("Coal: any pick • Iron/Gold/Lapis: Stone+ • Redstone/Emerald: Iron+ • Ruby: Golden+ • Diamond/Opal: Diamond • Frost: Stone+ • Glacier: Iron+")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section(header: Text("🎒 Backpack (\(manager.player.backpackUsed)/\(manager.player.backpackCapacity))")) {
                    Text("Unsold value: \(manager.player.sellValue)🪙 — sell at the 💰 cart. Surface entrance pays +25%\(manager.isAtSellPad ? " (YOU'RE THERE!)" : "").")
                        .font(.caption).foregroundStyle(.secondary)
                    HStack {
                        Button("Sell backpack") { manager.sellBackpack() }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .tint(.green)
                        Spacer()
                        Button("+50 slots (\(manager.backpackCost)🪙)") { _ = manager.upgradeBackpack() }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                }
                Section(header: Text("🐾 Pets (\(manager.player.pets.filter({ $0.isEquipped }).count)/3 riding)")) {
                    Button("Hatch mystery egg (\(manager.petEggCost)🪙)") { manager.hatchPet() }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    ForEach(manager.player.pets) { pet in
                        HStack {
                            MinePetSprite(species: pet.species, size: 40)
                                .frame(width: 44, height: 44)
                            Text(pet.emoji).font(.title2)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(pet.species) • \(pet.rarity)").bold().font(.subheadline)
                                Text("+\(Int(pet.boostValue * 100))% \(pet.boostKind)")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button(pet.isEquipped ? "Riding" : "Ride") { manager.togglePetEquip(pet.id) }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                                .tint(pet.isEquipped ? .green : .orange)
                        }
                    }
                }
                Section(header: Text("💫 Rebirth (\(manager.player.rebirths)x)")) {
                    Text(manager.canRebirth
                         ? "Ready! Reset gold/ores/picks/pets for permanent +15% everything (now +\(Int(manager.rebirthMult * 100 - 100))%). You stay where you stand."
                         : "Needs rank 15 + a trip to the 🔥 Magma Core (Lv.\(manager.player.level), deepest \(Int(manager.player.deepestY))). Each rebirth = +15% forever.")
                        .font(.caption).foregroundStyle(.secondary)
                    if manager.canRebirth {
                        Button("REBIRTH") { manager.doRebirth() }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .tint(.purple)
                    }
                }
                Section(header: Text("🧭 Adventurer")) {
                    HStack {
                        Button("📜 Quests (\(manager.questBoard.doneCount)/\(manager.questBoard.totalCount))") { showQuests = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        if !manager.questBoard.claimable.isEmpty {
                            Text("\(manager.questBoard.claimable.count) claimable!")
                                .font(.caption2.bold()).foregroundColor(.green)
                        }
                    }
                    HStack {
                        Button("📖 Codex") { showCodex = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("🎞️ Performance") { showPerf = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("⚙️ Settings") { showSettings = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("📜 Echoes") { showLore = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("🗺️ Sector Map") { showMap = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("🔒 Caves (\(manager.mineCaves.filter({ $0.isLocked }).count) sealed)") { showCaves = true }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .tint(.purple)
                        Spacer()
                    }
                    HStack {
                        Button("👻 Ghosts") { showGhosts = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("💎 Crystals") { showCrystals = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("🔥 Lighting") { showLights = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("✨ Particles") { showParticles = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("🖼️ Dioramas") { showDioramas = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("🎬 Cinematics") { showCinema = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("👻 Ghosts II") { showGhosts2 = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("💠 Crystals II") { showCrystals2 = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("🎛️ Motion Lab") { showMotion = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("🌤️ Weather") { showWeather = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("🖼️ Sectors") { showSectors = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("👑 Bosses") { showBosses = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("🐾 Pet FX") { showPets = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button(manager.canSpinToday ? "🎡 Daily Spin!" : "🎡 Spun ✓") { showSpin = true }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .tint(manager.canSpinToday ? .purple : .gray)
                    }
                    HStack {
                        Button("🎉 Celebrations") { showParty = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("🔨 Workshop") { showShop = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("🔀 Transitions") { showSwap = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("🕹️ Arcade FX") { showArcade = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("🎪 Arcade Menu") { showMenu = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("🎮 Game FX") { showGameFX = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("💧 Water") { showWater = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Spacer()
                        Button("🔥 Fire") { showFire = true }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    HStack {
                        Button("🎨 ALL GRAPHICS") { showHub = true }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .tint(.pink)
                        Spacer()
                        Button("🌲 Forest") { showForest = true }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .tint(.green)
                    }
                    HStack {
                        Button("📅 Daily Hub") { showDaily = true }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .tint(.orange)
                        Spacer()
                    }
                    HStack {
                        Text("\(manager.frameMonitor.grade) • \(Int(manager.frameMonitor.fps)) FPS • ⏱️ \(manager.statTracker.playClock)")
                            .font(.caption).foregroundStyle(.secondary)
                        Spacer()
                        Button("Reset tutorial") { manager.tutorial.reset() }
                            .font(.caption)
                    }
                }
                Section(header: Text("Mine rules")) {
                    // Endless-mine god mode is locked on: hits are warnings only,
                    // HP floors at 1, and you never leave your tunnel.
                    HStack {
                        Image(systemName: "shield.fill")
                        Text("God mode: locked ON — explore and mine with zero death risk.")
                    }
                    .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Pickaxe Forge")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showQuests) {
                MineQuestView(board: manager.questBoard)
            }
            .sheet(isPresented: $showCodex) {
                MineCodexView(manager: manager)
            }
            .sheet(isPresented: $showPerf) {
                MinePerfPanel(monitor: manager.frameMonitor, stats: manager.statTracker, manager: manager)
            }
            .sheet(isPresented: $showSettings) {
                MineSettingsView(manager: manager)
            }
            .sheet(isPresented: $showLore) {
                MineLoreView(manager: manager)
            }
            .sheet(isPresented: $showMap) {
                MineMapView(manager: manager)
            }
            .sheet(isPresented: $showCaves) {
                MineLockedCavePanel(manager: manager)
            }
            .sheet(isPresented: $showGhosts) {
                MineGhostShowcaseView()
            }
            .sheet(isPresented: $showCrystals) {
                MineCrystalShowcaseView()
            }
            .sheet(isPresented: $showLights) {
                MineLightingShowcaseView()
            }
            .sheet(isPresented: $showParticles) {
                MineParticleShowcaseView()
            }
            .sheet(isPresented: $showDioramas) {
                MineDioramaShowcaseView()
            }
            .sheet(isPresented: $showGhosts2) {
                MineGhostTheater2ShowcaseView()
            }
            .sheet(isPresented: $showCrystals2) {
                MineCrystalTheater2ShowcaseView()
            }
            .sheet(isPresented: $showCinema) {
                MineCinematicShowcaseView()
            }
            .sheet(isPresented: $showMotion) {
                MineHUDMotionShowcaseView()
            }
            .sheet(isPresented: $showSectors) {
                MineSectorShowcaseView()
            }
            .sheet(isPresented: $showWeather) {
                MineWeatherShowcaseView()
            }
            .sheet(isPresented: $showBosses) {
                MineBossCinemaShowcaseView()
            }
            .sheet(isPresented: $showPets) {
                MinePetFXShowcaseView()
            }
            .sheet(isPresented: $showSpin) {
                MineDailyWheelView(manager: manager)
            }
            .sheet(isPresented: $showParty) {
                MineCelebrationShowcaseView()
            }
            .sheet(isPresented: $showShop) {
                MineWorkshopShowcaseView()
            }
            .sheet(isPresented: $showSwap) {
                MineTransitionShowcaseView()
            }
            .sheet(isPresented: $showArcade) {
                MineArcadeShowcaseView()
            }
            .sheet(isPresented: $showMenu) {
                MineArcadeOverhaulShowcaseView()
            }
            .sheet(isPresented: $showGameFX) {
                MineGameFXShowcaseView()
            }
            .sheet(isPresented: $showWater) {
                MineWaterShowcaseView()
            }
            .sheet(isPresented: $showFire) {
                MineFireShowcaseView()
            }
            .sheet(isPresented: $showHub) {
                MineGraphicsHubView()
            }
            .sheet(isPresented: $showForest) {
                MineForestShowcaseView()
            }
            .sheet(isPresented: $showDaily) {
                MineDailyHubView(manager: manager)
            }
            .sheet(isPresented: $showWelcome) {
                MineWelcomeCard {
                    showWelcome = false
                }
            }
        }
    }
}

private struct DPadButton: View {
    let icon: String
    let start: () -> Void
    let end: () -> Void
    var body: some View {
        Button(action: {}) {
            Image(systemName: icon).font(.title3.bold())
                .frame(width: 48, height: 40)
                .background(Color.orange.opacity(0.85)).foregroundColor(.white).cornerRadius(8)
        }
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in start() }
                .onEnded { _ in end() }
        )
    }
}

// ============================================================
// MARK: - Arcade host (Games-list entry)
// ============================================================

struct MineHostView: View {
    @EnvironmentObject var ultimate: HalloweenUltimateManager
    var onDone: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            UltimateMagicView()
                .environmentObject(ultimate)
            Button(action: onDone) {
                Text("Done")
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(10)
            }
            .padding(.trailing, 14)
            .padding(.top, 54)
        }
    }
}
