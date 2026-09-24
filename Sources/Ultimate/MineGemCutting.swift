//
//  MineGemCutting.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Gem-cutting atelier for the maze: rough gems from monster drops become
//  faceted stones worth double. Pure inventory alchemy — no new state,
//  just sharper rocks. Includes the cutter bench view.
//

import SwiftUI

// ============================================================
// MARK: - 1. Cutting rules (manager extension)
// ============================================================

extension TunnelMazeManager {
    /// Rough gem rawValues worth cutting (must match drop naming).
    var cuttableGemNames: [String] {
        ["rubyGem", "sapphireGem", "emeraldGem", "diamondGem", "amethystGem",
         "topazGem", "opalGem", "jadeGem", "amberGem", "crystalGem"]
    }

    /// Total rough units in the pack.
    func roughGemUnits() -> [(name: String, count: Int, value: Int)] {
        var out: [(name: String, count: Int, value: Int)] = []
        for gem in cuttableGemNames {
            let items = player.inventory.filter({ $0.name == gem })
            let count = items.reduce(0, { $0 + $1.quantity })
            if count > 0 {
                let unit = items.first?.value ?? 5
                out.append((gem, count, unit))
            }
        }
        return out.sorted(by: { $0.value > $1.value })
    }

    /// Cut one rough unit into a faceted stone worth 2×. Returns false if none.
    @discardableResult
    func cutGem(named gem: String) -> Bool {
        guard let idx = player.inventory.firstIndex(where: { $0.name == gem && $0.quantity > 0 }) else {
            return false
        }
        var item = player.inventory[idx]
        let unitValue = item.value
        if item.quantity > 1 {
            item.quantity -= 1
            player.inventory[idx] = item
        } else {
            player.inventory.remove(at: idx)
        }
        let cut = MazeInventoryItem(
            name: "Cut \(gem)",
            type: .material,
            quantity: 1,
            maxQuantity: 99,
            description: "Faceted by the atelier. Worth double, shines triple.",
            icon: "💠",
            value: unitValue * 2,
            rarity: .rare
        )
        player.inventory.append(cut)
        player.experience += 4
        addNotification("💠 Cut \(gem) → faceted! Worth \(unitValue * 2) now.")
        triggerHaptic(.medium)
        checkLevelUp()
        return true
    }

    /// Cut everything rough in one go. Returns units cut.
    @discardableResult
    func cutAllGems() -> Int {
        var total = 0
        for gem in cuttableGemNames {
            while cutGemSilent(named: gem) {
                total += 1
            }
        }
        if total > 0 {
            addNotification("💠 Atelier shift complete: \(total) stones faceted!")
            triggerHaptic(.medium)
            checkLevelUp()
        } else {
            addNotification("💠 No rough gems in the pack. Go mug a monster.")
        }
        return total
    }

    /// Silent single cut for batch runs (no per-unit fanfare).
    private func cutGemSilent(named gem: String) -> Bool {
        guard let idx = player.inventory.firstIndex(where: { $0.name == gem && $0.quantity > 0 }) else {
            return false
        }
        var item = player.inventory[idx]
        let unitValue = item.value
        if item.quantity > 1 {
            item.quantity -= 1
            player.inventory[idx] = item
        } else {
            player.inventory.remove(at: idx)
        }
        player.inventory.append(MazeInventoryItem(
            name: "Cut \(gem)", type: .material, quantity: 1, maxQuantity: 99,
            description: "Faceted by the atelier.",
            icon: "💠", value: unitValue * 2, rarity: .rare
        ))
        player.experience += 4
        return true
    }

    /// Faceted stones currently held (for the ledger).
    func facetedUnits() -> Int {
        player.inventory.filter({ $0.name.hasPrefix("Cut ") }).reduce(0, { $0 + $1.quantity })
    }
}

// ============================================================
// MARK: - 2. Cutter bench view
// ============================================================

/// Gem-cutting atelier sheet: rough stock, cut buttons, ledger.
struct MineGemBenchView: View {
    @ObservedObject var manager: TunnelMazeManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("💠 Atelier (double value, triple shine)")) {
                    Text("Rough drops become faceted stones worth 2×. Cutting grants a trickle of XP. The atelier takes no commission — it takes admiration.")
                        .font(.caption).foregroundStyle(.secondary)
                    HStack {
                        Text("Faceted in pack")
                        Spacer()
                        Text("\(manager.facetedUnits())")
                            .bold().foregroundColor(.cyan).monospacedDigit()
                    }
                    Button("Cut EVERYTHING rough") {
                        _ = manager.cutAllGems()
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .tint(.cyan)
                    .disabled(manager.roughGemUnits().isEmpty)
                }
                Section(header: Text("🪨 Rough stock")) {
                    if manager.roughGemUnits().isEmpty {
                        VStack(spacing: 8) {
                            Text("💎").font(.system(size: 44))
                            Text("No rough gems.")
                                .font(.headline)
                            Text("Monsters drop them. Boxy friends gift them. The maze provides.")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    } else {
                        ForEach(manager.roughGemUnits(), id: \.name) { gem in
                            HStack {
                                Text("🔶").font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(gem.name).font(.subheadline.bold())
                                    Text("Rough \(gem.value)🪙 → Cut \(gem.value * 2)🪙 • ×\(gem.count)")
                                        .font(.caption).foregroundStyle(.secondary)
                                        .monospacedDigit()
                                }
                                Spacer()
                                Button("Cut 1") {
                                    _ = manager.cutGem(named: gem.name)
                                }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                            }
                        }
                    }
                }
                Section(header: Text("📏 House rules")) {
                    Text("Cutting never fails. Faceted stones stack to 99. Cut stones can't be cut again — physics, probably.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Gem Atelier")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
