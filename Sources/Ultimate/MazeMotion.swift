//
//  MazeMotion.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Motion kit for the Tunnel Maze journal: animated expedition rows with
//  shimmer progress and claim bursts, flipping region rows, bond XP bars
//  with milestone pops, celebration confetti and a showcase. Drop-in
//  replacements for the journal's static rows.
//

import SwiftUI

// ============================================================
// MARK: - 1. Animated expedition row
// ============================================================

/// Expedition row: shimmer progress, pop on completion, burst on claim.
struct MazeAnimatedExpeditionRow: View {
    var icon: String
    var title: String
    var progress: Int
    var target: Int
    var reward: String
    var tip: String
    var done: Bool
    var claimed: Bool
    var onClaim: () -> Void
    @State private var burst = false
    @State private var shimmer = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(icon)
                    .scaleEffect(done && !claimed ? 1.2 : 1.0)
                    .animation(
                        done && !claimed
                            ? .spring(response: 0.4, dampingFraction: 0.5).repeatForever(autoreverses: true)
                            : .default,
                        value: done
                    )
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.subheadline.bold()).foregroundColor(.white)
                    Text("\(min(progress, target))/\(target)")
                        .font(.caption).foregroundColor(.orange).monospacedDigit()
                }
                Spacer()
                if claimed {
                    Text("CLAIMED").font(.caption2.bold()).foregroundColor(.green)
                } else if done {
                    Button("Claim") {
                        burst = true
                        SpookyHaptics.play(.reward)
                        onClaim()
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                            burst = false
                        }
                    }
                    .font(.caption.bold())
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(Color.green).foregroundColor(.white)
                    .cornerRadius(8)
                    .scaleEffect(burst ? 1.3 : 1.0)
                    .animation(.spring(response: 0.35, dampingFraction: 0.5), value: burst)
                }
            }
            // Shimmer progress.
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.14)).frame(height: 8)
                    Capsule()
                        .fill((done ? Color.green : Color.orange).gradient)
                        .frame(width: geo.size.width * fraction, height: 8)
                        .animation(.spring(response: 0.45, dampingFraction: 0.7), value: progress)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [.clear, .white.opacity(0.7), .clear],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: 40, height: 8)
                        .offset(x: shimmer ? geo.size.width : -40)
                        .animation(
                            .easeInOut(duration: 1.8).repeatForever(autoreverses: false),
                            value: shimmer
                        )
                }
                .clipShape(Capsule())
            }
            .frame(height: 8)
            Text("Reward: \(reward) • 💡 \(tip)")
                .font(.caption).foregroundColor(.white.opacity(0.6))
            // Claim burst shards.
            if burst {
                HStack(spacing: 4) {
                    ForEach(0..<8, id: \.self) { i in
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                            .offset(y: -6)
                            .opacity(0.9)
                            .animation(
                                .spring(response: 0.4, dampingFraction: 0.55)
                                    .delay(Double(i) * 0.03),
                                value: burst
                            )
                    }
                    Spacer()
                }
                .transition(.opacity)
            }
        }
        .padding(10)
        .background(Color.white.opacity(0.08))
        .cornerRadius(12)
        .onAppear { shimmer.toggle() }
    }

    private var fraction: Double {
        min(1, Double(progress) / Double(max(1, target)))
    }
}

// ============================================================
// MARK: - 2. Flipping region row
// ============================================================

/// Region row: 3D flip reveal on discovery, glowing border while new.
struct MazeAnimatedRegionRow: View {
    var emoji: String
    var name: String
    var bounds: String
    var found: Bool
    var isNew: Bool
    @State private var flipped = false

    var body: some View {
        HStack {
            Text(emoji)
                .rotation3DEffect(.degrees(flipped ? 360 : 0), axis: (x: 0, y: 1, z: 0))
                .animation(
                    found ? .spring(response: 0.7, dampingFraction: 0.6) : .default,
                    value: flipped
                )
            VStack(alignment: .leading, spacing: 2) {
                Text(found ? name : "???")
                    .font(.subheadline.bold()).foregroundColor(.white)
                Text(found ? bounds : "Unmapped dark")
                    .font(.caption).foregroundColor(.white.opacity(0.6))
            }
            Spacer()
            if found {
                Image(systemName: isNew ? "sparkles" : "checkmark.circle.fill")
                    .foregroundColor(isNew ? .yellow : .green)
                    .scaleEffect(isNew ? 1.3 : 1.0)
                    .animation(
                        isNew ? .spring(response: 0.4, dampingFraction: 0.5).repeatForever(autoreverses: true) : .default,
                        value: isNew
                    )
            } else {
                Image(systemName: "lock.circle").foregroundColor(.gray)
            }
        }
        .padding(10)
        .background(Color.white.opacity(found ? 0.1 : 0.05))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isNew ? Color.yellow.opacity(0.8) : Color.clear, lineWidth: 2)
        )
        .onAppear {
            if found {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    flipped = true
                }
            }
        }
    }
}

// ============================================================
// MARK: - 3. Bond XP bar with milestone pop
// ============================================================

/// Bond bar: XP fill with milestone star pops at level thresholds.
struct MazeAnimatedBondBar: View {
    var xp: Int
    var next: Int?
    var level: Int
    @State private var star = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Bond \(xp)/\(next.map({ "\($0)" }) ?? "MAX") XP")
                    .font(.caption2).foregroundColor(.white.opacity(0.7))
                Spacer()
                // Milestone stars.
                HStack(spacing: 2) {
                    ForEach(1...5, id: \.self) { lv in
                        Image(systemName: lv <= level ? "star.fill" : "star")
                            .font(.caption2)
                            .foregroundColor(lv <= level ? .pink : .gray)
                            .scaleEffect(lv == level && star ? 1.4 : 1.0)
                            .animation(
                                .spring(response: 0.35, dampingFraction: 0.5)
                                    .delay(Double(lv) * 0.08),
                                value: star
                            )
                    }
                }
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.14)).frame(height: 8)
                    if let next = next {
                        Capsule()
                            .fill(Color.pink.gradient)
                            .frame(width: geo.size.width * min(1, Double(xp) / Double(next)), height: 8)
                            .animation(.spring(response: 0.5, dampingFraction: 0.65), value: xp)
                    } else {
                        Capsule()
                            .fill(Color.pink.gradient)
                            .frame(width: geo.size.width, height: 8)
                    }
                }
                .clipShape(Capsule())
            }
            .frame(height: 8)
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                star = true
            }
        }
    }
}

// ============================================================
// MARK: - 4. Celebration confetti overlay
// ============================================================

/// Full-card confetti: looping colored squares + stars from the top.
struct MazeCelebrationConfetti: View {
    var active: Bool

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                guard active else { return }
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                let colors: [Color] = [.green, .yellow, .pink, .cyan, .orange]
                for i in 0..<40 {
                    let life = fmod(t * 0.5 + Double(i) * 0.23, 1.0)
                    let x = fmod(Double(i) * 167.3 + sin(t + Double(i)) * 20, w)
                    let y = life * h
                    context.opacity = (1 - life * 0.5) * 0.9
                    context.fill(
                        MineParticleShape.square.path(
                            x: x, y: y, r: 4,
                            angle: t * 3 + Double(i)
                        ),
                        with: .color(colors[i % colors.count])
                    )
                }
            }
        }
        .allowsHitTesting(false)
        .opacity(active ? 1 : 0)
    }
}

// ============================================================
// MARK: - 5. Combo reel (big combo numbers with gauge)
// ============================================================

/// Combo reel: giant rolling combo, multiplier arc, milestone pops.
struct MazeComboReel: View {
    var combo: Int
    @State private var pop = false

    private var multiplier: Double {
        min(3.0, 1.0 + Double(combo) * 0.05)
    }

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                // Multiplier arc.
                Circle()
                    .trim(from: 0, to: CGFloat((multiplier - 1.0) / 2.0))
                    .stroke(
                        LinearGradient(
                            colors: [.orange, .red],
                            startPoint: .leading, endPoint: .trailing
                        ),
                        style: StrokeStyle(lineWidth: 10, lineCap: .round)
                    )
                    .frame(width: 130, height: 130)
                    .rotationEffect(.degrees(-90))
                    .animation(.spring(response: 0.5, dampingFraction: 0.6), value: combo)
                VStack(spacing: 0) {
                    Text("\(combo)")
                        .font(.system(size: 44, weight: .black))
                        .monospacedDigit()
                    Text("COMBO")
                        .font(.caption2.bold())
                        .foregroundColor(.orange)
                    Text("×\(String(format: "%.2f", multiplier))")
                        .font(.caption.bold())
                        .foregroundColor(.red)
                        .monospacedDigit()
                }
                .scaleEffect(pop ? 1.18 : 1.0)
                .animation(.spring(response: 0.3, dampingFraction: 0.5), value: pop)
            }
            if combo >= 10 {
                Text(combo >= 25 ? "🔥 UNSTOPPABLE!" : "🔥 ON FIRE!")
                    .font(.headline.bold())
                    .foregroundColor(.red)
                    .transition(.scale.combined(with: .opacity))
            } else if combo >= 5 {
                Text("Heating up…").font(.caption).foregroundStyle(.secondary)
            } else {
                Text("Chain captures to build combo.").font(.caption).foregroundStyle(.secondary)
            }
        }
        .onChange(of: combo) { _, _ in
            pop = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                pop = false
            }
        }
    }
}

// ============================================================
// MARK: - 6. Motion showcase
// ============================================================

/// Maze motion lab: animated rows, bars, confetti.
struct MazeMotionShowcaseView: View {
    @State private var progress = 2
    @State private var claimed = false
    @State private var confetti = false
    @State private var bondXP = 6
    @State private var demoCombo = 4
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    VStack(spacing: 8) {
                        Text("🧭 Animated expedition row").font(.headline)
                        MazeAnimatedExpeditionRow(
                            icon: "🚪", title: "Closet Crawl",
                            progress: progress, target: 12,
                            reward: "700 pts +300🪙",
                            tip: "Frontier chunks restock closets.",
                            done: progress >= 12, claimed: claimed,
                            onClaim: { claimed = true }
                        )
                        .padding(.horizontal)
                        HStack(spacing: 12) {
                            Button("+1 progress") { progress = min(12, progress + 1) }
                                .buttonStyle(.bordered).controlSize(.small)
                            Button("Reset") {
                                progress = 2
                                claimed = false
                            }
                            .buttonStyle(.bordered).controlSize(.small)
                        }
                    }
                    VStack(spacing: 8) {
                        Text("🗺️ Flipping region rows").font(.headline)
                        MazeAnimatedRegionRow(emoji: "💜", name: "The Heart", bounds: "−40 ≤ z < 40, x < 0", found: true, isNew: true)
                            .padding(.horizontal)
                        MazeAnimatedRegionRow(emoji: "🌌", name: "Far Reaches West", bounds: "z ≥ 120, x < 0", found: true, isNew: false)
                            .padding(.horizontal)
                        MazeAnimatedRegionRow(emoji: "❓", name: "???", bounds: "Unmapped dark", found: false, isNew: false)
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("💖 Bond bar (tap +2 XP)").font(.headline)
                        Button(action: { bondXP += 2 }) {
                            MazeAnimatedBondBar(xp: bondXP, next: 15, level: bondLevel(xp: bondXP))
                                .padding(.horizontal)
                        }
                        .buttonStyle(.plain)
                    }
                    VStack(spacing: 8) {
                        Text("🎉 Celebration confetti").font(.headline)
                        ZStack {
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.black)
                                .frame(height: 200)
                            MazeCelebrationConfetti(active: confetti)
                            Text(confetti ? "" : "Tap to celebrate")
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .padding(.horizontal)
                        .onTapGesture { confetti.toggle() }
                    }
                    VStack(spacing: 8) {
                        Text("🔥 Combo reel (tap +3)").font(.headline)
                        Button(action: { demoCombo += 3 }) {
                            MazeComboReel(combo: demoCombo)
                        }
                        .buttonStyle(.plain)
                        Button("Reset combo") { demoCombo = 0 }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Maze Motion Lab")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func bondLevel(xp: Int) -> Int {
        if xp >= 25 { return 5 }
        if xp >= 15 { return 4 }
        if xp >= 8 { return 3 }
        if xp >= 3 { return 2 }
        return 1
    }
}
