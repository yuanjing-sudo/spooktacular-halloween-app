//
//  MineGameFX.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Game-by-game arcade effects: one animated tile treatment per game type
//  (all eleven), a large detail header art view wired into the game detail
//  screen, and a showcase grid. Pure view layer.
//

import SwiftUI

// ============================================================
// MARK: - 1. Animated tile per game
// ============================================================

/// Animated menu tile art, one treatment per game. Loops forever.
struct MineGameTileFX: View {
    var type: MiniGameType
    var size: CGFloat = 64

    var body: some View {
        Group {
            switch type {
            case .memoryMatch: MineFXMemory(size: size)
            case .pumpkinSmash: MineFXPumpkin(size: size)
            case .ghostRace: MineFXGhostRace(size: size)
            case .candySort: MineFXCandy(size: size)
            case .spellDuel: MineFXDuel(size: size)
            case .mazeEscape: MineFXMaze(size: size)
            case .trivia: MineFXTrivia(size: size)
            case .rhythm: MineFXRhythm(size: size)
            case .voxelRun: MineFXVoxel(size: size)
            case .graveyard3D: MineFXGraveyard(size: size)
            case .abandonedMine: MineFXMineTile(size: size)
            }
        }
        .frame(width: size * 1.4, height: size * 1.4)
    }
}

/// Memory: two cards flipping in alternation.
struct MineFXMemory: View {
    var size: CGFloat
    @State private var flip = false

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<2, id: \.self) { i in
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(i == 0 ? Color.purple : Color.orange)
                        .frame(width: size * 0.52, height: size * 0.7)
                    Text(i == 0 ? "🎃" : "👻")
                        .font(.system(size: size * 0.36))
                        .opacity((flip && i == 0) || (!flip && i == 1) ? 1 : 0)
                }
                .rotation3DEffect(.degrees(((flip && i == 0) || (!flip && i == 1)) ? 0 : 90), axis: (x: 0, y: 1, z: 0))
                .animation(
                    .spring(response: 0.5, dampingFraction: 0.6).delay(Double(i) * 0.2),
                    value: flip
                )
            }
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.8, repeats: true) { _ in
                flip.toggle()
            }
        }
    }
}

/// Pumpkin: squash-and-pop loop with star spray.
struct MineFXPumpkin: View {
    var size: CGFloat
    @State private var squash = false

    var body: some View {
        ZStack {
            ForEach(0..<6, id: \.self) { i in
                Circle()
                    .fill(Color.yellow)
                    .frame(width: 6, height: 6)
                    .offset(squash ? fxOffset(i, size: size) : .zero)
                    .opacity(squash ? 1 : 0)
                    .animation(
                        .spring(response: 0.5, dampingFraction: 0.6).delay(Double(i) * 0.03),
                        value: squash
                    )
            }
            Text("🎃")
                .font(.system(size: size))
                .scaleEffect(x: squash ? 1.3 : 1.0, y: squash ? 0.6 : 1.0)
                .animation(.spring(response: 0.35, dampingFraction: 0.45), value: squash)
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.6, repeats: true) { _ in
                squash.toggle()
                if squash { SpookyHaptics.play(.light) }
            }
        }
    }

    private func fxOffset(_ i: Int, size: CGFloat) -> CGSize {
        let angle = Double(i) / 6 * 2 * Double.pi - Double.pi / 2
        return CGSize(width: cos(angle) * size * 0.55, height: sin(angle) * size * 0.45)
    }
}

/// Ghost race: two ghosts trading the lead + finish flag.
struct MineFXGhostRace: View {
    var size: CGFloat
    @State private var race = false

    var body: some View {
        ZStack(alignment: .leading) {
            // Track.
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.white.opacity(0.12))
                .frame(width: size * 1.3, height: 44)
            // Finish flag.
            Text("🏁").font(.body)
                .offset(x: size * 0.55)
            // Racers.
            Text("👻").font(.system(size: size * 0.5))
                .offset(x: race ? size * 0.42 : -size * 0.5, y: -14)
                .animation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true), value: race)
            Text("🎃").font(.system(size: size * 0.5))
                .offset(x: race ? -size * 0.42 : size * 0.5, y: 14)
                .animation(
                    .easeInOut(duration: 1.6).repeatForever(autoreverses: true).delay(0.35),
                    value: race
                )
        }
        .onAppear { race.toggle() }
    }
}

/// Candy sort: candies dropping into two buckets.
struct MineFXCandy: View {
    var size: CGFloat
    @State private var drop = false

    var body: some View {
        ZStack {
            HStack(spacing: size * 0.4) {
                bucket(color: .pink)
                bucket(color: .cyan)
            }
            .offset(y: size * 0.35)
            ForEach(0..<4, id: \.self) { i in
                Text(["🍬", "🍭"][i % 2])
                    .font(.body)
                    .offset(
                        x: CGFloat((i % 2 == 0 ? -1 : 1)) * size * 0.2,
                        y: drop ? size * 0.4 : -size * 0.5
                    )
                    .opacity(drop ? 0.4 : 1)
                    .animation(
                        .easeIn(duration: 0.9).repeatForever(autoreverses: false)
                            .delay(Double(i) * 0.3),
                        value: drop
                    )
            }
        }
        .onAppear { drop.toggle() }
    }

    private func bucket(color: Color) -> some View {
        ZStack(alignment: .top) {
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.white.opacity(0.14))
                .frame(width: size * 0.4, height: size * 0.4)
            RoundedRectangle(cornerRadius: 3)
                .fill(color.opacity(0.7))
                .frame(width: size * 0.4, height: 8)
        }
    }
}

/// Spell duel: two bolts clashing in a center flash.
struct MineFXDuel: View {
    var size: CGFloat
    @State private var clash = false

    var body: some View {
        ZStack {
            // Left bolt (purple).
            Capsule()
                .fill(Color.purple)
                .frame(width: clash ? 34 : 60, height: 10)
                .offset(x: clash ? -12 : -44)
                .blur(radius: 1)
                .animation(.easeOut(duration: 0.55).repeatForever(autoreverses: false), value: clash)
            // Right bolt (cyan).
            Capsule()
                .fill(Color.cyan)
                .frame(width: clash ? 34 : 60, height: 10)
                .offset(x: clash ? 12 : 44)
                .blur(radius: 1)
                .animation(.easeOut(duration: 0.55).repeatForever(autoreverses: false), value: clash)
            // Clash flash.
            Circle()
                .fill(Color.white)
                .frame(width: clash ? 44 : 8, height: clash ? 44 : 8)
                .blur(radius: 3)
                .opacity(clash ? 0.95 : 0.2)
                .animation(.easeOut(duration: 0.55).repeatForever(autoreverses: false), value: clash)
            Text("✨").font(.title)
                .scaleEffect(clash ? 1.4 : 0.8)
                .opacity(clash ? 1 : 0.4)
                .animation(.easeOut(duration: 0.55).repeatForever(autoreverses: false), value: clash)
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.1, repeats: true) { _ in
                clash.toggle()
                if clash { SpookyHaptics.play(.medium) }
            }
        }
    }
}

/// Maze escape: dot running a square maze path.
struct MineFXMaze: View {
    var size: CGFloat
    @State private var step = 0

    private var corners: [CGSize] {
        let h = size * 0.4
        return [
            CGSize(width: -h, height: -h), CGSize(width: h, height: -h),
            CGSize(width: h, height: h), CGSize(width: -h, height: h),
        ]
    }

    var body: some View {
        ZStack {
            // Maze walls (square spiral hint).
            ForEach(0..<3, id: \.self) { i in
                RoundedRectangle(cornerRadius: 6)
                    .stroke(Color.white.opacity(0.25), lineWidth: 3)
                    .frame(width: size * (1.0 - CGFloat(i) * 0.25), height: size * (1.0 - CGFloat(i) * 0.25))
            }
            // Runner dot.
            Circle()
                .fill(Color.green)
                .frame(width: 14, height: 14)
                .shadow(color: .green, radius: 6)
                .offset(corners[step % corners.count])
                .animation(.spring(response: 0.4, dampingFraction: 0.6), value: step)
            Text("🏁").font(.caption)
                .offset(x: size * 0.42, y: size * 0.42)
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 0.7, repeats: true) { _ in
                step = (step + 1) % 4
            }
        }
    }
}

/// Trivia: bouncing question mark + sparkles.
struct MineFXTrivia: View {
    var size: CGFloat
    @State private var bounce = false

    var body: some View {
        ZStack {
            ForEach(0..<5, id: \.self) { i in
                Circle()
                    .fill(Color.yellow)
                    .frame(width: 5, height: 5)
                    .offset(
                        x: CGFloat(sin(Double(i) * 2.4) * Double(size) * 0.5),
                        y: bounce ? -size * 0.5 : size * 0.1
                    )
                    .opacity(bounce ? 1 : 0.2)
                    .animation(
                        .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.15),
                        value: bounce
                    )
            }
            Text("❓")
                .font(.system(size: size))
                .offset(y: bounce ? -8 : 8)
                .scaleEffect(bounce ? 1.1 : 0.95)
                .animation(
                    .easeInOut(duration: 1.2).repeatForever(autoreverses: true),
                    value: bounce
                )
        }
        .onAppear { bounce.toggle() }
    }
}

/// Rhythm: four pulsing bars in sequence.
struct MineFXRhythm: View {
    var size: CGFloat
    @State private var beat = 0

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<4, id: \.self) { i in
                RoundedRectangle(cornerRadius: 4)
                    .fill([Color.cyan, .pink, .yellow, .green][i])
                    .frame(width: 14, height: beat % 4 == i ? size * 0.9 : size * 0.4)
                    .animation(.spring(response: 0.3, dampingFraction: 0.5), value: beat)
            }
        }
        .frame(height: size)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 0.45, repeats: true) { _ in
                beat = (beat + 1) % 4
            }
        }
    }
}

/// Voxel run: scrolling block strip with a hopping runner.
struct MineFXVoxel: View {
    var size: CGFloat
    @State private var scroll = false
    @State private var hop = false

    var body: some View {
        ZStack(alignment: .bottom) {
            HStack(spacing: 4) {
                ForEach(0..<8, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 2)
                        .fill([Color.green, Color.brown, Color.gray][i % 3])
                        .frame(width: 18, height: 18 + CGFloat((i * 29) % 22))
                }
            }
            .offset(x: scroll ? -30 : 30)
            .animation(
                .linear(duration: 1.2).repeatForever(autoreverses: false),
                value: scroll
            )
            Text("🧙")
                .font(.system(size: size * 0.5))
                .offset(y: hop ? -34 : -14)
                .animation(
                    .easeInOut(duration: 0.6).repeatForever(autoreverses: true),
                    value: hop
                )
        }
        .frame(height: size)
        .onAppear {
            scroll.toggle()
            hop.toggle()
        }
    }
}

/// Graveyard: moon, rising ghost, blinking stars.
struct MineFXGraveyard: View {
    var size: CGFloat
    @State private var rise = false

    var body: some View {
        ZStack {
            Circle()
                .fill(Color(red: 0.9, green: 0.9, blue: 0.8))
                .frame(width: size * 0.5, height: size * 0.5)
                .offset(x: size * 0.3, y: -size * 0.3)
            // Tombstones.
            HStack(spacing: 8) {
                ForEach(0..<3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(white: 0.35))
                        .frame(width: 18, height: 26)
                }
            }
            .offset(y: size * 0.35)
            Text("👻")
                .font(.system(size: size * 0.55))
                .offset(y: rise ? -size * 0.25 : size * 0.15)
                .opacity(rise ? 1 : 0.4)
                .animation(
                    .easeInOut(duration: 2).repeatForever(autoreverses: true),
                    value: rise
                )
        }
        .onAppear { rise.toggle() }
    }
}

/// Abandoned mine: swinging pick + ore sparkles.
struct MineFXMineTile: View {
    var size: CGFloat
    @State private var swing = false

    var body: some View {
        ZStack {
            Text("⛏️")
                .font(.system(size: size * 0.7))
                .rotationEffect(.degrees(swing ? -24 : 18))
                .animation(
                    .easeInOut(duration: 0.8).repeatForever(autoreverses: true),
                    value: swing
                )
            ForEach(0..<4, id: \.self) { i in
                Circle()
                    .fill([Color.gray, .yellow, .cyan][i % 3])
                    .frame(width: 6, height: 6)
                    .offset(
                        x: CGFloat((i * 41) % 60 - 30),
                        y: swing ? size * 0.35 : size * 0.1
                    )
                    .opacity(swing ? 1 : 0.3)
                    .animation(
                        .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.1),
                        value: swing
                    )
            }
        }
        .onAppear { swing.toggle() }
    }
}

// ============================================================
// MARK: - 2. Detail header art
// ============================================================

/// Large animated header for the game detail screen.
struct MineGameDetailArt: View {
    var type: MiniGameType

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 18)
                .fill(
                    LinearGradient(
                        colors: [Color.purple.opacity(0.35), Color.black.opacity(0.5)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .frame(height: 170)
            MineGameTileFX(type: type, size: 76)
            // Corner sparkles.
            ForEach(0..<4, id: \.self) { i in
                Text("✨")
                    .font(.caption)
                    .offset(x: CGFloat((i % 2 == 0 ? -1 : 1)) * 90, y: CGFloat((i / 2 == 0 ? -1 : 1)) * 60)
            }
        }
        .padding(.horizontal)
    }
}

// ============================================================
// MARK: - 3. FX showcase grid
// ============================================================

/// Game FX gallery: all eleven tiles, live.
struct MineGameFXShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                    ForEach(MiniGameType.allCases, id: \.self) { type in
                        VStack(spacing: 6) {
                            MineGameTileFX(type: type, size: 56)
                                .frame(height: 100)
                            Text(type.rawValue)
                                .font(.caption.bold())
                        }
                        .padding(10)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(14)
                    }
                }
                .padding()
                Text("Every tile loops forever. Detail screens use the large art above.")
                    .font(.caption).foregroundStyle(.secondary)
                    .padding(.bottom, 20)
            }
            .navigationTitle("Game FX Gallery")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
