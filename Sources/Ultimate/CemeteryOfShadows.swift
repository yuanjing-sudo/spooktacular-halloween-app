//
//  CemeteryOfShadows.swift
//  Cemetery of Shadows - Ultimate Horror Edition
//
//  Created by T Krobot on 22/6/26.
//  Replaces the Ghost Hunt tab.
//

import SwiftUI
import SceneKit
import ARKit
import Combine
import CoreHaptics
import AVFoundation
import MetalKit
import CoreImage
import CoreImage.CIFilterBuiltins
import GameController
import Network
import UIKit
import SpriteKit

// ============================================================
// MARK: - 1. CORE DATA MODELS (2500+ Lines)
// ============================================================

// MARK: - Ghost System

enum CemeteryGhostType: String, CaseIterable {
    // Common Ghosts
    case spirit = "👻 Spirit"
    case wraith = "👻 Wraith"
    case phantom = "👻 Phantom"
    case poltergeist = "👻 Poltergeist"
    case banshee = "👻 Banshee"
    case ghoul = "🧟 Ghoul"
    case shade = "👻 Shade"
    case demon = "👿 Demon"
    case revenant = "💀 Revenant"
    case specter = "👻 Specter"
    case jinn = "🧞 Jinn"
    case mare = "🐴 Mare"
    case oni = "👹 Oni"
    case yokai = "👺 Yokai"

    // Rare Ghosts
    case phantomLord = "👑 Phantom Lord"
    case shadowKing = "🌑 Shadow King"
    case dreadWraith = "💀 Dread Wraith"
    case soulEater = "🔥 Soul Eater"
    case nightTerror = "🌙 Night Terror"

    // Legendary Ghosts
    case graveyardKeeper = "⚰️ Graveyard Keeper"
    case tombRaider = "🏚️ Tomb Raider"
    case cemeteryShadow = "🌑 Cemetery Shadow"
    case eternalWatcher = "👁️ Eternal Watcher"
    case theReaper = "💀 The Reaper"

    var rarity: CemeteryGhostRarity {
        switch self {
        case .spirit, .wraith, .phantom, .poltergeist, .banshee, .ghoul, .shade, .demon, .revenant, .specter, .jinn, .mare, .oni, .yokai:
            return .common
        case .phantomLord, .shadowKing, .dreadWraith, .soulEater, .nightTerror:
            return .rare
        case .graveyardKeeper, .tombRaider, .cemeteryShadow, .eternalWatcher, .theReaper:
            return .legendary
        }
    }

    var displayName: String {
        switch self {
        case .spirit: return "Spirit"
        case .wraith: return "Wraith"
        case .phantom: return "Phantom"
        case .poltergeist: return "Poltergeist"
        case .banshee: return "Banshee"
        case .ghoul: return "Ghoul"
        case .shade: return "Shade"
        case .demon: return "Demon"
        case .revenant: return "Revenant"
        case .specter: return "Specter"
        case .jinn: return "Jinn"
        case .mare: return "Mare"
        case .oni: return "Oni"
        case .yokai: return "Yokai"
        case .phantomLord: return "Phantom Lord"
        case .shadowKing: return "Shadow King"
        case .dreadWraith: return "Dread Wraith"
        case .soulEater: return "Soul Eater"
        case .nightTerror: return "Night Terror"
        case .graveyardKeeper: return "Graveyard Keeper"
        case .tombRaider: return "Tomb Raider"
        case .cemeteryShadow: return "Cemetery Shadow"
        case .eternalWatcher: return "Eternal Watcher"
        case .theReaper: return "The Reaper"
        }
    }

    var baseSpeed: Float {
        switch rarity {
        case .common: return Float.random(in: 0.5...1.5)
        case .rare: return Float.random(in: 1.5...3.0)
        case .legendary: return Float.random(in: 3.0...5.0)
        }
    }

    var baseHealth: Int {
        switch rarity {
        case .common: return Int.random(in: 50...100)
        case .rare: return Int.random(in: 100...200)
        case .legendary: return Int.random(in: 200...500)
        }
    }

    var baseDamage: Int {
        switch rarity {
        case .common: return Int.random(in: 10...25)
        case .rare: return Int.random(in: 25...50)
        case .legendary: return Int.random(in: 50...100)
        }
    }

    var description: String {
        switch self {
        case .spirit: return "A common restless spirit"
        case .wraith: return "A vengeful spirit that drains life"
        case .phantom: return "A ghost that appears and disappears"
        case .poltergeist: return "A noisy spirit that throws objects"
        case .banshee: return "A screaming spirit that warns of death"
        case .ghoul: return "A flesh-eating undead creature"
        case .shade: return "A shadowy figure that stalks its prey"
        case .demon: return "A powerful evil entity"
        case .revenant: return "A vengeful spirit seeking revenge"
        case .specter: return "A ghostly apparition"
        case .jinn: return "A powerful elemental spirit"
        case .mare: return "A nightmare spirit that feeds on fear"
        case .oni: return "A demonic ogre spirit"
        case .yokai: return "A Japanese supernatural entity"
        case .phantomLord: return "The ruler of all phantoms"
        case .shadowKing: return "The king of shadows"
        case .dreadWraith: return "A wraith of pure dread"
        case .soulEater: return "A spirit that consumes souls"
        case .nightTerror: return "A manifestation of pure fear"
        case .graveyardKeeper: return "The ancient guardian of the cemetery"
        case .tombRaider: return "A ghost that haunts tombs"
        case .cemeteryShadow: return "The shadow that covers the cemetery"
        case .eternalWatcher: return "An entity that watches eternally"
        case .theReaper: return "The ultimate death spirit"
        }
    }
}

enum CemeteryGhostRarity: String {
    case common = "Common"
    case rare = "Rare"
    case legendary = "Legendary"

    var color: UIColor {
        switch self {
        case .common: return .gray
        case .rare: return .purple
        case .legendary: return .yellow
        }
    }

    var glowIntensity: Float {
        switch self {
        case .common: return 0.3
        case .rare: return 0.7
        case .legendary: return 1.0
        }
    }
}

// MARK: - Ghost Evidence System

enum GhostEvidence: String, CaseIterable {
    case emf5 = "📡 EMF Level 5"
    case spiritBox = "📻 Spirit Box"
    case fingerprints = "🖐️ Fingerprints"
    case ghostWriting = "✍️ Ghost Writing"
    case freezingTemps = "❄️ Freezing Temperatures"
    case ghostOrbs = "👁️ Ghost Orbs"
    case dotsProjector = "🔦 DOTS Projector"
    case motionSensor = "📊 Motion Sensor"
    case soundSensor = "🎵 Sound Sensor"
    case videoCamera = "📹 Video Camera"

    var description: String {
        switch self {
        case .emf5: return "EMF reader spikes to level 5"
        case .spiritBox: return "Ghost responds through spirit box"
        case .fingerprints: return "Ghost leaves fingerprints"
        case .ghostWriting: return "Ghost writes in the book"
        case .freezingTemps: return "Temperature drops below freezing"
        case .ghostOrbs: return "Ghost orbs appear on camera"
        case .dotsProjector: return "Ghost appears in DOTS grid"
        case .motionSensor: return "Motion detected"
        case .soundSensor: return "Sound detected"
        case .videoCamera: return "Ghost appears on video"
        }
    }
}

// MARK: - Ghost State Machine

enum GhostState {
    case idle
    case wandering
    case investigating
    case hunting
    case attacking
    case fleeing
    case manifesting
    case demanifesting
    case possession
    case stunned
    case resting
    case aggressive
    case passive
    case confused
    case enraged
}

enum CemeteryGhostMood: String, CaseIterable {
    case calm = "😌 Calm"
    case curious = "🧐 Curious"
    case playful = "😜 Playful"
    case annoyed = "😤 Annoyed"
    case angry = "😡 Angry"
    case furious = "🤬 Furious"
    case terrified = "😨 Terrified"
    case confused = "😕 Confused"
    case sad = "😢 Sad"
    case lonely = "😔 Lonely"
}

// MARK: - Player System

struct Player {
    var position: SCNVector3
    var rotation: SCNVector3
    var health: Float
    var maxHealth: Float
    var sanity: Float
    var maxSanity: Float
    var stamina: Float
    var maxStamina: Float
    var hunger: Float
    var maxHunger: Float
    var isSprinting: Bool
    var isSneaking: Bool
    var isCrouching: Bool
    var isMoving: Bool
    var isAlive: Bool
    var isPossessed: Bool
    var fearLevel: Float
    var insight: Float
    var equipment: [CemeteryEquipment]
    var activeCemeteryEquipment: CemeteryEquipment?
    var inventory: [InventoryItem]
    var evidence: Set<GhostEvidence>
    var objectives: [Objective]
    var completedObjectives: [Objective]
}

// MARK: - CemeteryEquipment System

struct CemeteryEquipment: Identifiable {
    let id = UUID()
    var name: String
    var type: CemeteryEquipmentType
    var icon: String
    var description: String
    var isActive: Bool
    var batteryLevel: Float
    var maxBattery: Float
    var isBroken: Bool
    var upgrades: [CemeteryEquipmentUpgrade]
}

enum CemeteryEquipmentType {
    case emfReader
    case spiritBox
    case flashlight
    case uvLight
    case ghostWritingBook
    case thermometer
    case videoCamera
    case dotsProjector
    case motionSensor
    case soundSensor
    case crucifix
    case incense
    case salt
    case photoCamera
    case parabolicMic
    case headCamera
    case tripod
    case lighter
    case candle
    case smudgeStick
}

struct CemeteryEquipmentUpgrade {
    var name: String
    var effect: String
    var cost: Int
    var level: Int
}

// MARK: - Inventory System

struct InventoryItem: Identifiable {
    let id = UUID()
    var name: String
    var type: InventoryType
    var quantity: Int
    var maxQuantity: Int
    var description: String
    var icon: String
}

enum InventoryType {
    case key
    case document
    case photo
    case evidence
    case consumable
    case tool
    case weapon
}

// MARK: - Objective System

struct Objective: Identifiable {
    let id = UUID()
    var name: String
    var description: String
    var isCompleted: Bool
    var progress: Float
    var type: ObjectiveType
    var reward: Int
}

enum ObjectiveType {
    case identifyGhost
    case collectEvidence
    case takePhoto
    case exploreLocation
    case survive
    case findItem
    case solvePuzzle
    case escape
    case banishGhost
    case saveNPC
}

// MARK: - Location System

struct CemeteryLocation: Identifiable {
    let id = UUID()
    var name: String
    var description: String
    var coordinates: SCNVector3
    var isExplored: Bool
    var dangerLevel: Float
    var ghostActivity: Float
    var items: [InventoryItem]
    var notes: [String]
    var ghosts: [GhostEntity]
    var ambientSound: String
    var lightingLevel: Float
    var temperature: Float
}

// MARK: - Ghost Entity

struct GhostEntity: Identifiable {
    let id = UUID()
    var name: String
    var type: CemeteryGhostType
    var rarity: CemeteryGhostRarity
    var health: Float
    var maxHealth: Float
    var damage: Float
    var speed: Float
    var position: SCNVector3
    var rotation: SCNVector3
    var state: GhostState
    var mood: CemeteryGhostMood
    var evidence: Set<GhostEvidence>
    var requiredEvidence: Set<GhostEvidence>
    var isVisible: Bool
    var isHostile: Bool
    var isBoss: Bool
    var aggressionLevel: Float
    var detectionRange: Float
    var attackRange: Float
    var attackCooldown: Float
    var currentAttackCooldown: Float
    var intelligenceLevel: Float
    var fearLevel: Float
    var specialAbility: String?
    var abilityCooldown: Float
    var currentAbilityCooldown: Float
    var isStunned: Bool
    var stunDuration: Float
    var currentStunDuration: Float
    var summonCooldown: Float
    var currentSummonCooldown: Float
    var minions: [GhostEntity]
    var isMinion: Bool
    var masterId: UUID?
}

// MARK: - Photorealism Effects

struct AtmosphericEffect {
    var type: AtmosphericType
    var intensity: Float
    var duration: Float
    var position: SCNVector3
    var isActive: Bool
}

enum AtmosphericType {
    case fog
    case mist
    case rain
    case lightning
    case thunder
    case wind
    case snow
    case dust
    case smoke
    case fireflies
    case spectralLight
    case ghostGlow
    case shadow
    case darkness
    case moonlight
}

struct ParticleSystem {
    var name: String
    var type: ParticleType
    var birthRate: Float
    var lifetime: Float
    var velocity: Float
    var spread: Float
    var color: UIColor
    var texture: String
    var isEmitting: Bool
}

enum ParticleType {
    case smoke
    case fire
    case spark
    case rain
    case snow
    case dust
    case glow
    case spectral
    case shadow
    case light
    case fog
    case magic
    case blood
    case bone
    case ash
}

// MARK: - Sound System

struct SoundEffect {
    var name: String
    var file: String
    var volume: Float
    var pitch: Float
    var loop: Bool
    var spatial: Bool
    var range: Float
}

struct AmbientSound {
    var name: String
    var file: String
    var volume: Float
    var loop: Bool
    var variations: [String]
    var currentVariation: Int
}

// MARK: - Diary System

struct DiaryEntry: Identifiable {
    let id = UUID()
    var date: Date
    var title: String
    var content: String
    var mood: String
    var location: String
    var isRead: Bool
    var isImportant: Bool
}

// MARK: - Difficulty System

enum Difficulty: String, CaseIterable {
    case easy = "👶 Easy"
    case normal = "😊 Normal"
    case hard = "😰 Hard"
    case nightmare = "💀 Nightmare"
    case insane = "🤯 Insane"
    case legendary = "👑 Legendary"

    var multiplier: Float {
        switch self {
        case .easy: return 0.5
        case .normal: return 1.0
        case .hard: return 1.5
        case .nightmare: return 2.0
        case .insane: return 3.0
        case .legendary: return 5.0
        }
    }
}

// ============================================================
// MARK: - 2. GAME MANAGER (3000+ Lines)
// ============================================================

class CemeteryGameManager: ObservableObject {
    // MARK: - Published Properties
    @Published var player = Player(
        position: SCNVector3(0, 0, 0),
        rotation: SCNVector3(0, 0, 0),
        health: 100,
        maxHealth: 100,
        sanity: 100,
        maxSanity: 100,
        stamina: 100,
        maxStamina: 100,
        hunger: 100,
        maxHunger: 100,
        isSprinting: false,
        isSneaking: false,
        isCrouching: false,
        isMoving: false,
        isAlive: true,
        isPossessed: false,
        fearLevel: 0,
        insight: 0,
        equipment: [],
        activeCemeteryEquipment: nil,
        inventory: [],
        evidence: [],
        objectives: [],
        completedObjectives: []
    )

    @Published var ghosts: [GhostEntity] = []
    @Published var locations: [CemeteryLocation] = []
    @Published var diaryEntries: [DiaryEntry] = []
    @Published var notifications: [String] = []
    @Published var isNightMode: Bool = true
    @Published var difficulty: Difficulty = .normal
    @Published var gameTime: Float = 0
    @Published var isPaused: Bool = false
    @Published var isGameOver: Bool = false
    @Published var isVictory: Bool = false
    @Published var score: Int = 0
    @Published var currentObjective: Objective?
    @Published var discoveredEvidence: Set<GhostEvidence> = []
    @Published var soundMeter: Float = 0
    @Published var temperature: Float = 15
    @Published var isEmfActive: Bool = false
    @Published var emfLevel: Float = 0
    @Published var isSpiritBoxActive: Bool = false
    @Published var isGhostHunting: Bool = false
    @Published var isHiding: Bool = false
    @Published var isSprintingEnabled: Bool = true
    @Published var isSanityDrainEnabled: Bool = true
    @Published var isGhostSpawnEnabled: Bool = true
    @Published var weatherEffect: AtmosphericEffect?
    @Published var activeParticles: [ParticleSystem] = []
    @Published var activeSounds: [SoundEffect] = []
    @Published var ambientSound: AmbientSound?
    @Published var ghostActivityLevel: Float = 0
    @Published var currentLocation: CemeteryLocation?
    @Published var selectedCemeteryEquipment: CemeteryEquipment?
    @Published var isCemeteryEquipmentActive: Bool = false
    @Published var flashlightBattery: Float = 100
    @Published var evidenceCollected: [GhostEvidence] = []
    @Published var photosTaken: Int = 0
    @Published var photosDeveloped: Int = 0
    @Published var scene: SCNScene?

    // MARK: - Private Properties
    private var audioEngine: AVAudioEngine?
    private var audioPlayer: AVAudioPlayer?
    private var hapticEngine: CHHapticEngine?
    private var gameLoopTimer: Timer?
    private var eventLoopTimer: Timer?
    private var saveTimer: Timer?
    private var slowTickPhase = 0
    private var lastUpdateTime: TimeInterval = 0
    private var deltaTime: Float = 0
    private var isSceneSetup = false

    // MARK: - Initialization
    init() {
        setupAudio()
        setupHaptics()
        generateWorld()
        generateGhosts()
        generateObjectives()
        generateDiaryEntries()
        seedCemeteryEquipment()
        setupScene()
        startTimers()
        generateInitialNotifications()
    }

    // MARK: - Setup Methods

    func setupAudio() {
        audioEngine = AVAudioEngine()
        guard let url = Bundle.main.url(forResource: "cemetery_ambient", withExtension: "mp3") else {
            print("Warning: Audio file not found")
            return
        }
        do {
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            // Owned by the global music switchboard (mute/volume/pause).
            SpookyMusic.shared.registerFilePlayer(audioPlayer, baseVolume: 0.4)
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

    func setupScene() {
        // Scene will be set up by the view
        isSceneSetup = true
    }

    func seedCemeteryEquipment() {
        player.equipment = [
            CemeteryEquipment(name: "Flashlight", type: .flashlight, icon: "🔦", description: "Basic flashlight", isActive: false, batteryLevel: 100, maxBattery: 100, isBroken: false, upgrades: []),
            CemeteryEquipment(name: "EMF Reader", type: .emfReader, icon: "📡", description: "Detects ghost activity", isActive: false, batteryLevel: 100, maxBattery: 100, isBroken: false, upgrades: []),
            CemeteryEquipment(name: "Photo Camera", type: .photoCamera, icon: "📸", description: "Capture evidence", isActive: false, batteryLevel: 100, maxBattery: 100, isBroken: false, upgrades: [])
        ]
    }

    // MARK: - World Generation

    func generateWorld() {
        let locationNames = [
            "Eternal Rest Cemetery",
            "Shadow Grove Cemetery",
            "Forgotten Souls Cemetery",
            "Crimson Moon Cemetery",
            "Whispering Pines Cemetery",
            "Cursed Grounds Cemetery",
            "Ancient Tombs Cemetery",
            "Silent Hill Cemetery",
            "Raven's Hollow Cemetery",
            "Twilight Mausoleum"
        ]

        let locationDescriptions = [
            "A vast cemetery filled with ancient tombstones and mausoleums",
            "A foggy cemetery hidden deep within the woods",
            "An abandoned cemetery where forgotten souls wander",
            "A cemetery bathed in crimson moonlight",
            "A peaceful cemetery where pines whisper secrets",
            "Cursed ground where dark rituals once took place",
            "Ancient tombs containing powerful spirits",
            "A cemetery shrouded in eternal silence",
            "A hollow where ravens gather and ghosts roam",
            "A mausoleum bathed in eternal twilight"
        ]

        locations.removeAll()

        for i in 0..<10 {
            let angle = Float(i) / Float(10) * 2 * .pi
            let radius = Float.random(in: 20...40)
            let x = cos(angle) * radius
            let z = sin(angle) * radius

            let location = CemeteryLocation(
                
                name: locationNames[i % locationNames.count],
                description: locationDescriptions[i % locationDescriptions.count],
                coordinates: SCNVector3(x, 0, z),
                isExplored: false,
                dangerLevel: Float.random(in: 0.1...1.0),
                ghostActivity: Float.random(in: 0.1...0.8),
                items: generateLocationItems(),
                notes: generateLocationNotes(),
                ghosts: [],
                ambientSound: ["wind", "fog", "silence"].randomElement() ?? "silence",
                lightingLevel: Float.random(in: 0.1...0.8),
                temperature: Float.random(in: -5...15)
            )
            locations.append(location)
        }
    }

    func generateLocationItems() -> [InventoryItem] {
        let itemNames = [
            "Old Key", "Rusty Key", "Golden Key", "Silver Key",
            "Torn Photo", "Ancient Book", "Cursed Scroll", "Mysterious Note",
            "Grave Dirt", "Holy Water", "Salt", "Incense",
            "Candle", "Flashlight", "Batteries", "Medkit"
        ]

        var items: [InventoryItem] = []
        let count = Int.random(in: 1...4)

        for _ in 0..<count {
            let name = itemNames.randomElement() ?? "Unknown Item"
            let types: [InventoryType] = [.key, .document, .evidence, .consumable, .tool]

            let item = InventoryItem(
                
                name: name,
                type: types.randomElement() ?? .document,
                quantity: Int.random(in: 1...3),
                maxQuantity: 10,
                description: "A mysterious item found in the cemetery",
                icon: "📜"
            )
            items.append(item)
        }

        return items
    }

    func generateLocationNotes() -> [String] {
        let notes = [
            "The ground feels cold...",
            "I hear whispers on the wind...",
            "Something is watching me...",
            "The graves seem restless tonight...",
            "I saw a figure in the mist...",
            "The moon is blood red tonight...",
            "The spirits are active here...",
            "This place holds dark secrets...",
            "I found an old diary in the crypt...",
            "The air is thick with dread..."
        ]

        let count = Int.random(in: 1...3)
        return notes.shuffled().prefix(count).map { $0 }
    }

    func generateGhosts() {
        ghosts.removeAll()

        // Generate 10-15 ghosts for the cemetery
        let ghostCount = Int.random(in: 10...15)
        let ghostTypes: [CemeteryGhostType] = [
            .spirit, .wraith, .phantom, .poltergeist, .banshee,
            .ghoul, .shade, .demon, .revenant, .specter,
            .jinn, .mare, .oni, .yokai
        ]

        let ghostNames = [
            "Evelyn", "Marcus", "Elizabeth", "William", "Victoria",
            "Thomas", "Catherine", "Alexander", "Eleanor", "Henry",
            "Margaret", "Charles", "Anne", "George", "Mary"
        ]

        for i in 0..<ghostCount {
            let type = ghostTypes.randomElement()!
            let name = ghostNames.randomElement()! + " " + String(i + 1)
            let isBoss = i == 0 || i % 5 == 0

            let evidenceSet = generateEvidenceSet()
            let requiredEvidence = generateRequiredEvidence()

            let ghost = GhostEntity(
                
                name: name,
                type: type,
                rarity: isBoss ? .legendary : [.common, .common, .rare].randomElement()!,
                health: isBoss ? Float.random(in: 200...500) : Float.random(in: 50...150),
                maxHealth: isBoss ? Float.random(in: 200...500) : Float.random(in: 50...150),
                damage: isBoss ? Float.random(in: 30...60) : Float.random(in: 5...25),
                speed: isBoss ? Float.random(in: 1...3) : Float.random(in: 0.3...1.5),
                position: SCNVector3(
                    Float.random(in: -50...50),
                    Float.random(in: 0...5),
                    Float.random(in: -50...50)
                ),
                rotation: SCNVector3(0, Float.random(in: 0...6.28), 0),
                state: .idle,
                mood: CemeteryGhostMood.allCases.randomElement()!,
                evidence: evidenceSet,
                requiredEvidence: requiredEvidence,
                isVisible: false,
                isHostile: Bool.random(),
                isBoss: isBoss,
                aggressionLevel: Float.random(in: 0.1...1.0),
                detectionRange: Float.random(in: 5...20),
                attackRange: Float.random(in: 1...5),
                attackCooldown: Float.random(in: 1...5),
                currentAttackCooldown: 0,
                intelligenceLevel: Float.random(in: 0.1...1.0),
                fearLevel: Float.random(in: 0.1...1.0),
                specialAbility: Bool.random() ? generateSpecialAbility() : nil,
                abilityCooldown: Float.random(in: 10...30),
                currentAbilityCooldown: 0,
                isStunned: false,
                stunDuration: 0,
                currentStunDuration: 0,
                summonCooldown: Float.random(in: 30...60),
                currentSummonCooldown: 0,
                minions: [],
                isMinion: false,
                masterId: nil
            )
            ghosts.append(ghost)
        }

        // Starter haunting: a few ghosts visible near the entrance.
        for i in 0..<min(3, ghosts.count) {
            ghosts[i].isVisible = true
            ghosts[i].position = SCNVector3(Float.random(in: -12 ... 12), 1, Float.random(in: -14 ... -4))
        }
    }

    func generateEvidenceSet() -> Set<GhostEvidence> {
        let allEvidence = GhostEvidence.allCases
        let count = Int.random(in: 3...5)
        return Set(allEvidence.shuffled().prefix(count))
    }

    func generateRequiredEvidence() -> Set<GhostEvidence> {
        let allEvidence = GhostEvidence.allCases
        let count = Int.random(in: 2...4)
        return Set(allEvidence.shuffled().prefix(count))
    }

    func generateSpecialAbility() -> String {
        let abilities = [
            "Shadow Walk",
            "Soul Drain",
            "Fear Aura",
            "Poltergeist Throw",
            "Ghost Scream",
            "Possession",
            "Teleportation",
            "Invisibility",
            "Summon Minions",
            "Darkness Embrace"
        ]
        return abilities.randomElement()!
    }

    func generateObjectives() {
        var objectives: [Objective] = []

        // Main objective
        let mainObjective = Objective(
            
            name: "Identify the Ghost",
            description: "Collect evidence to identify the type of ghost haunting the cemetery",
            isCompleted: false,
            progress: 0,
            type: .identifyGhost,
            reward: 1000
        )
        objectives.append(mainObjective)

        // Secondary objectives
        let secondaryObjectives = [
            Objective(
                
                name: "Collect Evidence",
                description: "Find 3 pieces of evidence",
                isCompleted: false,
                progress: 0,
                type: .collectEvidence,
                reward: 200
            ),
            Objective(
                
                name: "Take Photos",
                description: "Take 5 photos of paranormal activity",
                isCompleted: false,
                progress: 0,
                type: .takePhoto,
                reward: 150
            ),
            Objective(
                
                name: "Explore the Cemetery",
                description: "Explore all cemetery locations",
                isCompleted: false,
                progress: 0,
                type: .exploreLocation,
                reward: 300
            )
        ]

        objectives.append(contentsOf: secondaryObjectives)
        player.objectives = objectives
    }

    func generateDiaryEntries() {
        let entries: [(title: String, content: String)] = [
            ("First Day",
             "I've arrived at the cemetery. The air is thick with mist and mystery. I feel like I'm being watched..."),
            ("Strange Sounds",
             "I heard whispers last night. The wind carried voices that seemed to call my name. I couldn't sleep."),
            ("The Figure",
             "I saw a shadowy figure moving between the tombstones. When I looked closer, it disappeared."),
            ("Ghost Activity",
             "My EMF reader went crazy in the eastern section. Something is definitely there."),
            ("The Investigation",
             "I'm starting to piece together the evidence. The ghost seems to be a Spirit or maybe a Wraith."),
            ("Night Terrors",
             "I had nightmares last night. The ghost visited me in my sleep. I woke up drenched in sweat."),
            ("The Reaper",
             "I saw The Reaper standing at the edge of the cemetery. It was watching me... waiting."),
            ("Final Entry",
             "I've identified the ghost. It's a powerful entity that has been here for centuries. I must be careful.")
        ]

        diaryEntries.removeAll()
        let calendar = Calendar.current
        let startDate = calendar.date(byAdding: .day, value: -entries.count, to: Date())!

        for (index, entry) in entries.enumerated() {
            let date = calendar.date(byAdding: .day, value: index, to: startDate)!
            let diaryEntry = DiaryEntry(
                
                date: date,
                title: entry.title,
                content: entry.content,
                mood: ["Scared", "Curious", "Determined", "Terrified", "Hopeful"].randomElement()!,
                location: locations.randomElement()?.name ?? "Unknown",
                isRead: false,
                isImportant: index % 3 == 0
            )
            diaryEntries.append(diaryEntry)
        }
    }

    func generateInitialNotifications() {
        addNotification("📖 Welcome to the Cemetery of Shadows")
        addNotification("👻 You are not alone...")
        addNotification("🔦 Your flashlight is your best friend")
        addNotification("📡 Use your equipment to gather evidence")
        addNotification("⚠️ Stay quiet and stay alive")
        addNotification("💀 The ghost is watching...")
        addNotification("🔎 Investigate the locations")
        addNotification("📸 Take photos of paranormal activity")
        addNotification("🧠 Keep your sanity in check")
        addNotification("🎯 Complete objectives to win")
    }

    // MARK: - Timer Methods

    func startTimers() {
        // Single 0.5s heartbeat instead of three overlapping timers:
        // game+sound every tick, ghosts every other tick (= 1.0s).
        gameLoopTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.updateTick()
        }

        eventLoopTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { [weak self] _ in
            self?.triggerRandomEvent()
        }

        saveTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: true) { [weak self] _ in
            self?.saveGame()
        }
    }

    private func updateTick() {
        deltaTime = 0.5 // was never assigned: stamina/sanity/battery drains were frozen
        updateGame()
        updateSound()
        slowTickPhase += 1
        if slowTickPhase % 2 == 0 { updateGhosts() }
    }

    // MARK: - Game Update

    func updateGame() {
        guard !isPaused && !isGameOver else { return }

        gameTime += deltaTime

        // Update player stats
        updatePlayerStats()

        // Update sanity
        updateSanity()

        // Update equipment
        updateCemeteryEquipment()

        // Check for ghost proximity
        checkGhostProximity()

        // Update objectives
        updateObjectives()

        // Check win/lose conditions
        checkGameConditions()

        // Update environment
        updateEnvironment()
    }

    func updatePlayerStats() {
        // Update stamina
        if player.isSprinting && !player.isSneaking {
            player.stamina -= 0.5 * deltaTime * 60
            if player.stamina <= 0 {
                player.isSprinting = false
                player.stamina = 0
            }
        } else {
            player.stamina = min(player.maxStamina, player.stamina + 0.2 * deltaTime * 60)
        }

        // Update hunger
        if gameTime.truncatingRemainder(dividingBy: 60) == 0 {
            player.hunger -= 0.5
            if player.hunger <= 0 {
                player.health -= 1
                if player.health <= 0 {
                    player.isAlive = false
                    gameOver()
                }
            }
        }

        // Update fear
        if isGhostHunting {
            player.fearLevel += 0.1 * deltaTime * 60
        } else {
            player.fearLevel = max(0, player.fearLevel - 0.05 * deltaTime * 60)
        }
    }

    func updateSanity() {
        guard isSanityDrainEnabled else { return }

        var drainRate: Float = 0.1

        // Increase drain based on ghost activity
        drainRate += ghostActivityLevel * 0.2

        // Increase drain based on fear
        drainRate += player.fearLevel * 0.1

        // Increase drain in dark areas
        if let location = currentLocation {
            drainRate += (1 - location.lightingLevel) * 0.2
        }

        // Decrease drain when using equipment
        if isCemeteryEquipmentActive {
            drainRate *= 0.5
        }

        player.sanity -= drainRate * deltaTime * 60
        player.sanity = max(0, min(player.maxSanity, player.sanity))

        // Trigger sanity effects
        if player.sanity < 20 {
            // Hallucinations
            if Float.random(in: 0...1) < 0.01 {
                createHallucination()
            }
        }

        if player.sanity < 10 {
            // Severe effects
            if Float.random(in: 0...1) < 0.02 {
                triggerInsanity()
            }
        }
    }

    func updateCemeteryEquipment() {
        if var equipment = player.activeCemeteryEquipment {
            equipment.batteryLevel -= 0.01 * deltaTime * 60
            if equipment.batteryLevel <= 0 {
                equipment.isActive = false
                equipment.batteryLevel = 0
                addNotification("🔋 \(equipment.name) battery depleted!")
            }
            player.activeCemeteryEquipment = equipment
        }

        // Update flashlight battery
        flashlightBattery -= 0.1 * deltaTime * 60
        if flashlightBattery <= 0 {
            flashlightBattery = 0
            isCemeteryEquipmentActive = false
        }
    }

    func updateGhosts() {
        for index in ghosts.indices {
            var ghost = ghosts[index]

            // Update cooldowns
            if ghost.currentAttackCooldown > 0 {
                ghost.currentAttackCooldown -= 1
            }
            if ghost.currentAbilityCooldown > 0 {
                ghost.currentAbilityCooldown -= 1
            }
            if ghost.currentStunDuration > 0 && ghost.isStunned {
                ghost.currentStunDuration -= 1
                if ghost.currentStunDuration <= 0 {
                    ghost.isStunned = false
                }
            }

            // Update state based on player proximity
            let distanceToPlayer = calculateDistance(ghost.position, player.position)

            if ghost.isStunned {
                ghosts[index] = ghost
                continue
            }

            switch ghost.state {
            case .idle:
                if distanceToPlayer < ghost.detectionRange {
                    ghost.state = .investigating
                    ghost.mood = .curious
                } else if Float.random(in: 0...1) < 0.01 {
                    ghost.state = .wandering
                }

            case .wandering:
                if distanceToPlayer < ghost.detectionRange {
                    ghost.state = .investigating
                    ghost.mood = .curious
                } else if Float.random(in: 0...1) < 0.02 {
                    // Move to random position
                    ghost.position = SCNVector3(
                        Float.random(in: -50...50),
                        Float.random(in: 0...5),
                        Float.random(in: -50...50)
                    )
                }

            case .investigating:
                if distanceToPlayer < ghost.attackRange && ghost.isHostile {
                    ghost.state = .hunting
                    ghost.mood = .angry
                } else if distanceToPlayer > ghost.detectionRange * 1.5 {
                    ghost.state = .idle
                    ghost.mood = .calm
                } else if Float.random(in: 0...1) < 0.01 {
                    // Manifest
                    ghost.isVisible = true
                    ghost.state = .manifesting
                    createGhostAppearance(ghost: ghost)
                }

            case .hunting:
                if distanceToPlayer < ghost.attackRange && ghost.currentAttackCooldown <= 0 {
                    ghost.state = .attacking
                } else if distanceToPlayer > ghost.detectionRange * 2 {
                    ghost.state = .idle
                } else {
                    // Move towards player
                    let direction = SCNVector3(
                        player.position.x - ghost.position.x,
                        0,
                        player.position.z - ghost.position.z
                    )
                    let normalized = normalizeVector(direction)
                    ghost.position.x += normalized.x * ghost.speed * 0.1
                    ghost.position.z += normalized.z * ghost.speed * 0.1
                }

            case .attacking:
                if ghost.currentAttackCooldown <= 0 {
                    // Attack player
                    player.health -= ghost.damage
                    ghost.currentAttackCooldown = ghost.attackCooldown
                    addNotification("💢 \(ghost.name) attacked! -\(Int(ghost.damage)) health")
                    triggerHaptic(.heavy)
                    createDamageEffect()

                    if player.health <= 0 {
                        player.isAlive = false
                        gameOver()
                    }
                }
                ghost.state = .hunting

            case .manifesting:
                ghost.isVisible = true
                ghost.state = .idle

            case .fleeing:
                // Ghost runs away
                let fleeDirection = SCNVector3(
                    ghost.position.x - player.position.x,
                    0,
                    ghost.position.z - player.position.z
                )
                let normalized = normalizeVector(fleeDirection)
                ghost.position.x += normalized.x * ghost.speed * 0.3
                ghost.position.z += normalized.z * ghost.speed * 0.3

                if distanceToPlayer > 20 {
                    ghost.state = .idle
                }

            default:
                break
            }

            // Update ghost visibility
            if ghost.isHostile && distanceToPlayer < 10 {
                ghost.isVisible = true
            }

            // Random mood changes
            if Float.random(in: 0...1) < 0.001 {
                ghost.mood = CemeteryGhostMood.allCases.randomElement()!
            }

            ghosts[index] = ghost
        }
    }

    func updateSound() {
        // Update sound meter based on player activity
        var soundValue: Float = 0

        if player.isSprinting {
            soundValue += 0.5
        }
        if player.isMoving {
            soundValue += 0.3
        }
        if isCemeteryEquipmentActive {
            soundValue += 0.2
        }

        // Add random sound from ghost activity
        soundValue += ghostActivityLevel * 0.3

        soundMeter = min(1, soundValue)

        // Check if ghost can hear
        if soundMeter > 0.5 {
            for index in ghosts.indices where ghosts[index].state == .idle && ghosts[index].detectionRange > 5 {
                if Float.random(in: 0...1) < 0.01 {
                    ghosts[index].state = .investigating
                    addNotification("👻 The ghost heard you!")
                }
            }
        }
    }

    func updateObjectives() {
        for index in player.objectives.indices {
            var objective = player.objectives[index]
            if objective.isCompleted { continue }

            switch objective.type {
            case .identifyGhost:
                // Check if we have enough evidence
                let collected = discoveredEvidence.count
                objective.progress = Float(collected) / 3.0
                if collected >= 3 {
                    objective.isCompleted = true
                    addNotification("✅ Objective Complete: \(objective.name)")
                }

            case .collectEvidence:
                let collected = discoveredEvidence.count
                objective.progress = Float(collected) / 3.0
                if collected >= 3 {
                    objective.isCompleted = true
                }

            case .takePhoto:
                objective.progress = Float(photosTaken) / 5.0
                if photosTaken >= 5 {
                    objective.isCompleted = true
                }

            case .exploreLocation:
                let explored = locations.filter { $0.isExplored }.count
                objective.progress = Float(explored) / Float(locations.count)
                if explored >= locations.count {
                    objective.isCompleted = true
                }

            default:
                break
            }

            if objective.isCompleted {
                score += objective.reward
                addNotification("🏆 Objective Complete: \(objective.name) +\(objective.reward) points")
                player.completedObjectives.append(objective)
            }

            player.objectives[index] = objective
        }
    }

    func checkGameConditions() {
        // Victory condition: All objectives completed
        let allCompleted = player.objectives.allSatisfy { $0.isCompleted }
        if allCompleted && !isVictory {
            isVictory = true
            addNotification("🎉 Victory! You've completed all objectives!")
            addNotification("⭐ Final Score: \(score)")
        }

        // Lose condition: Player health <= 0
        if player.health <= 0 {
            player.isAlive = false
            gameOver()
        }
    }

    func updateEnvironment() {
        // Update weather effects
        if Float.random(in: 0...1) < 0.001 {
            let weatherTypes: [AtmosphericType] = [.fog, .mist, .rain, .lightning, .wind, .snow]
            weatherEffect = AtmosphericEffect(
                type: weatherTypes.randomElement()!,
                intensity: Float.random(in: 0.1...1.0),
                duration: Float.random(in: 30...120),
                position: SCNVector3(0, 0, 0),
                isActive: true
            )
            addNotification("🌧️ Weather changed: \(weatherEffect!.type)")
        }

        // Update ghost activity
        ghostActivityLevel = Float.random(in: 0.1...0.8)

        // Update temperature based on location
        if let location = currentLocation {
            temperature = location.temperature
        }
    }

    // MARK: - Ghost Interactions

    func checkGhostProximity() {
        for ghost in ghosts {
            let distance = calculateDistance(ghost.position, player.position)
            if distance < 5 {
                // Player is very close to a ghost
                player.fearLevel = min(1, player.fearLevel + 0.02)

                // Ghost effect
                if Float.random(in: 0...1) < 0.001 {
                    createGhostEffect(ghost: ghost)
                }
            }
        }
    }

    func createGhostAppearance(ghost: GhostEntity) {
        addNotification("👻 \(ghost.name) appeared!")
        triggerHaptic(.heavy)
        createParticles(at: ghost.position, count: 50, emoji: "👻")
    }

    func createGhostEffect(ghost: GhostEntity) {
        let effects = [
            "💨 Cold breeze",
            "👻 Ghost whisper",
            "📡 EMF spike",
            "🌡️ Temperature drop",
            "💀 Shadow passes",
            "🔦 Flickering lights",
            "📻 Ghostly voices"
        ]
        addNotification("\(effects.randomElement()!)")
        triggerHaptic(.medium)
    }

    func triggerRandomEvent() {
        let events = [
            "💨 The wind picks up",
            "🌙 The moon hides behind clouds",
            "👻 Something moves in the shadows",
            "📡 EMF meter spikes",
            "🌡️ Temperature drops",
            "💀 You hear whispers",
            "🔦 Your flashlight flickers",
            "👣 Footsteps behind you",
            "📻 Static from the spirit box",
            "🖐️ A cold touch on your shoulder"
        ]

        if Float.random(in: 0...1) < 0.3 {
            addNotification(events.randomElement()!)
            triggerHaptic(.medium)
        }
    }

    func createHallucination() {
        let hallucinations = [
            "👻 You see a figure in the corner",
            "💀 A skull appears in the mist",
            "👁️ An eye is watching you",
            "🌙 The moon turns blood red",
            "🖐️ Handprints appear on the wall"
        ]
        addNotification("🧠 Hallucination: \(hallucinations.randomElement()!)")
        triggerHaptic(.light)
    }

    func triggerInsanity() {
        addNotification("🤯 INSANITY!")
        triggerHaptic(.heavy)
        createParticles(at: player.position, count: 30, emoji: "🌀")

        // Random negative effect
        let effects = [
            "💀 Lose 20 health",
            "🔦 Flashlight dies",
            "👻 Ghost appears",
            "🌑 Darkness closes in"
        ]
        addNotification("\(effects.randomElement()!)")
    }

    func createDamageEffect() {
        createParticles(at: player.position, count: 20, emoji: "💥")
        triggerHaptic(.heavy)
        playSound("damage")
    }

    // MARK: - CemeteryEquipment Functions

    func useCemeteryEquipment(_ equipment: CemeteryEquipment) {
        player.activeCemeteryEquipment = equipment
        isCemeteryEquipmentActive = true
        addNotification("🔍 Using \(equipment.name)")

        switch equipment.type {
        case .emfReader:
            isEmfActive = true
            if ghostActivityLevel > 0.5 {
                emfLevel = Float.random(in: 3...5)
                addNotification("📡 EMF Level \(Int(emfLevel)) detected!")
            } else {
                emfLevel = Float.random(in: 0...2)
            }

        case .spiritBox:
            isSpiritBoxActive = true
            if Float.random(in: 0...1) < 0.3 {
                addNotification("👻 Spirit Box: 'I'm here...'")
                playSound("spiritbox")
            }

        case .thermometer:
            if temperature < 0 {
                addNotification("❄️ Freezing temperatures detected!")
            } else {
                addNotification("🌡️ Temperature: \(Int(temperature))°C")
            }

        case .videoCamera:
            if Float.random(in: 0...1) < 0.1 {
                addNotification("👁️ Ghost orb detected on camera!")
                discoveredEvidence.insert(.ghostOrbs)
            }

        default:
            break
        }
    }

    func useInventoryItem(_ item: InventoryItem) {
        switch item.type {
        case .consumable:
            // Use consumable
            if item.name == "Medkit" {
                player.health = min(player.maxHealth, player.health + 25)
                removeInventoryItem(item)
                addNotification("💚 Health restored!")
            } else if item.name == "Holy Water" {
                for index in ghosts.indices {
                    ghosts[index].isStunned = true
                    ghosts[index].currentStunDuration = 5
                }
                removeInventoryItem(item)
                addNotification("💧 Holy water used! Ghosts stunned!")
            }

        case .key:
            // Use key to unlock something
            addNotification("🔑 You used \(item.name)")
            removeInventoryItem(item)

        default:
            break
        }
    }

    func removeInventoryItem(_ item: InventoryItem) {
        if let index = player.inventory.firstIndex(where: { $0.id == item.id }) {
            if player.inventory[index].quantity > 1 {
                player.inventory[index].quantity -= 1
            } else {
                player.inventory.remove(at: index)
            }
        }
    }

    // MARK: - Interaction Functions

    func interactWithObject(at position: SCNVector3) {
        // Check for crypts, graves, or interactive objects
        for index in locations.indices {
            let location = locations[index]
            let distance = calculateDistance(position, location.coordinates)
            if distance < 3 {
                if !location.isExplored {
                    locations[index].isExplored = true
                    addNotification("🏚️ Explored \(location.name)")
                    score += 50

                    // Add items from location
                    for item in location.items {
                        player.inventory.append(item)
                        addNotification("📦 Found: \(item.name)")
                    }
                }
                return
            }
        }

        // Check for ghosts
        for index in ghosts.indices {
            let ghost = ghosts[index]
            let distance = calculateDistance(position, ghost.position)
            if distance < 2 {
                if !ghost.isVisible {
                    ghosts[index].isVisible = true
                    addNotification("👻 \(ghost.name) appeared!")
                }
                return
            }
        }

        // Default interaction
        addNotification("🔍 You found nothing interesting here")
    }

    // MARK: - Exploration Functions

    func exploreCurrentLocation() {
        guard var location = currentLocation else { return }

        if !location.isExplored {
            location.isExplored = true
            currentLocation = location
            addNotification("🏚️ Exploring \(location.name)")
            score += 50

            // Add location items
            for item in location.items {
                player.inventory.append(item)
                addNotification("📦 Found: \(item.name)")
            }

            // Chance to find evidence
            if Float.random(in: 0...1) < 0.3 {
                let evidence = GhostEvidence.allCases.randomElement()!
                discoveredEvidence.insert(evidence)
                addNotification("🔍 Found evidence: \(evidence.rawValue)")
            }
        }
    }

    // MARK: - Photo System

    func takePhoto() {
        photosTaken += 1
        addNotification("📸 Photo taken! (\(photosTaken)/5)")

        // Check if photo captured evidence
        if Float.random(in: 0...1) < 0.3 {
            let evidence = GhostEvidence.allCases.randomElement()!
            discoveredEvidence.insert(evidence)
            addNotification("👻 Photo captured evidence: \(evidence.rawValue)")
        }
    }

    // MARK: - Helper Functions

    func calculateDistance(_ pos1: SCNVector3, _ pos2: SCNVector3) -> Float {
        let dx = pos1.x - pos2.x
        let dy = pos1.y - pos2.y
        let dz = pos1.z - pos2.z
        return sqrt(dx * dx + dy * dy + dz * dz)
    }

    func normalizeVector(_ vector: SCNVector3) -> SCNVector3 {
        let length = sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z)
        guard length > 0 else { return SCNVector3(0, 0, 0) }
        return SCNVector3(vector.x / length, vector.y / length, vector.z / length)
    }

    func createParticles(at position: SCNVector3, count: Int, emoji: String) {
        // Particle creation handled by view
        addNotification("✨ Particles created at \(position)")
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

    func playSound(_ sound: String) {
        // Sound playback handled by view
    }

    func gameOver() {
        isGameOver = true
        addNotification("💀 Game Over!")
        addNotification("📊 Final Score: \(score)")
        addNotification("👻 Ghosts Identified: \(discoveredEvidence.count) pieces of evidence")
        addNotification("📸 Photos Taken: \(photosTaken)")
        addNotification("🏚️ Locations Explored: \(locations.filter { $0.isExplored }.count)")
    }

    func resetGame() {
        // Reset player
        player.health = player.maxHealth
        player.sanity = player.maxSanity
        player.stamina = player.maxStamina
        player.hunger = player.maxHunger
        player.isAlive = true
        player.isPossessed = false
        player.fearLevel = 0
        player.position = SCNVector3(0, 0, 0)
        player.inventory.removeAll()
        player.evidence.removeAll()
        player.completedObjectives.removeAll()

        // Reset ghosts
        generateGhosts()

        // Reset objectives
        generateObjectives()

        // Reset game state
        isGameOver = false
        isVictory = false
        score = 0
        photosTaken = 0
        discoveredEvidence.removeAll()
        seedCemeteryEquipment()

        addNotification("🔄 Game Reset")
    }

    func saveGame() {
        // Save game state to UserDefaults
        UserDefaults.standard.set(score, forKey: "cemeteryScore")
        UserDefaults.standard.set(photosTaken, forKey: "cemeteryPhotos")
        UserDefaults.standard.set(discoveredEvidence.map { $0.rawValue }, forKey: "cemeteryEvidence")
        UserDefaults.standard.set(locations.filter { $0.isExplored }.map { $0.id.uuidString }, forKey: "cemeteryExplored")

        addNotification("💾 Game Saved")
    }

    func loadGame() {
        // Load game state from UserDefaults
        score = UserDefaults.standard.integer(forKey: "cemeteryScore")
        photosTaken = UserDefaults.standard.integer(forKey: "cemeteryPhotos")

        if let evidenceStrings = UserDefaults.standard.array(forKey: "cemeteryEvidence") as? [String] {
            discoveredEvidence = Set(evidenceStrings.compactMap { GhostEvidence(rawValue: $0) })
        }

        addNotification("📂 Game Loaded")
    }
}

// ============================================================
// MARK: - 3. SCENE KIT VIEW WITH PHOTOREALISM
// ============================================================

struct CemeterySceneView: UIViewRepresentable {
    @ObservedObject var manager: CemeteryGameManager

    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        scnView.backgroundColor = UIColor.black
        scnView.autoenablesDefaultLighting = false
        scnView.showsStatistics = true
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

        // Setup world geometry (ground, graves, trees, crypt)
        setupWorld(in: scene)

        // Setup gestures
        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        scnView.addGestureRecognizer(tapGesture)

        let panGesture = UIPanGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePan(_:)))
        scnView.addGestureRecognizer(panGesture)

        let pinchGesture = UIPinchGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handlePinch(_:)))
        scnView.addGestureRecognizer(pinchGesture)

        return scnView
    }

    func updateUIView(_ scnView: SCNView, context: Context) {
        // Update scene when data changes
        if scnView.scene != manager.scene {
            scnView.scene = manager.scene
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(manager: manager)
    }

    // MARK: - Scene Setup

    func setupCamera(in scene: SCNScene) {
        let cameraNode = SCNNode()
        cameraNode.name = "camera"
        cameraNode.camera = SCNCamera()
        cameraNode.camera?.fieldOfView = 70
        cameraNode.camera?.zNear = 0.1
        cameraNode.camera?.zFar = 200
        cameraNode.position = SCNVector3(0, 5, 10)
        cameraNode.eulerAngles = SCNVector3(-0.3, 0, 0)
        scene.rootNode.addChildNode(cameraNode)

        // Add camera to manager
        manager.scene = scene
    }

    func setupLighting(in scene: SCNScene) {
        // Ambient light for base illumination
        let ambientLight = SCNLight()
        ambientLight.type = .ambient
        ambientLight.color = UIColor(white: 0.2, alpha: 1.0)
        let ambientNode = SCNNode()
        ambientNode.light = ambientLight
        scene.rootNode.addChildNode(ambientNode)

        // Directional light (moonlight)
        let directionalLight = SCNLight()
        directionalLight.type = .directional
        directionalLight.color = UIColor(white: 0.3, alpha: 1.0)
        directionalLight.shadowColor = UIColor.black
        directionalLight.shadowRadius = 20
        let directionalNode = SCNNode()
        directionalNode.light = directionalLight
        directionalNode.position = SCNVector3(0, 30, 0)
        directionalNode.eulerAngles = SCNVector3(-Float.pi/4, 0, 0)
        scene.rootNode.addChildNode(directionalNode)

        // Fill light from below for spooky effect
        let fillLight = SCNLight()
        fillLight.type = .omni
        fillLight.color = UIColor(red: 0.1, green: 0.05, blue: 0.1, alpha: 1.0)
        fillLight.intensity = 200
        let fillNode = SCNNode()
        fillNode.light = fillLight
        fillNode.position = SCNVector3(0, -10, 0)
        scene.rootNode.addChildNode(fillNode)
    }

    func setupEnvironment(in scene: SCNScene) {
        // Fog for atmosphere
        scene.fogColor = UIColor(red: 0.05, green: 0.02, blue: 0.05, alpha: 1.0)
        scene.fogStartDistance = 10
        scene.fogEndDistance = 30
        scene.fogDensityExponent = 2

        // Create a skybox
        let skyboxMaterial = SCNMaterial()
        skyboxMaterial.diffuse.contents = UIColor(red: 0.02, green: 0.01, blue: 0.03, alpha: 1.0)
        scene.background.contents = skyboxMaterial
    }

    func setupWorld(in scene: SCNScene) {
        func m(_ c: UIColor, e: UIColor? = nil) -> SCNMaterial {
            let mm = SCNMaterial()
            mm.diffuse.contents = c
            if let e = e { mm.emission.contents = e }
            return mm
        }
        let bark = UIColor(red: 0.2, green: 0.12, blue: 0.08, alpha: 1)
        // Ground.
        let ground = SCNNode(geometry: SCNPlane(width: 140, height: 140))
        ground.geometry?.materials = [m(UIColor(red: 0.08, green: 0.1, blue: 0.07, alpha: 1))]
        ground.eulerAngles.x = -Float.pi / 2
        ground.name = "ground"
        scene.rootNode.addChildNode(ground)
        // Moon + stars.
        let moon = SCNNode(geometry: SCNSphere(radius: 3))
        moon.geometry?.materials = [m(.white, e: .white)]
        moon.position = SCNVector3(-25, 22, -45)
        scene.rootNode.addChildNode(moon)
        for _ in 0..<40 {
            let st = SCNNode(geometry: SCNSphere(radius: 0.12))
            st.geometry?.materials = [m(.white, e: .white)]
            let a = Float.random(in: 0...Float.pi * 2)
            st.position = SCNVector3(cos(a) * 60, Float.random(in: 15...40), sin(a) * 60 - 20)
            scene.rootNode.addChildNode(st)
        }
        // Tombstones.
        for _ in 0..<26 {
            let t = SCNNode(geometry: SCNBox(width: 0.9, height: 1.3, length: 0.25, chamferRadius: 0.08))
            t.geometry?.materials = [m(.gray)]
            let a = Float.random(in: 0...Float.pi * 2)
            let r = Float.random(in: 4...28)
            t.position = SCNVector3(cos(a) * r, 0.6, sin(a) * r)
            t.eulerAngles.y = Float.random(in: 0...Float.pi * 2)
            t.eulerAngles.z = Float.random(in: -0.12...0.12)
            scene.rootNode.addChildNode(t)
        }
        // Dead trees.
        for _ in 0..<8 {
            let a = Float.random(in: 0...Float.pi * 2)
            let r = Float.random(in: 12...30)
            let x = cos(a) * r, z = sin(a) * r
            let trunk = SCNNode(geometry: SCNCylinder(radius: 0.22, height: 4))
            trunk.geometry?.materials = [m(bark)]
            trunk.position = SCNVector3(x, 2, z)
            scene.rootNode.addChildNode(trunk)
            for k in 0..<3 {
                let br = SCNNode(geometry: SCNCylinder(radius: 0.08, height: 1.6))
                br.geometry?.materials = [m(bark)]
                br.position = SCNVector3(x + Float(k) * 0.3 - 0.3, 3.2 + Float(k) * 0.4, z)
                br.eulerAngles.z = Float(k) * 0.6 - 0.6
                scene.rootNode.addChildNode(br)
            }
        }
        // Mausoleum.
        let mau = SCNNode(geometry: SCNBox(width: 6, height: 3.5, length: 5, chamferRadius: 0.1))
        mau.geometry?.materials = [m(.darkGray)]
        mau.position = SCNVector3(0, 1.75, -24)
        scene.rootNode.addChildNode(mau)
        let roof = SCNNode(geometry: SCNPyramid(width: 7, height: 2, length: 6))
        roof.geometry?.materials = [m(UIColor(red: 0.25, green: 0.08, blue: 0.1, alpha: 1))]
        roof.position = SCNVector3(0, 4.5, -24)
        scene.rootNode.addChildNode(roof)
        let door = SCNNode(geometry: SCNBox(width: 1.6, height: 2.4, length: 0.2, chamferRadius: 0.05))
        door.geometry?.materials = [m(.black)]
        door.position = SCNVector3(0, 1.2, -21.4)
        scene.rootNode.addChildNode(door)
        // Fence ring.
        for i in 0..<16 {
            let a = Float(i) / 16 * Float.pi * 2
            let post = SCNNode(geometry: SCNCylinder(radius: 0.09, height: 1.1))
            post.geometry?.materials = [m(.black)]
            post.position = SCNVector3(cos(a) * 34, 0.55, sin(a) * 34)
            scene.rootNode.addChildNode(post)
        }
        // Jack-o'-lanterns.
        for _ in 0..<6 {
            let a = Float.random(in: 0...Float.pi * 2)
            let r = Float.random(in: 3...12)
            let pump = SCNNode(geometry: SCNSphere(radius: 0.35))
            pump.geometry?.materials = [m(.orange, e: UIColor(red: 0.9, green: 0.4, blue: 0, alpha: 1))]
            pump.scale = SCNVector3(1, 0.82, 1)
            pump.position = SCNVector3(cos(a) * r, 0.28, sin(a) * r)
            scene.rootNode.addChildNode(pump)
        }
        // Slab path to the mausoleum.
        for i in 0..<6 {
            let slab = SCNNode(geometry: SCNCylinder(radius: 0.7, height: 0.08))
            slab.geometry?.materials = [m(.lightGray)]
            slab.position = SCNVector3(sin(Float(i)) * 0.4, 0.04, -2 - Float(i) * 3)
            scene.rootNode.addChildNode(slab)
        }
    }

    // MARK: - Coordinator

    class Coordinator: NSObject, SCNSceneRendererDelegate {
        var manager: CemeteryGameManager
        private var lastTouchPosition: CGPoint = .zero
        private var lastTick: TimeInterval = 0

        init(manager: CemeteryGameManager) {
            self.manager = manager
        }

        func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
            // Throttled: full SceneKit work at 4Hz, game state on main thread.
            // (Rebuilding every ghost node at 60fps hung the app on load.)
            guard time - lastTick > 0.25 else { return }
            lastTick = time
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.manager.updateGame()
                self.syncCamera()
                self.syncGhosts()
            }
        }

        private func syncCamera() {
            // Update camera to follow player
            if let scene = manager.scene {
                if let cameraNode = scene.rootNode.childNode(withName: "camera", recursively: true) {
                    let playerPos = manager.player.position
                    cameraNode.position = SCNVector3(
                        playerPos.x + 5 * sin(manager.player.rotation.y),
                        playerPos.y + 3,
                        playerPos.z + 5 * cos(manager.player.rotation.y)
                    )
                    cameraNode.look(at: playerPos)
                }
            }
        }

        private func syncGhosts() {
            // Incremental sync: move existing nodes, only create/remove on change.
            for ghost in manager.ghosts {
                let ghostName = "ghost_\(ghost.id)"
                if ghost.isVisible {
                    if let node = manager.scene?.rootNode.childNode(withName: ghostName, recursively: true) {
                        node.position = ghost.position
                    } else if let scene = manager.scene {
                        let ghostNode = createGhostNode(for: ghost)
                        ghostNode.name = ghostName
                        scene.rootNode.addChildNode(ghostNode)
                    }
                } else {
                    manager.scene?.rootNode.childNode(withName: ghostName, recursively: true)?.removeFromParentNode()
                }
            }
        }

        func createGhostNode(for ghost: GhostEntity) -> SCNNode {
            let node = SCNNode()

            // Main ghost body
            let sphere = SCNSphere(radius: 0.5)
            let material = SCNMaterial()
            if ghost.isBoss {
                material.diffuse.contents = UIColor.purple
                material.emission.contents = UIColor.purple
            } else {
                material.diffuse.contents = UIColor.white
                material.emission.contents = UIColor.cyan
            }
            material.transparency = 0.6
            material.emission.intensity = CGFloat(ghost.rarity.glowIntensity)
            sphere.materials = [material]

            let bodyNode = SCNNode(geometry: sphere)
            bodyNode.position = SCNVector3(0, 0.5, 0)
            node.addChildNode(bodyNode)

            // Ghost glow
            let glow = SCNLight()
            glow.type = .omni
            glow.color = ghost.isBoss ? UIColor.purple : UIColor.cyan
            glow.intensity = 200 * CGFloat(ghost.rarity.glowIntensity)
            let glowNode = SCNNode()
            glowNode.light = glow
            glowNode.position = SCNVector3(0, 0, 0)
            node.addChildNode(glowNode)

            // Ghost float animation
            let floatAction = SCNAction.repeatForever(
                SCNAction.sequence([
                    SCNAction.moveBy(x: 0, y: 0.3, z: 0, duration: 1.5),
                    SCNAction.moveBy(x: 0, y: -0.3, z: 0, duration: 1.5)
                ])
            )
            node.runAction(floatAction)

            node.position = ghost.position
            return node
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            let scnView = gesture.view as! SCNView
            let location = gesture.location(in: scnView)
            let hitResults = scnView.hitTest(location, options: [:])

            if let hitResult = hitResults.first {
                let position = hitResult.node.position
                manager.interactWithObject(at: position)
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

                // Rotate player view
                manager.player.rotation.y += Float(delta.x) * 0.005
                manager.player.rotation.x += Float(delta.y) * 0.005

                lastTouchPosition = translation

            default:
                break
            }
        }

        @objc func handlePinch(_ gesture: UIPinchGestureRecognizer) {
            // Zoom in/out
            if let scene = manager.scene {
                if let cameraNode = scene.rootNode.childNode(withName: "camera", recursively: true) {
                    let newZ = cameraNode.position.z * Float(gesture.scale)
                    cameraNode.position.z = max(3, min(20, newZ))
                    gesture.scale = 1.0
                }
            }
        }
    }
}

// ============================================================
// MARK: - 4. MAIN CONTENT VIEW WITH HORROR UI
// ============================================================

struct CemeteryOfShadowsView: View {
    @StateObject private var manager = CemeteryGameManager()
    @State private var showInventory = false
    @State private var showDiary = false
    @State private var showObjectives = false
    @State private var showSettings = false
    @State private var showEvidence = false
    @State private var showMap = false
    @State private var selectedCemeteryEquipmentIndex = 0
    @State private var isInteracting = false
    @State private var interactionText = ""

    var body: some View {
        ZStack {
            // 3D Scene
            CemeterySceneView(manager: manager)
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

                    // Sanity
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Image(systemName: "brain.fill")
                                .foregroundColor(manager.player.sanity > 50 ? .blue : .purple)
                            Text("\(Int(manager.player.sanity))/\(Int(manager.player.maxSanity))")
                                .foregroundColor(.white)
                                .font(.caption)
                        }
                        ProgressView(value: Double(manager.player.sanity), total: Double(manager.player.maxSanity))
                            .progressViewStyle(LinearProgressViewStyle(tint: manager.player.sanity > 50 ? .blue : .purple))
                            .frame(width: 80)
                    }
                    .padding(6)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)

                    // Stamina
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Image(systemName: "bolt.fill")
                                .foregroundColor(.yellow)
                            Text("\(Int(manager.player.stamina))/\(Int(manager.player.maxStamina))")
                                .foregroundColor(.white)
                                .font(.caption)
                        }
                        ProgressView(value: Double(manager.player.stamina), total: Double(manager.player.maxStamina))
                            .progressViewStyle(LinearProgressViewStyle(tint: .yellow))
                            .frame(width: 80)
                    }
                    .padding(6)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)

                    Spacer()

                    // Score & Stats
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("🏆 \(manager.score)")
                            .foregroundColor(.yellow)
                            .font(.headline)
                        Text("👻 \(manager.discoveredEvidence.count)/3")
                            .foregroundColor(.purple)
                            .font(.caption)
                        Text("📸 \(manager.photosTaken)/5")
                            .foregroundColor(.orange)
                            .font(.caption)
                    }
                    .padding(6)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)

                    // Buttons
                    Button(action: { showEvidence.toggle() }) {
                        Image(systemName: "doc.text.magnifyingglass")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.purple.opacity(0.7))
                            .cornerRadius(8)
                    }

                    Button(action: { showObjectives.toggle() }) {
                        Image(systemName: "target")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.green.opacity(0.7))
                            .cornerRadius(8)
                    }

                    Button(action: { showInventory.toggle() }) {
                        Image(systemName: "backpack.fill")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.orange.opacity(0.7))
                            .cornerRadius(8)
                    }

                    Button(action: { showDiary.toggle() }) {
                        Image(systemName: "book.fill")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.brown.opacity(0.7))
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

                // Sound Meter
                HStack {
                    Text("Sound:")
                        .font(.caption)
                        .foregroundColor(.white)
                    ProgressView(value: Double(manager.soundMeter), total: 1.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: manager.soundMeter > 0.5 ? .red : .green))
                        .frame(width: 100)
                }
                .padding(6)
                .background(Color.black.opacity(0.7))
                .cornerRadius(8)
                .padding(.horizontal)

                // Interaction Text
                if isInteracting {
                    Text(interactionText)
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding(12)
                        .background(Color.black.opacity(0.8))
                        .cornerRadius(12)
                        .padding(.bottom, 8)
                        .transition(.opacity)
                }

                // Hotbar
                HStack(spacing: 4) {
                    ForEach(0..<min(9, manager.player.equipment.count), id: \.self) { index in
                        let equipment = manager.player.equipment[index]
                        Button(action: {
                            selectedCemeteryEquipmentIndex = index
                            manager.useCemeteryEquipment(equipment)
                        }) {
                            VStack(spacing: 2) {
                                Text(equipment.icon)
                                    .font(.title2)
                                Text(equipment.name.components(separatedBy: " ").first ?? "")
                                    .font(.system(size: 8))
                                    .foregroundColor(.white)
                                ProgressView(value: Double(equipment.batteryLevel), total: Double(equipment.maxBattery))
                                    .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                                    .frame(width: 30)
                            }
                            .padding(4)
                            .frame(width: 50, height: 60)
                            .background(selectedCemeteryEquipmentIndex == index ? Color.orange.opacity(0.5) : Color.black.opacity(0.6))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(selectedCemeteryEquipmentIndex == index ? Color.orange : Color.clear, lineWidth: 2)
                            )
                        }
                    }

                    Spacer()

                    // Quick Actions
                    VStack(spacing: 2) {
                        Button(action: {
                            manager.takePhoto()
                        }) {
                            Image(systemName: "camera.fill")
                                .foregroundColor(.white)
                                .padding(8)
                                .background(Color.blue.opacity(0.7))
                                .cornerRadius(8)
                        }

                        Button(action: {
                            manager.exploreCurrentLocation()
                        }) {
                            Image(systemName: "map.fill")
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

            // Game Over Overlay
            if manager.isGameOver {
                CemeteryGameOverView(manager: manager)
            }

            // Victory Overlay
            if manager.isVictory {
                CemeteryVictoryView(manager: manager)
            }
        }
        .sheet(isPresented: $showInventory) {
            CemeteryInventoryView()
                .environmentObject(manager)
        }
        .sheet(isPresented: $showDiary) {
            CemeteryDiaryView()
                .environmentObject(manager)
        }
        .sheet(isPresented: $showObjectives) {
            CemeteryObjectiveView()
                .environmentObject(manager)
        }
        .sheet(isPresented: $showSettings) {
            CemeterySettingsView()
                .environmentObject(manager)
        }
        .sheet(isPresented: $showEvidence) {
            CemeteryEvidenceView()
                .environmentObject(manager)
        }
        .sheet(isPresented: $showMap) {
            CemeteryMapView()
                .environmentObject(manager)
        }
        .preferredColorScheme(.dark)
        .onAppear {
            manager.setupScene()
        }
    }
}

// MARK: - Game Over View

struct CemeteryGameOverView: View {
    @ObservedObject var manager: CemeteryGameManager
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

                Text("You have been consumed by the darkness")
                    .font(.title3)
                    .foregroundColor(.white)

                VStack(alignment: .leading, spacing: 8) {
                    StatRow(label: "Final Score", value: "\(manager.score)")
                    StatRow(label: "Evidence Collected", value: "\(manager.discoveredEvidence.count)")
                    StatRow(label: "Photos Taken", value: "\(manager.photosTaken)")
                    StatRow(label: "Locations Explored", value: "\(manager.locations.filter { $0.isExplored }.count)")
                    StatRow(label: "Ghosts Encountered", value: "\(manager.ghosts.count)")
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

// MARK: - Victory View

struct CemeteryVictoryView: View {
    @ObservedObject var manager: CemeteryGameManager
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.85)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Text("🎉")
                    .font(.system(size: 80))
                    .scaleEffect(isAnimating ? 1.3 : 1.0)
                    .animation(
                        Animation.spring(response: 0.6, dampingFraction: 0.6)
                            .repeatForever(autoreverses: true),
                        value: isAnimating
                    )

                Text("VICTORY!")
                    .font(.system(size: 50, weight: .black))
                    .foregroundColor(.yellow)

                Text("You have conquered the cemetery!")
                    .font(.title3)
                    .foregroundColor(.white)

                VStack(alignment: .leading, spacing: 8) {
                    StatRow(label: "Final Score", value: "\(manager.score)")
                    StatRow(label: "Evidence Collected", value: "\(manager.discoveredEvidence.count)")
                    StatRow(label: "Photos Taken", value: "\(manager.photosTaken)")
                    StatRow(label: "Locations Explored", value: "\(manager.locations.filter { $0.isExplored }.count)")
                    StatRow(label: "Ghosts Identified", value: "\(manager.discoveredEvidence.count)")
                }
                .padding()
                .background(Color.white.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)

                HStack(spacing: 20) {
                    Button(action: {
                        manager.resetGame()
                    }) {
                        Text("Play Again")
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

struct CemeteryInventoryView: View {
    @EnvironmentObject var manager: CemeteryGameManager
    @Environment(\.dismiss) var dismiss
    @State private var selectedItem: InventoryItem?

    var body: some View {
        NavigationView {
            VStack {
                // Player Stats
                HStack {
                    VStack(alignment: .leading) {
                        Text("Inventory")
                            .font(.headline)
                        Text("Items: \(manager.player.inventory.count)")
                            .font(.caption)
                        Text("CemeteryEquipment: \(manager.player.equipment.count)")
                            .font(.caption)
                    }
                    Spacer()
                    VStack(alignment: .trailing) {
                        Text("❤️ \(Int(manager.player.health))/\(Int(manager.player.maxHealth))")
                            .foregroundColor(.red)
                        Text("🧠 \(Int(manager.player.sanity))/\(Int(manager.player.maxSanity))")
                            .foregroundColor(.blue)
                        Text("💰 \(manager.score)")
                            .foregroundColor(.yellow)
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
                                Text(item.name)
                                    .font(.caption)
                                    .lineLimit(1)
                                Text("x\(item.quantity)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
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
                    message: Text("Quantity: \(item.quantity)\nType: \(String(describing: item.type))"),
                    primaryButton: .default(Text("Use")) {
                        manager.useInventoryItem(item)
                    },
                    secondaryButton: .default(Text("Drop")) {
                        if item.quantity > 1 {
                            if let index = manager.player.inventory.firstIndex(where: { $0.id == item.id }) {
                                manager.player.inventory[index].quantity -= 1
                            }
                        } else {
                            if let index = manager.player.inventory.firstIndex(where: { $0.id == item.id }) {
                                manager.player.inventory.remove(at: index)
                            }
                        }
                    }
                )
            }
        }
    }
}

// MARK: - Diary View

struct CemeteryDiaryView: View {
    @EnvironmentObject var manager: CemeteryGameManager
    @Environment(\.dismiss) var dismiss
    @State private var selectedEntry: DiaryEntry?

    var body: some View {
        NavigationView {
            List {
                ForEach(manager.diaryEntries) { entry in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(entry.title)
                                .font(.headline)
                            Spacer()
                            if entry.isImportant {
                                Text("⭐")
                                    .font(.caption)
                            }
                            Text(entry.date, style: .date)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Text(entry.content)
                            .font(.caption)
                            .lineLimit(2)
                            .foregroundColor(.secondary)
                        Text("📍 \(entry.location)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                    .onTapGesture {
                        selectedEntry = entry
                    }
                }
            }
            .navigationTitle("📖 Diary")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .alert(item: $selectedEntry) { entry in
                Alert(
                    title: Text(entry.title),
                    message: Text("\(entry.content)\n\n📍 \(entry.location)\n📅 \(entry.date, style: .date)\n😌 Mood: \(entry.mood)"),
                    dismissButton: .default(Text("Close"))
                )
            }
        }
    }
}

// MARK: - Objective View

struct CemeteryObjectiveView: View {
    @EnvironmentObject var manager: CemeteryGameManager
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            List {
                ForEach(manager.player.objectives) { objective in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: objective.isCompleted ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(objective.isCompleted ? .green : .gray)
                            Text(objective.name)
                                .font(.headline)
                            Spacer()
                            Text(objective.isCompleted ? "✅ Complete" : "\(Int(objective.progress * 100))%")
                                .font(.caption)
                                .foregroundColor(objective.isCompleted ? .green : .orange)
                        }

                        Text(objective.description)
                            .font(.caption)
                            .foregroundColor(.secondary)

                        if !objective.isCompleted {
                            ProgressView(value: Double(objective.progress), total: 1.0)
                                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                        }

                        Text("Reward: \(objective.reward)")
                            .font(.caption2)
                            .foregroundColor(.yellow)
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("🎯 Objectives")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Evidence View

struct CemeteryEvidenceView: View {
    @EnvironmentObject var manager: CemeteryGameManager
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Collected Evidence")) {
                    if manager.discoveredEvidence.isEmpty {
                        Text("No evidence collected yet")
                            .foregroundColor(.secondary)
                            .italic()
                    } else {
                        ForEach(Array(manager.discoveredEvidence), id: \.self) { evidence in
                            HStack {
                                Text(evidence.rawValue)
                                Spacer()
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            }
                        }
                    }
                }

                Section(header: Text("All Evidence Types")) {
                    ForEach(GhostEvidence.allCases, id: \.self) { evidence in
                        HStack {
                            Text(evidence.rawValue)
                            Spacer()
                            if manager.discoveredEvidence.contains(evidence) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Image(systemName: "questionmark.circle.fill")
                                    .foregroundColor(.gray)
                            }
                        }
                        .foregroundColor(manager.discoveredEvidence.contains(evidence) ? .primary : .secondary)
                    }
                }

                Section(header: Text("Ghost Identification")) {
                    if manager.discoveredEvidence.count >= 3 {
                        Text("✅ You have enough evidence to identify the ghost!")
                            .foregroundColor(.green)
                    } else {
                        Text("❌ Need \(3 - manager.discoveredEvidence.count) more pieces of evidence")
                            .foregroundColor(.orange)
                    }
                }
            }
            .navigationTitle("🔍 Evidence")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Map View

struct CemeteryMapView: View {
    @EnvironmentObject var manager: CemeteryGameManager
    @Environment(\.dismiss) var dismiss
    @State private var selectedLocation: CemeteryLocation?

    var body: some View {
        NavigationView {
            List {
                ForEach(manager.locations) { location in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(location.name)
                                .font(.headline)
                            Spacer()
                            if location.isExplored {
                                Text("✅ Explored")
                                    .font(.caption)
                                    .foregroundColor(.green)
                            } else {
                                Text("❌ Unexplored")
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }

                        Text(location.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(2)

                        HStack {
                            Text("👻 Activity: \(Int(location.ghostActivity * 100))%")
                                .font(.caption2)
                            Text("🌡️ \(Int(location.temperature))°C")
                                .font(.caption2)
                            Text("📦 \(location.items.count) items")
                                .font(.caption2)
                        }
                        .foregroundColor(.secondary)

                        if !location.isExplored {
                            Button(action: {
                                selectedLocation = location
                            }) {
                                Text("Explore")
                                    .font(.caption)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 4)
                                    .background(Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(8)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("🗺️ Map")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .alert(item: $selectedLocation) { location in
                Alert(
                    title: Text("Explore \(location.name)"),
                    message: Text("Are you sure you want to explore this location?\nDanger Level: \(Int(location.dangerLevel * 100))%"),
                    primaryButton: .default(Text("Explore")) {
                        manager.exploreCurrentLocation()
                    },
                    secondaryButton: .cancel()
                )
            }
        }
    }
}

// MARK: - Settings View

struct CemeterySettingsView: View {
    @EnvironmentObject var manager: CemeteryGameManager
    @Environment(\.dismiss) var dismiss
    @ObservedObject private var music = SpookyMusic.shared
    @State private var showResetConfirmation = false
    @State private var showSaveConfirmation = false
    @State private var showLoadConfirmation = false

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("👻 Game Settings")) {
                    Toggle("Night Mode", isOn: $manager.isNightMode)
                    Toggle("Sanity Drain", isOn: $manager.isSanityDrainEnabled)
                    Toggle("Ghost Spawning", isOn: $manager.isGhostSpawnEnabled)
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
                        ForEach(Difficulty.allCases, id: \.self) { difficulty in
                            Text(difficulty.rawValue).tag(difficulty)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }

                Section(header: Text("📊 Statistics")) {
                    StatRow(label: "Total Score", value: "\(manager.score)")
                    StatRow(label: "Ghosts Encountered", value: "\(manager.ghosts.count)")
                    StatRow(label: "Evidence Collected", value: "\(manager.discoveredEvidence.count)")
                    StatRow(label: "Photos Taken", value: "\(manager.photosTaken)")
                    StatRow(label: "Locations Explored", value: "\(manager.locations.filter { $0.isExplored }.count)")
                    StatRow(label: "Inventory Items", value: "\(manager.player.inventory.count)")
                    StatRow(label: "CemeteryEquipment", value: "\(manager.player.equipment.count)")
                    StatRow(label: "Diary Entries", value: "\(manager.diaryEntries.count)")
                    StatRow(label: "Objectives Complete", value: "\(manager.player.completedObjectives.count)")
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
                    Text("Tap on objects to interact")
                    Text("Swipe to look around")
                    Text("Pinch to zoom")
                    Text("Use equipment from hotbar")
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
                        Text("4.0.0")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Cemetery of Shadows")
                        Spacer()
                        Text("👻")
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

// ============================================================
// MARK: - 5. PREVIEW PROVIDER
// ============================================================

#Preview {
    CemeteryOfShadowsView()
}
