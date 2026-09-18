//
//  ArcadeGames2.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  1) INGREDIENT STASH — earnable brewing ingredients with persistence.
//     Ghosts drop essences, candy patches hide herbs, mazes / quests /
//     arcade wins stash rare finds. Brewing consumes them.
//  2) Four more REAL games: Ghost Race (tap mash-up), Trivia Night
//     (timed quiz), Rhythm of the Dead (falling-note tap), and
//     Maze Escape (hosts the full haunted maze).
//

import SwiftUI

// ============================================================
// MARK: - Ingredient Stash (manager extension)
// ============================================================

extension HalloweenUltimateManager {
    static var ghostlyDrops: [String] {
        ["🧪 Ghost Essence", "🦇 Bat Wing", "💀 Skeleton Bone", "🕷️ Spider Silk"]
    }

    static var herbalDrops: [String] {
        ["🌿 Moonflower", "🍄 Magic Mushroom", "💎 Crystal Shard"]
    }

    static var rareDrops: [String] {
        ["🐺 Wolf Hair", "🧛 Vampire Blood", "🧹 Witch Broom"]
    }

    static var allDrops: [String] {
        ghostlyDrops + herbalDrops + rareDrops
    }

    private var stashDefaultsKey: String { "ultimateIngredientStash" }

    /// Starter kit so brewing works on day one.
    func ensureStarterIngredients() {
        loadIngredientStash()
        if ingredientStash.isEmpty {
            ingredientStash = [
                "🧪 Ghost Essence": 2,
                "🍄 Magic Mushroom": 2,
                "🌿 Moonflower": 2,
                "💎 Crystal Shard": 1
            ]
            saveIngredientStash()
        }
    }

    func addIngredient(_ name: String, count: Int = 1) {
        ingredientStash[name, default: 0] += count
        saveIngredientStash()
    }

    /// Returns false (leaving the stash untouched) unless every name is held.
    func useIngredients(_ names: [String]) -> Bool {
        var counts: [String: Int] = [:]
        for n in names { counts[n, default: 0] += 1 }
        for (n, c) in counts {
            if (ingredientStash[n] ?? 0) < c { return false }
        }
        for (n, c) in counts {
            ingredientStash[n, default: 0] -= c
        }
        saveIngredientStash()
        return true
    }

    func ingredientCount(_ name: String) -> Int {
        ingredientStash[name] ?? 0
    }

    func totalIngredients() -> Int {
        ingredientStash.values.reduce(0, +)
    }

    func saveIngredientStash() {
        if let data = try? JSONEncoder().encode(ingredientStash) {
            UserDefaults.standard.set(data, forKey: stashDefaultsKey)
        }
    }

    func loadIngredientStash() {
        if let data = UserDefaults.standard.data(forKey: stashDefaultsKey),
           let stash = try? JSONDecoder().decode([String: Int].self, from: data) {
            ingredientStash = stash
        }
    }
}

// ============================================================
// MARK: - GAME 6: GHOST RACE (mash-up)
// ============================================================

struct GhostRaceGameView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var onDone: () -> Void

    @State private var countdown = 3
    @State private var racing = false
    @State private var finished = false
    @State private var timeLeft: Double = 12
    @State private var player = 0.0
    @State private var rivals = [0.0, 0.0, 0.0]
    @State private var taps = 0
    @State private var squashTrigger = 0
    @State private var timer: Timer?
    @State private var result: (xp: Int, gold: Int, isBest: Bool)?
    @State private var finalScore = 0

    let rivalEmoji = ["🧛", "🐺", "🧙"]
    let rivalBase = [8.2, 9.3, 10.2]
    let rivalPhase = [0.0, 2.1, 4.2]

    var body: some View {
        ArcadeShell(title: "👻 Ghost Race", onDone: onDone) {
            ZStack {
                VStack(spacing: 10) {
                    ArcadeHUD(score: finalScore, time: Int(ceil(timeLeft)), extra: "Taps \(taps)")

                    // Tracks
                    VStack(spacing: 10) {
                        raceLane(emoji: "👻", name: "YOU", progress: player, highlight: true)
                        ForEach(0..<3, id: \.self) { i in
                            raceLane(emoji: rivalEmoji[i], name: ["Vlad", "Luna", "Winnie"][i], progress: rivals[i], highlight: false)
                        }
                    }
                    .padding(.horizontal)

                    Spacer()

                    // Mash button
                    Button(action: mash) {
                        Text("FLAP! 👻")
                            .font(.largeTitle.weight(.black))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 26)
                            .background(
                                racing && !finished ? Color.orange.gradient : Color.gray.gradient,
                                in: RoundedRectangle(cornerRadius: 20)
                            )
                            .arcadeSquash(trigger: squashTrigger)
                            .arcadeGlowPulse(racing && !finished ? .orange : .clear)
                    }
                    .disabled(!racing || finished)
                    .padding(.horizontal)
                    .padding(.bottom, 6)

                    Text(racing ? "Mash FLAP as fast as you can!" : "Get ready…")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.65))
                }
                .padding(.top)

                if !racing && !finished {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    if countdown > 0 {
                        Text("\(countdown)")
                            .font(.system(size: 110, weight: .black))
                            .foregroundColor(.orange)
                            .arcadePopIn()
                    } else {
                        ArcadeStartCard(
                            mascot: "👻",
                            title: "Ghost Race",
                            lines: [
                                "Mash FLAP! to fly your ghost down the track",
                                "Beat Vlad, Luna and Winnie over 12 seconds",
                                "1st place pays huge — every tap counts!"
                            ]
                        ) { startCountdown() }
                    }
                }

                if finished, let result {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeGameOverCard(
                        title: placementTitle,
                        score: finalScore,
                        xp: result.xp,
                        gold: result.gold,
                        isBest: result.isBest,
                        onReplay: { resetGame(); startCountdown() },
                        onDone: onDone
                    )
                }
            }
        }
        .onDisappear { timer?.invalidate() }
    }

    private var placement: Int {
        var place = 1
        for r in rivals where r >= 100 && player < 100 { place += 1 }
        for r in rivals where r > player { if !(r >= 100 && player < 100) { place += 1 } }
        return min(place, 4)
    }

    private var placementTitle: String {
        switch placement {
        case 1: return "🥇 Champions!"
        case 2: return "🥈 So close!"
        case 3: return "🥉 Third!"
        default: return "Last…"
        }
    }

    private func raceLane(emoji: String, name: String, progress: Double, highlight: Bool) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text(name).font(.caption2.bold()).foregroundColor(highlight ? .orange : .white.opacity(0.7))
                Spacer()
                Text("\(Int(min(progress, 100)))%").font(.caption2.monospacedDigit()).foregroundColor(.white.opacity(0.7))
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.white.opacity(0.10))
                        .frame(height: 34)
                    Text("🏁")
                        .position(x: geo.size.width - 12, y: 17)
                    Text(emoji)
                        .font(.system(size: 28))
                        .position(x: 18 + CGFloat(min(progress, 100) / 100) * (geo.size.width - 44), y: 17)
                        .animation(.linear(duration: 0.12), value: progress)
                }
            }
            .frame(height: 34)
            .background(highlight ? Color.orange.opacity(0.08) : Color.clear)
            .cornerRadius(8)
        }
    }

    private func startCountdown() {
        resetGame()
        countdown = 3
        manager.triggerHaptic(.medium)
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { t in
            countdown -= 1
            manager.triggerHaptic(.light)
            if countdown <= 0 {
                t.invalidate()
                racing = true
                runRace()
            }
        }
    }

    private func resetGame() {
        timer?.invalidate()
        player = 0
        rivals = [0, 0, 0]
        taps = 0
        timeLeft = 12
        finished = false
        racing = false
        finalScore = 0
        result = nil
    }

    private func runRace() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            timeLeft -= 0.1
            for i in 0..<3 {
                let wobble = 1 + 0.3 * sin(timeLeft * 2 + rivalPhase[i])
                var speed = rivalBase[i] * wobble
                // Rubber-band: trailing rivals push a little harder.
                if rivals[i] < player - 12 { speed *= 1.18 }
                rivals[i] = min(100, rivals[i] + speed * 0.1)
            }
            if timeLeft <= 0 || player >= 100 {
                endRace()
            }
        }
    }

    private func mash() {
        guard racing, !finished else { return }
        taps += 1
        squashTrigger += 1
        player = min(100, player + 1.35)
        if taps % 6 == 0 { manager.triggerHaptic(.light) }
        if player >= 100 { endRace() }
    }

    private func endRace() {
        timer?.invalidate()
        finished = true
        racing = false
        let table = [400, 250, 150, 80]
        finalScore = table[max(0, min(placement - 1, 3))] + taps * 2
        result = manager.reportArcadeScore(.ghostRace, score: finalScore, gameName: "Ghost Race")
    }
}

// ============================================================
// MARK: - GAME 7: TRIVIA NIGHT (timed quiz)
// ============================================================

struct TriviaQuestion {
    var text: String
    var options: [String]
    var answer: Int
}

let triviaBank: [TriviaQuestion] = [
    TriviaQuestion(text: "On which night is Halloween?", options: ["Oct 31", "Nov 1", "Oct 13", "Dec 31"], answer: 0),
    TriviaQuestion(text: "What are vampires said to fear?", options: ["Chocolate", "Garlic", "Moonlight", "Spiders"], answer: 1),
    TriviaQuestion(text: "A group of witches is called a…", options: ["Flock", "Pack", "Coven", "Swarm"], answer: 2),
    TriviaQuestion(text: "The first jack-o'-lanterns were carved from…", options: ["Pumpkins", "Turnips", "Apples", "Melons"], answer: 1),
    TriviaQuestion(text: "Where did Halloween originate?", options: ["Transylvania", "Hollywood", "Ireland", "Salem"], answer: 2),
    TriviaQuestion(text: "What reanimated Frankenstein's monster?", options: ["Moonlight", "Potions", "Electricity", "Spells"], answer: 2),
    TriviaQuestion(text: "Which candy is THE Halloween icon?", options: ["Candy corn", "Taffy", "Licorice", "Mints"], answer: 0),
    TriviaQuestion(text: "How many legs does a spider have?", options: ["6", "8", "10", "12"], answer: 1),
    TriviaQuestion(text: "What do ghosts love to say?", options: ["Hello", "Boo!", "Shhh", "Yum"], answer: 1),
    TriviaQuestion(text: "Which moon makes werewolves howl?", options: ["Crescent", "Full moon", "New moon", "Half moon"], answer: 1)
]

struct TriviaGameView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var onDone: () -> Void

    @State private var order: [TriviaQuestion] = []
    @State private var index = 0
    @State private var correct = 0
    @State private var streak = 0
    @State private var bestStreak = 0
    @State private var picked: Int?
    @State private var timeLeft = 12.0
    @State private var started = false
    @State private var finished = false
    @State private var shakeTrigger = 0
    @State private var timer: Timer?
    @State private var result: (xp: Int, gold: Int, isBest: Bool)?
    @State private var finalScore = 0

    let totalQuestions = 8

    var body: some View {
        ArcadeShell(title: "🧠 Trivia Night", onDone: onDone) {
            ZStack {
                VStack(spacing: 14) {
                    ArcadeHUD(score: finalScore, extra: "Q \(min(index + 1, totalQuestions))/\(totalQuestions) • 🔥\(streak)")

                    // Timer bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.white.opacity(0.12)).frame(height: 8)
                            Capsule()
                                .fill(timeLeft < 4 ? Color.red.gradient : Color.blue.gradient)
                                .frame(width: geo.size.width * max(timeLeft, 0) / 12, height: 8)
                        }
                    }
                    .frame(height: 8)
                    .padding(.horizontal)

                    if index < order.count {
                        VStack(spacing: 14) {
                            Text(order[index].text)
                                .font(.title3.bold())
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                                .id("q\(index)")
                                .arcadePopIn()

                            ForEach(Array(order[index].options.enumerated()), id: \.offset) { i, option in
                                Button(action: { pick(i) }) {
                                    Text(option)
                                        .font(.headline)
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(optionColor(i))
                                        .cornerRadius(12)
                                }
                                .disabled(picked != nil)
                                .arcadePopIn(delay: Double(i) * 0.06)
                            }
                        }
                        .padding(.horizontal)
                        .arcadeShake(trigger: shakeTrigger)
                    }

                    Spacer()
                }
                .padding(.top)
                .disabled(!started || finished)

                if !started {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeStartCard(
                        mascot: "🧠",
                        title: "Trivia Night",
                        lines: [
                            "8 spooky questions, 12 seconds each",
                            "Correct = 100 pts, streaks earn bonuses",
                            "Wrong answers break your streak!"
                        ]
                    ) { startGame() }
                }

                if finished, let result {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeGameOverCard(
                        title: correct >= 6 ? "Spooky Scholar!" : "Game Over",
                        score: finalScore,
                        xp: result.xp,
                        gold: result.gold,
                        isBest: result.isBest,
                        onReplay: { startGame() },
                        onDone: onDone
                    )
                }
            }
        }
        .onDisappear { timer?.invalidate() }
    }

    private func optionColor(_ i: Int) -> Color {
        guard let picked else { return Color.white.opacity(0.10) }
        if i == order[index].answer { return Color.green.opacity(0.8) }
        if i == picked { return Color.red.opacity(0.8) }
        return Color.white.opacity(0.10)
    }

    private func startGame() {
        timer?.invalidate()
        order = Array(triviaBank.shuffled().prefix(totalQuestions))
        index = 0
        correct = 0
        streak = 0
        bestStreak = 0
        picked = nil
        timeLeft = 12
        finalScore = 0
        finished = false
        result = nil
        started = true
        manager.triggerHaptic(.medium)
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            timeLeft -= 0.1
            if timeLeft <= 0 { lockAnswer(picked) }
        }
    }

    private func pick(_ i: Int) {
        guard picked == nil else { return }
        lockAnswer(i)
    }

    private func lockAnswer(_ i: Int?) {
        picked = i
        if i == order[index].answer {
            correct += 1
            streak += 1
            bestStreak = max(bestStreak, streak)
            finalScore += 100 + streak * 10
            manager.triggerHaptic(.success)
            manager.createParticles(at: CGPoint(x: 200, y: 300), count: 12, emoji: "✨")
        } else {
            streak = 0
            shakeTrigger += 1
            manager.triggerHaptic(.heavy)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) {
            index += 1
            if index >= totalQuestions {
                endGame()
            } else {
                picked = nil
                timeLeft = 12
            }
        }
    }

    private func endGame() {
        timer?.invalidate()
        finished = true
        finalScore += bestStreak * 15
        result = manager.reportArcadeScore(.trivia, score: finalScore, gameName: "Trivia Night")
    }
}

// ============================================================
// MARK: - GAME 8: RHYTHM OF THE DEAD (falling notes)
// ============================================================

struct RhythmNote: Identifiable {
    let id = UUID()
    var lane: Int
    var y: CGFloat = -0.08
    var judged = false
    var missed = false
}

struct RhythmGameView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var onDone: () -> Void

    @State private var notes: [RhythmNote] = []
    @State private var score = 0
    @State private var combo = 0
    @State private var bestCombo = 0
    @State private var perfects = 0
    @State private var timeLeft = 30
    @State private var started = false
    @State private var finished = false
    @State private var spawnAccum = 0.0
    @State private var laneFlash = [false, false, false, false]
    @State private var shakeTrigger = 0
    @State private var clock: GameClock?
    @State private var result: (xp: Int, gold: Int, isBest: Bool)?

    let laneEmoji = ["👻", "🎃", "🦇", "🍬"]
    let laneColors: [Color] = [.purple, .orange, .blue, .pink]
    let hitY: CGFloat = 0.82
    let fallTime = 2.0

    var body: some View {
        ArcadeShell(title: "🎵 Rhythm of the Dead", onDone: onDone) {
            ZStack {
                VStack(spacing: 8) {
                    ArcadeHUD(score: score, time: timeLeft, extra: combo >= 4 ? "🔥x\(min(combo / 4 + 1, 4))" : "combo \(combo)")

                    GeometryReader { geo in
                        ZStack {
                            // Lanes
                            HStack(spacing: 6) {
                                ForEach(0..<4, id: \.self) { lane in
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(laneFlash[lane] ? laneColors[lane].opacity(0.55) : Color.white.opacity(0.07))
                                        .frame(width: (geo.size.width - 30) / 4)
                                }
                            }
                            // Hit line
                            Rectangle()
                                .fill(Color.yellow.opacity(0.7))
                                .frame(height: 3)
                                .position(x: geo.size.width / 2, y: hitY * geo.size.height)
                                .shadow(color: .yellow.opacity(0.6), radius: 6)
                            // Notes
                            ForEach(notes) { n in
                                if !n.judged {
                                    Text(laneEmoji[n.lane])
                                        .font(.system(size: 32))
                                        .position(
                                            x: laneCenter(n.lane, width: geo.size.width),
                                            y: n.y * geo.size.height
                                        )
                                        .opacity(n.missed ? 0.25 : 1)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.35))
                        .cornerRadius(16)
                        .arcadeShake(trigger: shakeTrigger)
                    }
                    .padding(.horizontal)

                    // Pads
                    HStack(spacing: 6) {
                        ForEach(0..<4, id: \.self) { lane in
                            Button(action: { tapLane(lane) }) {
                                Text(laneEmoji[lane])
                                    .font(.system(size: 30))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(laneColors[lane].opacity(0.35))
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(laneColors[lane].opacity(0.6), lineWidth: 1)
                                    )
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 4)
                    .disabled(!started || finished)
                }
                .padding(.top)

                if !started {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeStartCard(
                        mascot: "🎵",
                        title: "Rhythm of the Dead",
                        lines: [
                            "Tap the pads as notes cross the golden line",
                            "Dead-center = PERFECT (+100), close = good (+40)",
                            "Streaks multiply your groove — don't break it!"
                        ]
                    ) { startGame() }
                }

                if finished, let result {
                    Color.black.opacity(0.72).ignoresSafeArea()
                    ArcadeGameOverCard(
                        title: perfects >= 15 ? "Undead Headliner!" : "Encore!",
                        score: score,
                        xp: result.xp,
                        gold: result.gold,
                        isBest: result.isBest,
                        onReplay: { startGame() },
                        onDone: onDone
                    )
                }
            }
        }
        .onDisappear { clock?.invalidate(); clock = nil }
    }

    private func laneCenter(_ lane: Int, width: CGFloat) -> CGFloat {
        let w = (width - 30) / 4
        return 15 + w * CGFloat(lane) + w / 2
    }

    private func startGame() {
        clock?.invalidate()
        clock = nil
        notes = []
        score = 0
        combo = 0
        bestCombo = 0
        perfects = 0
        timeLeft = 30
        songLeft = 30
        spawnAccum = 0
        finished = false
        result = nil
        started = true
        manager.triggerHaptic(.medium)
        // Vsync display-link instead of a fixed 0.05s Timer: the dt-based
        // tick below stays speed-correct and judder-free on all screens.
        let c = GameClock(framesPerSecond: 60)
        c.add { dt in tick(dt: dt) }
        clock = c
    }

    private func tick(dt: Double) {
        guard started, !finished else { return }
        spawnAccum += dt
        if spawnAccum >= 0.55 {
            spawnAccum = 0
            notes.append(RhythmNote(lane: Int.random(in: 0..<4)))
        }
        for i in notes.indices where !notes[i].judged {
            notes[i].y += CGFloat(dt / fallTime)
            if notes[i].y > 0.98 {
                notes[i].judged = true
                notes[i].missed = true
                combo = 0
            }
        }
        notes.removeAll { $0.y > 1.08 }

        // Song clock
        songTick(dt: dt)
    }

    @State private var songLeft = 30.0
    private func songTick(dt: Double) {
        songLeft -= dt
        timeLeft = Int(ceil(songLeft))
        if songLeft <= 0 { endGame() }
    }

    private func tapLane(_ lane: Int) {
        guard started, !finished else { return }
        laneFlash[lane] = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
            laneFlash[lane] = false
        }
        // Nearest unjudged note in this lane near the line
        var best: (index: Int, dist: CGFloat)?
        for (i, n) in notes.enumerated() where !n.judged && n.lane == lane {
            let d = abs(n.y - hitY)
            if best == nil || d < best!.dist { best = (i, d) }
        }
        guard let hit = best else {
            combo = 0
            return
        }
        let mult = min(combo / 4 + 1, 4)
        if hit.dist < 0.05 {
            notes[hit.index].judged = true
            combo += 1
            bestCombo = max(bestCombo, combo)
            perfects += 1
            score += 100 * mult
            manager.triggerHaptic(.success)
            manager.createParticles(at: CGPoint(x: 200, y: 400), count: 6, emoji: "✨")
        } else if hit.dist < 0.11 {
            notes[hit.index].judged = true
            combo += 1
            bestCombo = max(bestCombo, combo)
            score += 40 * mult
            manager.triggerHaptic(.light)
        } else {
            combo = 0
            shakeTrigger += 1
            manager.triggerHaptic(.heavy)
        }
        notes.removeAll { $0.judged && !$0.missed }
    }

    private func endGame() {
        clock?.invalidate()
        clock = nil
        finished = true
        score += bestCombo * 5
        result = manager.reportArcadeScore(.rhythm, score: score, gameName: "Rhythm of the Dead")
    }
}

// ============================================================
// MARK: - GAME 9: MAZE ESCAPE HOST (full haunted maze)
// ============================================================

struct MazeEscapeHostView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var onDone: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            UltimateMazeTabView()
            Button(action: onDone) {
                Text("Done")
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(10)
            }
            .padding(.trailing, 14)
            .padding(.top, 54)
        }
    }
}
