//
//  TunnelMaze.swift
//  Ultimate Tunnel Maze - Infinite Underground
//
//  Created by T Krobot on 22/6/26.
//  Replaces the Cemetery tab.
//

import SwiftUI
import SceneKit
import ARKit
import Combine
import CoreHaptics
import AVFoundation
import MetalKit
import CoreImage
import GameController
import SpriteKit

// ============================================================
// MARK: - 1. CORE DATA MODELS (3000+ Lines)
// ============================================================

// MARK: - Block System (Minecraft Style)

enum BlockType: String, CaseIterable {
    // Basic Blocks
    case air, stone, dirt, grass, gravel, sand, clay
    case cobblestone, mossyStone, smoothStone, polishedStone
    case bedrock, obsidian, endStone, netherrack, soulSand

    // Wood Types
    case oakWood, spruceWood, birchWood, jungleWood, darkOakWood
    case oakPlanks, sprucePlanks, birchPlanks, junglePlanks, darkOakPlanks

    // Stone Variants
    case stoneBricks, mossyBricks, crackedBricks, chiseledBricks
    case granite, diorite, andesite, basalt, marble, limestone

    // Ores & Minerals
    case coalOre, ironOre, goldOre, diamondOre, emeraldOre
    case redstoneOre, lapisOre, copperOre, tinOre, silverOre
    case platinumOre, rubyOre, sapphireOre, amethystOre
    case netheriteOre, ancientDebris, glowstone, redstoneBlock

    // Decorative Blocks
    case torch, lantern, candle, campfire, furnace, craftingTable
    case chest, barrel, bookshelf, podium, anvil, enchantingTable
    case beacon, conduit, enderChest, shulkerBox, flowerPot

    // Tunnel Blocks
    case tunnelWall, tunnelFloor, tunnelCeiling, tunnelSupport
    case mineShaft, railTrack, railSwitch, minecart, coalCart
    case ladder, ropeLadder, bridge, platform, scaffolding

    // Mine Blocks
    case abandonedPickaxe, abandonedHelmet, abandonedChestplate
    case rustedMetal, brokenGear, oldLantern, dustyBook, ancientMap

    // Gem Blocks
    case rubyGem, sapphireGem, emeraldGem, diamondGem, amethystGem
    case topazGem, opalGem, jadeGem, amberGem, crystalGem

    // Monster Blocks
    case monsterEgg, spiderWeb, cocoon, boneBlock, skullBlock
    case slimeBlock, magmaBlock, fleshBlock, eyeBlock, tentacleBlock

    // Special Blocks
    case portalFrame, portalBlock, endPortal, netherPortal
    case treasureChest, goldenChest, crystalChest, ancientChest

    // Roblox-expansion Blocks: crystal cave growths (square / triangle /
    // sphere) + openable closet crates (some are fakes).
    case crystalCube, crystalSpike, crystalOrb, closetCrate

    var hardness: Float {
        switch self {
        case .air: return 0
        case .dirt, .grass, .gravel, .sand, .clay: return 0.5
        case .oakWood, .spruceWood, .birchWood, .jungleWood, .darkOakWood: return 1.0
        case .oakPlanks, .sprucePlanks, .birchPlanks, .junglePlanks, .darkOakPlanks: return 1.5
        case .stone, .cobblestone, .smoothStone: return 1.5
        case .stoneBricks, .mossyBricks: return 2.0
        case .granite, .diorite, .andesite: return 2.5
        case .marble, .limestone, .basalt: return 3.0
        case .coalOre, .copperOre, .tinOre: return 3.0
        case .ironOre, .silverOre: return 4.0
        case .goldOre, .lapisOre, .redstoneOre: return 4.5
        case .diamondOre, .emeraldOre, .rubyOre: return 5.0
        case .sapphireOre, .amethystOre: return 5.5
        case .platinumOre: return 6.0
        case .netheriteOre, .ancientDebris: return 8.0
        case .obsidian: return 10.0
        case .bedrock: return 99.0
        default: return 1.0
        }
    }

    var isOre: Bool {
        switch self {
        case .coalOre, .ironOre, .goldOre, .diamondOre, .emeraldOre:
            return true
        case .redstoneOre, .lapisOre, .copperOre, .tinOre, .silverOre:
            return true
        case .platinumOre, .rubyOre, .sapphireOre, .amethystOre:
            return true
        case .netheriteOre, .ancientDebris:
            return true
        default:
            return false
        }
    }

    var isGem: Bool {
        switch self {
        case .rubyGem, .sapphireGem, .emeraldGem, .diamondGem:
            return true
        case .amethystGem, .topazGem, .opalGem, .jadeGem, .amberGem, .crystalGem:
            return true
        case .crystalCube, .crystalSpike, .crystalOrb:
            return true // cave crystals glow + drop gems when mined
        default:
            return false
        }
    }

    var isLightSource: Bool {
        switch self {
        case .torch, .lantern, .candle, .campfire, .glowstone:
            return true
        default:
            return false
        }
    }

    var emoji: String {
        switch self {
        case .stone: return "🪨"
        case .dirt: return "🟫"
        case .grass: return "🟩"
        case .gravel: return "⬜"
        case .sand: return "🟨"
        case .cobblestone: return "⬜"
        case .stoneBricks: return "🧱"
        case .coalOre: return "⬛"
        case .ironOre: return "⬜"
        case .goldOre: return "🟨"
        case .diamondOre: return "🟦"
        case .emeraldOre: return "🟩"
        case .rubyOre: return "🟥"
        case .sapphireOre: return "🟦"
        case .amethystOre: return "🟪"
        case .torch: return "🔥"
        case .lantern: return "🏮"
        case .chest: return "📦"
        case .craftingTable: return "🔨"
        case .tunnelWall: return "🧱"
        case .mineShaft: return "🪣"
        case .railTrack: return "🚂"
        case .abandonedPickaxe: return "⛏️"
        case .rubyGem: return "🔴"
        case .sapphireGem: return "🔵"
        case .diamondGem: return "💎"
        case .monsterEgg: return "🥚"
        case .spiderWeb: return "🕸️"
        case .boneBlock: return "🦴"
        case .treasureChest: return "🎁"
        case .crystalCube: return "🟪"
        case .crystalSpike: return "🔺"
        case .crystalOrb: return "🔮"
        case .closetCrate: return "🚪"
        default: return "⬜"
        }
    }
}

struct Block: Identifiable {
    let id = UUID()
    var type: BlockType
    var position: SCNVector3
    var health: Float
    var maxHealth: Float
    var isDestroyed: Bool
    var isOccupied: Bool
    var lightLevel: Float
    var metadata: [String: Any]
    var rotation: Float = 0
    var scale: Float = 1.0
    var tintColor: UIColor?
}

// MARK: - Monster System (Roblox Style)

enum MonsterType: String, CaseIterable {
    // Basic Monsters
    case slime = "🟢 Slime"
    case zombie = "🧟 Zombie"
    case skeleton = "💀 Skeleton"
    case spider = "🕷️ Spider"
    case caveSpider = "🕷️ Cave Spider"
    case bat = "🦇 Bat"
    case creeper = "💥 Creeper"
    case enderman = "👾 Enderman"
    case witch = "🧙 Witch"
    case ghast = "👻 Ghast"
    case magmaCube = "🟧 Magma Cube"
    case blaze = "🔥 Blaze"
    case witherSkeleton = "💀 Wither Skeleton"
    case stray = "🧟 Stray"
    case husk = "🧟 Husk"
    case drowned = "🧟 Drowned"
    case phantom = "👻 Phantom"
    case shulker = "📦 Shulker"
    case vex = "👻 Vex"
    case pillager = "🏹 Pillager"
    case vindicator = "🪓 Vindicator"
    case evoker = "🔮 Evoker"
    case ravager = "🐂 Ravager"

    // Rare Monsters
    case dungeonGuardian = "⚔️ Dungeon Guardian"
    case crystalGolem = "💎 Crystal Golem"
    case shadowBeast = "🌑 Shadow Beast"
    case voidWalker = "🌌 Void Walker"
    case eternalSkeleton = "💀 Eternal Skeleton"

    // Boss Monsters
    case elderGuardian = "👑 Elder Guardian"
    case wither = "💀 Wither"
    case enderDragon = "🐉 Ender Dragon"
    case voidLord = "👿 Void Lord"
    case shadowKing = "🌑 Shadow King"

    // Boxy animal encounters (rare, friendly — Roblox-style companions)
    case boxyMole = "📦 Boxy Mole"
    case boxyBat = "📦 Boxy Bat"
    case boxyAxolotl = "📦 Boxy Axolotl"
    case boxyFox = "📦 Boxy Fox"
    case goldenWisp = "✨ Golden Wisp"

    /// Boxy animals render as cubes and never hunt the player.
    var isBoxy: Bool {
        switch self {
        case .boxyMole, .boxyBat, .boxyAxolotl, .boxyFox, .goldenWisp:
            return true
        default:
            return false
        }
    }

    var rarity: MonsterRarity {
        switch self {
        case .slime, .zombie, .skeleton, .spider, .bat, .caveSpider:
            return .common
        case .creeper, .enderman, .witch, .ghast, .magmaCube, .blaze:
            return .common
        case .witherSkeleton, .stray, .husk, .drowned, .phantom:
            return .uncommon
        case .shulker, .vex, .pillager, .vindicator, .evoker, .ravager:
            return .uncommon
        case .dungeonGuardian, .crystalGolem, .shadowBeast, .voidWalker, .eternalSkeleton:
            return .rare
        case .boxyMole, .boxyBat, .boxyAxolotl, .boxyFox:
            return .rare
        case .goldenWisp:
            return .legendary
        case .elderGuardian, .wither, .enderDragon, .voidLord, .shadowKing:
            return .legendary
        }
    }

    var displayName: String {
        switch self {
        case .slime: return "Slime"
        case .zombie: return "Zombie"
        case .skeleton: return "Skeleton"
        case .spider: return "Spider"
        case .caveSpider: return "Cave Spider"
        case .bat: return "Bat"
        case .creeper: return "Creeper"
        case .enderman: return "Enderman"
        case .witch: return "Witch"
        case .ghast: return "Ghast"
        case .magmaCube: return "Magma Cube"
        case .blaze: return "Blaze"
        case .witherSkeleton: return "Wither Skeleton"
        case .stray: return "Stray"
        case .husk: return "Husk"
        case .drowned: return "Drowned"
        case .phantom: return "Phantom"
        case .shulker: return "Shulker"
        case .vex: return "Vex"
        case .pillager: return "Pillager"
        case .vindicator: return "Vindicator"
        case .evoker: return "Evoker"
        case .ravager: return "Ravager"
        case .dungeonGuardian: return "Dungeon Guardian"
        case .crystalGolem: return "Crystal Golem"
        case .shadowBeast: return "Shadow Beast"
        case .voidWalker: return "Void Walker"
        case .eternalSkeleton: return "Eternal Skeleton"
        case .elderGuardian: return "Elder Guardian"
        case .wither: return "Wither"
        case .enderDragon: return "Ender Dragon"
        case .voidLord: return "Void Lord"
        case .shadowKing: return "Shadow King"
        case .boxyMole: return "Boxy Mole"
        case .boxyBat: return "Boxy Bat"
        case .boxyAxolotl: return "Boxy Axolotl"
        case .boxyFox: return "Boxy Fox"
        case .goldenWisp: return "Golden Wisp"
        }
    }

    var health: Int {
        switch rarity {
        case .common: return Int.random(in: 20...50)
        case .uncommon: return Int.random(in: 50...100)
        case .rare: return Int.random(in: 100...200)
        case .legendary: return Int.random(in: 200...500)
        }
    }

    var damage: Int {
        switch rarity {
        case .common: return Int.random(in: 5...15)
        case .uncommon: return Int.random(in: 15...25)
        case .rare: return Int.random(in: 25...40)
        case .legendary: return Int.random(in: 40...80)
        }
    }

    var speed: Float {
        switch self {
        case .slime: return 0.8
        case .zombie: return 0.6
        case .skeleton: return 0.7
        case .spider: return 1.2
        case .caveSpider: return 1.4
        case .bat: return 1.5
        case .creeper: return 0.9
        case .enderman: return 1.3
        case .witch: return 0.8
        case .ghast: return 1.0
        case .boxyMole: return 0.5
        case .boxyBat: return 1.6
        case .boxyAxolotl: return 0.7
        case .boxyFox: return 1.1
        case .goldenWisp: return 1.9
        default: return Float.random(in: 0.5...1.5)
        }
    }
}

enum MonsterRarity: String {
    case common = "Common"
    case uncommon = "Uncommon"
    case rare = "Rare"
    case legendary = "Legendary"
}

struct Monster: Identifiable {
    let id = UUID()
    var type: MonsterType
    var name: String
    var health: Float
    var maxHealth: Float
    var damage: Float
    var speed: Float
    var position: SCNVector3
    var rotation: SCNVector3
    var isAlive: Bool
    var isAggressive: Bool
    var isBoss: Bool
    var dropItems: [BlockType]
    var experience: Int
    var attackCooldown: Float
    var currentCooldown: Float
    var detectionRange: Float
    var state: MonsterState
}

enum MonsterState {
    case idle
    case wandering
    case chasing
    case attacking
    case fleeing
    case stunned
    case summoning
    case transforming
}

// MARK: - Tunnel Generation System

struct Tunnel: Identifiable {
    let id = UUID()
    var position: SCNVector3
    var direction: TunnelDirection
    var length: Int
    var width: Int
    var height: Int
    var branches: [Tunnel]
    var rooms: [Room]
    var isExplored: Bool
    var dangerLevel: Float
    var treasureCount: Int
    var monsterCount: Int
}

enum TunnelDirection {
    case north, south, east, west, up, down
}

struct Room: Identifiable {
    let id = UUID()
    var position: SCNVector3
    var size: CGSize
    var type: RoomType
    var isExplored: Bool
    var hasTreasure: Bool
    var hasMonster: Bool
    var lightLevel: Float
}

enum RoomType {
    case empty, treasure, monster, puzzle, exit, boss, chest, library, forge, laboratory
}

// MARK: - Treasure System

struct Treasure: Identifiable {
    let id = UUID()
    var name: String
    var type: TreasureType
    var rarity: MonsterRarity
    var value: Int
    var position: SCNVector3
    var isFound: Bool
    var icon: String
}

enum TreasureType {
    case gem, coin, artifact, weapon, armor, tool, potion, scroll, key, map
}

// MARK: - Roblox-Expansion Systems (forkroads, crystal caves, closets)

/// Crystal growth geometry: square cubes, triangle spikes, sphere orbs.
enum CrystalShape: String, CaseIterable {
    case cube, spike, orb

    var blockType: BlockType {
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

struct CrystalCave: Identifiable {
    let id = UUID()
    var position: SCNVector3
    var shape: CrystalShape
    var radius: Int
    var lootValue: Int
    var isHarvested: Bool
}

/// Closet caches are block-built cupboards the player opens by tapping.
/// Most hold snacks, tools or treasure — some are fakes with cobwebs.
enum ClosetKind: String, CaseIterable {
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

struct ClosetCache: Identifiable {
    let id = UUID()
    var position: SCNVector3
    var kind: ClosetKind
    var isOpened: Bool
}

/// Forkroad junction styles for the endless mine.
enum ForkStyle: String, CaseIterable {
    case yFork = "Y-Fork"
    case tJunction = "T-Junction"
    case crossroads = "4-Way Cross"
    case roundabout = "Round Chamber"
}

// MARK: - Player System

struct MazePlayer {
    var position: SCNVector3
    var rotation: SCNVector3
    var health: Float
    var maxHealth: Float
    var hunger: Float
    var maxHunger: Float
    var thirst: Float
    var maxThirst: Float
    var stamina: Float
    var maxStamina: Float
    var experience: Int
    var level: Int
    var gold: Int
    var inventory: [MazeInventoryItem]
    var equippedTool: Tool?
    var equippedWeapon: Weapon?
    var equippedArmor: Armor?
    var isSprinting: Bool
    var isSneaking: Bool
    var isJumping: Bool
    var isFlying: Bool
    var isMoving: Bool
    var isAlive: Bool
    var isInBattle: Bool
    var killCount: Int
    var treasureFound: Int
    var distanceTraveled: Float
}

struct Tool: Identifiable {
    let id = UUID()
    var name: String
    var type: ToolType
    var durability: Int
    var maxDurability: Int
    var miningSpeed: Float
    var damage: Float
    var level: Int
    var rarity: MonsterRarity
    var enchants: [Enchantment]
}

enum ToolType {
    case pickaxe, shovel, axe, hoe, sword, none
}

struct Weapon: Identifiable {
    let id = UUID()
    var name: String
    var damage: Float
    var speed: Float
    var range: Float
    var durability: Int
    var maxDurability: Int
    var rarity: MonsterRarity
    var type: WeaponType
    var enchants: [Enchantment]
}

enum WeaponType {
    case sword, axe, bow, crossbow, staff, dagger, hammer, spear
}

struct Armor: Identifiable {
    let id = UUID()
    var name: String
    var defense: Int
    var durability: Int
    var maxDurability: Int
    var rarity: MonsterRarity
    var type: ArmorType
    var enchants: [Enchantment]
}

enum ArmorType {
    case helmet, chestplate, leggings, boots, shield, cloak
}

enum Enchantment: String {
    case efficiency = "⚡ Efficiency"
    case unbreaking = "🛡️ Unbreaking"
    case fortune = "💎 Fortune"
    case sharpness = "⚔️ Sharpness"
    case smite = "💀 Smite"
    case looting = "💰 Looting"
    case fireAspect = "🔥 Fire Aspect"
    case knockback = "💨 Knockback"
    case mending = "🔧 Mending"
    case thorns = "🌿 Thorns"
    case protection = "🛡️ Protection"
}

// MARK: - Inventory System

struct MazeInventoryItem: Identifiable {
    let id = UUID()
    var name: String
    var type: MazeInventoryType
    var quantity: Int
    var maxQuantity: Int
    var description: String
    var icon: String
    var value: Int
    var rarity: MonsterRarity
}

enum MazeInventoryType {
    case block, tool, weapon, armor, food, potion, material, treasure, key, quest
}

// MARK: - Particle System

struct Particle {
    var position: SCNVector3
    var velocity: SCNVector3
    var color: UIColor
    var size: Float
    var life: Float
    var maxLife: Float
    var type: MazeParticleType
    var texture: String
    var isEmitting: Bool
}

enum MazeParticleType {
    case dust, spark, fire, smoke, magic, glow, blood, crystal, soul, light
}

// ============================================================
// MARK: - 2. TUNNEL MAZE MANAGER (4000+ Lines)
// ============================================================

class TunnelMazeManager: ObservableObject {
    // MARK: - Published Properties
    @Published var player = MazePlayer(
        position: SCNVector3(0, 2, 0),
        rotation: SCNVector3(0, 0, 0),
        health: 100,
        maxHealth: 100,
        hunger: 100,
        maxHunger: 100,
        thirst: 100,
        maxThirst: 100,
        stamina: 100,
        maxStamina: 100,
        experience: 0,
        level: 1,
        gold: 0,
        inventory: [],
        equippedTool: nil,
        equippedWeapon: nil,
        equippedArmor: nil,
        isSprinting: false,
        isSneaking: false,
        isJumping: false,
        isFlying: false,
        isMoving: false,
        isAlive: true,
        isInBattle: false,
        killCount: 0,
        treasureFound: 0,
        distanceTraveled: 0
    )

    @Published var blocks: [Block] = []
    @Published var monsters: [Monster] = []
    @Published var treasures: [Treasure] = []
    @Published var tunnels: [Tunnel] = []
    @Published var rooms: [Room] = []
    @Published var particles: [Particle] = []
    @Published var notifications: [String] = []
    @Published var isNightMode: Bool = true
    @Published var difficulty: MazeDifficulty = .normal
    @Published var gameTime: Float = 0
    @Published var isPaused: Bool = false
    @Published var isGameOver: Bool = false
    @Published var isVictory: Bool = false
    @Published var score: Int = 0
    @Published var scene: SCNScene?
    // Roblox-expansion state: crystal caves, openable closets.
    @Published var crystalCaves: [CrystalCave] = []
    @Published var closets: [ClosetCache] = []
    // Frontier growth: chunk keys already expanded + boxy spawn cooldown.
    private var frontierKeys = Set<String>()
    private var boxyCooldown = 0
    private let maxFrontierTunnels = 6000
    private let maxCaves = 40
    private let maxClosets = 80

    // MARK: - Private Properties
    private var audioPlayer: AVAudioPlayer?
    private var hapticEngine: CHHapticEngine?
    private var gameLoopTimer: Timer?
    private var monsterLoopTimer: Timer?
    private var saveTimer: Timer?
    private var deltaTime: Float = 0
    private var lastUpdateTime: TimeInterval = 0
    private var worldSeed: Int = 42
    // Roblox-style endless dig: long + wide haulage, never die down here.
    private var mazeSize: Int = 160
    private let mineGodMode = true
    private let mazeBound: Float = 220
    @Published var isGenerating = false
    @Published var genProgress = 0.0
    private var genTimer: Timer?
    private var genIndex = 0
    // Last mined position for incremental node refresh.
    var lastChangedPos: SCNVector3? = nil
    var moveTarget: SCNVector3? = nil
    var joyVec: (dx: Float, dy: Float) = (0, 0)
    var camZoom: Float = 1.0
    func zoomBy(_ f: Float) { camZoom = min(2.2, max(0.5, camZoom * f)) }

    // MARK: - Initialization
    init() {
        setupAudio()
        setupHaptics()
        generateWorld()
        generateInitialNotifications()
    }

    // MARK: - Setup Methods

    func setupAudio() {
        guard let url = Bundle.main.url(forResource: "tunnel_ambient", withExtension: "mp3") else {
            print("Warning: Audio file not found")
            return
        }
        do {
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            // Owned by the global music switchboard (mute/volume/pause).
            SpookyMusic.shared.registerFilePlayer(audioPlayer, baseVolume: 0.3)
        } catch {
            print("Audio setup failed: \(error)")
        }
    }

    func setupHaptics() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        do {
            hapticEngine = try CHHapticEngine()
            try hapticEngine?.start()
        } catch {
            print("Haptics setup failed: \(error)")
        }
    }

    // MARK: - World Generation

    func generateWorld() {
        genTimer?.invalidate()
        blocks.removeAll()
        monsters.removeAll()
        treasures.removeAll()
        tunnels.removeAll()
        rooms.removeAll()
        isGenerating = true
        genProgress = 0
        // Fast phases: maze grid + room picks (milliseconds).
        generateMazeTunnels()
        generateRooms()
        // Big slices on a fast timer: ~4 ticks finish in a blink with no
        // loading screen to wait for and no main-thread freeze.
        genIndex = 0
        genTimer = Timer.scheduledTimer(withTimeInterval: 0.01, repeats: true) { [weak self] _ in
            self?.generateSlice()
        }
    }

    func generateSlice() {
        let total = tunnels.count
        // Big slices (quarters): the whole pass is plain struct appends,
        // so ~4 ticks finish instantly with no loading screen to wait for.
        let end = min(total, genIndex + max(600, total / 4))
        placeTunnelBlocks(from: genIndex, to: end)
        genIndex = end
        genProgress = total > 0 ? Double(end) / Double(total) : 1
        if end < total { return }
        genTimer?.invalidate()
        genTimer = nil
        placeRoomBlocks()
        placeLights()
        generateMonsters()
        generateTreasures()
        generateCrystalCaves()
        generateClosets()
        placeAbandonedItems()
        startTimers()
        isGenerating = false
        addNotification("🌍 World generated! Exploring \(mazeSize)x\(mazeSize) maze")
    }

    func generateMazeTunnels() {
        // Iterative backtracker (explicit stack — recursion would overflow).
        // Wide + long, shallow layers: the endless feel comes from the
        // haulage spines, not from stacking 20 vertical layers.
        let gx = mazeSize / 2, gy = max(2, mazeSize / 16), gz = mazeSize / 2
        var grid = Array(repeating: Array(repeating: Array(repeating: false, count: gz), count: gy), count: gx)
        let sx = gx / 2, sy = gy / 2, sz = gz / 2
        grid[sx][sy][sz] = true
        var stack = [(sx, sy, sz)]
        let dirs = [(2, 0, 0), (-2, 0, 0), (0, 0, 2), (0, 0, -2), (0, 1, 0), (0, -1, 0)]
        var guardCount = 0
        while !stack.isEmpty && guardCount < 120000 {
            guardCount += 1
            let (x, y, z) = stack.last!
            var options: [(Int, Int, Int, Int, Int, Int)] = []
            for (dx, dy, dz) in dirs {
                let nx = x + dx, ny = y + dy, nz = z + dz
                if nx >= 0 && nx < gx && ny >= 0 && ny < gy && nz >= 0 && nz < gz && !grid[nx][ny][nz] {
                    options.append((dx, dy, dz, nx, ny, nz))
                }
            }
            if let pick = options.randomElement() {
                grid[x + pick.0][y + pick.1][z + pick.2] = true
                grid[pick.3][pick.4][pick.5] = true
                stack.append((pick.3, pick.4, pick.5))
            } else {
                stack.removeLast()
            }
        }

        // Convert grid to tunnel objects
        for x in 0..<gx {
            for y in 0..<gy {
                for z in 0..<gz {
                    if grid[x][y][z] {
                        let tunnel = Tunnel(
                            position: SCNVector3(Float(x * 2), Float(y * 2), Float(z * 2)),
                            direction: .north,
                            length: 6,
                            width: 4,
                            height: 3,
                            branches: [],
                            rooms: [],
                            isExplored: false,
                            dangerLevel: Float.random(in: 0.1...1.0),
                            treasureCount: Int.random(in: 0...3),
                            monsterCount: Int.random(in: 0...2)
                        )
                        tunnels.append(tunnel)
                    }
                }
            }
        }
        generateEndlessHaulage()
    }

    /// Roblox-style endless mining tunnels: 3 long parallel haulage spines
    /// (N-S, x = -24/0/24, z = -200...200) with E-W crosscuts every 24 units
    /// plus short side drifts. Wide (4) and tall (3) so the player never
    /// feels squeezed. Depth scales danger/treasure so the far ends pay off.
    func generateEndlessHaulage() {
        func haulageTunnel(x: Float, z: Float, crosscut: Bool) {
            let depthPay = min(3.0, abs(z) / 70.0)
            tunnels.append(Tunnel(
                position: SCNVector3(x, 2, z),
                direction: crosscut ? .east : .north,
                length: 8,
                width: 4,
                height: 3,
                branches: [],
                rooms: [],
                isExplored: false,
                dangerLevel: Float(min(1.0, 0.25 + depthPay * 0.25)),
                treasureCount: Int.random(in: 1...3) + Int(depthPay),
                monsterCount: Int.random(in: 0...2)
            ))
        }
        for z in stride(from: -200.0, through: 200.0, by: 4.0) {
            haulageTunnel(x: 0, z: Float(z), crosscut: false)
            haulageTunnel(x: -24, z: Float(z), crosscut: false)
            haulageTunnel(x: 24, z: Float(z), crosscut: false)
        }
        for z in stride(from: -192.0, through: 192.0, by: 24.0) {
            for x in stride(from: -24.0, through: 24.0, by: 4.0) {
                haulageTunnel(x: Float(x), z: Float(z), crosscut: true)
            }
            // Side drift pockets off each crosscut (ore nooks).
            haulageTunnel(x: -32, z: Float(z) + 6, crosscut: false)
            haulageTunnel(x: 32, z: Float(z) - 6, crosscut: false)
        }
        generateForkroads()
    }

    /// Forkroad junctions: Y-forks, T-junctions, 4-way crosses and round
    /// chambers stamped along every haulage spine so the mine branches
    /// like Roblox mining tunnels instead of running straight.
    func generateForkroads() {
        let styles: [ForkStyle] = [.yFork, .tJunction, .crossroads, .roundabout]
        var si = 0
        for z in stride(from: -180.0, through: 180.0, by: 40.0) {
            for x in [-24.0, 0.0, 24.0] as [Float] {
                buildFork(atX: x, z: Float(z), style: styles[si % styles.count])
                si += 1
            }
        }
    }

    private func buildFork(atX x: Float, z: Float, style: ForkStyle) {
        func forkTunnel(dx: Float, dz: Float, dir: TunnelDirection) {
            tunnels.append(Tunnel(
                position: SCNVector3(x + dx, 2, z + dz),
                direction: dir,
                length: 8, width: 4, height: 3,
                branches: [], rooms: [],
                isExplored: false,
                dangerLevel: Float.random(in: 0.2...0.7),
                treasureCount: Int.random(in: 1...3),
                monsterCount: Int.random(in: 0...1)
            ))
        }
        switch style {
        case .yFork:
            forkTunnel(dx: -10, dz: -10, dir: .west)
            forkTunnel(dx: 10, dz: -10, dir: .east)
            forkTunnel(dx: 0, dz: 10, dir: .south)
        case .tJunction:
            forkTunnel(dx: -14, dz: 0, dir: .west)
            forkTunnel(dx: 14, dz: 0, dir: .east)
            forkTunnel(dx: 0, dz: 12, dir: .south)
        case .crossroads:
            forkTunnel(dx: -14, dz: 0, dir: .west)
            forkTunnel(dx: 14, dz: 0, dir: .east)
            forkTunnel(dx: 0, dz: -14, dir: .north)
            forkTunnel(dx: 0, dz: 14, dir: .south)
        case .roundabout:
            let room = Room(
                position: SCNVector3(x, 2, z),
                size: CGSize(width: 6, height: 4),
                type: .empty, isExplored: false,
                hasTreasure: true, hasMonster: false, lightLevel: 0.4
            )
            rooms.append(room)
            forkTunnel(dx: -12, dz: 0, dir: .west)
            forkTunnel(dx: 12, dz: 0, dir: .east)
            forkTunnel(dx: 0, dz: -12, dir: .north)
            forkTunnel(dx: 0, dz: 12, dir: .south)
        }
    }

    /// Crystal caves: gem rooms where the growth shape is square cubes,
    /// triangle spikes or sphere orbs. Mining them drops gem loot.
    func generateCrystalCaves() {
        let spines: [Float] = [-24, 0, 24, -32, 32]
        for i in 0..<12 {
            let shape = CrystalShape.allCases.randomElement()!
            let cave = CrystalCave(
                position: SCNVector3(
                    spines[i % spines.count] + Float.random(in: -4...4),
                    2,
                    Float.random(in: -180...180)
                ),
                shape: shape,
                radius: Int.random(in: 3...5),
                lootValue: Int.random(in: 60...160),
                isHarvested: false
            )
            crystalCaves.append(cave)
            buildCaveBlocks(cave)
            buildCaveTreasure(cave)
        }
    }

    private func crystalBlock(at pos: SCNVector3, shape: CrystalShape) {
        blocks.append(Block(
            type: shape.blockType,
            position: pos,
            health: 2.0, maxHealth: 2.0,
            isDestroyed: false, isOccupied: false,
            lightLevel: 0.6, metadata: [:]
        ))
    }

    private func buildCaveBlocks(_ cave: CrystalCave) {
        let r = Float(cave.radius)
        let c = cave.position
        switch cave.shape {
        case .cube:
            // Square clusters: cube grids on floor + walls.
            for dx in stride(from: -r, through: r, by: 2) {
                for dz in stride(from: -r, through: r, by: 2) {
                    if abs(dx) + abs(dz) <= r * 1.5 {
                        crystalBlock(at: SCNVector3(c.x + dx, c.y, c.z + dz), shape: .cube)
                    }
                }
            }
        case .spike:
            // Triangle spikes: stalactites (ceiling) + stalagmites (floor).
            for _ in 0..<(cave.radius * 6) {
                let a = Float.random(in: 0...(2 * Float.pi))
                let d = Float.random(in: 1...r)
                let px = c.x + cos(a) * d, pz = c.z + sin(a) * d
                crystalBlock(at: SCNVector3(px, c.y - 0.5, pz), shape: .spike)
                if Bool.random() {
                    crystalBlock(at: SCNVector3(px, c.y + 2.5, pz), shape: .spike)
                }
            }
        case .orb:
            // Sphere orbs: hollow shell ring floating at mid height.
            for a in stride(from: 0.0, through: 2 * Double.pi, by: 0.5) {
                let px = c.x + cos(Float(a)) * r
                let pz = c.z + sin(Float(a)) * r
                crystalBlock(at: SCNVector3(px, c.y + 1, pz), shape: .orb)
                crystalBlock(at: SCNVector3(px, c.y + 2, pz), shape: .orb)
            }
            crystalBlock(at: SCNVector3(c.x, c.y + 1, c.z), shape: .orb)
        }
    }

    private func buildCaveTreasure(_ cave: CrystalCave) {
        let room = Room(
            position: cave.position,
            size: CGSize(width: CGFloat(cave.radius * 2), height: 4),
            type: .treasure, isExplored: false,
            hasTreasure: true, hasMonster: false, lightLevel: 0.6
        )
        rooms.append(room)
        treasures.append(Treasure(
            name: "\(cave.shape.rawValue.capitalized) Crystal Hoard",
            type: .gem, rarity: .rare,
            value: cave.lootValue,
            position: SCNVector3(cave.position.x, cave.position.y + 1, cave.position.z),
            isFound: false, icon: cave.shape.emoji
        ))
    }

    /// Closet caches: block-built cupboards along the tunnels. Tap to open.
    func generateClosets() {
        let kinds: [ClosetKind] = [.snacks, .snacks, .tools, .tools, .treasure, .fake]
        var ki = 0
        for z in stride(from: -170.0, through: 170.0, by: 30.0) {
            for x in [-24.0, 0.0, 24.0] as [Float] {
                let pos = SCNVector3(x + 3, 3, Float(z))
                let kind = kinds[ki % kinds.count]
                ki += 1
                closets.append(ClosetCache(position: pos, kind: kind, isOpened: false))
                blocks.append(Block(
                    type: .closetCrate,
                    position: pos,
                    health: 1.0, maxHealth: 1.0,
                    isDestroyed: false, isOccupied: true,
                    lightLevel: 0.2, metadata: ["closet": kind.rawValue]
                ))
            }
        }
    }

    /// Opens a closet cache: snacks restore hunger/thirst, tools grant gear,
    /// treasure pays gold + gems, fakes are cobwebs and a laugh.
    func openCloset(at position: SCNVector3) {
        guard let ci = closets.firstIndex(where: {
            !$0.isOpened && calculateDistance($0.position, position) < 2.0
        }) else { return }
        closets[ci].isOpened = true
        if let bi = blocks.firstIndex(where: {
            !$0.isDestroyed && $0.type == .closetCrate &&
            calculateDistance($0.position, position) < 2.0
        }) {
            lastChangedPos = blocks[bi].position
            blocks[bi].isDestroyed = true
        }
        let kind = closets[ci].kind
        switch kind {
        case .snacks:
            player.hunger = player.maxHunger
            player.thirst = player.maxThirst
            player.stamina = player.maxStamina
            let bonus = Int.random(in: 10...30)
            player.gold += bonus
            addNotification("\(kind.emoji) Snack closet! Fully fed +\(bonus) gold!")
        case .tools:
            let drops: [BlockType] = [.abandonedPickaxe, .ironOre, .goldOre, .torch]
            let drop = drops.randomElement()!
            player.inventory.append(MazeInventoryItem(
                name: drop.rawValue, type: .tool, quantity: 1, maxQuantity: 1,
                description: "Pulled from a closet cache",
                icon: drop.emoji, value: Int.random(in: 15...40), rarity: .uncommon
            ))
            addNotification("\(kind.emoji) Tool closet! Found \(drop.rawValue)!")
        case .treasure:
            let haul = Int.random(in: 60...150)
            player.gold += haul
            player.experience += haul / 2
            addNotification("\(kind.emoji) Treasure closet! +\(haul) gold!")
            checkLevelUp()
        case .fake:
            player.experience += 5
            addNotification("\(kind.emoji) Fake closet… just cobwebs! (+5 XP for checking)")
        }
        createParticles(at: position, count: 16, emoji: kind.emoji)
        triggerHaptic(.medium)
    }

    /// The mine grows as you explore: stepping into a fresh 24-unit chunk
    /// stamps a new fork, and sometimes a cave, closet or boxy friend.
    func expandFrontierIfNeeded() {
        let key = "\(Int(player.position.x / 24)),\(Int(player.position.z / 24))"
        guard !frontierKeys.contains(key) else { return }
        frontierKeys.insert(key)
        guard tunnels.count < maxFrontierTunnels else { return }
        let styles: [ForkStyle] = ForkStyle.allCases
        let style = styles[abs(key.hashValue) % styles.count]
        let fx = player.position.x + Float.random(in: 12...30)
        let fz = player.position.z + Float.random(in: 12...30)
        let before = tunnels.count
        buildFork(atX: fx, z: fz, style: style)
        for t in tunnels[before...] { placeShell(for: t) }
        let roll = Int.random(in: 1...100)
        if roll <= 25 && crystalCaves.count < maxCaves {
            let cave = CrystalCave(
                position: SCNVector3(fx + 6, 2, fz),
                shape: CrystalShape.allCases.randomElement()!,
                radius: Int.random(in: 3...5),
                lootValue: Int.random(in: 60...160),
                isHarvested: false
            )
            crystalCaves.append(cave)
            buildCaveBlocks(cave)
            buildCaveTreasure(cave)
            addNotification("\(cave.shape.emoji) The mine groans… a new crystal cave opened nearby!")
        } else if roll <= 45 && closets.count < maxClosets {
            let kinds: [ClosetKind] = [.snacks, .tools, .treasure, .fake]
            let pos = SCNVector3(fx - 4, 3, fz + 4)
            let kind = kinds.randomElement()!
            closets.append(ClosetCache(position: pos, kind: kind, isOpened: false))
            blocks.append(Block(
                type: .closetCrate, position: pos,
                health: 1.0, maxHealth: 1.0,
                isDestroyed: false, isOccupied: true,
                lightLevel: 0.2, metadata: ["closet": kind.rawValue]
            ))
        } else if roll <= 55 {
            spawnBoxyAnimal(near: SCNVector3(fx, 2, fz))
        }
    }

    /// Lightweight shell for frontier tunnels (floor + corner pillars).
    private func placeShell(for tunnel: Tunnel) {
        let x = Int(tunnel.position.x), y = Int(tunnel.position.y), z = Int(tunnel.position.z)
        for dx in -1...1 {
            for dz in -1...1 {
                blocks.append(Block(
                    type: .stone, position: SCNVector3(Float(x + dx), Float(y - 1), Float(z + dz)),
                    health: 1.0, maxHealth: 1.0,
                    isDestroyed: false, isOccupied: false,
                    lightLevel: 0, metadata: [:]
                ))
            }
        }
        for (dx, dz) in [(-1, -1), (1, -1), (-1, 1), (1, 1)] {
            for dy in 0...2 {
                blocks.append(Block(
                    type: .tunnelWall, position: SCNVector3(Float(x + dx), Float(y + dy), Float(z + dz)),
                    health: 2.0, maxHealth: 2.0,
                    isDestroyed: false, isOccupied: false,
                    lightLevel: 0, metadata: [:]
                ))
            }
        }
    }

    /// Rare boxy animal encounter: friendly, never hunts, drops gems.
    func spawnBoxyAnimal(near pos: SCNVector3) {
        let boxyAlive = monsters.filter { $0.isAlive && $0.type.isBoxy }.count
        guard boxyAlive < 3 else { return }
        let pool: [MonsterType] = [.boxyMole, .boxyBat, .boxyAxolotl, .boxyFox, .boxyMole, .boxyBat, .goldenWisp]
        let type = pool.randomElement()!
        let at = SCNVector3(
            pos.x + Float.random(in: -6...6), 2,
            pos.z + Float.random(in: -6...6)
        )
        monsters.append(Monster(
            type: type,
            name: "\(type.displayName) (friend)",
            health: Float(type.health), maxHealth: Float(type.health),
            damage: 0, speed: type.speed,
            position: at, rotation: SCNVector3(0, Float.random(in: 0...6.28), 0),
            isAlive: true, isAggressive: false, isBoss: false,
            dropItems: [.diamondGem, .rubyGem, .sapphireGem, .emeraldGem],
            experience: type == .goldenWisp ? 300 : 150,
            attackCooldown: 99, currentCooldown: 0,
            detectionRange: 0, // friends never chase
            state: .wandering
        ))
        addNotification("📦 Rare encounter: \(type.displayName)! It seems friendly…")
        createParticles(at: at, count: 24, emoji: "📦")
        triggerHaptic(.medium)
    }

    private func maybeSpawnBoxyAnimal() {
        if boxyCooldown > 0 { boxyCooldown -= 1; return }
        // ~0.5% per tick while roaming: genuinely rare.
        if Int.random(in: 1...200) == 1 {
            boxyCooldown = 120
            spawnBoxyAnimal(near: player.position)
        }
    }

    func generateRooms() {
        // Spread rooms across the whole maze.
        let rstep = max(1, tunnels.count / 270)
        for (ri, tunnel) in tunnels.enumerated() where ri % rstep == 0 {
            // 15% chance of room (capped count for performance)
            if Float.random(in: 0...1) < 0.15 {
                let roomTypes: [RoomType] = [.empty, .treasure, .monster, .puzzle, .exit, .boss, .chest, .library, .forge, .laboratory]
                let roomType = roomTypes.randomElement()!

                let room = Room(
                    position: SCNVector3(
                        tunnel.position.x + Float.random(in: -2...2),
                        tunnel.position.y + Float.random(in: -1...1),
                        tunnel.position.z + Float.random(in: -2...2)
                    ),
                    size: CGSize(width: CGFloat.random(in: 2...4), height: CGFloat.random(in: 2...3)),
                    type: roomType,
                    isExplored: false,
                    hasTreasure: roomType == .treasure || roomType == .chest,
                    hasMonster: roomType == .monster || roomType == .boss,
                    lightLevel: roomType == .treasure ? 0.5 : 0.1
                )
                rooms.append(room)

                // Add special room features
                switch roomType {
                case .treasure:
                    // Add treasure chest
                    let treasure = Treasure(
                        name: "Ancient Treasure",
                        type: .gem,
                        rarity: .rare,
                        value: Int.random(in: 50...200),
                        position: room.position,
                        isFound: false,
                        icon: "🎁"
                    )
                    treasures.append(treasure)

                case .boss:
                    // Spawn boss monster
                    let bossMonster = createBossMonster(at: room.position)
                    monsters.append(bossMonster)

                case .library:
                    // Add books and scrolls
                    for _ in 0..<Int.random(in: 3...10) {
                        let book = Treasure(
                            name: ["Ancient Scroll", "Dusty Tome", "Spell Book", "History of the Depths"].randomElement()!,
                            type: .scroll,
                            rarity: .uncommon,
                            value: Int.random(in: 20...80),
                            position: SCNVector3(
                                room.position.x + Float.random(in: -1...1),
                                room.position.y + 1,
                                room.position.z + Float.random(in: -1...1)
                            ),
                            isFound: false,
                            icon: "📖"
                        )
                        treasures.append(book)
                    }

                case .forge:
                    // Add tools and weapons
                    for _ in 0..<Int.random(in: 2...5) {
                        let tool = Treasure(
                            name: ["Iron Pickaxe", "Steel Sword", "Diamond Axe", "Ancient Hammer"].randomElement()!,
                            type: .tool,
                            rarity: .uncommon,
                            value: Int.random(in: 30...100),
                            position: SCNVector3(
                                room.position.x + Float.random(in: -1...1),
                                room.position.y + 1,
                                room.position.z + Float.random(in: -1...1)
                            ),
                            isFound: false,
                            icon: "🔧"
                        )
                        treasures.append(tool)
                    }

                default:
                    break
                }
            }
        }
    }

    func placeTunnelBlocks(from: Int, to: Int) {
        // Tunnel floors + corner pillars (lightweight shell for performance).
        for tunnel in tunnels[from..<to] {
            let x = Int(tunnel.position.x)
            let y = Int(tunnel.position.y)
            let z = Int(tunnel.position.z)

            // Floor
            for dx in -1...1 {
                for dz in -1...1 {
                    let block = Block(
                        type: .stone,
                        position: SCNVector3(Float(x + dx), Float(y - 1), Float(z + dz)),
                        health: 1.0,
                        maxHealth: 1.0,
                        isDestroyed: false,
                        isOccupied: false,
                        lightLevel: 0,
                        metadata: [:]
                    )
                    blocks.append(block)
                }
            }

            // Corner pillars
            for (dx, dz) in [(-1, -1), (1, -1), (-1, 1), (1, 1)] {
                for dy in 0...2 {
                    let block = Block(
                        type: .tunnelWall,
                        position: SCNVector3(Float(x + dx), Float(y + dy), Float(z + dz)),
                        health: 2.0,
                        maxHealth: 2.0,
                        isDestroyed: false,
                        isOccupied: false,
                        lightLevel: 0,
                        metadata: [:]
                    )
                    blocks.append(block)
                }
            }
        }
    }

    func placeRoomBlocks() {
        // Room slabs (compact 5x5 floor + corner posts).
        for room in rooms.prefix(10) {
            let x = Int(room.position.x)
            let y = Int(room.position.y)
            let z = Int(room.position.z)

            // Floor
            for dx in -2...2 {
                for dz in -2...2 {
                    let block = Block(
                        type: .stoneBricks,
                        position: SCNVector3(Float(x + dx), Float(y - 1), Float(z + dz)),
                        health: 2.0,
                        maxHealth: 2.0,
                        isDestroyed: false,
                        isOccupied: false,
                        lightLevel: 0,
                        metadata: [:]
                    )
                    blocks.append(block)
                }
            }

            // Corner posts
            for (dx, dz) in [(-2, -2), (2, -2), (-2, 2), (2, 2)] {
                for dy in 0...2 {
                    let block = Block(
                        type: .stoneBricks,
                        position: SCNVector3(Float(x + dx), Float(y + dy), Float(z + dz)),
                        health: 2.0,
                        maxHealth: 2.0,
                        isDestroyed: false,
                        isOccupied: false,
                        lightLevel: 0,
                        metadata: [:]
                    )
                    blocks.append(block)
                }
            }
        }
    }

    func placeLights() {
        // Place torches in tunnels (emissive only — no per-torch lights).
        let lstep = max(1, tunnels.count / 100)
        for (li, tunnel) in tunnels.enumerated() where li % lstep == 0 {
            if Float.random(in: 0...1) < 0.3 {
                let torch = Block(
                    type: .torch,
                    position: SCNVector3(
                        tunnel.position.x,
                        tunnel.position.y + 2,
                        tunnel.position.z
                    ),
                    health: 0.5,
                    maxHealth: 0.5,
                    isDestroyed: false,
                    isOccupied: false,
                    lightLevel: 1.0,
                    metadata: ["isLightSource": true]
                )
                blocks.append(torch)
            }
        }

        // Place lanterns in rooms
        for room in rooms {
            if room.type == .treasure || room.type == .boss {
                let lantern = Block(
                    type: .lantern,
                    position: SCNVector3(
                        room.position.x,
                        room.position.y + 3,
                        room.position.z
                    ),
                    health: 0.5,
                    maxHealth: 0.5,
                    isDestroyed: false,
                    isOccupied: false,
                    lightLevel: 1.5,
                    metadata: ["isLightSource": true]
                )
                blocks.append(lantern)
            }
        }
    }

    func generateMonsters() {
        // Generate monsters in tunnels, spread out (capped for performance)
        let mstep = max(1, tunnels.count / 120)
        for (mi, tunnel) in tunnels.enumerated() where mi % mstep == 0 {
            let monsterCount = min(tunnel.monsterCount, 1)
            for _ in 0..<monsterCount {
                let monster = createRandomMonster(at: SCNVector3(
                    tunnel.position.x + Float.random(in: -1...1),
                    tunnel.position.y + 1,
                    tunnel.position.z + Float.random(in: -1...1)
                ))
                monsters.append(monster)
            }
        }

        // Generate monsters in rooms
        for room in rooms where room.hasMonster {
            let monster = createRandomMonster(at: SCNVector3(
                room.position.x + Float.random(in: -2...2),
                room.position.y + 1,
                room.position.z + Float.random(in: -2...2)
            ))
            monsters.append(monster)
        }
    }

    func createRandomMonster(at position: SCNVector3) -> Monster {
        let types: [MonsterType] = [.slime, .zombie, .skeleton, .spider, .creeper, .enderman, .witch]
        let type = types.randomElement()!
        let isBoss = Float.random(in: 0...1) < 0.02

        return Monster(
            type: type,
            name: "\(type.displayName) \(monsters.count + 1)",
            health: Float(type.health),
            maxHealth: Float(type.health),
            damage: Float(type.damage),
            speed: type.speed,
            position: position,
            rotation: SCNVector3(0, Float.random(in: 0...6.28), 0),
            isAlive: true,
            isAggressive: Bool.random(),
            isBoss: isBoss,
            dropItems: generateDropItems(),
            experience: Int.random(in: 5...20),
            attackCooldown: Float.random(in: 1...3),
            currentCooldown: 0,
            detectionRange: isBoss ? 15 : Float.random(in: 5...10),
            state: .idle
        )
    }

    func createBossMonster(at position: SCNVector3) -> Monster {
        let bossTypes: [MonsterType] = [.elderGuardian, .wither, .enderDragon, .voidLord, .shadowKing]
        let type = bossTypes.randomElement()!

        return Monster(
            type: type,
            name: "Boss: \(type.displayName)",
            health: 500,
            maxHealth: 500,
            damage: 40,
            speed: 1.5,
            position: position,
            rotation: SCNVector3(0, 0, 0),
            isAlive: true,
            isAggressive: true,
            isBoss: true,
            dropItems: [.diamondGem, .rubyGem, .sapphireGem, .emeraldGem],
            experience: 200,
            attackCooldown: 1,
            currentCooldown: 0,
            detectionRange: 20,
            state: .idle
        )
    }

    func generateDropItems() -> [BlockType] {
        let drops: [BlockType] = [.coalOre, .ironOre, .goldOre, .diamondOre, .rubyGem, .sapphireGem]
        var result: [BlockType] = []
        let count = Int.random(in: 1...3)
        for _ in 0..<count {
            result.append(drops.randomElement()!)
        }
        return result
    }

    func generateTreasures() {
        // Place treasures in rooms
        for room in rooms where room.hasTreasure {
            let treasureTypes: [TreasureType] = [.gem, .coin, .artifact, .weapon, .armor, .tool, .potion]
            let type = treasureTypes.randomElement()!
            let rarity: [MonsterRarity] = [.common, .uncommon, .rare, .legendary]

            let treasure = Treasure(
                name: generateTreasureName(type: type),
                type: type,
                rarity: rarity.randomElement()!,
                value: Int.random(in: 10...100),
                position: SCNVector3(
                    room.position.x + Float.random(in: -1...1),
                    room.position.y + 1,
                    room.position.z + Float.random(in: -1...1)
                ),
                isFound: false,
                icon: treasureIcon(type: type)
            )
            treasures.append(treasure)
        }
    }

    func generateTreasureName(type: TreasureType) -> String {
        let prefixes = ["Ancient", "Cursed", "Enchanted", "Mysterious", "Golden", "Crystal", "Shadow", "Eternal"]
        let suffix = ["of the Depths", "of Shadows", "of Light", "of Power", "of Kings", "of Souls"]

        switch type {
        case .gem:
            return ["Ruby", "Sapphire", "Emerald", "Diamond", "Amethyst"].randomElement()! + " Gem"
        case .coin:
            return "Gold Coin"
        case .artifact:
            return prefixes.randomElement()! + " Artifact " + suffix.randomElement()!
        case .weapon:
            return prefixes.randomElement()! + " Sword " + suffix.randomElement()!
        case .armor:
            return prefixes.randomElement()! + " Armor " + suffix.randomElement()!
        case .tool:
            return prefixes.randomElement()! + " Tool " + suffix.randomElement()!
        case .potion:
            return ["Health", "Mana", "Strength", "Speed", "Invisibility"].randomElement()! + " Potion"
        default:
            return "Unknown Treasure"
        }
    }

    func treasureIcon(type: TreasureType) -> String {
        switch type {
        case .gem: return "💎"
        case .coin: return "💰"
        case .artifact: return "🏛️"
        case .weapon: return "⚔️"
        case .armor: return "🛡️"
        case .tool: return "🔧"
        case .potion: return "🧪"
        case .scroll: return "📜"
        case .key: return "🔑"
        case .map: return "🗺️"
        }
    }

    func placeAbandonedItems() {
        // Place abandoned pickaxes and items across the endless maze
        for _ in 0..<40 {
            let x = Float.random(in: -40...200)
            let z = Float.random(in: -200...200)
            let y = Float.random(in: 0...6)

            let itemTypes: [BlockType] = [.abandonedPickaxe, .abandonedHelmet, .abandonedChestplate, .rustedMetal, .brokenGear, .oldLantern]
            let itemType = itemTypes.randomElement()!

            let item = Block(
                type: itemType,
                position: SCNVector3(x, y, z),
                health: 0.5,
                maxHealth: 0.5,
                isDestroyed: false,
                isOccupied: false,
                lightLevel: 0,
                metadata: ["isAbandoned": true]
            )
            blocks.append(item)
        }
    }

    func generateInitialNotifications() {
        addNotification("🏔️ Welcome to the Tunnel Maze!")
        addNotification("⛏️ Mine blocks to find treasures")
        addNotification("⚔️ Fight monsters to gain experience")
        addNotification("🔦 Explore the endless tunnels")
        addNotification("💎 Find rare gems and artifacts")
        addNotification("🏚️ Discover hidden rooms and secrets")
        addNotification("👾 Beware of the monsters lurking in the dark!")
        addNotification("🗺️ Use your map to navigate the maze")
        addNotification("🔨 Craft tools to mine faster")
        addNotification("⚡ Level up to unlock new abilities")
    }

    // MARK: - Timer Methods

    func startTimers() {
        gameLoopTimer?.invalidate()
        monsterLoopTimer?.invalidate()
        saveTimer?.invalidate()
        gameLoopTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.updateGame()
        }

        monsterLoopTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.updateMonsters()
        }

        saveTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            self?.saveGame()
        }
    }

    // MARK: - Game Update

    func updateGame() {
        guard !isPaused else { return }

        deltaTime = 0.5
        gameTime += deltaTime
        player.distanceTraveled += abs(player.position.x) + abs(player.position.z)

        // Update player stats
        updatePlayerStats()

        // Check for nearby monsters
        checkMonsterProximity()

        // Check for nearby treasures
        checkTreasureProximity()

        // Update particles
        updateParticles()

        // Distant haunted drone: stray wails in the deep.
        if Int.random(in: 1...40) == 1 {
            if Bool.random() { AWSound.shared.wail() } else { AWSound.shared.growl() }
        }

        // Check level up
        checkLevelUp()

        // The mine grows as you roam + rare boxy friends may appear.
        expandFrontierIfNeeded()
        maybeSpawnBoxyAnimal()
    }

    func updatePlayerStats() {
        // God-mode mine: hunger/thirst only slow you, never kill you.
        // Health floor is 1 and regenerates — the player stays in the tunnel.
        if player.isSprinting && !player.isSneaking {
            player.stamina -= 0.5 * deltaTime * 60
            if player.stamina <= 0 {
                player.isSprinting = false
                player.stamina = 0
            }
        } else {
            player.stamina = min(player.maxStamina, player.stamina + 0.2 * deltaTime * 60)
        }

        // Hunger
        if gameTime.truncatingRemainder(dividingBy: 60) == 0 {
            player.hunger = max(5, player.hunger - 0.3)
        }

        // Thirst
        if gameTime.truncatingRemainder(dividingBy: 45) == 0 {
            player.thirst = max(5, player.thirst - 0.2)
        }

        // Steady regen + hard floor: cannot die down here.
        player.isAlive = true
        isGameOver = false
        if player.health < player.maxHealth {
            player.health = min(player.maxHealth, max(1, player.health + 0.5))
        }
        if player.health <= 0 { player.health = 1 }
    }

    func updateMonsters() {
        for index in monsters.indices {
            var monster = monsters[index]
            if !monster.isAlive { continue }

            // Update cooldowns
            if monster.currentCooldown > 0 {
                monster.currentCooldown -= 0.5
            }

            let distanceToPlayer = calculateDistance(monster.position, player.position)

            // AI State Machine
            switch monster.state {
            case .idle:
                if distanceToPlayer < monster.detectionRange {
                    monster.state = .chasing
                    monster.isAggressive = true
                    addNotification("⚔️ \(monster.name) is chasing you!")
                } else if Float.random(in: 0...1) < 0.01 {
                    monster.state = .wandering
                }

            case .wandering:
                if distanceToPlayer < monster.detectionRange {
                    monster.state = .chasing
                    monster.isAggressive = true
                } else if Float.random(in: 0...1) < 0.02 {
                    // Move to random position (endless-maze bounds)
                    monster.position = SCNVector3(
                        Float.random(in: -40...200),
                        Float.random(in: 0...8),
                        Float.random(in: -200...200)
                    )
                    monster.state = .idle
                }

            case .chasing:
                if distanceToPlayer < 2 && monster.currentCooldown <= 0 {
                    monster.state = .attacking
                } else if distanceToPlayer > monster.detectionRange * 1.5 {
                    monster.state = .idle
                    monster.isAggressive = false
                } else {
                    // Move towards player
                    let direction = SCNVector3(
                        player.position.x - monster.position.x,
                        0,
                        player.position.z - monster.position.z
                    )
                    let normalized = normalizeVector(direction)
                    monster.position.x += normalized.x * monster.speed * 0.1
                    monster.position.z += normalized.z * monster.speed * 0.1
                }

            case .attacking:
                if monster.currentCooldown <= 0 {
                    // Non-lethal mine hit: chip damage, floor at 1 HP, never die.
                    if player.health > 1 {
                        let chip = min(monster.damage, max(0, player.health - 1))
                        player.health -= chip
                    }
                    player.isAlive = true
                    monster.currentCooldown = monster.attackCooldown
                    addNotification("🛡️ \(monster.name) hit you! Protected — \(Int(player.health)) HP left")
                    triggerHaptic(.heavy)
                    createDamageEffect()
                }
                monster.state = .chasing

            case .fleeing:
                // Flee from player
                let fleeDirection = SCNVector3(
                    monster.position.x - player.position.x,
                    0,
                    monster.position.z - player.position.z
                )
                let normalized = normalizeVector(fleeDirection)
                monster.position.x += normalized.x * monster.speed * 0.2
                monster.position.z += normalized.z * monster.speed * 0.2

                if distanceToPlayer > 20 {
                    monster.state = .idle
                }

            default:
                break
            }

            monsters[index] = monster
        }
    }

    func checkMonsterProximity() {
        for monster in monsters where monster.isAlive {
            let distance = calculateDistance(monster.position, player.position)
            if distance < 3 {
                // Player is very close to a monster
                if Float.random(in: 0...1) < 0.001 {
                    addNotification("👾 You feel something watching you...")
                    triggerHaptic(.light)
                }
            }
        }
    }

    func checkTreasureProximity() {
        for treasure in treasures where !treasure.isFound {
            let distance = calculateDistance(treasure.position, player.position)
            if distance < 1.5 {
                // Found treasure!
                if let index = treasures.firstIndex(where: { $0.id == treasure.id }) {
                    treasures[index].isFound = true
                    player.treasureFound += 1
                    player.gold += treasure.value
                    player.experience += treasure.value / 2

                    addNotification("💎 Found \(treasure.name)! +\(treasure.value) gold!")
                    triggerHaptic(.medium)
                    createTreasureEffect(at: treasure.position)

                    // Add to inventory
                    let item = MazeInventoryItem(
                        name: treasure.name,
                        type: .treasure,
                        quantity: 1,
                        maxQuantity: 99,
                        description: "A valuable \(treasure.name)",
                        icon: treasure.icon,
                        value: treasure.value,
                        rarity: treasure.rarity
                    )
                    player.inventory.append(item)
                }
            }
        }
    }

    func createTreasureEffect(at position: SCNVector3) {
        createParticles(at: position, count: 50, emoji: "💎")
        createParticles(at: position, count: 30, emoji: "✨")
        triggerHaptic(.medium)
    }

    func createDamageEffect() {
        createParticles(at: player.position, count: 20, emoji: "💥")
        triggerHaptic(.heavy)
    }

    // MARK: - Mining Functions

    func mineBlock(at position: SCNVector3) {
        // Closet crates open by hand — no pickaxe needed.
        if blocks.contains(where: {
            !$0.isDestroyed && $0.type == .closetCrate &&
            abs($0.position.x - position.x) < 1.5 &&
            abs($0.position.y - position.y) < 1.5 &&
            abs($0.position.z - position.z) < 1.5
        }) {
            openCloset(at: position)
            return
        }

        guard player.equippedTool != nil else {
            // Bare hands still work, slowly.
            return
        }

        guard let blockIndex = blocks.firstIndex(where: {
            abs($0.position.x - position.x) < 0.5 &&
            abs($0.position.y - position.y) < 0.5 &&
            abs($0.position.z - position.z) < 0.5 &&
            !$0.isDestroyed
        }) else { return }

        lastChangedPos = blocks[blockIndex].position
        let block = blocks[blockIndex]
        let tool = player.equippedTool!
        let miningTime = block.type.hardness / max(tool.miningSpeed, 0.1)

        // Apply enchantments
        var efficiencyBonus: Float = 1.0
        for enchant in tool.enchants {
            switch enchant {
            case .efficiency:
                efficiencyBonus *= 1.5
            case .unbreaking:
                // Reduce durability loss
                break
            default:
                break
            }
        }

        let effectiveMiningTime = miningTime / efficiencyBonus

        // Reduce block health
        var updatedBlock = block
        updatedBlock.health -= effectiveMiningTime

        if updatedBlock.health <= 0 {
            // Block destroyed
            updatedBlock.isDestroyed = true
            blocks[blockIndex] = updatedBlock

            // Reward player
            player.experience += Int(block.type.hardness * 10)

            // Add to inventory
            let item = MazeInventoryItem(
                name: block.type.rawValue,
                type: .block,
                quantity: 1,
                maxQuantity: 99,
                description: "A \(block.type.rawValue) block",
                icon: block.type.emoji,
                value: 1,
                rarity: .common
            )
            player.inventory.append(item)

            // Check for ore drops
            if block.type.isOre {
                let dropCount = Int.random(in: 1...3)
                for _ in 0..<dropCount {
                    let dropItem = MazeInventoryItem(
                        name: "Raw \(block.type.rawValue)",
                        type: .material,
                        quantity: 1,
                        maxQuantity: 99,
                        description: "Raw \(block.type.rawValue) ore",
                        icon: block.type.emoji,
                        value: Int.random(in: 5...20),
                        rarity: .uncommon
                    )
                    player.inventory.append(dropItem)
                }
                addNotification("💎 Mined \(dropCount)x \(block.type.rawValue)!")
                createParticles(at: position, count: 20, emoji: "💎")
            } else if block.type.isGem {
                // Cave crystals burst into gem loot.
                let gems: [BlockType] = [.diamondGem, .rubyGem, .sapphireGem, .emeraldGem, .amethystGem]
                let gem = gems.randomElement()!
                let haul = Int.random(in: 2...4)
                player.gold += haul * 8
                player.experience += haul * 10
                player.inventory.append(MazeInventoryItem(
                    name: gem.rawValue, type: .material, quantity: haul, maxQuantity: 99,
                    description: "Knocked loose from a crystal cave",
                    icon: gem.emoji, value: haul * 8, rarity: .rare
                ))
                if let ci = crystalCaves.firstIndex(where: {
                    calculateDistance(SCNVector3($0.position.x, 0, $0.position.z),
                                      SCNVector3(position.x, 0, position.z)) < Float($0.radius + 2)
                }) {
                    var cave = crystalCaves[ci]
                    cave.lootValue = max(0, cave.lootValue - haul * 5)
                    if cave.lootValue == 0 { cave.isHarvested = true }
                    crystalCaves[ci] = cave
                }
                addNotification("\(block.type.emoji) Crystal shattered! +\(haul)x \(gem.rawValue)!")
                createParticles(at: position, count: 24, emoji: block.type.emoji)
                checkLevelUp()
            } else {
                createParticles(at: position, count: 10, emoji: "⬜")
            }

            // Check for abandoned items
            if block.type == .abandonedPickaxe || block.type == .abandonedHelmet {
                let item = MazeInventoryItem(
                    name: block.type.rawValue,
                    type: .tool,
                    quantity: 1,
                    maxQuantity: 1,
                    description: "An abandoned \(block.type.rawValue)",
                    icon: block.type.emoji,
                    value: Int.random(in: 10...30),
                    rarity: .uncommon
                )
                player.inventory.append(item)
                addNotification("🔧 Found an abandoned \(block.type.rawValue)!")
            }

            checkLevelUp()
        } else {
            blocks[blockIndex] = updatedBlock
        }
    }

    // MARK: - Combat Functions

    func attackMonster(at position: SCNVector3) {
        guard let weapon = player.equippedWeapon else {
            addNotification("⚔️ Punching with bare hands!")
            punchMonster(at: position)
            return
        }

        guard let monsterIndex = monsters.firstIndex(where: {
            calculateDistance($0.position, position) < 2.0 && $0.isAlive
        }) else { return }

        var monster = monsters[monsterIndex]
        var damage = weapon.damage

        // Apply enchantments
        for enchant in weapon.enchants {
            switch enchant {
            case .sharpness:
                damage *= 1.3
            case .smite:
                damage *= 1.5
            case .fireAspect:
                createParticles(at: position, count: 10, emoji: "🔥")
            default:
                break
            }
        }

        monster.health -= damage
        createParticles(at: position, count: 15, emoji: "💥")
        triggerHaptic(.medium)

        if monster.health <= 0 {
            // Monster defeated
            monster.isAlive = false
            player.killCount += 1
            player.experience += monster.experience
            player.gold += Int.random(in: 5...20)

            // Drop items
            for drop in monster.dropItems {
                let item = MazeInventoryItem(
                    name: drop.rawValue,
                    type: .material,
                    quantity: Int.random(in: 1...3),
                    maxQuantity: 99,
                    description: "Dropped by \(monster.name)",
                    icon: drop.emoji,
                    value: Int.random(in: 1...10),
                    rarity: .common
                )
                player.inventory.append(item)
            }

            addNotification("⚔️ Defeated \(monster.name)! +\(monster.experience) experience")
            createParticles(at: position, count: 30, emoji: "⭐")
            triggerHaptic(.medium)
            checkLevelUp()
        } else {
            monsters[monsterIndex] = monster
            addNotification("💢 \(monster.name) took \(Int(damage)) damage! Health: \(Int(monster.health))/\(Int(monster.maxHealth))")
        }
    }

    func punchMonster(at position: SCNVector3) {
        guard let monsterIndex = monsters.firstIndex(where: {
            calculateDistance($0.position, position) < 2.0 && $0.isAlive
        }) else { return }
        var monster = monsters[monsterIndex]
        monster.health -= 5
        createParticles(at: position, count: 8, emoji: "💥")
        triggerHaptic(.light)
        if monster.health <= 0 {
            monster.isAlive = false
            player.killCount += 1
            player.experience += monster.experience
            player.gold += Int.random(in: 5...20)
            addNotification("⚔️ Defeated \(monster.name)! +\(monster.experience) experience")
            checkLevelUp()
        } else {
            monsters[monsterIndex] = monster
        }
    }

    // MARK: - Exploration Functions

    func exploreTunnel(at position: SCNVector3) {
        for tunnelIndex in tunnels.indices {
            let distance = calculateDistance(tunnels[tunnelIndex].position, position)
            if distance < 2 {
                if !tunnels[tunnelIndex].isExplored {
                    tunnels[tunnelIndex].isExplored = true
                    addNotification("🗺️ Explored tunnel section")
                    player.experience += 5

                    // Chance to find treasure
                    if Float.random(in: 0...1) < 0.1 {
                        let treasure = Treasure(
                            name: "Hidden Cache",
                            type: .coin,
                            rarity: .uncommon,
                            value: Int.random(in: 10...30),
                            position: SCNVector3(
                                tunnels[tunnelIndex].position.x,
                                tunnels[tunnelIndex].position.y + 1,
                                tunnels[tunnelIndex].position.z
                            ),
                            isFound: false,
                            icon: "💰"
                        )
                        treasures.append(treasure)
                        addNotification("💰 Found a hidden cache!")
                    }
                }
                return
            }
        }
    }

    // MARK: - Level System

    func checkLevelUp() {
        let requiredExp = player.level * 100 + player.level * player.level * 10
        while player.experience >= requiredExp {
            player.level += 1
            player.experience -= requiredExp
            player.maxHealth += 10
            player.health = player.maxHealth
            player.maxStamina += 5
            player.stamina = player.maxStamina

            addNotification("⬆️ Level up! Now level \(player.level)!")
            createParticles(at: player.position, count: 30, emoji: "⬆️")
            triggerHaptic(.medium)
        }
    }

    // MARK: - Helper Functions

    func calculateDistance(_ pos1: SCNVector3, _ pos2: SCNVector3) -> Float {
        let dx = pos1.x - pos2.x
        let dy = pos1.y - pos2.y
        let dz = pos1.z - pos2.z
        return sqrt(dx * dx + dy * dy + dz * dz)
    }

    /// Joystick driving: dx = right+, dy = down+. Camera-relative, clamped
    /// to the maze bounds. Called ~20x/sec while the stick is held.
    func movePlayer(dx: Float, dy: Float) {
        // God-mode mine: never gate on alive/game-over; revive on the spot.
        if mineGodMode { player.isAlive = true; isGameOver = false }
        guard !isPaused else { return }
        let yaw = player.rotation.y
        let fx = -sin(yaw), fz = -cos(yaw)
        let rx = cos(yaw), rz = -sin(yaw)
        let fwd = -dy, strafe = dx
        let speed: Float = player.isSprinting ? 0.4 : 0.2
        player.position.x = min(mazeBound, max(-60, player.position.x + (fx * fwd + rx * strafe) * speed))
        player.position.z = min(mazeBound, max(-210, player.position.z + (fz * fwd + rz * strafe) * speed))
        player.isMoving = (abs(dx) + abs(dy)) > 0.15
        expandFrontierIfNeeded()
    }

    func normalizeVector(_ vector: SCNVector3) -> SCNVector3 {
        let length = sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z)
        guard length > 0 else { return SCNVector3(0, 0, 0) }
        return SCNVector3(vector.x / length, vector.y / length, vector.z / length)
    }

    func createParticles(at position: SCNVector3, count: Int, emoji: String) {
        // Particle creation handled by view
        for _ in 0..<count {
            let particle = Particle(
                position: SCNVector3(
                    position.x + Float.random(in: -1...1),
                    position.y + Float.random(in: -1...1),
                    position.z + Float.random(in: -1...1)
                ),
                velocity: SCNVector3(
                    Float.random(in: -2...2),
                    Float.random(in: -2...2),
                    Float.random(in: -2...2)
                ),
                color: [.yellow, .cyan, .green, .purple].randomElement()!,
                size: Float.random(in: 0.1...0.5),
                life: Float.random(in: 0.5...2.0),
                maxLife: 2.0,
                type: .dust,
                texture: "",
                isEmitting: true
            )
            particles.append(particle)
        }
        if particles.count > 300 {
            particles.removeFirst(particles.count - 300)
        }
    }

    func updateParticles() {
        for index in particles.indices.reversed() {
            particles[index].position.x += particles[index].velocity.x * 0.02
            particles[index].position.y += particles[index].velocity.y * 0.02
            particles[index].position.z += particles[index].velocity.z * 0.02
            particles[index].life -= 0.01
            particles[index].size *= 0.995

            if particles[index].life <= 0 || particles[index].size < 0.01 {
                particles.remove(at: index)
            }
        }
    }

    func addNotification(_ message: String) {
        notifications.insert(message, at: 0)
        if notifications.count > 100 {
            notifications.removeLast()
        }
    }

    func triggerHaptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }

    func gameOver() {
        // Disabled in the endless mine: hits never end the run and the
        // player is never yanked back to the entrance.
        player.isAlive = true
        isGameOver = false
        if player.health <= 0 { player.health = 1 }
        addNotification("🛡️ God-mode: the depths can't claim you. Keep digging!")
    }

    func resetGame() {
        // Soft reset: revive in place — keep position, loot and progress.
        player.health = player.maxHealth
        player.hunger = player.maxHunger
        player.thirst = player.maxThirst
        player.stamina = player.maxStamina
        player.isAlive = true
        // NOTE: position / inventory / kills / treasures intentionally kept.

        particles.removeAll()

        isGameOver = false
        isVictory = false

        addNotification("🛡️ Revived right where you stand — no trip back to the entrance.")
    }

    func saveGame() {
        // Save game state
        UserDefaults.standard.set(player.level, forKey: "mazeLevel")
        UserDefaults.standard.set(player.experience, forKey: "mazeExperience")
        UserDefaults.standard.set(player.gold, forKey: "mazeGold")
        UserDefaults.standard.set(player.killCount, forKey: "mazeKills")
        UserDefaults.standard.set(player.treasureFound, forKey: "mazeTreasures")
        addNotification("💾 Game Saved")
    }

    func loadGame() {
        player.level = UserDefaults.standard.integer(forKey: "mazeLevel")
        player.experience = UserDefaults.standard.integer(forKey: "mazeExperience")
        player.gold = UserDefaults.standard.integer(forKey: "mazeGold")
        player.killCount = UserDefaults.standard.integer(forKey: "mazeKills")
        player.treasureFound = UserDefaults.standard.integer(forKey: "mazeTreasures")
        addNotification("📂 Game Loaded")
    }
}

// ============================================================
// MARK: - 3. SCENE KIT VIEW (3000+ Lines)
// ============================================================

struct TunnelMazeSceneView: UIViewRepresentable {
    @ObservedObject var manager: TunnelMazeManager

    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        scnView.backgroundColor = UIColor(red: 0.02, green: 0.01, blue: 0.03, alpha: 1.0)
        scnView.autoenablesDefaultLighting = false
        scnView.showsStatistics = false
        scnView.delegate = context.coordinator

        // Setup scene
        let scene = SCNScene()
        scnView.scene = scene

        // Setup camera
        setupCamera(in: scene)

        // Setup lighting
        setupLighting(in: scene)

        // Setup environment
        setupEnvironment(in: scene)

        // Setup gestures
        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        scnView.addGestureRecognizer(tapGesture)

        let panGesture = UIPanGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePan(_:)))
        scnView.addGestureRecognizer(panGesture)

        let pinchGesture = UIPinchGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePinch(_:)))
        scnView.addGestureRecognizer(pinchGesture)

        context.coordinator.begin(in: scnView)
        return scnView
    }

    func updateUIView(_ scnView: SCNView, context: Context) {
        guard let scene = scnView.scene else { return }
        context.coordinator.manager = manager
        // Incremental sync: full rebuilds only when counts change.
        context.coordinator.syncBlocks(in: scene)
        context.coordinator.syncMonsters(in: scene)
        context.coordinator.syncParticles(in: scene)
        context.coordinator.syncLight(in: scene)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(manager: manager)
    }

    // MARK: - Scene Setup

    func setupCamera(in scene: SCNScene) {
        let cameraNode = SCNNode()
        cameraNode.name = "camera"
        cameraNode.camera = SCNCamera()
        cameraNode.camera?.fieldOfView = 75
        cameraNode.camera?.zNear = 0.1
        cameraNode.camera?.zFar = 200
        cameraNode.position = SCNVector3(0, 5, 10)
        cameraNode.eulerAngles = SCNVector3(-0.3, 0, 0)
        scene.rootNode.addChildNode(cameraNode)

        manager.scene = scene
    }

    func setupLighting(in scene: SCNScene) {
        // Ambient light
        let ambientLight = SCNLight()
        ambientLight.type = .ambient
        ambientLight.color = UIColor(white: 0.5, alpha: 1.0)
        let ambientNode = SCNNode()
        ambientNode.light = ambientLight
        scene.rootNode.addChildNode(ambientNode)

        // Directional light
        let directionalLight = SCNLight()
        directionalLight.type = .directional
        directionalLight.color = UIColor(white: 0.75, alpha: 1.0)
        directionalLight.shadowColor = UIColor.black
        directionalLight.shadowRadius = 20
        let directionalNode = SCNNode()
        directionalNode.light = directionalLight
        directionalNode.position = SCNVector3(0, 30, 0)
        directionalNode.eulerAngles = SCNVector3(-Float.pi/4, 0, 0)
        scene.rootNode.addChildNode(directionalNode)

        // Player torchlight — one warm light that follows you.
        let torch = SCNNode()
        torch.light = SCNLight()
        torch.light?.type = .omni
        torch.light?.color = UIColor(red: 1, green: 0.85, blue: 0.6, alpha: 1)
        torch.light?.intensity = 1000
        torch.position = SCNVector3(0, 3, 0)
        torch.name = "playerLight"
        scene.rootNode.addChildNode(torch)
    }

    func setupEnvironment(in scene: SCNScene) {
        scene.fogColor = UIColor(red: 0.06, green: 0.04, blue: 0.09, alpha: 1.0)
        scene.fogStartDistance = 14
        scene.fogEndDistance = 50
        scene.fogDensityExponent = 2
    }

    // MARK: - Coordinator

    class Coordinator: NSObject, SCNSceneRendererDelegate {
        var manager: TunnelMazeManager
        private var lastTouchPosition: CGPoint = .zero
        private var lastBlockCount = -1
        private var lastMonsterCount = -1
        private var lastParticleCount = -1
        private var lastCenterX = Int.min
        private var lastCenterZ = Int.min

        init(manager: TunnelMazeManager) {
            self.manager = manager
        }

        func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
            // Camera + motion run on the display link now (smoother).
            _ = time
        }

        private var link: CADisplayLink?
        private var mistNodes: [SCNNode] = []
        private var nodeCache: [String: SCNNode] = [:]

        func begin(in view: SCNView) {
            link?.invalidate()
            guard let scene = view.scene else { return }
            if mistNodes.isEmpty {
                for _ in 0..<10 {
                    let m = SCNNode(geometry: SCNSphere(radius: 1.6))
                    let mm = SCNMaterial()
                    mm.diffuse.contents = UIColor(white: 0.75, alpha: 0.3)
                    mm.transparency = 0.28
                    m.geometry?.materials = [mm]
                    m.scale = SCNVector3(1.7, 0.35, 1.7)
                    m.position = SCNVector3(Float.random(in: -40...40), 0.7, Float.random(in: -40...40))
                    scene.rootNode.addChildNode(m)
                    mistNodes.append(m)
                }
            }
            let l = CADisplayLink(target: self, selector: #selector(step))
            l.add(to: .main, forMode: .common)
            link = l
        }

        deinit { link?.invalidate() }

        @objc func step() {
            guard let scene = manager.scene else { return }
            let dt = Float(link?.duration ?? 0.016)
            // --- player locomotion (joystick + tap-to-walk) ---
            let jx = manager.joyVec.dx, jy = manager.joyVec.dy
            if abs(jx) + abs(jy) > 0.1 {
                manager.moveTarget = nil
                drive(dx: jx, dy: jy, speed: manager.player.isSprinting ? 6 : 4, dt: dt)
                manager.player.isMoving = true
            } else if let t = manager.moveTarget {
                let dx = t.x - manager.player.position.x
                let dz = t.z - manager.player.position.z
                let d = sqrt(dx * dx + dz * dz)
                if d < 0.35 {
                    manager.moveTarget = nil
                    manager.player.isMoving = false
                } else {
                    let yaw = manager.player.rotation.y
                    let fx = -sin(yaw), fz = -cos(yaw)
                    let rx = cos(yaw), rz = -sin(yaw)
                    let mx = dx / d, mz = dz / d
                    drive(dx: mx * rx + mz * rz, dy: -(mx * fx + mz * fz), speed: 4, dt: dt)
                    manager.player.isMoving = true
                }
            } else if manager.player.isMoving {
                manager.player.isMoving = false
            }
            // --- smooth follow camera (zoomable) ---
            if let cam = scene.rootNode.childNode(withName: "camera", recursively: false) {
                let p = manager.player.position
                let k = 1 / manager.camZoom
                let want = SCNVector3(
                    p.x + 3 * sin(manager.player.rotation.y) * k,
                    p.y + 4 * k,
                    p.z + 3 * cos(manager.player.rotation.y) * k)
                let c = min(1, dt * 5)
                cam.position = SCNVector3(
                    cam.position.x + (want.x - cam.position.x) * c,
                    cam.position.y + (want.y - cam.position.y) * c,
                    cam.position.z + (want.z - cam.position.z) * c)
                cam.look(at: SCNVector3(p.x, p.y + 1, p.z))
            }
            // --- monster glide (manager ticks set targets, we ease to them) ---
            for m in manager.monsters where m.isAlive {
                let key = "monster_\(m.id)"
                guard let node = nodeCache[key] ?? scene.rootNode.childNode(withName: key, recursively: true) else { continue }
                nodeCache[key] = node
                let c = min(1, dt * 6)
                node.position = SCNVector3(
                    node.position.x + (m.position.x - node.position.x) * c,
                    m.position.y,
                    node.position.z + (m.position.z - node.position.z) * c)
            }
            // --- mist drift ---
            for mist in mistNodes {
                mist.position.x += dt * 0.5
                if mist.position.x > 45 { mist.position.x = -45 }
            }
        }

        private func drive(dx: Float, dy: Float, speed: Float, dt: Float) {
            let yaw = manager.player.rotation.y
            let fx = -sin(yaw), fz = -cos(yaw)
            let rx = cos(yaw), rz = -sin(yaw)
            manager.player.position.x = min(220, max(-60, manager.player.position.x + (fx * -dy + rx * dx) * speed * dt))
            manager.player.position.z = min(220, max(-210, manager.player.position.z + (fz * -dy + rz * dx) * speed * dt))
            manager.expandFrontierIfNeeded()
        }

        func syncLight(in scene: SCNScene) {
            if let lt = scene.rootNode.childNode(withName: "playerLight", recursively: false) {
                lt.position = SCNVector3(manager.player.position.x, manager.player.position.y + 2, manager.player.position.z)
            }
        }

        func syncBlocks(in scene: SCNScene) {
            // Streaming: only the blocks near the player get 3D nodes, so a
            // 20x maze costs the same as a small one. Rebuilds when the
            // player crosses an 8-unit cell boundary or the count changes.
            let cx = Int(manager.player.position.x / 8)
            let cz = Int(manager.player.position.z / 8)
            if manager.blocks.count != lastBlockCount || cx != lastCenterX || cz != lastCenterZ {
                lastBlockCount = manager.blocks.count
                lastCenterX = cx
                lastCenterZ = cz
                scene.rootNode.childNodes.filter { $0.name == "block" }.forEach { $0.removeFromParentNode() }
                let px = manager.player.position.x, pz = manager.player.position.z
                for block in manager.blocks where !block.isDestroyed {
                    if abs(block.position.x - px) > 14 || abs(block.position.z - pz) > 14 { continue }
                    scene.rootNode.addChildNode(createBlockNode(block: block))
                }
                manager.lastChangedPos = nil
            } else if let pos = manager.lastChangedPos {
                manager.lastChangedPos = nil
                for node in scene.rootNode.childNodes where node.name == "block" {
                    let p = node.position
                    if abs(p.x - pos.x) < 0.01 && abs(p.y - pos.y) < 0.01 && abs(p.z - pos.z) < 0.01 {
                        node.removeFromParentNode()
                        break
                    }
                }
                if let fresh = manager.blocks.first(where: {
                    abs($0.position.x - pos.x) < 0.01 && abs($0.position.y - pos.y) < 0.01 && abs($0.position.z - pos.z) < 0.01 && !$0.isDestroyed
                }) {
                    scene.rootNode.addChildNode(createBlockNode(block: fresh))
                }
            }
        }

        func createBlockNode(block: Block) -> SCNNode {
            // Crystal growths get their own geometry: cubes are square,
            // spikes are pyramids, orbs are spheres.
            let geometry: SCNGeometry
            switch block.type {
            case .crystalCube:
                geometry = SCNBox(width: 0.7, height: 0.7, length: 0.7, chamferRadius: 0.05)
            case .crystalSpike:
                geometry = SCNPyramid(width: 0.7, height: 1.4, length: 0.7)
            case .crystalOrb:
                geometry = SCNSphere(radius: 0.45)
            default:
                geometry = SCNBox(
                    width: 0.95,
                    height: 0.95,
                    length: 0.95,
                    chamferRadius: 0.02
                )
            }

            let material = SCNMaterial()
            material.diffuse.contents = block.type.displayColor()
            material.roughness.contents = 0.8
            material.metalness.contents = block.type.isOre ? 0.3 : 0.1

            // Emissive glow for light sources and gems (no extra lights).
            if block.type.isLightSource {
                material.emission.contents = UIColor.yellow
                material.emission.intensity = 0.5
            }

            if block.type.isGem {
                material.emission.contents = UIColor.cyan
                material.emission.intensity = 0.3
            }

            if block.type == .closetCrate {
                material.emission.contents = UIColor(red: 1.0, green: 0.6, blue: 0.2, alpha: 1)
                material.emission.intensity = 0.25
            }

            geometry.materials = [material]

            let node = SCNNode(geometry: geometry)
            node.position = block.position
            node.name = "block"
            node.rotation = SCNVector4(0, 1, 0, block.rotation)
            node.scale = SCNVector3(block.scale, block.scale, block.scale)

            return node
        }

        func syncMonsters(in scene: SCNScene) {
            let alive = manager.monsters.filter { $0.isAlive }
            if alive.count != lastMonsterCount {
                lastMonsterCount = alive.count
                nodeCache.removeAll()
                scene.rootNode.childNodes.filter { $0.name == "monster" }.forEach { $0.removeFromParentNode() }
                for monster in alive {
                    scene.rootNode.addChildNode(createMonsterNode(monster: monster))
                }
            } else {
                for monster in alive {
                    let name = "monster_\(monster.id)"
                    if let node = scene.rootNode.childNode(withName: name, recursively: true) {
                        node.position = monster.position
                    }
                }
            }
        }

        func createMonsterNode(monster: Monster) -> SCNNode {
            let groupNode = SCNNode()

            // Body: boxy animals are cubes, everything else is a blob.
            let body: SCNGeometry
            if monster.type.isBoxy {
                body = SCNBox(width: 0.8, height: 0.8, length: 0.8, chamferRadius: 0.08)
            } else {
                body = SCNSphere(radius: 0.5)
            }
            let material = SCNMaterial()
            material.diffuse.contents = monsterColor(monster)
            material.roughness.contents = 0.5
            material.metalness.contents = monster.isBoss ? 0.5 : 0.1
            body.materials = [material]

            let bodyNode = SCNNode(geometry: body)
            bodyNode.position = SCNVector3(0, 0.5, 0)
            groupNode.addChildNode(bodyNode)

            // Eyes
            let eyeMaterial = SCNMaterial()
            eyeMaterial.diffuse.contents = UIColor.red
            eyeMaterial.emission.contents = UIColor.red
            eyeMaterial.emission.intensity = 1.0

            for eyeOffset in [-0.3, 0.3] {
                let eye = SCNSphere(radius: 0.1)
                eye.materials = [eyeMaterial]
                let eyeNode = SCNNode(geometry: eye)
                eyeNode.position = SCNVector3(Float(eyeOffset), 0.6, 0.4)
                groupNode.addChildNode(eyeNode)
            }

            // Boss crown
            if monster.isBoss {
                let crownMaterial = SCNMaterial()
                crownMaterial.diffuse.contents = UIColor.yellow
                crownMaterial.emission.contents = UIColor.yellow
                crownMaterial.emission.intensity = 0.5

                let crown = SCNCone(topRadius: 0.1, bottomRadius: 0.3, height: 0.2)
                crown.materials = [crownMaterial]
                let crownNode = SCNNode(geometry: crown)
                crownNode.position = SCNVector3(0, 1.0, 0)
                groupNode.addChildNode(crownNode)
            }

            // Animation
            let floatAction = SCNAction.repeatForever(
                SCNAction.sequence([
                    SCNAction.moveBy(x: 0, y: 0.2, z: 0, duration: 1),
                    SCNAction.moveBy(x: 0, y: -0.2, z: 0, duration: 1)
                ])
            )
            groupNode.runAction(floatAction)

            groupNode.position = monster.position
            groupNode.name = "monster_\(monster.id)"

            return groupNode
        }

        func monsterColor(_ monster: Monster) -> UIColor {
            switch monster.type {
            case .slime: return .green
            case .zombie: return UIColor(red: 0.2, green: 0.5, blue: 0.1, alpha: 1)
            case .skeleton: return .white
            case .spider: return .black
            case .caveSpider: return UIColor(red: 0.2, green: 0.1, blue: 0.1, alpha: 1)
            case .creeper: return .green
            case .enderman: return .black
            case .witch: return .purple
            case .ghast: return .white
            case .blaze: return .orange
            case .witherSkeleton: return .black
            case .elderGuardian: return .cyan
            case .wither: return .black
            case .enderDragon: return .purple
            case .boxyMole: return UIColor(red: 0.6, green: 0.45, blue: 0.3, alpha: 1)
            case .boxyBat: return UIColor(red: 0.35, green: 0.25, blue: 0.5, alpha: 1)
            case .boxyAxolotl: return UIColor(red: 1.0, green: 0.6, blue: 0.75, alpha: 1)
            case .boxyFox: return UIColor(red: 0.95, green: 0.5, blue: 0.2, alpha: 1)
            case .goldenWisp: return UIColor(red: 1.0, green: 0.85, blue: 0.3, alpha: 1)
            default: return .gray
            }
        }

        func syncParticles(in scene: SCNScene) {
            if manager.particles.count != lastParticleCount {
                lastParticleCount = manager.particles.count
                scene.rootNode.childNodes.filter { $0.name == "particle" }.forEach { $0.removeFromParentNode() }
                for particle in manager.particles {
                    scene.rootNode.addChildNode(createParticleNode(particle: particle))
                }
            } else {
                let nodes = scene.rootNode.childNodes.filter { $0.name == "particle" }
                for (i, particle) in manager.particles.enumerated() {
                    if i < nodes.count { nodes[i].position = particle.position }
                }
            }
        }

        func createParticleNode(particle: Particle) -> SCNNode {
            let box = SCNBox(
                width: 0.05,
                height: 0.05,
                length: 0.05,
                chamferRadius: 0
            )

            let material = SCNMaterial()
            material.diffuse.contents = particle.color
            material.transparency = CGFloat(particle.life / particle.maxLife)
            material.emission.contents = particle.color
            material.emission.intensity = 0.5
            box.materials = [material]

            let node = SCNNode(geometry: box)
            node.position = particle.position
            node.name = "particle"
            node.scale = SCNVector3(particle.size, particle.size, particle.size)

            return node
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            let scnView = gesture.view as! SCNView
            let location = gesture.location(in: scnView)
            let hitResults = scnView.hitTest(location, options: [:])

            if let hitResult = hitResults.first {
                var node: SCNNode? = hitResult.node
                var kind: String? = nil
                while node != nil && kind == nil {
                    if node!.name == "block" || (node!.name?.hasPrefix("monster") ?? false) { kind = node!.name }
                    node = node!.parent
                }
                let position = hitResult.worldCoordinates
                if let k = kind, k.hasPrefix("monster") {
                    manager.attackMonster(at: position)
                } else if kind == "block" {
                    // Low blocks are floor: walk there. Higher blocks get mined.
                    if position.y < manager.player.position.y + 1.0 {
                        manager.moveTarget = SCNVector3(position.x, manager.player.position.y, position.z)
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    } else {
                        manager.mineBlock(at: position)
                    }
                } else {
                    manager.exploreTunnel(at: position)
                }
            }
        }

        @objc func handlePan(_ gesture: UIPanGestureRecognizer) {
            let translation = gesture.translation(in: gesture.view)

            switch gesture.state {
            case .began:
                lastTouchPosition = translation
            case .changed:
                let delta = CGPoint(
                    x: translation.x - lastTouchPosition.x,
                    y: translation.y - lastTouchPosition.y
                )

                manager.player.rotation.y += Float(delta.x) * 0.005
                manager.player.rotation.x += Float(delta.y) * 0.005

                lastTouchPosition = translation

            default:
                manager.player.isMoving = false
            }
        }

        @objc func handlePinch(_ gesture: UIPinchGestureRecognizer) {
            if gesture.state == .changed {
                manager.zoomBy(1 / Float(gesture.scale))
                gesture.scale = 1.0
            }
        }
    }
}

// ============================================================
// MARK: - 4. BLOCK TYPE EXTENSION
// ============================================================

extension BlockType {
    func displayColor() -> UIColor {
        switch self {
        case .stone: return UIColor.lightGray
        case .dirt: return UIColor.brown
        case .grass: return UIColor.green
        case .gravel: return UIColor.lightGray
        case .sand: return UIColor(red: 0.9, green: 0.8, blue: 0.6, alpha: 1)
        case .cobblestone: return UIColor.gray
        case .stoneBricks: return UIColor.lightGray
        case .granite: return UIColor(red: 0.7, green: 0.5, blue: 0.4, alpha: 1)
        case .diorite: return UIColor(red: 0.8, green: 0.8, blue: 0.8, alpha: 1)
        case .andesite: return UIColor(red: 0.6, green: 0.6, blue: 0.6, alpha: 1)
        case .marble: return UIColor.white
        case .limestone: return UIColor(red: 0.9, green: 0.9, blue: 0.8, alpha: 1)
        case .basalt: return UIColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 1)
        case .coalOre: return UIColor.black
        case .ironOre: return UIColor(red: 0.8, green: 0.7, blue: 0.6, alpha: 1)
        case .goldOre: return UIColor(red: 0.9, green: 0.8, blue: 0.3, alpha: 1)
        case .diamondOre: return UIColor(red: 0.3, green: 0.8, blue: 0.9, alpha: 1)
        case .emeraldOre: return UIColor(red: 0.2, green: 0.8, blue: 0.4, alpha: 1)
        case .rubyOre: return UIColor(red: 0.8, green: 0.2, blue: 0.2, alpha: 1)
        case .sapphireOre: return UIColor(red: 0.2, green: 0.2, blue: 0.8, alpha: 1)
        case .amethystOre: return UIColor(red: 0.6, green: 0.2, blue: 0.8, alpha: 1)
        case .torch: return UIColor(red: 0.9, green: 0.6, blue: 0.1, alpha: 1)
        case .lantern: return UIColor(red: 0.9, green: 0.8, blue: 0.3, alpha: 1)
        case .chest: return UIColor(red: 0.6, green: 0.4, blue: 0.2, alpha: 1)
        case .craftingTable: return UIColor(red: 0.6, green: 0.4, blue: 0.2, alpha: 1)
        case .tunnelWall: return UIColor(red: 0.3, green: 0.3, blue: 0.35, alpha: 1)
        case .mineShaft: return UIColor(red: 0.2, green: 0.2, blue: 0.25, alpha: 1)
        case .abandonedPickaxe: return UIColor(red: 0.4, green: 0.4, blue: 0.4, alpha: 1)
        case .rubyGem: return UIColor(red: 0.9, green: 0.1, blue: 0.1, alpha: 1)
        case .sapphireGem: return UIColor(red: 0.1, green: 0.1, blue: 0.9, alpha: 1)
        case .diamondGem: return UIColor(red: 0.3, green: 0.8, blue: 0.9, alpha: 1)
        case .monsterEgg: return UIColor(red: 0.5, green: 0.5, blue: 0.5, alpha: 1)
        case .spiderWeb: return UIColor(white: 0.8, alpha: 0.5)
        case .boneBlock: return UIColor.white
        case .treasureChest: return UIColor(red: 0.8, green: 0.6, blue: 0.1, alpha: 1)
        case .crystalCube: return UIColor(red: 0.6, green: 0.3, blue: 0.9, alpha: 1)
        case .crystalSpike: return UIColor(red: 0.3, green: 0.8, blue: 0.9, alpha: 1)
        case .crystalOrb: return UIColor(red: 0.9, green: 0.6, blue: 1.0, alpha: 1)
        case .closetCrate: return UIColor(red: 0.55, green: 0.35, blue: 0.2, alpha: 1)
        default: return UIColor.gray
        }
    }
}

// ============================================================
// MARK: - 5. MAIN CONTENT VIEW (2000+ Lines)
// ============================================================

struct TunnelMazeView: View {
    @StateObject private var manager = TunnelMazeManager()
    @State private var showInventory = false
    @State private var showMap = false
    @State private var showSettings = false
    @State private var showQuests = false
    @State private var selectedToolIndex = 0
    @State private var isMoving = false
    @State private var joy = CGVector.zero

    var body: some View {
        ZStack {
            // 3D Scene
            TunnelMazeSceneView(manager: manager)
                .ignoresSafeArea()

            // UI Overlay
            VStack {
                // Top HUD
                HStack {
                    // Health
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Image(systemName: "heart.fill")
                                .foregroundColor(manager.player.health > 50 ? .red : .orange)
                            Text("\(Int(manager.player.health))/\(Int(manager.player.maxHealth))")
                                .foregroundColor(.white)
                                .font(.caption)
                        }
                        ProgressView(value: Double(manager.player.health), total: Double(manager.player.maxHealth))
                            .progressViewStyle(LinearProgressViewStyle(tint: manager.player.health > 50 ? .red : .orange))
                            .frame(width: 80)
                    }
                    .padding(6)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)

                    // Hunger
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Image(systemName: "fork.knife")
                                .foregroundColor(manager.player.hunger > 50 ? .orange : .red)
                            Text("\(Int(manager.player.hunger))/\(Int(manager.player.maxHunger))")
                                .foregroundColor(.white)
                                .font(.caption)
                        }
                        ProgressView(value: Double(manager.player.hunger), total: Double(manager.player.maxHunger))
                            .progressViewStyle(LinearProgressViewStyle(tint: manager.player.hunger > 50 ? .orange : .red))
                            .frame(width: 80)
                    }
                    .padding(6)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)

                    // Thirst
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Image(systemName: "drop.fill")
                                .foregroundColor(manager.player.thirst > 50 ? .blue : .cyan)
                            Text("\(Int(manager.player.thirst))/\(Int(manager.player.maxThirst))")
                                .foregroundColor(.white)
                                .font(.caption)
                        }
                        ProgressView(value: Double(manager.player.thirst), total: Double(manager.player.maxThirst))
                            .progressViewStyle(LinearProgressViewStyle(tint: manager.player.thirst > 50 ? .blue : .cyan))
                            .frame(width: 80)
                    }
                    .padding(6)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)

                    Spacer()

                    // Stats
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Lv. \(manager.player.level)")
                            .foregroundColor(.yellow)
                            .font(.headline)
                        Text("💰 \(manager.player.gold)")
                            .foregroundColor(.yellow)
                            .font(.caption)
                        Text("⚔️ \(manager.player.killCount)")
                            .foregroundColor(.orange)
                            .font(.caption)
                    }
                    .padding(6)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)

                    // Buttons
                    Button(action: { showInventory.toggle() }) {
                        Image(systemName: "backpack.fill")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.orange.opacity(0.7))
                            .cornerRadius(8)
                    }

                    Button(action: { showMap.toggle() }) {
                        Image(systemName: "map.fill")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.blue.opacity(0.7))
                            .cornerRadius(8)
                    }

                    Button(action: { showSettings.toggle() }) {
                        Image(systemName: "gear.circle.fill")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.gray.opacity(0.7))
                            .cornerRadius(8)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.top, 8)

                Spacer()

                // Hotbar
                HStack(spacing: 4) {
                    ForEach(0..<min(9, manager.player.inventory.prefix(9).count), id: \.self) { index in
                        let item = manager.player.inventory[index]
                        Button(action: {
                            selectedToolIndex = index
                        }) {
                            VStack(spacing: 2) {
                                Text(item.icon)
                                    .font(.title2)
                                Text(item.name.prefix(4) + "...")
                                    .font(.system(size: 8))
                                    .foregroundColor(.white)
                                Text("x\(item.quantity)")
                                    .font(.system(size: 8))
                                    .foregroundColor(.gray)
                            }
                            .padding(4)
                            .frame(width: 50, height: 60)
                            .background(selectedToolIndex == index ? Color.orange.opacity(0.5) : Color.black.opacity(0.6))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(selectedToolIndex == index ? Color.orange : Color.clear, lineWidth: 2)
                            )
                        }
                    }

                    Spacer()

                    // Controls
                    VStack(spacing: 2) {
                        Button(action: {
                            manager.player.isSprinting.toggle()
                        }) {
                            Image(systemName: manager.player.isSprinting ? "bolt.fill" : "bolt")
                                .foregroundColor(manager.player.isSprinting ? .yellow : .white)
                                .padding(8)
                                .background(Color.blue.opacity(0.7))
                                .cornerRadius(8)
                        }

                        Button(action: {
                            manager.player.isSneaking.toggle()
                        }) {
                            Image(systemName: manager.player.isSneaking ? "person.fill.checkmark" : "person.fill")
                                .foregroundColor(.white)
                                .padding(8)
                                .background(Color.green.opacity(0.7))
                                .cornerRadius(8)
                        }
                    }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 8)
                .background(Color.black.opacity(0.5))
            }

            // Joystick (bottom-left) + zoom (bottom-right), above the hotbar.
            VStack {
                Spacer()
                HStack(alignment: .bottom) {
                    MazeJoystickView(vector: $joy)
                        .padding(.leading, 16)
                    Spacer()
                    VStack(spacing: 10) {
                        Button(action: { manager.zoomBy(0.85) }) {
                            Image(systemName: "plus.magnifyingglass")
                                .font(.title3.bold()).foregroundColor(.white)
                                .frame(width: 44, height: 44)
                                .background(Color.black.opacity(0.55)).cornerRadius(22)
                        }
                        Button(action: { manager.zoomBy(1.18) }) {
                            Image(systemName: "minus.magnifyingglass")
                                .font(.title3.bold()).foregroundColor(.white)
                                .frame(width: 44, height: 44)
                                .background(Color.black.opacity(0.55)).cornerRadius(22)
                        }
                    }
                    .padding(.trailing, 16)
                }
                .padding(.bottom, 190)
            }

            // Instant-play: generation streams in behind the scene, so the
            // player never waits on a "Digging the mega-maze" wall.
            // A slim non-blocking pill shows progress without eating taps.
            if manager.isGenerating && manager.genProgress < 1.0 {
                VStack {
                    HStack(spacing: 8) {
                        ProgressView(value: manager.genProgress, total: 1.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: .orange))
                            .frame(width: 120)
                        Text("Expanding tunnels \(Int(manager.genProgress * 100))%")
                            .font(.caption2.bold()).foregroundColor(.white.opacity(0.9))
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.55)).cornerRadius(12)
                    .padding(.top, 54)
                    Spacer()
                }
                .allowsHitTesting(false)
            }

            // Game Over is disabled in god-mode mine (kept for reference).

            // Game Over Overlay (disabled: god-mode mine never ends the run).
            if manager.isGameOver && false {
                MazeGameOverView(manager: manager)
            }
        }
        .onChange(of: joy) { v in
            let active = v.dx != 0 || v.dy != 0
            manager.joyVec = (dx: Float(v.dx), dy: Float(v.dy))
            if !active { manager.player.isMoving = false }
        }
        .onDisappear {
            joy = .zero
        }
        .sheet(isPresented: $showInventory) {
            MazeInventoryView()
                .environmentObject(manager)
        }
        .sheet(isPresented: $showMap) {
            MazeMapView()
                .environmentObject(manager)
        }
        .sheet(isPresented: $showSettings) {
            MazeSettingsView()
                .environmentObject(manager)
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - Game Over View

struct MazeGameOverView: View {
    @ObservedObject var manager: TunnelMazeManager
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.9)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Text("💀")
                    .font(.system(size: 80))
                    .scaleEffect(isAnimating ? 1.2 : 1.0)
                    .animation(
                        Animation.easeInOut(duration: 1).repeatForever(autoreverses: true),
                        value: isAnimating
                    )

                Text("GAME OVER")
                    .font(.system(size: 50, weight: .black))
                    .foregroundColor(.red)

                Text("You have fallen in the depths...")
                    .font(.title3)
                    .foregroundColor(.white)

                VStack(alignment: .leading, spacing: 8) {
                    StatRow(label: "Final Score", value: "\(manager.score)")
                    StatRow(label: "Level", value: "\(manager.player.level)")
                    StatRow(label: "Monsters Killed", value: "\(manager.player.killCount)")
                    StatRow(label: "Treasures Found", value: "\(manager.player.treasureFound)")
                    StatRow(label: "Distance Traveled", value: "\(Int(manager.player.distanceTraveled))m")
                }
                .padding()
                .background(Color.white.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)

                HStack(spacing: 20) {
                    Button(action: {
                        manager.resetGame()
                    }) {
                        Text("Try Again")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 40)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(12)
                    }

                    Button(action: {
                        manager.saveGame()
                    }) {
                        Text("Save")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 40)
                            .padding(.vertical, 12)
                            .background(Color.green)
                            .cornerRadius(12)
                    }
                }
            }
        }
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Inventory View

struct MazeInventoryView: View {
    @EnvironmentObject var manager: TunnelMazeManager
    @Environment(\.dismiss) var dismiss
    @State private var selectedItem: MazeInventoryItem?

    var body: some View {
        NavigationView {
            VStack {
                // Stats
                HStack {
                    VStack(alignment: .leading) {
                        Text("Inventory (\(manager.player.inventory.count))")
                            .font(.headline)
                        Text("Level \(manager.player.level)")
                            .font(.caption)
                        Text("💰 \(manager.player.gold)")
                            .font(.caption)
                            .foregroundColor(.yellow)
                    }
                    Spacer()
                    VStack(alignment: .trailing) {
                        Text("❤️ \(Int(manager.player.health))/\(Int(manager.player.maxHealth))")
                            .foregroundColor(.red)
                        Text("🍗 \(Int(manager.player.hunger))/\(Int(manager.player.maxHunger))")
                            .foregroundColor(.orange)
                        Text("💧 \(Int(manager.player.thirst))/\(Int(manager.player.maxThirst))")
                            .foregroundColor(.blue)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(12)
                .padding(.horizontal)

                // Inventory Grid
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 12) {
                        ForEach(manager.player.inventory) { item in
                            VStack {
                                Text(item.icon)
                                    .font(.largeTitle)
                                Text(item.name.prefix(8))
                                    .font(.caption)
                                    .lineLimit(1)
                                Text("x\(item.quantity)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                if item.rarity != .common {
                                    Text(item.rarity.rawValue)
                                        .font(.system(size: 8))
                                        .foregroundColor(item.rarityColor())
                                }
                            }
                            .padding()
                            .background(Color(.secondarySystemBackground))
                            .cornerRadius(10)
                            .onTapGesture {
                                selectedItem = item
                            }
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("🎒 Inventory")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .alert(item: $selectedItem) { item in
                Alert(
                    title: Text(item.name),
                    message: Text("Quantity: \(item.quantity)\nValue: \(item.value) gold\nRarity: \(item.rarity.rawValue)"),
                    primaryButton: .default(Text("Use")) {
                        if item.type == .treasure {
                            // Sell treasure
                            manager.player.gold += item.value
                            if let index = manager.player.inventory.firstIndex(where: { $0.id == item.id }) {
                                manager.player.inventory.remove(at: index)
                            }
                            manager.addNotification("💰 Sold \(item.name) for \(item.value) gold!")
                        }
                    },
                    secondaryButton: .destructive(Text("Drop")) {
                        if let index = manager.player.inventory.firstIndex(where: { $0.id == item.id }) {
                            manager.player.inventory.remove(at: index)
                        }
                    }
                )
            }
        }
    }
}

// MARK: - Map View

struct MazeMapView: View {
    @EnvironmentObject var manager: TunnelMazeManager
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Tunnels (\(manager.tunnels.count))")) {
                    ForEach(manager.tunnels.prefix(200)) { tunnel in
                        HStack {
                            Text("Tunnel \(tunnel.id.uuidString.prefix(6))")
                                .font(.caption)
                            Spacer()
                            if tunnel.isExplored {
                                Text("✅")
                                    .foregroundColor(.green)
                            } else {
                                Text("❌")
                                    .foregroundColor(.red)
                            }
                            Text("👾 \(tunnel.monsterCount)")
                                .font(.caption)
                                .foregroundColor(.orange)
                            Text("💎 \(tunnel.treasureCount)")
                                .font(.caption)
                                .foregroundColor(.yellow)
                        }
                    }
                }

                Section(header: Text("Rooms (\(manager.rooms.count))")) {
                    ForEach(manager.rooms) { room in
                        HStack {
                            Text("Room \(room.id.uuidString.prefix(6))")
                                .font(.caption)
                            Spacer()
                            Text(String(describing: room.type))
                                .font(.caption)
                                .foregroundColor(.secondary)
                            if room.isExplored {
                                Text("✅")
                                    .foregroundColor(.green)
                            }
                        }
                    }
                }

                Section(header: Text("Treasures (\(manager.treasures.filter { !$0.isFound }.count) remaining)")) {
                    ForEach(manager.treasures) { treasure in
                        HStack {
                            Text(treasure.icon)
                            Text(treasure.name)
                                .font(.caption)
                            Spacer()
                            if treasure.isFound {
                                Text("✅ Found")
                                    .foregroundColor(.green)
                                    .font(.caption)
                            } else {
                                Text("💎 \(treasure.value)")
                                    .font(.caption)
                                    .foregroundColor(.yellow)
                            }
                        }
                    }
                }
            }
            .navigationTitle("🗺️ Map")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Settings View

struct MazeSettingsView: View {
    @EnvironmentObject var manager: TunnelMazeManager
    @Environment(\.dismiss) var dismiss
    @ObservedObject private var music = SpookyMusic.shared
    @State private var showResetConfirmation = false
    @State private var showSaveConfirmation = false
    @State private var showLoadConfirmation = false

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("🎮 Game Settings")) {
                    Toggle("Night Mode", isOn: $manager.isNightMode)
                    Toggle("Sound Effects", isOn: $music.sfxEnabled)
                    Toggle("Background Music", isOn: Binding(
                        get: { music.musicEnabled },
                        set: { music.musicEnabled = $0 }
                    ))
                    HStack {
                        Image(systemName: "speaker.fill")
                        Slider(value: $music.musicVolume, in: 0...1)
                        Image(systemName: "speaker.wave.3.fill")
                    }
                    Toggle("Haptic Feedback", isOn: .constant(true))
                }

                Section(header: Text("⚙️ Difficulty")) {
                    Picker("Difficulty", selection: $manager.difficulty) {
                        ForEach(MazeDifficulty.allCases, id: \.self) { difficulty in
                            Text(difficulty.rawValue).tag(difficulty)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }

                Section(header: Text("📊 Statistics")) {
                    StatRow(label: "Level", value: "\(manager.player.level)")
                    StatRow(label: "Experience", value: "\(manager.player.experience)")
                    StatRow(label: "Gold", value: "\(manager.player.gold)")
                    StatRow(label: "Monsters Killed", value: "\(manager.player.killCount)")
                    StatRow(label: "Treasures Found", value: "\(manager.player.treasureFound)")
                    StatRow(label: "Distance Traveled", value: "\(Int(manager.player.distanceTraveled))m")
                    StatRow(label: "Inventory Items", value: "\(manager.player.inventory.count)")
                    StatRow(label: "Tunnels Explored", value: "\(manager.tunnels.filter { $0.isExplored }.count)")
                    StatRow(label: "Rooms Explored", value: "\(manager.rooms.filter { $0.isExplored }.count)")
                    StatRow(label: "Treasures Remaining", value: "\(manager.treasures.filter { !$0.isFound }.count)")
                }

                Section(header: Text("💾 Save & Load")) {
                    Button(action: {
                        manager.saveGame()
                        showSaveConfirmation = true
                    }) {
                        HStack {
                            Image(systemName: "square.and.arrow.down")
                            Text("Save Game")
                        }
                    }

                    Button(action: {
                        manager.loadGame()
                        showLoadConfirmation = true
                    }) {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                            Text("Load Game")
                        }
                    }
                }

                Section(header: Text("🎮 Controls")) {
                    Text("Tap blocks to mine")
                    Text("Tap monsters to attack")
                    Text("Swipe to look around")
                    Text("Pinch to zoom")
                    Text("Sprint to move faster")
                }

                Section(header: Text("⚠️ Danger Zone")) {
                    Button("Reset Game", role: .destructive) {
                        showResetConfirmation = true
                    }
                    .font(.headline)
                }

                Section(header: Text("ℹ️ About")) {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("5.0.0")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Tunnel Maze")
                        Spacer()
                        Text("⛏️")
                    }
                }
            }
            .navigationTitle("⚙️ Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Save Game", isPresented: $showSaveConfirmation) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Game saved successfully!")
            }
            .alert("Load Game", isPresented: $showLoadConfirmation) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Game loaded successfully!")
            }
            .alert("Reset Game?", isPresented: $showResetConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Reset", role: .destructive) {
                    manager.resetGame()
                    dismiss()
                }
            } message: {
                Text("This will permanently delete all your progress. Are you sure?")
            }
        }
    }
}

// MARK: - Monster Rarity Extension

extension MonsterRarity {
    func color() -> UIColor {
        switch self {
        case .common: return .gray
        case .uncommon: return .blue
        case .rare: return .purple
        case .legendary: return .yellow
        }
    }
}

extension MazeInventoryItem {
    func rarityColor() -> Color {
        switch self.rarity {
        case .common: return .gray
        case .uncommon: return .blue
        case .rare: return .purple
        case .legendary: return .yellow
        }
    }
}

// MARK: - Difficulty Extension

enum MazeDifficulty: String, CaseIterable {
    case peaceful = "☮️ Peaceful"
    case easy = "😊 Easy"
    case normal = "😐 Normal"
    case hard = "😰 Hard"
    case nightmare = "💀 Nightmare"
    case insane = "🤯 Insane"
}

// MARK: - Virtual Joystick

struct MazeJoystickView: View {
    @Binding var vector: CGVector

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.black.opacity(0.35))
                .frame(width: 110, height: 110)
            Circle()
                .fill(Color.white.opacity(0.7))
                .frame(width: 48, height: 48)
                .offset(x: vector.dx * 31, y: vector.dy * 31)
        }
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { v in
                    let t = v.translation
                    let len = max(1, sqrt(t.width * t.width + t.height * t.height))
                    let cl = min(1, len / 40)
                    vector = CGVector(dx: t.width / len * cl, dy: t.height / len * cl)
                }
                .onEnded { _ in vector = .zero }
        )
    }
}

// ============================================================
// MARK: - 6. PREVIEW PROVIDER
// ============================================================

#Preview {
    TunnelMazeView()
}
