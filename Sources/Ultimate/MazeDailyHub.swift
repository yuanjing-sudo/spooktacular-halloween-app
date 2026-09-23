//
//  MazeDailyHub.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Daily hub for the Tunnel Maze: maze streak flame with calendar, tip of
//  the day, featured expedition (first active quest as today's focus),
//  region/bond/score snapshot, streak-reward claim and a reward ladder.
//  Bound to the maze manager's boards; streak state in SpookyStore.
//

import SwiftUI

// ============================================================
// MARK: - 1. Maze streak engine (own keys, own cadence)
// ============================================================

/// Maze streak rules: same shape as the mine's, separate counter.
enum MazeStreakRules {
    static func reward(streak: Int) -> Int {
        min(4000, 80 * max(1, streak) + (max(1, streak) / 7) * 400)
    }

    static var milestones: [(day: Int, title: String, emoji: String)] {
        [
            (1, "First descent", "👣"),
            (3, "Tunnel regular", "🔦"),
            (7, "Week in the dark", "🗓️"),
            (14, "Cartographer elite", "🗺️"),
            (30, "Month of cubes", "📦"),
            (60, "Warden of the warrens", "🌀"),
            (100, "Myth of the maze", "👑"),
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

    private static var countKey: String { "mazeStreak.count" }
    private static var dayKey: String { "mazeStreak.day" }
    private static var claimKey: String { "mazeHubClaim" }

    /// Record today's visit. Returns (streak, isNewDay).
    static func touch(today: String = SpookyStore.todayString()) -> (streak: Int, isNewDay: Bool) {
        let last = SpookyStore.string(dayKey, default: "")
        if last == today {
            return (SpookyStore.int(countKey, default: 1), false)
        }
        var streak = 1
        if !last.isEmpty,
           let gap = SpookyStore.daysBetween(last, today), gap == 1 {
            streak = SpookyStore.int(countKey, default: 0) + 1
        }
        SpookyStore.set(streak, countKey)
        SpookyStore.set(today, dayKey)
        return (streak, true)
    }

    static func claimedToday() -> Bool {
        SpookyStore.string(claimKey, default: "") == SpookyStore.todayString()
    }

    static func markClaimed() {
        SpookyStore.set(SpookyStore.todayString(), claimKey)
    }
}

// ============================================================
// MARK: - 2. Daily hub view
// ============================================================

/// Maze daily hub sheet: streak, featured expedition, snapshots, claim.
struct MazeDailyHubView: View {
    @ObservedObject var expeditions: MazeExpeditionBoard
    @ObservedObject var regions: MazeRegionDirector
    @ObservedObject var bonds: BoxyBondLedger
    var score: Int
    var gold: Int
    var onClaimReward: (Int) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var streak = 0
    @State private var isNewDay = false
    @State private var claimed = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Streak flame header.
                    VStack(spacing: 8) {
                        MazeStreakFlame(streak: streak)
                        if let m = MazeStreakRules.milestone(for: streak) {
                            Text("\(m.emoji) \(m.title)")
                                .font(.subheadline.bold())
                                .foregroundColor(.orange)
                        }
                        if let next = MazeStreakRules.nextMilestone(after: streak) {
                            Text("Next: \(next.emoji) \(next.title) at day \(next.day)")
                                .font(.caption).foregroundStyle(.secondary)
                        } else {
                            Text("All milestones conquered. Mythic.")
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
                                        .fill(lit ? Color.purple : Color.gray.opacity(0.3))
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
                        Text("🎁 Daily reward: \(MazeStreakRules.reward(streak: max(1, streak)))🪙")
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
                    // Featured expedition (today's focus).
                    VStack(spacing: 8) {
                        Text("🧭 Today's focus").font(.headline)
                        if let focus = expeditions.active.first {
                            MazeAnimatedExpeditionRow(
                                icon: focus.icon, title: focus.title,
                                progress: expeditions.progressOf(focus), target: focus.target,
                                reward: "\(focus.rewardScore) pts +\(focus.rewardGold)🪙",
                                tip: focus.tip,
                                done: expeditions.isDone(focus),
                                claimed: expeditions.claimed.contains(focus.id),
                                onClaim: { _ = expeditions.claim(focus) }
                            )
                            .padding(.horizontal)
                        } else {
                            VStack(spacing: 6) {
                                Text("👑").font(.system(size: 40))
                                Text("Every expedition complete. The maze bows.")
                                    .font(.subheadline)
                            }
                        }
                    }
                    // Tip of the day.
                    VStack(spacing: 6) {
                        Text("💡 Maze tip of the day").font(.headline)
                        Text("🌀 \(SpookyTips.today().maze)")
                            .font(.subheadline)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .padding()
                    .background(Color.purple.opacity(0.08))
                    .cornerRadius(14)
                    .padding(.horizontal)
                    // Snapshot row.
                    HStack(spacing: 12) {
                        snapshotCard(
                            emoji: "🧭",
                            title: "Expeditions",
                            value: "\(expeditions.doneCount)/\(MazeExpeditionCatalog.all.count)"
                        )
                        snapshotCard(
                            emoji: "🗺️",
                            title: "Regions",
                            value: "\(regions.mappedCount)/\(MazeRegionAtlas.all.count)"
                        )
                        snapshotCard(
                            emoji: "📦",
                            title: "Bond avg",
                            value: String(format: "%.1f", bonds.averageLevel)
                        )
                    }
                    .padding(.horizontal)
                    HStack(spacing: 12) {
                        snapshotCard(emoji: "⭐", title: "Score", value: "\(score)")
                        snapshotCard(emoji: "💰", title: "Gold", value: "\(gold)")
                        snapshotCard(emoji: "💖", title: "Bestie", value: bonds.bestFriend)
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
                                Text("\(MazeStreakRules.reward(streak: day))🪙")
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
            .navigationTitle("Maze Daily Hub")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear {
                let touch = MazeStreakRules.touch()
                streak = touch.streak
                isNewDay = touch.isNewDay
                claimed = MazeStreakRules.claimedToday()
            }
        }
        .preferredColorScheme(.dark)
    }

    private func snapshotCard(emoji: String, title: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(emoji).font(.title2)
            Text(value).font(.headline).monospacedDigit()
            Text(title).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.08))
        .cornerRadius(12)
    }

    private func claim() {
        guard !claimed else { return }
        claimed = true
        MazeStreakRules.markClaimed()
        onClaimReward(MazeStreakRules.reward(streak: max(1, streak)))
        SpookyHaptics.play(.reward)
    }
}

// ============================================================
// MARK: - 3. Maze streak flame
// ============================================================

/// Streak flame twin: violet fire scaled by streak length.
struct MazeStreakFlame: View {
    var streak: Int
    @State private var lick = false

    private var tint: Color {
        if streak >= 20 { return .purple }
        if streak >= 10 { return .pink }
        if streak >= 5 { return .orange }
        return .gray
    }

    var body: some View {
        HStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(tint.opacity(0.25))
                    .frame(width: 64, height: 64)
                    .scaleEffect(lick ? 1.12 : 0.95)
                    .animation(
                        .easeInOut(duration: streak >= 10 ? 0.6 : 1.2).repeatForever(autoreverses: true),
                        value: lick
                    )
                Text("🔥")
                    .font(.system(size: streak >= 10 ? 40 : 32))
                    .scaleEffect(y: lick ? 1.12 : 0.94, anchor: .bottom)
                    .animation(
                        .easeInOut(duration: streak >= 10 ? 0.6 : 1.2).repeatForever(autoreverses: true),
                        value: lick
                    )
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("\(streak)-day streak")
                    .font(.title2.bold())
                    .monospacedDigit()
                Text(streak >= 20 ? "MYTHIC" : (streak >= 10 ? "BLAZING" : (streak >= 5 ? "WARMING" : "KINDLING")))
                    .font(.caption.bold())
                    .foregroundColor(tint)
            }
        }
        .padding(10)
        .background(Color.black.opacity(0.45))
        .cornerRadius(14)
        .onAppear { lick.toggle() }
    }
}
