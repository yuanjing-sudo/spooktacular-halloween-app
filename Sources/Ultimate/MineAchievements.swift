//
//  MineAchievements.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  60 mine achievements across 6 houses (Delver, Tycoon, Angler, Socialite,
//  Survivor-ish Explorer, Prestige). Poll-based: refresh(manager:) reads
//  live state, so zero hooks were needed. Claim pays gold + XP.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Achievement model (60)
// ============================================================

/// One achievement: poll closure over the manager, reward on claim.
struct MineAchievement: Identifiable {
    let id: String
    var house: String
    var title: String
    var detail: String
    var icon: String
    var rewardGold: Int
    var rewardXP: Int
    var check: (MineManager) -> Bool
    var progress: (MineManager) -> (Int, Int) // have, need (need 0 = hidden)
}

enum MineAchievementCatalog {
    static var all: [MineAchievement] = [
        // ⛏️ House Delver (digging volume + depth).
        MineAchievement(id: "d-break-50", house: "Delver", title: "Rockbreaker", detail: "Break 50 blocks.", icon: "🧱", rewardGold: 100, rewardXP: 60,
                        check: { $0.player.blocksMined >= 50 }, progress: { (min($0.player.blocksMined, 50), 50) }),
        MineAchievement(id: "d-break-500", house: "Delver", title: "Quarryheart", detail: "Break 500 blocks.", icon: "🏗️", rewardGold: 800, rewardXP: 500,
                        check: { $0.player.blocksMined >= 500 }, progress: { (min($0.player.blocksMined, 500), 500) }),
        MineAchievement(id: "d-break-2500", house: "Delver", title: "Mountain Eater", detail: "Break 2,500 blocks.", icon: "⛰️", rewardGold: 2500, rewardXP: 1500,
                        check: { $0.player.blocksMined >= 2500 }, progress: { (min($0.player.blocksMined, 2500), 2500) }),
        MineAchievement(id: "d-break-10000", house: "Delver", title: "Geological Event", detail: "Break 10,000 blocks.", icon: "🌋", rewardGold: 8000, rewardXP: 5000,
                        check: { $0.player.blocksMined >= 10000 }, progress: { (min($0.player.blocksMined, 10000), 10000) }),
        MineAchievement(id: "d-magma", house: "Delver", title: "Core Touched", detail: "Reach the Magma Core.", icon: "🔥", rewardGold: 600, rewardXP: 400,
                        check: { $0.player.deepestY <= -4.5 }, progress: { ($0.player.deepestY <= -4.5 ? 1 : 0, 1) }),
        MineAchievement(id: "d-sectors-5", house: "Delver", title: "Wayfinder", detail: "Map 5 sectors.", icon: "🧭", rewardGold: 500, rewardXP: 300,
                        check: { $0.player.sectorsFound.count >= 5 }, progress: { (min($0.player.sectorsFound.count, 5), 5) }),
        MineAchievement(id: "d-sectors-9", house: "Delver", title: "Omnipresent", detail: "Map all 9 sectors.", icon: "🗺️", rewardGold: 1200, rewardXP: 800,
                        check: { $0.player.sectorsFound.count >= 9 }, progress: { (min($0.player.sectorsFound.count, 9), 9) }),
        MineAchievement(id: "d-caves-3", house: "Delver", title: "Spelunker", detail: "Harvest 3 crystal caves.", icon: "🔮", rewardGold: 700, rewardXP: 450,
                        check: { $0.mineCaves.filter({ $0.harvested }).count >= 3 }, progress: { (min($0.mineCaves.filter({ $0.harvested }).count, 3), 3) }),
        MineAchievement(id: "d-frost-3", house: "Delver", title: "Icebreaker", detail: "Harvest 3 frost pockets.", icon: "❄️", rewardGold: 600, rewardXP: 400,
                        check: { $0.mineFrost.filter({ $0.harvested }).count >= 3 }, progress: { (min($0.mineFrost.filter({ $0.harvested }).count, 3), 3) }),
        MineAchievement(id: "d-closets-10", house: "Delver", title: "Nosy", detail: "Open 10 closets.", icon: "🚪", rewardGold: 400, rewardXP: 250,
                        check: { $0.mineClosets.filter({ $0.isOpened }).count >= 10 }, progress: { (min($0.mineClosets.filter({ $0.isOpened }).count, 10), 10) }),
        MineAchievement(id: "d-lava-proof", house: "Delver", title: "Lava Proof", detail: "Stand where lava lives (y −5.2).", icon: "🌋", rewardGold: 700, rewardXP: 450,
                        check: { $0.player.deepestY <= -5.2 }, progress: { ($0.player.deepestY <= -5.2 ? 1 : 0, 1) }),
        // 💰 House Tycoon (wealth + upgrades).
        MineAchievement(id: "t-gold-1k", house: "Tycoon", title: "First Thousand", detail: "Hold 1,000 gold.", icon: "💰", rewardGold: 200, rewardXP: 120,
                        check: { $0.player.gold >= 1000 }, progress: { ($0.player.gold >= 1000 ? 1 : 0, 1) }),
        MineAchievement(id: "t-gold-25k", house: "Tycoon", title: "Vault Dweller", detail: "Hold 25,000 gold.", icon: "🏦", rewardGold: 1500, rewardXP: 900,
                        check: { $0.player.gold >= 25000 }, progress: { ($0.player.gold >= 25000 ? 1 : 0, 1) }),
        MineAchievement(id: "t-gold-250k", house: "Tycoon", title: "Dragon Hoard", detail: "Hold 250,000 gold.", icon: "🐉", rewardGold: 6000, rewardXP: 3000,
                        check: { $0.player.gold >= 250000 }, progress: { ($0.player.gold >= 250000 ? 1 : 0, 1) }),
        MineAchievement(id: "t-sell-10k", house: "Tycoon", title: "Merchant Prince", detail: "Best single sale over 10,000.", icon: "🧾", rewardGold: 1200, rewardXP: 700,
                        check: { $0.bestSale >= 10000 }, progress: { ($0.bestSale >= 10000 ? 1 : 0, 1) }),
        MineAchievement(id: "t-pick-diamond", house: "Tycoon", title: "Diamond Standard", detail: "Own a Diamond pick or better.", icon: "💎⛏️", rewardGold: 800, rewardXP: 500,
                        check: { $0.player.pickTier.rawValue >= MNPickTier.diamond.rawValue }, progress: { ($0.player.pickTier.rawValue >= MNPickTier.diamond.rawValue ? 1 : 0, 1) }),
        MineAchievement(id: "t-pick-drill", house: "Tycoon", title: "Maximum Spin", detail: "Own the Void Drill.", icon: "🌀⛏️", rewardGold: 2000, rewardXP: 1200,
                        check: { $0.player.pickTier == .drill }, progress: { ($0.player.pickTier == .drill ? 1 : 0, 1) }),
        MineAchievement(id: "t-pack-3", house: "Tycoon", title: "Pack Rat King", detail: "Backpack tier 3+.", icon: "🎒", rewardGold: 700, rewardXP: 400,
                        check: { $0.player.backpackTier >= 3 }, progress: { (min($0.player.backpackTier, 3), 3) }),
        MineAchievement(id: "t-rod-3", house: "Tycoon", title: "Master Angler Gear", detail: "Own the Warden's Rod.", icon: "🎣", rewardGold: 900, rewardXP: 500,
                        check: { $0.rodTier >= 3 }, progress: { (min($0.rodTier, 3), 3) }),
        MineAchievement(id: "t-pets-3", house: "Tycoon", title: "Full Crew", detail: "Hatch 3 pets.", icon: "🐾", rewardGold: 600, rewardXP: 400,
                        check: { $0.player.pets.count >= 3 }, progress: { (min($0.player.pets.count, 3), 3) }),
        MineAchievement(id: "t-merchant-5", house: "Tycoon", title: "Regular Customer", detail: "Buy from the merchant 5 times.", icon: "🧳", rewardGold: 500, rewardXP: 300,
                        check: { $0.merchantDeals >= 5 }, progress: { (min($0.merchantDeals, 5), 5) }),
        MineAchievement(id: "t-pack-5", house: "Tycoon", title: "Freight Emperor", detail: "Backpack tier 5.", icon: "🚂", rewardGold: 1400, rewardXP: 800,
                        check: { $0.player.backpackTier >= 5 }, progress: { (min($0.player.backpackTier, 5), 5) }),
        // 🎣 House Angler (fishing).
        MineAchievement(id: "a-first-catch", house: "Angler", title: "First Splash", detail: "Catch any fish.", icon: "🐟", rewardGold: 120, rewardXP: 80,
                        check: { $0.fishCaught.values.reduce(0, +) >= 1 }, progress: { (min($0.fishCaught.values.reduce(0, +), 1), 1) }),
        MineAchievement(id: "a-ten-fish", house: "Angler", title: "Creel Filler", detail: "Catch 10 fish lifetime.", icon: "🧺", rewardGold: 350, rewardXP: 220,
                        check: { $0.fishCaught.values.reduce(0, +) >= 10 }, progress: { (min($0.fishCaught.values.reduce(0, +), 10), 10) }),
        MineAchievement(id: "a-fifty-fish", house: "Angler", title: "Lake Legend", detail: "Catch 50 fish lifetime.", icon: "🏆", rewardGold: 1200, rewardXP: 800,
                        check: { $0.fishCaught.values.reduce(0, +) >= 50 }, progress: { (min($0.fishCaught.values.reduce(0, +), 50), 50) }),
        MineAchievement(id: "a-rare-fish", house: "Angler", title: "Something Glints", detail: "Catch a Rare+ fish.", icon: "✨", rewardGold: 400, rewardXP: 250,
                        check: { $0.fishCaught.keys.contains(where: { MNFishGuide.all.first(where: { f in f.name == $0 })?.rarity != "Common" }) }, progress: { (0, 0) }),
        MineAchievement(id: "a-magma-fish", house: "Angler", title: "Hot Catch", detail: "Catch any magma fish.", icon: "🔥", rewardGold: 450, rewardXP: 300,
                        check: { $0.fishCaught.keys.contains(where: { MNFishGuide.all.first(where: { f in f.name == $0 })?.water == "Magma" }) }, progress: { (0, 0) }),
        MineAchievement(id: "a-legend-fish", house: "Angler", title: "Myth Angler", detail: "Catch a Legendary fish.", icon: "🐉", rewardGold: 1500, rewardXP: 1000,
                        check: { $0.fishCaught.keys.contains(where: { MNFishGuide.all.first(where: { f in f.name == $0 })?.rarity == "Legendary" }) }, progress: { (0, 0) }),
        MineAchievement(id: "a-all-fresh", house: "Angler", title: "Freshwater Master", detail: "Catch all 7 freshwater species.", icon: "🌊", rewardGold: 1000, rewardXP: 700,
                        check: { m in MNFishGuide.all.filter({ $0.water == "Fresh" }).allSatisfy({ m.fishCaught[$0.name, default: 0] > 0 }) }, progress: { (0, 0) }),
        MineAchievement(id: "a-all-magma", house: "Angler", title: "Magma Master", detail: "Catch all 7 magma species.", icon: "🌋", rewardGold: 1400, rewardXP: 900,
                        check: { m in MNFishGuide.all.filter({ $0.water == "Magma" }).allSatisfy({ m.fishCaught[$0.name, default: 0] > 0 }) }, progress: { (0, 0) }),
        MineAchievement(id: "a-fish-market", house: "Angler", title: "Fishmonger", detail: "Sell one haul for 500+.", icon: "⚖️", rewardGold: 300, rewardXP: 200,
                        check: { $0.fishMarketBest >= 500 }, progress: { (0, 0) }),
        // 📦 House Socialite (friends + visitors).
        MineAchievement(id: "s-first-friend", house: "Socialite", title: "Hello, Cube", detail: "Greet a boxy critter.", icon: "📦", rewardGold: 150, rewardXP: 100,
                        check: { $0.critters.contains(where: { $0.greeted }) }, progress: { ($0.critters.contains(where: { $0.greeted }) ? 1 : 0, 1) }),
        MineAchievement(id: "s-five-friends", house: "Socialite", title: "Popular", detail: "Greet 5 critters.", icon: "🎉", rewardGold: 600, rewardXP: 400,
                        check: { $0.critters.filter({ $0.greeted }).count >= 5 }, progress: { (min($0.critters.filter({ $0.greeted }).count, 5), 5) }),
        MineAchievement(id: "s-pet-hatch", house: "Socialite", title: "New Arrival", detail: "Hatch a pet.", icon: "🥚", rewardGold: 250, rewardXP: 150,
                        check: { !$0.player.pets.isEmpty }, progress: { ($0.player.pets.isEmpty ? 0 : 1, 1) }),
        MineAchievement(id: "s-pet-6", house: "Socialite", title: "Zoo Director", detail: "Hatch 6 pets.", icon: "🎪", rewardGold: 900, rewardXP: 600,
                        check: { $0.player.pets.count >= 6 }, progress: { (min($0.player.pets.count, 6), 6) }),
        MineAchievement(id: "s-merchant-meet", house: "Socialite", title: "Sharp Dresser", detail: "Buy from the traveling merchant.", icon: "🧳", rewardGold: 200, rewardXP: 120,
                        check: { $0.merchantDeals >= 1 }, progress: { (min($0.merchantDeals, 1), 1) }),
        MineAchievement(id: "s-ghost-wave", house: "Socialite", title: "Parade Marshal", detail: "See 5+ events.", icon: "👻", rewardGold: 450, rewardXP: 300,
                        check: { $0.eventsSeen >= 5 }, progress: { (min($0.eventsSeen, 5), 5) }),
        MineAchievement(id: "s-bat-friend", house: "Socialite", title: "Bat Whisperer", detail: "Repel 5 bats.", icon: "🦇", rewardGold: 350, rewardXP: 220,
                        check: { $0.player.batsRepelled >= 5 }, progress: { (min($0.player.batsRepelled, 5), 5) }),
        MineAchievement(id: "s-monster-10", house: "Socialite", title: "Bouncer", detail: "Slay 10 monsters.", icon: "⚔️", rewardGold: 400, rewardXP: 250,
                        check: { $0.player.monstersSlain >= 10 }, progress: { (min($0.player.monstersSlain, 10), 10) }),
        // 🗺️ House Explorer (relics, seals, lures).
        MineAchievement(id: "e-first-relic", house: "Explorer", title: "Charm School", detail: "Own any relic.", icon: "🗿", rewardGold: 300, rewardXP: 200,
                        check: { !$0.relics.isEmpty }, progress: { ($0.relics.isEmpty ? 0 : 1, 1) }),
        MineAchievement(id: "e-relics-6", house: "Explorer", title: "Curio Cabinet", detail: "Own 6 relics.", icon: "🏛️", rewardGold: 1000, rewardXP: 700,
                        check: { $0.relics.count >= 6 }, progress: { (min($0.relics.count, 6), 6) }),
        MineAchievement(id: "e-relics-all", house: "Explorer", title: "Completionist", detail: "Own all 12 relics.", icon: "👑", rewardGold: 3000, rewardXP: 2000,
                        check: { $0.relics.count >= MNRelicCatalog.all.count }, progress: { (min($0.relics.count, MNRelicCatalog.all.count), MNRelicCatalog.all.count) }),
        MineAchievement(id: "e-first-seal", house: "Explorer", title: "Lockpick", detail: "Break a cave seal.", icon: "🔓", rewardGold: 350, rewardXP: 220,
                        check: { $0.mineCaves.contains(where: { !$0.isLocked && !$0.unlockCost.isEmpty }) }, progress: { (0, 0) }),
        MineAchievement(id: "e-seals-5", house: "Explorer", title: "Master of Keys", detail: "Break 5 seals.", icon: "🗝️", rewardGold: 1100, rewardXP: 750,
                        check: { $0.mineCaves.filter({ !$0.isLocked && !$0.unlockCost.isEmpty }).count >= 5 }, progress: { (min($0.mineCaves.filter({ !$0.isLocked && !$0.unlockCost.isEmpty }).count, 5), 5) }),
        MineAchievement(id: "e-frost-all", house: "Explorer", title: "Winter Count", detail: "Harvest all 5 frost pockets.", icon: "❄️", rewardGold: 900, rewardXP: 600,
                        check: { $0.mineFrost.filter({ $0.harvested }).count >= 5 }, progress: { (min($0.mineFrost.filter({ $0.harvested }).count, 5), 5) }),
        MineAchievement(id: "e-bombs-10", house: "Explorer", title: "Powder Monkey", detail: "Mine 400 blocks (bomb fuel).", icon: "🧨", rewardGold: 450, rewardXP: 300,
                        check: { $0.player.blocksMined >= 400 }, progress: { (min($0.player.blocksMined, 400), 400) }),
        MineAchievement(id: "e-pack-5", house: "Explorer", title: "Freight Train", detail: "Backpack tier 5.", icon: "🚂", rewardGold: 1100, rewardXP: 700,
                        check: { $0.player.backpackTier >= 5 }, progress: { (min($0.player.backpackTier, 5), 5) }),
        MineAchievement(id: "e-spin", house: "Explorer", title: "Wheel Watcher", detail: "Spin the daily wheel.", icon: "🎡", rewardGold: 150, rewardXP: 100,
                        check: { !SpookyStore.string("mineLastSpinDay.v1", default: "").isEmpty }, progress: { (0, 0) }),
        MineAchievement(id: "e-streak-7", house: "Explorer", title: "Weekling", detail: "7-day login streak.", icon: "🔥", rewardGold: 800, rewardXP: 500,
                        check: { SpookyStore.int("loginStreak.count", default: 0) >= 7 }, progress: { (0, 0) }),
        // 💫 House Prestige (rebirth + ranks).
        MineAchievement(id: "p-rank-10", house: "Prestige", title: "Double Digits", detail: "Reach rank 10.", icon: "🔟", rewardGold: 400, rewardXP: 0,
                        check: { $0.player.level >= 10 }, progress: { (min($0.player.level, 10), 10) }),
        MineAchievement(id: "p-rank-15", house: "Prestige", title: "Rebirth Ready", detail: "Reach rank 15.", icon: "🎓", rewardGold: 700, rewardXP: 0,
                        check: { $0.player.level >= 15 }, progress: { (min($0.player.level, 15), 15) }),
        MineAchievement(id: "p-rank-25", house: "Prestige", title: "Living Monument", detail: "Reach rank 25.", icon: "🗿", rewardGold: 1500, rewardXP: 0,
                        check: { $0.player.level >= 25 }, progress: { (min($0.player.level, 25), 25) }),
        MineAchievement(id: "p-rebirth-1", house: "Prestige", title: "Second Life", detail: "Rebirth once.", icon: "💫", rewardGold: 0, rewardXP: 800,
                        check: { $0.player.rebirths >= 1 }, progress: { (min($0.player.rebirths, 1), 1) }),
        MineAchievement(id: "p-rebirth-3", house: "Prestige", title: "Serial Rebirther", detail: "Rebirth 3 times.", icon: "♾️", rewardGold: 0, rewardXP: 2000,
                        check: { $0.player.rebirths >= 3 }, progress: { (min($0.player.rebirths, 3), 3) }),
        MineAchievement(id: "p-rebirth-5", house: "Prestige", title: "Eternal Return", detail: "Rebirth 5 times.", icon: "☯️", rewardGold: 0, rewardXP: 5000,
                        check: { $0.player.rebirths >= 5 }, progress: { (min($0.player.rebirths, 5), 5) }),
        MineAchievement(id: "p-drill-magma", house: "Prestige", title: "Core Diver", detail: "Own the drill AND touch magma.", icon: "🌋", rewardGold: 1800, rewardXP: 1200,
                        check: { $0.player.pickTier == .drill && $0.player.deepestY <= -4.5 }, progress: { (0, 0) }),
        MineAchievement(id: "p-legend-pet", house: "Prestige", title: "Dragon Rumor True", detail: "Hatch a Legendary pet.", icon: "🐉", rewardGold: 1200, rewardXP: 800,
                        check: { $0.player.pets.contains(where: { $0.rarity == "Legendary" }) }, progress: { (0, 0) }),
        MineAchievement(id: "p-100k-xp", house: "Prestige", title: "XP Titan Jr.", detail: "Earn 100,000 XP lifetime (quest-tracked).", icon: "🌟", rewardGold: 2500, rewardXP: 0,
                        check: { $0.questBoard.lifetimeXP >= 100000 }, progress: { (min($0.questBoard.lifetimeXP, 100000), 100000) }),
        MineAchievement(id: "p-all-sectors-gold", house: "Prestige", title: "Gilded Atlas", detail: "Map all sectors with 10,000+ gold held.", icon: "🗺️", rewardGold: 2000, rewardXP: 1200,
                        check: { $0.player.sectorsFound.count >= 9 && $0.player.gold >= 10000 }, progress: { (0, 0) }),
        MineAchievement(id: "p-millionaire", house: "Prestige", title: "Millionaire", detail: "Hold 1,000,000 gold.", icon: "💎", rewardGold: 8000, rewardXP: 4000,
                        check: { $0.player.gold >= 1000000 }, progress: { ($0.player.gold >= 1000000 ? 1 : 0, 1) }),
    ]

    static var houses: [String] {
        ["Delver", "Tycoon", "Angler", "Socialite", "Explorer", "Prestige"]
    }
}

// ============================================================
// MARK: - 2. Board (poll + claim, persisted)
// ============================================================

/// Achievement board: refresh(manager) recomputes unlocks from live
/// state (no hooks). Claims pay through onReward. Persisted.
final class MineAchievementBoard: ObservableObject {
    @Published private(set) var unlocked: Set<String> = []
    @Published private(set) var claimed: Set<String> = []

    var onReward: ((Int, Int) -> Void)?

    private let unlockedKey = "mineAchUnlocked.v1"
    private let claimedKey = "mineAchClaimed.v1"

    init() {
        unlocked = Set(UserDefaults.standard.stringArray(forKey: unlockedKey) ?? [])
        claimed = Set(UserDefaults.standard.stringArray(forKey: claimedKey) ?? [])
    }

    /// Poll live state; returns newly unlocked quests this pass.
    @discardableResult
    func refresh(manager: MineManager) -> [MineAchievement] {
        var fresh: [MineAchievement] = []
        for ach in MineAchievementCatalog.all where !unlocked.contains(ach.id) {
            if ach.check(manager) {
                unlocked.insert(ach.id)
                fresh.append(ach)
            }
        }
        if !fresh.isEmpty {
            save()
        }
        return fresh
    }

    var claimable: [MineAchievement] {
        MineAchievementCatalog.all.filter({ unlocked.contains($0.id) && !claimed.contains($0.id) })
    }

    @discardableResult
    func claim(_ ach: MineAchievement) -> Bool {
        guard unlocked.contains(ach.id), !claimed.contains(ach.id) else { return false }
        claimed.insert(ach.id)
        onReward?(ach.rewardGold, ach.rewardXP)
        save()
        return true
    }

    var doneCount: Int { unlocked.count }
    var totalCount: Int { MineAchievementCatalog.all.count }

    private func save() {
        UserDefaults.standard.set(Array(unlocked), forKey: unlockedKey)
        UserDefaults.standard.set(Array(claimed), forKey: claimedKey)
    }

    func resetAll() {
        unlocked = []
        claimed = []
        save()
    }
}

// ============================================================
// MARK: - 3. Achievements view
// ============================================================

/// Achievements sheet: houses with progress, claim buttons, refresh.
struct MineAchievementsView: View {
    @ObservedObject var manager: MineManager
    @ObservedObject var board: MineAchievementBoard
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🏆 Trophy room (\(board.doneCount)/\(board.totalCount))")) {
                    Text("Achievements unlock live as you play — open this page to collect. Unclaimed rewards never expire.")
                        .font(.caption).foregroundStyle(.secondary)
                    if !board.claimable.isEmpty {
                        Button("Claim all (\(board.claimable.count))") {
                            for ach in board.claimable {
                                _ = board.claim(ach)
                            }
                            SpookyHaptics.play(.reward)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                        .tint(.green)
                    }
                }
                ForEach(MineAchievementCatalog.houses, id: \.self) { house in
                    let items = MineAchievementCatalog.all.filter({ $0.house == house })
                    let done = items.filter({ board.unlocked.contains($0.id) }).count
                    Section(header: Text("\(houseIcon(house)) House \(house) (\(done)/\(items.count))")) {
                        ForEach(items) { ach in
                            achievementRow(ach)
                        }
                    }
                }
            }
            .navigationTitle("Achievements")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear {
                let fresh = board.refresh(manager: manager)
                if !fresh.isEmpty {
                    manager.notify("🏆 \(fresh.count) achievement\(fresh.count == 1 ? "" : "s") unlocked! Open Achievements to claim.")
                    SpookyHaptics.play(.reward)
                }
            }
        }
    }

    private func houseIcon(_ house: String) -> String {
        switch house {
        case "Delver": return "⛏️"
        case "Tycoon": return "💰"
        case "Angler": return "🎣"
        case "Socialite": return "📦"
        case "Explorer": return "🗺️"
        default: return "💫"
        }
    }

    private func achievementRow(_ ach: MineAchievement) -> some View {
        let isOpen = board.unlocked.contains(ach.id)
        let isClaimed = board.claimed.contains(ach.id)
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(ach.icon).font(.title2)
                    .opacity(isOpen ? 1 : 0.35)
                    .saturation(isOpen ? 1 : 0)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ach.title).font(.subheadline.bold())
                    Text(ach.detail).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                if isClaimed {
                    Text("CLAIMED").font(.caption2.bold()).foregroundColor(.green)
                } else if isOpen {
                    Button("+\(ach.rewardGold)🪙") { _ = board.claim(ach) }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                        .tint(.green)
                } else {
                    let (have, need) = ach.progress(manager)
                    if need > 0 {
                        Text("\(min(have, need))/\(need)")
                            .font(.caption.bold()).foregroundColor(.secondary)
                            .monospacedDigit()
                    } else {
                        Image(systemName: "lock.fill").foregroundColor(.gray)
                    }
                }
            }
            if !isOpen {
                let (have, need) = ach.progress(manager)
                if need > 0 {
                    ProgressView(value: Double(have), total: Double(need))
                        .progressViewStyle(LinearProgressViewStyle(tint: .orange))
                }
            }
        }
        .padding(.vertical, 3)
    }
}
