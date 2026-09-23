//
//  MineTransitions.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Custom transition lab: iris wipes, pixel dissolves, slide-blur swaps,
//  circle reveals, flip cards and a demo navigator that swaps scenes with
//  every transition. Pure view layer.
//

import SwiftUI

// ============================================================
// MARK: - 1. Transition pieces
// ============================================================

/// Iris wipe overlay: circle mask that opens/closes.
struct MineIrisWipe: View {
    var open: Bool

    var body: some View {
        GeometryReader { geo in
            Circle()
                .fill(Color.black)
                .frame(
                    width: open ? max(geo.size.width, geo.size.height) * 2.4 : 24,
                    height: open ? max(geo.size.width, geo.size.height) * 2.4 : 24
                )
                .position(x: geo.size.width / 2, y: geo.size.height / 2)
                .animation(.spring(response: 0.7, dampingFraction: 0.7), value: open)
        }
        .allowsHitTesting(false)
    }
}

/// Pixel dissolve grid: cells fade in staggered order.
struct MinePixelDissolve: View {
    var progress: Double // 0…1
    var cols = 14
    var rows = 20

    var body: some View {
        TimelineView(.animation) { _ in
            Canvas { context, size in
                let cw = Double(size.width) / Double(cols)
                let ch = Double(size.height) / Double(rows)
                for x in 0..<cols {
                    for y in 0..<rows {
                        let order = Double((x * 7 + y * 13) % (cols * rows)) / Double(cols * rows)
                        if progress > order {
                            context.fill(
                                Path(CGRect(
                                    x: Double(x) * cw + 1, y: Double(y) * ch + 1,
                                    width: cw - 2, height: ch - 2
                                )),
                                with: .color(.black)
                            )
                        }
                    }
                }
            }
        }
        .allowsHitTesting(false)
    }
}

/// Circle reveal from a tap point: expanding ring + fill.
struct MineCircleReveal: View {
    var at: CGPoint
    var revealed: Bool

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.8), lineWidth: 3)
                    .frame(width: revealed ? 40 : 400, height: revealed ? 40 : 400)
                    .position(at)
                    .opacity(revealed ? 0 : 1)
                    .animation(.easeOut(duration: 0.9), value: revealed)
                Circle()
                    .fill(Color.black.opacity(revealed ? 0.85 : 0))
                    .frame(width: revealed ? 900 : 0, height: revealed ? 900 : 0)
                    .position(at)
                    .animation(.spring(response: 0.7, dampingFraction: 0.7), value: revealed)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .allowsHitTesting(false)
    }
}

/// Flip card: front/back with 3D rotation on tap.
struct MineFlipCard<Front: View, Back: View>: View {
    @ViewBuilder var front: () -> Front
    @ViewBuilder var back: () -> Back
    @State private var flipped = false

    var body: some View {
        ZStack {
            front()
                .opacity(flipped ? 0 : 1)
            back()
                .opacity(flipped ? 1 : 0)
        }
        .rotation3DEffect(.degrees(flipped ? 180 : 0), axis: (x: 0, y: 1, z: 0))
        .animation(.spring(response: 0.6, dampingFraction: 0.65), value: flipped)
        .onTapGesture {
            flipped.toggle()
            SpookyHaptics.play(.light)
        }
    }
}

/// Slide-blur swap: content slides + blurs between two states.
struct MineSlideBlurSwap<First: View, Second: View>: View {
    var showingFirst: Bool
    @ViewBuilder var first: () -> First
    @ViewBuilder var second: () -> Second

    var body: some View {
        ZStack {
            first()
                .offset(x: showingFirst ? 0 : -60)
                .blur(radius: showingFirst ? 0 : 8)
                .opacity(showingFirst ? 1 : 0)
            second()
                .offset(x: showingFirst ? 60 : 0)
                .blur(radius: showingFirst ? 8 : 0)
                .opacity(showingFirst ? 0 : 1)
        }
        .animation(.spring(response: 0.55, dampingFraction: 0.7), value: showingFirst)
    }
}

// ============================================================
// MARK: - 2. Demo navigator + showcase
// ============================================================

/// Demo navigator: three scenes swapped with a chosen transition.
struct MineTransitionNavigator: View {
    @State private var scene = 0
    @State private var style = 0
    @State private var irisOpen = true
    @State private var dissolve = 0.0
    @State private var revealTap = CGPoint(x: 150, y: 250)
    @State private var revealed = false

    private let scenes: [(emoji: String, title: String, color: Color)] = [
        ("⛏️", "The Dig", .orange),
        ("🔮", "The Hollows", .purple),
        ("🔥", "The Core", .red),
    ]
    private let styles = ["Slide-blur", "Iris", "Dissolve", "Circle reveal"]

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(scenes[scene].2.opacity(0.25))
                    .frame(height: 220)
                VStack(spacing: 6) {
                    Text(scenes[scene].0).font(.system(size: 64))
                    Text(scenes[scene].1).font(.title.bold())
                }
                .opacity(style == 2 ? 1 : 1)
                // Transition layers.
                if style == 1 {
                    MineIrisWipe(open: irisOpen)
                }
                if style == 2 {
                    MinePixelDissolve(progress: dissolve)
                }
                if style == 3 {
                    MineCircleReveal(at: revealTap, revealed: revealed)
                }
            }
            .frame(height: 220)
            .onTapGesture {
                // Circle reveal retargets on tap (demo uses center).
                revealed.toggle()
            }
            .gesture(
                DragGesture(minimumDistance: 30)
                    .onEnded { value in
                        if style == 0 {
                            if value.translation.width < 0 {
                                next()
                            } else {
                                prev()
                            }
                        }
                    }
            )
            Picker("Transition", selection: $style) {
                ForEach(styles.indices, id: \.self) { i in
                    Text(styles[i]).tag(i)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .onChange(of: style) { _, _ in reset() }
            HStack(spacing: 20) {
                Button("← Prev") { prev() }
                    .buttonStyle(.bordered)
                Button("Next →") { next() }
                    .buttonStyle(.borderedProminent)
            }
            Text(slideHint)
                .font(.caption).foregroundStyle(.secondary)
        }
        .onAppear { reset() }
    }

    private var slideHint: String {
        switch style {
        case 0: return "Swipe the card (or use buttons) — slide + blur swap."
        case 1: return "Iris opens on appear, closes on change."
        case 2: return "Pixel dissolve sweeps in order."
        default: return "Tap the card to reveal / cover from center."
        }
    }

    private func reset() {
        irisOpen = false
        dissolve = 0
        revealed = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            irisOpen = true
            revealed = true
            withAnimation(.easeInOut(duration: 1.4)) {
                dissolve = 1.0
            }
        }
    }

    private func next() {
        if style == 1 { irisOpen = false }
        if style == 2 { dissolve = 0 }
        if style == 3 { revealed = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            scene = (scene + 1) % scenes.count
            reset()
            SpookyHaptics.play(.light)
        }
    }

    private func prev() {
        if style == 1 { irisOpen = false }
        if style == 2 { dissolve = 0 }
        if style == 3 { revealed = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            scene = (scene + scenes.count - 1) % scenes.count
            reset()
            SpookyHaptics.play(.light)
        }
    }
}

/// Flip-card pair demo: ore front, stats back.
struct MineFlipDemo: View {
    var body: some View {
        HStack(spacing: 20) {
            MineFlipCard(
                front: {
                    VStack {
                        Text("💎").font(.system(size: 44))
                        Text("Diamond Ore").font(.caption.bold())
                    }
                    .frame(width: 130, height: 150)
                    .background(Color(red: 0.1, green: 0.2, blue: 0.3))
                    .cornerRadius(14)
                },
                back: {
                    VStack(spacing: 4) {
                        Text("DMG to crack: 6+").font(.caption.bold())
                        Text("Needs Diamond pick").font(.caption2)
                        Text("Pays 25🪙 × depth").font(.caption2)
                        Text("Tap to flip back").font(.caption2).foregroundStyle(.secondary)
                    }
                    .frame(width: 130, height: 150)
                    .background(Color(red: 0.1, green: 0.25, blue: 0.35))
                    .cornerRadius(14)
                }
            )
            MineFlipCard(
                front: {
                    VStack {
                        Text("🚪").font(.system(size: 44))
                        Text("Closet Crate").font(.caption.bold())
                    }
                    .frame(width: 130, height: 150)
                    .background(Color(red: 0.25, green: 0.16, blue: 0.08))
                    .cornerRadius(14)
                },
                back: {
                    VStack(spacing: 4) {
                        Text("Opens by hand").font(.caption.bold())
                        Text("Snacks • Tools").font(.caption2)
                        Text("Treasure • Fakes").font(.caption2)
                        Text("Tap to flip back").font(.caption2).foregroundStyle(.secondary)
                    }
                    .frame(width: 130, height: 150)
                    .background(Color(red: 0.3, green: 0.19, blue: 0.09))
                    .cornerRadius(14)
                }
            )
        }
    }
}

// ============================================================
// MARK: - 3. Transitions showcase
// ============================================================

/// Transition lab: navigator, flip cards, slide-blur toggle demo.
struct MineTransitionShowcaseView: View {
    @State private var first = true
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🔀 Scene navigator").font(.headline)
                        Text("One card, four transitions. Swipe, tap, switch.").font(.caption).foregroundStyle(.secondary)
                        MineTransitionNavigator()
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🃏 Flip cards (tap)").font(.headline)
                        MineFlipDemo()
                    }
                    VStack(spacing: 8) {
                        Text("🌫️ Slide-blur swap").font(.headline)
                        MineSlideBlurSwap(showingFirst: first) {
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.orange.opacity(0.3))
                                .frame(height: 120)
                                .overlay(Text("⛏️ Day shift").font(.headline))
                        } second: {
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.purple.opacity(0.3))
                                .frame(height: 120)
                                .overlay(Text("🌙 Night shift").font(.headline))
                        }
                        .padding(.horizontal)
                        Toggle("Day shift", isOn: $first)
                            .padding(.horizontal, 60)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Transition Lab")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
