//
//  SpookyProEngine.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Pro layer: pure scoring math, deterministic daily challenges,
//  persistent leaderboard, ghost AI brain, haptics composer,
//  and a SwiftUI dashboard. Zero new dependencies, iOS 17+, Swift 5.10.
//  All game-logic is pure/testable; only the leaf Views touch SwiftUI.
//

import SwiftUI
import Combine
import CoreHaptics
import UserNotifications

// ============================================================
// MARK: - 1. ProScoringEngine (pure, Sendable, unit-testable)
// ============================================================

/// Deterministic scoring math. No randomness, no singletons, no UI.
/// Every function is a pure function of its inputs so it can be unit-tested
/// on Linux / Windows without Xcode.
struct ProScoringEngine: Sendable {

    /// Combo multiplier: 1.0 + 5% per combo step, capped at 3x.
    /// - Parameter combo: consecutive captures without fleeing (0 = no combo).
    static func comboMultiplier(combo: Int) -> Double {
        guard combo > 0 else { return 1.0 }
        return min(3.0, 1.0 + Double(combo) * 0.05)
    }

    /// Streak bonus: flat gold-style bonus, quadratic-lite so long streaks matter.
    static func streakBonus(streak: Int) -> Int {
        guard streak > 0 else { return 0 }
        if streak >= 20 { return 100 + (streak - 20) * 5 }
        if streak >= 10 { return 40 + (streak - 10) * 6 }
        return streak * 2
    }

    /// Full capture score. Mirrors HalloweenUltimateManager.captureGhost
    /// economics but stays deterministic (caller passes base points).
    static func captureScore(
        basePoints: Int,
        combo: Int,
        isBoss: Bool,
        isShiny: Bool,
        rarity: GhostRarity
    ) -> Int {
        var score = Double(basePoints)
        score *= rarity.multiplier
        if isBoss { score *= 10 }
        if isShiny { score *= 5 }
        score *= comboMultiplier(combo: combo)
        return max(1, Int(score.rounded()))
    }

    /// Candy score with rare-candy triple rule kept in one place.
    static func candyScore(basePoints: Int, isRare: Bool, combo: Int) -> Int {
        let rare = isRare ? 3.0 : 1.0
        return max(1, Int((Double(basePoints) * rare * comboMultiplier(combo: combo)).rounded()))
    }

    /// XP needed for next level (level is 1-based). Gentle exponential curve.
    static func xpForNextLevel(level: Int) -> Int {
        max(50, Int(80.0 * pow(1.28, Double(max(1, level) - 1)).rounded()))
    }

    /// Returns (leveledUp, newLevel, remainingXP) after adding earned XP.
    static func applyXP(currentLevel: Int, currentXP: Int, earned: Int) -> (leveledUp: Bool, level: Int, xp: Int) {
        var level = max(1, currentLevel)
        var xp = max(0, currentXP) + max(0, earned)
        var leveled = false
        while xp >= xpForNextLevel(level: level) {
            xp -= xpForNextLevel(level: level)
            level += 1
            leveled = true
        }
        return (leveled, level, xp)
    }
}

// ============================================================
// MARK: - 2. Daily challenges (deterministic from date seed)
// ============================================================

/// A single daily challenge. Codable so progress survives restarts.
struct SpookyDailyChallenge: Identifiable, Codable, Equatable {
    var id: String          // "yyyy-MM-dd"
    var title: String
    var detail: String
    var targetGhosts: Int
    var targetCandy: Int
    var bonusGold: Int
    var bonusXP: Int
    var ghostsDone: Int
    var candyDone: Int
    var claimed: Bool

    var progress: Double {
        let g = targetGhosts > 0 ? Double(min(ghostsDone, targetGhosts)) / Double(targetGhosts) : 1
        let c = targetCandy > 0 ? Double(min(candyDone, targetCandy)) / Double(targetCandy) : 1
        return (g + c) / 2
    }

    var isComplete: Bool { ghostsDone >= targetGhosts && candyDone >= targetCandy }
}

/// Generates the challenge for a calendar day from a stable hash of the
/// date string, so every device shows the same challenge without a server.
enum DailyChallengeEngine {
    static func challengeID(for date: Date = Date()) -> String {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: date)
    }

    /// Tiny FNV-1a hash — stable across launches (Swift's Hasher is not).
    private static func seed(_ s: String) -> UInt64 {
        var h: UInt64 = 14695981039346656037
        for b in s.utf8 {
            h ^= UInt64(b)
            h = h &* 1099511628211
        }
        return h
    }

    private static func pick(_ seed: UInt64, salt: UInt64, options: [String]) -> String {
        options[Int((seed &+ salt) % UInt64(options.count))]
    }

    static func generate(for date: Date = Date()) -> SpookyDailyChallenge {
        let id = challengeID(for: date)
        let s = seed(id)
        let ghostTargets = [3, 5, 8, 10, 12]
        let candyTargets = [15, 25, 40, 60, 80]
        let tg = ghostTargets[Int(s % UInt64(ghostTargets.count))]
        let tc = candyTargets[Int((s >> 16) % UInt64(candyTargets.count))]
        let theme = pick(s, salt: 7, options: ["🎃 Pumpkin Hunt", "👻 Haunted Harvest", "🦇 Midnight Mischief", "🍬 Candy Siege", "🌙 Full-Moon Frenzy"])
        return SpookyDailyChallenge(
            id: id,
            title: theme,
            detail: "Capture \(tg) ghosts and collect \(tc) candies before midnight.",
            targetGhosts: tg,
            targetCandy: tc,
            bonusGold: 60 + tg * 8 + tc,
            bonusXP: 80 + tg * 10 + tc * 2,
            ghostsDone: 0,
            candyDone: 0,
            claimed: false
        )
    }
}

// ============================================================
// MARK: - 3. Persistent leaderboard (UserDefaults JSON, no backend)
// ============================================================

struct ProLeaderboardEntry: Identifiable, Codable, Comparable {
    var id: UUID = UUID()
    var name: String
    var score: Int
    var level: Int
    var date: Date

    static func < (lhs: ProLeaderboardEntry, rhs: ProLeaderboardEntry) -> Bool {
        lhs.score < rhs.score
    }
}

final class SpookyProLeaderboard: ObservableObject {
    @Published private(set) var entries: [ProLeaderboardEntry] = []
    private let storeKey = "spookyProLeaderboard.v1"
    private let maxEntries = 50

    init() { load() }

    func record(name: String, score: Int, level: Int) {
        let entry = ProLeaderboardEntry(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Ghost Hunter" : String(name.prefix(24)),
            score: max(0, score),
            level: max(1, level),
            date: Date()
        )
        entries.append(entry)
        entries.sort(by: >)
        if entries.count > maxEntries { entries = Array(entries.prefix(maxEntries)) }
        save()
    }

    func top(_ n: Int) -> [ProLeaderboardEntry] { Array(entries.prefix(max(0, n))) }
    func bestScore() -> Int { entries.first?.score ?? 0 }
    func rank(ofScore score: Int) -> Int { entries.filter { $0.score > score }.count + 1 }

    func clear() {
        entries = []
        save()
    }

    // MARK: Persistence
    private func save() {
        do {
            let data = try JSONEncoder().encode(entries)
            UserDefaults.standard.set(data, forKey: storeKey)
        } catch {
            print("SpookyProLeaderboard save failed: \(error)")
        }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: storeKey) else { return }
        do {
            entries = try JSONDecoder().decode([ProLeaderboardEntry].self, from: data).sorted(by: >)
        } catch {
            print("SpookyProLeaderboard load failed: \(error)")
            entries = []
        }
    }
}

// ============================================================
// MARK: - 4. GhostBehaviorBrain (pure state machine AI)
// ============================================================

enum GhostBrainState: String, CaseIterable, Sendable {
    case lurking, hunting, fleeing, playful, enraged
}

struct GhostBrainDecision: Sendable, Equatable {
    var state: GhostBrainState
    var speedMultiplier: Double
    var aggression: Double   // 0...1, drives zap-dodge chance
}

enum GhostBehaviorBrain {
    /// Pure decision: ghost mood + player pressure -> behavior.
    /// hpFraction 0...1, combo = current player combo, nearbyGhosts = crowd size.
    static func decide(
        hpFraction: Double,
        isBoss: Bool,
        combo: Int,
        nearbyGhosts: Int
    ) -> GhostBrainDecision {
        let hp = min(1, max(0, hpFraction))
        if isBoss && hp < 0.3 {
            return GhostBrainDecision(state: .enraged, speedMultiplier: 1.8, aggression: 0.9)
        }
        if hp < 0.25 {
            return GhostBrainDecision(state: .fleeing, speedMultiplier: 1.5, aggression: 0.2)
        }
        if combo >= 10 {
            return GhostBrainDecision(state: .hunting, speedMultiplier: 1.3, aggression: 0.8)
        }
        if nearbyGhosts >= 4 {
            return GhostBrainDecision(state: .playful, speedMultiplier: 1.1, aggression: 0.4)
        }
        if hp < 0.6 {
            return GhostBrainDecision(state: .hunting, speedMultiplier: 1.15, aggression: 0.6)
        }
        return GhostBrainDecision(state: .lurking, speedMultiplier: 1.0, aggression: 0.3)
    }

    /// Dodge chance for the capture mini-game, derived from aggression.
    static func dodgeChance(for decision: GhostBrainDecision, isShiny: Bool) -> Double {
        min(0.6, max(0.05, decision.aggression * 0.35 + (isShiny ? 0.1 : 0)))
    }
}

// ============================================================
// MARK: - 5. ProHaptics (CoreHaptics with graceful fallback)
// ============================================================

/// One place for all "pro" haptics so screens don't each own an engine.
final class ProHaptics {
    static let shared = ProHaptics()
    private var engine: CHHapticEngine?
    private init() { prepare() }

    private func prepare() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        do {
            engine = try CHHapticEngine()
            try engine?.start()
        } catch {
            print("ProHaptics engine failed: \(error)")
            engine = nil
        }
    }

    enum Style { case capture, rare, levelUp, error }

    func play(_ style: Style) {
        // Always fire a UIKit fallback first so old devices still feel it.
        fallback(for: style)
        guard let engine else { return }
        do {
            let pattern = try pattern(for: style)
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: CHHapticTimeImmediate)
        } catch {
            print("ProHaptics play failed: \(error)")
        }
    }

    private func fallback(for style: Style) {
        let fb: UIImpactFeedbackGenerator.FeedbackStyle
        switch style {
        case .capture: fb = .medium
        case .rare: fb = .heavy
        case .levelUp: fb = .heavy
        case .error: fb = .soft
        }
        UIImpactFeedbackGenerator(style: fb).impactOccurred()
    }

    private func pattern(for style: Style) throws -> CHHapticPattern {
        switch style {
        case .capture:
            return try CHHapticPattern(events: [
                CHHapticEvent(eventType: .hapticTransient, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.9),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.6)
                ], relativeTime: 0),
                CHHapticEvent(eventType: .hapticTransient, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.7),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.4)
                ], relativeTime: 0.12)
            ], parameters: [])
        case .rare:
            return try CHHapticPattern(events: (0..<3).map { i in
                CHHapticEvent(eventType: .hapticTransient, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.8)
                ], relativeTime: Double(i) * 0.1)
            }, parameters: [])
        case .levelUp:
            return try CHHapticPattern(events: [
                CHHapticEvent(eventType: .hapticContinuous, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.6),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.3)
                ], relativeTime: 0, duration: 0.4)
            ], parameters: [])
        case .error:
            return try CHHapticPattern(events: [
                CHHapticEvent(eventType: .hapticTransient, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.5),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.2)
                ], relativeTime: 0)
            ], parameters: [])
        }
    }
}

// ============================================================
// MARK: - 6. Daily challenge store (binds engine to SwiftUI)
// ============================================================

final class SpookyDailyStore: ObservableObject {
    @Published private(set) var challenge: SpookyDailyChallenge
    private let keyPrefix = "spookyDaily.v1."

    init(date: Date = Date()) {
        let id = DailyChallengeEngine.challengeID(for: date)
        if let data = UserDefaults.standard.data(forKey: keyPrefix + id),
           let saved = try? JSONDecoder().decode(SpookyDailyChallenge.self, from: data) {
            challenge = saved
        } else {
            challenge = DailyChallengeEngine.generate(for: date)
        }
    }

    func recordGhosts(_ n: Int = 1) {
        challenge.ghostsDone += max(0, n)
        persist()
    }

    func recordCandy(_ n: Int = 1) {
        challenge.candyDone += max(0, n)
        persist()
    }

    /// Returns (gold, xp) granted, or nil if not claimable.
    func claim() -> (gold: Int, xp: Int)? {
        guard challenge.isComplete, !challenge.claimed else { return nil }
        challenge.claimed = true
        persist()
        ProHaptics.shared.play(.levelUp)
        return (challenge.bonusGold, challenge.bonusXP)
    }

    func scheduleMidnightReminder() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { _, _ in }
        let content = UNMutableNotificationContent()
        content.title = "🎃 Daily Haunt expires soon"
        content.body = "Finish today's challenge before midnight for bonus gold!"
        var comps = DateComponents()
        comps.hour = 20
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
        center.add(UNNotificationRequest(identifier: "spooky-daily", content: content, trigger: trigger))
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(challenge) {
            UserDefaults.standard.set(data, forKey: keyPrefix + challenge.id)
        }
    }
}

// ============================================================
// MARK: - 7. Dashboard UI (drop into any TabView)
// ============================================================

struct SpookyProDashboardView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @ObservedObject var leaderboard: SpookyProLeaderboard
    @StateObject private var daily = SpookyDailyStore()
    @State private var hunterName: String = UserDefaults.standard.string(forKey: "spookyHunterName") ?? ""
    @State private var showSubmit = false

    var body: some View {
        NavigationView {
            List {
                Section("🏆 Pro Score") {
                    HStack {
                        StatDetail(icon: "🎃", value: "\(manager.score)", label: "Score")
                        Spacer()
                        StatDetail(icon: "🔥", value: "\(manager.streakCounter)", label: "Streak")
                        Spacer()
                        StatDetail(icon: "⭐", value: "Lv.\(manager.level)", label: "Level")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)

                    HStack {
                        Text("Best: \(leaderboard.bestScore()) pts")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("Rank #\(leaderboard.rank(ofScore: manager.score))")
                            .font(.caption.bold())
                            .foregroundColor(.orange)
                    }

                    Button(action: { showSubmit = true }) {
                        Label("Submit score", systemImage: "trophy.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                }

                Section("📅 Daily Challenge — \(daily.challenge.title)") {
                    Text(daily.challenge.detail)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    ProgressView(value: daily.challenge.progress) {
                        Text("\(Int(daily.challenge.progress * 100))%")
                            .font(.caption)
                    }
                    HStack {
                        StatBadge(icon: "👻", value: "\(min(daily.challenge.ghostsDone, daily.challenge.targetGhosts))/\(daily.challenge.targetGhosts)", color: .purple)
                        StatBadge(icon: "🍬", value: "\(min(daily.challenge.candyDone, daily.challenge.targetCandy))/\(daily.challenge.targetCandy)", color: .pink)
                        Spacer()
                        if daily.challenge.claimed {
                            Text("Claimed ✅").font(.caption.bold()).foregroundColor(.green)
                        } else if daily.challenge.isComplete {
                            Button("Claim +\(daily.challenge.bonusGold)🪙") { claimDaily() }
                                .font(.caption.bold())
                                .buttonStyle(.borderedProminent)
                                .tint(.green)
                        }
                    }
                }

                Section("👑 Leaderboard") {
                    if leaderboard.entries.isEmpty {
                        Text("No scores yet — be the first legend! 🎃")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(Array(leaderboard.top(10).enumerated()), id: \.element.id) { idx, entry in
                            HStack {
                                Text(["🥇", "🥈", "🥉"][min(idx, 2)] + (idx > 2 ? " #\(idx + 1)" : ""))
                                VStack(alignment: .leading) {
                                    Text(entry.name).font(.subheadline.bold())
                                    Text(entry.date, style: .date).font(.caption).foregroundColor(.secondary)
                                }
                                Spacer()
                                VStack(alignment: .trailing) {
                                    Text("\(entry.score)").font(.headline.monospacedDigit())
                                    Text("Lv.\(entry.level)").font(.caption).foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }

                Section("🧠 Ghost AI tip") {
                    Text(aiTip)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("🎃 Spooky Pro")
            .toolbar { ToolbarItem(placement: .navigationBarTrailing) { MusicToggleButton() } }
            .alert("Submit score", isPresented: $showSubmit) {
                TextField("Hunter name", text: $hunterName)
                Button("Save") { submitScore() }
                Button("Cancel", role: .cancel) {}
            }
            .onAppear { daily.scheduleMidnightReminder() }
        }
    }

    private var aiTip: String {
        let d = GhostBehaviorBrain.decide(
            hpFraction: 0.5,
            isBoss: false,
            combo: manager.comboCounter,
            nearbyGhosts: manager.ghosts.count
        )
        switch d.state {
        case .enraged: return "Bosses enrage under 30% HP — save your strongest spell."
        case .fleeing: return "Weak ghosts flee — throw the net before they slip away."
        case .hunting: return "Your combo has them hunting YOU. Keep moving."
        case .playful: return "A crowded haunt turns playful — great time to farm candy."
        case .lurking: return "Ghosts are lurking. Tap around to stir them up."
        }
    }

    private func claimDaily() {
        guard let reward = daily.claim() else { return }
        manager.gold += reward.gold
        manager.experience += reward.xp
        manager.addNotification("📅 Daily complete! +\(reward.gold) gold, +\(reward.xp) XP!")
        manager.checkLevelUp()
    }

    private func submitScore() {
        UserDefaults.standard.set(hunterName, forKey: "spookyHunterName")
        leaderboard.record(name: hunterName, score: manager.score, level: manager.level)
        ProHaptics.shared.play(.capture)
    }
}

struct SpookyProDashboardView_Previews: PreviewProvider {
    static var previews: some View {
        SpookyProDashboardView(leaderboard: SpookyProLeaderboard())
            .environmentObject(HalloweenUltimateManager())
            .preferredColorScheme(.dark)
    }
}
