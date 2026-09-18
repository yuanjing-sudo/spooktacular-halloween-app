//
//  ContentView.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Created by T Krobot on 22/6/26.
//

import SwiftUI
import Combine
import AVFoundation
import CoreHaptics
import StoreKit
import UserNotifications
import SpriteKit
import SceneKit
import MapKit
import PhotosUI
import WebKit
import GameController
import Network
import CoreML
import Vision
import ARKit
import MetalKit
import UIKit

// ============================================================
// MARK: - 1. ULTIMATE DATA MODELS (400+ Lines)
// ============================================================

// MARK: Ghost System (Extensive)
enum GhostType: String, CaseIterable {
    // Common Ghosts
    case poltergeist = "👻 Poltergeist"
    case specter = "👻 Specter"
    case phantom = "👻 Phantom"
    case wraith = "👻 Wraith"
    case banshee = "👻 Banshee"
    case ghoul = "🧟 Ghoul"
    case zombie = "🧟 Zombie"
    case mummy = "🧟 Mummy"

    // Uncommon Ghosts
    case vampire = "🧛 Vampire"
    case werewolf = "🐺 Werewolf"
    case witch = "🧙 Witch"
    case ghostKnight = "⚔️ Ghost Knight"
    case shadowDemon = "🌑 Shadow Demon"

    // Rare Ghosts
    case demonLord = "👿 Demon Lord"
    case ancientSpirit = "🏛️ Ancient Spirit"
    case dragonGhost = "🐉 Dragon Ghost"
    case necromancer = "💀 Necromancer"

    // Epic Ghosts
    case lichKing = "👑 Lich King"
    case voidBeast = "🌀 Void Beast"
    case timeWraith = "⏳ Time Wraith"
    case chaosDemon = "🔥 Chaos Demon"

    // Legendary Ghosts
    case halloweenKing = "🎃 Halloween King"
    case pumpkinLord = "🎃 Pumpkin Lord"
    case nightmare = "🌙 Nightmare"
    case voidEntity = "🌌 Void Entity"

    var rarity: GhostRarity {
        switch self {
        case .poltergeist, .specter, .phantom, .wraith, .banshee:
            return .common
        case .ghoul, .zombie, .mummy:
            return .common
        case .vampire, .werewolf, .witch, .ghostKnight, .shadowDemon:
            return .uncommon
        case .demonLord, .ancientSpirit, .dragonGhost, .necromancer:
            return .rare
        case .lichKing, .voidBeast, .timeWraith, .chaosDemon:
            return .epic
        case .halloweenKing, .pumpkinLord, .nightmare, .voidEntity:
            return .legendary
        }
    }

    var powerLevel: Int {
        switch rarity {
        case .common: return Int.random(in: 5...15)
        case .uncommon: return Int.random(in: 16...30)
        case .rare: return Int.random(in: 31...50)
        case .epic: return Int.random(in: 51...80)
        case .legendary: return Int.random(in: 81...150)
        }
    }

    var points: Int {
        switch rarity {
        case .common: return Int.random(in: 10...20)
        case .uncommon: return Int.random(in: 25...40)
        case .rare: return Int.random(in: 50...75)
        case .epic: return Int.random(in: 100...150)
        case .legendary: return Int.random(in: 300...500)
        }
    }

    var emoji: String {
        switch self {
        case .poltergeist: return "👻"
        case .specter: return "👻"
        case .phantom: return "👻"
        case .wraith: return "👻"
        case .banshee: return "👻"
        case .ghoul: return "🧟"
        case .zombie: return "🧟"
        case .mummy: return "🧟"
        case .vampire: return "🧛"
        case .werewolf: return "🐺"
        case .witch: return "🧙"
        case .ghostKnight: return "⚔️"
        case .shadowDemon: return "🌑"
        case .demonLord: return "👿"
        case .ancientSpirit: return "🏛️"
        case .dragonGhost: return "🐉"
        case .necromancer: return "💀"
        case .lichKing: return "👑"
        case .voidBeast: return "🌀"
        case .timeWraith: return "⏳"
        case .chaosDemon: return "🔥"
        case .halloweenKing: return "🎃"
        case .pumpkinLord: return "🎃"
        case .nightmare: return "🌙"
        case .voidEntity: return "🌌"
        }
    }

    var color: Color {
        switch rarity {
        case .common: return .gray
        case .uncommon: return .blue
        case .rare: return .purple
        case .epic: return .orange
        case .legendary: return .gold
        }
    }

    var specialAbility: String {
        switch self {
        case .banshee: return "Scream Attack - Stuns all ghosts"
        case .demonLord: return "Inferno - Burns all enemies"
        case .lichKing: return "Raise Dead - Revives fallen ghosts"
        case .timeWraith: return "Time Slow - Slows all movement"
        case .nightmare: return "Fear Aura - Reduces enemy stats"
        default: return "None"
        }
    }
}

enum GhostRarity: String, CaseIterable {
    case common = "Common"
    case uncommon = "Uncommon"
    case rare = "Rare"
    case epic = "Epic"
    case legendary = "Legendary"

    var color: Color {
        switch self {
        case .common: return .gray
        case .uncommon: return .blue
        case .rare: return .purple
        case .epic: return .orange
        case .legendary: return .gold
        }
    }

    var multiplier: Double {
        switch self {
        case .common: return 1.0
        case .uncommon: return 1.5
        case .rare: return 2.0
        case .epic: return 3.0
        case .legendary: return 5.0
        }
    }
}

// MARK: Candy System (Extensive)
enum CandyType: String, CaseIterable {
    // Standard Candies
    case chocolate = "🍫 Chocolate"
    case lollipop = "🍭 Lollipop"
    case gummi = "🐻 Gummi"
    case candyCorn = "🌽 Candy Corn"
    case licorice = "🖤 Licorice"
    case jawbreaker = "🔴 Jawbreaker"
    case taffy = "🍬 Taffy"
    case peppermint = "🍬 Peppermint"

    // Premium Candies
    case truffle = "🍫 Truffle"
    case caramel = "🍬 Caramel"
    case fudge = "🍫 Fudge"
    case toffee = "🍬 Toffee"

    // Rare Candies
    case goldenCandy = "⭐ Golden Candy"
    case magicalCandy = "✨ Magical Candy"
    case rainbowCandy = "🌈 Rainbow Candy"

    // Legendary Candies
    case candycornKing = "👑 Candy Corn King"
    case chocolateDragon = "🐉 Chocolate Dragon"
    case lollipopTower = "🗼 Lollipop Tower"

    var points: Int {
        switch self {
        case .chocolate, .lollipop, .gummi: return 3
        case .candyCorn, .licorice, .jawbreaker, .taffy, .peppermint: return 2
        case .truffle, .caramel, .fudge, .toffee: return 5
        case .goldenCandy: return 15
        case .magicalCandy: return 20
        case .rainbowCandy: return 25
        case .candycornKing: return 50
        case .chocolateDragon: return 60
        case .lollipopTower: return 70
        }
    }

    var emoji: String {
        switch self {
        case .chocolate: return "🍫"
        case .lollipop: return "🍭"
        case .gummi: return "🐻"
        case .candyCorn: return "🌽"
        case .licorice: return "🖤"
        case .jawbreaker: return "🔴"
        case .taffy: return "🍬"
        case .peppermint: return "🍬"
        case .truffle: return "🍫"
        case .caramel: return "🍬"
        case .fudge: return "🍫"
        case .toffee: return "🍬"
        case .goldenCandy: return "⭐"
        case .magicalCandy: return "✨"
        case .rainbowCandy: return "🌈"
        case .candycornKing: return "👑"
        case .chocolateDragon: return "🐉"
        case .lollipopTower: return "🗼"
        }
    }

    var rarity: GhostRarity {
        switch self {
        case .chocolate, .lollipop, .gummi, .candyCorn, .licorice, .jawbreaker, .taffy, .peppermint:
            return .common
        case .truffle, .caramel, .fudge, .toffee:
            return .uncommon
        case .goldenCandy, .magicalCandy, .rainbowCandy:
            return .rare
        case .candycornKing, .chocolateDragon, .lollipopTower:
            return .legendary
        }
    }
}

// MARK: Potion System (Extensive)
enum PotionEffect: String, CaseIterable {
    // Basic Potions
    case healing = "💚 Healing"
    case manaRestore = "💙 Mana Restore"
    case strength = "💪 Strength"
    case speed = "⚡ Speed"
    case defense = "🛡️ Defense"

    // Advanced Potions
    case ghostVision = "👻 Ghost Vision"
    case invisibility = "🫥 Invisibility"
    case teleportation = "🌀 Teleport"
    case timeFreeze = "⏰ Time Freeze"
    case necromancy = "💀 Necromancy"

    // Rare Potions
    case immortality = "♾️ Immortality"
    case chaos = "🌪️ Chaos"
    case luck = "🍀 Luck"
    case wisdom = "📖 Wisdom"

    // Legendary Potions
    case halloweenSpirit = "🎃 Halloween Spirit"
    case ghostKing = "👑 Ghost King"
    case voidWalker = "🌌 Void Walker"

    var duration: Int {
        switch self {
        case .healing, .manaRestore: return 30
        case .strength, .speed, .defense: return 45
        case .ghostVision, .invisibility: return 20
        case .teleportation, .timeFreeze, .necromancy: return 15
        case .immortality, .chaos, .luck, .wisdom: return 60
        case .halloweenSpirit, .ghostKing, .voidWalker: return 120
        }
    }

    var color: Color {
        switch self {
        case .healing: return .green
        case .manaRestore: return .blue
        case .strength: return .red
        case .speed: return .yellow
        case .defense: return .purple
        case .ghostVision: return .white
        case .invisibility: return .clear
        case .teleportation: return .cyan
        case .timeFreeze: return .gray
        case .necromancy: return .black
        case .immortality: return .gold
        case .chaos: return .orange
        case .luck: return .green
        case .wisdom: return .indigo
        case .halloweenSpirit: return .orange
        case .ghostKing: return .purple
        case .voidWalker: return .black
        }
    }
}

struct Ghost: Identifiable, Equatable {
    let id = UUID()
    var type: GhostType
    var name: String
    var level: Int
    var experience: Int
    var health: Int
    var maxHealth: Int
    var isCaptured: Bool
    var captureDate: Date?
    var positionX: CGFloat
    var positionY: CGFloat
    var velocityX: CGFloat
    var velocityY: CGFloat
    var rotation: Double
    var size: CGFloat
    var isBoss: Bool
    var isFriendly: Bool
    var mood: GhostMood
    var specialAbilityCooldown: Int
    var stars: Int
    var evolutionStage: Int
    var hasShiny: Bool
    var friendshipLevel: Int
    var candyLikes: Set<CandyType>
    var favoriteFood: CandyType?
}

enum GhostMood: String, CaseIterable {
    case happy = "😊 Happy"
    case sad = "😢 Sad"
    case angry = "😡 Angry"
    case scared = "😨 Scared"
    case playful = "😜 Playful"
    case sleepy = "😴 Sleepy"
    case hungry = "🍽️ Hungry"
}

// MARK: Quest System (Extensive)
struct Quest: Identifiable {
    let id = UUID()
    var name: String
    var description: String
    var objectives: [QuestObjective]
    var rewards: QuestReward
    var isCompleted: Bool
    var difficulty: QuestDifficulty
    var category: QuestCategory
    var isDaily: Bool
    var expires: Date?
    var progress: Double
}

enum QuestCategory: String, CaseIterable {
    case ghostHunting = "👻 Ghost Hunting"
    case candyCollecting = "🍬 Candy Collecting"
    case potionMaking = "🧪 Potion Making"
    case exploration = "🗺️ Exploration"
    case combat = "⚔️ Combat"
    case crafting = "🔧 Crafting"
}

enum QuestObjective: Hashable {
    case collectGhosts(Int)
    case collectCandy(Int)
    case craftPotion(PotionEffect)
    case defeatBoss(GhostType)
    case completeDungeon(String)
    case findTreasure(String)
    case exploreHouses(Int)
    case castSpells(Int)
    case earnGold(Int)
    case reachLevel(Int)
}

struct QuestReward {
    var experience: Int
    var gold: Int
    var items: [String]
    var rareItems: [String]
    var unlockables: [String]
}

enum QuestDifficulty: String, CaseIterable {
    case easy = "Easy"
    case medium = "Medium"
    case hard = "Hard"
    case expert = "Expert"
    case legendary = "Legendary"

    var color: Color {
        switch self {
        case .easy: return .green
        case .medium: return .yellow
        case .hard: return .orange
        case .expert: return .red
        case .legendary: return .purple
        }
    }
}

// MARK: Achievement System (Extensive)
struct Achievement: Identifiable {
    let id = UUID()
    var name: String
    var description: String
    var icon: String
    var points: Int
    var isUnlocked: Bool
    var progress: Double
    var target: Double
    var category: AchievementCategory
    var secret: Bool
    var rarity: AchievementRarity
}

enum AchievementCategory: String, CaseIterable {
    case ghostHunter = "👻 Ghost Hunter"
    case candyCollector = "🍬 Candy Collector"
    case potionMaster = "🧪 Potion Master"
    case spellCaster = "✨ Spell Caster"
    case explorer = "🗺️ Explorer"
    case legend = "⭐ Legend"
}

enum AchievementRarity: String, CaseIterable {
    case common = "Common"
    case rare = "Rare"
    case epic = "Epic"
    case legendary = "Legendary"
}

// MARK: Spell System (Extensive)
struct Spell: Identifiable {
    let id = UUID()
    var name: String
    var damage: Int
    var manaCost: Int
    var cooldown: Int
    var category: SpellCategory
    var animation: String
    var level: Int
    var range: Int
    var aoe: Bool
    var passive: Bool
    var upgradeLevel: Int
    var description: String
}

enum SpellCategory: String, CaseIterable {
    case attack = "⚔️ Attack"
    case defense = "🛡️ Defense"
    case support = "💚 Support"
    case special = "⭐ Special"
    case passive = "🔮 Passive"
}

// MARK: Character System (Extensive)
struct Character: Identifiable {
    let id = UUID()
    var name: String
    var type: CharacterType
    var dialogue: [String]
    var quests: [Quest]
    var friendship: Int
    var isUnlocked: Bool
    var level: Int
    var experience: Int
    var health: Int
    var maxHealth: Int
    var mana: Int
    var maxMana: Int
    var strength: Int
    var agility: Int
    var intelligence: Int
    var luck: Int
    var equipment: [Equipment]
    var skills: [Spell]
    var inventory: [String]
    var gold: Int
    var reputation: Double
}

enum CharacterType: String, CaseIterable {
    case friendlyGhost = "👻 Friendly Ghost"
    case witch = "🧙 Witch"
    case vampire = "🧛 Vampire"
    case werewolf = "🐺 Werewolf"
    case zombie = "🧟 Zombie"
    case mummy = "🧟 Mummy"
    case demon = "👿 Demon"
    case angel = "👼 Angel"
    case wizard = "🧙 Wizard"
    case knight = "⚔️ Knight"
    case rogue = "🗡️ Rogue"
    case ranger = "🏹 Ranger"
    case druid = "🌿 Druid"
    case necromancer = "💀 Necromancer"
}

// MARK: Equipment System
struct Equipment: Identifiable {
    let id = UUID()
    var name: String
    var type: EquipmentType
    var rarity: EquipmentRarity
    var stats: [String: Int]
    var level: Int
    var isEquipped: Bool
    var durability: Int
    var upgrades: Int
    var specialAbility: String?
}

enum EquipmentType: String, CaseIterable {
    case weapon = "⚔️ Weapon"
    case armor = "🛡️ Armor"
    case helmet = "⛑️ Helmet"
    case boots = "👢 Boots"
    case ring = "💍 Ring"
    case amulet = "📿 Amulet"
    case cloak = "🧥 Cloak"
    case shield = "🛡️ Shield"
}

enum EquipmentRarity: String, CaseIterable {
    case common = "Common"
    case uncommon = "Uncommon"
    case rare = "Rare"
    case epic = "Epic"
    case legendary = "Legendary"
    case mythical = "✨ Mythical"
}

// MARK: Haunted House System
struct HauntedHouse: Identifiable {
    let id = UUID()
    var name: String
    var location: String
    var floors: Int
    var ghosts: [Ghost]
    var treasures: [String]
    var isExplored: Bool
    var difficulty: Int
    var image: String
}

// MARK: Mini Game System
struct MiniGame: Identifiable {
    let id = UUID()
    var name: String
    var description: String
    var type: MiniGameType
    var difficulty: MiniGameDifficulty
    var rewards: QuestReward
    var highScore: Int
    var timesPlayed: Int
}

enum MiniGameType: String, CaseIterable {
    case memoryMatch = "🧠 Memory Match"
    case pumpkinSmash = "🎃 Pumpkin Smash"
    case ghostRace = "👻 Ghost Race"
    case candySort = "🍬 Candy Sort"
    case spellDuel = "✨ Spell Duel"
    case mazeEscape = "🌀 Maze Escape"
    case trivia = "🧠 Trivia"
    case rhythm = "🎵 Rhythm"
    case voxelRun = "🧱 Voxel Run 3D"
    case graveyard3D = "🪦 Graveyard 3D"
    case abandonedMine = "🦇 Abandoned Mine"
}

enum MiniGameDifficulty: String, CaseIterable {
    case easy = "Easy"
    case medium = "Medium"
    case hard = "Hard"
    case expert = "Expert"

    var color: Color {
        switch self {
        case .easy: return .green
        case .medium: return .yellow
        case .hard: return .orange
        case .expert: return .red
        }
    }
}

// MARK: Shared Small Views
struct StatBadge: View {
    let icon: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Text(icon).font(.caption)
            Text(value).font(.caption).bold()
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(color.opacity(0.2))
        .cornerRadius(8)
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.orange : Color(.secondarySystemBackground))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(8)
        }
    }
}

struct StatDetail: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack {
            Text(icon).font(.title2)
            Text(value).font(.headline)
            Text(label).font(.caption).foregroundColor(.secondary)
        }
    }
}

struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
            Spacer()
            Text(value).foregroundColor(.secondary)
        }
    }
}

// MARK: - Additional Data Models

struct CandyItem: Identifiable {
    let id: UUID
    var type: CandyType
    var quantity: Int
    var positionX: CGFloat
    var positionY: CGFloat
    var isCollected: Bool
    var weight: Double
    var isRare: Bool
    var sparkle: Bool
    var glowColor: Color
}

struct PotionItem: Identifiable {
    let id: UUID
    var name: String
    var effect: PotionEffect
    var duration: Int
    var potency: Double
    var color: Color
    var ingredients: [String]
    var quality: PotionQuality
    var isRare: Bool
}

enum PotionQuality: String, CaseIterable {
    case poor = "Poor"
    case normal = "Normal"
    case good = "Good"
    case excellent = "Excellent"
    case perfect = "Perfect"
}

struct ParticleEffect: Identifiable {
    let id: UUID
    var emoji: String
    var x: CGFloat
    var y: CGFloat
    var size: CGFloat
    var opacity: Double
    var velocityX: CGFloat
    var velocityY: CGFloat
    var rotation: Double
    var life: Double
}

struct HalloweenItem: Identifiable {
    let id = UUID()
    var name: String
    var emoji: String
    var positionX: CGFloat
    var positionY: CGFloat
    var velocityX: CGFloat
    var velocityY: CGFloat
    var rotation: Double
    var scale: CGFloat
    var isActive: Bool
}

struct AnimationEffect: Identifiable {
    let id = UUID()
    var type: AnimationType
    var positionX: CGFloat
    var positionY: CGFloat
    var duration: Double
    var isActive: Bool
}

enum AnimationType: String, CaseIterable {
    case ghostAppear
    case candyCollect
    case spellCast
    case potionBrew
    case ghostCapture
    case levelUp
    case achievement
    case particleBurst
    case shockwave
    case rainbow
}

extension Color {
    static var gold: Color { Color.yellow }
}

// ============================================================
// MARK: - 2. ULTIMATE GAME MANAGER (1000+ Lines)
// ============================================================

class HalloweenUltimateManager: ObservableObject {
    // MARK: - Published Properties
    @Published var score: Int = 0
    @Published var gold: Int = 500
    @Published var level: Int = 1
    @Published var experience: Int = 0
    @Published var mana: Int = 100
    @Published var maxMana: Int = 100
    @Published var health: Int = 100
    @Published var maxHealth: Int = 100
    @Published var stamina: Int = 100
    @Published var maxStamina: Int = 100

    @Published var ghosts: [Ghost] = []
    @Published var capturedGhosts: [Ghost] = []
    @Published var candies: [CandyItem] = []
    @Published var collectedCandies: [CandyItem] = []
    @Published var potions: [PotionItem] = []
    @Published var spells: [Spell] = []
    @Published var characters: [Character] = []
    @Published var quests: [Quest] = []
    @Published var achievements: [Achievement] = []
    @Published var equipment: [Equipment] = []
    @Published var miniGames: [MiniGame] = []
    @Published var ingredientStash: [String: Int] = [:]

    @Published var currentEvent: String = "Halloween Festival"
    @Published var isNightMode: Bool = false
    @Published var isSpookyMode: Bool = true
    @Published var isHalloweenMode: Bool = true
    @Published var currentSeason: String = "Fall"
    @Published var weather: String = "Clear"
    @Published var timeOfDay: String = "Night"

    @Published var notifications: [String] = []
    @Published var activeEffects: [PotionEffect] = []
    @Published var comboCounter: Int = 0
    @Published var streakCounter: Int = 0
    @Published var highestStreak: Int = 0

    @Published var fallingItems: [HalloweenItem] = []
    @Published var particles: [ParticleEffect] = []
    @Published var animations: [AnimationEffect] = []
    @Published var currentScene: String = "Main"

    // MARK: - Private Properties
    private var audioPlayer: AVAudioPlayer?
    private var backgroundAudioPlayer: AVAudioPlayer?
    private var hapticEngine: CHHapticEngine?
    private var gameLoopTimer: Timer?
    private var gameClock: GameClock?
    private var gameClockToken: UUID?
    private var spawnTimer: Timer?
    private var eventTimer: Timer?
    private var animationTimer: Timer?
    private var saveTimer: Timer?

    private let userDefaults = UserDefaults.standard
    private var cancellables = Set<AnyCancellable>()
    private var isGameLoopRunning = false
    private var frameCount = 0
    private var loopTime: Double = 0
    private var lastEventTime: Double = 0
    private var lastSaveTime: Double = 0

    // MARK: - Initialization
    init() {
        setupAudio()
        setupHaptics()
        initializeGame()
        startTimers()
        loadGameData()
        setupGameLoop()
        generateParticles()
    }

    // MARK: - Audio Setup
    private func setupAudio() {
        if let url = Bundle.main.url(forResource: "halloween_ultimate", withExtension: "mp3") {
            do {
                backgroundAudioPlayer = try AVAudioPlayer(contentsOf: url)
                // Owned by the global music switchboard (mute/volume/pause).
                SpookyMusic.shared.registerFilePlayer(backgroundAudioPlayer, baseVolume: 0.5)
            } catch {
                print("Background audio setup failed: \(error)")
            }
        }

        if let url = Bundle.main.url(forResource: "effects", withExtension: "mp3") {
            do {
                audioPlayer = try AVAudioPlayer(contentsOf: url)
                audioPlayer?.volume = 0.7
            } catch {
                print("Effects audio setup failed: \(error)")
            }
        }
    }

    private func setupHaptics() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        do {
            hapticEngine = try CHHapticEngine()
            try hapticEngine?.start()
        } catch {
            print("Haptics setup failed: \(error)")
        }
    }

    // MARK: - Game Initialization
    private func initializeGame() {
        initializeSpells()
        initializeCharacters()
        initializeQuests()
        initializeAchievements()
        initializeEquipment()
        initializeMiniGames()
        generateInitialGhosts()
        generateInitialCandies()
        generateEvents()
    }

    private func initializeSpells() {
        spells = [
            Spell(name: "Ghost Fire", damage: 20, manaCost: 15, cooldown: 3, category: .attack, animation: "🔥", level: 1, range: 5, aoe: false, passive: false, upgradeLevel: 0, description: "Launches a ghostly flame that deals 20 damage"),
            Spell(name: "Crystal Shield", damage: 0, manaCost: 20, cooldown: 5, category: .defense, animation: "🛡️", level: 1, range: 0, aoe: false, passive: false, upgradeLevel: 0, description: "Creates a shield that blocks 30 damage"),
            Spell(name: "Soul Drain", damage: 30, manaCost: 25, cooldown: 4, category: .attack, animation: "💀", level: 1, range: 8, aoe: false, passive: false, upgradeLevel: 0, description: "Drains the soul of your enemy dealing 30 damage"),
            Spell(name: "Mystic Heal", damage: -25, manaCost: 15, cooldown: 6, category: .support, animation: "💚", level: 1, range: 0, aoe: false, passive: false, upgradeLevel: 0, description: "Heals 25 health"),
            Spell(name: "Time Warp", damage: 0, manaCost: 30, cooldown: 10, category: .special, animation: "⏰", level: 1, range: 10, aoe: true, passive: false, upgradeLevel: 0, description: "Freezes time for 5 seconds"),
            Spell(name: "Dark Lightning", damage: 40, manaCost: 35, cooldown: 5, category: .attack, animation: "⚡", level: 1, range: 12, aoe: false, passive: false, upgradeLevel: 0, description: "Strikes with dark lightning dealing 40 damage"),
            Spell(name: "Ghost Shield", damage: 0, manaCost: 25, cooldown: 7, category: .defense, animation: "👻", level: 1, range: 0, aoe: false, passive: false, upgradeLevel: 0, description: "Summons ghostly shield that reflects 50% damage"),
            Spell(name: "Blood Ritual", damage: 50, manaCost: 45, cooldown: 8, category: .special, animation: "🩸", level: 1, range: 10, aoe: true, passive: false, upgradeLevel: 0, description: "Sacrifices 20 health to deal 50 damage to all enemies"),
            Spell(name: "Candy Storm", damage: 15, manaCost: 10, cooldown: 2, category: .attack, animation: "🍬", level: 1, range: 6, aoe: true, passive: false, upgradeLevel: 0, description: "Summons a storm of candies dealing 15 damage"),
            Spell(name: "Pumpkin Blast", damage: 35, manaCost: 30, cooldown: 4, category: .attack, animation: "🎃", level: 1, range: 8, aoe: true, passive: false, upgradeLevel: 0, description: "Launches a explosive pumpkin dealing 35 damage"),
            Spell(name: "Vampire Kiss", damage: 25, manaCost: 20, cooldown: 3, category: .attack, animation: "🧛", level: 1, range: 4, aoe: false, passive: false, upgradeLevel: 0, description: "Deals 25 damage and heals for 10"),
            Spell(name: "Necromancer Army", damage: 10, manaCost: 40, cooldown: 12, category: .special, animation: "💀", level: 1, range: 15, aoe: true, passive: false, upgradeLevel: 0, description: "Summons an army of skeletons dealing 10 damage each"),
            Spell(name: "Werewolf Howl", damage: 30, manaCost: 25, cooldown: 5, category: .attack, animation: "🐺", level: 1, range: 7, aoe: true, passive: false, upgradeLevel: 0, description: "Releases a howl dealing 30 damage to all enemies"),
            Spell(name: "Chaos Portal", damage: 60, manaCost: 50, cooldown: 10, category: .special, animation: "🌀", level: 1, range: 20, aoe: true, passive: false, upgradeLevel: 0, description: "Opens a chaos portal dealing massive damage"),
            Spell(name: "Halloween Spirit", damage: 0, manaCost: 0, cooldown: 30, category: .passive, animation: "🎃", level: 1, range: 0, aoe: false, passive: true, upgradeLevel: 0, description: "Passive: Increases all stats by 20% during Halloween")
        ]
    }

    private func initializeCharacters() {
        characters = [
            Character(name: "Casper the Friendly Ghost", type: .friendlyGhost, dialogue: ["Boo! I'm friendly!", "Want to play?", "Let's explore the haunted house!"], quests: [], friendship: 0, isUnlocked: true, level: 1, experience: 0, health: 50, maxHealth: 50, mana: 30, maxMana: 30, strength: 5, agility: 8, intelligence: 7, luck: 5, equipment: [], skills: [], inventory: [], gold: 0, reputation: 0.0),
            Character(name: "Winnie the Witch", type: .witch, dialogue: ["I brew the best potions!", "Cackle cackle!", "Want a magic lesson?"], quests: [], friendship: 0, isUnlocked: true, level: 1, experience: 0, health: 40, maxHealth: 40, mana: 60, maxMana: 60, strength: 4, agility: 6, intelligence: 10, luck: 6, equipment: [], skills: [], inventory: [], gold: 0, reputation: 0.0),
            Character(name: "Vlad the Vampire", type: .vampire, dialogue: ["I vant to drink... juice!", "The night is mine!", "Bleh bleh bleh!"], quests: [], friendship: 0, isUnlocked: false, level: 1, experience: 0, health: 60, maxHealth: 60, mana: 40, maxMana: 40, strength: 8, agility: 7, intelligence: 6, luck: 7, equipment: [], skills: [], inventory: [], gold: 0, reputation: 0.0),
            Character(name: "Luna the Werewolf", type: .werewolf, dialogue: ["Awooo!", "The full moon calls!", "Let's howl together!"], quests: [], friendship: 0, isUnlocked: false, level: 1, experience: 0, health: 70, maxHealth: 70, mana: 30, maxMana: 30, strength: 10, agility: 8, intelligence: 4, luck: 6, equipment: [], skills: [], inventory: [], gold: 0, reputation: 0.0),
            Character(name: "Dumbledore the Wizard", type: .wizard, dialogue: ["Magic is everything!", "Let me teach you a spell!", "Wingardium Leviosa!"], quests: [], friendship: 0, isUnlocked: false, level: 1, experience: 0, health: 45, maxHealth: 45, mana: 70, maxMana: 70, strength: 3, agility: 5, intelligence: 12, luck: 8, equipment: [], skills: [], inventory: [], gold: 0, reputation: 0.0)
        ]
    }

    private func initializeQuests() {
        quests = [
            Quest(name: "Ghost Hunter Beginner", description: "Capture 10 ghosts of any type", objectives: [.collectGhosts(10)], rewards: QuestReward(experience: 50, gold: 30, items: [], rareItems: [], unlockables: []), isCompleted: false, difficulty: .easy, category: .ghostHunting, isDaily: false, expires: nil, progress: 0),
            Quest(name: "Candy Collector", description: "Collect 50 candies", objectives: [.collectCandy(50)], rewards: QuestReward(experience: 75, gold: 50, items: [], rareItems: [], unlockables: []), isCompleted: false, difficulty: .medium, category: .candyCollecting, isDaily: false, expires: nil, progress: 0),
            Quest(name: "Potion Master", description: "Brew 5 different potions", objectives: [.craftPotion(.healing), .craftPotion(.manaRestore), .craftPotion(.strength), .craftPotion(.speed), .craftPotion(.defense)], rewards: QuestReward(experience: 100, gold: 80, items: [], rareItems: [], unlockables: ["Potion Master Title"]), isCompleted: false, difficulty: .hard, category: .potionMaking, isDaily: false, expires: nil, progress: 0),
            Quest(name: "Boss Slayer", description: "Defeat a Demon Lord boss", objectives: [.defeatBoss(.demonLord)], rewards: QuestReward(experience: 500, gold: 200, items: [], rareItems: ["Legendary Ghost Stone"], unlockables: ["Boss Slayer Title"]), isCompleted: false, difficulty: .legendary, category: .combat, isDaily: false, expires: nil, progress: 0),
            Quest(name: "Daily Ghost Hunt", description: "Capture 5 ghosts today", objectives: [.collectGhosts(5)], rewards: QuestReward(experience: 30, gold: 20, items: [], rareItems: [], unlockables: []), isCompleted: false, difficulty: .easy, category: .ghostHunting, isDaily: true, expires: Date().addingTimeInterval(86400), progress: 0),
            Quest(name: "Candy Frenzy", description: "Collect 100 candies", objectives: [.collectCandy(100)], rewards: QuestReward(experience: 150, gold: 100, items: [], rareItems: ["Golden Candy"], unlockables: []), isCompleted: false, difficulty: .hard, category: .candyCollecting, isDaily: false, expires: nil, progress: 0),
            Quest(name: "Master Spell Caster", description: "Cast 50 spells", objectives: [.castSpells(50)], rewards: QuestReward(experience: 200, gold: 150, items: [], rareItems: ["Spell Master Crown"], unlockables: []), isCompleted: false, difficulty: .expert, category: .combat, isDaily: false, expires: nil, progress: 0),
            Quest(name: "Explorer Extraordinaire", description: "Explore 5 haunted houses", objectives: [.exploreHouses(5)], rewards: QuestReward(experience: 250, gold: 200, items: [], rareItems: ["Explorer Badge"], unlockables: []), isCompleted: false, difficulty: .expert, category: .exploration, isDaily: false, expires: nil, progress: 0)
        ]
    }

    private func initializeAchievements() {
        achievements = [
            Achievement(name: "Ghost Hunter Novice", description: "Capture your first ghost", icon: "👻", points: 10, isUnlocked: false, progress: 0, target: 1, category: .ghostHunter, secret: false, rarity: .common),
            Achievement(name: "Ghost Hunter Expert", description: "Capture 100 ghosts", icon: "👻", points: 100, isUnlocked: false, progress: 0, target: 100, category: .ghostHunter, secret: false, rarity: .rare),
            Achievement(name: "Ghost Hunter Master", description: "Capture 500 ghosts", icon: "👑", points: 500, isUnlocked: false, progress: 0, target: 500, category: .ghostHunter, secret: false, rarity: .epic),
            Achievement(name: "Candy Collector", description: "Collect 50 candies", icon: "🍬", points: 25, isUnlocked: false, progress: 0, target: 50, category: .candyCollector, secret: false, rarity: .common),
            Achievement(name: "Candy King", description: "Collect 500 candies", icon: "👑", points: 150, isUnlocked: false, progress: 0, target: 500, category: .candyCollector, secret: false, rarity: .epic),
            Achievement(name: "Potion Brewing Novice", description: "Brew your first potion", icon: "🧪", points: 20, isUnlocked: false, progress: 0, target: 1, category: .potionMaster, secret: false, rarity: .common),
            Achievement(name: "Master Potion Brewer", description: "Brew 50 potions", icon: "🧪", points: 200, isUnlocked: false, progress: 0, target: 50, category: .potionMaster, secret: false, rarity: .rare),
            Achievement(name: "Spell Caster", description: "Cast your first spell", icon: "✨", points: 15, isUnlocked: false, progress: 0, target: 1, category: .spellCaster, secret: false, rarity: .common),
            Achievement(name: "Master Spell Caster", description: "Cast 100 spells", icon: "✨", points: 150, isUnlocked: false, progress: 0, target: 100, category: .spellCaster, secret: false, rarity: .rare),
            Achievement(name: "Explorer", description: "Explore your first haunted house", icon: "🗺️", points: 20, isUnlocked: false, progress: 0, target: 1, category: .explorer, secret: false, rarity: .common),
            Achievement(name: "Legendary Explorer", description: "Explore all haunted houses", icon: "🗺️", points: 200, isUnlocked: false, progress: 0, target: 10, category: .explorer, secret: false, rarity: .epic),
            Achievement(name: "Boss Slayer", description: "Defeat your first boss ghost", icon: "⚔️", points: 50, isUnlocked: false, progress: 0, target: 1, category: .legend, secret: false, rarity: .rare),
            Achievement(name: "Legendary Hero", description: "Defeat 10 boss ghosts", icon: "⚔️", points: 500, isUnlocked: false, progress: 0, target: 10, category: .legend, secret: false, rarity: .legendary),
            Achievement(name: "Secret: Ghost Whisperer", description: "Capture a friendly ghost", icon: "🤫", points: 100, isUnlocked: false, progress: 0, target: 1, category: .ghostHunter, secret: true, rarity: .epic),
            Achievement(name: "Secret: Pumpkin Lord", description: "Capture the Pumpkin Lord", icon: "🎃", points: 300, isUnlocked: false, progress: 0, target: 1, category: .legend, secret: true, rarity: .legendary)
        ]
    }

    private func initializeEquipment() {
        equipment = [
            Equipment(name: "Wooden Wand", type: .weapon, rarity: .common, stats: ["Attack": 5, "Mana": 10], level: 1, isEquipped: false, durability: 100, upgrades: 0, specialAbility: nil),
            Equipment(name: "Ghost Cloak", type: .cloak, rarity: .uncommon, stats: ["Defense": 8, "Health": 15], level: 1, isEquipped: false, durability: 100, upgrades: 0, specialAbility: "Invisibility"),
            Equipment(name: "Crystal Amulet", type: .amulet, rarity: .rare, stats: ["Mana": 25, "Intelligence": 5], level: 1, isEquipped: false, durability: 100, upgrades: 0, specialAbility: "Mana Regeneration"),
            Equipment(name: "Shadow Blade", type: .weapon, rarity: .epic, stats: ["Attack": 25, "Speed": 10], level: 1, isEquipped: false, durability: 100, upgrades: 0, specialAbility: "Shadow Strike"),
            Equipment(name: "Halloween Crown", type: .helmet, rarity: .legendary, stats: ["All Stats": 15, "Luck": 20], level: 1, isEquipped: false, durability: 100, upgrades: 0, specialAbility: "Halloween Blessing"),
            Equipment(name: "Mystic Shield", type: .shield, rarity: .epic, stats: ["Defense": 30, "Health": 50], level: 1, isEquipped: false, durability: 100, upgrades: 0, specialAbility: "Damage Reflection"),
            Equipment(name: "Speed Boots", type: .boots, rarity: .rare, stats: ["Agility": 15, "Speed": 20], level: 1, isEquipped: false, durability: 100, upgrades: 0, specialAbility: "Dash")
        ]
    }

    private func initializeMiniGames() {
        miniGames = [
            MiniGame(name: "Memory Match", description: "Match the spooky cards", type: .memoryMatch, difficulty: .medium, rewards: QuestReward(experience: 25, gold: 15, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
            MiniGame(name: "Pumpkin Smash", description: "Smash as many pumpkins as you can", type: .pumpkinSmash, difficulty: .easy, rewards: QuestReward(experience: 20, gold: 10, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
            MiniGame(name: "Ghost Race", description: "Race against ghost opponents", type: .ghostRace, difficulty: .hard, rewards: QuestReward(experience: 50, gold: 30, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
            MiniGame(name: "Candy Sort", description: "Sort the candies by color", type: .candySort, difficulty: .easy, rewards: QuestReward(experience: 15, gold: 10, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
            MiniGame(name: "Spell Duel", description: "Duel with spells against AI", type: .spellDuel, difficulty: .expert, rewards: QuestReward(experience: 100, gold: 50, items: [], rareItems: [], unlockables: ["Duel Master"]), highScore: 0, timesPlayed: 0),
            MiniGame(name: "Voxel Run 3D", description: "Endless Minecraft-style broom sprint", type: .voxelRun, difficulty: .expert, rewards: QuestReward(experience: 120, gold: 60, items: [], rareItems: [], unlockables: ["Voxel Voyager"]), highScore: 0, timesPlayed: 0),
            MiniGame(name: "Graveyard 3D", description: "Mine ores, fight ghosts, loot crypts", type: .graveyard3D, difficulty: .hard, rewards: QuestReward(experience: 120, gold: 60, items: [], rareItems: [], unlockables: ["Crypt Raider"]), highScore: 0, timesPlayed: 0)
        ]
    }

    private func generateInitialGhosts() {
        for _ in 0..<10 { spawnRandomGhost() }
    }

    private func generateInitialCandies() {
        for _ in 0..<20 { spawnRandomCandy() }
    }

    private func generateEvents() {
        // Events will be generated dynamically
    }

    private func startTimers() {
        spawnTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.spawnRandomGhost()
            self?.spawnRandomCandy()
        }
        eventTimer = Timer.scheduledTimer(withTimeInterval: 60.0, repeats: true) { [weak self] _ in
            self?.checkEvents()
        }
        saveTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            self?.saveGameData()
        }
    }

    private func checkEvents() {
        triggerRandomEvent()
    }

    // MARK: - Spawning Functions

    func spawnRandomGhost() {
        let ghostType = GhostType.allCases.randomElement()!
        let isBoss = Double.random(in: 0...1) < 0.05
        let isFriendly = Double.random(in: 0...1) < 0.10
        let hasShiny = Double.random(in: 0...1) < 0.01

        let baseSize: CGFloat = isBoss ? 150 : CGFloat.random(in: 40...90)
        let evolutionStage = Int.random(in: 1...3)

        let ghost = Ghost(
            type: ghostType,
            name: "\(ghostType.rawValue) \(Int.random(in: 1...9999))",
            level: max(1, Int(Double.random(in: 1...Double(level + 5)))),
            experience: ghostType.points,
            health: ghostType.powerLevel * (isBoss ? 10 : 1) * evolutionStage,
            maxHealth: ghostType.powerLevel * (isBoss ? 10 : 1) * evolutionStage,
            isCaptured: false,
            captureDate: nil,
            positionX: CGFloat.random(in: 50...350),
            positionY: CGFloat.random(in: 50...600),
            velocityX: CGFloat.random(in: -3...3),
            velocityY: CGFloat.random(in: -3...3),
            rotation: Double.random(in: 0...360),
            size: baseSize,
            isBoss: isBoss,
            isFriendly: isFriendly,
            mood: GhostMood.allCases.randomElement()!,
            specialAbilityCooldown: Int.random(in: 0...5),
            stars: Int.random(in: 1...5),
            evolutionStage: evolutionStage,
            hasShiny: hasShiny,
            friendshipLevel: 0,
            candyLikes: Set(CandyType.allCases.filter { _ in Bool.random() }),
            favoriteFood: CandyType.allCases.randomElement()
        )
        ghosts.append(ghost)

        createParticles(at: CGPoint(x: ghost.positionX, y: ghost.positionY), count: 20, emoji: "✨")

        if isBoss {
            addNotification("👿 Boss ghost appeared: \(ghost.type.rawValue)!")
            triggerHaptic(.heavy)
        }
        if isFriendly {
            addNotification("👻 Friendly ghost appeared! \(ghost.name) wants to be friends!")
        }
        if hasShiny {
            addNotification("✨✨✨ SHINY GHOST SPOTTED! ✨✨✨")
            triggerHaptic(.success)
        }
    }

    func spawnRandomCandy() {
        let candyType = CandyType.allCases.randomElement()!
        let isRare = candyType.rarity == .rare || candyType.rarity == .legendary

        let candy = CandyItem(
            id: UUID(),
            type: candyType,
            quantity: Int.random(in: 1...5),
            positionX: CGFloat.random(in: 50...350),
            positionY: CGFloat.random(in: 50...600),
            isCollected: false,
            weight: Double.random(in: 0.5...2.5),
            isRare: isRare,
            sparkle: candyType.rarity == .legendary,
            glowColor: candyType.rarity.color
        )
        candies.append(candy)

        if isRare {
            addNotification("✨ Rare candy spawned: \(candyType.rawValue)!")
        }
    }

    // MARK: - Particle System

    func createParticles(at position: CGPoint, count: Int, emoji: String) {
        for _ in 0..<count {
            let particle = ParticleEffect(
                id: UUID(),
                emoji: emoji,
                x: position.x + CGFloat.random(in: -30...30),
                y: position.y + CGFloat.random(in: -30...30),
                size: CGFloat.random(in: 10...30),
                opacity: 1.0,
                velocityX: CGFloat.random(in: -5...5),
                velocityY: CGFloat.random(in: -10...0),
                rotation: Double.random(in: 0...360),
                life: Double.random(in: 0.5...2.0)
            )
            particles.append(particle)
        }
    }

    /// Pickup celebrations (candy, gold, rare spawns) rain across the TOP
    /// edge so they never cover the play area.
    func celebrateAtTop(emoji: String, count: Int = 20) {
        for _ in 0..<count {
            let particle = ParticleEffect(
                id: UUID(),
                emoji: emoji,
                x: CGFloat.random(in: 20...370),
                y: CGFloat.random(in: 100...150),
                size: CGFloat.random(in: 12...28),
                opacity: 1.0,
                velocityX: CGFloat.random(in: -3...3),
                velocityY: CGFloat.random(in: 2...8),
                rotation: Double.random(in: 0...360),
                life: Double.random(in: 0.8...2.0)
            )
            particles.append(particle)
        }
    }

    func generateParticles() {
        for _ in 0..<50 {
            let particle = ParticleEffect(
                id: UUID(),
                emoji: ["✨", "⭐", "🌟", "💫", "🌙", "🦇", "👻"].randomElement()!,
                x: CGFloat.random(in: 0...400),
                y: CGFloat.random(in: 0...800),
                size: CGFloat.random(in: 5...20),
                opacity: Double.random(in: 0.1...0.5),
                velocityX: CGFloat.random(in: -0.5...0.5),
                velocityY: CGFloat.random(in: -0.5...0.5),
                rotation: Double.random(in: 0...360),
                life: 100
            )
            particles.append(particle)
        }
    }

    // MARK: - Game Loop (vsync display-link, dt-based, 30Hz publish)

    private func setupGameLoop() {
        // Was: Timer(0.016) mutating @Published arrays — runloop jitter plus
        // fixed per-tick steps (2x speed on 120Hz screens). Now: vsync clock
        // at 30Hz with delta-time motion. Same feel, half the diffing cost.
        gameLoopTimer?.invalidate()
        let clock = GameClock(framesPerSecond: 30)
        gameClockToken = clock.add { [weak self] dt in self?.updateGameLoop(dt: dt) }
        gameClock = clock
    }

    private func updateGameLoop(dt: Double) {
        frameCount += 1
        loopTime += dt
        let step = dt * 60.0 // 1.0 at classic 60fps pacing

        for index in ghosts.indices {
            ghosts[index].positionX += ghosts[index].velocityX * step
            ghosts[index].positionY += ghosts[index].velocityY * step
            ghosts[index].rotation += 0.5 * step

            if ghosts[index].positionX < 0 || ghosts[index].positionX > 400 {
                ghosts[index].velocityX *= -1
            }
            if ghosts[index].positionY < 0 || ghosts[index].positionY > 800 {
                ghosts[index].velocityY *= -1
            }

            if Double.random(in: 0...1) < dt * 0.6 {
                ghosts[index].velocityX += CGFloat.random(in: -1...1)
                ghosts[index].velocityY += CGFloat.random(in: -1...1)
            }

            if Double.random(in: 0...1) < dt * 0.3 {
                ghosts[index].mood = GhostMood.allCases.randomElement()!
            }
        }

        for index in particles.indices {
            particles[index].x += particles[index].velocityX * step
            particles[index].y += particles[index].velocityY * step
            particles[index].opacity -= 0.01 * step
            particles[index].life -= 0.01 * step
            particles[index].rotation += 1 * step
        }
        particles.removeAll { $0.opacity <= 0 || $0.life <= 0 }

        if loopTime - lastEventTime >= 10 {
            lastEventTime = loopTime
            triggerRandomEvent()
        }

        if loopTime - lastSaveTime >= 30 {
            lastSaveTime = loopTime
            saveGameData()
        }
    }

    private func triggerRandomEvent() {
        let events = [
            "🎃 A pumpkin spirit appears!",
            "👻 The ghosts are restless!",
            "🍬 Candy rain!",
            "🌙 The full moon rises!",
            "🧙 A witch flies by!",
            "🦇 Bats swarm the area!",
            "💀 The dead rise!",
            "🎃 Jack-o-lanterns glow!"
        ]
        addNotification(events.randomElement()!)

        switch Int.random(in: 0...3) {
        case 0:
            for _ in 0..<3 { spawnRandomGhost() }
        case 1:
            for _ in 0..<5 { spawnRandomCandy() }
        case 2:
            let bonus = Int.random(in: 10...50)
            gold += bonus
            addNotification("💰 Found \(bonus) gold!")
        default:
            let bonus = Int.random(in: 5...25)
            experience += bonus
            addNotification("⭐ Gained \(bonus) experience!")
        }
    }

    // MARK: - Game Mechanics

    func captureGhost(_ ghost: Ghost) {
        guard let index = ghosts.firstIndex(where: { $0.id == ghost.id }) else { return }

        var capturedGhost = ghost
        capturedGhost.isCaptured = true
        capturedGhost.captureDate = Date()

        capturedGhosts.append(capturedGhost)
        ghosts.remove(at: index)

        let pointsEarned = ghost.type.points * (ghost.isBoss ? 10 : 1) * (ghost.hasShiny ? 5 : 1)
        score += pointsEarned
        gold += ghost.type.points / 2
        experience += ghost.type.points

        comboCounter += 1
        if comboCounter > 10 {
            let bonus = comboCounter * 2
            score += bonus
            addNotification("🔥 \(comboCounter)x Combo! +\(bonus) bonus points!")
        }

        streakCounter += 1
        if streakCounter > highestStreak {
            highestStreak = streakCounter
        }

        createParticles(at: CGPoint(x: ghost.positionX, y: ghost.positionY), count: 50, emoji: "⭐")

        checkAchievements()

        triggerHaptic(.success)
        addNotification("🎃 Captured \(ghost.type.rawValue)! +\(pointsEarned) points!")

        // Ingredient drop from the wilds
        if let drop = ["🧪 Ghost Essence", "🦇 Bat Wing", "💀 Skeleton Bone", "🕷️ Spider Silk"].randomElement() {
            addIngredient(drop)
        }

        checkLevelUp()

        checkQuestProgress()
    }

    func collectCandy(_ candy: CandyItem) {
        guard let index = candies.firstIndex(where: { $0.id == candy.id }) else { return }

        var collectedCandy = candy
        collectedCandy.isCollected = true

        collectedCandies.append(collectedCandy)
        candies.remove(at: index)

        let pointsEarned = candy.type.points * (candy.isRare ? 3 : 1)
        score += pointsEarned
        gold += candy.type.points



        checkAchievements()

        triggerHaptic(.medium)
        addNotification("🍬 Collected \(candy.type.rawValue)! +\(pointsEarned) points!")

        // Herbal drop from sweet patches
        if Double.random(in: 0...1) < 0.4,
           let drop = ["🌿 Moonflower", "🍄 Magic Mushroom", "💎 Crystal Shard"].randomElement() {
            addIngredient(drop)
        }
    }

    func castSpell(_ spell: Spell) {
        guard mana >= spell.manaCost else {
            addNotification("❌ Not enough mana!")
            return
        }

        mana -= spell.manaCost
        addNotification("✨ Cast \(spell.name)!")
        triggerHaptic(.medium)

        createParticles(at: CGPoint(x: 200, y: 300), count: 30, emoji: spell.animation)

        switch spell.category {
        case .attack:
            if let nearestGhost = ghosts.min(by: { distanceToPlayer($0) < distanceToPlayer($1) }) {
                damageGhost(nearestGhost, damage: spell.damage)
                addNotification("⚔️ Dealt \(spell.damage) damage to \(nearestGhost.name)!")
            }
        case .defense:
            health = min(maxHealth, health + 20)
            addNotification("🛡️ Shield activated! +20 health!")
        case .support:
            health = min(maxHealth, health + 30)
            mana = min(maxMana, mana + 10)
            addNotification("💚 Healed 30 health and restored 10 mana!")
        case .special:
            handleSpecialSpell(spell)
        case .passive:
            break
        }

        checkQuestProgress()
    }

    func damageGhost(_ ghost: Ghost, damage: Int) {
        guard let index = ghosts.firstIndex(where: { $0.id == ghost.id }) else { return }

        var updatedGhost = ghost
        updatedGhost.health -= damage

        createParticles(at: CGPoint(x: ghost.positionX, y: ghost.positionY), count: 10, emoji: "💥")

        if updatedGhost.health <= 0 {
            captureGhost(updatedGhost)
        } else {
            ghosts[index] = updatedGhost
        }
    }

    func handleSpecialSpell(_ spell: Spell) {
        switch spell.name {
        case "Time Warp":
            for i in ghosts.indices {
                ghosts[i].velocityX *= 0.1
                ghosts[i].velocityY *= 0.1
            }
            addNotification("⏰ Time warped! Ghosts slowed!")
            createParticles(at: CGPoint(x: 200, y: 300), count: 40, emoji: "⏰")
        case "Blood Ritual":
            if health > 20 {
                health -= 20
                for ghost in ghosts {
                    damageGhost(ghost, damage: 50)
                }
                addNotification("🩸 Blood ritual complete! Massive damage!")
                createParticles(at: CGPoint(x: 200, y: 300), count: 50, emoji: "🩸")
            } else {
                addNotification("❌ Not enough health!")
            }
        case "Necromancer Army":
            for _ in 0..<5 {
                let skeletonGhost = Ghost(
                    type: .ghoul,
                    name: "Skeleton \(Int.random(in: 1...100))",
                    level: level,
                    experience: 5,
                    health: 20,
                    maxHealth: 20,
                    isCaptured: false,
                    captureDate: nil,
                    positionX: CGFloat.random(in: 50...350),
                    positionY: CGFloat.random(in: 50...600),
                    velocityX: CGFloat.random(in: -2...2),
                    velocityY: CGFloat.random(in: -2...2),
                    rotation: 0,
                    size: 50,
                    isBoss: false,
                    isFriendly: false,
                    mood: .angry,
                    specialAbilityCooldown: 0,
                    stars: 1,
                    evolutionStage: 1,
                    hasShiny: false,
                    friendshipLevel: 0,
                    candyLikes: [],
                    favoriteFood: nil
                )
                ghosts.append(skeletonGhost)
            }
            addNotification("💀 Necromancer army summoned!")
            createParticles(at: CGPoint(x: 200, y: 300), count: 60, emoji: "💀")
        case "Chaos Portal":
            for ghost in ghosts {
                damageGhost(ghost, damage: 60)
            }
            addNotification("🌀 Chaos portal opened! Massive damage to all!")
            createParticles(at: CGPoint(x: 200, y: 300), count: 80, emoji: "🌀")
        default:
            break
        }
    }

    func distanceToPlayer(_ ghost: Ghost) -> CGFloat {
        let playerX: CGFloat = 200
        let playerY: CGFloat = 300
        let dx = ghost.positionX - playerX
        let dy = ghost.positionY - playerY
        return sqrt(dx * dx + dy * dy)
    }

    // MARK: - Level System

    func checkLevelUp() {
        var requiredExp = level * 100 + level * level * 10
        while experience >= requiredExp {
            level += 1
            experience -= requiredExp
            requiredExp = level * 100 + level * level * 10
            maxHealth += 10
            health = maxHealth
            maxMana += 10
            mana = maxMana

            let bonusGold = level * 10
            gold += bonusGold

            addNotification("🎉 Level Up! Now level \(level)! +\(bonusGold) gold!")
            triggerHaptic(.success)
            createParticles(at: CGPoint(x: 200, y: 300), count: 50, emoji: "🎉")

            if level % 2 == 0 {
                if let newSpell = spells.filter({ $0.level <= level && $0.manaCost > 0 }).randomElement() {
                    addNotification("✨ New spell unlocked: \(newSpell.name)!")
                }
            }

            checkAchievements()
        }
    }

    // MARK: - Achievement System

    func checkAchievements() {
        for index in achievements.indices {
            var achievement = achievements[index]
            if achievement.isUnlocked { continue }

            switch achievement.name {
            case "Ghost Hunter Novice", "Ghost Hunter Expert", "Ghost Hunter Master":
                achievement.progress = Double(capturedGhosts.count)
            case "Candy Collector", "Candy King":
                achievement.progress = Double(collectedCandies.count)
            case "Potion Brewing Novice", "Master Potion Brewer":
                achievement.progress = Double(potions.count)
            case "Spell Caster", "Master Spell Caster":
                achievement.progress = Double(spells.filter { $0.manaCost > 0 }.count)
            case "Explorer", "Legendary Explorer":
                achievement.progress = Double(1)
            case "Boss Slayer", "Legendary Hero":
                achievement.progress = Double(capturedGhosts.filter { $0.isBoss }.count)
            case "Secret: Ghost Whisperer":
                achievement.progress = Double(capturedGhosts.filter { $0.isFriendly }.count)
            case "Secret: Pumpkin Lord":
                achievement.progress = Double(capturedGhosts.filter { $0.type == .pumpkinLord }.count)
            default:
                break
            }

            if achievement.progress >= achievement.target && !achievement.isUnlocked {
                achievement.isUnlocked = true
                achievements[index] = achievement

                score += achievement.points
                addNotification("🏆 Achievement unlocked: \(achievement.name)! +\(achievement.points) points!")
                triggerHaptic(.success)
                createParticles(at: CGPoint(x: 200, y: 300), count: 40, emoji: "🏆")
            } else {
                achievements[index] = achievement
            }
        }
    }

    // MARK: - Quest System

    func checkQuestProgress() {
        for questIndex in quests.indices {
            var quest = quests[questIndex]
            if quest.isCompleted { continue }

            var allCompleted = true
            var progress = 0.0

            for objective in quest.objectives {
                switch objective {
                case .collectGhosts(let target):
                    progress = Double(capturedGhosts.count) / Double(target)
                    if capturedGhosts.count < target { allCompleted = false }
                case .collectCandy(let target):
                    progress = Double(collectedCandies.count) / Double(target)
                    if collectedCandies.count < target { allCompleted = false }
                case .craftPotion:
                    break
                case .defeatBoss(let ghostType):
                    let hasCapturedBoss = capturedGhosts.contains { $0.type == ghostType && $0.isBoss }
                    if !hasCapturedBoss { allCompleted = false }
                    progress = hasCapturedBoss ? 1.0 : 0.0
                case .completeDungeon:
                    break
                case .findTreasure:
                    break
                case .exploreHouses:
                    break
                case .castSpells:
                    break
                case .earnGold(let target):
                    progress = Double(gold) / Double(target)
                    if gold < target { allCompleted = false }
                case .reachLevel(let target):
                    progress = Double(level) / Double(target)
                    if level < target { allCompleted = false }
                }
            }

            quest.progress = progress

            if allCompleted && !quest.isCompleted {
                quest.isCompleted = true
                quests[questIndex] = quest
                completeQuest(quest)
            } else {
                quests[questIndex] = quest
            }
        }
    }

    func completeQuest(_ quest: Quest) {
        let reward = quest.rewards
        experience += reward.experience
        gold += reward.gold

        addNotification("✅ Quest complete: \(quest.name)! +\(reward.experience) exp, +\(reward.gold) gold!")
        triggerHaptic(.success)
        createParticles(at: CGPoint(x: 200, y: 300), count: 30, emoji: "✨")
        checkLevelUp()
        checkAchievements()
    }

    // MARK: - Potion System

    func brewPotion(_ name: String, effect: PotionEffect, ingredients: [String] = []) {
        let quality: PotionQuality = ingredients.count >= 3 ? .excellent : (ingredients.count == 2 ? .good : .normal)
        let potion = PotionItem(
            id: UUID(),
            name: name,
            effect: effect,
            duration: effect.duration,
            potency: Double.random(in: 0.5...2.0) * (ingredients.count >= 3 ? 1.5 : 1.0),
            color: effect.color,
            ingredients: ingredients,
            quality: quality,
            isRare: ingredients.count >= 3
        )
        potions.append(potion)
        addNotification("🧪 Brewed \(name) (\(quality.rawValue) quality)!")
        triggerHaptic(.medium)
        checkAchievements()
        checkQuestProgress()
    }

    func usePotion(_ potion: PotionItem) {
        guard let index = potions.firstIndex(where: { $0.id == potion.id }) else { return }

        activeEffects.append(potion.effect)
        potions.remove(at: index)

        switch potion.effect {
        case .healing:
            health = min(maxHealth, health + 30)
        case .manaRestore:
            mana = min(maxMana, mana + 50)
        case .strength:
            break
        case .speed:
            break
        case .defense:
            break
        case .ghostVision:
            addNotification("👻 Ghost vision activated!")
        case .invisibility:
            addNotification("🫥 Invisibility activated!")
        case .teleportation:
            break
        case .timeFreeze:
            for i in ghosts.indices {
                ghosts[i].velocityX = 0
                ghosts[i].velocityY = 0
            }
            addNotification("⏰ Time frozen!")
        case .necromancy:
            addNotification("💀 Necromancy activated!")
        case .immortality:
            addNotification("♾️ Immortality activated!")
        case .chaos:
            addNotification("🌪️ Chaos unleashed!")
        case .luck:
            addNotification("🍀 Luck increased!")
        case .wisdom:
            addNotification("📖 Wisdom gained!")
        case .halloweenSpirit:
            addNotification("🎃 Halloween Spirit activated!")
        case .ghostKing:
            addNotification("👑 Ghost King power!")
        case .voidWalker:
            addNotification("🌌 Void Walker activated!")
        }

        triggerHaptic(.medium)
        createParticles(at: CGPoint(x: 200, y: 300), count: 20, emoji: "✨")
    }

    // MARK: - Mini Game System

    func playMiniGame(_ miniGame: MiniGame) -> Int {
        let score = Int.random(in: 0...100)
        let reward = miniGame.rewards

        if let index = miniGames.firstIndex(where: { $0.id == miniGame.id }) {
            miniGames[index].timesPlayed += 1
            if score > miniGames[index].highScore {
                miniGames[index].highScore = score
                addNotification("🏆 New high score in \(miniGame.name)!")
            }
        }

        experience += reward.experience
        gold += reward.gold

        addNotification("🎮 Played \(miniGame.name)! Score: \(score)")
        triggerHaptic(.medium)
        checkAchievements()
        checkQuestProgress()

        return score
    }

    // MARK: - Equipment System

    func equipItem(_ equipment: Equipment) {
        guard let index = self.equipment.firstIndex(where: { $0.id == equipment.id }) else { return }

        for i in self.equipment.indices {
            if self.equipment[i].type == equipment.type && self.equipment[i].isEquipped {
                self.equipment[i].isEquipped = false
            }
        }

        self.equipment[index].isEquipped = true

        for (stat, value) in equipment.stats {
            switch stat {
            case "Health":
                maxHealth += value
                health = min(maxHealth, health + value)
            case "Mana":
                maxMana += value
                mana = min(maxMana, mana + value)
            default:
                break
            }
        }

        addNotification("⚔️ Equipped \(equipment.name)!")
        triggerHaptic(.medium)
    }

    // MARK: - Helper Functions

    func addNotification(_ message: String) {
        notifications.insert(message, at: 0)
        if notifications.count > 100 {
            notifications.removeLast()
        }
    }

    func triggerHaptic(_ style: UINotificationFeedbackGenerator.FeedbackType) {
        UINotificationFeedbackGenerator().notificationOccurred(style)
    }

    func triggerHaptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }

    func toggleNightMode() {
        isNightMode.toggle()
        addNotification(isNightMode ? "🌙 Night mode activated!" : "☀️ Day mode activated!")
        if isNightMode {
            spawnRandomGhost()
            spawnRandomGhost()
        }
    }

    func toggleSpookyMode() {
        isSpookyMode.toggle()
        addNotification(isSpookyMode ? "👻 Spooky mode activated!" : "😊 Spooky mode deactivated!")
    }

    // MARK: - Save/Load System

    func saveGameData() {
        let encoder = JSONEncoder()
        do {
            let data = try encoder.encode(score)
            userDefaults.set(data, forKey: "halloweenUltimateScore")
            userDefaults.set(gold, forKey: "halloweenUltimateGold")
            userDefaults.set(level, forKey: "halloweenUltimateLevel")
            userDefaults.set(experience, forKey: "halloweenUltimateExperience")
            userDefaults.set(maxHealth, forKey: "halloweenUltimateMaxHealth")
            userDefaults.set(maxMana, forKey: "halloweenUltimateMaxMana")
            userDefaults.set(highestStreak, forKey: "halloweenUltimateStreak")
        } catch {
            print("Save failed: \(error)")
        }
    }

    func loadGameData() {
        score = userDefaults.integer(forKey: "halloweenUltimateScore")
        gold = userDefaults.integer(forKey: "halloweenUltimateGold")
        level = userDefaults.integer(forKey: "halloweenUltimateLevel")
        experience = userDefaults.integer(forKey: "halloweenUltimateExperience")
        maxHealth = userDefaults.integer(forKey: "halloweenUltimateMaxHealth")
        if maxHealth == 0 { maxHealth = 100 }
        health = maxHealth
        maxMana = userDefaults.integer(forKey: "halloweenUltimateMaxMana")
        if maxMana == 0 { maxMana = 100 }
        mana = maxMana
        highestStreak = userDefaults.integer(forKey: "halloweenUltimateStreak")
    }

    // MARK: - Reset System

    func resetGame() {
        score = 0
        gold = 500
        level = 1
        experience = 0
        health = 100
        maxHealth = 100
        mana = 100
        maxMana = 100
        stamina = 100
        maxStamina = 100
        comboCounter = 0
        streakCounter = 0
        highestStreak = 0

        ghosts.removeAll()
        capturedGhosts.removeAll()
        candies.removeAll()
        collectedCandies.removeAll()
        potions.removeAll()
        notifications.removeAll()
        particles.removeAll()
        activeEffects.removeAll()

        initializeGame()
        addNotification("🔄 Game reset! Happy Halloween!")
        triggerHaptic(.success)
    }
}

// ============================================================
// MARK: - 3. ULTIMATE MAIN VIEW (500+ Lines)
// ============================================================

struct UltimateContentView: View {
    @StateObject private var manager = HalloweenUltimateManager()
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab = 0
    @State private var showSettings = false
    @State private var showNotification = false
    @State private var notificationMessage = ""
    @State private var showUltimateAnimation = false
    @State private var tabOpacity: Double = 1.0

    var body: some View {
        ZStack {
            UltimateBackgroundView(manager: manager)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                UltimateStatusBar(manager: manager)

                // NOTE: Worlds (Maze + Graveyard 3D) are NOT tabs — they live in
                // Explore -> Worlds hub + Games list so the iPad bar never overflows.
                TabView(selection: $selectedTab) {
                    TunnelMazeView().tag(0)
                    UltimateCandyCollectView().tag(1)
                    UltimateMagicView().tag(2)
                    AvatarWorldView().tag(3)
                    UltimateExploreView().tag(4)
                    UltimateMiniGameView().tag(5)
                    UltimateAchievementView().tag(6)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                .opacity(tabOpacity)

                UltimateTabBar(selectedTab: $selectedTab, manager: manager)
            }

            ForEach(manager.particles) { particle in
                Text(particle.emoji)
                    .font(.system(size: particle.size))
                    .position(x: particle.x, y: particle.y)
                    .opacity(particle.opacity)
                    .rotationEffect(.degrees(particle.rotation))
                    .allowsHitTesting(false)
            }

            // Living Halloween storm — fog, bats, lightning (night mode)
            if manager.isNightMode {
                SpookyStormOverlay(manager: manager)
                    .transition(.opacity)
            }

            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button(action: { showSettings = true }) {
                        Image(systemName: "gear.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.orange)
                            .shadow(radius: 10)
                            .background(
                                Circle()
                                    .fill(Color.black.opacity(0.3))
                                    .frame(width: 60, height: 60)
                            )
                    }
                    .padding(.trailing, 20)
                    .padding(.bottom, 104)
                }
            }
        }
        .environmentObject(manager)
        .onAppear {
            setupAppearance()
            showUltimateAnimation = true
            SpookyMusic.shared.userStart()
        }
        .onChange(of: scenePhase) { phase in
            SpookyMusic.shared.setActive(phase == .active)
        }
        .sheet(isPresented: $showSettings) {
            UltimateSettingsView()
                .environmentObject(manager)
        }
        .sheet(isPresented: $showUltimateAnimation) {
            UltimateSplashView()
        }
    }

    func setupAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance

        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithTransparentBackground()
        navAppearance.backgroundColor = UIColor.clear
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
    }
}

// MARK: - Ultimate Background View

struct UltimateBackgroundView: View {
    @ObservedObject var manager: HalloweenUltimateManager
    @State private var floatingElements: [(emoji: String, x: CGFloat, y: CGFloat, scale: CGFloat)] = []

    var body: some View {
        ZStack {
            if manager.isNightMode {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.05, green: 0.02, blue: 0.15),
                        Color(red: 0.1, green: 0.03, blue: 0.2),
                        Color(red: 0.05, green: 0.01, blue: 0.1)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
            } else {
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.15, green: 0.08, blue: 0.25),
                        Color(red: 0.25, green: 0.12, blue: 0.35),
                        Color(red: 0.35, green: 0.15, blue: 0.3)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
            }

            if manager.isNightMode {
                Circle()
                    .fill(
                        RadialGradient(
                            gradient: Gradient(colors: [.white, .gray.opacity(0.3)]),
                            center: .center,
                            startRadius: 30,
                            endRadius: 100
                        )
                    )
                    .frame(width: 150, height: 150)
                    .position(x: UIScreen.main.bounds.width - 100, y: 80)
                    .shadow(color: .white.opacity(0.3), radius: 40)
            } else {
                Circle()
                    .fill(
                        RadialGradient(
                            gradient: Gradient(colors: [.orange, .yellow.opacity(0.5)]),
                            center: .center,
                            startRadius: 20,
                            endRadius: 80
                        )
                    )
                    .frame(width: 120, height: 120)
                    .position(x: UIScreen.main.bounds.width - 80, y: 80)
                    .shadow(color: .orange.opacity(0.3), radius: 30)
            }

            ForEach(0..<100) { _ in
                Circle()
                    .fill(Color.white.opacity(Double.random(in: 0.1...0.6)))
                    .frame(width: CGFloat.random(in: 1...4))
                    .position(
                        x: CGFloat.random(in: 0...UIScreen.main.bounds.width),
                        y: CGFloat.random(in: 0...UIScreen.main.bounds.height / 2)
                    )
            }

            ForEach(floatingElements.indices, id: \.self) { index in
                Text(floatingElements[index].emoji)
                    .font(.system(size: 30))
                    .position(x: floatingElements[index].x, y: floatingElements[index].y)
                    .scaleEffect(floatingElements[index].scale)
                    .opacity(0.3)
            }

            if manager.isSpookyMode {
                Rectangle()
                    .fill(Color.white.opacity(0.03))
                    .frame(height: 100)
                    .position(x: UIScreen.main.bounds.width / 2, y: UIScreen.main.bounds.height - 50)
            }
        }
        .onAppear {
            setupFloatingElements()
        }
    }

    func setupFloatingElements() {
        let emojis = ["🦇", "👻", "🧛", "🧙", "🧟", "🐺", "🕷️", "🕸️", "🎃", "🌙", "⭐", "✨"]
        for _ in 0..<15 {
            floatingElements.append(
                (
                    emoji: emojis.randomElement()!,
                    x: CGFloat.random(in: 50...UIScreen.main.bounds.width - 50),
                    y: CGFloat.random(in: 50...UIScreen.main.bounds.height - 50),
                    scale: CGFloat.random(in: 0.5...1.5)
                )
            )
        }
    }
}

// MARK: - Ultimate Status Bar

struct UltimateStatusBar: View {
    @ObservedObject var manager: HalloweenUltimateManager

    var body: some View {
        HStack(spacing: 12) {
            VStack(spacing: 2) {
                HStack {
                    Image(systemName: "heart.fill")
                        .foregroundColor(.red)
                        .font(.caption)
                    Text("\(manager.health)/\(manager.maxHealth)")
                        .font(.caption)
                        .foregroundColor(.white)
                }
                ProgressView(value: Double(manager.health), total: Double(manager.maxHealth))
                    .progressViewStyle(LinearProgressViewStyle(tint: .red))
                    .frame(width: 80)
            }

            VStack(spacing: 2) {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundColor(.blue)
                        .font(.caption)
                    Text("\(manager.mana)/\(manager.maxMana)")
                        .font(.caption)
                        .foregroundColor(.white)
                }
                ProgressView(value: Double(manager.mana), total: Double(manager.maxMana))
                    .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                    .frame(width: 80)
            }

            Spacer()

            HStack(spacing: 12) {
                StatBadge(icon: "⭐", value: "\(manager.score)", color: .gold)
                StatBadge(icon: "💰", value: "\(manager.gold)", color: .orange)
                StatBadge(icon: "👻", value: "\(manager.capturedGhosts.count)", color: .purple)
                StatBadge(icon: "🍬", value: "\(manager.collectedCandies.count)", color: .pink)
                MusicToggleButton(size: 16)
            }

            VStack {
                Text("Lv.\(manager.level)")
                    .font(.headline)
                    .foregroundColor(.orange)
                ProgressView(value: Double(manager.experience), total: Double(manager.level * 100 + manager.level * manager.level * 10))
                    .progressViewStyle(LinearProgressViewStyle(tint: .orange))
                    .frame(width: 60)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.black.opacity(0.6))
        .cornerRadius(12)
        .padding(.horizontal, 8)
        .padding(.top, 8)
    }
}

// MARK: - Ultimate Tab Bar

struct UltimateTabBar: View {
    @Binding var selectedTab: Int
    @ObservedObject var manager: HalloweenUltimateManager

    // 7 tabs max for iPad — Worlds (Maze 🌀 + Graveyard 🪦) live in Explore,
    // not here. See UltimateExploreView Worlds hub + Games list.
    let tabs = [
        ("⛏️", "Maze"),
        ("🍬", "Candy"),
        ("🦇", "Mine"),
        ("🌟", "World"),
        ("🏚️", "Explore"),
        ("🎮", "Games"),
        ("🏆", "Achieve")
    ]

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(0..<tabs.count, id: \.self) { index in
                        Button(action: {
                            withAnimation(.spring()) {
                                selectedTab = index
                            }
                            manager.triggerHaptic(.medium)
                        }) {
                            VStack(spacing: 2) {
                                Text(tabs[index].0)
                                    .font(.title2)
                                Text(tabs[index].1)
                                    .font(.caption2)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.7)
                                    .foregroundColor(selectedTab == index ? .orange : .gray)
                            }
                            .frame(width: 68)
                            .padding(.vertical, 8)
                            .background(
                                selectedTab == index ?
                                Color.orange.opacity(0.2) :
                                Color.clear
                            )
                            .cornerRadius(8)
                        }
                        .id(index)
                    }
                }
                .padding(.horizontal, 8)
            }
            .onChange(of: selectedTab) { idx in
                withAnimation(.spring()) {
                    proxy.scrollTo(idx, anchor: .center)
                }
            }
        }
        .padding(.bottom, 8)
        .background(Color.black.opacity(0.7))
        .cornerRadius(16)
        .padding(.horizontal, 8)
    }
}

// MARK: - Ultimate Notification View

struct UltimateNotificationView: View {
    let message: String

    var body: some View {
        HStack {
            Image(systemName: "bell.fill")
                .foregroundColor(.yellow)
            Text(message)
                .font(.headline)
                .foregroundColor(.white)
            Spacer()
        }
        .padding()
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.orange.opacity(0.9), Color.purple.opacity(0.9)]),
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(16)
        .padding(.horizontal, 20)
        .shadow(color: .orange.opacity(0.3), radius: 15)
    }
}

// MARK: - Ultimate Splash View

struct UltimateSplashView: View {
    @Environment(\.dismiss) var dismiss
    @State private var scale: CGFloat = 0.1
    @State private var opacity: Double = 0
    @State private var rotation: Double = 0
    @State private var emojis: [(String, CGFloat, CGFloat)] = []

    var body: some View {
        ZStack {
            Color.black.opacity(0.9)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("🎃")
                    .font(.system(size: 120))
                    .scaleEffect(scale)
                    .rotationEffect(.degrees(rotation))

                Text("HALLOWEEN")
                    .font(.system(size: 50, weight: .black))
                    .foregroundColor(.orange)
                    .opacity(opacity)

                Text("SPOOKTACULAR")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.purple)
                    .opacity(opacity)

                Text("🦇 👻 🧛 🧙 🧟 🐺 🎃")
                    .font(.system(size: 30))
                    .opacity(opacity)
            }

            ForEach(emojis.indices, id: \.self) { index in
                Text(emojis[index].0)
                    .font(.system(size: 30))
                    .position(x: emojis[index].1, y: emojis[index].2)
                    .opacity(0.5)
            }
        }
        .onAppear {
            setupEmojis()

            withAnimation(.spring(response: 0.8, dampingFraction: 0.6)) {
                scale = 1.0
            }

            withAnimation(.easeIn(duration: 0.5).delay(0.3)) {
                opacity = 1.0
            }

            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                rotation = 20
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                dismiss()
            }
        }
    }

    func setupEmojis() {
        let emojiList = ["👻", "🧛", "🧙", "🦇", "🎃", "⭐", "🌙", "✨", "💀", "🕷️"]
        let screenWidth = UIScreen.main.bounds.width
        let screenHeight = UIScreen.main.bounds.height

        for _ in 0..<20 {
            emojis.append(
                (
                    emojiList.randomElement()!,
                    CGFloat.random(in: 50...screenWidth - 50),
                    CGFloat.random(in: 50...screenHeight - 50)
                )
            )
        }
    }
}

// ============================================================
// MARK: - 4. ULTIMATE GHOST HUNT VIEW (400+ Lines)
// ============================================================

struct UltimateGhostHuntView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var selectedGhost: Ghost?
    @State private var showGhostDetail = false
    @State private var huntingMode = false
    @State private var searchText = ""
    @State private var filterRarity: GhostRarity?
    @State private var showFilter = false
    @State private var captureTarget: Ghost?
    @State private var showCaptureBattle = false

    var body: some View {
        NavigationView {
            ZStack {
                Color.clear

                VStack(spacing: 12) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search ghosts...", text: $searchText)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                        Button(action: { showFilter.toggle() }) {
                            Image(systemName: "slider.horizontal.3")
                                .foregroundColor(.orange)
                        }
                    }
                    .padding(8)
                    .background(Color(.systemBackground).opacity(0.8))
                    .cornerRadius(10)
                    .padding(.horizontal)

                    if showFilter {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                FilterChip(title: "All", isSelected: filterRarity == nil) {
                                    filterRarity = nil
                                }
                                ForEach(GhostRarity.allCases, id: \.self) { rarity in
                                    FilterChip(title: rarity.rawValue, isSelected: filterRarity == rarity) {
                                        filterRarity = rarity
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }

                    ScrollView {
                        LazyVGrid(columns: [
                            GridItem(.adaptive(minimum: 150), spacing: 16)
                        ], spacing: 16) {
                            ForEach(filteredGhosts) { ghost in
                                UltimateGhostCard(ghost: ghost)
                                    .onTapGesture {
                                        if huntingMode {
                                            captureTarget = ghost
                                            showCaptureBattle = true
                                        } else {
                                            selectedGhost = ghost
                                            showGhostDetail = true
                                        }
                                    }
                                    .onLongPressGesture {
                                        captureTarget = ghost
                                        showCaptureBattle = true
                                    }
                            }
                        }
                        .padding()
                    }

                    HStack(spacing: 16) {
                        Button(action: { manager.spawnRandomGhost() }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Summon")
                            }
                            .padding(12)
                            .background(Color.purple)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }

                        Button(action: { huntingMode.toggle() }) {
                            HStack {
                                Image(systemName: "target")
                                Text(huntingMode ? "Hunting" : "Hunt")
                            }
                            .padding(12)
                            .background(huntingMode ? Color.red : Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }

                        Button(action: { manager.toggleNightMode() }) {
                            HStack {
                                Image(systemName: manager.isNightMode ? "sun.max.fill" : "moon.fill")
                                Text(manager.isNightMode ? "Day" : "Night")
                            }
                            .padding(12)
                            .background(manager.isNightMode ? Color.yellow : Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }

                        Button(action: { manager.toggleSpookyMode() }) {
                            HStack {
                                Image(systemName: "ghost")
                                Text(manager.isSpookyMode ? "Spooky" : "Normal")
                            }
                            .padding(12)
                            .background(manager.isSpookyMode ? Color.green : Color.gray)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                }
            }
            .navigationTitle("👻 Ghost Hunt")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showGhostDetail) {
                if let ghost = selectedGhost {
                    UltimateGhostDetailView(ghost: ghost)
                        .environmentObject(manager)
                }
            }
            .sheet(isPresented: $showCaptureBattle) {
                if let target = captureTarget {
                    GhostCaptureBattleView(ghost: target) {
                        showCaptureBattle = false
                    }
                    .environmentObject(manager)
                }
            }
        }
    }

    var filteredGhosts: [Ghost] {
        var filtered = manager.ghosts

        if !searchText.isEmpty {
            filtered = filtered.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }

        if let rarity = filterRarity {
            filtered = filtered.filter { $0.type.rarity == rarity }
        }

        return filtered
    }
}

// MARK: - Ultimate Ghost Card

struct UltimateGhostCard: View {
    let ghost: Ghost
    @State private var isAnimating = false
    @State private var pulseEffect = false

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(ghost.type.color.opacity(0.15))
                    .frame(width: 90, height: 90)
                    .scaleEffect(pulseEffect ? 1.05 : 1.0)

                if ghost.hasShiny {
                    Circle()
                        .fill(Color.gold.opacity(0.3))
                        .frame(width: 100, height: 100)
                        .blur(radius: 10)
                }

                if ghost.isBoss {
                    Circle()
                        .fill(Color.red.opacity(0.2))
                        .frame(width: 100, height: 100)
                        .blur(radius: 8)
                }

                Text(ghost.type.emoji)
                    .font(.system(size: 50))
                    .scaleEffect(isAnimating ? 1.1 : 1.0)
                    .rotationEffect(.degrees(isAnimating ? 10 : 0))

                Text(moodEmoji(ghost.mood))
                    .font(.caption)
                    .offset(x: 35, y: -35)

                if ghost.isBoss {
                    Text("👑")
                        .font(.title3)
                        .offset(x: 30, y: -40)
                }

                if ghost.hasShiny {
                    Text("⭐")
                        .font(.title3)
                        .offset(x: -35, y: -40)
                }
            }

            Text(ghost.name)
                .font(.caption)
                .bold()
                .lineLimit(1)

            HStack(spacing: 4) {
                Text("Lv.\(ghost.level)")
                    .font(.caption2)
                Circle()
                    .fill(ghost.type.color)
                    .frame(width: 6, height: 6)
                Text("❤️ \(ghost.health)")
                    .font(.caption2)
            }

            if ghost.health < ghost.maxHealth {
                ProgressView(value: Double(ghost.health), total: Double(ghost.maxHealth))
                    .progressViewStyle(LinearProgressViewStyle(tint: .red))
                    .frame(width: 80)
            }

            Text(ghost.type.rarity.rawValue)
                .font(.system(size: 8))
                .foregroundColor(ghost.type.color)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(ghost.type.color.opacity(0.2))
                .cornerRadius(4)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground).opacity(0.85))
                .shadow(color: ghost.type.color.opacity(0.2), radius: 10)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(ghost.type.color.opacity(0.3), lineWidth: 1)
                )
        )
        .arcadePopIn(delay: Double(ghost.level % 5) * 0.05)
        .onAppear {
            withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                pulseEffect = true
            }
        }
    }

    func moodEmoji(_ mood: GhostMood) -> String {
        switch mood {
        case .happy: return "😊"
        case .sad: return "😢"
        case .angry: return "😡"
        case .scared: return "😨"
        case .playful: return "😜"
        case .sleepy: return "😴"
        case .hungry: return "🍽️"
        }
    }
}

// MARK: - Ultimate Ghost Detail View

struct UltimateGhostDetailView: View {
    let ghost: Ghost
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss
    @State private var showCaptureAnimation = false
    @State private var showBattle = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    ZStack {
                        Circle()
                            .fill(ghost.type.color.opacity(0.2))
                            .frame(width: 160, height: 160)
                            .scaleEffect(showCaptureAnimation ? 0.8 : 1.0)

                        Text(ghost.type.emoji)
                            .font(.system(size: 80))
                            .scaleEffect(showCaptureAnimation ? 0.5 : 1.0)
                            .rotationEffect(.degrees(showCaptureAnimation ? 360 : 0))

                        if ghost.hasShiny {
                            Circle()
                                .fill(Color.gold.opacity(0.3))
                                .frame(width: 170, height: 170)
                                .blur(radius: 15)
                        }
                    }
                    .animation(.spring(response: 0.6), value: showCaptureAnimation)

                    VStack(spacing: 12) {
                        Text(ghost.type.rawValue)
                            .font(.title.bold())

                        if ghost.isBoss {
                            Text("👑 BOSS GHOST")
                                .font(.title3.bold())
                                .foregroundColor(.orange)
                        }

                        if ghost.hasShiny {
                            Text("✨ SHINY ✨")
                                .font(.title3.bold())
                                .foregroundColor(.gold)
                        }

                        if ghost.isFriendly {
                            Text("👻 Friendly Ghost")
                                .font(.headline)
                                .foregroundColor(.green)
                        }

                        HStack {
                            Text("Level: \(ghost.level)")
                            Text("•")
                            Text("Rarity: \(ghost.type.rarity.rawValue)")
                                .foregroundColor(ghost.type.color)
                        }
                        .font(.headline)

                        Text("Mood: \(ghost.mood.rawValue)")
                            .font(.subheadline)

                        Text("Evolution Stage: \(ghost.evolutionStage)")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        HStack(spacing: 20) {
                            StatDetail(icon: "💪", value: "\(ghost.type.powerLevel)", label: "Power")
                            StatDetail(icon: "❤️", value: "\(ghost.health)/\(ghost.maxHealth)", label: "Health")
                            StatDetail(icon: "⭐", value: "\(ghost.type.points)", label: "Points")
                        }

                        if ghost.specialAbilityCooldown > 0 {
                            Text("Special Ability: \(ghost.type.specialAbility)")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }

                    if !ghost.isCaptured {
                        VStack(spacing: 12) {
                            Button(action: { showBattle = true }) {
                                HStack {
                                    Image(systemName: "bolt.fill")
                                    Text("⚔️ Capture Battle — weaken it first!")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.blue, Color.purple]),
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(12)
                            }
                            .arcadeGlowPulse(.blue)

                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.5)) {
                                    showCaptureAnimation = true
                                }
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                    manager.captureGhost(ghost)
                                    dismiss()
                                }
                            }) {
                                HStack {
                                    Image(systemName: "capture")
                                    Text("Quick Capture")
                                }
                                .font(.subheadline.bold())
                                .foregroundColor(.white.opacity(0.9))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.white.opacity(0.12))
                                .cornerRadius(12)
                            }

                            if ghost.isFriendly {
                                Button(action: {
                                    manager.addNotification("👻 You're friends with \(ghost.name)!")
                                }) {
                                    HStack {
                                        Image(systemName: "heart.fill")
                                        Text("Be Friend")
                                    }
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.green)
                                    .cornerRadius(12)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("💡 Tips")
                            .font(.headline)
                        Text("• Use spells to weaken ghosts")
                        Text("• Boss ghosts give 10x points")
                        Text("• Night mode increases ghost spawns")
                        Text("• Collect candies to boost power")
                        Text("• Friendly ghosts give friendship points")
                        Text("• Shiny ghosts are extremely rare!")
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                .padding()
            }
            .navigationTitle("Ghost Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .fullScreenCover(isPresented: $showBattle) {
                GhostCaptureBattleView(ghost: ghost) {
                    showBattle = false
                    if !manager.ghosts.contains(where: { $0.id == ghost.id }) {
                        dismiss()
                    }
                }
                .environmentObject(manager)
            }
        }
    }
}

// ============================================================
// MARK: - 5. ULTIMATE CANDY COLLECT VIEW (300+ Lines)
// ============================================================

struct UltimateCandyCollectView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var selectedCandy: CandyItem?
    @State private var showCandyDetail = false
    @State private var collectMode = false
    @State private var searchText = ""

    var body: some View {
        NavigationView {
            ZStack {
                Color.clear

                VStack(spacing: 12) {
                    HStack {
                        StatBadge(icon: "🍬", value: "\(manager.candies.count)", color: .pink)
                        StatBadge(icon: "🍭", value: "\(manager.collectedCandies.count)", color: .blue)
                        StatBadge(icon: "⭐", value: "\(manager.score)", color: .gold)
                        StatBadge(icon: "💰", value: "\(manager.gold)", color: .orange)
                    }
                    .padding(.horizontal)

                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search candies...", text: $searchText)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(8)
                    .background(Color(.systemBackground).opacity(0.8))
                    .cornerRadius(10)
                    .padding(.horizontal)

                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: 16) {
                            ForEach(filteredCandies) { candy in
                                UltimateCandyCard(candy: candy)
                                    .onTapGesture {
                                        if collectMode {
                                            manager.collectCandy(candy)
                                        } else {
                                            selectedCandy = candy
                                            showCandyDetail = true
                                        }
                                    }
                                    .onLongPressGesture {
                                        manager.collectCandy(candy)
                                    }
                            }
                        }
                        .padding()
                    }

                    HStack(spacing: 16) {
                        Button(action: { manager.spawnRandomCandy() }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Drop")
                            }
                            .padding(12)
                            .background(Color.pink)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }

                        Button(action: { collectMode.toggle() }) {
                            HStack {
                                Image(systemName: collectMode ? "hand.raised.fill" : "hand.raised")
                                Text(collectMode ? "Collecting" : "Collect")
                            }
                            .padding(12)
                            .background(collectMode ? Color.green : Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }

                        Button(action: {
                            for _ in 0..<3 {
                                manager.spawnRandomCandy()
                            }
                        }) {
                            HStack {
                                Image(systemName: "sparkles")
                                Text("Rare")
                            }
                            .padding(12)
                            .background(Color.gold)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                }
            }
            .navigationTitle("🍬 Candy Collection")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showCandyDetail) {
                if let candy = selectedCandy {
                    UltimateCandyDetailView(candy: candy)
                        .environmentObject(manager)
                }
            }
        }
    }

    var filteredCandies: [CandyItem] {
        var filtered = manager.candies

        if !searchText.isEmpty {
            filtered = filtered.filter { $0.type.rawValue.localizedCaseInsensitiveContains(searchText) }
        }

        return filtered
    }
}

// MARK: - Ultimate Candy Card

struct UltimateCandyCard: View {
    let candy: CandyItem
    @State private var isAnimating = false
    @State private var glowEffect = false

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(candy.isRare ? Color.gold.opacity(0.2) : Color.pink.opacity(0.1))
                    .frame(width: 80, height: 80)
                    .scaleEffect(glowEffect ? 1.05 : 1.0)

                if candy.sparkle {
                    Circle()
                        .fill(candy.glowColor.opacity(0.3))
                        .frame(width: 90, height: 90)
                        .blur(radius: 10)
                }

                Text(candy.type.emoji)
                    .font(.system(size: 45))
                    .scaleEffect(isAnimating ? 1.2 : 1.0)
                    .rotationEffect(.degrees(isAnimating ? 10 : 0))

                if candy.isRare {
                    Text("⭐")
                        .font(.caption)
                        .offset(x: 30, y: -30)
                }
            }

            Text(candy.type.rawValue.components(separatedBy: " ").last ?? "")
                .font(.caption)
                .bold()
                .lineLimit(1)

            Text("x\(candy.quantity)")
                .font(.caption2)
                .foregroundColor(.secondary)

            if candy.isRare {
                Text("✨ Rare")
                    .font(.caption2)
                    .foregroundColor(.gold)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.gold.opacity(0.2))
                    .cornerRadius(4)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground).opacity(0.85))
                .shadow(color: candy.isRare ? .gold.opacity(0.3) : .pink.opacity(0.2), radius: 10)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(candy.isRare ? Color.gold.opacity(0.5) : Color.clear, lineWidth: 2)
                )
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                glowEffect = true
            }
        }
    }
}

// MARK: - Ultimate Candy Detail View

struct UltimateCandyDetailView: View {
    let candy: CandyItem
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss
    @State private var showCollectAnimation = false
    @State private var spinEffect = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    ZStack {
                        Circle()
                            .fill(candy.isRare ? Color.gold.opacity(0.2) : Color.pink.opacity(0.1))
                            .frame(width: 160, height: 160)
                            .scaleEffect(spinEffect ? 1.1 : 1.0)

                        if candy.sparkle {
                            Circle()
                                .fill(candy.glowColor.opacity(0.3))
                                .frame(width: 180, height: 180)
                                .blur(radius: 20)
                        }

                        Text(candy.type.emoji)
                            .font(.system(size: 80))
                            .scaleEffect(showCollectAnimation ? 1.5 : 1.0)
                            .rotationEffect(.degrees(showCollectAnimation ? 720 : 0))
                    }
                    .animation(.spring(response: 0.6), value: showCollectAnimation)

                    VStack(spacing: 12) {
                        Text(candy.type.rawValue)
                            .font(.title.bold())

                        if candy.isRare {
                            Text("🌟 RARE CANDY")
                                .font(.title3.bold())
                                .foregroundColor(.gold)
                        }

                        HStack {
                            Text("Quantity: \(candy.quantity)")
                            Text("•")
                            Text("Weight: \(String(format: "%.1f", candy.weight))g")
                        }
                        .font(.headline)

                        HStack(spacing: 20) {
                            StatDetail(icon: "⭐", value: "\(candy.type.points)", label: "Points")
                            StatDetail(icon: "💰", value: "\(candy.type.points)", label: "Gold")
                            StatDetail(icon: "📦", value: "\(candy.quantity)", label: "Quantity")
                        }
                    }

                    if !candy.isCollected {
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.5)) {
                                showCollectAnimation = true
                            }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                manager.collectCandy(candy)
                                dismiss()
                            }
                        }) {
                            HStack {
                                Image(systemName: "bag.fill")
                                Text("Collect Candy")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.pink, Color.purple]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("🍭 Candy Facts")
                            .font(.headline)
                        Text("• Collect candies to earn points and gold")
                        Text("• Rare candies give 3x points")
                        Text("• Candies can be used to brew potions")
                        Text("• Some quests require candy collection")
                        Text("• Legendary candies are extremely rare!")
                        Text("• Candy collection contributes to achievements")
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                .padding()
            }
            .navigationTitle("Candy Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .onAppear {
                withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                    spinEffect = true
                }
            }
        }
    }
}

// ============================================================
// MARK: - 6. ULTIMATE MAGIC VIEW (400+ Lines)
// ============================================================

struct UltimateSpellbookView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var selectedSpell: Spell?
    @State private var showSpellDetail = false
    @State private var selectedPotion: PotionItem?
    @State private var showPotionDetail = false
    @State private var showBrewPotion = false
    @State private var activeTab = 0
    @State private var searchText = ""

    var body: some View {
        NavigationView {
            ZStack {
                Color.clear

                VStack(spacing: 0) {
                    VStack(spacing: 8) {
                        HStack {
                            Image(systemName: "sparkles")
                                .foregroundColor(.blue)
                            ProgressView(value: Double(manager.mana), total: Double(manager.maxMana))
                                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                            Text("\(manager.mana)/\(manager.maxMana)")
                                .font(.caption)
                                .foregroundColor(.blue)
                            Button(action: {
                                if manager.gold >= 50 {
                                    manager.gold -= 50
                                    manager.mana = manager.maxMana
                                    manager.addNotification("💙 Mana restored!")
                                }
                            }) {
                                Text("💎")
                                    .font(.title3)
                            }
                        }
                        .padding(.horizontal)

                        HStack {
                            Image(systemName: "heart.fill")
                                .foregroundColor(.red)
                            ProgressView(value: Double(manager.health), total: Double(manager.maxHealth))
                                .progressViewStyle(LinearProgressViewStyle(tint: .red))
                            Text("\(manager.health)/\(manager.maxHealth)")
                                .font(.caption)
                                .foregroundColor(.red)
                            Button(action: {
                                if manager.gold >= 30 {
                                    manager.gold -= 30
                                    manager.health = min(manager.maxHealth, manager.health + 30)
                                    manager.addNotification("💚 Health restored!")
                                }
                            }) {
                                Text("💚")
                                    .font(.title3)
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical, 8)
                    .background(Color(.systemBackground).opacity(0.8))

                    Picker("", selection: $activeTab) {
                        Text("Spells").tag(0)
                        Text("Potions").tag(1)
                        Text("Brew").tag(2)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal)

                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search...", text: $searchText)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(8)
                    .background(Color(.systemBackground).opacity(0.8))
                    .cornerRadius(10)
                    .padding(.horizontal)

                    if activeTab == 0 {
                        UltimateSpellsView(searchText: searchText)
                    } else if activeTab == 1 {
                        UltimatePotionsView()
                    } else {
                        UltimateBrewPotionView()
                    }
                }
            }
            .navigationTitle("✨ Magic & Potions")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showSpellDetail) {
                if let spell = selectedSpell {
                    UltimateSpellDetailView(spell: spell)
                        .environmentObject(manager)
                }
            }
            .sheet(isPresented: $showPotionDetail) {
                if let potion = selectedPotion {
                    UltimatePotionDetailView(potion: potion)
                        .environmentObject(manager)
                }
            }
            .sheet(isPresented: $showBrewPotion) {
                UltimateBrewPotionView()
                    .environmentObject(manager)
            }
        }
    }
}

// MARK: - Ultimate Spells View

struct UltimateSpellsView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    let searchText: String
    @State private var selectedCategory: SpellCategory?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "All", isSelected: selectedCategory == nil) {
                            selectedCategory = nil
                        }
                        ForEach(SpellCategory.allCases, id: \.self) { category in
                            FilterChip(title: category.rawValue, isSelected: selectedCategory == category) {
                                selectedCategory = category
                            }
                        }
                    }
                    .padding(.horizontal)
                }

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))], spacing: 16) {
                    ForEach(filteredSpells) { spell in
                        UltimateSpellCard(spell: spell)
                            .onTapGesture {
                                manager.castSpell(spell)
                            }
                    }
                }
                .padding()
            }
        }
    }

    var filteredSpells: [Spell] {
        var filtered = manager.spells

        if let category = selectedCategory {
            filtered = filtered.filter { $0.category == category }
        }

        if !searchText.isEmpty {
            filtered = filtered.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }

        return filtered
    }
}

// MARK: - Ultimate Spell Card

struct UltimateSpellCard: View {
    let spell: Spell
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var isAnimating = false
    @State private var showCooldown = false
    @State private var cooldownProgress: Double = 0
    @State private var pulseEffect = false

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 70, height: 70)
                    .scaleEffect(pulseEffect ? 1.05 : 1.0)

                Text(spell.animation)
                    .font(.system(size: 40))
                    .scaleEffect(isAnimating ? 1.2 : 1.0)
            }

            Text(spell.name)
                .font(.headline)
                .lineLimit(1)

            Text(spell.category.rawValue)
                .font(.caption2)
                .foregroundColor(.secondary)

            HStack {
                Text("💢 \(spell.damage)")
                    .font(.caption)
                Text("🧙 \(spell.manaCost)")
                    .font(.caption)
                Text("⏳ \(spell.cooldown)")
                    .font(.caption)
            }

            if spell.passive {
                Text("🔮 Passive")
                    .font(.caption2)
                    .foregroundColor(.purple)
            }

            if showCooldown {
                ProgressView(value: cooldownProgress, total: 1.0)
                    .progressViewStyle(LinearProgressViewStyle(tint: .orange))
                    .frame(width: 100)
            }

            Button(action: {
                manager.castSpell(spell)
                startCooldown()
            }) {
                Text("Cast")
                    .font(.caption)
                    .bold()
                    .padding(.horizontal, 20)
                    .padding(.vertical, 6)
                    .background(manager.mana >= spell.manaCost ? Color.blue : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
            .disabled(manager.mana < spell.manaCost || showCooldown)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground).opacity(0.85))
                .shadow(color: .blue.opacity(0.1), radius: 10)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(spell.passive ? Color.purple.opacity(0.3) : Color.blue.opacity(0.2), lineWidth: 1)
                )
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                pulseEffect = true
            }
        }
    }

    func startCooldown() {
        showCooldown = true
        cooldownProgress = 0
        Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { timer in
            cooldownProgress += 0.1 / Double(spell.cooldown)
            if cooldownProgress >= 1.0 {
                showCooldown = false
                timer.invalidate()
            }
        }
    }
}

// MARK: - Ultimate Spell Detail View

struct UltimateSpellDetailView: View {
    let spell: Spell
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss
    @State private var upgradeProgress: Double = 0

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.15))
                            .frame(width: 160, height: 160)

                        Text(spell.animation)
                            .font(.system(size: 80))
                    }

                    VStack(spacing: 12) {
                        Text(spell.name)
                            .font(.title.bold())

                        Text(spell.category.rawValue)
                            .font(.headline)
                            .foregroundColor(.secondary)

                        if spell.passive {
                            Text("🔮 Passive Ability")
                                .font(.headline)
                                .foregroundColor(.purple)
                        }

                        Text(spell.description)
                            .font(.body)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        HStack(spacing: 20) {
                            StatDetail(icon: "💢", value: "\(spell.damage)", label: "Damage")
                            StatDetail(icon: "🧙", value: "\(spell.manaCost)", label: "Mana Cost")
                            StatDetail(icon: "⏳", value: "\(spell.cooldown)s", label: "Cooldown")
                            StatDetail(icon: "📏", value: "\(spell.range)m", label: "Range")
                        }

                        if spell.aoe {
                            Text("🌊 Area of Effect")
                                .font(.headline)
                                .foregroundColor(.orange)
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Upgrade")
                            .font(.headline)

                        HStack {
                            Text("Level \(spell.upgradeLevel)")
                                .font(.caption)
                            Spacer()
                            Text("Next: \(spell.upgradeLevel + 1)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        ProgressView(value: upgradeProgress, total: 1.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: .orange))

                        Button(action: {
                            if manager.gold >= 100 {
                                manager.gold -= 100
                                upgradeProgress = min(1.0, upgradeProgress + 0.2)
                                manager.addNotification("✨ Spell upgraded!")
                            }
                        }) {
                            HStack {
                                Image(systemName: "arrow.up.circle.fill")
                                Text("Upgrade (100💰)")
                            }
                            .font(.caption)
                            .padding(8)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .disabled(manager.gold < 100)
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    Button(action: {
                        manager.castSpell(spell)
                        dismiss()
                    }) {
                        HStack {
                            Image(systemName: "wand.and.stars")
                            Text("Cast Spell")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            manager.mana >= spell.manaCost ?
                            Color.blue :
                            Color.gray
                        )
                        .cornerRadius(12)
                    }
                    .disabled(manager.mana < spell.manaCost)
                    .padding(.horizontal)
                }
                .padding()
            }
            .navigationTitle("Spell Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Ultimate Potions View

struct UltimatePotionsView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var showBrewPotion = false
    @State private var searchText = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Button(action: { showBrewPotion = true }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Brew New Potion")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.purple, Color.pink]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(12)
                }
                .padding(.horizontal)

                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Search potions...", text: $searchText)
                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }
                }
                .padding(8)
                .background(Color(.systemBackground).opacity(0.8))
                .cornerRadius(10)
                .padding(.horizontal)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))], spacing: 16) {
                    ForEach(filteredPotions) { potion in
                        UltimatePotionCard(potion: potion)
                            .onTapGesture {
                                manager.usePotion(potion)
                            }
                    }
                }
                .padding()
            }
        }
        .sheet(isPresented: $showBrewPotion) {
            UltimateBrewPotionView()
                .environmentObject(manager)
        }
    }

    var filteredPotions: [PotionItem] {
        if searchText.isEmpty {
            return manager.potions
        }
        return manager.potions.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }
}

// MARK: - Ultimate Potion Card

struct UltimatePotionCard: View {
    let potion: PotionItem
    @State private var isAnimating = false
    @State private var glowEffect = false

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(potion.color.opacity(0.15))
                    .frame(width: 70, height: 70)
                    .scaleEffect(glowEffect ? 1.05 : 1.0)

                Circle()
                    .fill(potion.color.opacity(0.3))
                    .frame(width: 50, height: 50)
                    .scaleEffect(isAnimating ? 1.2 : 1.0)

                Text("🧪")
                    .font(.system(size: 30))
            }

            Text(potion.name)
                .font(.headline)
                .lineLimit(1)

            Text(potion.effect.rawValue)
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                Text("⏳ \(potion.duration)s")
                    .font(.caption)
                Text("💪 \(String(format: "%.1f", potion.potency))")
                    .font(.caption)
            }

            if potion.isRare {
                Text("✨ Rare")
                    .font(.caption2)
                    .foregroundColor(.gold)
            }

            Text("Use")
                .font(.caption)
                .bold()
                .padding(.horizontal, 20)
                .padding(.vertical, 4)
                .background(Color.green)
                .foregroundColor(.white)
                .cornerRadius(8)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground).opacity(0.85))
                .shadow(color: potion.color.opacity(0.2), radius: 10)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(potion.color.opacity(0.3), lineWidth: 1)
                )
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                glowEffect = true
            }
        }
    }
}

// MARK: - Ultimate Potion Detail View

struct UltimatePotionDetailView: View {
    let potion: PotionItem
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    ZStack {
                        Circle()
                            .fill(potion.color.opacity(0.15))
                            .frame(width: 160, height: 160)

                        Circle()
                            .fill(potion.color.opacity(0.3))
                            .frame(width: 100, height: 100)

                        Text("🧪")
                            .font(.system(size: 60))
                    }

                    VStack(spacing: 12) {
                        Text(potion.name)
                            .font(.title.bold())

                        Text(potion.effect.rawValue)
                            .font(.headline)
                            .foregroundColor(.secondary)

                        if potion.isRare {
                            Text("🌟 RARE POTION")
                                .font(.headline)
                                .foregroundColor(.gold)
                        }

                        Text("Quality: \(potion.quality.rawValue)")
                            .font(.subheadline)

                        HStack(spacing: 20) {
                            StatDetail(icon: "⏳", value: "\(potion.duration)s", label: "Duration")
                            StatDetail(icon: "💪", value: String(format: "%.1f", potion.potency), label: "Potency")
                        }
                    }

                    Button(action: {
                        manager.usePotion(potion)
                        dismiss()
                    }) {
                        HStack {
                            Image(systemName: "hand.raised.fill")
                            Text("Use Potion")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("📋 Ingredients")
                            .font(.headline)
                        ForEach(potion.ingredients, id: \.self) { ingredient in
                            Text("• \(ingredient)")
                                .font(.caption)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("✨ Effects")
                            .font(.headline)
                        Text("• \(potion.effect.rawValue) for \(potion.duration) seconds")
                        Text("• Potency: \(String(format: "%.1f", potion.potency))x")
                        Text("• Quality: \(potion.quality.rawValue)")
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                .padding()
            }
            .navigationTitle("Potion Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Ultimate Brew Potion View

struct UltimateBrewPotionView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss
    @State private var potionName = ""
    @State private var selectedEffect: PotionEffect = .healing
    @State private var selectedIngredients: [String] = []
    @State private var brewProgress: Double = 0
    @State private var isBrewing = false
    @State private var showIngredients = false

    let availableIngredients = [
        "🧪 Ghost Essence",
        "🍄 Magic Mushroom",
        "🌿 Moonflower",
        "💎 Crystal Shard",
        "🦇 Bat Wing",
        "🐺 Wolf Hair",
        "🧛 Vampire Blood",
        "🧹 Witch Broom",
        "💀 Skeleton Bone",
        "🕷️ Spider Silk"
    ]

    let effectDescriptions: [PotionEffect: String] = [
        .healing: "Restores health",
        .manaRestore: "Restores mana",
        .strength: "Increases attack power",
        .speed: "Increases movement speed",
        .defense: "Increases defense",
        .ghostVision: "See ghosts",
        .invisibility: "Become invisible",
        .teleportation: "Teleport anywhere",
        .timeFreeze: "Freeze time",
        .necromancy: "Raise the dead",
        .immortality: "Become immortal",
        .chaos: "Unleash chaos",
        .luck: "Increase luck",
        .wisdom: "Gain wisdom",
        .halloweenSpirit: "Halloween boost",
        .ghostKing: "Ghost king power",
        .voidWalker: "Void walker"
    ]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    TextField("Potion Name", text: $potionName)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .padding(.horizontal)
                        .font(.headline)

                    VStack(alignment: .leading) {
                        Text("Select Effect")
                            .font(.headline)
                            .padding(.horizontal)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(PotionEffect.allCases, id: \.self) { effect in
                                    Button(action: { selectedEffect = effect }) {
                                        VStack {
                                            Circle()
                                                .fill(effect.color.opacity(0.3))
                                                .frame(width: 40, height: 40)
                                                .overlay(
                                                    Circle()
                                                        .stroke(selectedEffect == effect ? Color.orange : Color.clear, lineWidth: 2)
                                                )
                                            Text(effect.rawValue.components(separatedBy: " ").last ?? "")
                                                .font(.caption2)
                                        }
                                        .padding(8)
                                        .background(selectedEffect == effect ? Color.orange.opacity(0.2) : Color.clear)
                                        .cornerRadius(8)
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }

                    Text(effectDescriptions[selectedEffect] ?? "")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.horizontal)

                    VStack(alignment: .leading) {
                        HStack {
                            Text("Ingredients")
                                .font(.headline)
                            Spacer()
                            Button(action: { showIngredients.toggle() }) {
                                Image(systemName: showIngredients ? "chevron.up" : "chevron.down")
                            }
                        }
                        .padding(.horizontal)

                        if showIngredients {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(availableIngredients, id: \.self) { ingredient in
                                        let owned = manager.ingredientCount(ingredient)
                                        let held = selectedIngredients.filter { $0 == ingredient }.count
                                        let isSel = selectedIngredients.contains(ingredient)
                                        Button(action: {
                                            if let index = selectedIngredients.firstIndex(of: ingredient) {
                                                selectedIngredients.remove(at: index)
                                            } else if selectedIngredients.count < 3 && held < owned {
                                                selectedIngredients.append(ingredient)
                                                manager.triggerHaptic(.light)
                                            } else {
                                                manager.triggerHaptic(.error)
                                            }
                                        }) {
                                            VStack(spacing: 2) {
                                                Text(ingredient)
                                                    .font(.caption)
                                                Text(owned > 0 ? "×\(owned - held) in stash" : "none yet — go gather!")
                                                    .font(.caption2.bold())
                                                    .foregroundColor(owned > held ? .green : .red)
                                            }
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(
                                                isSel ?
                                                Color.green.opacity(0.3) :
                                                (owned > 0 ? Color(.secondarySystemBackground) : Color.gray.opacity(0.25))
                                            )
                                            .cornerRadius(8)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 8)
                                                    .stroke(isSel ? Color.green : Color.clear, lineWidth: 1)
                                            )
                                            .opacity(owned == 0 && !isSel ? 0.55 : 1)
                                        }
                                        .disabled(owned == 0)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    VStack(spacing: 4) {
                        Text("Selected: \(selectedIngredients.count)/3 ingredients")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("🎒 \(manager.totalIngredients()) in stash — hunt ghosts, grab candy, clear mazes & play arcade to gather more")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }

                    if isBrewing {
                        VStack {
                            ProgressView(value: brewProgress, total: 1.0)
                                .progressViewStyle(LinearProgressViewStyle(tint: .purple))
                                .frame(height: 10)

                            Text("\(Int(brewProgress * 100))%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal)
                    }

                    Button(action: startBrewing) {
                        HStack {
                            Image(systemName: "flask.fill")
                            Text(isBrewing ? "Brewing..." : "Brew Potion")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            isBrewing || potionName.isEmpty || selectedIngredients.isEmpty ?
                            Color.gray :
                            Color.purple
                        )
                        .cornerRadius(12)
                    }
                    .disabled(isBrewing || potionName.isEmpty || selectedIngredients.isEmpty)
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("💡 Brewing Tips")
                            .font(.headline)
                        Text("• Ghosts drop 👻 essences, candy patches hide 🌿 herbs")
                        Text("• Mazes, quests & arcade wins stash rare finds")
                        Text("• 3 ingredients = ✨ Excellent quality + stronger brew")
                        Text("• Potions can be used in combat")
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("🧪 Brew Potion")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear { manager.ensureStarterIngredients() }
        }
    }

    func startBrewing() {
        let used = selectedIngredients
        guard manager.useIngredients(used) else { return }
        isBrewing = true
        brewProgress = 0

        Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { timer in
            brewProgress += 0.02
            if brewProgress >= 1.0 {
                timer.invalidate()
                isBrewing = false

                manager.brewPotion(potionName, effect: selectedEffect, ingredients: used)
                selectedIngredients = []
                dismiss()
            }
        }
    }
}

// ============================================================
// MARK: - 7. ULTIMATE QUEST VIEW (300+ Lines)
// ============================================================

struct UltimateQuestView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var selectedQuest: Quest?
    @State private var showQuestDetail = false
    @State private var activeFilter: QuestDifficulty?
    @State private var searchText = ""
    @State private var showDaily = true

    var body: some View {
        NavigationView {
            ZStack {
                Color.clear

                VStack(spacing: 12) {
                    HStack {
                        StatBadge(icon: "📜", value: "\(manager.quests.filter { !$0.isCompleted }.count)", color: .blue)
                        StatBadge(icon: "✅", value: "\(manager.quests.filter { $0.isCompleted }.count)", color: .green)
                        StatBadge(icon: "⭐", value: "\(manager.score)", color: .gold)
                        StatBadge(icon: "🔥", value: "\(manager.streakCounter)", color: .orange)
                    }
                    .padding(.horizontal)

                    Toggle("Show Daily Quests", isOn: $showDaily)
                        .padding(.horizontal)
                        .font(.caption)

                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search quests...", text: $searchText)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(8)
                    .background(Color(.systemBackground).opacity(0.8))
                    .cornerRadius(10)
                    .padding(.horizontal)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            FilterChip(title: "All", isSelected: activeFilter == nil) {
                                activeFilter = nil
                            }
                            ForEach(QuestDifficulty.allCases, id: \.self) { difficulty in
                                FilterChip(title: difficulty.rawValue, isSelected: activeFilter == difficulty) {
                                    activeFilter = difficulty
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredQuests) { quest in
                                UltimateQuestCard(quest: quest)
                                    .onTapGesture {
                                        selectedQuest = quest
                                        showQuestDetail = true
                                    }
                                    .onLongPressGesture {
                                        manager.checkQuestProgress()
                                    }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("📜 Quests")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showQuestDetail) {
                if let quest = selectedQuest {
                    UltimateQuestDetailView(quest: quest)
                        .environmentObject(manager)
                }
            }
        }
    }

    var filteredQuests: [Quest] {
        var filtered = manager.quests

        if !showDaily {
            filtered = filtered.filter { !$0.isDaily }
        }

        if let difficulty = activeFilter {
            filtered = filtered.filter { $0.difficulty == difficulty }
        }

        if !searchText.isEmpty {
            filtered = filtered.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }

        return filtered
    }
}

// MARK: - Ultimate Quest Card

struct UltimateQuestCard: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    let quest: Quest
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: quest.isCompleted ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(quest.isCompleted ? .green : .gray)
                    .font(.title2)

                VStack(alignment: .leading) {
                    Text(quest.name)
                        .font(.headline)
                    Text(quest.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text(quest.difficulty.rawValue)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(quest.difficulty.color.opacity(0.2))
                        .cornerRadius(4)

                    if quest.isDaily {
                        Text("Daily")
                            .font(.caption2)
                            .foregroundColor(.blue)
                    }
                }
            }

            if !quest.isCompleted {
                ProgressView(value: quest.progress, total: 1.0)
                    .progressViewStyle(LinearProgressViewStyle(tint: quest.difficulty.color))
                    .frame(height: 4)

                Text("\(Int(quest.progress * 100))% complete")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("Rewards:")
                    .font(.caption)
                    .bold()
                Text("+\(quest.rewards.experience) XP")
                    .font(.caption)
                    .foregroundColor(.orange)
                Text("+\(quest.rewards.gold) 🪙")
                    .font(.caption)
                    .foregroundColor(.gold)
                if !quest.rewards.rareItems.isEmpty {
                    Text("⭐ Rare Items")
                        .font(.caption)
                        .foregroundColor(.purple)
                }
            }

            if quest.isCompleted {
                Text("✅ Completed")
                    .font(.caption)
                    .foregroundColor(.green)
            }

            if !quest.objectives.isEmpty {
                Button(action: { isExpanded.toggle() }) {
                    Text(isExpanded ? "Hide Objectives" : "Show Objectives")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }

            if isExpanded {
                ForEach(quest.objectives, id: \.self) { objective in
                    HStack {
                        Image(systemName: "circle.fill")
                            .font(.caption2)
                            .foregroundColor(.blue)
                        Text(questObjectiveDescription(objective))
                            .font(.caption)
                        Spacer()
                        if questObjectiveComplete(objective) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                    .padding(.leading, 8)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground).opacity(0.85))
                .shadow(color: quest.difficulty.color.opacity(0.1), radius: 10)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(quest.isCompleted ? Color.green.opacity(0.3) : quest.difficulty.color.opacity(0.2), lineWidth: 1)
                )
        )
    }

    func questObjectiveDescription(_ objective: QuestObjective) -> String {
        switch objective {
        case .collectGhosts(let count):
            return "Capture \(count) ghosts (Current: \(manager.capturedGhosts.count))"
        case .collectCandy(let count):
            return "Collect \(count) candies (Current: \(manager.collectedCandies.count))"
        case .craftPotion(let effect):
            return "Brew a \(effect.rawValue) potion"
        case .defeatBoss(let ghostType):
            return "Defeat a \(ghostType.rawValue) boss"
        case .completeDungeon(let name):
            return "Complete \(name) dungeon"
        case .findTreasure(let name):
            return "Find \(name) treasure"
        case .exploreHouses(let count):
            return "Explore \(count) haunted houses"
        case .castSpells(let count):
            return "Cast \(count) spells (Current: \(manager.spells.filter { $0.manaCost > 0 }.count))"
        case .earnGold(let amount):
            return "Earn \(amount) gold (Current: \(manager.gold))"
        case .reachLevel(let level):
            return "Reach level \(level) (Current: \(manager.level))"
        }
    }

    func questObjectiveComplete(_ objective: QuestObjective) -> Bool {
        switch objective {
        case .collectGhosts(let count):
            return manager.capturedGhosts.count >= count
        case .collectCandy(let count):
            return manager.collectedCandies.count >= count
        case .craftPotion:
            return false
        case .defeatBoss(let ghostType):
            return manager.capturedGhosts.contains { $0.type == ghostType && $0.isBoss }
        case .completeDungeon:
            return false
        case .findTreasure:
            return false
        case .exploreHouses:
            return false
        case .castSpells:
            return false
        case .earnGold(let amount):
            return manager.gold >= amount
        case .reachLevel(let level):
            return manager.level >= level
        }
    }
}

// MARK: - Ultimate Quest Detail View

struct UltimateQuestDetailView: View {
    let quest: Quest
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss
    @State private var showRewardAnimation = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 12) {
                        Image(systemName: quest.isCompleted ? "checkmark.circle.fill" : "scroll.fill")
                            .font(.system(size: 60))
                            .foregroundColor(quest.isCompleted ? .green : .blue)

                        Text(quest.name)
                            .font(.largeTitle.bold())

                        Text(quest.difficulty.rawValue)
                            .font(.headline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(quest.difficulty.color.opacity(0.2))
                            .cornerRadius(8)

                        if quest.isDaily {
                            Text("📅 Daily Quest")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }

                        if let expires = quest.expires {
                            Text("Expires: \(expires, style: .date)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("📝 Description")
                            .font(.headline)
                        Text(quest.description)
                            .font(.body)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("🎯 Objectives")
                            .font(.headline)

                        ForEach(quest.objectives, id: \.self) { objective in
                            HStack {
                                Image(systemName: "circle.fill")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                                Text(detailObjectiveDescription(objective))
                                    .font(.caption)
                                Spacer()
                                if detailObjectiveComplete(objective) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("🎁 Rewards")
                            .font(.headline)

                        HStack(spacing: 12) {
                            Text("⭐ \(quest.rewards.experience) XP")
                                .padding()
                                .background(Color.orange.opacity(0.2))
                                .cornerRadius(8)
                            Text("🪙 \(quest.rewards.gold) Gold")
                                .padding()
                                .background(Color.gold.opacity(0.2))
                                .cornerRadius(8)
                        }

                        if !quest.rewards.rareItems.isEmpty {
                            Text("🌟 Rare Items:")
                                .font(.caption)
                                .bold()
                            ForEach(quest.rewards.rareItems, id: \.self) { item in
                                Text("• \(item)")
                                    .font(.caption)
                            }
                        }

                        if !quest.rewards.unlockables.isEmpty {
                            Text("🔓 Unlockables:")
                                .font(.caption)
                                .bold()
                            ForEach(quest.rewards.unlockables, id: \.self) { unlockable in
                                Text("• \(unlockable)")
                                    .font(.caption)
                            }
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    if !quest.isCompleted {
                        VStack {
                            Text("Progress")
                                .font(.headline)
                            ProgressView(value: quest.progress, total: 1.0)
                                .progressViewStyle(LinearProgressViewStyle(tint: quest.difficulty.color))
                                .frame(height: 8)
                            Text("\(Int(quest.progress * 100))% complete")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }

                    if !quest.isCompleted {
                        Button(action: {
                            manager.checkQuestProgress()
                        }) {
                            HStack {
                                Image(systemName: "arrow.clockwise")
                                Text("Check Progress")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)
                    }

                    if quest.isCompleted {
                        Button(action: {
                            withAnimation(.spring()) {
                                showRewardAnimation = true
                            }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                dismiss()
                            }
                        }) {
                            HStack {
                                Image(systemName: "star.fill")
                                Text("Claim Rewards!")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                LinearGradient(gradient: Gradient(colors: [.orange, .gold]), startPoint: .leading, endPoint: .trailing)
                            )
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)
                    }
                }
                .padding()
            }
            .navigationTitle("Quest Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .overlay(
                Group {
                    if showRewardAnimation {
                        RewardAnimationView()
                    }
                }
            )
        }
    }

    func detailObjectiveDescription(_ objective: QuestObjective) -> String {
        switch objective {
        case .collectGhosts(let count):
            return "Capture \(count) ghosts (Current: \(manager.capturedGhosts.count))"
        case .collectCandy(let count):
            return "Collect \(count) candies (Current: \(manager.collectedCandies.count))"
        case .craftPotion(let effect):
            return "Brew a \(effect.rawValue) potion"
        case .defeatBoss(let ghostType):
            return "Defeat a \(ghostType.rawValue) boss"
        case .completeDungeon(let name):
            return "Complete \(name) dungeon"
        case .findTreasure(let name):
            return "Find \(name) treasure"
        case .exploreHouses(let count):
            return "Explore \(count) haunted houses"
        case .castSpells(let count):
            return "Cast \(count) spells"
        case .earnGold(let amount):
            return "Earn \(amount) gold (Current: \(manager.gold))"
        case .reachLevel(let level):
            return "Reach level \(level) (Current: \(manager.level))"
        }
    }

    func detailObjectiveComplete(_ objective: QuestObjective) -> Bool {
        switch objective {
        case .collectGhosts(let count):
            return manager.capturedGhosts.count >= count
        case .collectCandy(let count):
            return manager.collectedCandies.count >= count
        case .craftPotion:
            return false
        case .defeatBoss(let ghostType):
            return manager.capturedGhosts.contains { $0.type == ghostType && $0.isBoss }
        case .completeDungeon:
            return false
        case .findTreasure:
            return false
        case .exploreHouses:
            return false
        case .castSpells:
            return false
        case .earnGold(let amount):
            return manager.gold >= amount
        case .reachLevel(let level):
            return manager.level >= level
        }
    }
}

// MARK: - Reward Animation View

struct RewardAnimationView: View {
    @State private var scale: CGFloat = 0.1
    @State private var opacity: Double = 0
    @State private var rotation: Double = 0

    var body: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("🎉")
                    .font(.system(size: 100))
                    .scaleEffect(scale)
                    .rotationEffect(.degrees(rotation))

                Text("Quest Complete!")
                    .font(.largeTitle.bold())
                    .foregroundColor(.gold)
                    .opacity(opacity)

                Text("Rewards Claimed!")
                    .font(.title2)
                    .foregroundColor(.white)
                    .opacity(opacity)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.6)) {
                scale = 1.0
            }

            withAnimation(.easeIn(duration: 0.5).delay(0.3)) {
                opacity = 1.0
            }

            withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                rotation = 360
            }
        }
        .onDisappear {
            withAnimation(.easeOut(duration: 0.3)) {
                opacity = 0
            }
        }
    }
}

// ============================================================
// MARK: - 8. ULTIMATE EXPLORE VIEW (300+ Lines)
// ============================================================

struct UltimateExploreView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var selectedHouse: HauntedHouse?
    @State private var showHouseDetail = false
    @State private var exploreMode = false
    @State private var searchText = ""
    @State private var showMaze = false
    @State private var showGraveyard = false

    let houses: [HauntedHouse] = [
        HauntedHouse(name: "Cemetery Manor", location: "Darkwood Forest", floors: 3, ghosts: [], treasures: [], isExplored: false, difficulty: 2, image: "🏚️"),
        HauntedHouse(name: "Castle of Shadows", location: "Misty Mountains", floors: 5, ghosts: [], treasures: [], isExplored: false, difficulty: 4, image: "🏰"),
        HauntedHouse(name: "Abandoned Asylum", location: "Cursed Valley", floors: 4, ghosts: [], treasures: [], isExplored: false, difficulty: 3, image: "🏥"),
        HauntedHouse(name: "Ghostly Mansion", location: "Haunted Hills", floors: 6, ghosts: [], treasures: [], isExplored: false, difficulty: 5, image: "🏛️"),
        HauntedHouse(name: "Witch's Cottage", location: "Enchanted Forest", floors: 2, ghosts: [], treasures: [], isExplored: false, difficulty: 1, image: "🛖"),
        HauntedHouse(name: "Vampire Castle", location: "Transylvania", floors: 7, ghosts: [], treasures: [], isExplored: false, difficulty: 6, image: "🏯"),
        HauntedHouse(name: "Werewolf Den", location: "Dark Woods", floors: 3, ghosts: [], treasures: [], isExplored: false, difficulty: 3, image: "🏕️"),
        HauntedHouse(name: "Pumpkin Patch", location: "Harvest Field", floors: 1, ghosts: [], treasures: [], isExplored: false, difficulty: 1, image: "🎃")
    ]

    var body: some View {
        NavigationView {
            ZStack {
                Color.clear

                VStack(spacing: 12) {
                    HStack {
                        StatBadge(icon: "🏚️", value: "\(houses.count)", color: .purple)
                        StatBadge(icon: "✅", value: "\(houses.filter { $0.isExplored }.count)", color: .green)
                        StatBadge(icon: "⭐", value: "\(manager.score)", color: .gold)
                        StatBadge(icon: "🗺️", value: "\(manager.level)", color: .blue)
                    }
                    .padding(.horizontal)

                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search houses...", text: $searchText)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(8)
                    .background(Color(.systemBackground).opacity(0.8))
                    .cornerRadius(10)
                    .padding(.horizontal)

                    // Worlds hub: Maze + Graveyard 3D live here (NOT in the sidebar,
                    // so the iPad tab bar never overflows).
                    // Haunted Maze banner (ported from HallowHunt's Raven Lane)
                    Button(action: {
                        showMaze = true
                        manager.triggerHaptic(.medium)
                    }) {
                        HStack(spacing: 12) {
                            Text("🌀")
                                .font(.system(size: 40))
                            VStack(alignment: .leading, spacing: 3) {
                                Text("THE HAUNTED MAZE")
                                    .font(.headline.bold())
                                    .foregroundColor(.white)
                                Text("8 Raven Lane houses • knock thrice • brave the fog • find the 🚪")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.85))
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.white.opacity(0.8))
                        }
                        .padding()
                        .background(
                            LinearGradient(gradient: Gradient(colors: [.purple, .orange]), startPoint: .leading, endPoint: .trailing)
                        )
                        .cornerRadius(14)
                        .shadow(color: .purple.opacity(0.35), radius: 10)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal)

                    // Spooky Graveyard 3D banner — the Halloween iPad world
                    Button(action: {
                        showGraveyard = true
                        manager.triggerHaptic(.medium)
                    }) {
                        HStack(spacing: 12) {
                            Text("🪦")
                                .font(.system(size: 40))
                            VStack(alignment: .leading, spacing: 3) {
                                Text("SPOOKY GRAVEYARD 3D")
                                    .font(.headline.bold())
                                    .foregroundColor(.white)
                                Text("Mine ⛏️ ores • fight 👻 ghosts • loot 🏚️ crypts — full 3D!")
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.85))
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.white.opacity(0.8))
                        }
                        .padding()
                        .background(
                            LinearGradient(gradient: Gradient(colors: [.green, .black]), startPoint: .leading, endPoint: .trailing)
                        )
                        .cornerRadius(14)
                        .shadow(color: .green.opacity(0.35), radius: 10)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal)

                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))], spacing: 16) {
                            ForEach(filteredHouses) { house in
                                UltimateHouseCard(house: house)
                                    .onTapGesture {
                                        selectedHouse = house
                                        showHouseDetail = true
                                    }
                                    .onLongPressGesture {
                                        if exploreMode {
                                            exploreHouse(house)
                                        }
                                    }
                            }
                        }
                        .padding()
                    }

                    HStack(spacing: 16) {
                        Button(action: { exploreMode.toggle() }) {
                            HStack {
                                Image(systemName: exploreMode ? "map.fill" : "map")
                                Text(exploreMode ? "Exploring" : "Explore")
                            }
                            .padding(12)
                            .background(exploreMode ? Color.green : Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }

                        Button(action: { generateNewHouse() }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("New")
                            }
                            .padding(12)
                            .background(Color.purple)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                }
            }
            .navigationTitle("🏚️ Explore")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showHouseDetail) {
                if let house = selectedHouse {
                    UltimateHouseDetailView(house: house)
                        .environmentObject(manager)
                }
            }
            .sheet(isPresented: $showMaze) {
                MazeEscapeHostView(onDone: { showMaze = false })
                    .environmentObject(manager)
            }
            .sheet(isPresented: $showGraveyard) {
                SpookyGraveyardView(onDone: { showGraveyard = false })
                    .environmentObject(manager)
            }
        }
    }

    var filteredHouses: [HauntedHouse] {
        if searchText.isEmpty {
            return houses
        }
        return houses.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    func exploreHouse(_ house: HauntedHouse) {
        manager.addNotification("🔦 Exploring \(house.name)...")
        manager.triggerHaptic(.medium)

        for _ in 0..<Int.random(in: 1...3) {
            manager.spawnRandomGhost()
        }

        if Bool.random() {
            let reward = Int.random(in: 10...50)
            manager.gold += reward
            manager.addNotification("💰 Found \(reward) gold in \(house.name)!")
        }

        if Bool.random() {
            manager.addNotification("🎃 Found a rare item in \(house.name)!")
        }

        if let treat = HalloweenUltimateManager.herbalDrops.randomElement() {
            manager.addIngredient(treat)
        }
    }

    func generateNewHouse() {
        let names = ["Cursed Mansion", "Shadow Keep", "Ghostly Manor", "Dark Tower", "Witch's Lair"]
        let locations = ["Dark Forest", "Misty Valley", "Cursed Lands", "Shadow Realm", "Haunted Hills"]

        let newHouse = HauntedHouse(
            name: names.randomElement()!,
            location: locations.randomElement()!,
            floors: Int.random(in: 1...5),
            ghosts: [],
            treasures: [],
            isExplored: false,
            difficulty: Int.random(in: 1...5),
            image: ["🏚️", "🏰", "🏯", "🏘️"].randomElement()!
        )
        manager.addNotification("🏚️ New house discovered: \(newHouse.name)!")
        manager.triggerHaptic(.medium)
    }
}

// MARK: - Ultimate House Card

struct UltimateHouseCard: View {
    let house: HauntedHouse
    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Rectangle()
                    .fill(Color.purple.opacity(0.1))
                    .frame(height: 120)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(house.isExplored ? Color.green.opacity(0.5) : Color.purple.opacity(0.2), lineWidth: 2)
                    )

                VStack {
                    Text(house.image)
                        .font(.system(size: 60))
                        .scaleEffect(isAnimating ? 1.1 : 1.0)

                    if house.isExplored {
                        Text("✅ Explored")
                            .font(.caption)
                            .foregroundColor(.green)
                    } else {
                        Text("🔒 Locked")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }

            Text(house.name)
                .font(.headline)
                .lineLimit(1)

            Text(house.location)
                .font(.caption)
                .foregroundColor(.secondary)

            HStack {
                Text("🏗️ \(house.floors)")
                    .font(.caption)
                Text("⚔️ \(house.difficulty)")
                    .font(.caption)
            }

            ProgressView(value: Double(house.ghosts.count), total: 10)
                .progressViewStyle(LinearProgressViewStyle(tint: .purple))
                .frame(width: 100)

            Text("\(house.ghosts.count)/10 ghosts")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground).opacity(0.85))
                .shadow(color: .purple.opacity(0.1), radius: 10)
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
        }
    }
}

// MARK: - Ultimate House Detail View

struct UltimateHouseDetailView: View {
    let house: HauntedHouse
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss
    @State private var currentFloor = 0
    @State private var exploreProgress: Double = 0
    @State private var isExploring = false
    @State private var foundItems: [String] = []

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    VStack(spacing: 12) {
                        Text(house.image)
                            .font(.system(size: 80))

                        Text(house.name)
                            .font(.largeTitle.bold())

                        Text(house.location)
                            .font(.headline)
                            .foregroundColor(.secondary)

                        HStack {
                            Text("🏗️ \(house.floors) Floors")
                            Text("⚔️ Difficulty \(house.difficulty)")
                            Text("👻 \(house.ghosts.count) Ghosts")
                        }
                        .font(.caption)
                    }

                    if house.floors > 1 {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(0..<house.floors, id: \.self) { floor in
                                    Button(action: { currentFloor = floor }) {
                                        VStack {
                                            Text("Floor \(floor + 1)")
                                                .padding()
                                                .background(currentFloor == floor ? Color.orange : Color(.secondarySystemBackground))
                                                .foregroundColor(currentFloor == floor ? .white : .primary)
                                                .cornerRadius(8)
                                            if currentFloor == floor {
                                                Circle()
                                                    .fill(Color.orange)
                                                    .frame(width: 6, height: 6)
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }

                    if isExploring {
                        VStack {
                            ProgressView(value: exploreProgress, total: 1.0)
                                .progressViewStyle(LinearProgressViewStyle(tint: .purple))
                                .frame(height: 10)
                            Text("\(Int(exploreProgress * 100))%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal)
                    }

                    if !foundItems.isEmpty {
                        VStack(alignment: .leading) {
                            Text("Found Items:")
                                .font(.headline)
                            ForEach(foundItems, id: \.self) { item in
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                        .font(.caption)
                                    Text(item)
                                        .font(.caption)
                                }
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }

                    VStack(spacing: 12) {
                        if !house.isExplored {
                            Button(action: startExploration) {
                                HStack {
                                    Image(systemName: "torch")
                                    Text(isExploring ? "Exploring..." : "Explore House")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    isExploring ?
                                    Color.gray :
                                    Color.orange
                                )
                                .cornerRadius(12)
                            }
                            .disabled(isExploring)
                        }

                        if house.isExplored {
                            Button(action: {
                                for _ in 0..<Int.random(in: 1...3) {
                                    manager.spawnRandomGhost()
                                }
                                manager.addNotification("👻 Ghosts found in \(house.name)!")
                            }) {
                                HStack {
                                    Image(systemName: "repeat")
                                    Text("Re-explore")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(12)
                            }
                        }
                    }
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("📖 Information")
                            .font(.headline)
                        Text("This haunted house has \(house.floors) floors to explore.")
                        Text("Each floor contains ghosts and treasures to discover.")
                        Text("Use your spells to fight ghosts and collect rewards.")
                        Text("Some floors have hidden secrets!")
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                .padding()
            }
            .navigationTitle("House Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    func startExploration() {
        isExploring = true
        exploreProgress = 0
        foundItems.removeAll()

        Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { timer in
            exploreProgress += 0.02
            if exploreProgress >= 1.0 {
                timer.invalidate()
                isExploring = false
                completeExploration()
            }
        }
    }

    func completeExploration() {
        let points = house.difficulty * 10
        manager.score += points
        manager.gold += house.difficulty * 5

        for _ in 0..<house.difficulty {
            manager.spawnRandomGhost()
        }

        let possibleItems = ["Ancient Coin", "Ghost Stone", "Crystal Shard", "Magic Scroll", "Potion Recipe"]
        for _ in 0..<Int.random(in: 1...3) {
            if let item = possibleItems.randomElement() {
                foundItems.append(item)
            }
        }

        manager.addNotification("🏚️ Explored \(house.name)! +\(points) points!")
        manager.triggerHaptic(.success)
        manager.checkAchievements()
        manager.checkQuestProgress()

        if foundItems.count >= 3 {
            manager.addNotification("🌟 Found rare items in \(house.name)!")
            manager.gold += 50
            manager.createParticles(at: CGPoint(x: 200, y: 300), count: 30, emoji: "⭐")
        }
    }
}

// ============================================================
// MARK: - 9. ULTIMATE MINI GAME VIEW (200+ Lines)
// ============================================================

struct UltimateMiniGameView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var selectedGame: MiniGame?
    @State private var showGameDetail = false
    @State private var searchText = ""

    let miniGames: [MiniGame] = [
        MiniGame(name: "Memory Match", description: "Match the spooky cards", type: .memoryMatch, difficulty: .medium, rewards: QuestReward(experience: 25, gold: 15, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
        MiniGame(name: "Pumpkin Smash", description: "Smash as many pumpkins as you can", type: .pumpkinSmash, difficulty: .easy, rewards: QuestReward(experience: 20, gold: 10, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
        MiniGame(name: "Ghost Race", description: "Race against ghost opponents", type: .ghostRace, difficulty: .hard, rewards: QuestReward(experience: 50, gold: 30, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
        MiniGame(name: "Candy Sort", description: "Sort the candies by color", type: .candySort, difficulty: .easy, rewards: QuestReward(experience: 15, gold: 10, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
        MiniGame(name: "Spell Duel", description: "Duel with spells against AI", type: .spellDuel, difficulty: .expert, rewards: QuestReward(experience: 100, gold: 50, items: [], rareItems: [], unlockables: ["Duel Master"]), highScore: 0, timesPlayed: 0),
        MiniGame(name: "Maze Escape", description: "Escape from the haunted maze", type: .mazeEscape, difficulty: .hard, rewards: QuestReward(experience: 60, gold: 35, items: [], rareItems: [], unlockables: ["Maze Runner"]), highScore: 0, timesPlayed: 0),
        MiniGame(name: "Trivia Night", description: "Answer Halloween trivia questions", type: .trivia, difficulty: .medium, rewards: QuestReward(experience: 30, gold: 20, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
        MiniGame(name: "Rhythm of the Dead", description: "Tap to the rhythm of Halloween music", type: .rhythm, difficulty: .hard, rewards: QuestReward(experience: 45, gold: 25, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 0),
        MiniGame(name: "Voxel Run 3D", description: "Endless Minecraft-style broom sprint", type: .voxelRun, difficulty: .expert, rewards: QuestReward(experience: 120, gold: 60, items: [], rareItems: [], unlockables: ["Voxel Voyager"]), highScore: 0, timesPlayed: 0),
        MiniGame(name: "Graveyard 3D", description: "Mine ores, fight ghosts, loot crypts in 3D", type: .graveyard3D, difficulty: .hard, rewards: QuestReward(experience: 120, gold: 60, items: [], rareItems: [], unlockables: ["Crypt Raider"]), highScore: 0, timesPlayed: 0)
    ]

    var body: some View {
        NavigationView {
            ZStack {
                Color.clear

                VStack(spacing: 12) {
                    HStack {
                        StatBadge(icon: "🎮", value: "\(miniGames.count)", color: .blue)
                        StatBadge(icon: "🏆", value: "\(miniGames.filter { $0.highScore > 0 }.count)", color: .gold)
                        StatBadge(icon: "⭐", value: "\(manager.score)", color: .gold)
                    }
                    .padding(.horizontal)

                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search games...", text: $searchText)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(8)
                    .background(Color(.systemBackground).opacity(0.8))
                    .cornerRadius(10)
                    .padding(.horizontal)

                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))], spacing: 16) {
                            ForEach(filteredGames) { game in
                                UltimateMiniGameCard(game: game)
                                    .onTapGesture {
                                        selectedGame = game
                                        showGameDetail = true
                                    }
                                    .onLongPressGesture {
                                        let score = manager.playMiniGame(game)
                                        manager.addNotification("🎮 Played \(game.name)! Score: \(score)")
                                    }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("🎮 Mini Games")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showGameDetail) {
                if let game = selectedGame {
                    UltimateMiniGameDetailView(game: game)
                        .environmentObject(manager)
                }
            }
        }
    }

    var filteredGames: [MiniGame] {
        if searchText.isEmpty {
            return miniGames
        }
        return miniGames.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }
}

// MARK: - Ultimate Mini Game Card

struct UltimateMiniGameCard: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    let game: MiniGame
    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: 8) {
            Text(miniGameIcon(game.type))
                .font(.system(size: 50))
                .scaleEffect(isAnimating ? 1.1 : 1.0)

            Text(game.name)
                .font(.headline)
                .lineLimit(1)

            Text(game.description)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            HStack {
                Text(game.difficulty.rawValue)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(game.difficulty.color.opacity(0.2))
                    .cornerRadius(4)

                Text("🏆 \(game.highScore)")
                    .font(.caption)
            }

            Text("Played: \(game.timesPlayed)")
                .font(.caption2)
                .foregroundColor(.secondary)

            if ArcadeRouter.supports(game.type) {
                Text("▶ FULLY PLAYABLE")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(
                        LinearGradient(gradient: Gradient(colors: [.orange, .red]), startPoint: .leading, endPoint: .trailing)
                    )
                    .cornerRadius(6)
            }

            Button(action: {
                _ = manager.playMiniGame(game)
            }) {
                Text("Play")
                    .font(.caption)
                    .bold()
                    .padding(.horizontal, 20)
                    .padding(.vertical, 4)
                    .background(Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground).opacity(0.85))
                .shadow(color: .blue.opacity(0.1), radius: 10)
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
        }
    }

    func miniGameIcon(_ type: MiniGameType) -> String {
        switch type {
        case .memoryMatch: return "🧠"
        case .pumpkinSmash: return "🎃"
        case .ghostRace: return "👻"
        case .candySort: return "🍬"
        case .spellDuel: return "✨"
        case .mazeEscape: return "🌀"
        case .trivia: return "🧠"
        case .rhythm: return "🎵"
        case .voxelRun: return "🧱"
        case .graveyard3D: return "🪦"
        case .abandonedMine: return "🦇"
        }
    }
}

// MARK: - Ultimate Mini Game Detail View

struct UltimateMiniGameDetailView: View {
    let game: MiniGame
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss
    @State private var score = 0
    @State private var isPlaying = false
    @State private var showScore = false
    @State private var showRealGame = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    Text(miniGameIcon(game.type))
                        .font(.system(size: 80))

                    Text(game.name)
                        .font(.largeTitle.bold())

                    Text(game.description)
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("📊 Stats")
                            .font(.headline)

                        HStack {
                            Text("Difficulty:")
                            Text(game.difficulty.rawValue)
                                .foregroundColor(game.difficulty.color)
                        }

                        HStack {
                            Text("High Score:")
                            Text("\(game.highScore)")
                                .bold()
                                .foregroundColor(.gold)
                        }

                        HStack {
                            Text("Times Played:")
                            Text("\(game.timesPlayed)")
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("🎁 Rewards")
                            .font(.headline)

                        HStack {
                            Text("⭐ \(game.rewards.experience) XP")
                            Text("🪙 \(game.rewards.gold) Gold")
                        }
                        .font(.caption)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    Button(action: {
                        if ArcadeRouter.supports(game.type) {
                            showRealGame = true
                        } else {
                            playGame()
                        }
                    }) {
                        HStack {
                            Image(systemName: "play.fill")
                            Text(ArcadeRouter.supports(game.type) ? "Play Now — Fully Interactive!" : (isPlaying ? "Playing..." : "Play Game"))
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            isPlaying ?
                            Color.gray :
                            Color.blue
                        )
                        .cornerRadius(12)
                    }
                    .disabled(isPlaying)
                    .padding(.horizontal)

                    if showScore {
                        VStack {
                            Text("Your Score")
                                .font(.headline)
                            Text("\(score)")
                                .font(.system(size: 60, weight: .bold))
                                .foregroundColor(.gold)

                            if score > game.highScore {
                                Text("🏆 NEW HIGH SCORE! 🏆")
                                    .font(.headline)
                                    .foregroundColor(.orange)
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("📖 How to Play")
                            .font(.headline)
                        ForEach(howToPlayLines, id: \.self) { line in
                            Text("• \(line)")
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                .padding()
            }
            .navigationTitle("Game Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .fullScreenCover(isPresented: $showRealGame) {
                ArcadeGameView(type: game.type) {
                    showRealGame = false
                    refreshScore()
                }
                .environmentObject(manager)
            }
        }
    }

    func refreshScore() {
        if let updated = manager.miniGames.first(where: { $0.type == game.type }) {
            score = updated.highScore
            showScore = true
        }
        manager.triggerHaptic(.medium)
    }

    var howToPlayLines: [String] {
        switch game.type {
        case .memoryMatch:
            return ["Flip two cards to find all 8 spooky pairs", "Fewer moves + faster time = bigger score", "Matches burst with particles — mismatches flip back"]
        case .pumpkinSmash:
            return ["Tap pumpkins as they pop up (+10 each)", "Never tap a 💣 bomb (−25 points)", "30 seconds on the clock — smash fast!"]
        case .candySort:
            return ["Drag anywhere to slide the 🧺 basket", "Catch candy (+5), ⭐ stars (+20), dodge 🦇 bats", "Streaks build a combo multiplier up to ×5"]
        case .spellDuel:
            return ["Blast the wild ghost with your attack spells", "Watch 🧙 mana — 💚 Heal restores 30 HP", "Win fast and unharmed for a bigger score!"]
        case .voxelRun:
            return ["Swipe ◀ ▶ or tap arrows to dodge lanes", "Leap 🪦 tombstones and 🟧 lava — dodge 👻 by lane", "Grab 🍬 (+25) and ⭐ (+60) — it keeps getting faster!"]
        case .ghostRace:
            return ["Mash FLAP! to fly your ghost down the track", "Beat Vlad, Luna and Winnie over 12 seconds", "1st place pays huge — every tap counts!"]
        case .mazeEscape:
            return ["The full haunted maze: knock thrice to enter", "Brave fog, candy, traps and ghosts to find the 🚪", "Escapes pay score, gold and rare ingredients!"]
        case .trivia:
            return ["8 spooky questions, 12 seconds each", "Correct = 100 pts plus streak bonuses", "Wrong answers break your streak!"]
        case .rhythm:
            return ["Tap pads as notes cross the golden line", "Dead-center = PERFECT (+100), close = good (+40)", "Streaks multiply your groove!"]
        case .graveyard3D:
            return ["D-pad to walk the graveyard • drag 3D view to orbit", "Mine ⛏️ nearest ore, Attack ⚔️ nearest ghost, open Crypts 🏚️", "Ores, ghosts + crypts bank XP/gold into your Ultimate profile!"]
        case .abandonedMine:
            return ["Hold the D-pad to walk the tunnels • drag to look", "Tap walls to mine ores, tap diving bats to whack them", "When you hear the SCREECH, something is coming for you!"]
        }
    }

    func miniGameIcon(_ type: MiniGameType) -> String {
        switch type {
        case .memoryMatch: return "🧠"
        case .pumpkinSmash: return "🎃"
        case .ghostRace: return "👻"
        case .candySort: return "🍬"
        case .spellDuel: return "✨"
        case .mazeEscape: return "🌀"
        case .trivia: return "🧠"
        case .rhythm: return "🎵"
        case .voxelRun: return "🧱"
        case .graveyard3D: return "🪦"
        case .abandonedMine: return "🦇"
        }
    }

    func playGame() {
        isPlaying = true
        showScore = false

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            score = Int.random(in: 0...100)
            let finalScore = manager.playMiniGame(game)
            isPlaying = false
            showScore = true
            manager.triggerHaptic(.medium)

            if finalScore > game.highScore {
                manager.addNotification("🏆 New high score in \(game.name)!")
                manager.triggerHaptic(.success)
            }
        }
    }
}

// ============================================================
// MARK: - 10. ULTIMATE ACHIEVEMENT VIEW (200+ Lines)
// ============================================================

struct UltimateAchievementView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var selectedAchievement: Achievement?
    @State private var showAchievementDetail = false
    @State private var filterCategory: AchievementCategory?
    @State private var searchText = ""
    @State private var showUnlockedOnly = false

    var body: some View {
        NavigationView {
            ZStack {
                Color.clear

                VStack(spacing: 12) {
                    HStack {
                        StatBadge(icon: "🏆", value: "\(manager.achievements.filter { $0.isUnlocked }.count)", color: .gold)
                        StatBadge(icon: "🎯", value: "\(manager.achievements.count)", color: .blue)
                        StatBadge(icon: "⭐", value: "\(manager.score)", color: .gold)
                    }
                    .padding(.horizontal)

                    HStack {
                        Toggle("Unlocked", isOn: $showUnlockedOnly)
                            .font(.caption)
                            .frame(width: 110)

                        Spacer()

                        Button(action: { filterCategory = nil }) {
                            Text("All")
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(filterCategory == nil ? Color.orange : Color(.secondarySystemBackground))
                                .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(AchievementCategory.allCases, id: \.self) { category in
                                Button(action: { filterCategory = category }) {
                                    Text(category.rawValue)
                                        .font(.caption)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(filterCategory == category ? Color.orange : Color(.secondarySystemBackground))
                                        .cornerRadius(8)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        TextField("Search achievements...", text: $searchText)
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(8)
                    .background(Color(.systemBackground).opacity(0.8))
                    .cornerRadius(10)
                    .padding(.horizontal)

                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150))], spacing: 16) {
                            ForEach(filteredAchievements) { achievement in
                                UltimateAchievementCard(achievement: achievement)
                                    .onTapGesture {
                                        selectedAchievement = achievement
                                        showAchievementDetail = true
                                    }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("🏆 Achievements")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showAchievementDetail) {
                if let achievement = selectedAchievement {
                    UltimateAchievementDetailView(achievement: achievement)
                        .environmentObject(manager)
                }
            }
        }
    }

    var filteredAchievements: [Achievement] {
        var filtered = manager.achievements

        if showUnlockedOnly {
            filtered = filtered.filter { $0.isUnlocked }
        }

        if let category = filterCategory {
            filtered = filtered.filter { $0.category == category }
        }

        if !searchText.isEmpty {
            filtered = filtered.filter { $0.name.localizedCaseInsensitiveContains(searchText) || $0.description.localizedCaseInsensitiveContains(searchText) }
        }

        return filtered
    }
}

// MARK: - Ultimate Achievement Card

struct UltimateAchievementCard: View {
    let achievement: Achievement
    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(achievement.isUnlocked ? Color.gold.opacity(0.2) : Color.gray.opacity(0.1))
                    .frame(width: 70, height: 70)

                Text(achievement.icon)
                    .font(.system(size: 40))
                    .scaleEffect(isAnimating && achievement.isUnlocked ? 1.2 : 1.0)

                if achievement.isUnlocked {
                    Circle()
                        .stroke(Color.gold, lineWidth: 2)
                        .frame(width: 75, height: 75)
                }
            }

            Text(achievement.name)
                .font(.caption)
                .bold()
                .lineLimit(2)
                .multilineTextAlignment(.center)

            Text(achievement.rarity.rawValue)
                .font(.system(size: 8))
                .foregroundColor(achievementRarityColor(achievement.rarity))
                .padding(.horizontal, 6)
                .padding(.vertical, 1)
                .background(achievementRarityColor(achievement.rarity).opacity(0.2))
                .cornerRadius(4)

            if !achievement.isUnlocked {
                ProgressView(value: achievement.progress, total: achievement.target)
                    .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                    .frame(width: 80)
                Text("\(Int(achievement.progress))/\(Int(achievement.target))")
                    .font(.system(size: 8))
                    .foregroundColor(.secondary)
            } else {
                Text("✅ Unlocked")
                    .font(.system(size: 8))
                    .foregroundColor(.green)
            }

            Text("+\(achievement.points) pts")
                .font(.system(size: 8))
                .foregroundColor(.gold)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground).opacity(0.85))
                .shadow(color: achievement.isUnlocked ? .gold.opacity(0.2) : .gray.opacity(0.1), radius: 10)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(achievement.isUnlocked ? Color.gold.opacity(0.5) : Color.gray.opacity(0.2), lineWidth: 1)
                )
        )
        .onAppear {
            isAnimating = true
        }
    }

    func achievementRarityColor(_ rarity: AchievementRarity) -> Color {
        switch rarity {
        case .common: return .gray
        case .rare: return .blue
        case .epic: return .purple
        case .legendary: return .gold
        }
    }
}

// MARK: - Ultimate Achievement Detail View

struct UltimateAchievementDetailView: View {
    let achievement: Achievement
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss
    @State private var showUnlockAnimation = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    ZStack {
                        Circle()
                            .fill(achievement.isUnlocked ? Color.gold.opacity(0.2) : Color.gray.opacity(0.1))
                            .frame(width: 150, height: 150)
                            .scaleEffect(showUnlockAnimation ? 1.1 : 1.0)

                        Text(achievement.icon)
                            .font(.system(size: 70))
                            .scaleEffect(showUnlockAnimation ? 1.2 : 1.0)
                            .rotationEffect(.degrees(showUnlockAnimation ? 360 : 0))
                    }
                    .animation(
                        showUnlockAnimation ?
                        Animation.spring(response: 0.6) :
                        .default,
                        value: showUnlockAnimation
                    )

                    Text(achievement.name)
                        .font(.largeTitle.bold())

                    Text(achievement.category.rawValue)
                        .font(.headline)
                        .foregroundColor(.secondary)

                    Text(achievement.rarity.rawValue)
                        .font(.headline)
                        .foregroundColor(achievementRarityColor(achievement.rarity))

                    Text(achievement.description)
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    if achievement.secret && !achievement.isUnlocked {
                        Text("🔒 Secret Achievement")
                            .font(.headline)
                            .foregroundColor(.purple)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("📊 Progress")
                            .font(.headline)

                        if !achievement.isUnlocked {
                            ProgressView(value: achievement.progress, total: achievement.target)
                                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                                .frame(height: 8)

                            Text("\(Int(achievement.progress))/\(Int(achievement.target))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        } else {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text("Completed!")
                                    .font(.headline)
                                    .foregroundColor(.green)
                            }
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("🎁 Rewards")
                            .font(.headline)

                        HStack {
                            Text("⭐ +\(achievement.points) points")
                            Text("🏆 Achievement unlocked")
                        }
                        .font(.caption)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    if !achievement.isUnlocked {
                        Button(action: {
                            withAnimation(.spring()) {
                                showUnlockAnimation = true
                            }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                manager.addNotification("🏆 Achievement unlocked: \(achievement.name)!")
                                manager.triggerHaptic(.success)
                                dismiss()
                            }
                        }) {
                            HStack {
                                Image(systemName: "star.fill")
                                Text("Complete Achievement")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                LinearGradient(gradient: Gradient(colors: [.gold, .orange]), startPoint: .leading, endPoint: .trailing)
                            )
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)
                    }
                }
                .padding()
            }
            .navigationTitle("Achievement Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    func achievementRarityColor(_ rarity: AchievementRarity) -> Color {
        switch rarity {
        case .common: return .gray
        case .rare: return .blue
        case .epic: return .purple
        case .legendary: return .gold
        }
    }
}

// ============================================================
// MARK: - 11. ULTIMATE SETTINGS VIEW (200+ Lines)
// ============================================================

struct UltimateSettingsView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @Environment(\.dismiss) var dismiss
    @State private var showResetConfirmation = false
    @ObservedObject private var music = SpookyMusic.shared

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("🎃 Halloween Settings")) {
                    Toggle("Spooky Mode", isOn: $manager.isSpookyMode)
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

                Section(header: Text("📊 Statistics")) {
                    StatRow(label: "Total Score", value: "\(manager.score)")
                    StatRow(label: "Gold", value: "\(manager.gold)")
                    StatRow(label: "Level", value: "\(manager.level)")
                    StatRow(label: "Experience", value: "\(manager.experience)")
                    StatRow(label: "Ghosts Captured", value: "\(manager.capturedGhosts.count)")
                    StatRow(label: "Candies Collected", value: "\(manager.collectedCandies.count)")
                    StatRow(label: "Potions Brewed", value: "\(manager.potions.count)")
                    StatRow(label: "Quests Completed", value: "\(manager.quests.filter { $0.isCompleted }.count)")
                    StatRow(label: "Achievements", value: "\(manager.achievements.filter { $0.isUnlocked }.count)")
                    StatRow(label: "Highest Streak", value: "\(manager.highestStreak)")
                    StatRow(label: "Spells Learned", value: "\(manager.spells.count)")
                }

                Section(header: Text("🏆 Achievements")) {
                    ForEach(manager.achievements.filter { $0.isUnlocked }.prefix(5)) { achievement in
                        HStack {
                            Text(achievement.icon)
                            Text(achievement.name)
                                .font(.caption)
                            Spacer()
                            Text("+\(achievement.points)")
                                .font(.caption)
                                .foregroundColor(.gold)
                        }
                    }
                    if manager.achievements.filter({ $0.isUnlocked }).count > 5 {
                        Text("And \(manager.achievements.filter({ $0.isUnlocked }).count - 5) more...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Section(header: Text("💾 Save & Load")) {
                    Button("Save Game") {
                        manager.saveGameData()
                        manager.addNotification("💾 Game saved!")
                    }

                    Button("Load Game") {
                        manager.loadGameData()
                        manager.addNotification("📂 Game loaded!")
                    }
                }

                Section(header: Text("⚙️ About")) {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("2.0.0")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Halloween Spooktacular")
                        Spacer()
                        Text("🎃")
                    }
                }

                Section(header: Text("⚠️ Danger Zone")) {
                    Button("Reset All Progress", role: .destructive) {
                        showResetConfirmation = true
                    }
                    .font(.headline)
                }
            }
            .navigationTitle("⚙️ Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Reset All Progress?", isPresented: $showResetConfirmation) {
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

// ============================================================
// MARK: - 12. PREVIEW PROVIDER
// ============================================================

#Preview {
    UltimateContentView()
}
