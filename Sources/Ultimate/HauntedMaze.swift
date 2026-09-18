//
//  HauntedMaze.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Haunted ghost-house maze, ported from HallowHunt:
//  - Raven Lane haunted houses (scareLevel + candy per house)
//  - Knock-to-enter (3 knocks) + "Peek Inside"
//  - Neighborhood map canvas with roads + house grid
//  - Fog overlay -> fog-of-war maze crawling
//  - Candy pickups + ghost encounters wired into HalloweenUltimateManager
//

import SwiftUI

// ============================================================
// MARK: - Maze Houses (from HallowHunt's Raven Lane database)
// ============================================================

struct MazeHouse: Identifiable {
    let id = UUID()
    var name: String
    var street: String
    var scare: Int      // 1...10, like HallowHunt's scareLevel
    var candyReward: Int
    var emoji: String
    var blurb: String

    var difficultyLabel: String {
        switch scare {
        case 1...3: return "Easy"
        case 4...6: return "Medium"
        case 7...8: return "Hard"
        default: return "Nightmare"
        }
    }

    var difficultyColor: Color {
        switch scare {
        case 1...3: return .green
        case 4...6: return .yellow
        case 7...8: return .orange
        default: return .red
        }
    }
}

let mazeHouses: [MazeHouse] = [
    MazeHouse(name: "Cemetery Manor", street: "13 Raven Lane", scare: 6, candyReward: 40, emoji: "🏚️", blurb: "Whispers follow you down every corridor."),
    MazeHouse(name: "Castle of Shadows", street: "66 Raven Lane", scare: 9, candyReward: 70, emoji: "🏰", blurb: "The walls move when the candles flicker."),
    MazeHouse(name: "Abandoned Asylum", street: "31 Raven Lane", scare: 7, candyReward: 55, emoji: "🏥", blurb: "Empty wheelchairs roll past on their own."),
    MazeHouse(name: "Witch's Cottage", street: "7 Raven Lane", scare: 4, candyReward: 30, emoji: "🛖", blurb: "Gingerbread walls. Something nibbles back."),
    MazeHouse(name: "Vampire Castle", street: "99 Raven Lane", scare: 10, candyReward: 90, emoji: "🏯", blurb: "No mirrors. No reflections. No mercy."),
    MazeHouse(name: "Ghostly Mansion", street: "45 Raven Lane", scare: 8, candyReward: 65, emoji: "🏛️", blurb: "Every portrait watches you leave."),
    MazeHouse(name: "Werewolf Den", street: "23 Raven Lane", scare: 5, candyReward: 35, emoji: "🏕️", blurb: "Scratch marks climb all four walls."),
    MazeHouse(name: "Pumpkin Patch Crypt", street: "3 Raven Lane", scare: 3, candyReward: 25, emoji: "🎃", blurb: "The pumpkins grin a little too wide.")
]

// ============================================================
// MARK: - Maze Engine
// ============================================================

struct MazePos: Hashable {
    var x: Int
    var y: Int

    func manhattan(to other: MazePos) -> Int {
        abs(x - other.x) + abs(y - other.y)
    }
}

enum MazeDirection: CaseIterable {
    case up, down, left, right

    var delta: (dx: Int, dy: Int) {
        switch self {
        case .up: return (0, -1)
        case .down: return (0, 1)
        case .left: return (-1, 0)
        case .right: return (1, 0)
        }
    }

    var arrow: String {
        switch self {
        case .up: return "arrow.up"
        case .down: return "arrow.down"
        case .left: return "arrow.left"
        case .right: return "arrow.right"
        }
    }
}

// Tiny deterministic RNG so each house always builds the same maze.
struct MazeRNG {
    var state: UInt64

    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }

    mutating func nextInt(upperBound: Int) -> Int {
        guard upperBound > 0 else { return 0 }
        return Int(next() % UInt64(upperBound))
    }

    mutating func shuffle<T>(_ array: [T]) -> [T] {
        var a = array
        guard a.count > 1 else { return a }
        for i in stride(from: a.count - 1, through: 1, by: -1) {
            let j = nextInt(upperBound: i + 1)
            a.swapAt(i, j)
        }
        return a
    }
}

struct HauntedMaze {
    static let cols = 11
    static let rows = 9

    var walls: Set<MazePos>
    var candyCells: Set<MazePos>
    var ghostCells: Set<MazePos>
    var trapCells: Set<MazePos>
    var entrance = MazePos(x: 1, y: 1)
    var exit = MazePos(x: 9, y: 7)

    // Fixed wall skeleton (guaranteed solvable) + seeded pickups.
    static func generate(houseIndex: Int, scare: Int) -> HauntedMaze {
        var walls = Set<MazePos>()

        // Border
        for x in 0..<cols {
            walls.insert(MazePos(x: x, y: 0))
            walls.insert(MazePos(x: x, y: rows - 1))
        }
        for y in 0..<rows {
            walls.insert(MazePos(x: 0, y: y))
            walls.insert(MazePos(x: cols - 1, y: y))
        }

        // Interior: hall partitions with gaps (HallowHunt manor wings)
        for y in [1, 2, 4, 5] { walls.insert(MazePos(x: 3, y: y)) }       // west wing, gap at y=3
        for y in [3, 4, 6, 7] { walls.insert(MazePos(x: 7, y: y)) }       // east wing, gap at y=5
        for x in [1, 2, 3] { walls.insert(MazePos(x: x, y: 6)) }          // cellar wall
        for x in [8, 9] { walls.insert(MazePos(x: x, y: 2)) }             // attic wall
        walls.insert(MazePos(x: 5, y: 4))

        let entrance = MazePos(x: 1, y: 1)
        let exit = MazePos(x: 9, y: 7)

        // Open-floor candidates
        var candidates: [MazePos] = []
        for x in 1..<(cols - 1) {
            for y in 1..<(rows - 1) {
                let p = MazePos(x: x, y: y)
                if walls.contains(p) { continue }
                if p == entrance || p == exit { continue }
                candidates.append(p)
            }
        }

        var rng = MazeRNG(state: UInt64(houseIndex * 1000 + scare * 77 + 13))
        let shuffled = rng.shuffle(candidates)

        let ghostCount = min(2 + scare / 2, 6)
        let candyCount = min(4 + scare / 2, 8)
        let trapCount = min(scare / 3, 3)

        return HauntedMaze(
            walls: walls,
            candyCells: Set(shuffled.prefix(candyCount)),
            ghostCells: Set(shuffled.dropFirst(candyCount).prefix(ghostCount)),
            trapCells: Set(shuffled.dropFirst(candyCount + ghostCount).prefix(trapCount)),
            entrance: entrance,
            exit: exit
        )
    }

    func isWall(_ p: MazePos) -> Bool { walls.contains(p) }
    func inBounds(_ p: MazePos) -> Bool {
        p.x >= 0 && p.y >= 0 && p.x < Self.cols && p.y < Self.rows
    }
}

// ============================================================
// MARK: - Maze Tab View (house picker + playable maze)
// ============================================================

enum MazePhase: Equatable {
    case pick
    case knock
    case play
    case won
    case lost
}

struct UltimateMazeTabView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    @State private var phase: MazePhase = .pick
    @State private var houseIndex = 0
    @State private var knocks = 0
    @State private var maze = HauntedMaze.generate(houseIndex: 0, scare: 6)
    @State private var player = MazePos(x: 1, y: 1)
    @State private var visited: Set<MazePos> = [MazePos(x: 1, y: 1)]
    @State private var remainingCandy: Set<MazePos> = []
    @State private var remainingGhosts: Set<MazePos> = []
    @State private var remainingTraps: Set<MazePos> = []
    @State private var moves = 0
    @State private var courage = 3
    @State private var mazeCandy = 0
    @State private var ghostsMet = 0
    @State private var elapsed = 0
    @State private var peeking = false
    @State private var bump = false
    @AppStorage("mazeEscapes") private var escapes = 0

    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var house: MazeHouse { mazeHouses[houseIndex] }

    var body: some View {
        NavigationView {
            ZStack {
                Color.clear

                ScrollView {
                    VStack(spacing: 14) {
                        // Header
                        HStack {
                            Text("🌀 Haunted Maze")
                                .font(.title2.bold())
                            Spacer()
                            StatBadge(icon: "🏆", value: "\(escapes)", color: .gold)
                        }
                        .padding(.horizontal)

                        Text("Raven Lane's houses hide winding mazes. Knock thrice, brave the fog, grab candy, dodge traps — and find the 🚪.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)

                        // Mini neighborhood strip (HallowHunt map homage)
                        neighborhoodStrip

                        if phase == .pick {
                            housePicker
                        } else if phase == .knock {
                            knockCard
                        } else {
                            mazeHUD
                            mazeBoard
                            controlsRow
                        }

                    }
                    .padding(.vertical)
                }

                // Result bottom-sheets: slide up over the board without shifting it
                if phase == .won || phase == .lost {
                    Color.black.opacity(0.45)
                        .ignoresSafeArea()
                        .transition(.opacity)
                        .onTapGesture {}
                    VStack {
                        Spacer()
                        if phase == .won { winCard } else { loseCard }
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .padding(.bottom, 10)
                }
            }
            .animation(.spring(response: 0.45, dampingFraction: 0.85), value: phase)
            .navigationTitle("🌀 Maze")
            .navigationBarTitleDisplayMode(.inline)
            .onReceive(timer) { _ in
                if phase == .play { elapsed += 1 }
            }
        }
    }

    // MARK: - Neighborhood strip (roads + houses, like HallowHunt's map)

    private var neighborhoodStrip: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.purple.opacity(0.12))
                .frame(height: 74)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.purple.opacity(0.25), lineWidth: 1)
                )
            Canvas { ctx, size in
                var road = Path()
                road.move(to: CGPoint(x: 8, y: size.height / 2))
                road.addLine(to: CGPoint(x: size.width - 8, y: size.height / 2))
                ctx.stroke(road, with: .color(.white.opacity(0.25)), style: StrokeStyle(lineWidth: 5, lineCap: .round, dash: [6, 8]))
                for i in 0..<8 {
                    let x = 14 + CGFloat(i) * ((size.width - 28) / 8)
                    let rect = CGRect(x: x, y: size.height / 2 - 30, width: (size.width - 28) / 8 - 6, height: 22)
                    let selected = i == houseIndex
                    ctx.fill(Path(roundedRect: rect, cornerRadius: 5), with: .color(selected ? .orange.opacity(0.95) : .purple.opacity(0.55)))
                }
            }
            .frame(height: 74)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            HStack {
                Text("🌫️ Raven Lane")
                    .font(.caption.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.black.opacity(0.55))
                    .cornerRadius(8)
                    .padding(8)
                Spacer()
            }
        }
        .padding(.horizontal)
    }

    // MARK: - House picker

    private var housePicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Choose a haunted house")
                .font(.headline)
                .padding(.horizontal)

            ForEach(Array(mazeHouses.enumerated()), id: \.element.id) { idx, h in
                Button(action: {
                    houseIndex = idx
                    knocks = 0
                    manager.triggerHaptic(.medium)
                    withAnimation(.spring()) { phase = .knock }
                }) {
                    HStack(spacing: 12) {
                        Text(h.emoji)
                            .font(.system(size: 40))
                            .frame(width: 64, height: 64)
                            .background(Color.purple.opacity(0.12))
                            .cornerRadius(12)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(h.name)
                                .font(.headline)
                            Text(h.street)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            HStack(spacing: 6) {
                                Text(h.difficultyLabel)
                                    .font(.caption2.bold())
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 2)
                                    .background(h.difficultyColor.opacity(0.2))
                                    .foregroundColor(h.difficultyColor)
                                    .cornerRadius(6)
                                Text("🍬 \(h.candyReward)")
                                    .font(.caption2)
                                Text("👻×\(min(2 + h.scare / 2, 6))")
                                    .font(.caption2)
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color(.systemBackground).opacity(0.85))
                            .shadow(color: .purple.opacity(0.12), radius: 8)
                    )
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Knock card (HallowHunt knock-to-enter)

    private var knockCard: some View {
        VStack(spacing: 16) {
            Text(house.emoji)
                .font(.system(size: 80))
                .scaleEffect(1.0 + CGFloat(knocks) * 0.06)
                .animation(.spring(), value: knocks)

            Text(house.name)
                .font(.title.bold())
            Text("\(house.street) • Scare \(house.scare)/10")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Text(house.blurb)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Text(knockText)
                .font(.headline)
                .foregroundColor(.orange)

            HStack(spacing: 12) {
                Button(action: { withAnimation { phase = .pick } }) {
                    Text("Leave")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                }

                Button(action: knock) {
                    HStack {
                        Image(systemName: "hand.tap.fill")
                        Text(knocks == 0 ? "Knock Knock" : "Knock Again (\(knocks))")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(gradient: Gradient(colors: [.orange, .red]), startPoint: .leading, endPoint: .trailing)
                    )
                    .cornerRadius(12)
                }

                Button(action: {
                    manager.addNotification("👀 You peek through the keyhole of \(house.name)... something blinks back.")
                    manager.triggerHaptic(.medium)
                }) {
                    Text("Peek")
                        .padding()
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
    }

    private var knockText: String {
        switch knocks {
        case 0: return "The door waits..."
        case 1: return "*creak...*"
        case 2: return "*something shuffles inside...*"
        default: return "The maze door swings open! 🌀"
        }
    }

    private func knock() {
        knocks += 1
        manager.triggerHaptic(.heavy)
        if knocks >= 3 {
            startMaze()
        }
    }

    private func startMaze() {
        maze = HauntedMaze.generate(houseIndex: houseIndex, scare: house.scare)
        player = maze.entrance
        visited = [maze.entrance]
        remainingCandy = maze.candyCells
        remainingGhosts = maze.ghostCells
        remainingTraps = maze.trapCells
        moves = 0
        courage = 3
        mazeCandy = 0
        ghostsMet = 0
        elapsed = 0
        peeking = false
        manager.addNotification("🌀 Entered the maze beneath \(house.name)! Find the 🚪!")
        withAnimation { phase = .play }
    }

    // MARK: - Maze HUD

    private var mazeHUD: some View {
        VStack(spacing: 8) {
            HStack {
                Text("\(house.emoji) \(house.name)")
                    .font(.headline)
                    .lineLimit(1)
                Spacer()
                Text("⏱️ \(elapsed)s")
                    .font(.caption.monospacedDigit())
                    .foregroundColor(.secondary)
            }
            HStack(spacing: 10) {
                StatBadge(icon: "👣", value: "\(moves)", color: .blue)
                StatBadge(icon: "🍬", value: "\(mazeCandy)", color: .pink)
                StatBadge(icon: "👻", value: "\(ghostsMet)", color: .purple)
                HStack(spacing: 2) {
                    ForEach(0..<3, id: \.self) { i in
                        Text(i < courage ? "❤️" : "🖤")
                            .font(.caption)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.red.opacity(0.12))
                .cornerRadius(8)
                Spacer()
                Button(action: {
                    if manager.gold >= 10 {
                        manager.gold -= 10
                        peeking = true
                        manager.addNotification("🕯️ Candle lit! The whole maze glows for a while.")
                        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { peeking = false }
                    } else {
                        manager.addNotification("❌ Not enough gold for a candle (10🪙)!")
                    }
                }) {
                    Text("🕯️ Peek")
                        .font(.caption.bold())
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(8)
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Maze board with fog-of-war

    private var cellSize: CGFloat {
        (UIScreen.main.bounds.width - 56) / CGFloat(HauntedMaze.cols)
    }

    private var mazeBoard: some View {
        VStack(spacing: 2) {
            ForEach(0..<HauntedMaze.rows, id: \.self) { y in
                HStack(spacing: 2) {
                    ForEach(0..<HauntedMaze.cols, id: \.self) { x in
                        mazeCell(at: MazePos(x: x, y: y))
                    }
                }
            }
        }
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.black.opacity(0.55))
                .shadow(color: .purple.opacity(0.25), radius: 12)
        )
        .padding(.horizontal, 12)
        .scaleEffect(bump ? 1.01 : 1.0)
        .gesture(
            DragGesture(minimumDistance: 22)
                .onEnded { value in
                    let dx = value.translation.width
                    let dy = value.translation.height
                    if abs(dx) > abs(dy) {
                        move(dx > 0 ? .right : .left)
                    } else {
                        move(dy > 0 ? .down : .up)
                    }
                }
        )
    }

    private func isVisible(_ p: MazePos) -> Bool {
        peeking || player.manhattan(to: p) <= 2
    }

    @ViewBuilder
    private func mazeCell(at p: MazePos) -> some View {
        let s = cellSize
        ZStack {
            RoundedRectangle(cornerRadius: 5)
                .fill(cellColor(at: p))
                .frame(width: s, height: s)

            if !maze.isWall(p) {
                if p == player {
                    Text("🧙")
                        .font(.system(size: s * 0.72))
                } else if isVisible(p) || visited.contains(p) {
                    if p == maze.exit {
                        Text("🚪").font(.system(size: s * 0.7))
                    } else if remainingCandy.contains(p) {
                        Text("🍬").font(.system(size: s * 0.62))
                    } else if remainingGhosts.contains(p) {
                        Text("👻").font(.system(size: s * 0.62))
                    } else if remainingTraps.contains(p) {
                        Text("🕸️").font(.system(size: s * 0.55)).opacity(0.85)
                    }
                }
            }

            // Fog overlay
            if !maze.isWall(p) && !isVisible(p) {
                RoundedRectangle(cornerRadius: 5)
                    .fill(Color.black.opacity(visited.contains(p) ? 0.55 : 0.92))
                    .frame(width: s, height: s)
            }
        }
    }

    private func cellColor(at p: MazePos) -> Color {
        if maze.isWall(p) { return Color.purple.opacity(0.35) }
        if p == maze.exit { return Color.green.opacity(0.35) }
        if p == maze.entrance { return Color.orange.opacity(0.3) }
        return Color.white.opacity(0.08)
    }

    // MARK: - Movement + encounters

    private func move(_ dir: MazeDirection) {
        guard phase == .play else { return }
        let next = MazePos(x: player.x + dir.delta.dx, y: player.y + dir.delta.dy)
        guard maze.inBounds(next) else { return }
        guard !maze.isWall(next) else {
            manager.triggerHaptic(.light)
            withAnimation(.spring(response: 0.2)) { bump.toggle() }
            return
        }

        player = next
        moves += 1
        visited.insert(next)
        manager.triggerHaptic(.light)

        if remainingCandy.contains(next) {
            remainingCandy.remove(next)
            mazeCandy += 1
            collectMazeCandy()
        } else if remainingGhosts.contains(next) {
            remainingGhosts.remove(next)
            ghostsMet += 1
            meetMazeGhost()
        } else if remainingTraps.contains(next) {
            remainingTraps.remove(next)
            courage -= 1
            manager.triggerHaptic(.heavy)
            manager.createParticles(at: CGPoint(x: 200, y: 300), count: 20, emoji: "🕸️")
            if courage <= 0 {
                manager.addNotification("💀 The \(house.name) maze overwhelmed you... courage gone!")
                withAnimation { phase = .lost }
            } else {
                manager.addNotification("🕸️ Cobweb trap! You lose courage! (\(courage)❤️ left)")
            }
        }

        if next == maze.exit && phase == .play {
            escapeMaze()
        }
    }

    private func collectMazeCandy() {
        let pool = CandyType.allCases.filter { $0.rarity == .common || $0.rarity == .uncommon }
        let type = pool.randomElement() ?? .chocolate
        let candy = CandyItem(
            id: UUID(),
            type: type,
            quantity: Int.random(in: 1...3),
            positionX: 200, positionY: 300,
            isCollected: false,
            weight: 1.0,
            isRare: false,
            sparkle: false,
            glowColor: type.rarity.color
        )
        manager.collectCandy(candy)
    }

    private func meetMazeGhost() {
        manager.spawnRandomGhost()
        if let g = manager.ghosts.last {
            manager.captureGhost(g)
        } else {
            manager.addNotification("👻 A ghost howls past you in the dark!")
        }
    }

    private func escapeMaze() {
        let bonus = 40 * house.scare
        let goldBonus = 8 * house.scare
        manager.score += bonus
        manager.gold += goldBonus
        manager.experience += 20 * house.scare
        escapes += 1
        manager.createParticles(at: CGPoint(x: 200, y: 300), count: 60, emoji: "🎉")
        manager.addNotification("🚪 Escaped the \(house.name) maze in \(moves) moves! +\(bonus) pts, +\(goldBonus)🪙!")
        for _ in 0..<2 {
            if let treat = (HalloweenUltimateManager.rareDrops + HalloweenUltimateManager.herbalDrops).randomElement() {
                manager.addIngredient(treat)
            }
        }
        manager.triggerHaptic(.success)
        manager.checkLevelUp()
        manager.checkAchievements()
        manager.checkQuestProgress()
        withAnimation { phase = .won }
    }

    // MARK: - Controls (D-pad)

    private var controlsRow: some View {
        HStack(spacing: 20) {
            Button(action: { startMaze() }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Retry")
                }
                .font(.caption.bold())
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(.secondarySystemBackground))
                .cornerRadius(10)
            }

            VStack(spacing: 6) {
                Button(action: { move(.up) }) {
                    Image(systemName: "arrow.up")
                        .font(.title2.bold())
                        .frame(width: 52, height: 44)
                        .background(Color.orange.opacity(0.85))
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                HStack(spacing: 6) {
                    Button(action: { move(.left) }) {
                        Image(systemName: "arrow.left")
                            .font(.title2.bold())
                            .frame(width: 52, height: 44)
                            .background(Color.orange.opacity(0.85))
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                    Button(action: { move(.down) }) {
                        Image(systemName: "arrow.down")
                            .font(.title2.bold())
                            .frame(width: 52, height: 44)
                            .background(Color.orange.opacity(0.85))
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                    Button(action: { move(.right) }) {
                        Image(systemName: "arrow.right")
                            .font(.title2.bold())
                            .frame(width: 52, height: 44)
                            .background(Color.orange.opacity(0.85))
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                }
            }

            Button(action: {
                withAnimation { phase = .pick }
            }) {
                HStack {
                    Image(systemName: "house.fill")
                    Text("Houses")
                }
                .font(.caption.bold())
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(.secondarySystemBackground))
                .cornerRadius(10)
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 4)
        .disabled(phase != .play)
        .opacity(phase == .play ? 1 : 0.5)
    }

    // MARK: - Win / Lose cards

    private var winCard: some View {
        VStack(spacing: 10) {
            Text("🎉 ESCAPED! 🎉")
                .font(.title.bold())
                .foregroundColor(.gold)
            Text("\(house.name) • \(moves) moves • \(elapsed)s • \(mazeCandy)🍬 • \(ghostsMet)👻")
                .font(.caption)
                .foregroundColor(.secondary)
            Text("+\(40 * house.scare) pts  •  +\(8 * house.scare)🪙")
                .font(.headline)
                .foregroundColor(.orange)
            HStack(spacing: 10) {
                Button(action: { startMaze() }) {
                    Text("Run It Again")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(12)
                }
                Button(action: {
                    knocks = 0
                    withAnimation { phase = .pick }
                }) {
                    Text("New House")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.purple)
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
        .padding(.horizontal)
    }

    private var loseCard: some View {
        VStack(spacing: 10) {
            Text("💀 LOST IN THE DARK 💀")
                .font(.title2.bold())
                .foregroundColor(.red)
            Text("Your courage ran out in \(house.name)...")
                .font(.caption)
                .foregroundColor(.secondary)
            HStack(spacing: 10) {
                Button(action: { startMaze() }) {
                    Text("Brave It Again")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .cornerRadius(12)
                }
                Button(action: {
                    knocks = 0
                    withAnimation { phase = .pick }
                }) {
                    Text("Flee")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray)
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
        .padding(.horizontal)
    }
}
