//
//  MineTimeTrials.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Timed dig sprints: 90-second and 3-minute trials with live score,
//  poll-based progress (snapshots at start, diffs live — zero hooks),
//  best records in UserDefaults, and a trial card view.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Trial engine (poll-based, zero hooks)
// ============================================================

/// Trial rule set.
struct MineTrialRule {
    var id: String
    var title: String
    var emoji: String
    var seconds: Int
    var target: Int // blocks to beat
    var rewardGold: Int
    var rewardXP: Int
    var flavor: String
}

enum MineTrialGuide {
    static var all: [MineTrialRule] = [
        MineTrialRule(id: "sprint-90", title: "90-Second Sprint", emoji: "⚡", seconds: 90, target: 25, rewardGold: 300, rewardXP: 200,
                      flavor: "Pure pick fury. Wreck 25 blocks before the lamp gutters."),
        MineTrialRule(id: "shift-180", title: "3-Minute Shift", emoji: "⛏️", seconds: 180, target: 45, rewardGold: 700, rewardXP: 450,
                      flavor: "A full shift at sprint pace. Pace the thumbs."),
        MineTrialRule(id: "marathon-300", title: "5-Minute Marathon", emoji: "🏃", seconds: 300, target: 70, rewardGold: 1300, rewardXP: 900,
                      flavor: "Endurance digging. Bombs count. Everything counts."),
    ]
}

/// Live trial session: snapshots at start, diffs each tick.
final class MineTimeTrial: ObservableObject {
    @Published private(set) var rule: MineTrialRule?
    @Published private(set) var secondsLeft: Double = 0
    @Published private(set) var blocksAtStart: Int = 0
    @Published private(set) var running: Bool = false
    @Published private(set) var lastResult: (won: Bool, blocks: Int)?

    private var timer: Timer?

    var progress: (blocks: Int, target: Int)? {
        guard let rule = rule else { return nil }
        return (currentBlocks, rule.target)
    }

    private var currentBlocks: Int = 0

    func start(_ rule: MineTrialRule, manager: MineManager) {
        stop(silent: true)
        self.rule = rule
        secondsLeft = Double(rule.seconds)
        blocksAtStart = manager.player.blocksMined
        currentBlocks = 0
        running = true
        manager.notify("\(rule.emoji) \(rule.title) started! \(rule.target) blocks in \(rule.seconds)s!")
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.tick(manager: manager)
        }
    }

    private func tick(manager: MineManager) {
        guard running else { return }
        secondsLeft -= 0.5
        currentBlocks = manager.player.blocksMined - blocksAtStart
        if secondsLeft <= 0 {
            finish(manager: manager)
        }
    }

    private func finish(manager: MineManager) {
        stop(silent: true)
        guard let rule = rule else { return }
        let won = currentBlocks >= rule.target
        lastResult = (won, currentBlocks)
        if won {
            manager.player.gold += rule.rewardGold
            manager.player.experience += rule.rewardXP
            manager.checkLevelUp()
            manager.notify("\(rule.emoji) TRIAL SMASHED! \(currentBlocks) blocks! +\(rule.rewardGold)🪙 +\(rule.rewardXP) XP!")
            let key = "trialBest.\(rule.id)"
            let prev = UserDefaults.standard.integer(forKey: key)
            if currentBlocks > prev {
                UserDefaults.standard.set(currentBlocks, forKey: key)
                manager.notify("🏆 New \(rule.title) record: \(currentBlocks) blocks!")
            }
            SpookyHaptics.play(.reward)
        } else {
            manager.notify("\(rule.emoji) Trial over: \(currentBlocks)/\(rule.target). So close — run it back!")
            SpookyHaptics.play(.warning)
        }
    }

    /// Stop the clock. `silent` skips any fanfare (used on restart).
    func stop(silent: Bool = false) {
        timer?.invalidate()
        timer = nil
        running = false
    }

    func best(_ rule: MineTrialRule) -> Int {
        UserDefaults.standard.integer(forKey: "trialBest.\(rule.id)")
    }
}

// ============================================================
// MARK: - 2. Trial card view
// ============================================================

/// Time-trial card: rules, live countdown + progress, bests.
struct MineTrialView: View {
    @ObservedObject var manager: MineManager
    @StateObject private var trial = MineTimeTrial()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                if trial.running, let rule = trial.rule, let prog = trial.progress {
                    Section(header: Text("⏱️ LIVE TRIAL")) {
                        VStack(spacing: 8) {
                            Text("\(rule.emoji) \(rule.title)")
                                .font(.headline)
                            Text("\(Int(trial.secondsLeft))s left")
                                .font(.system(size: 44, weight: .black))
                                .foregroundColor(trial.secondsLeft < 15 ? .red : .primary)
                                .monospacedDigit()
                            ProgressView(value: Double(min(prog.blocks, prog.target)), total: Double(prog.target))
                                .progressViewStyle(LinearProgressViewStyle(tint: .orange))
                            Text("\(prog.blocks)/\(prog.target) blocks")
                                .font(.subheadline.bold())
                                .monospacedDigit()
                            Button("Abandon trial") {
                                trial.stop()
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                    }
                }
                if let result = trial.lastResult {
                    Section {
                        HStack {
                            Text(result.won ? "🎉" : "💪")
                            Text(result.won ? "Trial smashed: \(result.blocks) blocks!" : "Trial done: \(result.blocks) blocks. Run it back!")
                                .font(.subheadline.bold())
                        }
                    }
                }
                Section(header: Text("🏁 Pick your pain")) {
                    ForEach(MineTrialGuide.all, id: \.id) { rule in
                        HStack {
                            Text(rule.emoji).font(.title2)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(rule.title).font(.subheadline.bold())
                                Text(rule.flavor).font(.caption).foregroundStyle(.secondary)
                                Text("Target \(rule.target) blocks • Pays \(rule.rewardGold)🪙 +\(rule.rewardXP) XP • Best \(trial.best(rule))")
                                    .font(.caption2).foregroundStyle(.tertiary)
                            }
                            Spacer()
                            Button(trial.running ? "Busy" : "Go!") {
                                trial.start(rule, manager: manager)
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .disabled(trial.running)
                        }
                    }
                }
                Section(header: Text("📏 House rules")) {
                    Text("Bombs count. Closets count. Everything you break counts. God-mode means the only thing at risk is your pride.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Time Trials")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        trial.stop()
                        dismiss()
                    }
                }
            }
        }
    }
}
