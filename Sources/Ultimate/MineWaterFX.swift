//
//  MineWaterFX.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Water effects: drip curtains, ripple fields, bubble columns, waterfall
//  sheets, flood shimmer, reflection pools and a showcase. All Canvas or
//  declarative loops — no per-frame state.
//

import SwiftUI

// ============================================================
// MARK: - 1. Drip curtain + ripple field
// ============================================================

/// Drip curtain: staggered falling streaks across a span.
struct MineDripCurtain: View {
    var drops = 18
    @State private var flow = false

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                for i in 0..<drops {
                    let speed = 0.5 + Double(i % 4) * 0.2
                    let life = fmod(t * speed + Double(i) * 0.37, 1.0)
                    let x = Double(i) / Double(max(1, drops - 1)) * w + sin(t + Double(i)) * 4
                    let y = life * h
                    context.opacity = (1 - life * 0.4) * 0.85
                    context.fill(
                        Capsule().path(in: CGRect(x: x - 1.2, y: y - 9, width: 2.4, height: 18)),
                        with: .color(.cyan)
                    )
                    // Splash dot at the bottom.
                    if life > 0.92 {
                        context.opacity = (life - 0.92) / 0.08 * 0.7
                        context.stroke(
                            Ellipse().path(in: CGRect(x: x - 8, y: h - 10, width: 16, height: 5)),
                            with: .color(.cyan),
                            lineWidth: 1.5
                        )
                    }
                }
            }
        }
    }
}

/// Ripple field: expanding rings on dark water, phased loop.
struct MineRippleField: View {
    var rings = 6

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                for i in 0..<rings {
                    let life = fmod(t * 0.35 + Double(i) * 0.23, 1.0)
                    let cx = fmod(Double(i) * 173.3, w)
                    let cy = fmod(Double(i) * 97.1, h)
                    let r = 4 + life * 34
                    context.opacity = (1 - life) * 0.6
                    context.stroke(
                        Ellipse().path(in: CGRect(x: cx - r, y: cy - r * 0.35, width: r * 2, height: r * 0.7)),
                        with: .color(.cyan),
                        lineWidth: 1.5
                    )
                }
            }
        }
    }
}

// ============================================================
// MARK: - 2. Bubble columns + waterfall sheets
// ============================================================

/// Bubble column: rising wobbling orbs in a shaft of water.
struct MineBubbleColumn: View {
    var bubbles = 16
    var tint: Color = .cyan

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                for i in 0..<bubbles {
                    let life = fmod(t * (0.3 + Double(i % 3) * 0.12) + Double(i) * 0.31, 1.0)
                    let x = w / 2 + sin(t * 1.5 + Double(i) * 2.2) * (10 + Double(i % 5) * 4)
                    let y = h - life * h
                    let r = 2 + Double(i % 4)
                    context.opacity = (0.4 + 0.6 * (1 - life)) * 0.85
                    context.stroke(
                        Circle().path(in: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)),
                        with: .color(tint),
                        lineWidth: 1.5
                    )
                    context.fill(
                        Circle().path(in: CGRect(x: x - r * 0.3, y: y - r * 0.3, width: r * 0.6, height: r * 0.6)),
                        with: .color(.white.opacity(0.7))
                    )
                }
            }
        }
    }
}

/// Waterfall sheet: falling translucent bands + foam base + mist.
struct MineWaterfallSheet: View {
    var width: CGFloat = 130
    @State private var flow = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Falling bands.
            HStack(spacing: 7) {
                ForEach(0..<5, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [Color.cyan.opacity(0.15), Color.cyan.opacity(0.55)],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                        .frame(width: 16, height: flow ? 190 : 150)
                        .blur(radius: 1)
                        .animation(
                            .easeInOut(duration: 1.1).repeatForever(autoreverses: true)
                                .delay(Double(i) * 0.12),
                            value: flow
                        )
                }
            }
            // Foam base.
            Ellipse()
                .fill(Color.white.opacity(0.5))
                .frame(width: width, height: 22)
                .blur(radius: 4)
                .offset(y: 8)
                .scaleEffect(x: flow ? 1.1 : 0.9)
                .animation(
                    .easeInOut(duration: 1.1).repeatForever(autoreverses: true),
                    value: flow
                )
            // Mist puffs.
            ForEach(0..<3, id: \.self) { i in
                Ellipse()
                    .fill(Color.white.opacity(0.18))
                    .frame(width: 60, height: 24)
                    .blur(radius: 6)
                    .offset(x: CGFloat(i * 40 - 40), y: flow ? -16 : 6)
                    .opacity(flow ? 0.8 : 0.2)
                    .animation(
                        .easeOut(duration: 1.6).repeatForever(autoreverses: false)
                            .delay(Double(i) * 0.3),
                        value: flow
                    )
            }
        }
        .frame(height: 230)
        .onAppear { flow.toggle() }
    }
}

// ============================================================
// MARK: - 3. Flood shimmer + reflection pool
// ============================================================

/// Flood shimmer: whole-scene watery wobble overlay.
struct MineFloodShimmer: View {
    @State private var wobble = false

    var body: some View {
        RoundedRectangle(cornerRadius: 14)
            .fill(
                LinearGradient(
                    colors: [Color.cyan.opacity(0.14), .clear, Color.cyan.opacity(0.1)],
                    startPoint: .top, endPoint: .bottom
                )
            )
            .overlay(
                // Moving highlight bands.
                VStack(spacing: 26) {
                    ForEach(0..<4, id: \.self) { i in
                        Rectangle()
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 3)
                            .offset(x: wobble ? 20 : -20)
                            .animation(
                                .easeInOut(duration: 2.4).repeatForever(autoreverses: true)
                                    .delay(Double(i) * 0.3),
                                value: wobble
                            )
                    }
                }
                .blur(radius: 2)
            )
            .onAppear { wobble.toggle() }
            .allowsHitTesting(false)
    }
}

/// Reflection pool: emoji scene mirrored with ripple distortion look.
struct MineReflectionPool: View {
    var scene: String
    var tint: Color = .cyan

    var body: some View {
        VStack(spacing: 0) {
            Text(scene)
                .font(.system(size: 52))
            // Water line.
            Rectangle()
                .fill(tint.opacity(0.5))
                .frame(height: 3)
            // Mirrored echo.
            Text(scene)
                .font(.system(size: 52))
                .scaleEffect(y: -1)
                .opacity(0.3)
                .blur(radius: 1.5)
                .mask(
                    LinearGradient(
                        colors: [.black, .clear],
                        startPoint: .top, endPoint: .bottom
                    )
                )
        }
    }
}

// ============================================================
// MARK: - 4. Water showcase
// ============================================================

/// Water hall: curtains, ripples, columns, falls, shimmer, pools.
struct MineWaterShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🌧️ Drip curtain").font(.headline)
                        MineDripCurtain(drops: 18)
                            .frame(height: 180)
                            .background(Color.black)
                            .cornerRadius(14)
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("⭕ Ripple field").font(.headline)
                        MineRippleField(rings: 6)
                            .frame(height: 150)
                            .background(Color(red: 0.02, green: 0.06, blue: 0.12))
                            .cornerRadius(14)
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🫧 Bubble columns").font(.headline)
                        HStack(spacing: 20) {
                            MineBubbleColumn(bubbles: 14, tint: .cyan)
                                .frame(width: 90, height: 200)
                                .background(Color.black)
                                .cornerRadius(12)
                            MineBubbleColumn(bubbles: 14, tint: .purple)
                                .frame(width: 90, height: 200)
                                .background(Color.black)
                                .cornerRadius(12)
                        }
                    }
                    VStack(spacing: 8) {
                        Text("🌊 Waterfall sheet").font(.headline)
                        MineWaterfallSheet()
                    }
                    VStack(spacing: 8) {
                        Text("💧 Flood shimmer (overlay demo)").font(.headline)
                        ZStack {
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color(red: 0.15, green: 0.12, blue: 0.15))
                                .frame(height: 150)
                            Text("⛏️ tunnels below")
                                .foregroundColor(.white.opacity(0.7))
                            MineFloodShimmer()
                                .padding(6)
                        }
                        .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🪞 Reflection pools").font(.headline)
                        HStack(spacing: 24) {
                            MineReflectionPool(scene: "🏮", tint: .orange)
                            MineReflectionPool(scene: "🔮", tint: .cyan)
                            MineReflectionPool(scene: "👻", tint: .purple)
                        }
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Water Hall")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
