//
//  MineArcadeOverhaul.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Commercial arcade menu upgrade: animated showcase cards with shine
//  sweeps and best-score ribbons, a featured-game marquee, and a daily
//  challenge board with UserDefaults-backed daily bests. Wired into
//  UltimateMiniGameView (marquee + daily row above the grid, showcase
//  cards in the grid, play recording on long-press).
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Daily challenge board (seeded, persisted daily)
// ============================================================

/// Seeded daily arcade challenge: game + target + reward.
struct ArcadeDailyChallenge {
    var gameType: MiniGameType
    var target: Int
    var rewardGold: Int
    var rewardXP: Int
}

/// Daily bests per game, namespaced by day. Records plays, crowns records.
final class ArcadeDailyBoard: ObservableObject {
    @Published private(set) var bests: [String: Int] = [:]
    @Published private(set) var playsToday: Int = 0

    private let dayKey = "arcadeDay.v1"
    private let bestPrefix = "arcadeBest."
    private let playsKey = "arcadePlays."

    init() {
        rolloverIfNeeded()
        load()
    }

    /// Today's date string; day change wipes daily bests.
    private func today() -> String {
        SpookyStore.todayString()
    }

    private func rolloverIfNeeded() {
        let stored = UserDefaults.standard.string(forKey: dayKey) ?? ""
        if stored != today() {
            UserDefaults.standard.set(today(), forKey: dayKey)
            for key in UserDefaults.standard.dictionaryRepresentation().keys
            where key.hasPrefix(bestPrefix) || key.hasPrefix(playsKey) {
                UserDefaults.standard.removeObject(forKey: key)
            }
        }
    }

    private func load() {
        var dict: [String: Int] = [:]
        var plays = 0
        for (k, v) in UserDefaults.standard.dictionaryRepresentation() {
            if k.hasPrefix(bestPrefix), let n = v as? Int {
                dict[String(k.dropFirst(bestPrefix.count))] = n
            }
            if k.hasPrefix(playsKey), let n = v as? Int {
                plays += n
            }
        }
        bests = dict
        playsToday = plays
    }

    /// Deterministic daily challenge from the calendar date.
    static func challenge(date: Date = Date()) -> ArcadeDailyChallenge {
        let types = MiniGameType.allCases
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.dateFormat = "yyyyMMdd"
        let stamp = Int(fmt.string(from: date)) ?? 0
        let type = types[abs(stamp) % types.count]
        let target = 300 + (abs(stamp) / types.count % 10) * 100
        return ArcadeDailyChallenge(
            gameType: type,
            target: target,
            rewardGold: 100 + target / 10,
            rewardXP: 60 + target / 12
        )
    }

    func bestToday(_ type: MiniGameType) -> Int {
        bests[type.rawValue, default: 0]
    }

    /// Record a play. Returns true on a new daily best.
    @discardableResult
    func recordPlay(_ type: MiniGameType, score: Int) -> Bool {
        playsToday += 1
        UserDefaults.standard.set(
            (UserDefaults.standard.integer(forKey: playsKey + type.rawValue)) + 1,
            forKey: playsKey + type.rawValue
        )
        if score > bestToday(type) {
            bests[type.rawValue] = score
            UserDefaults.standard.set(score, forKey: bestPrefix + type.rawValue)
            return true
        }
        return false
    }

    func challengeDone(_ challenge: ArcadeDailyChallenge) -> Bool {
        bestToday(challenge.gameType) >= challenge.target
    }

    /// Featured game of the day (the challenge game, resolved to a list entry).
    static func featuredGame(from games: [MiniGame], date: Date = Date()) -> MiniGame? {
        let want = challenge(date: date).gameType
        return games.first(where: { $0.type == want }) ?? games.randomElement()
    }
}

// ============================================================
// MARK: - 2. Showcase card (animated replacement)
// ============================================================

/// Commercial game card: floating icon, shine sweep, difficulty glow,
/// best-score ribbon, daily-game spotlight. Tap/long-press attach outside.
struct ArcadeShowcaseCard: View {
    let game: MiniGame
    var isDaily: Bool = false
    var dailyBest: Int = 0
    @State private var float = false
    @State private var shine = false

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                // Spotlight halo for the daily game.
                if isDaily {
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [.yellow.opacity(0.45), .clear],
                                center: .center, startRadius: 6, endRadius: 60
                            )
                        )
                        .frame(width: 120, height: 120)
                        .opacity(float ? 1 : 0.6)
                        .animation(
                            .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                            value: float
                        )
                }
                Text(miniGameIcon(game.type))
                    .font(.system(size: 50))
                    .offset(y: float ? -5 : 5)
                    .rotationEffect(.degrees(float ? 4 : -4))
                    .animation(
                        .easeInOut(duration: 2.2).repeatForever(autoreverses: true),
                        value: float
                    )
                if isDaily {
                    Text("DAILY")
                        .font(.caption2.bold())
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Color.yellow)
                        .foregroundColor(.black)
                        .cornerRadius(6)
                        .offset(y: -38)
                }
            }
            .frame(height: 76)
            Text(game.name)
                .font(.headline)
                .lineLimit(1)
            Text(game.description)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
                .multilineTextAlignment(.center)
            HStack {
                Text(game.difficulty.rawValue)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(game.difficulty.color.opacity(0.2))
                    .cornerRadius(4)
                if dailyBest > 0 {
                    Text("🏆 \(dailyBest)")
                        .font(.caption.bold())
                        .foregroundColor(.yellow)
                        .monospacedDigit()
                } else {
                    Text("🏆 \(game.highScore)")
                        .font(.caption)
                }
            }
            Text("Played: \(game.timesPlayed)")
                .font(.caption2)
                .foregroundColor(.secondary)
            if ArcadeRouter.supports(game.type) {
                Text("▶ Tap to play • hold for quick score")
                    .font(.caption2)
                    .foregroundColor(.green)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.secondarySystemBackground))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(
                            isDaily ? Color.yellow.opacity(0.8) : game.difficulty.color.opacity(0.4),
                            lineWidth: isDaily ? 2.5 : 1.5
                        )
                )
        )
        // Shine sweep across the card.
        .overlay(
            GeometryReader { geo in
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.clear, .white.opacity(0.22), .clear],
                            startPoint: .leading, endPoint: .trailing
                        )
                    )
                    .frame(width: 70)
                    .offset(x: shine ? geo.size.width : -70)
                    .animation(
                        .easeInOut(duration: 2.6).repeatForever(autoreverses: false),
                        value: shine
                    )
            }
            .mask(RoundedRectangle(cornerRadius: 16))
        )
        .onAppear {
            float.toggle()
            shine.toggle()
        }
    }
}

// ============================================================
// MARK: - 3. Featured marquee + daily row
// ============================================================

/// Featured-game marquee: big art, name, reward, glowing Play button.
struct ArcadeMarquee: View {
    var game: MiniGame?
    var onPlay: (MiniGame) -> Void
    @State private var glow = false

    var body: some View {
        if let game = game {
            ZStack {
                LinearGradient(
                    colors: [Color.purple.opacity(0.45), Color.orange.opacity(0.3), Color.black.opacity(0.4)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                HStack(spacing: 14) {
                    Text(miniGameIcon(game.type))
                        .font(.system(size: 64))
                        .scaleEffect(glow ? 1.1 : 0.95)
                        .rotationEffect(.degrees(glow ? 5 : -5))
                        .shadow(color: .orange, radius: glow ? 16 : 4)
                        .animation(
                            .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                            value: glow
                        )
                    VStack(alignment: .leading, spacing: 4) {
                        Text("⭐ FEATURED TODAY")
                            .font(.caption2.bold())
                            .foregroundColor(.yellow)
                        Text(game.name)
                            .font(.title3.bold())
                            .foregroundColor(.white)
                        Text(game.description)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.8))
                            .lineLimit(2)
                        Button(action: {
                            SpookyHaptics.play(.reward)
                            onPlay(game)
                        }) {
                            Label("Play now", systemImage: "play.fill")
                                .font(.subheadline.bold())
                                .padding(.horizontal, 18).padding(.vertical, 8)
                                .background(Color.green)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                                .shadow(color: .green.opacity(0.7), radius: glow ? 12 : 4)
                        }
                        .buttonStyle(.plain)
                        .padding(.top, 2)
                    }
                    Spacer()
                }
                .padding(14)
            }
            .cornerRadius(18)
            .padding(.horizontal)
            .onAppear { glow.toggle() }
        }
    }
}

/// Daily challenge row: target, live progress, reward, best ribbon.
struct ArcadeDailyRow: View {
    @ObservedObject var board: ArcadeDailyBoard
    var challenge: ArcadeDailyChallenge
    var gameName: String
    @State private var pop = false

    private var best: Int { board.bestToday(challenge.gameType) }
    private var done: Bool { board.challengeDone(challenge) }

    var body: some View {
        HStack(spacing: 12) {
            Text(miniGameIcon(challenge.gameType))
                .font(.largeTitle)
                .scaleEffect(done ? 1.15 : 1.0)
                .animation(
                    done ? .spring(response: 0.4, dampingFraction: 0.5).repeatForever(autoreverses: true) : .default,
                    value: pop
                )
            VStack(alignment: .leading, spacing: 3) {
                Text("📅 Daily: score \(challenge.target) in \(gameName)")
                    .font(.subheadline.bold())
                MineShimmerBar(fraction: min(1, Double(best) / Double(challenge.target)), tint: done ? .green : .orange, height: 8)
                Text(done
                     ? "Complete! +\(challenge.rewardGold)🪙 +\(challenge.rewardXP) XP banked."
                     : "Best today: \(best) — reward \(challenge.rewardGold)🪙 +\(challenge.rewardXP) XP")
                    .font(.caption)
                    .foregroundColor(done ? .green : .secondary)
                    .monospacedDigit()
            }
            Spacer()
            VStack {
                Text("\(board.playsToday)")
                    .font(.headline.bold())
                    .monospacedDigit()
                Text("plays")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(done ? Color.green.opacity(0.8) : Color.clear, lineWidth: 2)
        )
        .padding(.horizontal)
        .onAppear {
            pop = done
            if done { SpookyHaptics.play(.light) }
        }
        .onChange(of: best) { _, _ in
            if done && !pop {
                pop = true
                SpookyHaptics.play(.reward)
            }
        }
    }
}

// ============================================================
// MARK: - 4. Arcade FX showcase (menu components live)
// ============================================================

/// Overhaul gallery: marquee, daily row, full card grid, all animated.
struct MineArcadeOverhaulShowcaseView: View {
    @StateObject private var board = ArcadeDailyBoard()
    @Environment(\.dismiss) private var dismiss

    private var demoGames: [MiniGame] {
        [
            MiniGame(name: "Memory Match", description: "Match the spooky cards", type: .memoryMatch, difficulty: .medium, rewards: QuestReward(experience: 25, gold: 15, items: [], rareItems: [], unlockables: []), highScore: 1200, timesPlayed: 14),
            MiniGame(name: "Pumpkin Smash", description: "Smash as many pumpkins as you can", type: .pumpkinSmash, difficulty: .easy, rewards: QuestReward(experience: 20, gold: 10, items: [], rareItems: [], unlockables: []), highScore: 860, timesPlayed: 22),
            MiniGame(name: "Ghost Race", description: "Race against ghost opponents", type: .ghostRace, difficulty: .hard, rewards: QuestReward(experience: 50, gold: 30, items: [], rareItems: [], unlockables: []), highScore: 0, timesPlayed: 3),
            MiniGame(name: "Spell Duel", description: "Duel with spells against AI", type: .spellDuel, difficulty: .expert, rewards: QuestReward(experience: 100, gold: 50, items: [], rareItems: [], unlockables: ["Duel Master"]), highScore: 2400, timesPlayed: 9),
        ]
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    Text("The commercial menu, live: marquee, daily, cards.")
                        .font(.caption).foregroundStyle(.secondary)
                    ArcadeMarquee(
                        game: ArcadeDailyBoard.featuredGame(from: demoGames),
                        onPlay: { _ in SpookyHaptics.play(.reward) }
                    )
                    ArcadeDailyRow(
                        board: board,
                        challenge: ArcadeDailyBoard.challenge(),
                        gameName: demoGames.first(where: { $0.type == ArcadeDailyBoard.challenge().gameType })?.name ?? "Arcade"
                    )
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))], spacing: 16) {
                        ForEach(demoGames) { game in
                            ArcadeShowcaseCard(
                                game: game,
                                isDaily: game.type == ArcadeDailyBoard.challenge().gameType,
                                dailyBest: board.bestToday(game.type)
                            )
                            .onTapGesture { SpookyHaptics.play(.light) }
                            .onLongPressGesture {
                                _ = board.recordPlay(game.type, score: Int.random(in: 100...900))
                                SpookyHaptics.play(.medium)
                            }
                        }
                    }
                    .padding(.horizontal)
                    Text("Long-press a card to log a demo score and watch ribbons + daily progress move.")
                        .font(.caption).foregroundStyle(.secondary)
                        .padding(.bottom, 20)
                }
            }
            .navigationTitle("Arcade Overhaul")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
