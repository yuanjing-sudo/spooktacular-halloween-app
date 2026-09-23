//
//  MineDailyHub.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Daily hub: login-streak flame with a 7-day calendar, tip of the day,
//  spin status, quest snapshot, streak-reward claim and a reward ladder.
//  Bound to MineManager for balances; streak state lives in SpookyStore.
//

import SwiftUI

// ============================================================
// MARK: - 1. Streak engine (backed by SpookyStore)
// ============================================================

/// Daily streak rules: +1 per consecutive day, Sunday bonus, rewards.
enum MineStreakRules {
    /// Reward gold for a streak day (ramps, caps at day 30 math).
    static func reward(streak: Int) -> Int {
        min(5000, 100 * max(1, streak) + (max(1, streak) / 7) * 500)
    }

    /// Milestone days with bonus titles.
    static var milestones: [(day: Int, title: String, emoji: String)] {
        [
            (1, "First footstep", "👣"),
            (3, "Warming up", "🔥"),
            (7, "Full week!", "🗓️"),
            (14, "Fortnight fiend", "🧛"),
            (30, "Month of the mole", "🦔"),
            (60, "Seasoned spelunker", "⛏️"),
            (100, "Centurion of the deep", "👑"),
        ]
    }

    static func milestone(for streak: Int) -> (day: Int, title: String, emoji: String)? {
        milestones.filter({ $0.day <= streak }).last
    }

    static func nextMilestone(after streak: Int) -> (day: Int, title: String, emoji: String)? {
        milestones.first(where: { $0.day > streak })
    }

    /// Weekday letter for calendar dots (0 = today going back).
    static func weekdayLetter(daysAgo: Int, today: Date = Date()) -> String {
        let cal = Calendar.current
        guard let date = cal.date(byAdding: .day, value: -daysAgo, to: today) else {
            return "•"
        }
        let symbols = cal.shortWeekdaySymbols
        let index = (cal.component(.weekday, from: date) - 1 + symbols.count) % symbols.count
        return String(symbols[index].prefix(1))
    }
}

// ============================================================
// MARK: - 2. Daily hub view
// ============================================================

/// Daily hub sheet: streak, tip, spin, quests, stats, claim.
struct MineDailyHubView: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss
    @State private var streak = 0
    @State private var isNewDay = false
    @State private var claimed = false
    @State private var showSpin = false

    private let claimKey = "dailyHubClaim"

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Streak flame header.
                    VStack(spacing: 8) {
                        MineStreakFlame(streak: streak)
                        if let m = MineStreakRules.milestone(for: streak) {
                            Text("\(m.emoji) \(m.title)")
                                .font(.subheadline.bold())
                                .foregroundColor(.orange)
                        }
                        if let next = MineStreakRules.nextMilestone(after: streak) {
                            Text("Next: \(next.emoji) \(next.title) at day \(next.day)")
                                .font(.caption).foregroundStyle(.secondary)
                        } else {
                            Text("All milestones conquered. Legendary.")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.top, 8)
                    // 7-day calendar dots.
                    VStack(spacing: 8) {
                        Text("This week").font(.headline)
                        HStack(spacing: 10) {
                            ForEach(0..<7, id: \.self) { ago in
                                let lit = ago < min(streak, 7)
                                VStack(spacing: 4) {
                                    Circle()
                                        .fill(lit ? Color.orange : Color.gray.opacity(0.3))
                                        .frame(width: 30, height: 30)
                                        .overlay(
                                            Text(lit ? "🔥" : MineStreakRules.weekdayLetter(daysAgo: ago))
                                                .font(.caption)
                                        )
                                        .scaleEffect(ago == 0 && isNewDay ? 1.2 : 1.0)
                                    Text(ago == 0 ? "today" : MineStreakRules.weekdayLetter(daysAgo: ago))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                    // Streak reward claim.
                    VStack(spacing: 8) {
                        Text("🎁 Daily reward: \(MineStreakRules.reward(streak: max(1, streak)))🪙")
                            .font(.headline)
                        Button(action: claim) {
                            Label(
                                claimed ? "Claimed — see you tomorrow!" : "Claim today's reward",
                                systemImage: claimed ? "checkmark.seal.fill" : "gift.fill"
                            )
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(MineSpringButtonStyle(tint: claimed ? .gray : .green, glow: !claimed))
                        .disabled(claimed)
                        .padding(.horizontal, 40)
                    }
                    // Tip of the day.
                    VStack(spacing: 6) {
                        Text("💡 Tip of the day").font(.headline)
                        let tip = SpookyTips.today()
                        Text("⛏️ \(tip.mine)")
                            .font(.subheadline)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        Text("🌀 \(tip.maze)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .padding()
                    .background(Color.blue.opacity(0.08))
                    .cornerRadius(14)
                    .padding(.horizontal)
                    // Spin status.
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("🎡 Daily spin").font(.headline)
                            Text(manager.canSpinToday ? "Your spin is ready!" : "Spun — back at midnight.")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button(manager.canSpinToday ? "Spin!" : "View") { showSpin = true }
                            .buttonStyle(MineSpringButtonStyle(
                                tint: manager.canSpinToday ? .purple : .gray,
                                glow: manager.canSpinToday
                            ))
                    }
                    .padding(.horizontal)
                    // Quest + expedition snapshot.
                    HStack(spacing: 12) {
                        snapshotCard(
                            emoji: "📜",
                            title: "Mine quests",
                            value: "\(manager.questBoard.doneCount)/\(manager.questBoard.totalCount)"
                        )
                        snapshotCard(
                            emoji: "💰",
                            title: "Wallet",
                            value: "\(manager.player.gold)🪙"
                        )
                        snapshotCard(
                            emoji: "⭐",
                            title: "Rank",
                            value: "Lv.\(manager.player.level)"
                        )
                    }
                    .padding(.horizontal)
                    // Reward ladder.
                    VStack(alignment: .leading, spacing: 6) {
                        Text("🪜 Reward ladder").font(.headline).padding(.horizontal)
                        ForEach([1, 3, 7, 14, 30], id: \.self) { day in
                            HStack {
                                Text(day == 1 ? "📅" : (day < 14 ? "🔥" : "👑"))
                                Text("Day \(day)")
                                    .font(.subheadline.bold())
                                Spacer()
                                Text("\(MineStreakRules.reward(streak: day))🪙")
                                    .font(.subheadline.bold())
                                    .foregroundColor(streak >= day ? .green : .gray)
                                    .monospacedDigit()
                                if streak >= day {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Daily Hub")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showSpin) {
                MineDailyWheelView(manager: manager)
            }
            .onAppear {
                let touch = SpookyStore.touchLoginStreak()
                streak = touch.streak
                isNewDay = touch.isNewDay
                claimed = SpookyStore.string(claimKey, default: "") == SpookyStore.todayString()
            }
        }
    }

    private func snapshotCard(emoji: String, title: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(emoji).font(.title2)
            Text(value).font(.headline).monospacedDigit()
            Text(title).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }

    private func claim() {
        guard !claimed else { return }
        claimed = true
        let amount = MineStreakRules.reward(streak: max(1, streak))
        manager.player.gold += amount
        manager.player.experience += amount / 4
        manager.checkLevelUp()
        manager.notify("🎁 Day \(max(1, streak)) reward claimed! +\(amount)🪙")
        SpookyStore.set(SpookyStore.todayString(), claimKey)
        SpookyHaptics.play(.reward)
    }
}
