//
//  MineSectorDioramas.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Nine animated sector scenes (one per atlas cell) plus a mini version
//  that lives inside the sector map cells. Composed from the lighting,
//  particle, ghost and crystal kits — same models, new staging.
//

import SwiftUI

// ============================================================
// MARK: - 1. Nine sector scenes
// ============================================================

/// North-West: frontier draught, fox cameo, cold torches.
struct MineSectorDioramaNW: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.14, green: 0.14, blue: 0.22), Color(red: 0.03, green: 0.03, blue: 0.07)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color.black.opacity(0.5), height: 50, seed: 11)
                .frame(height: 100)
                .offset(y: -60)
            MineTorchFlame(scale: 0.8, seed: 12)
                .offset(x: -70, y: 0)
            MineTorchFlame(scale: 0.8, seed: 13)
                .offset(x: 70, y: 6)
            MineGhostSprite(kind: .shade, size: 36)
                .offset(x: -30, y: 20)
                .opacity(0.8)
            Text("🦊").font(.system(size: 34))
                .offset(x: 30, y: 30)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [Color(white: 0.75)],
                shapes: [.circle], flow: .drift, count: 22,
                gravity: 0, wind: 30, size: 2.4, life: 5.0, twinkle: false,
                flavor: ""
            ))
            MineVignette(strength: 0.5)
        }
    }
}

/// North-Central: the classic claim — lamps, rails, coal glints.
struct MineSectorDioramaNC: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.26, green: 0.19, blue: 0.12), Color(red: 0.07, green: 0.05, blue: 0.05)],
                startPoint: .top, endPoint: .bottom
            )
            MineTimberFrame(width: 150, height: 90)
                .offset(y: 20)
            MineLanternGlow(seed: 14)
                .offset(y: -50)
            MineRailTrack()
                .offset(y: 80)
                .scaleEffect(0.8)
            ForEach(0..<5, id: \.self) { i in
                Circle()
                    .fill(Color.black)
                    .frame(width: 12, height: 12)
                    .overlay(Circle().fill(Color.gray.opacity(0.3)).frame(width: 12, height: 12))
                    .offset(x: CGFloat(i * 36 - 72), y: 52)
            }
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.orange, .yellow],
                shapes: [.circle], flow: .rise, count: 16,
                gravity: -40, wind: 6, size: 2.0, life: 3.0, twinkle: true,
                flavor: ""
            ))
            MineVignette(strength: 0.45)
        }
    }
}

/// North-East: bat country — wing shadows, guano sparkle (affectionate).
struct MineSectorDioramaNE: View {
    @State private var flap = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.16, green: 0.12, blue: 0.2), Color(red: 0.04, green: 0.03, blue: 0.07)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color.black.opacity(0.55), height: 70, seed: 15)
                .frame(height: 120)
                .offset(y: -70)
            // Wing shadows sweeping the wall.
            ForEach(0..<3, id: \.self) { i in
                Ellipse()
                    .fill(Color.black.opacity(0.5))
                    .frame(width: 90, height: 26)
                    .offset(x: flap ? CGFloat(-50 + i * 50) : CGFloat(50 - i * 50), y: CGFloat(-40 + i * 30))
                    .blur(radius: 6)
                    .animation(
                        .easeInOut(duration: 3).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.5),
                        value: flap
                    )
            }
            Text("🦇").font(.system(size: 30))
                .offset(x: flap ? -40 : 40, y: -50)
                .animation(
                    .easeInOut(duration: 3).repeatForever(autoreverses: true),
                    value: flap
                )
            Text("🦇").font(.system(size: 22))
                .offset(x: flap ? 50 : -50, y: -20)
                .animation(
                    .easeInOut(duration: 4).repeatForever(autoreverses: true),
                    value: flap
                )
            MineLanternGlow(color: .yellow, seed: 16)
                .offset(y: 40)
            MineVignette(strength: 0.55)
        }
        .onAppear { flap.toggle() }
    }
}

/// Heart-West: the living room — warm pools, closets, friendly bustle.
struct MineSectorDioramaHW: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.24, green: 0.16, blue: 0.14), Color(red: 0.07, green: 0.05, blue: 0.06)],
                startPoint: .top, endPoint: .bottom
            )
            MineLanternGlow(seed: 17)
                .offset(x: -60, y: -40)
            MineLanternGlow(color: .yellow, seed: 18)
                .offset(x: 60, y: -30)
            // Closet row.
            HStack(spacing: 10) {
                ForEach(0..<3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(red: 0.5, green: 0.33, blue: 0.2))
                        .frame(width: 30, height: 44)
                        .overlay(Text("🚪").font(.caption))
                }
            }
            .offset(y: 50)
            MineGhostSprite(kind: .lanternKeeper, size: 40)
                .offset(x: -70, y: 10)
            Text("📦").font(.system(size: 26))
                .offset(x: 70, y: 40)
            MineVignette(strength: 0.4)
        }
    }
}

/// Heart-Central: the crossroads — signpost, converging rails, bustle.
struct MineSectorDioramaHC: View {
    @State private var spin = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.2, green: 0.16, blue: 0.16), Color(red: 0.05, green: 0.04, blue: 0.05)],
                startPoint: .top, endPoint: .bottom
            )
            // Signpost.
            VStack(spacing: 0) {
                Rectangle().fill(Color(red: 0.4, green: 0.28, blue: 0.16)).frame(width: 8, height: 70)
                HStack(spacing: 4) {
                    signArm("N⬛")
                    signArm("S🟨")
                }
                .offset(y: -64)
            }
            .offset(y: 20)
            // Converging rails.
            HStack(spacing: 40) {
                MineRailTrack().scaleEffect(0.7).rotationEffect(.degrees(18))
                MineRailTrack().scaleEffect(0.7).rotationEffect(.degrees(-18))
            }
            .offset(y: 80)
            // Compass rose.
            Text("🧭")
                .font(.system(size: 34))
                .rotationEffect(.degrees(spin ? 360 : 0))
                .animation(.linear(duration: 12).repeatForever(autoreverses: false), value: spin)
                .offset(y: -70)
                .onAppear { spin.toggle() }
            MineVignette(strength: 0.45)
        }
    }

    private func signArm(_ label: String) -> some View {
        Text(label)
            .font(.caption2.bold())
            .padding(.horizontal, 6).padding(.vertical, 3)
            .background(Color(red: 0.45, green: 0.32, blue: 0.18))
            .foregroundColor(.white)
            .cornerRadius(4)
    }
}

/// Heart-East: the shaft down — depth glow, rope, descending bucket.
struct MineSectorDioramaHE: View {
    @State private var descend = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.22, green: 0.12, blue: 0.1), Color(red: 0.06, green: 0.03, blue: 0.04)],
                startPoint: .top, endPoint: .bottom
            )
            // Shaft mouth (black ellipse with warm rim).
            Ellipse()
                .fill(Color.black)
                .frame(width: 130, height: 60)
                .overlay(
                    Ellipse()
                        .stroke(Color.orange.opacity(0.7), lineWidth: 3)
                        .frame(width: 130, height: 60)
                )
                .offset(y: 50)
            // Rope + bucket descending.
            Rectangle()
                .fill(Color.gray)
                .frame(width: 3, height: descend ? 130 : 60)
                .offset(y: descend ? -10 : -45)
                .animation(.easeInOut(duration: 3).repeatForever(autoreverses: true), value: descend)
            Text("🪣")
                .font(.system(size: 30))
                .offset(y: descend ? 40 : -20)
                .animation(.easeInOut(duration: 3).repeatForever(autoreverses: true), value: descend)
            // Warm breath from below.
            Ellipse()
                .fill(Color.orange.opacity(0.35))
                .frame(width: 150, height: 40)
                .blur(radius: 8)
                .offset(y: 60)
                .opacity(descend ? 1 : 0.5)
                .animation(.easeInOut(duration: 3).repeatForever(autoreverses: true), value: descend)
            Text("🕳️").font(.caption).foregroundColor(.white.opacity(0.7))
                .offset(y: -90)
        }
        .onAppear { descend.toggle() }
    }
}

/// South-West: cave country — cube garden + wisp + water.
struct MineSectorDioramaSW: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.13, green: 0.09, blue: 0.28), Color(red: 0.03, green: 0.02, blue: 0.09)],
                startPoint: .top, endPoint: .bottom
            )
            MineCaveShimmer(colors: [.purple, .white], moteCount: 36)
            MineCubeCluster(color: .purple)
                .offset(y: 40)
            MineGhostSprite(kind: .wisp, size: 38)
                .offset(x: 60, y: -50)
            MineDarkWater(width: 220)
                .offset(y: 100)
            MineVignette(strength: 0.45)
        }
    }
}

/// South-Central: deep gloom — blue torches, wraith patrol.
struct MineSectorDioramaSC: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.1, green: 0.1, blue: 0.2), Color(red: 0.02, green: 0.02, blue: 0.05)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color.black.opacity(0.6), height: 80, seed: 19)
                .frame(height: 140)
                .offset(y: -70)
            MineTorchFlame(scale: 0.9, seed: 20)
                .offset(x: -80, y: 10)
            MineTorchFlame(scale: 0.9, seed: 21)
                .offset(x: 80, y: 16)
            MineGhostSprite(kind: .wraith, size: 58)
                .offset(y: -20)
            MineAnimatedOrb(color: .blue, size: 30)
                .offset(x: -50, y: 50)
            MineVignette(strength: 0.6)
        }
    }
}

/// South-East: magma gate — lava glow, grate door, ember storm.
struct MineSectorDioramaSE: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.38, green: 0.1, blue: 0.06), Color(red: 0.07, green: 0.02, blue: 0.02)],
                startPoint: .top, endPoint: .bottom
            )
            MineLavaGlow(seed: 61)
                .frame(height: 80)
                .offset(y: 85)
            // Grate door silhouette.
            VStack(spacing: 8) {
                ForEach(0..<4, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 3)
                        .fill(
                            LinearGradient(
                                colors: [.red, .orange, .red],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: 100, height: 8)
                        .shadow(color: .orange, radius: 6)
                }
            }
            .offset(y: -10)
            MineGhostSprite(kind: .gloom, size: 50)
                .offset(x: 70, y: -50)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.red, .orange],
                shapes: [.circle], flow: .rise, count: 36,
                gravity: -60, wind: 8, size: 2.4, life: 3.0, twinkle: true,
                flavor: ""
            ))
            MineVignette(strength: 0.5)
        }
    }
}

// ============================================================
// MARK: - 2. Router + minis + showcase
// ============================================================

/// Full-size sector scene router (col/row → diorama).
struct MineSectorScene: View {
    var col: Int
    var row: Int

    var body: some View {
        Group {
            switch (col, row) {
            case (0, 0): MineSectorDioramaNW()
            case (1, 0): MineSectorDioramaNC()
            case (2, 0): MineSectorDioramaNE()
            case (0, 1): MineSectorDioramaHW()
            case (1, 1): MineSectorDioramaHC()
            case (2, 1): MineSectorDioramaHE()
            case (0, 2): MineSectorDioramaSW()
            case (1, 2): MineSectorDioramaSC()
            case (2, 2): MineSectorDioramaSE()
            default: MineSectorDioramaHC()
            }
        }
    }
}

/// Mini sector scene for map cells (fixed small frame).
struct MineSectorMini: View {
    var col: Int
    var row: Int

    var body: some View {
        MineSectorScene(col: col, row: row)
            .frame(height: 84)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
            )
            .clipped()
    }
}

/// Sector atlas showcase: all nine scenes with names + moods.
struct MineSectorShowcaseView: View {
    @Environment(\.dismiss) private var dismiss
    private let cols = ["West", "Central", "East"]
    private let rows = ["North", "Heart", "South"]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    ForEach(0..<3, id: \.self) { row in
                        ForEach(0..<3, id: \.self) { col in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text("\(rows[row])-\(cols[col]) Dig")
                                        .font(.headline)
                                    Spacer()
                                    if let mood = SpookySectorMood.mood(col: col, row: row) {
                                        Text("\(mood.emoji) \(mood.line)")
                                            .font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.horizontal)
                                MineSectorScene(col: col, row: row)
                                    .frame(height: 220)
                                    .cornerRadius(14)
                                    .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical, 12)
            }
            .navigationTitle("Sector Atlas Scenes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
