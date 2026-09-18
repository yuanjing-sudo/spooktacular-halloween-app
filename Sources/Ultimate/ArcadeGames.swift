//
//  ArcadeGames.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  High-quality animation kit + fully playable arcade games:
//  - Memory Match (flip-card pairs)
//  - Pumpkin Smash (whack-a-mole)
//  - Candy Catch (drag-basket catcher)
//  - Spell Duel (turn-based battle)
//  Scores feed back into HalloweenUltimateManager (XP, gold,
//  high scores, achievements, quests).
//

import SwiftUI

// ============================================================
// MARK: - Arcade Router
// ============================================================

struct ArcadeRouter {
    static func supports(_ type: MiniGameType) -> Bool {
        switch type {
        case .memoryMatch, .pumpkinSmash, .candySort, .spellDuel, .voxelRun, .ghostRace, .trivia, .rhythm, .mazeEscape, .graveyard3D, .abandonedMine:
            return true
        }
    }

    static var title: String { "🎮 Arcade" }
}

struct ArcadeGameView: View {
    let type: MiniGameType
    var onDone: () -> Void

    var body: some View {
        switch type {
        case .memoryMatch:
            MemoryMatchGameView(onDone: onDone)
        case .pumpkinSmash:
            PumpkinSmashGameView(onDone: onDone)
        case .candySort:
            CandyCatchGameView(onDone: onDone)
        case .spellDuel:
            SpellDuelGameView(onDone: onDone)
        case .voxelRun:
            VoxelRunView(onDone: onDone)
        case .ghostRace:
            GhostRaceGameView(onDone: onDone)
        case .trivia:
            TriviaGameView(onDone: onDone)
        case .rhythm:
            RhythmGameView(onDone: onDone)
        case .graveyard3D:
            GraveyardHostView(onDone: onDone)
        case .abandonedMine:
            MineHostView(onDone: onDone)
        case .mazeEscape:
            MazeEscapeHostView(onDone: onDone)
            Text("Coming soon! 👻")
        }
    }
}

// ============================================================
// MARK: - Manager Score Reporting
// ============================================================

extension HalloweenUltimateManager {
    /// Records an arcade score: high-score tracking, XP/gold, fanfare.
    @discardableResult
    func reportArcadeScore(_ type: MiniGameType, score: Int, gameName: String) -> (xp: Int, gold: Int, isBest: Bool) {
        var isBest = false
        if let i = miniGames.firstIndex(where: { $0.type == type }) {
            miniGames[i].timesPlayed += 1
            if score > miniGames[i].highScore {
                miniGames[i].highScore = score
                isBest = true
            }
        }
        let xp = max(5, score / 4)
        let g = max(2, score / 8)
        experience += xp
        gold += g
        if let treat = HalloweenUltimateManager.allDrops.randomElement() {
            addIngredient(treat)
        }
        if isBest {
            addNotification("🏆 New high score in \(gameName): \(score)!")
            triggerHaptic(.success)
            createParticles(at: CGPoint(x: 200, y: 300), count: 50, emoji: "🏆")
        } else {
            addNotification("🎮 \(gameName) score: \(score)! +\(xp) XP, +\(g)🪙")
            triggerHaptic(.medium)
        }
        checkLevelUp()
        checkAchievements()
        checkQuestProgress()
        return (xp, g, isBest)
    }
}

// ============================================================
// MARK: - ANIMATION KIT
// ============================================================

// Gentle floating (ghosts, pumpkins, moons).
struct ArcadeFloat: ViewModifier {
    var amplitude: CGFloat = 8
    var duration: Double = 2.0
    @State private var floating = false

    func body(content: Content) -> some View {
        content
            .offset(y: floating ? -amplitude : amplitude)
            .onAppear {
                withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
                    floating.toggle()
                }
            }
    }
}

// Springy entrance with configurable delay (staggered cards).
struct ArcadePopIn: ViewModifier {
    var delay: Double = 0
    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(appeared ? 1 : 0.6)
            .opacity(appeared ? 1 : 0)
            .onAppear {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.65).delay(delay)) {
                    appeared = true
                }
            }
    }
}

// Continuous glow pulse (buttons, rare items).
struct ArcadeGlowPulse: ViewModifier {
    var color: Color = .orange
    @State private var glowing = false

    func body(content: Content) -> some View {
        content
            .shadow(color: color.opacity(glowing ? 0.75 : 0.25), radius: glowing ? 16 : 6)
            .onAppear {
                withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) {
                    glowing.toggle()
                }
            }
    }
}

// Sharp shake (wrong move, bomb, damage taken).
struct ArcadeShake: ViewModifier {
    var trigger: Int
    @State private var offset: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .offset(x: offset)
            .onChange(of: trigger) { _ in
                withAnimation(.linear(duration: 0.06).repeatCount(5, autoreverses: true)) {
                    offset = 10
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.32) {
                    offset = 0
                }
            }
    }
}

// Quick squash-and-stretch hit feedback.
struct ArcadeSquash: ViewModifier {
    var trigger: Int
    @State private var scale: CGFloat = 1

    func body(content: Content) -> some View {
        content
            .scaleEffect(x: 2 - scale, y: scale)
            .onChange(of: trigger) { _ in
                withAnimation(.spring(response: 0.18, dampingFraction: 0.35)) {
                    scale = 0.72
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.14) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                        scale = 1
                    }
                }
            }
    }
}

extension View {
    func arcadeFloat(amplitude: CGFloat = 8, duration: Double = 2.0) -> some View {
        modifier(ArcadeFloat(amplitude: amplitude, duration: duration))
    }
    func arcadePopIn(delay: Double = 0) -> some View {
        modifier(ArcadePopIn(delay: delay))
    }
    func arcadeGlowPulse(_ color: Color = .orange) -> some View {
        modifier(ArcadeGlowPulse(color: color))
    }
    func arcadeShake(trigger: Int) -> some View {
        modifier(ArcadeShake(trigger: trigger))
    }
    func arcadeSquash(trigger: Int) -> some View {
        modifier(ArcadeSquash(trigger: trigger))
    }
}

// Emoji particle explosion (matches, smashes, victories).
struct ParticleBurst: View {
    var emoji: String
    var count: Int = 12
    @State private var exploded = false
    let seeds: [BurstSeed]

    struct BurstSeed: Identifiable {
        let id = UUID()
        var angle: Double
        var distance: CGFloat
        var size: CGFloat
    }

    init(emoji: String, count: Int = 12) {
        self.emoji = emoji
        self.count = count
        self.seeds = (0..<count).map { i in
            BurstSeed(
                angle: Double(i) / Double(count) * 360 + Double.random(in: -12...12),
                distance: CGFloat.random(in: 44...78),
                size: CGFloat.random(in: 14...26)
            )
        }
    }

    var body: some View {
        ZStack {
            ForEach(seeds) { s in
                Text(emoji)
                    .font(.system(size: s.size))
                    .offset(
                        x: exploded ? cos(s.angle * .pi / 180) * s.distance : 0,
                        y: exploded ? sin(s.angle * .pi / 180) * s.distance : 0
                    )
                    .opacity(exploded ? 0 : 1)
                    .scaleEffect(exploded ? 0.5 : 1)
            }
        }
        .allowsHitTesting(false)
        .onAppear {
            withAnimation(.easeOut(duration: 0.7)) {
                exploded = true
            }
        }
    }
}

// Floating score text ("+10", "-25") that rises and fades.
struct Floater: Identifiable {
    let id = UUID()
    var text: String
    var color: Color = .yellow
}

struct FloaterStack: View {
    var floaters: [Floater]
    @State private var risen = false

    var body: some View {
        ZStack {
            ForEach(floaters) { f in
                Text(f.text)
                    .font(.headline.bold())
                    .foregroundColor(f.color)
                    .shadow(color: .black.opacity(0.6), radius: 4)
                    .offset(y: risen ? -44 : 0)
                    .opacity(risen ? 0 : 1)
            }
        }
        .allowsHitTesting(false)
        .onAppear {
            withAnimation(.easeOut(duration: 0.7)) {
                risen = true
            }
        }
    }
}

// Twinkling night-sky backdrop shared by every arcade game.
struct TwinkleBackground: View {
    @State private var stars: [TwinkleStar] = []

    struct TwinkleStar: Identifiable {
        let id = UUID()
        var x: CGFloat
        var y: CGFloat
        var size: CGFloat
        var delay: Double
        var bright: Bool = false
    }

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.06, green: 0.02, blue: 0.16),
                    Color(red: 0.14, green: 0.05, blue: 0.24),
                    Color(red: 0.05, green: 0.01, blue: 0.1)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            ForEach(stars) { s in
                Circle()
                    .fill(Color.white.opacity(s.bright ? 0.9 : 0.2))
                    .frame(width: s.size, height: s.size)
                    .position(x: s.x, y: s.y)
                    .animation(
                        Animation.easeInOut(duration: 1.6).repeatForever(autoreverses: true).delay(s.delay),
                        value: s.bright
                    )
                    .onAppear {
                        if let i = stars.firstIndex(where: { $0.id == s.id }) {
                            stars[i].bright.toggle()
                        }
                    }
            }

            Circle()
                .fill(
                    RadialGradient(
                        gradient: Gradient(colors: [.yellow.opacity(0.9), .orange.opacity(0.35)]),
                        center: .center,
                        startRadius: 10,
                        endRadius: 60
                    )
                )
                .frame(width: 110, height: 110)
                .position(x: UIScreen.main.bounds.width - 70, y: 110)
                .arcadeFloat(amplitude: 6, duration: 3.2)
        }
        .onAppear {
            let w = UIScreen.main.bounds.width
            let h = UIScreen.main.bounds.height
            stars = (0..<46).map { _ in
                TwinkleStar(
                    x: CGFloat.random(in: 0...w),
                    y: CGFloat.random(in: 0...(h * 0.65)),
                    size: CGFloat.random(in: 1.5...3.5),
                    delay: Double.random(in: 0...1.6)
                )
            }
        }
    }
}

// Shared score / time / lives HUD.
struct ArcadeHUD: View {
    var score: Int
    var time: Int?
    var hearts: Int?
    var extra: String?

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 4) {
                Text("⭐").font(.caption)
                Text("\(score)")
                    .font(.headline.monospacedDigit())
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.black.opacity(0.5))
            .cornerRadius(10)

            if let time {
                HStack(spacing: 4) {
                    Text("⏱️").font(.caption)
                    Text("\(time)s")
                        .font(.headline.monospacedDigit())
                        .foregroundColor(time <= 5 ? .red : .white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.black.opacity(0.5))
                .cornerRadius(10)
            }

            if let hearts {
                HStack(spacing: 2) {
                    ForEach(0..<3, id: \.self) { i in
                        Text(i < hearts ? "❤️" : "🖤").font(.caption)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.black.opacity(0.5))
                .cornerRadius(10)
            }

            if let extra {
                Text(extra)
                    .font(.caption.bold())
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.5))
                    .cornerRadius(10)
            }

            Spacer()
        }
        .padding(.horizontal)
    }
}

// Shared start overlay (title, animated mascot, how-to, start button).
struct ArcadeStartCard: View {
    var mascot: String
    var title: String
    var lines: [String]
    var action: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text(mascot)
                .font(.system(size: 84))
                .arcadeFloat()
                .arcadeGlowPulse(.orange)

            Text(title)
                .font(.largeTitle.bold())
                .foregroundColor(.white)

            VStack(alignment: .leading, spacing: 6) {
                ForEach(lines, id: \.self) { line in
                    Text("• \(line)")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.85))
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white.opacity(0.08))
            .cornerRadius(14)

            Button(action: action) {
                HStack {
                    Image(systemName: "play.fill")
                    Text("Start Game")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    LinearGradient(gradient: Gradient(colors: [.orange, .red]), startPoint: .leading, endPoint: .trailing)
                )
                .cornerRadius(14)
            }
            .arcadeGlowPulse(.orange)
        }
        .padding(24)
    }
}

// Shared game-over card.
struct ArcadeGameOverCard: View {
    var title: String
    var score: Int
    var xp: Int
    var gold: Int
    var isBest: Bool
    var onReplay: () -> Void
    var onDone: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Text(isBest ? "🏆 NEW BEST! 🏆" : title)
                .font(.title.bold())
                .foregroundColor(isBest ? .gold : .white)
                .arcadePopIn()

            Text("\(score)")
                .font(.system(size: 64, weight: .black))
                .foregroundColor(.gold)
                .arcadePopIn(delay: 0.1)

            HStack(spacing: 16) {
                Text("+\(xp) ⭐ XP")
                Text("+\(gold) 🪙")
            }
            .font(.headline)
            .foregroundColor(.white.opacity(0.9))

            HStack(spacing: 12) {
                Button(action: onReplay) {
                    HStack {
                        Image(systemName: "arrow.clockwise")
                        Text("Again")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .cornerRadius(12)
                }
                Button(action: onDone) {
                    Text("Done")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
            }
        }
        .padding(24)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(20)
        .padding(.horizontal, 28)
    }
}

// Shell every arcade game lives in: backdrop + close + content.
struct ArcadeShell<Content: View>: View {
    var title: String
    var onDone: () -> Void
    var content: Content

    init(title: String, onDone: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.title = title
        self.onDone = onDone
        self.content = content()
    }

    var body: some View {
        NavigationView {
            ZStack {
                TwinkleBackground()
                content
                // Guaranteed back button — toolbar Done can vanish inside
                // nested sheets / fullScreenCovers (e.g. Spell Duel).
                VStack {
                    HStack {
                        Button(action: onDone) {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                Text("Back")
                            }
                            .font(.subheadline.bold())
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.black.opacity(0.6))
                            .cornerRadius(10)
                        }
                        .padding(.leading, 12)
                        .padding(.top, 8)
                        Spacer()
                    }
                    Spacer()
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { onDone() }
                }
            }
        }
    }
}

// ============================================================
// MARK: - GAME 1: MEMORY MATCH
// ============================================================

struct MemoryCard: Identifiable {
    let id = UUID()
    var emoji: String
    var isFaceUp = false
    var isMatched = false
}

struct MemoryMatchGameView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var onDone: () -> Void

    @State private var cards: [MemoryCard] = []
    @State private var firstPick: Int?
    @State private var lockBoard = false
    @State private var moves = 0
    @State private var matches = 0
    @State private var seconds = 0
    @State private var started = false
    @State private var finished = false
    @State private var bursts: [UUID: String] = [:]
    @State private var timer: Timer?
    @State private var result: (xp: Int, gold: Int, isBest: Bool)?

    let pool = ["🎃", "👻", "🦇", "🍬", "🧛", "🧙", "💀", "🍭", "🕷️", "🌙", "⚡", "🍫"]
    let columns = [GridItem(.adaptive(minimum: 76), spacing: 10)]

    var body: some View {
        ArcadeShell(title: "🧠 Memory Match", onDone: onDone) {
            ZStack {
                VStack(spacing: 12) {
                    ArcadeHUD(score: liveScore, time: seconds, extra: "\(matches)/8 pairs")

                    LazyVGrid(columns: columns, spacing: 10) {
                        ForEach(Array(cards.enumerated()), id: \.element.id) { idx, card in
                            ZStack {
                                MemoryCardFace(card: card)
                                if bursts[card.id] != nil {
                                    ParticleBurst(emoji: card.emoji, count: 10)
                                }
                            }
                            .onTapGesture { tapCard(at: idx) }
                            .arcadePopIn(delay: Double(idx) * 0.03)
                        }
                    }
                    .padding(.horizontal)
                    .disabled(!started || finished || lockBoard)

                    Text("Moves: \(moves)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))

                    Spacer()
                }
                .padding(.top)

                if !started {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeStartCard(
                        mascot: "🧠",
                        title: "Memory Match",
                        lines: [
                            "Flip two cards to find the spooky pairs",
                            "Match all 8 pairs as fast as you can",
                            "Fewer moves + faster time = bigger score"
                        ]
                    ) { startGame() }
                }

                if finished, let result {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeGameOverCard(
                        title: "Matched!",
                        score: liveScore,
                        xp: result.xp,
                        gold: result.gold,
                        isBest: result.isBest,
                        onReplay: { resetGame() },
                        onDone: onDone
                    )
                }
            }
        }
        .onDisappear { timer?.invalidate() }
    }

    private var liveScore: Int {
        max(50, 1200 - moves * 15 - seconds * 8)
    }

    private func startGame() {
        resetGame()
        started = true
        manager.triggerHaptic(.medium)
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if !finished { seconds += 1 }
        }
    }

    private func resetGame() {
        let emojis = Array(pool.shuffled().prefix(8))
        cards = (emojis + emojis).shuffled().map { MemoryCard(emoji: $0) }
        firstPick = nil
        lockBoard = false
        moves = 0
        matches = 0
        seconds = 0
        finished = false
        bursts = [:]
        result = nil
        timer?.invalidate()
    }

    private func tapCard(at idx: Int) {
        guard cards[idx].isFaceUp == false, cards[idx].isMatched == false else { return }
        manager.triggerHaptic(.light)
        cards[idx].isFaceUp = true

        if let first = firstPick {
            moves += 1
            if cards[first].emoji == cards[idx].emoji {
                cards[first].isMatched = true
                cards[idx].isMatched = true
                matches += 1
                bursts[cards[idx].id] = cards[idx].emoji
                manager.triggerHaptic(.success)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                    bursts.removeValue(forKey: cards[idx].id)
                }
                if matches == 8 { winGame() }
            } else {
                lockBoard = true
                let a = first, b = idx
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
                    cards[a].isFaceUp = false
                    cards[b].isFaceUp = false
                    lockBoard = false
                }
            }
            firstPick = nil
        } else {
            firstPick = idx
        }
    }

    private func winGame() {
        finished = true
        timer?.invalidate()
        result = manager.reportArcadeScore(.memoryMatch, score: liveScore, gameName: "Memory Match")
    }
}

struct MemoryCardFace: View {
    var card: MemoryCard

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(card.isFaceUp || card.isMatched ? Color.orange.opacity(0.3) : Color.purple.opacity(0.55))
                .frame(height: 84)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(card.isMatched ? Color.gold : Color.white.opacity(0.2), lineWidth: card.isMatched ? 2 : 1)
                )
            if card.isFaceUp || card.isMatched {
                Text(card.emoji).font(.system(size: 38))
            } else {
                Text("🎃").font(.system(size: 28)).opacity(0.45)
            }
        }
        .rotation3DEffect(.degrees(card.isFaceUp || card.isMatched ? 0 : 180), axis: (x: 0, y: 1, z: 0))
        .opacity(card.isMatched ? 0.55 : 1)
        .animation(.spring(response: 0.35, dampingFraction: 0.7), value: card.isFaceUp)
    }
}

// ============================================================
// MARK: - GAME 2: PUMPKIN SMASH
// ============================================================

struct PumpkinSmashGameView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var onDone: () -> Void

    @State private var activeHole: Int?
    @State private var isBomb = false
    @State private var score = 0
    @State private var timeLeft = 30
    @State private var started = false
    @State private var finished = false
    @State private var floaters: [Int: [Floater]] = [:]
    @State private var squashTrigger = 0
    @State private var shakeTrigger = 0
    @State private var spawnTimer: Timer?
    @State private var clockTimer: Timer?
    @State private var result: (xp: Int, gold: Int, isBest: Bool)?

    var body: some View {
        ArcadeShell(title: "🎃 Pumpkin Smash", onDone: onDone) {
            ZStack {
                VStack(spacing: 12) {
                    ArcadeHUD(score: score, time: timeLeft, extra: isBomb ? "💣 careful!" : "🎃 smash!")

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                        ForEach(0..<9, id: \.self) { hole in
                            ZStack {
                                Ellipse()
                                    .fill(Color.black.opacity(0.6))
                                    .frame(height: 26)
                                    .offset(y: 34)
                                if activeHole == hole {
                                    Text(isBomb ? "💣" : "🎃")
                                        .font(.system(size: 58))
                                        .arcadeSquash(trigger: squashTrigger)
                                        .transition(.scale.combined(with: .opacity))
                                } else {
                                    Text("🕳️")
                                        .font(.system(size: 40))
                                        .opacity(0.35)
                                }
                                if let fl = floaters[hole] {
                                    FloaterStack(floaters: fl)
                                }
                            }
                            .frame(height: 96)
                            .arcadeShake(trigger: shakeTrigger)
                            .onTapGesture { tapHole(hole) }
                            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: activeHole)
                        }
                    }
                    .padding(.horizontal)

                    ProgressView(value: Double(timeLeft), total: 30)
                        .progressViewStyle(LinearProgressViewStyle(tint: timeLeft <= 5 ? .red : .orange))
                        .padding(.horizontal)

                    Spacer()
                }
                .padding(.top)
                .disabled(!started || finished)

                if !started {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeStartCard(
                        mascot: "🎃",
                        title: "Pumpkin Smash",
                        lines: [
                            "Tap pumpkins as they pop up: +10 each",
                            "Never tap a 💣 bomb: −25 points",
                            "30 seconds on the clock — smash fast!"
                        ]
                    ) { startGame() }
                }

                if finished, let result {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeGameOverCard(
                        title: "Time!",
                        score: score,
                        xp: result.xp,
                        gold: result.gold,
                        isBest: result.isBest,
                        onReplay: { resetGame(); startGame() },
                        onDone: onDone
                    )
                }
            }
        }
        .onDisappear { stopTimers() }
    }

    private func startGame() {
        resetGame()
        started = true
        manager.triggerHaptic(.medium)
        spawnPumpkin()
        spawnTimer = Timer.scheduledTimer(withTimeInterval: 0.75, repeats: true) { _ in
            spawnPumpkin()
        }
        clockTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            timeLeft -= 1
            if timeLeft <= 0 { endGame() }
        }
    }

    private func resetGame() {
        stopTimers()
        activeHole = nil
        isBomb = false
        score = 0
        timeLeft = 30
        finished = false
        floaters = [:]
        result = nil
    }

    private func stopTimers() {
        spawnTimer?.invalidate()
        clockTimer?.invalidate()
    }

    private func spawnPumpkin() {
        guard !finished else { return }
        activeHole = Int.random(in: 0..<9)
        isBomb = Double.random(in: 0...1) < 0.16
    }

    private func tapHole(_ hole: Int) {
        guard started, !finished, activeHole == hole else { return }
        if isBomb {
            score = max(0, score - 25)
            shakeTrigger += 1
            addFloater(hole: hole, text: "−25 💥", color: .red)
            manager.triggerHaptic(.heavy)
        } else {
            score += 10
            squashTrigger += 1
            addFloater(hole: hole, text: "+10", color: .yellow)
            manager.triggerHaptic(.light)
        }
        activeHole = nil
    }

    private func addFloater(hole: Int, text: String, color: Color) {
        let f = Floater(text: text, color: color)
        floaters[hole, default: []].append(f)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) {
            floaters[hole]?.removeAll { $0.id == f.id }
        }
    }

    private func endGame() {
        finished = true
        stopTimers()
        activeHole = nil
        result = manager.reportArcadeScore(.pumpkinSmash, score: score, gameName: "Pumpkin Smash")
    }
}

// ============================================================
// MARK: - GAME 3: CANDY CATCH
// ============================================================

struct FallingTreat: Identifiable {
    let id = UUID()
    var kind: TreatKind
    var x: CGFloat       // 0...1 across
    var y: CGFloat       // 0 top ... 1 bottom
    var speed: CGFloat
    var wobble: CGFloat = 0

    enum TreatKind {
        case candy(String, Int)
        case bat
        case star

        var emoji: String {
            switch self {
            case .candy(let e, _): return e
            case .bat: return "🦇"
            case .star: return "⭐"
            }
        }
    }
}

struct CandyCatchGameView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var onDone: () -> Void

    @State private var basketX: CGFloat = 0.5
    @State private var treats: [FallingTreat] = []
    @State private var score = 0
    @State private var hearts = 3
    @State private var combo = 0
    @State private var timeLeft = 60
    @State private var started = false
    @State private var finished = false
    @State private var shakeTrigger = 0
    @State private var tickClock: GameClock?
    @State private var tickAccum = 0.0
    @State private var spawnCounter = 0
    @State private var result: (xp: Int, gold: Int, isBest: Bool)?

    let candyPool = ["🍬", "🍫", "🍭", "🧁", "🍩"]

    var body: some View {
        ArcadeShell(title: "🍬 Candy Catch", onDone: onDone) {
            ZStack {
                VStack(spacing: 8) {
                    ArcadeHUD(score: score, time: timeLeft, hearts: hearts, extra: combo >= 3 ? "🔥x\(min(combo / 3 + 1, 5))" : nil)

                    GeometryReader { geo in
                        ZStack {
                            // Falling treats
                            ForEach(treats) { t in
                                Text(t.kind.emoji)
                                    .font(.system(size: t.kind.emoji == "⭐" ? 30 : 34))
                                    .position(
                                        x: t.x * geo.size.width + sin(t.wobble) * 8,
                                        y: t.y * geo.size.height
                                    )
                            }
                            // Basket
                            VStack(spacing: 0) {
                                Spacer()
                                Text("🧺")
                                    .font(.system(size: 54))
                                    .position(x: basketX * geo.size.width, y: geo.size.height - 44)
                                    .arcadeGlowPulse(.orange)
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.white.opacity(0.03))
                        .cornerRadius(16)
                        .arcadeShake(trigger: shakeTrigger)
                        .gesture(
                            DragGesture()
                                .onChanged { v in
                                    basketX = min(max(v.location.x / geo.size.width, 0.07), 0.93)
                                }
                        )
                    }
                    .padding(.horizontal)
                    .disabled(!started || finished)

                    Text("Drag anywhere to slide the basket 🧺")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
                .padding(.top)

                if !started {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeStartCard(
                        mascot: "🧺",
                        title: "Candy Catch",
                        lines: [
                            "Drag to slide the basket and catch candy",
                            "Candy +5 • ⭐ stars +20 • 🦇 bats cost a heart",
                            "Catch streaks build a combo multiplier!"
                        ]
                    ) { startGame() }
                }

                if finished, let result {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeGameOverCard(
                        title: hearts <= 0 ? "Batted!" : "Time!",
                        score: score,
                        xp: result.xp,
                        gold: result.gold,
                        isBest: result.isBest,
                        onReplay: { resetGame(); startGame() },
                        onDone: onDone
                    )
                }
            }
        }
        .onDisappear { tickClock?.invalidate(); tickClock = nil }
    }

    private func startGame() {
        resetGame()
        started = true
        manager.triggerHaptic(.medium)
        // Fixed-timestep sim (20Hz steps) on a vsync clock: identical
        // gameplay, aligned frames, correct speed on 120Hz screens.
        tickAccum = 0
        let c = GameClock(framesPerSecond: 60)
        c.add { dt in advance(dt: dt) }
        tickClock = c
    }

    /// Accumulates real time and runs whole 0.05s sim steps (max 3,
    /// then drops backlog so a hitch can't spiral into a catch-up burst).
    private func advance(dt: Double) {
        tickAccum += dt
        var steps = 0
        while tickAccum >= 0.05 && steps < 3 {
            tick()
            tickAccum -= 0.05
            steps += 1
        }
        if steps == 3 { tickAccum = 0 }
    }

    private func resetGame() {
        tickClock?.invalidate()
        tickClock = nil
        tickAccum = 0
        treats = []
        score = 0
        hearts = 3
        combo = 0
        timeLeft = 60
        finished = false
        spawnCounter = 0
        basketX = 0.5
        result = nil
    }

    private func tick() {
        guard started, !finished else { return }
        spawnCounter += 1
        if spawnCounter % 20 == 0 { timeLeft -= 1 }
        if spawnCounter % 16 == 0 { spawnTreat() }

        for i in treats.indices {
            treats[i].y += treats[i].speed
            treats[i].wobble += 0.08
        }

        // Collisions — single pass with one removal. (Was O(n²):
        // first(where:) + removeAll per treat, every 50ms.)
        var removeIDs = Set<UUID>()
        removeIDs.reserveCapacity(treats.count)
        for t in treats {
            if t.y >= 0.86 && t.y <= 0.97 && abs(t.x - basketX) < 0.09 {
                collect(t)
                removeIDs.insert(t.id)
            } else if t.y > 1.02 {
                if case .candy = t.kind { combo = 0 }
                removeIDs.insert(t.id)
            }
        }
        if !removeIDs.isEmpty { treats.removeAll { removeIDs.contains($0.id) } }

        if hearts <= 0 || timeLeft <= 0 { endGame() }
    }

    private func spawnTreat() {
        let roll = Double.random(in: 0...1)
        let kind: FallingTreat.TreatKind
        if roll < 0.12 {
            kind = .star
        } else if roll < 0.28 {
            kind = .bat
        } else {
            kind = .candy(candyPool.randomElement() ?? "🍬", 5)
        }
        treats.append(FallingTreat(
            kind: kind,
            x: CGFloat.random(in: 0.06...0.94),
            y: -0.04,
            speed: CGFloat.random(in: 0.010...0.018)
        ))
    }

    private func collect(_ t: FallingTreat) {
        switch t.kind {
        case .candy(_, let base):
            combo += 1
            let mult = min(combo / 3 + 1, 5)
            score += base * mult
            manager.triggerHaptic(.light)
        case .star:
            combo += 2
            score += 20
            manager.triggerHaptic(.success)
            manager.createParticles(at: CGPoint(x: 200, y: 300), count: 15, emoji: "⭐")
        case .bat:
            hearts -= 1
            combo = 0
            shakeTrigger += 1
            manager.triggerHaptic(.heavy)
            manager.addNotification("🦇 A bat bonked your basket! (\(max(hearts, 0))❤️ left)")
        }
    }

    private func endGame() {
        finished = true
        tickClock?.invalidate()
        tickClock = nil
        result = manager.reportArcadeScore(.candySort, score: score, gameName: "Candy Catch")
    }
}

// ============================================================
// MARK: - GAME 4: SPELL DUEL
// ============================================================

struct SpellDuelGameView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var onDone: () -> Void

    @State private var foeType: GhostType = .poltergeist
    @State private var foeHP = 100
    @State private var foeMaxHP = 100
    @State private var playerHP = 100
    @State private var playerMana = 60
    @State private var heals = 3
    @State private var turn = 1
    @State private var log: [String] = []
    @State private var started = false
    @State private var finished = false
    @State private var playerWon = false
    @State private var foeShake = 0
    @State private var playerShake = 0
    @State private var foeFlash = false
    @State private var playerFlash = false
    @State private var foeFloater: Floater?
    @State private var playerFloater: Floater?
    @State private var busy = false
    @State private var damageDealt = 0
    @State private var result: (xp: Int, gold: Int, isBest: Bool)?

    var attacks: [Spell] {
        let list = manager.spells.filter { $0.category == .attack }
        return Array(list.prefix(3))
    }

    var body: some View {
        ArcadeShell(title: "✨ Spell Duel", onDone: onDone) {
            ZStack {
                VStack(spacing: 12) {
                    // Foe
                    VStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .fill(Color.red.opacity(0.15))
                                .frame(width: 130, height: 130)
                            Text(foeType.emoji)
                                .font(.system(size: 72))
                                .arcadeFloat(amplitude: 6)
                            if let f = foeFloater {
                                FloaterStack(floaters: [f])
                            }
                        }
                        .arcadeShake(trigger: foeShake)
                        .overlay(
                            Circle()
                                .fill(Color.red.opacity(foeFlash ? 0.45 : 0))
                                .frame(width: 130, height: 130)
                        )
                        Text(foeType.rawValue)
                            .font(.headline)
                            .foregroundColor(.white)
                        duelBar(value: Double(foeHP), total: Double(foeMaxHP), color: .red)
                    }
                    .padding(.top, 4)

                    // Battle log
                    ScrollView {
                        VStack(alignment: .leading, spacing: 3) {
                            ForEach(Array(log.suffix(4).enumerated()), id: \.offset) { _, entry in
                                Text(entry)
                                    .font(.caption)
                                    .foregroundColor(.white.opacity(0.85))
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(Color.black.opacity(0.45))
                        .cornerRadius(12)
                    }
                    .frame(height: 86)
                    .padding(.horizontal)

                    // Player
                    VStack(spacing: 6) {
                        ZStack {
                            Text("🧙")
                                .font(.system(size: 56))
                            if let f = playerFloater {
                                FloaterStack(floaters: [f])
                            }
                        }
                        .arcadeShake(trigger: playerShake)
                        .overlay(
                            Circle()
                                .fill(Color.red.opacity(playerFlash ? 0.4 : 0))
                                .frame(width: 76, height: 76)
                        )
                        duelBar(value: Double(playerHP), total: 100, color: .green)
                        HStack(spacing: 10) {
                            Text("❤️ \(playerHP)")
                                .font(.caption.bold())
                            Text("🧙 \(playerMana)")
                                .font(.caption.bold())
                                .foregroundColor(.blue)
                            Text("💚×\(heals)")
                                .font(.caption.bold())
                                .foregroundColor(.green)
                            Text("Turn \(turn)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    // Actions
                    if !attacks.isEmpty {
                        HStack(spacing: 8) {
                            ForEach(attacks) { spell in
                                Button(action: { castAttack(spell) }) {
                                    VStack(spacing: 2) {
                                        Text(spell.animation).font(.title2)
                                        Text(spell.name)
                                            .font(.caption2.bold())
                                            .lineLimit(1)
                                        Text("\(spell.damage)💢 \(spell.manaCost)🧙")
                                            .font(.caption2)
                                            .foregroundColor(.white.opacity(0.75))
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .background(playerMana >= spell.manaCost ? Color.blue.opacity(0.85) : Color.gray.opacity(0.5))
                                    .cornerRadius(10)
                                }
                                .disabled(busy || playerMana < spell.manaCost)
                            }
                            Button(action: heal) {
                                VStack(spacing: 2) {
                                    Text("💚").font(.title2)
                                    Text("Heal")
                                        .font(.caption2.bold())
                                    Text("×\(heals)")
                                        .font(.caption2)
                                        .foregroundColor(.white.opacity(0.75))
                                }
                                .frame(maxWidth: 64)
                                .padding(.vertical, 8)
                                .background(heals > 0 ? Color.green.opacity(0.85) : Color.gray.opacity(0.5))
                                .cornerRadius(10)
                            }
                            .disabled(busy || heals <= 0)
                        }
                        .padding(.horizontal)
                    } else {
                        Text("No attack spells learned yet — visit Magic first! ✨")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()
                }
                .padding(.top)
                .disabled(!started || finished || busy)

                if !started {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeStartCard(
                        mascot: "✨",
                        title: "Spell Duel",
                        lines: [
                            "Duel a wild ghost with your attack spells",
                            "Watch your 🧙 mana — Heal restores 30 HP",
                            "Win fast and unharmed for a bigger score!"
                        ]
                    ) { startGame() }
                }

                if finished, let result {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeGameOverCard(
                        title: playerWon ? "Victory!" : "Defeated...",
                        score: finalScore,
                        xp: result.xp,
                        gold: result.gold,
                        isBest: result.isBest,
                        onReplay: { resetGame(); startGame() },
                        onDone: onDone
                    )
                }
            }
        }
    }

    private var finalScore: Int {
        playerWon ? 300 + playerHP * 5 - min(turn * 4, 120) : max(20, damageDealt)
    }

    private func duelBar(value: Double, total: Double, color: Color) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.14)).frame(height: 10)
                Capsule()
                    .fill(color.gradient)
                    .frame(width: geo.size.width * max(value, 0) / total, height: 10)
                    .animation(.spring(response: 0.4, dampingFraction: 0.7), value: value)
            }
        }
        .frame(width: 190, height: 10)
    }

    private func startGame() {
        resetGame()
        started = true
        manager.triggerHaptic(.medium)
        pushLog("⚔️ A wild \(foeType.rawValue) appears!")
    }

    private func resetGame() {
        foeType = GhostType.allCases.filter { $0.rarity == .common || $0.rarity == .uncommon }.randomElement() ?? .poltergeist
        foeMaxHP = 80 + manager.level * 5
        foeHP = foeMaxHP
        playerHP = 100
        playerMana = 60
        heals = 3
        turn = 1
        log = []
        finished = false
        playerWon = false
        busy = false
        damageDealt = 0
        foeFloater = nil
        playerFloater = nil
        result = nil
    }

    private func pushLog(_ s: String) {
        log.append(s)
        if log.count > 12 { log.removeFirst() }
    }

    private func flash(_ foe: Bool, text: String, color: Color) {
        if foe {
            foeFlash = true
            foeFloater = Floater(text: text, color: color)
        } else {
            playerFlash = true
            playerFloater = Floater(text: text, color: color)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            foeFlash = false
            playerFlash = false
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            foeFloater = nil
            playerFloater = nil
        }
    }

    private func castAttack(_ spell: Spell) {
        guard !busy, !finished, playerMana >= spell.manaCost else { return }
        busy = true
        playerMana -= spell.manaCost
        let variance = Int.random(in: -3...5)
        let dmg = max(1, spell.damage + variance)
        foeHP = max(0, foeHP - dmg)
        damageDealt += dmg
        foeShake += 1
        flash(true, text: "−\(dmg)", color: .yellow)
        manager.triggerHaptic(.medium)
        manager.createParticles(at: CGPoint(x: 200, y: 220), count: 12, emoji: spell.animation)
        pushLog("\(spell.animation) You cast \(spell.name): −\(dmg)!")

        if foeHP <= 0 {
            winDuel()
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.85) {
            foeTurn()
        }
    }

    private func heal() {
        guard !busy, !finished, heals > 0 else { return }
        busy = true
        heals -= 1
        playerHP = min(100, playerHP + 30)
        playerMana = min(80, playerMana + 10)
        flash(false, text: "+30", color: .green)
        manager.triggerHaptic(.light)
        pushLog("💚 You quaff a tonic: +30 HP!")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.85) {
            foeTurn()
        }
    }

    private func foeTurn() {
        guard !finished else { return }
        let dmg = Int.random(in: 8...18)
        playerHP = max(0, playerHP - dmg)
        playerShake += 1
        flash(false, text: "−\(dmg)", color: .red)
        manager.triggerHaptic(.heavy)
        pushLog("👻 \(foeType.emoji) strikes back: −\(dmg)!")
        playerMana = min(80, playerMana + 8)
        turn += 1

        if playerHP <= 0 {
            loseDuel()
            return
        }
        busy = false
    }

    private func winDuel() {
        finished = true
        playerWon = true
        manager.createParticles(at: CGPoint(x: 200, y: 300), count: 50, emoji: "🎉")
        pushLog("🎉 Victory! The ghost dissolves into stardust.")
        result = manager.reportArcadeScore(.spellDuel, score: finalScore, gameName: "Spell Duel")
    }

    private func loseDuel() {
        finished = true
        playerWon = false
        pushLog("💀 You crumple... the ghost cackles away.")
        result = manager.reportArcadeScore(.spellDuel, score: finalScore, gameName: "Spell Duel")
    }
}
