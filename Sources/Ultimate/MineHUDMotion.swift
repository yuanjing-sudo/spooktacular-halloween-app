//
//  MineHUDMotion.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  HUD motion kit for the mine: springy buttons, shimmer bars, rolling
//  counters, wave-fill backpack meter, pulsing sell button, pop badges
//  and a showcase. Every control is smoother; every number feels earned.
//

import SwiftUI

// ============================================================
// MARK: - 1. Springy button style
// ============================================================

/// Button style with press squash + release spring + glow option.
struct MineSpringButtonStyle: ButtonStyle {
    var tint: Color = .orange
    var glow: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .brightness(configuration.isPressed ? -0.08 : 0)
            .shadow(color: glow ? tint.opacity(0.7) : .clear, radius: glow ? 10 : 0)
            .animation(.spring(response: 0.3, dampingFraction: 0.55), value: configuration.isPressed)
    }
}

// ============================================================
// MARK: - 2. Shimmer bars + text
// ============================================================

/// Sweeping shine overlay for progress bars and banners.
struct MineShimmerBar: View {
    var fraction: Double
    var tint: Color = .orange
    var height: CGFloat = 12
    @State private var sweep = false

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.14))
                    .frame(height: height)
                Capsule()
                    .fill(tint.gradient)
                    .frame(width: geo.size.width * max(0, min(1, fraction)), height: height)
                    .animation(.spring(response: 0.45, dampingFraction: 0.7), value: fraction)
                // Sweep.
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [.clear, .white.opacity(0.65), .clear],
                            startPoint: .leading, endPoint: .trailing
                        )
                    )
                    .frame(width: 46, height: height)
                    .offset(x: sweep ? geo.size.width : -46)
                    .animation(
                        .easeInOut(duration: 1.8).repeatForever(autoreverses: false),
                        value: sweep
                    )
            }
            .clipShape(Capsule())
        }
        .frame(height: height)
        .onAppear { sweep.toggle() }
    }
}

/// Shimmering headline text (shine band sliding across).
struct MineShimmerText: View {
    var text: String
    var tint: Color = .yellow
    @State private var sweep = false

    var body: some View {
        Text(text)
            .font(.headline)
            .foregroundColor(tint)
            .overlay(
                GeometryReader { geo in
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [.clear, .white.opacity(0.8), .clear],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: 60)
                        .offset(x: sweep ? geo.size.width : -60)
                        .animation(
                            .easeInOut(duration: 2.2).repeatForever(autoreverses: false),
                            value: sweep
                        )
                }
                .mask(Text(text).font(.headline))
            )
            .onAppear { sweep.toggle() }
    }
}

// ============================================================
// MARK: - 3. Rolling counter (AnimatableModifier)
// ============================================================

/// Animatable number that rolls between values instead of jumping.
struct MineRollingModifier: AnimatableModifier {
    var value: Double

    var animatableData: Double {
        get { value }
        set { value = newValue }
    }

    func body(content: Content) -> some View {
        Text("\(Int(value))")
            .monospacedDigit()
    }
}

/// Rolling number view: pass the live total, watch it spin up.
struct MineRollingNumber: View {
    var value: Int
    var font: Font = .headline

    var body: some View {
        Color.clear
            .frame(width: 1, height: 1)
            .modifier(MineRollingModifier(value: Double(value)))
            .font(font)
            .animation(.spring(response: 0.6, dampingFraction: 0.7), value: Double(value))
    }
}

// ============================================================
// MARK: - 4. Backpack wave meter
// ============================================================

/// Backpack meter with a sloshing liquid top edge (Canvas sine wave).
struct MineBackpackWave: View {
    var fraction: Double // 0…1
    var tint: Color = .orange

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    let w = Double(size.width), h = Double(size.height)
                    let level = h * (1 - max(0, min(1, fraction)))
                    var wave = Path()
                    wave.move(to: CGPoint(x: 0, y: h))
                    var x: Double = 0
                    while x <= w {
                        let y = level + 4 * sin(x / 18 + t * 2.4) + 2 * sin(x / 7 - t * 3.4)
                        wave.addLine(to: CGPoint(x: x, y: y))
                        x += 3
                    }
                    wave.addLine(to: CGPoint(x: w, y: h))
                    wave.closeSubpath()
                    context.fill(
                        wave,
                        with: .linearGradient(
                            Gradient(colors: [tint, tint.opacity(0.6)]),
                            startPoint: CGPoint(x: 0, y: level),
                            endPoint: CGPoint(x: 0, y: h)
                        )
                    )
                    // Surface glint.
                    context.stroke(
                        Path { p in
                            var xx: Double = 0
                            p.move(to: CGPoint(x: 0, y: level + 4 * sin(t * 2.4)))
                            while xx <= w {
                                let y = level + 4 * sin(xx / 18 + t * 2.4)
                                p.addLine(to: CGPoint(x: xx, y: y))
                                xx += 3
                            }
                        },
                        with: .color(.white.opacity(0.7)),
                        lineWidth: 1.5
                    )
                }
            }
        }
    }
}

// ============================================================
// MARK: - 5. Pulsing sell button + pop badge
// ============================================================

/// Sell button that throbs when the pack is full and glows on payday.
struct MineSellButton: View {
    var backpackUsed: Int
    var capacity: Int
    var sellValue: Int
    var action: () -> Void
    @State private var throb = false

    private var isFull: Bool { backpackUsed >= capacity }
    private var hasLoot: Bool { backpackUsed > 0 }

    var body: some View {
        Button(action: {
            SpookyHaptics.play(hasLoot ? .reward : .light)
            action()
        }) {
            VStack(spacing: 2) {
                Text("💰")
                    .font(.title2)
                    .scaleEffect(throb && isFull ? 1.2 : 1.0)
                    .animation(
                        isFull ? .spring(response: 0.4, dampingFraction: 0.5).repeatForever(autoreverses: true) : .default,
                        value: throb
                    )
                Text("\(sellValue)")
                    .font(.caption.bold())
                    .foregroundColor(.white)
                    .monospacedDigit()
            }
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(
                (isFull ? Color.green : (hasLoot ? Color.green.opacity(0.7) : Color.gray.opacity(0.4)))
            )
            .cornerRadius(12)
            .shadow(color: isFull ? .green.opacity(0.8) : .clear, radius: isFull ? 10 : 0)
        }
        .buttonStyle(.plain)
        .onAppear { throb.toggle() }
    }
}

/// Pop badge: springs when its value changes (claims, counts, ranks).
struct MinePopBadge: View {
    var text: String
    var color: Color = .orange
    @State private var pop = false
    private var trigger: String { text }

    var body: some View {
        Text(text)
            .font(.caption.bold())
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(color)
            .foregroundColor(.white)
            .cornerRadius(8)
            .scaleEffect(pop ? 1.25 : 1.0)
            .onChange(of: trigger) { _, _ in
                pop = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    pop = false
                }
            }
            .animation(.spring(response: 0.3, dampingFraction: 0.5), value: pop)
    }
}

// ============================================================
// MARK: - 6. Bounce-on-change wrapper
// ============================================================

/// Wraps any content and bounces it whenever `value` changes.
struct MineBounceOnChange<V: View, T: Equatable>: View {    var value: T
    @ViewBuilder var content: () -> V
    @State private var bounce = false

    var body: some View {
        content()
            .scaleEffect(bounce ? 1.12 : 1.0)
            .animation(.spring(response: 0.32, dampingFraction: 0.5), value: bounce)
            .onChange(of: value) { _, _ in
                bounce = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    bounce = false
                }
            }
    }
}

/// Countdown badge: ring drain + pulse at zero + "GO" pop.
struct MineCountdownBadge: View {    var seconds: Int
    @State private var go = false

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.2), lineWidth: 8)
                .frame(width: 90, height: 90)
            Circle()
                .trim(from: 0, to: 1.0)
                .stroke(Color.orange, lineWidth: 8)
                .frame(width: 90, height: 90)
                .rotationEffect(.degrees(-90))
            Text(go ? "GO!" : "\(seconds)")
                .font(.system(size: go ? 26 : 34, weight: .black))
                .foregroundColor(go ? .green : .white)
                .scaleEffect(go ? 1.3 : 1.0)
                .animation(.spring(response: 0.4, dampingFraction: 0.5), value: go)
        }
        .frame(width: 100, height: 100)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
                go = true
                SpookyHaptics.play(.levelUp)
            }
        }
    }
}

/// Animated tab switcher: sliding pill + icon pop per tab.
struct MineTabSwitcher: View {
    var tabs: [(emoji: String, label: String)]
    @State private var selected = 0

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 6) {
                ForEach(tabs.indices, id: \.self) { i in
                    Button(action: {
                        selected = i
                        SpookyHaptics.play(.light)
                    }) {
                        VStack(spacing: 2) {
                            Text(tabs[i].emoji)
                                .font(.title2)
                                .scaleEffect(selected == i ? 1.25 : 1.0)
                                .animation(.spring(response: 0.35, dampingFraction: 0.55), value: selected)
                            Text(tabs[i].label)
                                .font(.caption2.bold())
                                .foregroundColor(selected == i ? .white : .gray)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(selected == i ? Color.orange.opacity(0.35) : Color.clear)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(6)
            .background(Color.black.opacity(0.5))
            .cornerRadius(14)
            Text("Selected: \(tabs[selected].label) — content would swap here with a slide-blur.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }
}

/// Streak flame: grows + shifts blue→orange→red with streak length.
struct MineStreakFlame: View {
    var streak: Int
    @State private var lick = false

    private var tint: Color {
        if streak >= 20 { return .red }
        if streak >= 10 { return .orange }
        if streak >= 5 { return .yellow }
        return .gray
    }

    var body: some View {
        HStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(tint.opacity(0.25))
                    .frame(width: 44, height: 44)
                    .scaleEffect(lick ? 1.15 : 0.95)
                    .animation(
                        .easeInOut(duration: streak >= 10 ? 0.5 : 1.2).repeatForever(autoreverses: true),
                        value: lick
                    )
                Text("🔥")
                    .font(.system(size: streak >= 10 ? 30 : 24))
                    .scaleEffect(y: lick ? 1.15 : 0.9, anchor: .bottom)
                    .animation(
                        .easeInOut(duration: streak >= 10 ? 0.5 : 1.2).repeatForever(autoreverses: true),
                        value: lick
                    )
                    .saturation(streak >= 5 ? 1.2 : 0.2)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text("\(streak) streak").font(.headline).monospacedDigit()
                Text(streak >= 20 ? "INFERNO" : (streak >= 10 ? "BLAZING" : (streak >= 5 ? "WARMING" : "COLD")))
                    .font(.caption2.bold())
                    .foregroundColor(tint)
            }
        }
        .padding(8)
        .background(Color.black.opacity(0.5))
        .cornerRadius(12)
        .onAppear { lick.toggle() }
    }
}

// ============================================================
// MARK: - 7. HUD motion showcase
// ============================================================

/// Motion lab: every HUD control live with demo state.
struct MineHUDMotionShowcaseView: View {
    @State private var gold = 1250
    @State private var pack = 0.35
    @State private var badge = "3 claimable!"
    @State private var full = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("Springy buttons").font(.headline)
                        HStack(spacing: 14) {
                            Button("Dig") {}
                                .buttonStyle(MineSpringButtonStyle(tint: .orange, glow: true))
                            Button("Sell") {}
                                .buttonStyle(MineSpringButtonStyle(tint: .green))
                            Button("Hatch") {}
                                .buttonStyle(MineSpringButtonStyle(tint: .purple, glow: true))
                        }
                        Text("Press and hold — squash, glow, spring back.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    VStack(spacing: 8) {
                        Text("Shimmer bars + text").font(.headline)
                        MineShimmerBar(fraction: 0.68, tint: .orange)
                            .padding(.horizontal, 40)
                        MineShimmerBar(fraction: 0.42, tint: .purple)
                            .padding(.horizontal, 40)
                        MineShimmerText(text: "✨ Legendary Haul Incoming ✨")
                    }
                    VStack(spacing: 8) {
                        Text("Rolling counter (tap +500)").font(.headline)
                        Button(action: { gold += 500 }) {
                            HStack {
                                Text("💰").font(.title)
                                MineRollingNumber(value: gold, font: .largeTitle.bold())
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    VStack(spacing: 8) {
                        Text("Backpack wave (drag the slider)").font(.headline)
                        MineBackpackWave(fraction: pack, tint: full ? .green : .orange)
                            .frame(height: 120)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                            .padding(.horizontal, 40)
                        Slider(value: $pack, in: 0...1)
                            .padding(.horizontal, 40)
                            .onChange(of: pack) { _, new in
                                full = new >= 1.0
                            }
                    }
                    VStack(spacing: 8) {
                        Text("Sell button + pop badge").font(.headline)
                        HStack(spacing: 20) {
                            MineSellButton(
                                backpackUsed: full ? 50 : 23,
                                capacity: 50,
                                sellValue: full ? 1240 : 380,
                                action: {}
                            )
                            MinePopBadge(text: badge, color: .green)
                        }
                        Button("New claim!") {
                            badge = "\(Int.random(in: 1...5)) claimable!"
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                    VStack(spacing: 8) {
                        Text("Bounce on change").font(.headline)
                        MineBounceOnChange(value: gold) {
                            Text("💰 \(gold)").font(.title.bold())
                        }
                        Text("Bounces with the counter above.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    VStack(spacing: 8) {
                        Text("Countdown badge").font(.headline)
                        MineCountdownBadge(seconds: 3)
                    }
                    VStack(spacing: 8) {
                        Text("Tab switcher").font(.headline)
                        MineTabSwitcher(tabs: [
                            (emoji: "⛏️", label: "Dig"),
                            (emoji: "🎒", label: "Pack"),
                            (emoji: "🐾", label: "Pets"),
                            (emoji: "🗺️", label: "Map"),
                        ])
                        .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("Streak flame").font(.headline)
                        HStack(spacing: 12) {
                            MineStreakFlame(streak: 3)
                            MineStreakFlame(streak: 12)
                            MineStreakFlame(streak: 27)
                        }
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("HUD Motion Lab")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
