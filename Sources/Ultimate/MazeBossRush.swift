//
//  MazeBossRush.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Boss Rush gauntlet: the five maze bosses as a checklist with kill
//  tracking (one hook in the combat path), per-boss bounties, a completion
//  crown, and a showcase card. Death is impossible; glory is mandatory.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Gauntlet model
// ============================================================

/// One gauntlet boss: display data + bounty.
struct MazeRushBoss {
    var name: String
    var emoji: String
    var title: String
    var bountyScore: Int
    var bountyGold: Int
    var tip: String
}

enum MazeRushGuide {
    static var all: [MazeRushBoss] = [
        MazeRushBoss(name: "Elder Guardian", emoji: "👑", title: "Royalty of the Deep",
                     bountyScore: 500, bountyGold: 200, tip: "Burst the adds, shield the enrage."),
        MazeRushBoss(name: "Wither", emoji: "💀", title: "The Final Exam",
                     bountyScore: 700, bountyGold: 300, tip: "Strafe, pillar, punish. Sprint always."),
        MazeRushBoss(name: "Ender Dragon", emoji: "🐉", title: "Landlord of the Sky",
                     bountyScore: 900, bountyGold: 400, tip: "Ranged in the air, everything on the perch."),
        MazeRushBoss(name: "Void Lord", emoji: "👿", title: "Middle Manager of the Abyss",
                     bountyScore: 1100, bountyGold: 500, tip: "Swing at landings, never at fades."),
        MazeRushBoss(name: "Shadow King", emoji: "🌑", title: "The Final Answer",
                     bountyScore: 1500, bountyGold: 700, tip: "Everything maxed. No fear (literally can't die)."),
    ]

    /// Match a slain monster name to a gauntlet boss (substring, forgiving).
    static func match(_ monsterName: String) -> MazeRushBoss? {
        let lower = monsterName.lowercased()
        return all.first(where: {
            lower.contains($0.name.lowercased()) || $0.name.lowercased().contains(lower)
        })
    }
}

// ============================================================
// MARK: - 2. Rush board (kill tracking + bounties)
// ============================================================

/// Gauntlet board: downed set persisted, bounties via onReward.
final class MazeRushBoard: ObservableObject {
    @Published private(set) var downed: Set<String> = []
    @Published private(set) var runsCompleted: Int = 0

    var onReward: ((Int, Int) -> Void)?

    private let downedKey = "mazeRushDowned.v1"
    private let runsKey = "mazeRushRuns.v1"

    init() {
        downed = Set(UserDefaults.standard.stringArray(forKey: downedKey) ?? [])
        runsCompleted = UserDefaults.standard.integer(forKey: runsKey)
    }

    /// Record a boss kill by monster name. Returns the matched boss.
    @discardableResult
    func recordKill(monsterName: String) -> MazeRushBoss? {
        guard let boss = MazeRushGuide.match(monsterName) else { return nil }
        var fresh = false
        if !downed.contains(boss.name) {
            downed.insert(boss.name)
            fresh = true
        }
        onReward?(boss.bountyScore, boss.bountyGold)
        if downed.count >= MazeRushGuide.all.count {
            // Full clear: crown bonus + reset the gauntlet for another run.
            runsCompleted += 1
            UserDefaults.standard.set(runsCompleted, forKey: runsKey)
            onReward?(2000, 1000)
            downed = []
            save()
            return boss
        }
        if fresh {
            save()
        }
        return boss
    }

    var progress: Int { downed.count }
    var total: Int { MazeRushGuide.all.count }

    private func save() {
        UserDefaults.standard.set(Array(downed), forKey: downedKey)
    }

    func reset() {
        downed = []
        save()
    }
}

// ============================================================
// MARK: - 3. Rush view
// ============================================================

/// Boss Rush sheet: five posters, bounties, crown counter.
struct MazeRushView: View {
    @ObservedObject var board: MazeRushBoard
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("👑 Gauntlet (\(board.progress)/\(board.total)) • Crowns: \(board.runsCompleted)")) {
                    Text("Down all five bosses for a 👑 crown run (+2000 pts +1000🪙) — then the gauntlet resets and you run it back.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                ForEach(MazeRushGuide.all, id: \.name) { boss in
                    let down = board.downed.contains(boss.name)
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(boss.emoji).font(.largeTitle)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(boss.name).font(.headline)
                                Text(boss.title).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if down {
                                Text("DOWN ✅").font(.caption.bold()).foregroundColor(.green)
                            } else {
                                Text("AT LARGE").font(.caption.bold()).foregroundColor(.red)
                            }
                        }
                        Text("Tactic: \(boss.tip)")
                            .font(.caption).foregroundColor(.orange)
                        HStack {
                            Text("Bounty: \(boss.bountyScore) pts +\(boss.bountyGold)🪙")
                                .font(.caption).foregroundColor(.yellow)
                            Spacer()
                        }
                    }
                    .padding(.vertical, 4)
                    .opacity(down ? 0.75 : 1.0)
                }
                Section {
                    Button("Reset gauntlet") { board.reset() }
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .navigationTitle("Boss Rush")
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
