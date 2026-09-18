//
//  SpookyGraveyard.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Spooky Graveyard 3D world, integrated as a World (not a sidebar tab):
//  - Reach via Explore -> Worlds hub + Mini Games -> Graveyard 3D
//  - Minecraft-style mining, ghost combat, crypt exploration (SceneKit)
//  - Rewards bridge into HalloweenUltimateManager (gold / XP / score)
//

import SwiftUI
import SceneKit
import UIKit

// ============================================================
// MARK: - GY Data Models (GY-prefixed to avoid collisions)
// ============================================================

enum GYBlockType: String, CaseIterable {
    case dirt = "🟫 Dirt"
    case grass = "🟩 Grass"
    case stone = "⬜ Stone"
    case cobblestone = "⬜ Cobblestone"
    case mossyStone = "🟩 Mossy Stone"
    case gravel = "⬜ Gravel"
    case sand = "🟨 Sand"
    case wood = "🟫 Wood"
    case oakPlanks = "🟫 Oak Planks"
    case stoneBricks = "⬜ Stone Bricks"
    case mossyBricks = "🟩 Mossy Bricks"
    case crackedBricks = "⬜ Cracked Bricks"
    case ironBars = "⬜ Iron Bars"
    case goldOre = "🟨 Gold Ore"
    case ironOre = "⬜ Iron Ore"
    case diamondOre = "🟦 Diamond Ore"
    case emeraldOre = "🟩 Emerald Ore"
    case coalOre = "⬛ Coal Ore"
    case redstoneOre = "🟥 Redstone Ore"
    case lapisOre = "🟦 Lapis Ore"
    case obsidian = "⬛ Obsidian"
    case bedrock = "⬛ Bedrock"
    case soulSand = "🟫 Soul Sand"
    case netherrack = "🟥 Netherrack"
    case glowstone = "🟨 Glowstone"
    case pumpkin = "🟧 Pumpkin"
    case jackOLantern = "🟧 Jack O'Lantern"
    case tombstone = "⬜ Tombstone"
    case cryptDoor = "🟫 Crypt Door"
    case coffin = "🟫 Coffin"
    case grave = "🟫 Grave"
    case skeletonSkull = "⬜ Skeleton Skull"
    case spiderWeb = "⬜ Spider Web"
    case cobweb = "⬜ Cobweb"
    case torch = "🟧 Torch"
    case lantern = "🟨 Lantern"
    case bone = "⬜ Bone"
    case skull = "⬜ Skull"
    case ghostBlock = "👻 Ghost Block"
    // Adopted from Ultimate 3D Graveyard: extra natural / wood / stone / ore /
    // nether / structural / station blocks for richer mining + crypt dressing.
    case clay = "🟫 Clay"
    case oakWood = "🟫 Oak Wood"
    case spruceWood = "🟫 Spruce Wood"
    case birchWood = "⬜ Birch Wood"
    case jungleWood = "🟫 Jungle Wood"
    case sprucePlanks = "🟫 Spruce Planks"
    case birchPlanks = "⬜ Birch Planks"
    case junglePlanks = "🟫 Jungle Planks"
    case chiseledBricks = "⬜ Chiseled Bricks"
    case polishedStone = "⬜ Polished Stone"
    case smoothStone = "⬜ Smooth Stone"
    case netheriteOre = "🟥 Netherite Ore"
    case copperOre = "🟧 Copper Ore"
    case netherBrick = "🟥 Nether Brick"
    case magma = "🟧 Magma"
    case eerieStone = "⬜ Eerie Stone"
    case cursedSoil = "⬛ Cursed Soil"
    case hauntedBrick = "⬜ Haunted Brick"
    case fence = "🟫 Fence"
    case gate = "🟫 Gate"
    case stairs = "⬜ Stairs"
    case slab = "⬜ Slab"
    case wall = "⬜ Wall"
    case chest = "🟫 Chest"
    case craftingTable = "🟫 Crafting Table"
    case furnace = "⬜ Furnace"
    case anvil = "⬜ Anvil"
    case enchantmentTable = "🟩 Enchant Table"
    case beacon = "⬜ Beacon"
    case enderChest = "⬛ Ender Chest"

    // Returns true when this block type can be efficiently mined by the given tool.
    // In Minecraft: wooden pickaxe mines stone, wooden axe mines wood, shovel mines dirt/sand.
    func isEffective(with toolType: GYToolType) -> Bool {
        switch self {
        // Stone-like → needs pickaxe (any tier)
        case .stone, .cobblestone, .stoneBricks, .mossyBricks, .crackedBricks,
             .chiseledBricks, .polishedStone, .smoothStone,
             .netherBrick, .magma, .ironBars, .tombstone, .grave, .coffin,
             .fence, .gate, .stairs, .slab, .wall, .hauntedBrick,
             .goldOre, .ironOre, .diamondOre, .emeraldOre, .coalOre,
             .redstoneOre, .lapisOre, .netheriteOre, .copperOre,
             .obsidian, .bedrock, .eerieStone, .cursedSoil, .enchantmentTable,
             .furnace, .anvil, .beacon, .enderChest:
            return toolType == .pickaxe
        // Wood-like → needs axe
        case .wood, .oakWood, .spruceWood, .birchWood, .jungleWood,
             .oakPlanks, .sprucePlanks, .birchPlanks, .junglePlanks,
         .chest, .craftingTable, .pumpkin, .jackOLantern:
             return toolType == .axe
        // Dirt/sand/gravel → needs shovel
        case .dirt, .grass, .sand, .gravel, .clay, .soulSand:
            return toolType == .shovel
        default:
            return false
        }
    }

    // Returns the effective mining speed multiplier for this tool on this block.
    // Pickaxes on stone = fast. Hands on dirt = instant-ish. Axes on wood = fast.
    func miningSpeedMultiplier(for toolType: GYToolType) -> Float {
        switch self {
        case .stone, .cobblestone, .stoneBricks, .mossyBricks, .crackedBricks,
             .chiseledBricks, .polishedStone, .smoothStone, .netherBrick, .magma:
            return toolType == .pickaxe ? 3.0 : (toolType == .none ? 0.2 : 1.0)
        case .goldOre, .ironOre, .diamondOre, .emeraldOre, .coalOre, .lapisOre, .netheriteOre, .copperOre:
            return toolType == .pickaxe ? 4.0 : (toolType == .none ? 0.2 : 1.0)
        case .obsidian: return toolType == .pickaxe ? 1.5 : 0.1
        case .bedrock: return 0.0
        case .wood, .oakWood, .spruceWood, .birchWood, .jungleWood,
             .oakPlanks, .sprucePlanks, .birchPlanks, .junglePlanks:
            return toolType == .axe ? 3.0 : (toolType == .none ? 0.5 : 1.0)
        case .dirt, .grass, .sand, .gravel, .clay, .soulSand:
            return toolType == .shovel ? 3.0 : (toolType == .none ? 1.0 : 1.0)
        default:
            return toolType == .none ? 1.0 : 1.5
        }
    }

    /// Returns what drops this block yields when broken, considering silk touch and fortune.
    func dropContents(silkTouch: Bool, fortuneLevel: Int) -> [(type: GYBlockType, quantity: Int)] {
        if silkTouch {
            // Silk touch: drop the block itself for most types
            switch self {
            case .coalOre, .ironOre, .goldOre, .diamondOre, .emeraldOre,
                 .lapisOre, .redstoneOre, .netheriteOre, .copperOre,
                 .glowstone, .spiderWeb, .cobweb,
                 .stone, .cobblestone, .stoneBricks, .mossyBricks,
                 .chiseledBricks, .polishedStone, .smoothStone,
                 .netherBrick, .magma, .obsidian,
                 .sand, .gravel, .clay, .soulSand, .grass, .dirt,
                 .oakWood, .spruceWood, .birchWood, .jungleWood,
                 .oakPlanks, .sprucePlanks, .birchPlanks, .junglePlanks:
                return [(self, 1)]
            default:
                return [(self, 1)]
            }
        }
        // Standard drops (no silk touch)
        switch self {
        // Ores → raw items (not the ore block)
        case .coalOre: return [(type: .coalOre, quantity: 2 + Int.random(in: 0...fortuneLevel))]
        case .ironOre: return [(type: .ironOre, quantity: 2 + Int.random(in: 0...fortuneLevel))]
        case .goldOre: return [(type: .goldOre, quantity: 2 + Int.random(in: 0...fortuneLevel))]
        case .diamondOre: return [(type: .diamondOre, quantity: 2 + Int.random(in: 0...fortuneLevel))]
        case .emeraldOre: return [(type: .emeraldOre, quantity: 2 + Int.random(in: 0...fortuneLevel))]
        case .lapisOre: return [(type: .lapisOre, quantity: 4 + Int.random(in: 0...fortuneLevel) * 2)]
        case .redstoneOre: return [(type: .redstoneOre, quantity: 4 + Int.random(in: 0...fortuneLevel))]
        case .netheriteOre: return [(type: .netheriteOre, quantity: 1)]
        case .copperOre: return [(type: .copperOre, quantity: 2 + Int.random(in: 0...fortuneLevel))]
        case .glowstone: return [(type: .glowstone, quantity: 2 + Int.random(in: 0...fortuneLevel))]
        // Web drops string
        case .spiderWeb, .cobweb: return [(type: .bone, quantity: 1 + Int.random(in: 0...fortuneLevel))]
        // Gravel → bone (flint replaced by bone for simplicity)
        case .gravel: return [(type: .bone, quantity: Int.random(in: 0...1))]
        // Pumpkins drop edible flesh (Vintage-Story-style satiety)
        case .pumpkin, .jackOLantern: return [(type: .pumpkin, quantity: 2)]
        // Dirt/grass → dirt
        case .dirt, .grass, .soulSand: return [(type: .dirt, quantity: 1)]
        // Sand/clay → self
        case .sand, .clay: return [(type: self, quantity: 1)]
        default:
            return [(type: self, quantity: 1)]
        }
    }

    /// Raw XP dropped when mined (from ores).
    func xpReward() -> Int {
        switch self {
        case .diamondOre: return 5
        case .emeraldOre: return 5
        case .goldOre: return 4
        case .ironOre: return 3
        case .coalOre: return 2
        case .lapisOre: return 4
        case .redstoneOre: return 3
        case .netheriteOre: return 7
        case .copperOre: return 2
        default: return 0
        }
    }

    var hardness: Float {
        switch self {
        case .dirt, .grass, .gravel, .sand, .clay: return 0.5
        case .wood, .oakPlanks, .sprucePlanks, .birchPlanks, .junglePlanks: return 1.0
        case .oakWood, .spruceWood, .birchWood, .jungleWood: return 1.0
        case .pumpkin, .jackOLantern: return 1.0
        case .stone, .cobblestone, .stoneBricks, .mossyBricks, .crackedBricks: return 1.5
        case .chiseledBricks, .polishedStone, .smoothStone: return 1.5
        case .netherBrick, .magma: return 1.5
        case .ironBars, .tombstone, .grave, .coffin: return 2.0
        case .fence, .gate: return 2.0
        case .chest, .craftingTable, .furnace, .anvil: return 2.5
        case .enchantmentTable, .beacon, .enderChest: return 3.0
        case .goldOre, .ironOre, .coalOre, .copperOre: return 3.0
        case .redstoneOre, .lapisOre, .emeraldOre: return 3.0
        case .diamondOre: return 4.0
        case .netheriteOre: return 5.0
        case .obsidian: return 5.0
        case .bedrock: return 99.0
        case .soulSand: return 1.0
        case .netherrack: return 0.8
        case .glowstone: return 0.3
        case .torch, .lantern: return 0.1
        default: return 1.0
        }
    }

    var isTransparent: Bool {
        switch self {
        case .torch, .lantern, .spiderWeb, .cobweb, .ghostBlock: return true
        default: return false
        }
    }

    var isOre: Bool {
        switch self {
        case .goldOre, .ironOre, .diamondOre, .emeraldOre, .coalOre, .redstoneOre, .lapisOre, .netheriteOre, .copperOre:
            return true
        default: return false
        }
    }

    var isSolid: Bool { true }

    var emoji: String {
        switch self {
        case .dirt: return "🟫"
        case .grass: return "🟩"
        case .stone: return "⬜"
        case .cobblestone: return "⬜"
        case .mossyStone: return "🟩"
        case .gravel: return "⬜"
        case .sand: return "🟨"
        case .wood: return "🟫"
        case .oakPlanks: return "🟫"
        case .stoneBricks: return "⬜"
        case .mossyBricks: return "🟩"
        case .crackedBricks: return "⬜"
        case .ironBars: return "⬜"
        case .goldOre: return "🟨"
        case .ironOre: return "⬜"
        case .diamondOre: return "🟦"
        case .emeraldOre: return "🟩"
        case .coalOre: return "⬛"
        case .redstoneOre: return "🟥"
        case .lapisOre: return "🟦"
        case .obsidian: return "⬛"
        case .bedrock: return "⬛"
        case .soulSand: return "🟫"
        case .netherrack: return "🟥"
        case .glowstone: return "🟨"
        case .pumpkin: return "🟧"
        case .jackOLantern: return "🟧"
        case .tombstone: return "⬜"
        case .cryptDoor: return "🟫"
        case .coffin: return "🟫"
        case .grave: return "🟫"
        case .skeletonSkull: return "⬜"
        case .spiderWeb: return "⬜"
        case .cobweb: return "⬜"
        case .torch: return "🟧"
        case .lantern: return "🟨"
        case .bone: return "⬜"
        case .skull: return "⬜"
        case .ghostBlock: return "👻"
        case .clay: return "🟫"
        case .oakWood: return "🟫"
        case .spruceWood: return "🟫"
        case .birchWood: return "⬜"
        case .jungleWood: return "🟫"
        case .sprucePlanks: return "🟫"
        case .birchPlanks: return "⬜"
        case .junglePlanks: return "🟫"
        case .chiseledBricks: return "⬜"
        case .polishedStone: return "⬜"
        case .smoothStone: return "⬜"
        case .netheriteOre: return "🟥"
        case .copperOre: return "🟧"
        case .netherBrick: return "🟥"
        case .magma: return "🟧"
        case .eerieStone: return "⬜"
        case .cursedSoil: return "⬛"
        case .hauntedBrick: return "⬜"
        case .fence: return "🟫"
        case .gate: return "🟫"
        case .stairs: return "⬜"
        case .slab: return "⬜"
        case .wall: return "⬜"
        case .chest: return "🟫"
        case .craftingTable: return "🟫"
        case .furnace: return "⬜"
        case .anvil: return "⬜"
        case .enchantmentTable: return "🟩"
        case .beacon: return "⬜"
        case .enderChest: return "⬛"
        }
    }

    var shortName: String {
        rawValue.components(separatedBy: " ").last ?? rawValue
    }
}

struct GYBlock: Identifiable {
    let id = UUID()
    var type: GYBlockType
    var position: SCNVector3
    var health: Float
    var maxHealth: Float
    var isDestroyed: Bool
    // Minecraft-style staged breaking: 0.0 = fresh, 1.0 = fully damaged, breaks at >=1.0
    var damage: Float = 0
    // Particle emitter for breaking effects (spawned by scene coordinator)
    var particleNodes: [SCNNode] = []
}

struct GYGhost: Identifiable {
    let id = UUID()
    var name: String
    var type: GhostType
    var health: Int
    var maxHealth: Int
    var damage: Int
    var speed: Float
    var position: SCNVector3
    var isAggressive: Bool
    var isBoss: Bool
    var rewards: [GYBlockType]
    var attackCooldown: Float
    var detectionRange: Float
    // Adopted ghost brain: wander targets, stun, simple states
    var isAlive: Bool = true
    var state: GYGhostState = .idle
    var targetPosition: SCNVector3? = nil
    var isStunned: Bool = false
    var stunTimer: Float = 0
    var wanderTick: Int = 0
}

enum GYGhostState {
    case idle, wandering, chasing, attacking, stunned
}

struct GYCrypt: Identifiable {
    let id = UUID()
    var name: String
    var position: SCNVector3
    var isOpen: Bool
    var isExplored: Bool
    var difficulty: Int
    var ghostCount: Int
    var treasures: [GYBlockType]
    var loot: [GYBlockType]
    var hasBoss: Bool
}

enum GYToolType: String {
    case pickaxe, shovel, axe, sword, hoe, shears, none

    var emoji: String {
        switch self {
        case .pickaxe: return "⛏️"
        case .shovel: return "🪣"
        case .axe: return "🪓"
        case .sword: return "⚔️"
        case .hoe: return "🌾"
        case .shears: return "✂️"
        case .none: return "❌"
        }
    }
}

enum GYEnchant: String {
    case efficiency, unbreaking, fortune, silkTouch, sharpness, smite, looting, fireAspect
    case knockback, power, punch, flame, infinity, mending
}

struct GYTool: Identifiable {
    let id = UUID()
    var name: String
    var type: GYToolType
    var durability: Int
    var maxDurability: Int
    var miningSpeed: Float
    var damage: Int
    var enchants: [GYEnchant]
}

struct GYInventoryItem: Identifiable {
    let id = UUID()
    var type: GYBlockType
    var quantity: Int
}

struct GYPlayer {
    var position: SCNVector3
    var health: Int
    var maxHealth: Int
    var hunger: Int
    var maxHunger: Int
    var experience: Int
    var level: Int
    var inventory: [GYInventoryItem]
    var equippedTool: GYTool?
    var gold: Int
    var ghostsDefeated: Int
    var cryptsExplored: Int
    var blocksMined: Int
    // First-person: yaw (left-right) and pitch (up-down)
    var yaw: Float = 0
    var pitch: Float = 0
}

struct GYParticle3D: Identifiable {
    let id = UUID()
    var emoji: String
    var position: SCNVector3
}

/// Events forwarded to the Ultimate manager (gold / XP / score / haptics).
enum GYEvent {
    case minedOre(String, Int)
    case defeatedGhost(String, Bool)
    case exploredCrypt(String)
    case leveledUp(Int)
}

// ============================================================
// MARK: - Graveyard Manager (self-contained, iPad-tuned)
// ============================================================

final class GraveyardManager: ObservableObject {
    @Published var player = GYPlayer(
        position: SCNVector3(0, 3, 0),
        health: 100, maxHealth: 100,
        hunger: 20, maxHunger: 20,
        experience: 0, level: 1,
        inventory: [], equippedTool: nil,
        gold: 0, ghostsDefeated: 0, cryptsExplored: 0, blocksMined: 0
    )
    @Published var blocks: [GYBlock] = []
    @Published var ghosts: [GYGhost] = []
    @Published var crypts: [GYCrypt] = []
    @Published var tools: [GYTool] = []
    @Published var notifications: [String] = []
    @Published var gameTime = 0
    @Published var difficultyLevel = 1
    // Camera orbit (our own — reliable on iPhone/iPad, overlay-safe)
    @Published var cameraYaw: Float = 0
    // First-person feedback: bumped to trigger hand swing / crack redraw.
    @Published var swingId = 0
    @Published var damageTick = 0
    /// Block index under the crosshair (refreshed by game timer + actions).
    @Published var crosshairTarget: Int? = nil
    // Vintage-Story-style spirit storm cycle (ticks at 0.5s each).
    var stormTicks = 0
    var stormCooldown = 200
    var isStormActive: Bool { stormTicks > 0 }
    /// World half-extent in blocks (playable space scales with this).
    let worldHalf = 10
    var worldB: Float { Float(worldHalf + 2) }
    /// Index of the last-mined block (for incremental crack redraw).
    var lastHitIndex: Int? = nil

    var onEvent: ((GYEvent) -> Void)?

    private var timer: Timer?
    private var ghostSpawnTimer: Timer?

    init() {
        generateTools()
        generateWorld()
        generateCrypts()
        player.equippedTool = tools.first
        startTimers()
    }

    deinit {
        timer?.invalidate()
        ghostSpawnTimer?.invalidate()
    }

    // MARK: World gen (small for iPad SceneKit performance: 13x13)

    func generateWorld() {
        let half = worldHalf
        for x in -half...half {
            for z in -half...half {
                let h = getHeightAt(x: x, z: z)
                // Surface
                blocks.append(GYBlock(
                    type: h > 0 ? .grass : .sand,
                    position: SCNVector3(Float(x), Float(h), Float(z)),
                    health: 1, maxHealth: 1, isDestroyed: false
                ))
                // Soil strata: dirt with clay + gravel pockets (Vintage-Story-style)
                for y in 1...2 {
                    var stype: GYBlockType = .dirt
                    let sr = Int.random(in: 1...100)
                    if sr <= 12 { stype = .clay }
                    else if sr <= 22 { stype = .gravel }
                    blocks.append(GYBlock(type: stype,
                        position: SCNVector3(Float(x), Float(h - y), Float(z)),
                        health: 1, maxHealth: 1, isDestroyed: false))
                }
                // Rock strata: cobble near the top, deep stone below, rare obsidian seam
                for y in 3...4 {
                    var rtype: GYBlockType = .cobblestone
                    if y == 3 {
                        rtype = Bool.random() ? .stone : .cobblestone
                    } else if Int.random(in: 1...100) <= 4 {
                        rtype = .obsidian
                    }
                    blocks.append(GYBlock(type: rtype,
                        position: SCNVector3(Float(x), Float(h - y), Float(z)),
                        health: 1.5, maxHealth: 1.5, isDestroyed: false))
                }
                // Deep with ores (2 deep) — depth-flavoured like Ultimate 3D.
                // The bottom layer runs richer (Vintage-Story-style deep veins).
                for y in 5...6 {
                    var type: GYBlockType = .stone
                    let rand = Int.random(in: 1...100)
                    let rich = (y == 6) ? 3 : 0
                    if rand < 5 + rich { type = .coalOre }
                    else if rand < 8 + rich { type = .ironOre }
                    else if rand < 10 + rich { type = .copperOre }
                    else if rand < 12 + rich { type = .goldOre }
                    else if rand < 14 + rich { type = .redstoneOre }
                    else if rand < 15 + rich { type = .diamondOre }
                    else if rand < 16 + rich { type = .emeraldOre }
                    else if rand < 17 + rich { type = .netheriteOre }
                    blocks.append(GYBlock(type: type,
                        position: SCNVector3(Float(x), Float(h - y), Float(z)),
                        health: type.isOre ? 3.0 : 2.0,
                        maxHealth: type.isOre ? 3.0 : 2.0,
                        isDestroyed: false))
                }
            }
        }
        addGraveyardDecorations()
    }

    func getHeightAt(x: Int, z: Int) -> Int {
        let h = Int(sin(Double(x) * 0.3) * cos(Double(z) * 0.3) * 2 + 2)
        return max(0, min(4, h))
    }

    func addGraveyardDecorations() {
        for _ in 0..<12 {
            let x = Int.random(in: -5...5), z = Int.random(in: -5...5)
            let y = getHeightAt(x: x, z: z) + 1
            blocks.append(GYBlock(type: .tombstone,
                position: SCNVector3(Float(x), Float(y), Float(z)),
                health: 2, maxHealth: 2, isDestroyed: false))
        }
        for _ in 0..<8 {
            let x = Int.random(in: -5...5), z = Int.random(in: -5...5)
            let y = getHeightAt(x: x, z: z) + 1
            blocks.append(GYBlock(type: .jackOLantern,
                position: SCNVector3(Float(x), Float(y), Float(z)),
                health: 1, maxHealth: 1, isDestroyed: false))
        }
        for _ in 0..<8 {
            let x = Int.random(in: -5...5), z = Int.random(in: -5...5)
            let y = getHeightAt(x: x, z: z) + 1
            blocks.append(GYBlock(type: .spiderWeb,
                position: SCNVector3(Float(x), Float(y), Float(z)),
                health: 0.5, maxHealth: 0.5, isDestroyed: false))
        }
        // Cursed-soil ghost spawn marks (dark omens on the field)
        for _ in 0..<6 {
            let x = Int.random(in: -5...5), z = Int.random(in: -5...5)
            let y = getHeightAt(x: x, z: z)
            blocks.append(GYBlock(type: .cursedSoil,
                position: SCNVector3(Float(x), Float(y), Float(z)),
                health: 1, maxHealth: 1, isDestroyed: false))
        }
    }

    func generateCrypts() {
        let spots = [(x: -4, z: 4), (x: 4, z: -3), (x: -4, z: -4), (x: 5, z: 5)]
        let names = ["Cursed Crypt", "Shadow Tomb", "Dark Mausoleum", "Whispering Crypt"]
        for (i, s) in spots.enumerated() {
            let y = getHeightAt(x: s.x, z: s.z) + 1
            let diff = Int.random(in: 1...4)
            let treasures: [GYBlockType] = [[.goldOre, .diamondOre], [.emeraldOre, .netheriteOre], [.redstoneOre, .obsidian], [.diamondOre, .copperOre]].randomElement() ?? [.goldOre]
            crypts.append(GYCrypt(
                name: names[i % names.count],
                position: SCNVector3(Float(s.x), Float(y), Float(s.z)),
                isOpen: false, isExplored: false,
                difficulty: diff,
                ghostCount: 2 + diff,
                treasures: treasures,
                loot: [.bone, .skull, .torch],
                hasBoss: Bool.random()
            ))
            blocks.append(GYBlock(type: .cryptDoor,
                position: SCNVector3(Float(s.x), Float(y), Float(s.z)),
                health: 5, maxHealth: 5, isDestroyed: false))
            // Eerie-stone ring + torch pair dressing (from Ultimate 3D)
            for a in stride(from: 0.0, to: 6.28, by: 1.05) {
                let dx = Float(cos(a)) * 1.5, dz = Float(sin(a)) * 1.5
                blocks.append(GYBlock(type: .eerieStone,
                    position: SCNVector3(Float(s.x) + dx, Float(y) - 1, Float(s.z) + dz),
                    health: 2, maxHealth: 2, isDestroyed: false))
            }
            for side in [-1.2, 1.2] as [Float] {
                blocks.append(GYBlock(type: .torch,
                    position: SCNVector3(Float(s.x) + side, Float(y) + 1, Float(s.z)),
                    health: 0.5, maxHealth: 0.5, isDestroyed: false))
            }
        }
    }

    func generateTools() {
        tools = [
            GYTool(name: "Wooden Pickaxe", type: .pickaxe, durability: 59, maxDurability: 59, miningSpeed: 1.5, damage: 2, enchants: []),
            GYTool(name: "Stone Pickaxe", type: .pickaxe, durability: 131, maxDurability: 131, miningSpeed: 2.0, damage: 3, enchants: []),
            GYTool(name: "Iron Pickaxe", type: .pickaxe, durability: 250, maxDurability: 250, miningSpeed: 3.0, damage: 4, enchants: [.efficiency]),
            GYTool(name: "Diamond Pickaxe", type: .pickaxe, durability: 1561, maxDurability: 1561, miningSpeed: 4.5, damage: 5, enchants: [.efficiency, .unbreaking]),
            GYTool(name: "Netherite Pickaxe", type: .pickaxe, durability: 2031, maxDurability: 2031, miningSpeed: 5.5, damage: 6, enchants: [.efficiency, .unbreaking, .fortune]),
            GYTool(name: "Wooden Sword", type: .sword, durability: 59, maxDurability: 59, miningSpeed: 1.0, damage: 4, enchants: []),
            GYTool(name: "Iron Sword", type: .sword, durability: 250, maxDurability: 250, miningSpeed: 1.0, damage: 6, enchants: [.sharpness]),
            GYTool(name: "Diamond Sword", type: .sword, durability: 1561, maxDurability: 1561, miningSpeed: 1.0, damage: 7, enchants: [.sharpness, .looting]),
            GYTool(name: "Netherite Sword", type: .sword, durability: 2031, maxDurability: 2031, miningSpeed: 1.0, damage: 8, enchants: [.sharpness, .looting, .fireAspect]),
            GYTool(name: "Stone Shovel", type: .shovel, durability: 131, maxDurability: 131, miningSpeed: 3.0, damage: 3, enchants: []),
            GYTool(name: "Diamond Shovel", type: .shovel, durability: 1561, maxDurability: 1561, miningSpeed: 5.0, damage: 5, enchants: [.efficiency, .silkTouch]),
            GYTool(name: "Iron Axe", type: .axe, durability: 250, maxDurability: 250, miningSpeed: 4.0, damage: 5, enchants: []),
            GYTool(name: "Diamond Axe", type: .axe, durability: 1561, maxDurability: 1561, miningSpeed: 5.5, damage: 6, enchants: [.efficiency, .sharpness]),
        ]
    }

    // MARK: Timers

    func startTimers() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.updateGame()
        }
        ghostSpawnTimer = Timer.scheduledTimer(withTimeInterval: 8.0, repeats: true) { [weak self] _ in
            self?.spawnRandomGhost()
        }
    }

    func updateGame() {
        gameTime += 1
        if gameTime % 60 == 0 {
            player.hunger = max(0, player.hunger - 1)
            if player.hunger == 0 {
                player.health -= 1
                if player.health <= 0 {
                    player.health = player.maxHealth
                    addNotification("💀 You died! Respawned with full health.")
                }
            }
        }
        // Spirit storm cycle: warning → surge (double ore XP, ghost surge) → calm.
        if stormTicks > 0 {
            stormTicks -= 1
            if ghosts.count < 12 && Int.random(in: 1...12) == 1 { spawnRandomGhost() }
            if stormTicks == 0 {
                stormCooldown = 400
                addNotification("🌤️ The veil settles… storm over.")
            }
        } else {
            stormCooldown -= 1
            if stormCooldown == 20 { addNotification("🌫️ The air grows cold… something comes.") }
            if stormCooldown <= 0 {
                stormTicks = 40
                addNotification("🌩️ SPIRIT STORM! Ghosts surge — double ore XP!")
            }
        }
        for i in ghosts.indices { updateGhostAI(index: i) }
        // Cooldowns tick
        for i in ghosts.indices {
            if ghosts[i].attackCooldown > 0 {
                ghosts[i].attackCooldown = max(0, ghosts[i].attackCooldown - 0.5)
            }
        }
        // Refresh crosshair target so the highlight + progress bar stay live.
        crosshairTarget = blockAtCrosshair()
    }

    func updateGhostAI(index: Int) {
        guard ghosts.indices.contains(index) else { return }
        var ghost = ghosts[index]
        let d = distance(ghost.position, player.position)

        // Stun ticks down first (stun adopted from Ultimate 3D)
        if ghost.isStunned {
            ghost.stunTimer -= 0.5
            if ghost.stunTimer <= 0 {
                ghost.isStunned = false
                ghost.state = .idle
            }
            ghosts[index] = ghost
            return
        }

        switch ghost.state {
        case .idle:
            if d < ghost.detectionRange && ghost.isAggressive {
                ghost.state = .chasing
            } else {
                // Idle drift: occasionally pick a wander target
                ghost.wanderTick += 1
                if ghost.wanderTick > 6 {
                    ghost.wanderTick = 0
                    if Bool.random() {
                        ghost.state = .wandering
                        ghost.targetPosition = SCNVector3(
                            max(-6, min(6, ghost.position.x + Float.random(in: -3...3))),
                            ghost.position.y,
                            max(-6, min(6, ghost.position.z + Float.random(in: -3...3))))
                    }
                }
            }
        case .wandering:
            if d < ghost.detectionRange && ghost.isAggressive {
                ghost.state = .chasing
            } else if let t = ghost.targetPosition {
                let dir = normalized(SCNVector3(t.x - ghost.position.x, 0, t.z - ghost.position.z))
                ghost.position.x += dir.x * ghost.speed * 0.08
                ghost.position.z += dir.z * ghost.speed * 0.08
                if distance(ghost.position, t) < 0.5 { ghost.state = .idle }
            } else {
                ghost.state = .idle
            }
        case .chasing:
            if d > ghost.detectionRange * 1.5 {
                ghost.state = .idle
            } else if d < 1.8 {
                ghost.state = .attacking
            } else {
                let dir = normalized(SCNVector3(
                    player.position.x - ghost.position.x, 0,
                    player.position.z - ghost.position.z))
                ghost.position.x += dir.x * ghost.speed * 0.15
                ghost.position.z += dir.z * ghost.speed * 0.15
            }
        case .attacking:
            if d > 3.0 {
                ghost.state = .chasing
            } else {
                ghosts[index] = ghost
                attackPlayer(index: index)
                return
            }
        case .stunned:
            ghost.state = .idle
        }
        ghosts[index] = ghost
    }

    func attackPlayer(index: Int) {
        guard ghosts.indices.contains(index), ghosts[index].attackCooldown <= 0 else { return }
        let dmg = ghosts[index].damage
        player.health -= dmg
        ghosts[index].attackCooldown = 2.0
        addNotification("👻 \(ghosts[index].name) hit you! -\(dmg) ❤️")
        if player.health <= 0 {
            player.health = player.maxHealth
            addNotification("💀 You died! Respawned with full health.")
        }
    }

    func spawnRandomGhost() {
        let pool: [GhostType] = [.poltergeist, .specter, .phantom, .wraith, .banshee, .ghoul]
        let type = pool.randomElement() ?? .poltergeist
        let x = Float(Int.random(in: -5...5)), z = Float(Int.random(in: -5...5))
        let y = Float(getHeightAt(x: Int(x), z: Int(z)) + 1)
        ghosts.append(GYGhost(
            name: "\(type.rawValue) \(ghosts.count + 1)",
            type: type,
            health: 20 + difficultyLevel * 5,
            maxHealth: 20 + difficultyLevel * 5,
            damage: 5 + difficultyLevel * 2,
            speed: Float(0.5 + Double.random(in: 0...0.3)),
            position: SCNVector3(x, y, z),
            isAggressive: Bool.random(),
            isBoss: false,
            rewards: [.bone, .skull],
            attackCooldown: 1.5,
            detectionRange: Float(5 + difficultyLevel)
        ))
        if ghosts.count > 12 { ghosts.removeFirst(ghosts.count - 12) }
    }

    // MARK: Helpers

    func distance(_ a: SCNVector3, _ b: SCNVector3) -> Float {
        let dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
        return sqrt(dx*dx + dy*dy + dz*dz)
    }

    func normalized(_ v: SCNVector3) -> SCNVector3 {
        let l = sqrt(v.x*v.x + v.y*v.y + v.z*v.z)
        guard l > 0 else { return SCNVector3(0, 0, 0) }
        return SCNVector3(v.x/l, v.y/l, v.z/l)
    }

    func addNotification(_ message: String) {
        notifications.insert(message, at: 0)
        if notifications.count > 30 { notifications.removeLast() }
    }

    func addToInventory(type: GYBlockType, quantity: Int) {
        if let i = player.inventory.firstIndex(where: { $0.type == type }) {
            player.inventory[i].quantity += quantity
        } else {
            player.inventory.append(GYInventoryItem(type: type, quantity: quantity))
        }
    }

    // MARK: Actions (called from UI buttons / taps)

    func equippedOrFirst() -> GYTool {
        player.equippedTool ?? tools[0]
    }

    // MARK: First-person targeting (crosshair raycast)

    /// Unit look direction from yaw + pitch.
    func lookDir() -> SCNVector3 {
        let cp = cos(player.pitch)
        return SCNVector3(sin(player.yaw) * cp, sin(player.pitch), cos(player.yaw) * cp)
    }

    /// Eye position (feet + eye height).
    func eyePos() -> SCNVector3 {
        SCNVector3(player.position.x, player.position.y + 1.6, player.position.z)
    }

    /// Index of the solid block under the crosshair, if any (lock radius 4 blocks).
    func blockAtCrosshair(maxDist: Float = 4.0) -> Int? {
        let o = eyePos(), d = lookDir()
        var t: Float = 0.6
        while t <= maxDist {
            let sx = o.x + d.x * t, sy = o.y + d.y * t, sz = o.z + d.z * t
            for i in blocks.indices {
                if blocks[i].isDestroyed { continue }
                let bp = blocks[i].position
                if abs(bp.x - sx) < 0.5 && abs(bp.y - sy) < 0.5 && abs(bp.z - sz) < 0.5 {
                    return i
                }
            }
            t += 0.2
        }
        return nil
    }

    /// Prospecting-pick reading: ore traces near freshly broken rock.
    func prospectReading(near pos: SCNVector3) -> String? {
        guard Double.random(in: 0...1) < 0.35 else { return nil }
        var found: GYBlockType? = nil
        var best: Float = 3.5
        for b in blocks where !b.isDestroyed && b.type.isOre {
            let d = distance(b.position, pos)
            if d < best { best = d; found = b.type }
        }
        guard let ore = found else { return nil }
        return "📡 Propick: traces of \(ore.emoji) nearby…"
    }

    /// Eat pumpkin flesh from the inventory (Vintage-Story-style satiety).
    func eatFood() {
        guard let i = player.inventory.firstIndex(where: { $0.type == .pumpkin && $0.quantity > 0 }) else {
            addNotification("🍗 No food! Break 🎃 pumpkins for flesh.")
            return
        }
        player.inventory[i].quantity -= 1
        if player.inventory[i].quantity <= 0 { player.inventory.remove(at: i) }
        player.hunger = min(player.maxHunger, player.hunger + 6)
        player.health = min(player.maxHealth, player.health + 2)
        addNotification("🎃 Ate pumpkin flesh! +6 🍗 +2 ❤️")
    }

    /// Damage needed to break a block (Minecraft-like: hardness × 10).
    func breakThreshold(for type: GYBlockType) -> Float {
        max(type.hardness * 10.0, 1.0)
    }

    /// Minecraft-style mining of the CROSSHAIR-targeted block: staged damage,
    /// correct-tool + tier speed matter, proper drops (silk touch / fortune),
    /// XP orbs from ores, live crack redraw, hand swing.
    func mineTargeted() {
        swingId += 1
        guard let idx = blockAtCrosshair() else {
            addNotification("⛏️ Aim at a block to mine!")
            return
        }
        guard !blocks[idx].isDestroyed else {
            crosshairTarget = blockAtCrosshair()
            return
        }
        applyMineHit(idx)
    }

    /// Shared per-hit mining logic: damage, cracks, breaks, drops, XP.
    func applyMineHit(_ idx: Int) {
        lastHitIndex = idx
        var b = blocks[idx]
        if b.type == .bedrock {
            addNotification("⬛ Bedrock is unbreakable!")
            return
        }
        let tool = equippedOrFirst()
        let speedMul = b.type.miningSpeedMultiplier(for: tool.type)
        let effCount = tool.enchants.filter({ $0 == .efficiency }).count
        let efficiencyBonus = 1.0 + Float(effCount) * 0.3
        let fortuneLevel = tool.enchants.filter({ $0 == .fortune }).count
        let silkTouch = tool.enchants.contains(.silkTouch)
        // Damage per tap: right tool + better tier = fewer taps.
        // Dirt+shovel ≈ 1 tap, stone+pickaxe ≈ 2–4, ores ≈ 2–4, obsidian ≈ 8.
        let damagePerTap = max(speedMul * tool.miningSpeed * efficiencyBonus, 0.2)
        let threshold = breakThreshold(for: b.type)
        let prevStage = Int(min(b.damage / threshold * 4, 3.99))
        b.damage += damagePerTap
        let newStage = Int(min(b.damage / threshold * 4, 3.99))
        // Swinging tools burns calories (Vintage-Story-style exertion).
        if Int.random(in: 1...12) == 1 { player.hunger = max(0, player.hunger - 1) }
        if !(tool.enchants.contains(.unbreaking) && Bool.random()) {
            wearTool(tool)
        }
        if b.damage >= threshold {
            b.isDestroyed = true
            blocks[idx] = b
            damageTick += 1
            player.blocksMined += 1
            let drops = b.type.dropContents(silkTouch: silkTouch, fortuneLevel: fortuneLevel)
            for (dropType, qty) in drops {
                addToInventory(type: dropType, quantity: qty)
            }
            var xp = b.type.xpReward()
            if isStormActive { xp *= 2 }
            if xp > 0 {
                player.experience += xp
                addNotification(isStormActive ? "🌩️ +\(xp) XP! (storm bounty)" : "✨ +\(xp) XP!")
            }
            if (b.type == .stone || b.type == .cobblestone),
               let reading = prospectReading(near: b.position) {
                addNotification(reading)
            }
            if b.type.isOre {
                var n = 1
                for (_, qty) in drops { n = qty }
                addNotification("⛏️ Mined \(b.type.rawValue)! \(b.type.emoji) +\(n)💎")
                onEvent?(.minedOre(b.type.rawValue, n))
            } else {
                addNotification("⛏️ Broke \(b.type.shortName)! \(b.type.emoji)")
            }
            checkLevelUp()
        } else {
            blocks[idx] = b
            if newStage != prevStage { damageTick += 1 }  // redraw cracks
        }
        crosshairTarget = blockAtCrosshair()
        gameTime += 1
    }

    /// Tap-to-mine: damage the solid block at a 3D world position (tap hit-test).
    func mineBlock(at worldPos: SCNVector3) {
        swingId += 1
        let eye = eyePos()
        var bestIdx: Int? = nil
        var bestTap: Float = 0.8
        for i in blocks.indices where !blocks[i].isDestroyed {
            let bp = blocks[i].position
            let ex = bp.x - eye.x, ey = bp.y - eye.y, ez = bp.z - eye.z
            guard sqrt(ex*ex + ey*ey + ez*ez) <= 4.5 else { continue }
            let dx = bp.x - worldPos.x, dy = bp.y - worldPos.y, dz = bp.z - worldPos.z
            let tap = sqrt(dx*dx + dy*dy + dz*dz)
            if tap < bestTap { bestTap = tap; bestIdx = i }
        }
        guard let idx = bestIdx else { return }
        applyMineHit(idx)
    }

    /// Backwards-compatible wrapper (Mine button used to call this).
    func mineNearest() { mineTargeted() }

    /// Fallback: mine the closest solid block to the player (when crosshair misses).
    func mineNearestBlock() {
        swingId += 1
        let eye = eyePos()
        var bestIdx: Int? = nil
        var bestDist: Float = 4.0
        for i in blocks.indices where !blocks[i].isDestroyed {
            let dx = blocks[i].position.x - eye.x
            let dy = blocks[i].position.y - eye.y
            let dz = blocks[i].position.z - eye.z
            let dist = sqrt(dx*dx + dy*dy + dz*dz)
            if dist < bestDist {
                bestDist = dist
                bestIdx = i
            }
        }
        guard let idx = bestIdx else {
            addNotification("⛏️ Aim at a block to mine!")
            return
        }
        applyMineHit(idx)
    }

    func attackNearestGhost() {
        swingId += 1
        guard !ghosts.isEmpty else {
            addNotification("👻 No ghosts nearby!")
            return
        }
        // Prefer ghosts in front of the crosshair, then nearest.
        let eye = eyePos(), look = lookDir()
        var bestIdx = 0
        var bestScore = Float.greatestFiniteMagnitude
        for i in ghosts.indices {
            let gp = ghosts[i].position
            let dx = gp.x - eye.x, dy = (gp.y + 0.5) - eye.y, dz = gp.z - eye.z
            let dist = sqrt(dx*dx + dy*dy + dz*dz)
            let dot: Float = dist > 0.001 ? (dx*look.x + dy*look.y + dz*look.z) / dist : 1
            let score = dist + (dot > 0.3 ? 0 : 50)
            if score < bestScore { bestScore = score; bestIdx = i }
        }
        let idx = bestIdx
        // Generous range + lunge toward the target so taps always do something.
        let d = distance(ghosts[idx].position, player.position)
        if d > 10.0 {
            addNotification("⚔️ Get closer to attack! (\(Int(d))m)")
            return
        }
        applyGhostHit(idx)
    }

    /// Tap-to-attack: damage the ghost at a 3D world position (tap hit-test).
    func attackGhost(at worldPos: SCNVector3) {
        swingId += 1
        var bestIdx: Int? = nil
        var bestTap: Float = 1.6
        for i in ghosts.indices {
            let gp = ghosts[i].position
            let ex = gp.x - player.position.x, ey = gp.y - player.position.y, ez = gp.z - player.position.z
            guard sqrt(ex*ex + ey*ey + ez*ez) <= 11.0 else { continue }
            let dx = gp.x - worldPos.x, dy = gp.y - worldPos.y, dz = gp.z - worldPos.z
            let tap = sqrt(dx*dx + dy*dy + dz*dz)
            if tap < bestTap { bestTap = tap; bestIdx = i }
        }
        guard let idx = bestIdx else {
            attackNearestGhost()
            return
        }
        applyGhostHit(idx)
    }

    /// Shared per-hit ghost combat: lunge, damage, knockback, stun, loot.
    func applyGhostHit(_ idx: Int) {
        guard ghosts.indices.contains(idx) else { return }
        let tool = equippedOrFirst()
        if distance(ghosts[idx].position, player.position) > 2.5 {
            // Step toward the ghost so combat feels responsive
            stepToward(ghosts[idx].position)
        }
        var g = ghosts[idx]
        // Pickaxes still work but swords hit harder — min 5 so kills don't take forever.
        var dmg = Float(max(tool.damage * (tool.type == .sword ? 2 : 1), 5))
        if tool.enchants.contains(.sharpness) { dmg *= 1.3 }
        if tool.enchants.contains(.fireAspect) { dmg += 2 }
        g.health -= Int(dmg)
        // Knockback shove (from Ultimate 3D)
        if tool.enchants.contains(.knockback) {
            let dir = normalized(SCNVector3(
                g.position.x - player.position.x, 0,
                g.position.z - player.position.z))
            g.position.x = max(-worldB, min(worldB, g.position.x + dir.x * 1.2))
            g.position.z = max(-worldB, min(worldB, g.position.z + dir.z * 1.2))
        }
        // Stun chance: heavy hits daze the ghost
        if dmg >= 10 && Bool.random() {
            g.isStunned = true
            g.stunTimer = 2.0
            g.state = .stunned
        }
        wearTool(tool)
        if g.health <= 0 {
            ghosts.remove(at: idx)
            player.ghostsDefeated += 1
            player.experience += g.isBoss ? 150 : 50
            let reward = Int.random(in: 5...20) * (g.isBoss ? 5 : 1)
            player.gold += reward
            for r in g.rewards { addToInventory(type: r, quantity: Int.random(in: 1...2)) }
            addNotification("⚔️ Defeated \(g.name)! +\(reward)🪙")
            onEvent?(.defeatedGhost(g.name, g.isBoss))
            checkLevelUp()
        } else {
            ghosts[idx] = g
            ghosts[idx].isAggressive = true
            addNotification("⚔️ Hit \(g.name)! -\(Int(dmg)) (\(max(0, g.health))/\(g.maxHealth))")
        }
    }

    func exploreNearestCrypt() {
        guard let idx = crypts.indices.min(by: {
            distance(crypts[$0].position, player.position) < distance(crypts[$1].position, player.position)
        }) else { return }
        let d = distance(crypts[idx].position, player.position)
        guard d < 8.0 else {
            addNotification("🏚️ Get closer to the crypt! (\(Int(d))m)")
            return
        }
        if d > 3.0 {
            stepToward(crypts[idx].position)
            addNotification("🏃 Heading to \(crypts[idx].name)…")
        }
        if !crypts[idx].isOpen {
            crypts[idx].isOpen = true
            addNotification("🔓 \(crypts[idx].name) creaks open...")
            return
        }
        if crypts[idx].isExplored {
            addNotification("🏚️ Already explored.")
            return
        }
        crypts[idx].isExplored = true
        player.cryptsExplored += 1
        let c = crypts[idx]
        addNotification("🏚️ Entered \(c.name)!")
        // Spawn defenders
        for i in 0..<c.ghostCount {
            let pool: [GhostType] = [.poltergeist, .specter, .phantom, .wraith, .banshee, .ghoul]
            let t = pool.randomElement() ?? .poltergeist
            ghosts.append(GYGhost(
                name: "\(t.rawValue) \(i+1)",
                type: t,
                health: 25 + c.difficulty * 8, maxHealth: 25 + c.difficulty * 8,
                damage: 6 + c.difficulty * 2, speed: 0.6,
                position: SCNVector3(c.position.x + Float(Int.random(in: -2...2)), c.position.y + 1, c.position.z + Float(Int.random(in: -2...2))),
                isAggressive: true, isBoss: false,
                rewards: c.loot, attackCooldown: 1.5,
                detectionRange: Float(8 + c.difficulty)
            ))
        }
        if c.hasBoss {
            let bossType: GhostType = [.demonLord, .lichKing, .voidBeast].randomElement() ?? .demonLord
            ghosts.append(GYGhost(
                name: "Boss: \(bossType.rawValue)", type: bossType,
                health: 100 + c.difficulty * 15, maxHealth: 100 + c.difficulty * 15,
                damage: 18 + c.difficulty * 3, speed: 0.8,
                position: SCNVector3(c.position.x, c.position.y + 2, c.position.z),
                isAggressive: true, isBoss: true,
                rewards: c.treasures, attackCooldown: 1.5, detectionRange: 15
            ))
            addNotification("👑 Boss appeared!")
        }
        for l in c.loot { addToInventory(type: l, quantity: Int.random(in: 1...2)) }
        for t in c.treasures {
            addToInventory(type: t, quantity: 1)
            addNotification("💎 Found \(t.rawValue)!")
        }
        player.gold += c.difficulty * 15
        onEvent?(.exploredCrypt(c.name))
        // Remove door block
        if let door = blocks.firstIndex(where: {
            abs($0.position.x - c.position.x) < 0.6 &&
            abs($0.position.y - c.position.y) < 0.6 &&
            abs($0.position.z - c.position.z) < 0.6 &&
            !$0.isDestroyed
        }) {
            blocks[door].isDestroyed = true
        }
    }

    /// Move forward/backward along the look direction (first-person Minecraft style).
    func moveForward(_ dist: Float, ticksClock: Bool = true) {
        let d = max(min(dist, 1.5), -1.5)
        let dyaw = player.yaw
        player.position.x = max(-worldB, min(worldB, player.position.x + sin(dyaw) * d))
        player.position.z = max(-worldB, min(worldB, player.position.z + cos(dyaw) * d))
        snapToTerrain()
        if ticksClock { gameTime += 1 }
    }

    /// Strafe left/right (perpendicular to look direction).
    func strafe(_ dist: Float, ticksClock: Bool = true) {
        let d = max(min(dist, 1.5), -1.5)
        let dyaw = player.yaw + Float.pi / 2
        player.position.x = max(-worldB, min(worldB, player.position.x + sin(dyaw) * d))
        player.position.z = max(-worldB, min(worldB, player.position.z + cos(dyaw) * d))
        snapToTerrain()
        if ticksClock { gameTime += 1 }
    }

    /// Step toward a world target (combat lunges + crypt approach).
    func stepToward(_ target: SCNVector3, amount: Float = 1.0) {
        let dir = normalized(SCNVector3(target.x - player.position.x, 0, target.z - player.position.z))
        player.position.x = max(-worldB, min(worldB, player.position.x + dir.x * amount))
        player.position.z = max(-worldB, min(worldB, player.position.z + dir.z * amount))
        snapToTerrain()
        gameTime += 1
    }

    /// Legacy: move by dx/dz for UI buttons (backwards-compatible).
    /// Arrow mapping: up (dz:-1) = forward, down (dz:+1) = back,
    /// left (dx:-1) = strafe left, right (dx:+1) = strafe right.
    func movePlayer(dx: Float, dz: Float) {
        if dz != 0 { moveForward(-dz) }
        if dx != 0 { strafe(dx) }
        gameTime += 1
    }

    var moveClock: GameClock?
    var moveDir: (dx: Float, dz: Float) = (0, 0)
    /// Press-and-hold walking: steps immediately, then glides continuously.
    /// 4 units/s matches the old 1-unit-per-0.25s pace — now frame-smooth
    /// instead of visibly steppy. Continuous motion doesn't tick gameTime
    /// (kept for discrete actions so hunger pacing never changes).
    private let walkSpeed: Float = 4.0
    func startMoving(dx: Float, dz: Float) {
        if moveClock != nil && moveDir == (dx, dz) { return }
        stopMoving()
        moveDir = (dx, dz)
        movePlayer(dx: dx, dz: dz)
        let clock = GameClock(framesPerSecond: 60)
        clock.add { [weak self] dt in
            guard let self = self else { return }
            let d = self.walkSpeed * Float(dt)
            if self.moveDir.dz != 0 { self.moveForward(-self.moveDir.dz * d, ticksClock: false) }
            if self.moveDir.dx != 0 { self.strafe(self.moveDir.dx * d, ticksClock: false) }
        }
        moveClock = clock
    }
    func stopMoving() { moveClock?.stop(); moveClock = nil }

    /// Look around (first-person). Pitch clamped to ±89°, yaw wraps.
    func look(deltaYaw: Float, deltaPitch: Float) {
        player.yaw += deltaYaw
        player.pitch = max(-Float.pi/2 + 0.01, min(Float.pi/2 - 0.01, player.pitch + deltaPitch))
        gameTime += 1
    }

    /// Place a block in front of the player (first-person). Returns true if placed.
    func placeBlock() -> Bool {
        let yaw = player.yaw
        let pitch = player.pitch
        let eyeHeight: Float = 1.6
        let range: Float = 4.0
        // Origin at eye level
        let ox = player.position.x
        let oy = player.position.y + eyeHeight
        let oz = player.position.z
        // Direction vector from yaw + pitch
        let dx = sin(yaw) * cos(pitch)
        let dy = sin(pitch)
        let dz = cos(yaw) * cos(pitch)
        // Step along ray to find an air block adjacent to a solid block
        var found = false
        var hitPos = SCNVector3(0, 0, 0)
        var step: Float = 0
        while step < range {
            let px = ox + dx * step
            let py = oy + dy * step
            let pz = oz + dz * step
            let ix = Int(round(px))
            let iy = Int(round(py))
            let iz = Int(round(pz))
            // Check if current voxel is occupied
            let occupied = blocks.contains { !$0.isDestroyed && abs($0.position.x - Float(ix)) < 0.4 && abs($0.position.y - Float(iy)) < 0.4 && abs($0.position.z - Float(iz)) < 0.4 }
            if occupied {
                // Next block is air — that's where we place
                let nx = ix + Int(round(dx))
                let ny = iy + Int(round(dy))
                let nz = iz + Int(round(dz))
                // Don't place inside player
                let px2 = player.position.x
                let py2 = player.position.y
                let pz2 = player.position.z
                if abs(Float(nx) - px2) > 0.5 && abs(Float(ny) - py2) > 0.5 && abs(Float(nz) - pz2) > 0.5 {
                    // Check block limit
                    if blocks.filter({ !$0.isDestroyed }).count < 300 {
                        let b = GYBlock(type: .dirt,
                            position: SCNVector3(Float(nx), Float(ny), Float(nz)),
                            health: 1, maxHealth: 1, isDestroyed: false)
                        blocks.append(b)
                        found = true
                        swingId += 1
                        addNotification("🧱 Placed \(b.type.shortName)!")
                        gameTime += 1
                    }
                }
                break
            }
            step += 0.1
        }
        if found { checkLevelUp() }
        return found
    }

    /// Snap Y to terrain (underground blocks push up).
    private func snapToTerrain() {
        let ix = Int(player.position.x.rounded())
        let iz = Int(player.position.z.rounded())
        let h = getHeightAt(x: ix, z: iz)
        player.position.y = Float(h + 1)
    }

    /// Green buttons: snap-turn the USER by the given angle (e.g. ±90°).
    func turnPlayer(_ delta: Float) {
        player.yaw += delta
        gameTime += 1
    }

    /// Tool wear adopted from Ultimate 3D: unbreaking skips damage, breaks at 0.
    func wearTool(_ tool: GYTool) {
        guard let i = tools.firstIndex(where: { $0.id == tool.id }) else { return }
        if tools[i].enchants.contains(.unbreaking) && Bool.random() { return }
        tools[i].durability -= 1
        if tools[i].durability <= 0 {
            let name = tools[i].name
            tools.remove(at: i)
            if player.equippedTool?.id == tool.id {
                player.equippedTool = tools.first
            }
            addNotification("🔧 \(name) broke!")
        } else {
            player.equippedTool = tools[i]
        }
    }

    /// Blue buttons + drag strip: nudge the VIEW yaw (first-person look).
    func rotateCamera(_ delta: Float) {
        player.yaw += delta
        gameTime += 1
    }

    func checkLevelUp() {
        let need = player.level * 100 + player.level * player.level * 10
        if player.experience >= need {
            player.level += 1
            player.experience -= need
            player.maxHealth += 5
            player.health = player.maxHealth
            addNotification("⬆️ Graveyard level \(player.level)!")
            onEvent?(.leveledUp(player.level))
        }
    }

    var score: Int {
        player.blocksMined * 5 + player.ghostsDefeated * 50 + player.cryptsExplored * 150 + player.gold
    }
}

// ============================================================
// MARK: - SceneKit View
// ============================================================

struct GraveyardSceneView: UIViewRepresentable {
    @ObservedObject var manager: GraveyardManager

    func makeCoordinator() -> Coordinator { Coordinator(manager: manager) }

    func makeUIView(context: Context) -> SCNView {
        let v = SCNView()
        v.scene = context.coordinator.scene
        v.backgroundColor = .black
        v.autoenablesDefaultLighting = true
        // We drive the camera ourselves (yaw buttons + drag) so the SwiftUI
        // overlay can't swallow SceneKit's built-in gestures.
        v.allowsCameraControl = false
        v.preferredFramesPerSecond = 30
        v.isPlaying = true
        v.autoenablesDefaultLighting = true
        setupGestures(v, context: context)
        context.coordinator.rebuild()
        return v
    }

    func setupGestures(_ view: SCNView, context: Context) {
        // Touch look: drag to look around (first-person yaw + pitch)
        let panGesture = UIPanGestureRecognizer()
        panGesture.addTarget(context.coordinator, action: #selector(Coordinator.handlePan(_:)))
        view.addGestureRecognizer(panGesture)
        // Tap to place block
        let tapGesture = UITapGestureRecognizer()
        tapGesture.addTarget(context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        view.addGestureRecognizer(tapGesture)
        // Swipe up/down for move
        let swipeUp = UISwipeGestureRecognizer()
        swipeUp.direction = .up
        swipeUp.addTarget(context.coordinator, action: #selector(Coordinator.handleSwipe(_:)))
        view.addGestureRecognizer(swipeUp)
    }

    func updateUIView(_ view: SCNView, context: Context) {
        context.coordinator.manager = manager
        context.coordinator.sync()
    }

    final class Coordinator: NSObject {
        var manager: GraveyardManager
        let scene = SCNScene()
        private var lastBuildHash = 0
        private var lastDamageTick = 0
        private var destroyedBlockIds = Set<UUID>()

        init(manager: GraveyardManager) {
            self.manager = manager
            super.init()
            setupLights()
        }

        @objc func handlePan(_ gesture: UIPanGestureRecognizer) {
            let translation = gesture.translation(in: gesture.view)
            if gesture.state == .changed || gesture.state == .ended {
                let dyaw = Float(-translation.x) / 80.0
                let dpitch = Float(-translation.y) / 80.0
                manager.look(deltaYaw: dyaw, deltaPitch: dpitch)
                gesture.setTranslation(.zero, in: gesture.view)
            }
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            if gesture.state == .ended {
                // Tap-to-mine / tap-to-attack: scan ALL hits, skipping overlay
                // helpers (highlight box, break particles, hand rig) that used
                // to swallow taps meant for blocks and ghosts behind them.
                // Tapping empty space places a block (old behavior).
                if let view = gesture.view as? SCNView {
                    let loc = gesture.location(in: view)
                    var kind: String? = nil
                    var hitPos: SCNVector3? = nil
                    for h in view.hitTest(loc, options: nil) {
                        var node: SCNNode? = h.node
                        var skip = false
                        var found: String? = nil
                        while node != nil {
                            let nm = node!.name ?? ""
                            if nm == "targetHL" || nm == "breakParticles" || nm == "handRig" || nm == "camera" {
                                skip = true
                                break
                            }
                            if nm == "block" { found = "block"; break }
                            if nm == "ghost" || nm == "ghostTap" { found = "ghost"; break }
                            node = node!.parent
                        }
                        if skip { continue }
                        if let f = found { kind = f; hitPos = h.worldCoordinates; break }
                    }
                    if kind == "block", let hp = hitPos {
                        manager.mineBlock(at: hp)
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        return
                    } else if kind == "ghost", let hp = hitPos {
                        manager.attackGhost(at: hp)
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        return
                    }
                }
                manager.placeBlock()
                // Quick haptic feedback
                let gen = UIImpactFeedbackGenerator(style: .light)
                gen.impactOccurred()
            }
        }

        @objc func handleSwipe(_ gesture: UISwipeGestureRecognizer) {
            switch gesture.direction {
            case .up: manager.moveForward(1.0)
            case .down: manager.moveForward(-1.0)
            default: break
            }
        }

func setupLights() {
            let amb = SCNNode(); amb.light = SCNLight(); amb.light?.type = .ambient; amb.light?.color = UIColor(white: 0.55, alpha: 1); scene.rootNode.addChildNode(amb)
            let dir = SCNNode(); dir.light = SCNLight(); dir.light?.type = .directional; dir.light?.color = UIColor(white: 0.9, alpha: 1); dir.light?.castsShadow = true; dir.position = SCNVector3(8, 16, 8); dir.eulerAngles = SCNVector3(-Float.pi/4, Float.pi/4, 0); scene.rootNode.addChildNode(dir)
            let torch = SCNNode(); torch.light = SCNLight(); torch.light?.type = .omni; torch.light?.color = UIColor.orange.withAlphaComponent(0.5); torch.light?.intensity = 800; torch.name = "playerLight"; scene.rootNode.addChildNode(torch)
            // Camera: fixed behind-player orbit, no look-at constraint needed.
            let cam = SCNNode(); cam.camera = SCNCamera(); cam.camera?.fieldOfView = 70; cam.camera?.zNear = 0.1; cam.camera?.zFar = 100; cam.position = SCNVector3(manager.player.position.x, manager.player.position.y + 1.6, manager.player.position.z); cam.name = "camera"; scene.rootNode.addChildNode(cam)
            // First-person hand rig: visible arm + held tool, lower-right of view.
            // x=0.16 keeps it inside the frustum even on narrow portrait phones
            // (half-width at 0.6m depth with 70° FOV is only ~0.18 there).
            let rig = SCNNode(); rig.name = "handRig"; rig.position = SCNVector3(0.16, -0.26, -0.6); cam.addChildNode(rig)
        }

        // MARK: Held tool mesh (rebuilds when the equipped tool changes)

        private var lastToolID: UUID?
        private var lastSwingSeen = 0

        func tierColor(_ name: String) -> UIColor {
            if name.contains("Netherite") { return UIColor(red: 0.35, green: 0.15, blue: 0.15, alpha: 1) }
            if name.contains("Diamond") { return UIColor(red: 0.3, green: 0.85, blue: 0.95, alpha: 1) }
            if name.contains("Iron") { return UIColor(red: 0.8, green: 0.8, blue: 0.85, alpha: 1) }
            if name.contains("Stone") { return UIColor(red: 0.5, green: 0.5, blue: 0.52, alpha: 1) }
            return UIColor(red: 0.6, green: 0.42, blue: 0.22, alpha: 1)
        }

        func buildToolMesh(_ tool: GYTool) -> SCNNode {
            let root = SCNNode(); root.name = "toolMesh"
            let wood = UIColor(red: 0.55, green: 0.38, blue: 0.2, alpha: 1)
            let head = tierColor(tool.name)
            func part(_ w: CGFloat, _ h: CGFloat, _ l: CGFloat, _ c: UIColor, _ p: SCNVector3, _ e: SCNVector3 = SCNVector3(0, 0, 0)) -> SCNNode {
                let n = SCNNode(geometry: SCNBox(width: w, height: h, length: l, chamferRadius: 0.005))
                n.geometry?.firstMaterial?.diffuse.contents = c
                n.position = p; n.eulerAngles = e; return n
            }
            switch tool.type {
            case .pickaxe:
                root.addChildNode(part(0.05, 0.5, 0.05, wood, SCNVector3(0, 0.1, 0), SCNVector3(0.15, 0, 0)))
                root.addChildNode(part(0.34, 0.06, 0.06, head, SCNVector3(0, 0.35, -0.04)))
                root.addChildNode(part(0.06, 0.12, 0.06, head, SCNVector3(-0.17, 0.31, -0.04), SCNVector3(0, 0, 0.5)))
                root.addChildNode(part(0.06, 0.12, 0.06, head, SCNVector3(0.17, 0.31, -0.04), SCNVector3(0, 0, -0.5)))
            case .axe:
                root.addChildNode(part(0.05, 0.5, 0.05, wood, SCNVector3(0, 0.1, 0), SCNVector3(0.15, 0, 0)))
                root.addChildNode(part(0.05, 0.14, 0.14, head, SCNVector3(0.07, 0.32, -0.04)))
            case .shovel:
                root.addChildNode(part(0.05, 0.46, 0.05, wood, SCNVector3(0, 0.08, 0), SCNVector3(0.15, 0, 0)))
                root.addChildNode(part(0.11, 0.16, 0.03, head, SCNVector3(0, 0.36, -0.05)))
            case .sword:
                root.addChildNode(part(0.16, 0.035, 0.05, wood, SCNVector3(0, 0.02, 0)))
                root.addChildNode(part(0.06, 0.44, 0.035, head, SCNVector3(0, 0.26, 0)))
            case .hoe:
                root.addChildNode(part(0.05, 0.46, 0.05, wood, SCNVector3(0, 0.08, 0), SCNVector3(0.15, 0, 0)))
                root.addChildNode(part(0.14, 0.05, 0.05, head, SCNVector3(0.07, 0.32, -0.04)))
            case .shears:
                root.addChildNode(part(0.04, 0.3, 0.04, head, SCNVector3(-0.03, 0.1, 0), SCNVector3(0, 0, 0.15)))
                root.addChildNode(part(0.04, 0.3, 0.04, head, SCNVector3(0.03, 0.1, 0), SCNVector3(0, 0, -0.15)))
            case .none:
                break
            }
            return root
        }

        func refreshHeldTool() {
            guard let rig = scene.rootNode.childNode(withName: "handRig", recursively: true) else { return }
            let cur = manager.player.equippedTool?.id
            if cur == lastToolID { return }
            lastToolID = cur
            rig.childNode(withName: "toolMesh", recursively: false)?.removeFromParentNode()
            if let t = manager.player.equippedTool {
                rig.addChildNode(buildToolMesh(t))
            }
        }

        /// Quick jab swing whenever Mine / Attack is tapped.
        func playSwing() {
            guard let rig = scene.rootNode.childNode(withName: "handRig", recursively: true) else { return }
            rig.removeAction(forKey: "swing")
            let jab = SCNAction.group([
                SCNAction.moveBy(x: 0, y: -0.12, z: -0.18, duration: 0.09),
                SCNAction.rotateBy(x: -0.5, y: 0, z: 0, duration: 0.09)
            ])
            let back = SCNAction.group([
                SCNAction.moveBy(x: 0, y: 0.12, z: 0.18, duration: 0.14),
                SCNAction.rotateBy(x: 0.5, y: 0, z: 0, duration: 0.14)
            ])
            rig.runAction(SCNAction.sequence([jab, back]), forKey: "swing")
        }

        /// Translucent outline on the crosshair-targeted block.
        func updateTargetHighlight() {
            var node = scene.rootNode.childNode(withName: "targetHL", recursively: false)
            if node == nil {
                let g = SCNBox(width: 1.02, height: 1.02, length: 1.02, chamferRadius: 0.0)
                let m = SCNMaterial(); m.diffuse.contents = UIColor.white; m.transparency = 0.22; m.emission.contents = UIColor.white
                g.materials = [m]
                node = SCNNode(geometry: g); node!.name = "targetHL"
                scene.rootNode.addChildNode(node!)
            }
            guard let i = manager.crosshairTarget,
                  manager.blocks.indices.contains(i),
                  !manager.blocks[i].isDestroyed else {
                node?.isHidden = true; return
            }
            node?.isHidden = false
            node?.position = manager.blocks[i].position
        }

        func rebuild() {
            let explored = manager.crypts.filter { $0.isExplored }.count
            // Structural hash EXCLUDES ghosts + damage: those sync incrementally,
            // so taps and ghost spawns never trigger a full scene rebuild.
            let structHash = (explored << 16) ^ (manager.blocks.count << 4)
            if structHash != lastBuildHash {
                lastBuildHash = structHash
                for b in manager.blocks where b.isDestroyed && !destroyedBlockIds.contains(b.id) {
                    spawnBreakParticles(at: b.position, color: blockColor(b.type))
                    destroyedBlockIds.insert(b.id)
                }
                destroyedBlockIds = destroyedBlockIds.intersection(manager.blocks.map { $0.id })
                for child in scene.rootNode.childNodes where ["block", "crypt"].contains(child.name ?? "") {
                    child.removeFromParentNode()
                }
                for b in manager.blocks where !b.isDestroyed {
                    scene.rootNode.addChildNode(blockNode(b))
                }
                for c in manager.crypts where !c.isExplored { scene.rootNode.addChildNode(cryptNode(c)) }
            } else if manager.damageTick != lastDamageTick {
                lastDamageTick = manager.damageTick
                refreshHitBlock()
            }
            syncDynamicNodes()
        }

        /// Redraw (or remove) only the last-mined block — no full rebuild.
        func refreshHitBlock() {
            guard let idx = manager.lastHitIndex, manager.blocks.indices.contains(idx) else { return }
            let b = manager.blocks[idx]
            for child in scene.rootNode.childNodes where child.name == "block" {
                let p = child.position
                if p.x == b.position.x && p.y == b.position.y && p.z == b.position.z {
                    child.removeFromParentNode()
                    break
                }
            }
            if b.isDestroyed {
                if !destroyedBlockIds.contains(b.id) {
                    destroyedBlockIds.insert(b.id)
                    spawnBreakParticles(at: b.position, color: blockColor(b.type))
                }
            } else {
                scene.rootNode.addChildNode(blockNode(b))
            }
        }

        func sync() { rebuild() }

        func syncDynamicNodes() {
            if let lt = scene.rootNode.childNode(withName: "playerLight", recursively: false) {
                lt.position = SCNVector3(manager.player.position.x, manager.player.position.y + 1.6, manager.player.position.z)
            }
            updateCamera()
            updatePlayerNode()
            refreshHeldTool()
            if manager.swingId != lastSwingSeen { lastSwingSeen = manager.swingId; playSwing() }
            updateTargetHighlight()
            // Ghosts glide every frame: snap x/z, ease y (bob animation offset).
            let ghostNodes = scene.rootNode.childNodes.filter { $0.name == "ghost" }
            for (i, g) in manager.ghosts.enumerated() {
                if i < ghostNodes.count {
                    var p = ghostNodes[i].position
                    p.x = g.position.x; p.z = g.position.z
                    p.y += (g.position.y - p.y) * 0.2
                    ghostNodes[i].position = p
                }
            }
            if ghostNodes.count > manager.ghosts.count {
                for n in ghostNodes.dropFirst(manager.ghosts.count) { n.removeFromParentNode() }
            } else if ghostNodes.count < manager.ghosts.count {
                for g in manager.ghosts.dropFirst(ghostNodes.count) {
                    scene.rootNode.addChildNode(ghostNode(g))
                }
            }
        }

        func updateCamera() {
            guard let cam = scene.rootNode.childNode(withName: "camera", recursively: false) else { return }
            let p = manager.player
            // Orbit radius: 2m back + vertical offset from pitch
            let r = 2.0 + sin(p.pitch) * 0.5
            let a = p.yaw + Float.pi // invert so 0° faces +z (forward) in world
            cam.position = SCNVector3(p.position.x + r * sin(a), p.position.y + 1.6 + r * sin(p.pitch) * 0.25, p.position.z + r * cos(a))
            // Face the player's head directly — no Euler-order guesswork, no constraint churn.
            cam.look(at: SCNVector3(p.position.x, p.position.y + 1.6, p.position.z))
        }

        func updatePlayerNode() {
            if let p = scene.rootNode.childNode(withName: "player", recursively: false) {
                p.position = manager.player.position
                p.eulerAngles.y = manager.player.yaw
            } else {
                scene.rootNode.addChildNode(playerNode())
            }
        }

        func ghostNode(_ g: GYGhost) -> SCNNode {
            let root = SCNNode()
            root.name = "ghost"
            root.position = g.position
            
            // Ghost body: tapered capsule (wider at bottom, narrower at top)
            let body = SCNNode(geometry: SCNCapsule(capRadius: g.isBoss ? 0.5 : 0.35, height: g.isBoss ? 1.2 : 0.8))
            
            // State-based color with transparency gradient
            let color: UIColor
            switch g.state {
            case .idle: color = UIColor(white: 0.3, alpha: 0.8)
            case .wandering: color = UIColor(white: 0.5, alpha: 0.85)
            case .chasing: color = UIColor(red: 1, green: 0.3, blue: 0.2, alpha: 0.9)
            case .attacking: color = UIColor(red: 1, green: 0.5, blue: 0.1, alpha: 0.95)
            case .stunned: color = UIColor(white: 0.8, alpha: 0.4)
            }
            body.geometry?.firstMaterial?.diffuse.contents = color
            body.geometry?.firstMaterial?.transparency = g.isStunned ? 0.3 : 0.7
            body.geometry?.firstMaterial?.emission.contents = color
            root.addChildNode(body)

            // Fat near-invisible tap target (fingers miss small ghost bodies).
            let proxy = SCNNode(geometry: SCNSphere(radius: g.isBoss ? 1.0 : 0.8))
            let pm = SCNMaterial()
            pm.diffuse.contents = UIColor.white
            pm.transparency = 0.01
            proxy.geometry?.materials = [pm]
            proxy.name = "ghostTap"
            root.addChildNode(proxy)

            // Floating animation — speed based on state
            let bobDuration: TimeInterval
            switch g.state {
            case .attacking: bobDuration = 0.5
            case .chasing: bobDuration = 0.7
            case .wandering: bobDuration = 1.0
            case .stunned: bobDuration = 1.5
            case .idle: bobDuration = 0.9
            }
            root.runAction(.repeatForever(.sequence([
                .moveBy(x: 0, y: 0.2, z: 0, duration: bobDuration),
                .moveBy(x: 0, y: -0.2, z: 0, duration: bobDuration)
            ])))
            
            // State-based particle aura
            if g.state == .chasing || g.state == .attacking {
                let aura = SCNNode()
                aura.name = "aura"
                for i in 0..<5 {
                    let spark = SCNNode(geometry: SCNSphere(radius: 0.03))
                    spark.geometry?.firstMaterial?.diffuse.contents = color.withAlphaComponent(CGFloat(0.5) - CGFloat(i) * 0.1)
                    spark.position = SCNVector3(
                        CGFloat(cos(Double(i) * 0.628) * 0.15),
                        0,
                        CGFloat(sin(Double(i) * 0.628) * 0.15)
                    )
                    aura.addChildNode(spark)
                }
                aura.position = SCNVector3(0, 0.3, 0)
                root.addChildNode(aura)
                // Animate spark particles orbiting the ghost
                aura.runAction(.repeatForever(.rotateBy(x: 0, y: 0, z: CGFloat(Float.pi * 2), duration: 8.0)))
            }
            
            // Glowing eyes for non-stunned states
            if !g.isStunned {
                let eyeColor: UIColor = g.state == .attacking ? .red : .yellow
                for side in [-0.15, 0.15] {
                    let eye = SCNNode(geometry: SCNSphere(radius: 0.08))
                    eye.geometry?.firstMaterial?.diffuse.contents = eyeColor
                    eye.geometry?.firstMaterial?.emission.contents = eyeColor
                    eye.position = SCNVector3(side, 0.15, 0.25)
                    root.addChildNode(eye)
                }
            }
            
            // Boss crown/halo for boss ghosts
            if g.isBoss {
                let halo = SCNNode(geometry: SCNTorus(ringRadius: 0.25, pipeRadius: 0.05))
                halo.geometry?.firstMaterial?.diffuse.contents = UIColor.red
                halo.geometry?.firstMaterial?.emission.contents = UIColor.red
                halo.position = SCNVector3(0, 0.6, 0)
                root.addChildNode(halo)
            }
            
            // Subtle rotation for chasing state
            if g.state == .chasing {
                root.eulerAngles.y = Float(sin(CACurrentMediaTime() * 2) * 0.1)
            }
            
            return root
        }

        func cryptNode(_ c: GYCrypt) -> SCNNode {
            let box = SCNBox(width: 1.5, height: 1.0, length: 1.5, chamferRadius: 0.05)
            box.materials.first?.diffuse.contents = UIColor.darkGray
            let n = SCNNode(geometry: box)
            n.position = c.position
            n.name = "crypt"
            return n
        }

        func blockColor(_ t: GYBlockType) -> UIColor {
            switch t {
            case .dirt: return .brown
            case .grass: return .systemGreen
            case .stone, .cobblestone, .stoneBricks: return .lightGray
            case .mossyStone, .mossyBricks: return UIColor(red: 0.4, green: 0.6, blue: 0.3, alpha: 1)
            case .gravel: return .lightGray
            case .sand: return .systemYellow
            case .wood: return UIColor(red: 0.6, green: 0.4, blue: 0.2, alpha: 1)
            case .oakPlanks: return UIColor(red: 0.7, green: 0.5, blue: 0.3, alpha: 1)
            case .crackedBricks: return .darkGray
            case .ironBars: return UIColor(red: 0.7, green: 0.7, blue: 0.8, alpha: 1)
            case .goldOre: return UIColor(red: 0.9, green: 0.8, blue: 0.3, alpha: 1)
            case .ironOre: return UIColor(red: 0.8, green: 0.7, blue: 0.6, alpha: 1)
            case .diamondOre: return UIColor(red: 0.3, green: 0.8, blue: 0.9, alpha: 1)
            case .emeraldOre: return UIColor(red: 0.2, green: 0.8, blue: 0.4, alpha: 1)
            case .coalOre: return .black
            case .redstoneOre: return UIColor(red: 0.8, green: 0.2, blue: 0.2, alpha: 1)
            case .lapisOre: return UIColor(red: 0.2, green: 0.2, blue: 0.8, alpha: 1)
            case .obsidian: return UIColor(red: 0.1, green: 0.05, blue: 0.2, alpha: 1)
            case .bedrock: return UIColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1)
            case .soulSand: return UIColor(red: 0.3, green: 0.2, blue: 0.1, alpha: 1)
            case .netherrack: return UIColor(red: 0.6, green: 0.1, blue: 0.1, alpha: 1)
            case .glowstone: return UIColor(red: 0.9, green: 0.8, blue: 0.4, alpha: 1)
            case .pumpkin: return .orange
            case .jackOLantern: return UIColor(red: 0.9, green: 0.5, blue: 0.1, alpha: 1)
            case .tombstone: return .lightGray
            case .cryptDoor, .coffin, .grave: return UIColor(red: 0.3, green: 0.2, blue: 0.1, alpha: 1)
            case .skeletonSkull, .bone, .skull: return .white
            case .spiderWeb, .cobweb: return UIColor(white: 0.8, alpha: 1)
            case .torch: return UIColor(red: 0.9, green: 0.6, blue: 0.1, alpha: 1)
            case .lantern: return UIColor(red: 0.9, green: 0.8, blue: 0.3, alpha: 1)
            case .ghostBlock: return UIColor(white: 1, alpha: 1)
            case .clay: return UIColor(red: 0.7, green: 0.6, blue: 0.5, alpha: 1)
            case .oakWood: return UIColor(red: 0.6, green: 0.4, blue: 0.2, alpha: 1)
            case .spruceWood: return UIColor(red: 0.4, green: 0.2, blue: 0.1, alpha: 1)
            case .birchWood: return UIColor(red: 0.9, green: 0.8, blue: 0.7, alpha: 1)
            case .jungleWood: return UIColor(red: 0.7, green: 0.3, blue: 0.1, alpha: 1)
            case .sprucePlanks: return UIColor(red: 0.5, green: 0.3, blue: 0.2, alpha: 1)
            case .birchPlanks: return UIColor(red: 0.9, green: 0.8, blue: 0.7, alpha: 1)
            case .junglePlanks: return UIColor(red: 0.7, green: 0.4, blue: 0.2, alpha: 1)
            case .chiseledBricks, .polishedStone, .smoothStone: return .lightGray
            case .netheriteOre: return UIColor(red: 0.5, green: 0.2, blue: 0.1, alpha: 1)
            case .copperOre: return UIColor(red: 0.8, green: 0.6, blue: 0.2, alpha: 1)
            case .netherBrick: return UIColor(red: 0.4, green: 0.1, blue: 0.1, alpha: 1)
            case .magma: return UIColor(red: 0.8, green: 0.4, blue: 0.1, alpha: 1)
            case .eerieStone: return UIColor(red: 0.3, green: 0.3, blue: 0.4, alpha: 1)
            case .cursedSoil: return UIColor(red: 0.1, green: 0.05, blue: 0.1, alpha: 1)
            case .hauntedBrick: return UIColor(red: 0.4, green: 0.3, blue: 0.4, alpha: 1)
            case .fence, .gate: return UIColor(red: 0.5, green: 0.3, blue: 0.2, alpha: 1)
            case .stairs, .slab, .wall: return .lightGray
            case .chest, .craftingTable: return UIColor(red: 0.6, green: 0.4, blue: 0.2, alpha: 1)
            case .furnace: return UIColor(red: 0.3, green: 0.3, blue: 0.3, alpha: 1)
            case .anvil: return UIColor(red: 0.4, green: 0.4, blue: 0.4, alpha: 1)
            case .enchantmentTable: return UIColor(red: 0.5, green: 0.2, blue: 0.5, alpha: 1)
            case .beacon: return UIColor(red: 0.4, green: 0.4, blue: 0.8, alpha: 1)
            case .enderChest: return UIColor(red: 0.1, green: 0.1, blue: 0.3, alpha: 1)
            }
        }

        // One shared box per block TYPE (thousands of blocks, ~60 geometries).
        // Damage shows via crack overlays only — never bake it into materials.
        private var boxCache: [GYBlockType: SCNBox] = [:]

        func matsFor(_ t: GYBlockType) -> [SCNMaterial] {
            let bc = blockColor(t)
            var br: CGFloat = 0.5, bg: CGFloat = 0.5, bb: CGFloat = 0.5, ba: CGFloat = 1
            if !bc.getRed(&br, green: &bg, blue: &bb, alpha: &ba) {
                br = 0.5; bg = 0.5; bb = 0.5; ba = 1
            }
            func shade(_ mul: CGFloat, _ add: CGFloat) -> UIColor {
                UIColor(red: min(max(br*mul+add, 0), 1),
                        green: min(max(bg*mul+add, 0), 1),
                        blue: min(max(bb*mul+add, 0), 1), alpha: 1)
            }
            // SCNBox starts with ONE shared material — build six explicit
            // materials or materials[1] crashes (this was the open-crash).
            let mats: [SCNMaterial] = [
                { let m = SCNMaterial(); m.diffuse.contents = shade(0.5, 0.5); return m }(),
                { let m = SCNMaterial(); m.diffuse.contents = shade(0.5, 0.2); return m }(),
                { let m = SCNMaterial(); m.diffuse.contents = shade(0.7, 0.3); return m }(),
                { let m = SCNMaterial(); m.diffuse.contents = shade(0.7, 0.7); return m }(),
                { let m = SCNMaterial(); m.diffuse.contents = bc; return m }(),
                { let m = SCNMaterial(); m.diffuse.contents = shade(0.7, 0.4); return m }(),
            ]
            if t.isTransparent { mats[0].transparency = 0.55 }
            if t == .torch || t == .lantern || t == .glowstone || t == .magma || t == .beacon || t == .jackOLantern {
                for i in 0..<6 { mats[i].emission.contents = blockColor(t) }
            }
            return mats
        }

        func boxFor(_ t: GYBlockType) -> SCNBox {
            if let b = boxCache[t] { return b }
            let box = SCNBox(width: 0.95, height: 0.95, length: 0.95, chamferRadius: 0.01)
            box.materials = matsFor(t)
            boxCache[t] = box
            return box
        }

        func blockNode(_ b: GYBlock) -> SCNNode {
            // One node for this block; cracks attach to IT (not throwaways).
            let block = SCNNode(geometry: boxFor(b.type)); block.position = b.position; block.name = "block"
            // ---- CRACK VISUALIZATION (Minecraft-style) ----
            let damageRatio = min(b.damage / (b.maxHealth * 10.0), 1.0)
            let stage = min(Int(damageRatio * 4.0), 3)  // 0=full, 1=crack stage 1, 2=crack stage 2, 3=almost broken
            if stage > 0 {
                let crackMaterial = SCNMaterial()
                crackMaterial.diffuse.contents = UIColor.black
                crackMaterial.transparency = min(CGFloat(stage) * 0.33, 1.0)
                // Add crack planes based on stage
                if stage >= 1 {
                    // Front face vertical crack
                    let crack = SCNNode(geometry: SCNPlane(width: 0.95, height: 0.95))
                    crack.geometry?.firstMaterial = crackMaterial
                    crack.position = SCNVector3(0, 0, 0.48)
                    block.addChildNode(crack)
                    // Rotate to vertical
                    crack.eulerAngles = SCNVector3(0, 0, 0)
                }
                if stage >= 2 {
                    // Back face vertical crack
                    let crack2 = SCNNode(geometry: SCNPlane(width: 0.95, height: 0.95))
                    crack2.geometry?.firstMaterial = crackMaterial
                    crack2.position = SCNVector3(0, 0, -0.48)
                    block.addChildNode(crack2)
                    crack2.eulerAngles = SCNVector3(0, 0, 0)
                }
                if stage >= 3 {
                    // Cross crack (X shape) on top
                    let crossMat = SCNMaterial()
                    crossMat.diffuse.contents = UIColor.black
                    crossMat.transparency = 0.8
                    // Vertical cross bar
                    let vBar = SCNNode(geometry: SCNPlane(width: 0.3, height: 0.95))
                    vBar.geometry?.firstMaterial = crossMat
                    vBar.position = SCNVector3(0, 0, 0)
                    vBar.eulerAngles = SCNVector3(0, 0, 0)
                    block.addChildNode(vBar)
                    // Horizontal cross bar
                    let hBar = SCNNode(geometry: SCNPlane(width: 0.95, height: 0.3))
                    hBar.geometry?.firstMaterial = crossMat
                    hBar.position = SCNVector3(0, 0, 0)
                    hBar.eulerAngles = SCNVector3(0, Float.pi/2, 0)
                    block.addChildNode(hBar)
                }
            }
            // NOTE: no color fade here — materials are shared per type, so cracks
            // alone carry the damage read (baking fade in would tint every block).
            return block
        }

        func playerNode() -> SCNNode {
            let root = SCNNode(); root.name = "player"
            let arm = SCNNode(geometry: SCNBox(width: 0.25, height: 0.5, length: 0.2, chamferRadius: 0.02))
            arm.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.8, green: 0.6, blue: 0.4, alpha: 1)
            arm.position = SCNVector3(0.3, -0.15, 0.5); root.addChildNode(arm)
            let fist = SCNNode(geometry: SCNSphere(radius: 0.15))
            fist.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.9, green: 0.7, blue: 0.5, alpha: 1)
            fist.position = SCNVector3(0.4, -0.15, 0.6); root.addChildNode(fist)
            root.position = manager.player.position
            root.eulerAngles.y = manager.player.yaw
            return root
        }

        /// Block shatter: chunky mini-cubes fling out, tumble, fall and fade —
        /// everything gone 2 seconds after the break.
        func spawnBreakParticles(at pos: SCNVector3, color: UIColor) {
            let burst = SCNNode(); burst.position = pos; burst.name = "breakParticles"
            for _ in 0..<12 {
                let s = CGFloat.random(in: 0.1...0.22)
                let chunk = SCNNode(geometry: SCNBox(width: s, height: s, length: s, chamferRadius: 0.01))
                chunk.geometry?.firstMaterial?.diffuse.contents = color
                let angle = Float.random(in: 0...6.28)
                let out = Float.random(in: 0.8...2.2)
                let dx = CGFloat(cos(angle) * out), dz = CGFloat(sin(angle) * out)
                // Phase 1 (0.5s): pop up and outward, tumbling.
                // Phase 2 (1.5s): drop, drift out, fade away.
                let pop = SCNAction.group([
                    SCNAction.moveBy(x: dx * 0.5, y: CGFloat(Float.random(in: 0.8...1.6)), z: dz * 0.5, duration: 0.5),
                    SCNAction.rotateBy(x: CGFloat(Float.random(in: -3...3)), y: CGFloat(Float.random(in: -3...3)), z: 0, duration: 0.5)
                ])
                pop.timingMode = .easeOut
                let fall = SCNAction.group([
                    SCNAction.moveBy(x: dx * 0.5, y: CGFloat(Float.random(in: -2.2 ... -1.2)), z: dz * 0.5, duration: 1.5),
                    SCNAction.rotateBy(x: CGFloat(Float.random(in: -4...4)), y: CGFloat(Float.random(in: -4...4)), z: 0, duration: 1.5),
                    SCNAction.fadeOut(duration: 1.5)
                ])
                fall.timingMode = .easeIn
                chunk.runAction(SCNAction.sequence([pop, fall])); burst.addChildNode(chunk)
            }
            scene.rootNode.addChildNode(burst)
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { burst.removeFromParentNode() }
        }
    }
}

// ============================================================
// MARK: - Main Graveyard View (Arcade-compatible)
// ============================================================

struct SpookyGraveyardView: View {
    @EnvironmentObject var ultimate: HalloweenUltimateManager
    @Environment(\.dismiss) private var dismiss
    @StateObject private var manager = GraveyardManager()
    @State private var showInventory = false
    @State private var didBank = false
    var onDone: (() -> Void)? = nil

    var body: some View {
        ZStack {
            GraveyardSceneView(manager: manager)
                .ignoresSafeArea()

            // Crosshair: what Mine / Attack / Place will hit.
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

            VStack(spacing: 0) {
                // Slim top bar: back + title/stats + health in ONE row.
                HStack(spacing: 8) {
                    Button(action: { close() }) {
                        Image(systemName: "chevron.left").font(.subheadline.bold())
                            .foregroundColor(.white)
                            .padding(.horizontal, 10).padding(.vertical, 6)
                            .background(Color.black.opacity(0.65)).cornerRadius(8)
                    }
                    VStack(spacing: 0) {
                        Text("🪦 Graveyard 3D").font(.subheadline.bold()).foregroundColor(.white)
                        Text("Lv.\(manager.player.level) • 💰\(manager.player.gold) • 👻\(manager.player.ghostsDefeated) • 🧭\(Int((manager.player.yaw * 180 / Float.pi).truncatingRemainder(dividingBy: 360)))°")
                            .font(.system(size: 9)).foregroundColor(.white.opacity(0.85))
                        if manager.isStormActive {
                            Text("🌩️ SPIRIT STORM").font(.system(size: 9).bold()).foregroundColor(.yellow)
                        }
                    }
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Color.purple.opacity(0.7)).cornerRadius(8)
                    .animation(.easeInOut, value: manager.isStormActive)
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill").foregroundColor(.red).font(.caption2)
                        Text("\(manager.player.health)/\(manager.player.maxHealth)").foregroundColor(.white).font(.caption2.bold())
                    }
                    .padding(.horizontal, 8).padding(.vertical, 6)
                    .background(Color.black.opacity(0.7)).cornerRadius(8)
                    VStack(alignment: .trailing, spacing: 0) {
                        Text("⛏️\(manager.player.blocksMined)").font(.system(size: 9)).foregroundColor(.white)
                        Text("🏚️\(manager.player.cryptsExplored)").font(.system(size: 9)).foregroundColor(.white)
                        Text("🍗\(manager.player.hunger)/\(manager.player.maxHunger)").font(.system(size: 9)).foregroundColor(.orange)
                    }
                    .padding(.horizontal, 6).padding(.vertical, 4)
                    .background(Color.black.opacity(0.7)).cornerRadius(8)
                }
                .padding(.horizontal, 8)
                .padding(.top, 4)


                // Move + rotate row (drag empty space to orbit too)
                HStack(alignment: .top) {
                    // Left: camera orbit (blue) + self-turn (green)
                    VStack(spacing: 6) {
                        HStack(spacing: 6) {
                            Button(action: { manager.rotateCamera(-0.5); ultimate.triggerHaptic(.light) }) {
                                Image(systemName: "rotate.left.fill").font(.title3.bold())
                                    .frame(width: 44, height: 36)
                                    .background(Color.blue.opacity(0.85)).foregroundColor(.white).cornerRadius(8)
                            }
                            Button(action: { manager.rotateCamera(0.5); ultimate.triggerHaptic(.light) }) {
                                Image(systemName: "rotate.right.fill").font(.title3.bold())
                                    .frame(width: 44, height: 36)
                                    .background(Color.blue.opacity(0.85)).foregroundColor(.white).cornerRadius(8)
                            }
                        }
                        HStack(spacing: 6) {
                            Button(action: { manager.turnPlayer(-Float.pi / 2); ultimate.triggerHaptic(.medium) }) {
                                Image(systemName: "arrow.uturn.left").font(.title3.bold())
                                    .frame(width: 44, height: 36)
                                    .background(Color.green.opacity(0.85)).foregroundColor(.white).cornerRadius(8)
                            }
                            Button(action: { manager.turnPlayer(Float.pi / 2); ultimate.triggerHaptic(.medium) }) {
                                Image(systemName: "arrow.uturn.right").font(.title3.bold())
                                    .frame(width: 44, height: 36)
                                    .background(Color.green.opacity(0.85)).foregroundColor(.white).cornerRadius(8)
                            }
                        }
                        Text("📷 look · 🚶 turn 90°")
                            .font(.system(size: 8)).foregroundColor(.white.opacity(0.7))
                    }
                    .padding(.leading, 8)
                    .padding(.top, 6)

                    Spacer()
                    VStack(spacing: 6) {
                        Button(action: {}) {
                            Image(systemName: "arrow.up").font(.title3.bold())
                                .frame(width: 44, height: 36)
                                .background(Color.orange.opacity(0.85)).foregroundColor(.white).cornerRadius(8)
                        }
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { _ in manager.startMoving(dx: 0, dz: -1) }
                                .onEnded { _ in manager.stopMoving() }
                        )
                        HStack(spacing: 6) {
                        Button(action: {}) {
                            Image(systemName: "arrow.left").font(.title3.bold())
                                .frame(width: 44, height: 36)
                                .background(Color.orange.opacity(0.85)).foregroundColor(.white).cornerRadius(8)
                        }
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { _ in manager.startMoving(dx: -1, dz: 0) }
                                .onEnded { _ in manager.stopMoving() }
                        )
                        Button(action: {}) {
                            Image(systemName: "arrow.down").font(.title3.bold())
                                .frame(width: 44, height: 36)
                                .background(Color.orange.opacity(0.85)).foregroundColor(.white).cornerRadius(8)
                        }
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { _ in manager.startMoving(dx: 0, dz: 1) }
                                .onEnded { _ in manager.stopMoving() }
                        )
                        Button(action: {}) {
                            Image(systemName: "arrow.right").font(.title3.bold())
                                .frame(width: 44, height: 36)
                                .background(Color.orange.opacity(0.85)).foregroundColor(.white).cornerRadius(8)
                        }
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { _ in manager.startMoving(dx: 1, dz: 0) }
                                .onEnded { _ in manager.stopMoving() }
                        )
                        }
                    }
                    .padding(.trailing, 8)
                    .padding(.top, 6)
                }

                // Drag on the 3D view itself to look (SceneKit pan gesture).
                Spacer()

                // Targeted-block mining progress (live while aiming).
                if let ti = manager.crosshairTarget,
                   manager.blocks.indices.contains(ti),
                   !manager.blocks[ti].isDestroyed {
                    let bt = manager.blocks[ti].type
                    let th = manager.breakThreshold(for: bt)
                    HStack(spacing: 8) {
                        Text("\(bt.emoji) \(bt.shortName)").font(.caption.bold()).foregroundColor(.white)
                        ProgressView(value: Double(min(manager.blocks[ti].damage / th, 1.0)))
                            .progressViewStyle(LinearProgressViewStyle(tint: .green))
                            .frame(maxWidth: 140)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.65))
                    .cornerRadius(8)
                    .padding(.bottom, 4)
                }

                // Tool strip
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(manager.tools) { tool in
                            Button(action: {
                                manager.player.equippedTool = tool
                                ultimate.triggerHaptic(.light)
                            }) {
                                VStack(spacing: 2) {
                                    Text(tool.type.emoji).font(.title2)
                                    Text(tool.name).font(.system(size: 9)).foregroundColor(.white).lineLimit(1)
                                    Text("🔧\(tool.durability)").font(.system(size: 8)).foregroundColor(.white.opacity(0.75))
                                }
                                .padding(4)
                                .frame(width: 70)
                                .background(manager.player.equippedTool?.id == tool.id ? Color.orange.opacity(0.55) : Color.black.opacity(0.55))
                                .cornerRadius(10)
                            }
                        }
                    }
                    .padding(.horizontal, 8)
                }

                // Actions
                HStack(spacing: 8) {
                    Button(action: {
                        manager.mineTargeted()
                        ultimate.triggerHaptic(.medium)
                    }) {
                        Label("Mine", systemImage: "hammer.fill")
                            .font(.caption.bold())
                            .padding(10).frame(maxWidth: .infinity)
                            .background(Color.gray.opacity(0.85)).foregroundColor(.white).cornerRadius(10)
                    }
                    Button(action: {
                        manager.attackNearestGhost()
                        ultimate.triggerHaptic(.medium)
                    }) {
                        Label("Attack", systemImage: "sword.fill")
                            .font(.caption.bold())
                            .padding(10).frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.85)).foregroundColor(.white).cornerRadius(10)
                    }
                    Button(action: {
                        _ = manager.placeBlock()
                        ultimate.triggerHaptic(.medium)
                    }) {
                        Label("Place", systemImage: "plus.square.fill")
                            .font(.caption.bold())
                            .padding(10).frame(maxWidth: .infinity)
                            .background(Color.green.opacity(0.85)).foregroundColor(.white).cornerRadius(10)
                    }
                    Button(action: {
                        manager.exploreNearestCrypt()
                        ultimate.triggerHaptic(.medium)
                    }) {
                        Label("Crypt", systemImage: "door.left.hand.open")
                            .font(.caption.bold())
                            .padding(10).frame(maxWidth: .infinity)
                            .background(Color.purple.opacity(0.85)).foregroundColor(.white).cornerRadius(10)
                    }
                    Button(action: {
                        manager.eatFood()
                        ultimate.triggerHaptic(.light)
                    }) {
                        Label("Eat", systemImage: "fork.knife")
                            .font(.caption.bold())
                            .padding(10).frame(maxWidth: .infinity)
                            .background(Color.orange.opacity(0.85)).foregroundColor(.white).cornerRadius(10)
                    }
                    Button(action: { showInventory.toggle() }) {
                        Image(systemName: "backpack.fill")
                            .padding(10)
                            .background(Color.blue.opacity(0.85)).foregroundColor(.white).cornerRadius(10)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
                .background(Color.black.opacity(0.55))

                // Feed lives at the top now — this spacer keeps bottom controls clear.
                Spacer()
            }
        }
        .navigationTitle("🪦 Graveyard 3D")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if onDone != nil {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { close() }
                }
            }
        }
        .sheet(isPresented: $showInventory) {
            GraveyardInventoryView().environmentObject(manager)
        }
        .onAppear {
            manager.onEvent = { event in
                switch event {
                case .minedOre(let name, let n):
                    ultimate.gold += n * 5
                    ultimate.experience += n * 8
                    ultimate.score += n * 10
                    ultimate.addNotification("⛏️ Graveyard ore: \(name) x\(n)!")
                    ultimate.checkLevelUp()
                case .defeatedGhost(let name, let isBoss):
                    ultimate.gold += isBoss ? 60 : 12
                    ultimate.experience += isBoss ? 120 : 30
                    ultimate.score += isBoss ? 300 : 50
                    ultimate.addNotification("🪦 Graveyard victory over \(name)!")
                    if let g = ultimate.ghosts.first {
                        _ = g
                    }
                    ultimate.checkLevelUp()
                    ultimate.checkAchievements()
                case .exploredCrypt(let name):
                    ultimate.gold += 40
                    ultimate.experience += 60
                    ultimate.score += 150
                    ultimate.addNotification("🏚️ Crypt cleared: \(name)! +40🪙")
                    ultimate.checkLevelUp()
                case .leveledUp(let lv):
                    ultimate.addNotification("⬆️ Graveyard rank \(lv)! The Ultimate crew salutes you!")
                }
            }
        }
        .onDisappear {
            // Bank graveyard progress into the Ultimate profile once per visit.
            bankOnce()
        }
    }

    func close() {
        bankOnce()
        if let onDone {
            onDone()
        } else {
            dismiss()
        }
    }

    func bankOnce() {
        guard !didBank else { return }
        didBank = true
        let s = manager.score
        if s > 0 {
            _ = ultimate.reportArcadeScore(.graveyard3D, score: s, gameName: "Graveyard 3D")
        }
    }

    func finishToUltimate() {
        bankOnce()
    }
}

struct GraveyardInventoryView: View {
    @EnvironmentObject var manager: GraveyardManager
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            VStack {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Level \(manager.player.level)").font(.headline)
                        Text("XP: \(manager.player.experience)").font(.caption)
                        Text("💀 Ghosts: \(manager.player.ghostsDefeated)").font(.caption)
                        Text("🏚️ Crypts: \(manager.player.cryptsExplored)").font(.caption)
                        Text("⛏️ Blocks: \(manager.player.blocksMined)").font(.caption)
                    }
                    Spacer()
                    VStack(alignment: .trailing) {
                        Text("❤️ \(manager.player.health)/\(manager.player.maxHealth)").foregroundColor(.red)
                        Text("🍗 \(manager.player.hunger)/\(manager.player.maxHunger)").foregroundColor(.orange)
                        Text("💰 \(manager.player.gold)").foregroundColor(.yellow)
                    }
                    .font(.caption)
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(12)
                .padding(.horizontal)

                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 84))], spacing: 12) {
                        ForEach(manager.player.inventory) { item in
                            VStack {
                                Text(item.type.emoji).font(.largeTitle)
                                Text(item.type.shortName).font(.caption).lineLimit(1)
                                Text("x\(item.quantity)").font(.caption2).foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color(.secondarySystemBackground))
                            .cornerRadius(10)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("🎒 Graveyard Pack")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

// ============================================================
// MARK: - Arcade Host (for Mini Games + Explore Worlds hub)
// ============================================================

struct GraveyardHostView: View {
    var onDone: () -> Void
    var body: some View {
        ArcadeShell(title: "🪦 Graveyard 3D", onDone: onDone) {
            SpookyGraveyardView(onDone: onDone)
        }
    }
}

#Preview {
    SpookyGraveyardView()
}
