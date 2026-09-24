//
//  MineFishing.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Underground lake fishing: 14 species (6 freshwater + 8 magma), 4 rod
//  tiers, a timing-bar bite minigame, collection journal, fish market.
//  Manager state lives on MineManager (props); all logic here in an
//  extension plus views. Nothing lethal — the fish are friendly.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Species + rods
// ============================================================

/// One fish species.
struct MNFish: Identifiable {
    let id = UUID()
    var name: String
    var emoji: String
    var rarity: String // Common / Rare / Epic / Legendary
    var water: String // Fresh / Magma
    var value: Int
    var flavor: String
}

enum MNFishGuide {
    static var all: [MNFish] = [
        MNFish(name: "Cave Minnow", emoji: "🐟", rarity: "Common", water: "Fresh", value: 6,
               flavor: "The pigeon of the underground lake. Everywhere, unbothered, delicious."),
        MNFish(name: "Lantern Guppy", emoji: "🐠", rarity: "Common", water: "Fresh", value: 8,
               flavor: "Glows faintly. Navigation hazard and appetizer."),
        MNFish(name: "Blind Barb", emoji: "🐡", rarity: "Common", water: "Fresh", value: 7,
               flavor: "No eyes, no fear. Bites anything, including hooks. Especially hooks."),
        MNFish(name: "Moss Carp", emoji: "🐟", rarity: "Common", water: "Fresh", value: 9,
               flavor: "Dresses in pondweed. Fashion icon of the still water."),
        MNFish(name: "Echo Trout", emoji: "🐟", rarity: "Rare", water: "Fresh", value: 22,
               flavor: "Repeats your splash back at you, but fancier."),
        MNFish(name: "Mirror Koi", emoji: "🐠", rarity: "Rare", water: "Fresh", value: 28,
               flavor: "Shows you rich. Like the mirror portal, but wetter."),
        MNFish(name: "Axolotl Pal", emoji: "🦎", rarity: "Epic", water: "Fresh", value: 60,
               flavor: "Not a fish. Refuses to elaborate. Worth a fortune anyway."),
        MNFish(name: "Ember Eel", emoji: "🐍", rarity: "Common", water: "Magma", value: 14,
               flavor: "Swims in lava. Complains about nothing. Role model."),
        MNFish(name: "Cinder Carp", emoji: "🐟", rarity: "Common", water: "Magma", value: 16,
               flavor: "Extra crispy, straight from the source. No cooking required."),
        MNFish(name: "Magma Jelly", emoji: "🪼", rarity: "Rare", water: "Magma", value: 34,
               flavor: "A jellyfish that chose lava. Bold strategy. Pays off."),
        MNFish(name: "Obsidian Bass", emoji: "🐟", rarity: "Rare", water: "Magma", value: 40,
               flavor: "Sharp enough to cut line. We use thicker line now."),
        MNFish(name: "Phoenix Fry", emoji: "🐠", rarity: "Epic", water: "Magma", value: 85,
               flavor: "Hatches from ash, tastes like victory. Handle with oven mitts."),
        MNFish(name: "Core Serpent", emoji: "🐉", rarity: "Legendary", water: "Magma", value: 220,
               flavor: "The lake's landlord. Collects rent in awe."),
        MNFish(name: "Goldenєї Walleye", emoji: "🐟", rarity: "Legendary", water: "Fresh", value: 180,
               flavor: "One eye winks. It knows what you sold last summer."),
    ]

    static func catchable(water: String, rodTier: Int) -> [MNFish] {
        all.filter({
            $0.water == water && rarityRank($0.rarity) <= rodTier + 1
        })
    }

    static func rarityRank(_ rarity: String) -> Int {
        switch rarity {
        case "Common": return 0
        case "Rare": return 1
        case "Epic": return 2
        default: return 3
        }
    }
}

/// Rod tiers: better rods unlock rarer waters and bigger windows.
struct MNRodTier {
    var name: String
    var emoji: String
    var cost: Int
    var window: Double // bite-zone width 0…1
    var flavor: String

    static var all: [MNRodTier] = [
        MNRodTier(name: "Stick + String", emoji: "🎣", cost: 0, window: 0.22,
                  flavor: "A classic. Catches minnows and disappointment."),
        MNRodTier(name: "Copper Rig", emoji: "🎣", cost: 400, window: 0.3,
                  flavor: "Proper reel. Rare fish start believing in you."),
        MNRodTier(name: "Magma-Proof Rod", emoji: "🎣", cost: 1500, window: 0.38,
                  flavor: "Unlocks lava fishing. Does not melt. Mostly."),
        MNRodTier(name: "Warden's Rod", emoji: "🎣", cost: 4000, window: 0.48,
                  flavor: "The lake respects this rod. Legendaries surface for it."),
    ]
}

// ============================================================
// MARK: - 2. Manager extension (state lives on MineManager)
// ============================================================

extension MineManager {
    /// Cast: starts a bite window. Returns false while one runs.
    func fishCast() -> Bool {
        guard !fishing.biting else { return false }
        fishing.biting = true
        fishing.biteAt = Date().addingTimeInterval(Double.random(in: 1.2...3.2))
        fishing.window = MNRodTier.all[min(rodTier, MNRodTier.all.count - 1)].window
        return true
    }

    /// Strike: call when the player taps. Returns the catch (if timed).
    @discardableResult
    func fishStrike(water: String) -> MNFish? {
        guard fishing.biting else { return nil }
        fishing.biting = false
        let now = Date()
        // Bite active ±window/2 seconds around biteAt; magma is twitchier,
        // lucky bait widens the moment.
        var half = fishing.window * (water == "Magma" ? 0.8 : 1.0)
        if eventDirector.luckyBait > 0 {
            eventDirector.luckyBait -= 1
            half *= 1.5
        }
        guard abs(now.timeIntervalSince(fishing.biteAt)) <= half else {
            notify("🎣 Too soon! The fish file a complaint.")
            return nil
        }
        let pool = MNFishGuide.catchable(water: water, rodTier: rodTier)
        guard !pool.isEmpty else { return nil }
        // Weighted by rarity (commons frequent, legendaries mythic).
        let weights = pool.map({ fish -> Int in
            switch fish.rarity {
            case "Common": return 50
            case "Rare": return 22
            case "Epic": return 8
            default: return 2
            }
        })
        let total = weights.reduce(0, +)
        var roll = Int.random(in: 1...max(1, total))
        var pick = pool[0]
        for (fish, w) in zip(pool, weights) {
            roll -= w
            if roll <= 0 {
                pick = fish
                break
            }
        }
        fishCaught[pick.name, default: 0] += 1
        player.experience += 12
        checkLevelUp()
        onEvent?(.minedOre(pick.name, 1))
        notify("\(pick.emoji) Caught \(pick.name)! (\(pick.rarity))")
        return pick
    }

    func fishCancel() {
        fishing.biting = false
    }

    /// Upgrade the rod for gold. Returns false if short or maxed.
    @discardableResult
    func upgradeRod() -> Bool {
        let next = rodTier + 1
        guard next < MNRodTier.all.count else {
            notify("🎣 Already wielding the Warden's Rod. The lake bows.")
            return false
        }
        let cost = MNRodTier.all[next].cost
        guard player.gold >= cost else {
            notify("🎣 Need \(cost)🪙 for \(MNRodTier.all[next].name) (have \(player.gold)).")
            return false
        }
        player.gold -= cost
        rodTier = next
        notify("\(MNRodTier.all[next].emoji) New rod: \(MNRodTier.all[next].name)! \(MNRodTier.all[next].flavor)")
        return true
    }

    /// Sell the whole catch at modest prices (fun money, not the economy).
    func sellFish() {
        var units = 0
        var payout = 0
        for fish in MNFishGuide.all {
            let n = fishCaught[fish.name, default: 0]
            if n > 0 {
                units += n
                payout += n * fish.value
            }
        }
        guard units > 0 else {
            notify("🎣 Creel is empty — the lake owes you nothing. Yet.")
            return
        }
        fishCaught = [:]
        player.gold += payout
        fishMarketBest = max(fishMarketBest, payout)
        notify("🎣 Sold \(units) fish! +\(payout)🪙")
    }
}

/// Cast state (lives beside the manager as a published helper).
struct MNFishingState {
    var biting: Bool = false
    var biteAt = Date()
    var window: Double = 0.22
}

// ============================================================
// MARK: - 3. Fishing views
// ============================================================

/// Bite-timing minigame: marker sweeps, tap STRIKE in the green zone.
struct MineFishingGame: View {
    @ObservedObject var manager: MineManager
    var water: String
    @State private var marker = 0.0
    @State private var dir = 1.0
    @State private var lastCatch: MNFish?
    @State private var whiff = false

    private var zone: ClosedRange<Double> {
        let w = MNRodTier.all[min(manager.rodTier, MNRodTier.all.count - 1)].window
        return 0.5 - w / 2...0.5 + w / 2
    }

    var body: some View {
        VStack(spacing: 12) {
            // Lake art.
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(water == "Magma"
                          ? Color(red: 0.4, green: 0.1, blue: 0.05)
                          : Color(red: 0.05, green: 0.12, blue: 0.2))
                    .frame(height: 170)
                // Bobber line.
                Rectangle()
                    .fill(Color.white.opacity(0.5))
                    .frame(width: 2, height: 70)
                    .offset(y: -30)
                Circle()
                    .fill(Color.red)
                    .frame(width: 14, height: 14)
                    .offset(y: 8 + CGFloat(sin(marker * 12) * 3))
                // Ripples.
                ForEach(0..<3, id: \.self) { i in
                    Ellipse()
                        .stroke(Color.white.opacity(0.4), lineWidth: 2)
                        .frame(width: 40 + CGFloat(i) * 22, height: 12)
                        .offset(y: 22)
                        .opacity(0.8 - Double(i) * 0.2)
                }
                Text(water == "Magma" ? "🔥" : "🌊")
                    .font(.caption)
                    .padding(4)
                    .background(Color.black.opacity(0.5))
                    .cornerRadius(6)
                    .offset(x: -110, y: -60)
            }
            // Timing bar.
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.14))
                        .frame(height: 22)
                    Capsule()
                        .fill(Color.green.opacity(0.55))
                        .frame(
                            width: geo.size.width * CGFloat(zone.upperBound - zone.lowerBound),
                            height: 22
                        )
                        .offset(x: geo.size.width * CGFloat(zone.lowerBound))
                    // Sweeping marker.
                    Capsule()
                        .fill(Color.white)
                        .frame(width: 6, height: 26)
                        .offset(x: geo.size.width * CGFloat(marker) - 3)
                        .shadow(color: .white, radius: 4)
                }
            }
            .frame(height: 26)
            .padding(.horizontal)
            .onAppear { runMarker() }
            // Strike + cast.
            HStack(spacing: 14) {
                Button(manager.fishing.biting ? "🎣 Waiting…" : "Cast line") {
                    if manager.fishCast() {
                        lastCatch = nil
                        whiff = false
                        SpookyHaptics.play(.light)
                    }
                }
                .buttonStyle(MineSpringButtonStyle(tint: .blue, glow: true))
                .disabled(manager.fishing.biting)
                Button("STRIKE!") {
                    if let fish = manager.fishStrike(water: water) {
                        lastCatch = fish
                        SpookyHaptics.play(.reward)
                    } else if manager.fishing.biting == false {
                        whiff = true
                    }
                }
                .buttonStyle(MineSpringButtonStyle(tint: .red, glow: true))
                .disabled(!manager.fishing.biting)
            }
            if let fish = lastCatch {
                VStack(spacing: 4) {
                    Text("\(fish.emoji) \(fish.name)!")
                        .font(.headline)
                    Text("\(fish.rarity) • +\(fish.value)🪙 at market • \(fish.flavor)")
                        .font(.caption).foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .background(Color.green.opacity(0.12))
                .cornerRadius(12)
                .padding(.horizontal)
                .transition(.scale.combined(with: .opacity))
            } else if whiff {
                Text("💨 Whiffed! Watch the green zone, strike inside it.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Text(water == "Magma" && manager.rodTier < 2
                 ? "⚠️ Magma water needs the Magma-Proof Rod (tier 2+). Commons only until then."
                 : "Zone width grows with rod tier. Magma bites are twitchier.")
                .font(.caption).foregroundStyle(.secondary)
                .padding(.horizontal)
        }
    }

    private func runMarker() {
        Timer.scheduledTimer(withTimeInterval: 0.03, repeats: true) { _ in
            marker += 0.018 * dir
            if marker >= 1 {
                marker = 1
                dir = -1
            } else if marker <= 0 {
                marker = 0
                dir = 1
            }
        }
    }
}

/// Rod shop + collection + market, one sheet.
struct MineFishingView: View {
    @ObservedObject var manager: MineManager
    @State private var water = "Fresh"
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Water picker.
                    Picker("Water", selection: $water) {
                        Text("🌊 Fresh").tag("Fresh")
                        Text("🔥 Magma").tag("Magma")
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    MineFishingGame(manager: manager, water: water)
                    // Rod shop.
                    VStack(alignment: .leading, spacing: 8) {
                        Text("🎣 Tackle shop").font(.headline).padding(.horizontal)
                        ForEach(MNRodTier.all.indices, id: \.self) { i in
                            let tier = MNRodTier.all[i]
                            HStack {
                                Text(tier.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(tier.name).font(.subheadline.bold())
                                    Text(tier.flavor).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if i == manager.rodTier {
                                    Text("IN HAND").font(.caption2.bold()).foregroundColor(.green)
                                } else if i < manager.rodTier {
                                    Text("Owned").font(.caption).foregroundStyle(.secondary)
                                } else if i == manager.rodTier + 1 {
                                    Button("\(tier.cost)🪙") { _ = manager.upgradeRod() }
                                        .buttonStyle(.borderedProminent)
                                        .controlSize(.small)
                                } else {
                                    Text("\(tier.cost)🪙").font(.caption).foregroundStyle(.tertiary)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    // Collection.
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("📖 Creel journal (\(caughtCount)/\(MNFishGuide.all.count))").font(.headline)
                            Spacer()
                            Button("Sell all") { manager.sellFish() }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                                .tint(.green)
                        }
                        .padding(.horizontal)
                        ForEach(MNFishGuide.all, id: \.name) { fish in
                            let n = manager.fishCaught[fish.name, default: 0]
                            HStack {
                                Text(fish.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(n > 0 ? fish.name : "???").font(.subheadline.bold())
                                    Text(n > 0 ? "\(fish.rarity) • \(fish.water) • \(fish.value)🪙" : "Uncaught")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if n > 0 {
                                    Text("×\(n)").font(.headline).foregroundColor(.orange).monospacedDigit()
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Underground Angling")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private var caughtCount: Int {
        MNFishGuide.all.filter({ manager.fishCaught[$0.name, default: 0] > 0 }).count
    }
}
