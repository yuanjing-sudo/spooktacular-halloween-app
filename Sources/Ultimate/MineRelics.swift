//
//  MineRelics.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Relic vault: 12 equippable charms (pick damage, luck, gold, speed,
//  pack space) found in treasure closets or bought from the merchant.
//  Equip 3 at once. Passives feed the mining math through tiny helpers.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Relic catalog (12)
// ============================================================

/// One relic: passive boost while equipped (max 3 equipped).
struct MNRelic: Identifiable, Codable {
    var id = UUID()
    var name: String
    var emoji: String
    var effect: String // Damage / Luck / Gold / Speed / Pack
    var value: Double // e.g. 0.15 = +15%
    var flavor: String
}

enum MNRelicCatalog {
    static var all: [MNRelic] = [
        MNRelic(name: "Mole's Knuckle", emoji: "🦔", effect: "Damage", value: 0.15,
                flavor: "A brass knuckle shaped like a tiny fist. Swings 15% harder."),
        MNRelic(name: "Sledge of Echoes", emoji: "🔨", effect: "Damage", value: 0.25,
                flavor: "Every hit lands twice, the second time emotionally."),
        MNRelic(name: "Core Drill Bit", emoji: "🌀", effect: "Damage", value: 0.4,
                flavor: "Still warm from the Magma Core. Handle with gloves and ambition."),
        MNRelic(name: "Rabbit's Foot", emoji: "🐇", effect: "Luck", value: 0.08,
                flavor: "The rabbit had insurance. You have +8% double drops."),
        MNRelic(name: "Four-Leaf Pick", emoji: "🍀", effect: "Luck", value: 0.12,
                flavor: "Photosynthesizes luck directly into your backpack."),
        MNRelic(name: "Wisp in a Jar", emoji: "✨", effect: "Luck", value: 0.2,
                flavor: "It rattles when ore is near. It rattles constantly. Everything is near."),
        MNRelic(name: "Gilded Scale", emoji: "⚖️", effect: "Gold", value: 0.15,
                flavor: "Weighs your gold and finds it wanting more gold."),
        MNRelic(name: "Merchant's Smile", emoji: "🤑", effect: "Gold", value: 0.25,
                flavor: "A smile so charming the cart pays extra. +25% sale value."),
        MNRelic(name: "Crown Fragment", emoji: "👑", effect: "Gold", value: 0.4,
                flavor: "A third of a crown, all of the greed. Sales +40%."),
        MNRelic(name: "Swift Boots", emoji: "🥾", effect: "Speed", value: 0.15,
                flavor: "These boots have somewhere to be. Mining speed +15%."),
        MNRelic(name: "Hummingbird Charm", emoji: "🐦", effect: "Speed", value: 0.25,
                flavor: "Flaps 80 times a second. Your pick tries to keep up."),
        MNRelic(name: "Bottomless Pocket", emoji: "🎒", effect: "Pack", value: 25,
                flavor: "Bigger on the inside. +25 backpack space, no questions."),
    ]

    /// Random relic the player doesn't own yet.
    static func randomUnowned(owned: [MNRelic]) -> MNRelic? {
        let have = Set(owned.map(\.name))
        let pool = all.filter({ !have.contains($0.name) })
        return pool.randomElement()
    }
}

// ============================================================
// MARK: - 2. Passive helpers (manager extension)
// ============================================================

extension MineManager {
    /// Equipped relics only (max 3 enforced at toggle time).
    var activeRelics: [MNRelic] {
        playerRelics().filter({ equippedRelics.contains($0.id) })
    }

    private func playerRelics() -> [MNRelic] {
        relics
    }

    /// Sum of an effect across equipped relics.
    func relicBonus(_ effect: String) -> Double {
        activeRelics.filter({ $0.effect == effect }).reduce(0.0, { $0 + $1.value })
    }

    func relicDamageMult() -> Double { 1.0 + relicBonus("Damage") }
    func relicLuckBonus() -> Double { relicBonus("Luck") }
    func relicGoldMult() -> Double { 1.0 + relicBonus("Gold") }
    func relicSpeedMult() -> Double { 1.0 + relicBonus("Speed") }
    func relicPackBonus() -> Int { Int(activeRelics.filter({ $0.effect == "Pack" }).reduce(0.0, { $0 + $1.value })) }

    /// Effective backpack capacity: base + pack relics.
    var effectivePackCapacity: Int {
        player.backpackCapacity + relicPackBonus()
    }

    func toggleRelicEquip(_ id: UUID) {
        if equippedRelics.contains(id) {
            equippedRelics.remove(id)
        } else {
            guard equippedRelics.count < 3 else {
                notify("🗿 Only 3 relics fit on your belt — unequip one first!")
                return
            }
            equippedRelics.insert(id)
            if let relic = relics.first(where: { $0.id == id }) {
                notify("\(relic.emoji) \(relic.name) equipped! \(relic.flavor)")
            }
        }
    }

    /// Grant a random unowned relic (closets, merchant, events).
    @discardableResult
    func grantRandomRelic(source: String) -> Bool {
        guard let relic = MNRelicCatalog.randomUnowned(owned: relics) else {
            player.gold += 200
            notify("🗿 Relic vault full! Compensated +200🪙 instead.")
            return false
        }
        relics.append(relic)
        if equippedRelics.count < 3 {
            equippedRelics.insert(relic.id)
        }
        notify("\(relic.emoji) RELIC from \(source): \(relic.name)! \(relic.flavor)")
        return true
    }
}

// ============================================================
// MARK: - 3. Relic vault view
// ============================================================

/// Relic vault sheet: collection, equip toggles, passive summary.
struct MineRelicVaultView: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("✨ Active passives")) {
                    passiveRow("⚔️ Damage", "×\(String(format: "%.2f", manager.relicDamageMult()))")
                    passiveRow("🍀 Luck", "+\(Int(manager.relicLuckBonus() * 100))% doubles")
                    passiveRow("🪙 Gold", "×\(String(format: "%.2f", manager.relicGoldMult())) sales")
                    passiveRow("⚡ Speed", "×\(String(format: "%.2f", manager.relicSpeedMult())) swings")
                    passiveRow("🎒 Pack", "+\(manager.relicPackBonus()) slots (cap \(manager.effectivePackCapacity))")
                    Text("Equip up to 3. New relics auto-equip while there is room.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section(header: Text("🗿 Vault (\(manager.relics.count)/\(MNRelicCatalog.all.count))")) {
                    if manager.relics.isEmpty {
                        VStack(spacing: 8) {
                            Text("🗿").font(.system(size: 44))
                            Text("No relics yet.")
                                .font(.headline)
                            Text("Treasure closets sometimes hide them. The merchant always has exactly one (suspicious, convenient).")
                                .font(.caption).foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    } else {
                        ForEach(manager.relics) { relic in
                            HStack {
                                Text(relic.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(relic.name).font(.subheadline.bold())
                                    Text("+\(relic.effect == "Pack" ? "\(Int(relic.value)) slots" : "\(Int(relic.value * 100))% \(relic.effect)") • \(relic.flavor)")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Button(manager.equippedRelics.contains(relic.id) ? "Worn" : "Wear") {
                                    manager.toggleRelicEquip(relic.id)
                                }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                                .tint(manager.equippedRelics.contains(relic.id) ? .green : .orange)
                            }
                        }
                    }
                }
                Section(header: Text("📜 Missing (\(MNRelicCatalog.all.count - manager.relics.count))")) {
                    ForEach(MNRelicCatalog.all.filter({ r in !manager.relics.contains(where: { $0.name == r.name }) }), id: \.name) { relic in
                        HStack {
                            Text("❓")
                            Text("???").font(.subheadline)
                                .foregroundColor(.gray)
                            Spacer()
                            Text(relic.effect).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Relic Vault")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func passiveRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value).bold().monospacedDigit()
        }
    }
}
