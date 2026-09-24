//
//  MineContracts.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Bounty contracts: townsfolk post orders for ores, fish and gems.
//  Turn in stockpiles for premium rates + tips. The board restocks daily
//  (seeded); turn-ins deduct from the backpack and pay through the manager.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Contract model + daily board
// ============================================================

/// One posted order: deliver goods, earn premium + reputation.
struct MineContract: Identifiable {
    let id = UUID()
    var client: String
    var clientEmoji: String
    var want: String // ore/fish name
    var need: Int
    var pay: Int
    var tip: Int // XP
    var flavor: String
}

/// Daily contract board: seeded restock, turn-in logic, reputation.
final class MineContractBoard: ObservableObject {
    @Published private(set) var contracts: [MineContract] = []
    @Published private(set) var fulfilledToday: Int = 0
    @Published private(set) var reputation: Int = 0

    private let repKey = "mineContractRep.v1"
    private let dayKey = "mineContractDay.v1"
    private let doneKey = "mineContractDone.v1"

    init() {
        reputation = UserDefaults.standard.integer(forKey: repKey)
        restockIfNeeded(force: true)
    }

    /// Clients with flavor.
    private static var clients: [(String, String)] {
        [
            ("Blacksmith Bess", "⚒️"), ("Chef Gouda", "🧀"), ("Warden Wisp", "✨"),
            ("Mole King", "🦔"), ("Lamp Lighter Lou", "🏮"), ("Gemcutter Gemma", "💎"),
            ("Bat Breeder Barry", "🦇"), ("Druid Moss", "🌿"), ("Captain Candle", "🕯️"),
            ("Professor Pebble", "🦉"),
        ]
    }

    /// Restock when the day turns (or first run).
    func restockIfNeeded(force: Bool = false) {
        let today = SpookyStore.todayString()
        let last = UserDefaults.standard.string(forKey: dayKey) ?? ""
        guard force || last != today else { return }
        UserDefaults.standard.set(today, forKey: dayKey)
        UserDefaults.standard.set(0, forKey: doneKey)
        fulfilledToday = 0
        var rng = SeededRNG(seed: UInt64(abs(today.hashValue)))
        let wants = [
            ("Iron Ore", 6, 90), ("Gold Ore", 4, 140), ("Coal Ore", 10, 70),
            ("Emerald Ore", 3, 220), ("Ruby Ore", 2, 260), ("Diamond Ore", 2, 300),
            ("Frost Ore", 5, 130), ("Lapis Ore", 4, 150), ("Cave Minnow", 3, 60),
            ("Gold Ore", 8, 240), ("Opal Ore", 1, 320), ("Crystal Orb", 2, 200),
        ]
        var picks: [MineContract] = []
        var usedClients = Set<String>()
        for _ in 0..<4 {
            guard let want = rng.pick(wants) else { break }
            var client = clients[rng.nextInt(in: 0..<clients.count)]
            var guardCount = 0
            while usedClients.contains(client.0) && guardCount < 10 {
                client = clients[rng.nextInt(in: 0..<clients.count)]
                guardCount += 1
            }
            usedClients.insert(client.0)
            let mult = 1.0 + Double(reputation) * 0.02
            picks.append(MineContract(
                client: client.0, clientEmoji: client.1,
                want: want.0, need: want.1,
                pay: Int(Double(want.2) * mult),
                tip: want.2 / 2,
                flavor: contractFlavor(client: client.0, want: want.0)
            ))
        }
        contracts = picks
    }

    private func contractFlavor(client: String, want: String) -> String {
        let lines = [
            "Pays on delivery. No small talk. (\(client) winks.)",
            "Needed yesterday for \(want.lowercased()). Today will do. Hurry.",
            "Top coin for clean \(want.lowercased()). No questions, no crumbs.",
            "The mine provides; \(client) pays. Everybody wins, especially you.",
        ]
        return lines[abs(client.hashValue + want.hashValue) % lines.count]
    }

    /// Stock on hand (ores + fish).
    func have(_ want: String, manager: MineManager) -> Int {
        if want == "Crystal Orb" {
            return manager.player.ores["Orb Crystal", default: 0]
        }
        if MNFishGuide.all.contains(where: { $0.name == want }) {
            return manager.fishCaught[want, default: 0]
        }
        return manager.player.ores[want, default: 0]
    }

    /// Turn in a contract: deduct stock, pay premium + XP + reputation.
    @discardableResult
    func fulfill(_ contract: MineContract, manager: MineManager) -> Bool {
        guard have(contract.want, manager: manager) >= contract.need else { return false }
        if contract.want == "Crystal Orb" {
            manager.player.ores["Orb Crystal", default: 0] -= contract.need
        } else if MNFishGuide.all.contains(where: { $0.name == contract.want }) {
            manager.fishCaught[contract.want, default: 0] -= contract.need
        } else {
            manager.player.ores[contract.want, default: 0] -= contract.need
        }
        manager.player.gold += contract.pay
        manager.player.experience += contract.tip
        manager.checkLevelUp()
        reputation += 1
        fulfilledToday += 1
        UserDefaults.standard.set(reputation, forKey: repKey)
        UserDefaults.standard.set(fulfilledToday, forKey: doneKey)
        contracts.removeAll(where: { $0.id == contract.id })
        manager.notify("📋 \(contract.client) pays +\(contract.pay)🪙 for \(contract.need)× \(contract.want)! (rep \(reputation))")
        SpookyHaptics.play(.reward)
        return true
    }
}

// ============================================================
// MARK: - 2. Contract board view
// ============================================================

/// Bounty board sheet: today's orders with live stock + turn-in.
struct MineContractView: View {
    @ObservedObject var manager: MineManager
    @StateObject private var board = MineContractBoard()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("📋 Today's orders (rep \(board.reputation))")) {
                    Text("Reputation raises every payout +2%. Fulfilled today: \(board.fulfilledToday). New orders at midnight.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                if board.contracts.isEmpty {
                    Section {
                        VStack(spacing: 8) {
                            Text("🎉").font(.system(size: 44))
                            Text("Board clear! The town eats tonight.")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    }
                } else {
                    Section(header: Text("Orders")) {
                        ForEach(board.contracts) { contract in
                            contractRow(contract)
                        }
                    }
                }
            }
            .navigationTitle("Bounty Board")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear { board.restockIfNeeded() }
        }
    }

    private func contractRow(_ contract: MineContract) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(contract.clientEmoji).font(.title2)
                VStack(alignment: .leading, spacing: 2) {
                    Text(contract.client).font(.headline)
                    Text(contract.flavor).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
            }
            HStack {
                Text("\(contract.want) ×\(contract.need)")
                    .font(.subheadline.bold())
                Spacer()
                let have = board.have(contract.want, manager: manager)
                Text("\(min(have, contract.need))/\(contract.need)")
                    .font(.subheadline.bold())
                    .foregroundColor(have >= contract.need ? .green : .orange)
                    .monospacedDigit()
            }
            ProgressView(value: Double(min(board.have(contract.want, manager: manager), contract.need)), total: Double(contract.need))
                .progressViewStyle(LinearProgressViewStyle(tint: .orange))
            HStack {
                Text("Pays \(contract.pay)🪙 +\(contract.tip) XP")
                    .font(.caption).foregroundColor(.yellow)
                Spacer()
                Button("Deliver") {
                    _ = board.fulfill(contract, manager: manager)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .tint(.green)
                .disabled(board.have(contract.want, manager: manager) < contract.need)
            }
        }
        .padding(.vertical, 4)
    }
}
