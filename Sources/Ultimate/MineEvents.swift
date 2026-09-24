//
//  MineEvents.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Random mine events + traveling merchant: a scheduler fires flavored
//  happenings (ore surges, ghost parades, double-XP hours, cave-ins that
//  reveal loot) with real effects, and a merchant peddles bombs, bait and
//  relics. All friendly — events never harm, only surprise.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Event catalog (20 happenings)
// ============================================================

/// One random happening: id, presentation, duration, effect hook name.
struct MineEvent: Identifiable {
    let id = UUID()
    var key: String
    var title: String
    var detail: String
    var emoji: String
    var duration: Double // seconds the effect lasts (0 = instant)
}

enum MineEventCatalog {
    static var all: [MineEvent] = [
        MineEvent(key: "ore-surge", title: "Ore Surge!", detail: "The walls sweat extra richness. All ore value +50% for a minute.", emoji: "💎", duration: 60),
        MineEvent(key: "xp-hour", title: "Wisdom Hour!", detail: "Double XP for a minute. The mine is feeling pedagogical.", emoji: "📖", duration: 60),
        MineEvent(key: "ghost-parade", title: "Ghost Parade!", detail: "A procession drifts past, tossing gold to onlookers.", emoji: "👻", duration: 0),
        MineEvent(key: "cave-in", title: "Lucky Cave-In!", detail: "A wall slumps and exposes a cache of mixed ore right at your feet.", emoji: "🧱", duration: 0),
        MineEvent(key: "bat-swarm", title: "Bat Swarm!", detail: "Dozens of bats pour through. Harmless, deafening, hilarious.", emoji: "🦇", duration: 0),
        MineEvent(key: "mushroom-bloom", title: "Mushroom Bloom!", detail: "Glowing caps erupt everywhere. Pretty AND worth pocket change.", emoji: "🍄", duration: 0),
        MineEvent(key: "merchant", title: "Traveling Merchant!", detail: "A peddler rattles in with bombs, bait and a suspicious relic.", emoji: "🧳", duration: 0),
        MineEvent(key: "lucky-strike", title: "Lucky Strike!", detail: "Your next 10 swings hit 50% harder. The pick believes in itself.", emoji: "🍀", duration: 0),
        MineEvent(key: "backpack-blessing", title: "Backpack Blessing!", detail: "A saint of logistics expands your pack by 25 for ten minutes.", emoji: "🎒", duration: 600),
        MineEvent(key: "gold-rush", title: "Gold Rush!", detail: "Gold veins glow extra bright. Gold value doubled for a minute.", emoji: "🟨", duration: 60),
        MineEvent(key: "quiet-hour", title: "Quiet Hour!", detail: "Monsters nap. Bats snore. Mine in peace for two minutes.", emoji: "😴", duration: 120),
        MineEvent(key: "crystal-chorus", title: "Crystal Chorus!", detail: "Every cave hums in harmony. Crystal value +50% for a minute.", emoji: "🔮", duration: 60),
        MineEvent(key: "fossil-find", title: "Fossil Find!", detail: "You trip over museum-grade bones. Science pays finder's fees.", emoji: "🦴", duration: 0),
        MineEvent(key: "drill-sergeant", title: "Drill Sergeant!", detail: "A ghostly foreman inspects your swing. Mining speed +30% for a minute.", emoji: "🪖", duration: 60),
        MineEvent(key: "pet-party", title: "Pet Party!", detail: "Wild pets visit and share treats. Free XP, zero strings.", emoji: "🐾", duration: 0),
        MineEvent(key: "lamp-festival", title: "Lamp Festival!", detail: "Extra lanterns bloom along the tunnels. Everything glows. Morale doubles.", emoji: "🏮", duration: 0),
        MineEvent(key: "bomb-cache", title: "Bomb Cache!", detail: "Somebody stashed bombs behind a loose rock. Finders keepers.", emoji: "🧨", duration: 0),
        MineEvent(key: "rainbow-seam", title: "Rainbow Seam!", detail: "A prismatic vein crosses the tunnel. Every ore inside pays double.", emoji: "🌈", duration: 60),
        MineEvent(key: "wisp-convention", title: "Wisp Convention!", detail: "Seven wisps hold a conference and tip generously for the venue.", emoji: "✨", duration: 0),
        MineEvent(key: "jackpot-echo", title: "Jackpot Echo!", detail: "The mine repeats your last sale back at you. Cha-ching, twice.", emoji: "🔔", duration: 0),
    ]
}

// ============================================================
// MARK: - 2. Merchant stock
// ============================================================

/// One merchant offer.
struct MineMerchantOffer: Identifiable {
    let id = UUID()
    var name: String
    var emoji: String
    var detail: String
    var cost: Int
    var kind: String // bombs, bait, relic, pack
}

/// Traveling merchant: restocks per visit from fixed curiosities.
struct MineMerchant {
    /// Roll 3 offers scaled to progression.
    static func stock(playerGold: Int, ownedRelics: Int) -> [MineMerchantOffer] {
        var offers = [
            MineMerchantOffer(name: "Bomb bundle", emoji: "🧨", detail: "+3 bombs, no questions.", cost: max(60, playerGold / 12), kind: "bombs"),
            MineMerchantOffer(name: "Lucky bait", emoji: "🪱", detail: "Next 3 casts bite faster.", cost: max(40, playerGold / 20), kind: "bait"),
        ]
        if ownedRelics < MNRelicCatalog.all.count {
            offers.append(MineMerchantOffer(
                name: "Suspicious relic", emoji: "🗿",
                detail: "A random unearthed charm. Definitely not cursed. Probably.",
                cost: max(300, playerGold / 4), kind: "relic"
            ))
        }
        offers.append(MineMerchantOffer(
            name: "Snack hamper", emoji: "🧺",
            detail: "Restores health to full + a little XP.",
            cost: max(50, playerGold / 15), kind: "snack"
        ))
        return offers
    }
}

// ============================================================
// MARK: - 3. Event director (scheduler + active effects)
// ============================================================

/// Schedules random events, tracks timed buffs, owns merchant stock.
/// Tick it from the sim loop; effects read live through the manager.
final class MineEventDirector: ObservableObject {
    @Published private(set) var active: MineEvent?
    @Published private(set) var activeEndsAt = Date()
    @Published private(set) var merchantStock: [MineMerchantOffer] = []
    @Published private(set) var merchantOpen = false
    @Published private(set) var lastEventAt = Date.distantPast
    @Published var luckyBait: Int = 0

    private var cooldown: Double = 75
    private var surgeEndsAt = Date.distantPast
    private var xpEndsAt = Date.distantPast
    private var goldEndsAt = Date.distantPast
    private var crystalEndsAt = Date.distantPast
    private var rainbowEndsAt = Date.distantPast
    private var drillEndsAt = Date.distantPast
    private var packEndsAt = Date.distantPast
    private var quietEndsAt = Date.distantPast
    private var luckyEndsAt = Date.distantPast
    private var luckySwings = 0

    var oreMult: Double { Date() < surgeEndsAt ? 1.5 : 1.0 }
    var xpMult: Double { Date() < xpEndsAt ? 2.0 : 1.0 }
    var goldOreMult: Double { Date() < goldEndsAt ? 2.0 : 1.0 }
    var crystalMult: Double { Date() < crystalEndsAt ? 1.5 : 1.0 }
    var rainbowMult: Double { Date() < rainbowEndsAt ? 2.0 : 1.0 }
    var drillMult: Double { Date() < drillEndsAt ? 1.3 : 1.0 }
    var packBonus: Int { Date() < packEndsAt ? 25 : 0 }
    var monstersAsleep: Bool { Date() < quietEndsAt }
    var luckyActive: Bool { Date() < luckyEndsAt && luckySwings > 0 }

    /// Roll a random event (weighted uniform) and apply it.
    func fireRandom(on manager: MineManager) {
        guard let event = MineEventCatalog.all.randomElement() else { return }
        fire(event, on: manager)
    }

    /// Scheduled tick: fires when the cooldown lapses.
    func tick(dt: Double, on manager: MineManager) {
        cooldown -= dt
        if cooldown <= 0 {
            cooldown = Double.random(in: 90...180)
            fireRandom(on: manager)
        }
        if let active = active, Date() >= activeEndsAt, active.duration > 0 {
            self.active = nil
        }
    }

    func fire(_ event: MineEvent, on manager: MineManager) {
        manager.eventsSeen += 1
        let now = Date()
        switch event.key {
        case "ore-surge":
            surgeEndsAt = now.addingTimeInterval(event.duration)
        case "xp-hour":
            xpEndsAt = now.addingTimeInterval(event.duration)
        case "gold-rush":
            goldEndsAt = now.addingTimeInterval(event.duration)
        case "crystal-chorus":
            crystalEndsAt = now.addingTimeInterval(event.duration)
        case "rainbow-seam":
            rainbowEndsAt = now.addingTimeInterval(event.duration)
        case "drill-sergeant":
            drillEndsAt = now.addingTimeInterval(event.duration)
        case "backpack-blessing":
            packEndsAt = now.addingTimeInterval(event.duration)
        case "quiet-hour":
            quietEndsAt = now.addingTimeInterval(event.duration)
        case "lucky-strike":
            luckyEndsAt = now.addingTimeInterval(300)
            luckySwings = 10
        case "ghost-parade":
            manager.player.gold += Int(60 * manager.rebirthMult)
            manager.notify("\(event.emoji) \(event.title) The procession tosses +\(Int(60 * manager.rebirthMult))🪙!")
        case "cave-in":
            let bonus = ["Iron Ore": 2, "Gold Ore": 1, "Coal Ore": 3]
            for (ore, n) in bonus {
                manager.player.ores[ore, default: 0] += n
            }
            manager.notify("\(event.emoji) \(event.title) Rummage the rubble: +ores!")
        case "bat-swarm":
            manager.player.experience += 15
            manager.checkLevelUp()
            manager.notify("\(event.emoji) \(event.title) Deafening. Worth 15 XP somehow.")
        case "mushroom-bloom":
            manager.player.gold += Int(40 * manager.rebirthMult)
            manager.notify("\(event.emoji) \(event.title) Sold the glow-caps for +\(Int(40 * manager.rebirthMult))🪙!")
        case "merchant":
            merchantStock = MineMerchant.stock(playerGold: manager.player.gold, ownedRelics: manager.relics.count)
            merchantOpen = true
            manager.notify("\(event.emoji) \(event.title) \(event.detail)")
        case "fossil-find":
            manager.player.gold += Int(120 * manager.rebirthMult)
            manager.player.experience += 40
            manager.checkLevelUp()
            manager.notify("\(event.emoji) \(event.title) Museum pays +\(Int(120 * manager.rebirthMult))🪙!")
        case "pet-party":
            manager.player.experience += 50
            manager.checkLevelUp()
            manager.notify("\(event.emoji) \(event.title) Treats all around! +50 XP.")
        case "lamp-festival":
            manager.player.experience += 25
            manager.checkLevelUp()
            manager.notify("\(event.emoji) \(event.title) So pretty. +25 XP.")
        case "bomb-cache":
            manager.bombs = min(9, manager.bombs + 2)
            manager.notify("\(event.emoji) \(event.title) +2 bombs! (have \(manager.bombs))")
        case "wisp-convention":
            manager.player.gold += Int(150 * manager.rebirthMult)
            manager.notify("\(event.emoji) \(event.title) Venue fee: +\(Int(150 * manager.rebirthMult))🪙!")
        case "jackpot-echo":
            let echo = max(50, manager.bestSale / 10)
            manager.player.gold += echo
            manager.notify("\(event.emoji) \(event.title) The mine echoes +\(echo)🪙!")
        default:
            break
        }
        if event.duration > 0 {
            active = event
            activeEndsAt = now.addingTimeInterval(event.duration)
        } else if event.key != "merchant" {
            active = event
            activeEndsAt = now.addingTimeInterval(8)
        }
        manager.notify("\(event.emoji) \(event.title) \(event.detail)")
    }

    /// Spend one lucky swing (called per mining hit).
    func spendLuckySwing() -> Bool {
        guard luckyActive else { return false }
        luckySwings -= 1
        return true
    }

    func closeMerchant() {
        merchantOpen = false
    }
}

// ============================================================
// MARK: - 4. Merchant view
// ============================================================

/// Traveling merchant sheet: curiosities for gold.
struct MineMerchantView: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🧳 Peddler's pack")) {
                    Text("\"Finest goods this side of the bedrock! No refunds. No questions. No curses.\"")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section(header: Text("Curiosities")) {
                    ForEach(manager.eventDirector.merchantStock) { offer in
                        HStack {
                            Text(offer.emoji).font(.title2)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(offer.name).font(.subheadline.bold())
                                Text(offer.detail).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("\(offer.cost)🪙") {
                                buy(offer)
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .disabled(manager.player.gold < offer.cost)
                        }
                    }
                }
                Section(header: Text("💰 Purse: \(manager.player.gold)🪙")) {
                    Text("Stock rotates every visit. The relic — if offered — is always new to you.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Traveling Merchant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        manager.eventDirector.closeMerchant()
                        dismiss()
                    }
                }
            }
        }
    }

    private func buy(_ offer: MineMerchantOffer) {
        guard manager.player.gold >= offer.cost else { return }
        manager.player.gold -= offer.cost
        switch offer.kind {
        case "bombs":
            manager.bombs = min(9, manager.bombs + 3)
            manager.notify("🧨 Bought a bomb bundle! (have \(manager.bombs))")
        case "bait":
            manager.eventDirector.luckyBait += 3
            manager.notify("🪱 Lucky bait! Next 3 casts bite faster.")
        case "relic":
            if let relic = MNRelicCatalog.randomUnowned(owned: manager.relics) {
                manager.relics.append(relic)
                manager.notify("\(relic.emoji) Acquired relic: \(relic.name)! \(relic.flavor)")
            }
        case "snack":
            manager.player.health = manager.player.maxHealth
            manager.player.experience += 10
            manager.checkLevelUp()
            manager.notify("🧺 Snack hamper! Fully restored +10 XP.")
        default:
            break
        }
        manager.merchantDeals += 1
        manager.eventDirector.closeMerchant()
        dismiss()
    }
}
