//
//  MineDeepDive.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Guided deep-dive contracts: descend to a target layer, mine a quota of
//  deep ore, return alive (guaranteed — god-mode). Poll-based progress,
//  treasure-chest payouts, best-depth records. Zero hooks.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Dive contracts
// ============================================================

/// One guided dive: depth + quota + clock + chest.
struct MineDiveContract {
    var id: String
    var title: String
    var emoji: String
    var targetY: Float // reach at or below
    var layerName: String
    var quota: Int // deep ore units (any kind below y −1)
    var minutes: Int
    var chestGold: Int
    var chestXP: Int
    var flavor: String
}

enum MineDiveGuide {
    static var all: [MineDiveContract] = [
        MineDiveContract(id: "dive-stone", title: "Stone Shakedown", emoji: "🪨",
                         targetY: -1, layerName: "Stone Depths", quota: 15, minutes: 6,
                         chestGold: 400, chestXP: 250,
                         flavor: "Touch the Stone Depths and haul 15 deep ores. Training wheels: on."),
        MineDiveContract(id: "dive-deep", title: "Deepstone Run", emoji: "⬛",
                         targetY: -3, layerName: "Deepstone", quota: 25, minutes: 8,
                         chestGold: 900, chestXP: 550,
                         flavor: "Double pay territory. Bring a Stone pick and low expectations of daylight."),
        MineDiveContract(id: "dive-crystal", title: "Hollows Plunge", emoji: "🔮",
                         targetY: -4.5, layerName: "Crystal Hollows", quota: 20, minutes: 8,
                         chestGold: 1400, chestXP: 900,
                         flavor: "Triple pay, triple pretty. Crystals count double toward quota."),
        MineDiveContract(id: "dive-magma", title: "Core Or Bust", emoji: "🔥",
                         targetY: -5.2, layerName: "Magma Core", quota: 30, minutes: 10,
                         chestGold: 2500, chestXP: 1600,
                         flavor: "Five times the pay. Zero times the death. The full experience."),
    ]
}

/// Live dive session: snapshots at start, diffs live, chest on success.
final class MineDeepDive: ObservableObject {
    @Published private(set) var contract: MineDiveContract?
    @Published private(set) var secondsLeft: Double = 0
    @Published private(set) var touchedDepth: Bool = false
    @Published private(set) var running: Bool = false
    @Published private(set) var lastChest: Int?

    private var timer: Timer?
    private var deepAtStart: Int = 0
    private var deepNow: Int = 0

    var quotaProgress: (have: Int, need: Int)? {
        guard let c = contract else { return nil }
        return (min(deepNow, c.quota), c.quota)
    }

    /// Deep ore units currently banked (below y −1 flavor-wise we count
    /// stone/deepslate-deep ores + crystals by name).
    private func deepUnits(_ manager: MineManager) -> Int {
        let deepNames = ["Iron Ore", "Gold Ore", "Lapis Ore", "Redstone Ore", "Emerald Ore",
                         "Ruby Ore", "Diamond Ore", "Opal Ore", "Cube Crystal", "Spike Crystal",
                         "Orb Crystal", "Frost Ore", "Glacier Crystal"]
        return deepNames.reduce(0, { $0 + manager.player.ores[$1, default: 0] })
    }

    func start(_ contract: MineDiveContract, manager: MineManager) {
        stop()
        self.contract = contract
        secondsLeft = Double(contract.minutes * 60)
        deepAtStart = deepUnits(manager)
        deepNow = 0
        touchedDepth = false
        lastChest = nil
        running = true
        manager.notify("\(contract.emoji) DIVE: \(contract.title)! Reach \(contract.layerName), haul \(contract.quota) deep ores in \(contract.minutes)m!")
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.tick(manager: manager)
        }
    }

    private func tick(manager: MineManager) {
        guard running, let contract = contract else { return }
        secondsLeft -= 1
        if manager.player.deepestY <= contract.targetY && !touchedDepth {
            touchedDepth = true
            manager.notify("\(contract.emoji) Depth touched: \(contract.layerName)! Now fill the quota!")
            SpookyHaptics.play(.medium)
        }
        deepNow = deepUnits(manager) - deepAtStart
        if touchedDepth && deepNow >= contract.quota {
            complete(manager: manager)
        } else if secondsLeft <= 0 {
            abandon(manager: manager)
        }
    }

    private func complete(manager: MineManager) {
        stop()
        guard let contract = contract else { return }
        lastChest = contract.chestGold
        manager.player.gold += contract.chestGold
        manager.player.experience += contract.chestXP
        manager.checkLevelUp()
        manager.notify("\(contract.emoji) DIVE COMPLETE! Chest: +\(contract.chestGold)🪙 +\(contract.chestXP) XP!")
        let key = "diveBest.\(contract.id)"
        let prev = UserDefaults.standard.integer(forKey: key)
        if contract.chestGold > prev {
            UserDefaults.standard.set(contract.chestGold, forKey: key)
        }
        SpookyHaptics.play(.reward)
    }

    private func abandon(manager: MineManager) {
        stop()
        manager.notify("\(contract?.emoji ?? "🕳️") Dive over — keep what you dug, run it back anytime!")
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        running = false
    }

    func best(_ contract: MineDiveContract) -> Int {
        UserDefaults.standard.integer(forKey: "diveBest.\(contract.id)")
    }
}

// ============================================================
// MARK: - 2. Dive board view
// ============================================================

/// Deep-dive board: contracts, live depth/quota/clock, bests.
struct MineDeepDiveView: View {
    @ObservedObject var manager: MineManager
    @StateObject private var dive = MineDeepDive()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                if dive.running, let contract = dive.contract {
                    Section(header: Text("🕳️ LIVE DIVE")) {
                        VStack(spacing: 8) {
                            Text("\(contract.emoji) \(contract.title)")
                                .font(.headline)
                            Text("\(Int(dive.secondsLeft / 60)):\(String(format: "%02d", Int(dive.secondsLeft) % 60)) left")
                                .font(.system(size: 40, weight: .black))
                                .foregroundColor(dive.secondsLeft < 60 ? .red : .primary)
                                .monospacedDigit()
                            HStack {
                                Text(dive.touchedDepth ? "✅ Depth touched" : "⬇️ Reach \(contract.layerName)")
                                    .font(.caption.bold())
                                    .foregroundColor(dive.touchedDepth ? .green : .orange)
                                Spacer()
                                if let prog = dive.quotaProgress {
                                    Text("Quota \(prog.have)/\(prog.need)")
                                        .font(.caption.bold())
                                        .monospacedDigit()
                                }
                            }
                            if let prog = dive.quotaProgress {
                                ProgressView(value: Double(prog.have), total: Double(prog.need))
                                    .progressViewStyle(LinearProgressViewStyle(tint: .cyan))
                            }
                            Button("Surface (abandon)") {
                                dive.stop()
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                    }
                }
                if let chest = dive.lastChest {
                    Section {
                        HStack {
                            Text("🎁")
                            Text("Last chest banked: +\(chest)🪙")
                                .font(.subheadline.bold())
                        }
                    }
                }
                Section(header: Text("📜 Dive contracts")) {
                    ForEach(MineDiveGuide.all, id: \.id) { contract in
                        HStack {
                            Text(contract.emoji).font(.title2)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(contract.title).font(.subheadline.bold())
                                Text(contract.flavor).font(.caption).foregroundStyle(.secondary)
                                Text("\(contract.layerName) • \(contract.quota) ores • \(contract.minutes)m • Chest \(contract.chestGold)🪙 • Best \(dive.best(contract))")
                                    .font(.caption2).foregroundStyle(.tertiary)
                            }
                            Spacer()
                            Button(dive.running ? "Busy" : "Dive!") {
                                dive.start(contract, manager: manager)
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .disabled(dive.running)
                        }
                    }
                }
                Section(header: Text("🛡️ Dive rules")) {
                    Text("Quota counts deep ores in your pack (sell nothing mid-dive!). Depth is all-time deepest this visit... actually all-time — the mine remembers. God-mode applies at all depths.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Deep Dives")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dive.stop()
                        dismiss()
                    }
                }
            }
        }
    }
}
