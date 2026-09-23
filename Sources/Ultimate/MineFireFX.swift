//
//  MineFireFX.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Fire effects: campfires with log glow, torch arrays, forge glow beds,
//  firefly dusk swarms, firework shows and a showcase. Warmth you can see.
//

import SwiftUI

// ============================================================
// MARK: - 1. Campfire + torch array
// ============================================================

/// Campfire: log teepee, layered flames, smoke curls, spark pops.
struct MineCampfire: View {
    @State private var burn = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Log teepee.
            HStack(spacing: -8) {
                ForEach(0..<5, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(red: 0.35, green: 0.22, blue: 0.12))
                        .frame(width: 12, height: 70)
                        .rotationEffect(.degrees(Double(i * 18 - 36)))
                        .offset(y: 10)
                }
            }
            // Layered flames.
            ForEach(0..<3, id: \.self) { i in
                Ellipse()
                    .fill([Color.red, .orange, .yellow][i].opacity(0.85))
                    .frame(width: 54 - CGFloat(i) * 14, height: 70 - CGFloat(i) * 16)
                    .offset(y: -34)
                    .scaleEffect(y: burn ? 1.15 : 0.85, anchor: .bottom)
                    .blur(radius: CGFloat(i))
                    .animation(
                        .easeInOut(duration: 0.7 + Double(i) * 0.2).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.15),
                        value: burn
                    )
            }
            // Smoke curls.
            ForEach(0..<3, id: \.self) { i in
                Ellipse()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 22, height: 30)
                    .blur(radius: 5)
                    .offset(x: burn ? CGFloat(14 - i * 10) : 0, y: burn ? -110 : -50)
                    .opacity(burn ? 0.5 : 0)
                    .animation(
                        .easeOut(duration: 2.2).repeatForever(autoreverses: false)
                            .delay(Double(i) * 0.5),
                        value: burn
                    )
            }
            // Spark pops.
            ForEach(0..<6, id: \.self) { i in
                Circle()
                    .fill(Color.yellow)
                    .frame(width: 4, height: 4)
                    .offset(burn ? sparkOffset(i) : .zero)
                    .opacity(burn ? 1 : 0)
                    .animation(
                        .spring(response: 0.6, dampingFraction: 0.6)
                            .delay(Double(i) * 0.08),
                        value: burn
                    )
            }
            // Ground glow.
            Ellipse()
                .fill(Color.orange.opacity(0.35))
                .frame(width: 150, height: 30)
                .blur(radius: 8)
                .offset(y: 44)
        }
        .frame(height: 200)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 2.6, repeats: true) { _ in
                burn.toggle()
                if burn { SpookyHaptics.play(.light) }
            }
        }
    }

    private func sparkOffset(_ i: Int) -> CGSize {
        let angle = Double(i) / 6 * 2 * Double.pi - Double.pi / 2
        return CGSize(width: cos(angle) * 55, height: sin(angle) * 60 - 20)
    }
}

/// Torch array: row of flames with traveling wave.
struct MineTorchArray: View {
    var count = 5
    @State private var wave = false

    var body: some View {
        HStack(spacing: 26) {
            ForEach(0..<count, id: \.self) { i in
                MineTorchFlame(scale: 0.75, seed: Double(i) * 3.7 + 1)
                    .scaleEffect(wave ? 1.08 : 0.96)
                    .animation(
                        .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.18),
                        value: wave
                    )
            }
        }
        .padding(.vertical, 10)
        .onAppear { wave.toggle() }
    }
}

// ============================================================
// MARK: - 2. Forge glow bed + firefly dusk
// ============================================================

/// Forge glow bed: breathing coal bed with hot spots.
struct MineForgeBed: View {
    @State private var breathe = false

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(white: 0.08))
                .frame(height: 90)
            // Coal lumps with glowing cracks.
            HStack(spacing: 8) {
                ForEach(0..<7, id: \.self) { i in
                    Circle()
                        .fill(Color(white: 0.12))
                        .frame(width: 30, height: 30)
                        .overlay(
                            Circle()
                                .stroke(
                                    Color(red: 1.0, green: 0.45, blue: 0.1).opacity(breathe ? 0.9 : 0.3),
                                    lineWidth: 2
                                )
                                .scaleEffect(breathe ? 1.0 : 0.7)
                                .animation(
                                    .easeInOut(duration: 1.4).repeatForever(autoreverses: true)
                                        .delay(Double(i) * 0.2),
                                    value: breathe
                                )
                        )
                }
            }
            // Heat shimmer above.
            Ellipse()
                .fill(Color.orange.opacity(0.2))
                .frame(width: 220, height: 40)
                .blur(radius: 10)
                .offset(y: -40)
                .opacity(breathe ? 0.9 : 0.4)
                .animation(
                    .easeInOut(duration: 1.4).repeatForever(autoreverses: true),
                    value: breathe
                )
        }
        .frame(height: 120)
        .onAppear { breathe.toggle() }
    }
}

/// Firefly dusk: blinking swarm with drift paths.
struct MineFireflyDusk: View {
    var count = 24

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                for i in 0..<count {
                    let f1 = fract(Double(i) * 12.9898)
                    let f2 = fract(Double(i) * 78.233)
                    let x = fmod(f1 * w + sin(t * 0.5 + Double(i)) * 24, w)
                    let y = fmod(f2 * h + cos(t * 0.4 + Double(i) * 1.3) * 18, h)
                    let blink = 0.15 + 0.85 * pow(abs(sin(t * 1.8 + Double(i) * 2.4)), 3.0)
                    context.opacity = blink
                    context.fill(
                        Circle().path(in: CGRect(x: x - 2, y: y - 2, width: 4, height: 4)),
                        with: .color(.yellow)
                    )
                    context.opacity = blink * 0.35
                    context.fill(
                        Circle().path(in: CGRect(x: x - 6, y: y - 6, width: 12, height: 12)),
                        with: .color(.yellow)
                    )
                }
            }
        }
    }

    private func fract(_ x: Double) -> Double {
        x - floor(x)
    }
}

// ============================================================
// MARK: - 3. Firework show
// ============================================================

/// One firework rocket: ascent trail, burst shells, fading stars.
struct MineFirework: View {
    var colors: [Color] = [.red, .yellow, .white]
    @State private var stage = 0

    var body: some View {
        ZStack {
            if stage < 2 {
                // Ascent trail.
                Capsule()
                    .fill(Color.orange)
                    .frame(width: 4, height: 26)
                    .offset(y: stage == 0 ? 90 : -40)
                    .opacity(stage == 0 ? 1 : 0.4)
                    .animation(.easeOut(duration: 0.7), value: stage)
            } else {
                // Burst shells.
                ForEach(0..<3, id: \.self) { ring in
                    ForEach(0..<10, id: \.self) { i in
                        Circle()
                            .fill(colors[(i + ring) % colors.count])
                            .frame(width: 6, height: 6)
                            .offset(burstOffset(i, ring: ring))
                            .opacity(0.9)
                            .animation(
                                .spring(response: 0.7, dampingFraction: 0.62)
                                    .delay(Double(ring) * 0.12 + Double(i) * 0.01),
                                value: stage
                            )
                    }
                }
                Text("🎆")
                    .font(.title)
                    .scaleEffect(1.2)
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .frame(height: 220)
        .onAppear { run() }
    }

    private func burstOffset(_ i: Int, ring: Int) -> CGSize {
        let angle = Double(i) / 10 * 2 * Double.pi
        let dist = CGFloat(30 + ring * 28)
        return CGSize(width: cos(angle) * dist, height: sin(angle) * dist - 30)
    }

    private func run() {
        stage = 0
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { stage = 1 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            stage = 2
            SpookyHaptics.play(.heavy)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) { run() }
    }
}

/// Grand firework finale: three rockets staggered.
struct MineFireworkFinale: View {
    var body: some View {
        HStack(spacing: 8) {
            MineFirework(colors: [.red, .yellow, .white])
            MineFirework(colors: [.cyan, .white, .blue])
            MineFirework(colors: [.pink, .yellow, .white])
        }
    }
}

// ============================================================
// MARK: - 4. Fire showcase
// ============================================================

/// Fire hall: campfire, torches, forge bed, fireflies, fireworks.
struct MineFireShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🔥 Campfire").font(.headline)
                        MineCampfire()
                    }
                    VStack(spacing: 8) {
                        Text("🕯️ Torch array (wave)").font(.headline)
                        MineTorchArray(count: 5)
                    }
                    VStack(spacing: 8) {
                        Text("🫳 Forge glow bed").font(.headline)
                        MineForgeBed()
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🪲 Firefly dusk").font(.headline)
                        MineFireflyDusk(count: 24)
                            .frame(height: 170)
                            .background(Color(red: 0.05, green: 0.08, blue: 0.05))
                            .cornerRadius(14)
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🎆 Firework finale (loops)").font(.headline)
                        MineFireworkFinale()
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Fire Hall")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
