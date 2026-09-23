//
//  MineArcadeFX.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Arcade menu effects: pumpkin squash-and-splat, rhythm note highway,
//  trivia lifelines with reveal bursts, coin-pusher shelf and a showcase.
//  Menu candy for the games list — pure view layer.
//

import SwiftUI

// ============================================================
// MARK: - 1. Pumpkin squash + splat
// ============================================================

/// Tap-to-squash pumpkin: squash, splat stars, regrow.
struct MinePumpkinSquash: View {
    @State private var squashed = false

    var body: some View {
        ZStack {
            // Splat stars.
            ForEach(0..<8, id: \.self) { i in
                Text(["⭐", "🎃", "✨"][i % 3])
                    .font(.title3)
                    .offset(squashed ? splatOffset(i) : .zero)
                    .opacity(squashed ? 1 : 0)
                    .scaleEffect(squashed ? 1.0 : 0.3)
                    .animation(
                        .spring(response: 0.5, dampingFraction: 0.55)
                            .delay(Double(i) * 0.03),
                        value: squashed
                    )
            }
            // Pumpkin.
            Text("🎃")
                .font(.system(size: 84))
                .scaleEffect(x: squashed ? 1.35 : 1.0, y: squashed ? 0.55 : 1.0)
                .rotationEffect(.degrees(squashed ? 8 : 0))
                .animation(.spring(response: 0.32, dampingFraction: 0.4), value: squashed)
            // Score pop.
            if squashed {
                Text("+10!")
                    .font(.headline.bold())
                    .foregroundColor(.orange)
                    .offset(y: -70)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .frame(height: 170)
        .onTapGesture {
            squashed = true
            SpookyHaptics.play(.medium)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                squashed = false
            }
        }
    }

    private func splatOffset(_ i: Int) -> CGSize {
        let angle = Double(i) / 8 * 2 * Double.pi - Double.pi / 2
        return CGSize(width: cos(angle) * 70, height: sin(angle) * 56)
    }
}

// ============================================================
// MARK: - 2. Rhythm note highway
// ============================================================

/// Rhythm highway: notes fall toward the strike line in a loop.
struct MineRhythmHighway: View {
    @State private var hit = false

    var body: some View {
        ZStack {
            // Lanes.
            HStack(spacing: 18) {
                ForEach(0..<4, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 44, height: 220)
                }
            }
            // Falling notes.
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    let w = Double(size.width), h = Double(size.height)
                    for i in 0..<10 {
                        let lane = i % 4
                        let life = fmod(t * 0.5 + Double(i) * 0.19, 1.0)
                        let x = w / 2 + (Double(lane) - 1.5) * 62
                        let y = life * (h - 40)
                        context.opacity = 0.95
                        context.fill(
                            Circle().path(in: CGRect(x: x - 11, y: y - 11, width: 22, height: 22)),
                            with: .color([Color.cyan, .pink, .yellow, .green][lane])
                        )
                        context.fill(
                            Circle().path(in: CGRect(x: x - 4, y: y - 4, width: 8, height: 8)),
                            with: .color(.white)
                        )
                    }
                }
            }
            .frame(width: 230, height: 220)
            // Strike line.
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.white.opacity(hit ? 0.9 : 0.4))
                .frame(width: 230, height: 6)
                .offset(y: 80)
                .shadow(color: .white.opacity(hit ? 0.9 : 0), radius: hit ? 12 : 0)
            // Hit flash.
            if hit {
                Text("PERFECT!")
                    .font(.headline.bold())
                    .foregroundColor(.yellow)
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .frame(height: 240)
        .onTapGesture {
            hit = true
            SpookyHaptics.play(.light)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                hit = false
            }
        }
    }
}

// ============================================================
// MARK: - 3. Trivia lifelines
// ============================================================

/// Trivia option row: shimmer while thinking, burst on reveal.
struct MineTriviaOption: View {
    var text: String
    var correct: Bool
    @State private var revealed = false
    @State private var shimmer = false

    var body: some View {
        HStack {
            Text(revealed ? (correct ? "✅" : "❌") : "🔘")
            Text(text).font(.subheadline.bold())
            Spacer()
            if revealed && correct {
                Text("+100").font(.caption.bold()).foregroundColor(.green)
            }
        }
        .padding(12)
        .background(
            revealed
                ? (correct ? Color.green.opacity(0.3) : Color.red.opacity(0.25))
                : Color.white.opacity(0.08)
        )
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.white.opacity(shimmer && !revealed ? 0.5 : 0), lineWidth: 1.5)
        )
        .scaleEffect(revealed && correct ? 1.03 : 1.0)
        .animation(.spring(response: 0.4, dampingFraction: 0.55), value: revealed)
        .onAppear { shimmer.toggle() }
        .onTapGesture {
            revealed = true
            SpookyHaptics.play(correct ? .reward : .error)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
                revealed = false
            }
        }
        // Thinking shimmer sweep.
        .overlay(
            GeometryReader { geo in
                if !revealed {
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [.clear, .white.opacity(0.25), .clear],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: 60)
                        .offset(x: shimmer ? geo.size.width : -60)
                        .animation(
                            .easeInOut(duration: 1.6).repeatForever(autoreverses: false),
                            value: shimmer
                        )
                }
            }
        )
        // Idle shimmer driver.
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.6, repeats: true) { _ in
                if !revealed { shimmer.toggle() }
            }
        }
    }
}

/// Trivia demo card: one question, four options, lifeline row.
struct MineTriviaDemo: View {
    var body: some View {
        VStack(spacing: 10) {
            Text("Which ore funds the pick forge?")
                .font(.headline)
                .multilineTextAlignment(.center)
            MineTriviaOption(text: "Coal Ore", correct: true)
            MineTriviaOption(text: "Diamond Ore", correct: false)
            MineTriviaOption(text: "Bedrock", correct: false)
            MineTriviaOption(text: "Cobwebs", correct: false)
            HStack(spacing: 16) {
                Label("50:50", systemImage: "percent")
                Label("Ask a mole", systemImage: "phone.fill")
                Label("Skip", systemImage: "forward.fill")
            }
            .font(.caption).foregroundColor(.orange)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}

// ============================================================
// MARK: - 4. Coin pusher shelf
// ============================================================

/// Coin pusher: coins drop, shelf shoves, edge coins tip with sparkle.
struct MineCoinPusher: View {
    @State private var shove = false

    var body: some View {
        ZStack {
            // Cabinet.
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(red: 0.12, green: 0.08, blue: 0.16))
                .frame(height: 200)
            // Back wall coins.
            HStack(spacing: -8) {
                ForEach(0..<9, id: \.self) { _ in
                    Circle()
                        .fill(Color(red: 0.85, green: 0.65, blue: 0.2))
                        .frame(width: 26, height: 26)
                }
            }
            .offset(y: -30)
            // Moving shelf.
            RoundedRectangle(cornerRadius: 6)
                .fill(Color(red: 0.3, green: 0.2, blue: 0.12))
                .frame(width: 240, height: 26)
                .offset(y: shove ? 6 : -6)
                .animation(
                    .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                    value: shove
                )
            // Dropping coin.
            Circle()
                .fill(Color.yellow)
                .frame(width: 24, height: 24)
                .shadow(color: .yellow, radius: 6)
                .offset(y: shove ? 30 : -70)
                .animation(
                    .easeIn(duration: 1.8).repeatForever(autoreverses: false),
                    value: shove
                )
            // Tipping edge coins.
            HStack(spacing: 60) {
                ForEach(0..<2, id: \.self) { i in
                    Circle()
                        .fill(Color.yellow)
                        .frame(width: 22, height: 22)
                        .offset(y: shove ? 66 : 44)
                        .rotationEffect(.degrees(shove ? 180 : 0))
                        .opacity(shove ? 0.4 : 1)
                        .animation(
                            .easeInOut(duration: 1.8).repeatForever(autoreverses: true)
                                .delay(Double(i) * 0.4),
                            value: shove
                        )
                }
            }
        }
        .frame(height: 210)
        .onAppear { shove.toggle() }
        .onTapGesture {
            SpookyHaptics.play(.medium)
        }
    }
}

/// Whack-a-mole: three holes, a mole that pops, tap to bonk + score.
struct MineWhackMole: View {
    @State private var hole = 1
    @State private var score = 0
    @State private var bonked = false

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 24) {
                ForEach(0..<3, id: \.self) { i in
                    ZStack(alignment: .bottom) {
                        Ellipse()
                            .fill(Color.black)
                            .frame(width: 64, height: 22)
                        Text(i == hole ? "🦔" : "")
                            .font(.system(size: 44))
                            .offset(y: i == hole ? (bonked ? 6 : -16) : 16)
                            .opacity(i == hole ? 1 : 0)
                            .scaleEffect(i == hole && bonked ? 0.8 : 1.0)
                            .animation(.spring(response: 0.3, dampingFraction: 0.5), value: hole)
                            .animation(.spring(response: 0.25, dampingFraction: 0.5), value: bonked)
                            .onTapGesture {
                                if i == hole {
                                    score += 10
                                    bonked = true
                                    SpookyHaptics.play(.medium)
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                                        bonked = false
                                        hole = Int.random(in: 0...2)
                                    }
                                }
                            }
                    }
                    .frame(width: 70, height: 90)
                }
            }
            Text("Score: \(score) — tap the mole!")
                .font(.headline)
                .foregroundColor(.orange)
                .monospacedDigit()
        }
        .padding()
        .background(Color(red: 0.12, green: 0.2, blue: 0.1))
        .cornerRadius(16)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.4, repeats: true) { _ in
                if !bonked {
                    hole = Int.random(in: 0...2)
                }
            }
        }
    }
}

// ============================================================
// MARK: - 5. Arcade showcase
// ============================================================

/// Arcade FX hall: squash, rhythm, trivia, pusher.
struct MineArcadeShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🎃 Pumpkin squash (tap!)").font(.headline)
                        MinePumpkinSquash()
                    }
                    VStack(spacing: 8) {
                        Text("🎵 Rhythm highway (tap for PERFECT)").font(.headline)
                        MineRhythmHighway()
                    }
                    VStack(spacing: 8) {
                        Text("🧠 Trivia lifelines (tap an answer)").font(.headline)
                        MineTriviaDemo()
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🪙 Coin pusher").font(.headline)
                        MineCoinPusher()
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🔨 Whack-a-mole (tap!)").font(.headline)
                        MineWhackMole()
                            .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Arcade FX")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
