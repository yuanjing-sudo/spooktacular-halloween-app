//
//  MazeBonds.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Friendship ledger for the maze's boxy animals: encounters, feeds and
//  gifts build bond levels with titles and passives. Includes the combined
//  Maze Journal (expeditions + atlas + bonds in one sheet).
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Bond model
// ============================================================

/// One species' friendship record.
struct BoxyBond {
    var encounters: Int = 0
    var feeds: Int = 0
    var gifts: Int = 0
    var bondXP: Int = 0

    mutating func addEncounters(_ n: Int = 1) {
        encounters += n
        bondXP += n
    }

    mutating func addFeed() {
        feeds += 1
        bondXP += 2
    }

    mutating func addGift() {
        gifts += 1
        bondXP += 1
    }

    mutating func halveOnLoss() {
        bondXP /= 2
    }
}

enum BoxyBondRank {
    static func level(xp: Int) -> Int {
        if xp >= 25 { return 5 }
        if xp >= 15 { return 4 }
        if xp >= 8 { return 3 }
        if xp >= 3 { return 2 }
        return 1
    }

    static func title(level: Int) -> String {
        switch level {
        case 1: return "Stranger"
        case 2: return "Acquaintance"
        case 3: return "Pal"
        case 4: return "Bestie"
        default: return "Soulcube"
        }
    }

    static func nextThreshold(level: Int) -> Int? {
        switch level {
        case 1: return 3
        case 2: return 8
        case 3: return 15
        case 4: return 25
        default: return nil
        }
    }

    /// Feed price scales with bond level.
    static func feedCost(level: Int) -> Int { 20 + level * 15 }

    /// Gift disable: bonded friends (Lv.3+) sometimes share gems.
    static func giftChance(level: Int) -> Double {
        switch level {
        case 1: return 0
        case 2: return 0.02
        case 3: return 0.05
        case 4: return 0.09
        default: return 0.14
        }
    }
}

// ============================================================
// MARK: - 2. Ledger
// ============================================================

/// Friendship ledger keyed by species display name. Persisted.
final class BoxyBondLedger: ObservableObject {
    @Published private(set) var bonds: [String: BoxyBond] = [:]
    @Published private(set) var totalFeeds: Int = 0
    @Published private(set) var feedLog: [String] = []

    private let key = "boxyBonds.v1"

    init() { load() }

    static var species: [String] {
        ["Boxy Mole", "Boxy Bat", "Boxy Axolotl", "Boxy Fox", "Golden Wisp"]
    }

    static var speciesEmoji: [String: String] {
        [
            "Boxy Mole": "🦔",
            "Boxy Bat": "🦇",
            "Boxy Axolotl": "🦎",
            "Boxy Fox": "🦊",
            "Golden Wisp": "✨",
        ]
    }

    static var speciesBlurb: [String: String] {
        [
            "Boxy Mole": "Digs in straight lines and judges your tunnels. Secretly proud of you.",
            "Boxy Bat": "Flies in squares. Squares are honest. Has never told a lie, geometrically speaking.",
            "Boxy Axolotl": "Smiles with its whole cube. Regrows corners. Believes in you unconditionally.",
            "Boxy Fox": "Too cool for corners it didn't choose itself. Leaves gifts to maintain mystique.",
            "Golden Wisp": "A rumor with a halo. Rarest friend, richest gifts, worst at goodbyes.",
        ]
    }

    func bond(for species: String) -> BoxyBond {
        bonds[species, default: BoxyBond()]
    }

    func level(for species: String) -> Int {
        BoxyBondRank.level(xp: bond(for: species).bondXP)
    }

    func recordEncounter(species: String) {
        var b = bond(for: species)
        b.addEncounters()
        bonds[species] = b
        save()
    }

    func recordFeed(species: String) {
        var b = bond(for: species)
        b.addFeed()
        bonds[species] = b
        totalFeeds += 1
        feedLog.insert("\(species) fed → Lv.\(level(for: species)) \(BoxyBondRank.title(level: level(for: species)))", at: 0)
        if feedLog.count > 10 { feedLog.removeLast() }
        save()
    }

    func recordGift(species: String) {
        var b = bond(for: species)
        b.addGift()
        bonds[species] = b
        save()
    }

    func recordLoss(species: String) {
        var b = bond(for: species)
        b.halveOnLoss()
        bonds[species] = b
        save()
    }

    var averageLevel: Double {
        let levels = Self.species.map({ level(for: $0) })
        return Double(levels.reduce(0, +)) / Double(max(1, levels.count))
    }

    var bestFriend: String {
        Self.species.max(by: { bond(for: $0).bondXP < bond(for: $1).bondXP }) ?? "—"
    }

    private func save() {
        // Lightweight: xp per species + feed total.
        var dict: [String: Int] = [:]
        for (k, v) in bonds { dict[k] = v.bondXP }
        UserDefaults.standard.set(dict, forKey: key)
        UserDefaults.standard.set(totalFeeds, forKey: key + ".feeds")
    }

    private func load() {
        let dict = UserDefaults.standard.dictionary(forKey: key) as? [String: Int] ?? [:]
        for (k, v) in dict {
            var b = BoxyBond()
            b.bondXP = v
            bonds[k] = b
        }
        totalFeeds = UserDefaults.standard.integer(forKey: key + ".feeds")
    }

    func resetAll() {
        bonds = [:]
        totalFeeds = 0
        save()
    }
}

// ============================================================
// MARK: - 3. Bond view
// ============================================================

/// Friendship cards with feed buttons. The host passes a feed handler
/// (the manager checks range + gold) and the current gold for gating.
struct BoxyBondView: View {
    @ObservedObject var ledger: BoxyBondLedger
    var gold: Int
    var feed: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("📦 Boxy Bonds")
                    .font(.headline).foregroundColor(.white)
                Spacer()
                Text("Avg Lv.\(String(format: "%.1f", ledger.averageLevel)) • Bestie: \(ledger.bestFriend)")
                    .font(.caption).foregroundColor(.white.opacity(0.7))
            }
            Text("Perks — Lv.2: friendship acknowledged • Lv.3+: pals share gems when near • Lv.5: maximum Soulcube devotion • Feeding builds 2 XP, encounters 1 XP. Hurting a friend halves its bond.")
                .font(.caption).foregroundColor(.white.opacity(0.6))
            ForEach(BoxyBondLedger.species, id: \.self) { species in
                bondCard(species)
            }
            if !ledger.feedLog.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("🍬 Recent feedings").font(.caption.bold()).foregroundColor(.white.opacity(0.8))
                    ForEach(ledger.feedLog, id: \.self) { line in
                        Text("• \(line)").font(.caption).foregroundColor(.white.opacity(0.6))
                    }
                }
            }
        }
    }

    private func bondCard(_ species: String) -> some View {
        let bond = ledger.bond(for: species)
        let level = ledger.level(for: species)
        let cost = BoxyBondRank.feedCost(level: level)
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(BoxyBondLedger.speciesEmoji[species] ?? "📦")
                    .font(.title2)
                VStack(alignment: .leading, spacing: 2) {
                    Text(species).font(.subheadline.bold()).foregroundColor(.white)
                    Text("Lv.\(level) \(BoxyBondRank.title(level: level)) • \(bond.encounters) meets • \(bond.feeds) feeds • \(bond.gifts) gifts")
                        .font(.caption).foregroundColor(.white.opacity(0.7))
                }
                Spacer()
                Button("Feed \(cost)🪙") { feed(species) }
                    .font(.caption.bold())
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(gold >= cost ? Color.orange : Color.gray.opacity(0.5))
                    .foregroundColor(.white)
                    .cornerRadius(8)
                    .disabled(gold < cost)
            }
            if let next = BoxyBondRank.nextThreshold(level: level) {
                ProgressView(value: Double(bond.bondXP), total: Double(next)) {
                    Text("Bond \(bond.bondXP)/\(next) XP")
                        .font(.caption2).foregroundColor(.white.opacity(0.7))
                }
                .progressViewStyle(LinearProgressViewStyle(tint: .pink))
            } else {
                Text("MAX BOND 💖 Soulcubes forever.")
                    .font(.caption.bold()).foregroundColor(.pink)
            }
            Text(BoxyBondLedger.speciesBlurb[species] ?? "")
                .font(.caption).foregroundColor(.white.opacity(0.6))
        }
        .padding(10)
        .background(Color.white.opacity(0.08))
        .cornerRadius(12)
    }
}

// ============================================================
// MARK: - 4. Maze journal (expeditions + atlas + bonds)
// ============================================================

/// One sheet combining the expedition board, region atlas and bond
/// ledger so the maze needs a single journal button.
struct MazeJournalView: View {
    @ObservedObject var expeditions: MazeExpeditionBoard
    @ObservedObject var regions: MazeRegionDirector
    @ObservedObject var bonds: BoxyBondLedger
    var gold: Int
    var feed: (String) -> Void
    var score: Int = 0
    var onClaimDaily: (Int) -> Void = { _ in }
    @State private var showBestiary = false
    @State private var showMotion = false
    @State private var showSky = false
    @State private var showDaily = false
    @State private var showCine = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    expeditionSection
                    atlasSection
                    BoxyBondView(ledger: bonds, gold: gold, feed: feed)
                        .padding(.horizontal, 12)
                    Button(action: { showBestiary = true }) {
                        HStack {
                            Image(systemName: "book.fill")
                            Text("Hunter's Bestiary — 39 monsters")
                        }
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.red.opacity(0.6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, 12)
                    Button(action: { showMotion = true }) {
                        HStack {
                            Image(systemName: "wand.and.stars")
                            Text("Motion Lab — animated rows")
                        }
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.purple.opacity(0.6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, 12)
                    Button(action: { showSky = true }) {
                        HStack {
                            Image(systemName: "moon.stars.fill")
                            Text("Sky Observatory — 10 skies")
                        }
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.blue.opacity(0.6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, 12)
                    Button(action: { showDaily = true }) {
                        HStack {
                            Image(systemName: "calendar.circle.fill")
                            Text("Daily Hub — streaks + focus")
                        }
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.orange.opacity(0.6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, 12)
                    Button(action: { showCine = true }) {
                        HStack {
                            Image(systemName: "film.fill")
                            Text("Maze Cinematics — 7 moments")
                        }
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.pink.opacity(0.6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal, 12)
                }
                .padding(.vertical, 12)
            }
            .background(Color(red: 0.05, green: 0.03, blue: 0.08))
            .navigationTitle("🧭 Maze Journal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showBestiary) {
                MazeBestiaryView()
            }
            .sheet(isPresented: $showMotion) {
                MazeMotionShowcaseView()
            }
            .sheet(isPresented: $showSky) {
                MazeSkyShowcaseView()
            }
            .sheet(isPresented: $showDaily) {
                MazeDailyHubView(
                    expeditions: expeditions,
                    regions: regions,
                    bonds: bonds,
                    score: score,
                    gold: gold,
                    onClaimReward: onClaimDaily
                )
            }
            .sheet(isPresented: $showCine) {
                MazeCinematicShowcaseView()
            }
        }
        .preferredColorScheme(.dark)
    }

    private var expeditionSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("🧭 Expeditions (\(expeditions.doneCount)/\(MazeExpeditionCatalog.all.count))")
                .font(.headline).foregroundColor(.white)
                .padding(.horizontal, 12)
            ForEach(expeditions.active) { e in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(e.icon)
                        Text(e.title).font(.subheadline.bold()).foregroundColor(.white)
                        Spacer()
                        if expeditions.claimed.contains(e.id) {
                            Text("CLAIMED").font(.caption2.bold()).foregroundColor(.green)
                        } else if expeditions.isDone(e) {
                            Button("Claim") { _ = expeditions.claim(e) }
                                .font(.caption.bold())
                                .padding(.horizontal, 10).padding(.vertical, 6)
                                .background(Color.green).foregroundColor(.white)
                                .cornerRadius(8)
                        } else {
                            Text("\(min(expeditions.progressOf(e), e.target))/\(e.target)")
                                .font(.caption).foregroundColor(.white.opacity(0.7))
                                .monospacedDigit()
                        }
                    }
                    ProgressView(value: expeditions.fractionOf(e))
                        .progressViewStyle(LinearProgressViewStyle(tint: .orange))
                    Text("Reward: \(e.rewardScore) pts +\(e.rewardGold)🪙 • 💡 \(e.tip)")
                        .font(.caption).foregroundColor(.white.opacity(0.6))
                }
                .padding(10)
                .background(Color.white.opacity(0.08))
                .cornerRadius(12)
                .padding(.horizontal, 12)
            }
        }
    }

    private var atlasSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("🗺️ Regions (\(regions.mappedCount)/\(MazeRegionAtlas.all.count))")
                .font(.headline).foregroundColor(.white)
                .padding(.horizontal, 12)
            ForEach(MazeRegionAtlas.all, id: \.id) { region in
                let found = regions.mapped.contains(region.id)
                HStack {
                    Text(region.emoji)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(found ? region.name : "???")
                            .font(.subheadline.bold()).foregroundColor(.white)
                        Text(found ? region.bounds : "Unmapped dark")
                            .font(.caption).foregroundColor(.white.opacity(0.75))
                    }
                    Spacer()
                    if found {
                        Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                    } else {
                        Image(systemName: "lock.circle").foregroundColor(.gray)
                    }
                }
                .padding(10)
                .background(
                    ZStack {
                        MazeRegionSky(id: region.id)
                            .opacity(found ? 1 : 0.3)
                            .saturation(found ? 1 : 0)
                        Color.black.opacity(found ? 0.2 : 0.5)
                    }
                )
                .cornerRadius(12)
                .padding(.horizontal, 12)
            }
        }
    }
}
