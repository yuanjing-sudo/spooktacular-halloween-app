//
//  MineLighting.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Dynamic lighting rigs for the Abandoned Mine: torch flames with noise
//  flicker, swinging lanterns with moth orbits, lava crust glow, crystal
//  light pools, dusty light cones, shadow vignettes and six full layer
//  lighting presets. Declarative SwiftUI + TimelineView Canvas fire.
//

import SwiftUI

// ============================================================
// MARK: - 1. Light models + flicker math
// ============================================================

/// Deterministic flame noise: layered sines read like turbulence.
enum MineFlicker {
    /// 0…1 flicker for a flame at time t (seconds) with personal seed.
    static func flame(_ t: Double, seed: Double) -> Double {
        let a = sin(t * 11.0 + seed)
        let b = sin(t * 23.7 + seed * 1.7) * 0.5
        let c = sin(t * 5.3 + seed * 0.6) * 0.35
        return 0.72 + 0.16 * a + 0.08 * b + 0.04 * c
    }

    /// Slow breathing glow 0…1.
    static func breathe(_ t: Double, seed: Double, period: Double = 3.0) -> Double {
        0.65 + 0.35 * sin(2 * .pi * t / period + seed)
    }

    /// Lava crust pulse 0…1 (slow, heavy).
    static func lava(_ t: Double, seed: Double) -> Double {
        0.6 + 0.25 * sin(2 * .pi * t / 5.0 + seed) + 0.15 * sin(2 * .pi * t / 1.7 + seed * 2.0)
    }

    /// Moth orbit angle.
    static func moth(_ t: Double, seed: Double, speed: Double = 2.2) -> Double {
        t * speed + seed
    }
}

/// One placed light: position (unit space), color, radius, seed.
struct MineLight: Identifiable {
    let id = UUID()
    var x: Double // 0…1 across
    var y: Double // 0…1 down
    var color: Color
    var radius: Double // 0…1 of scene width
    var seed: Double
    var kind: MineLightKind
}

enum MineLightKind {
    case torch, lantern, lava, crystal, shaft, wisp
}

/// Full lighting preset for a mine layer.
struct MineLayerLighting {
    var layer: String
    var background: [Color]
    var lights: [MineLight]
    var fogColor: Color
    var fogDensity: Double
    var emberRate: Double // embers per second hint
}

enum MineLayerLightingGuide {
    static var all: [MineLayerLighting] = [
        MineLayerLighting(
            layer: "Sunlit Tops",
            background: [Color(red: 0.35, green: 0.3, blue: 0.22), Color(red: 0.12, green: 0.1, blue: 0.1)],
            lights: [
                MineLight(x: 0.5, y: 0.0, color: .yellow, radius: 0.9, seed: 1, kind: .shaft),
                MineLight(x: 0.2, y: 0.7, color: .orange, radius: 0.3, seed: 2, kind: .torch),
                MineLight(x: 0.8, y: 0.7, color: .orange, radius: 0.3, seed: 3, kind: .torch),
            ],
            fogColor: .clear, fogDensity: 0.0, emberRate: 2
        ),
        MineLayerLighting(
            layer: "Dirt Tunnels",
            background: [Color(red: 0.25, green: 0.18, blue: 0.12), Color(red: 0.08, green: 0.06, blue: 0.06)],
            lights: [
                MineLight(x: 0.3, y: 0.5, color: .orange, radius: 0.45, seed: 4, kind: .lantern),
                MineLight(x: 0.7, y: 0.6, color: .orange, radius: 0.4, seed: 5, kind: .torch),
            ],
            fogColor: Color.brown, fogDensity: 0.12, emberRate: 4
        ),
        MineLayerLighting(
            layer: "Stone Depths",
            background: [Color(red: 0.16, green: 0.16, blue: 0.2), Color(red: 0.04, green: 0.04, blue: 0.06)],
            lights: [
                MineLight(x: 0.5, y: 0.4, color: Color(red: 0.9, green: 0.95, blue: 1.0), radius: 0.5, seed: 6, kind: .lantern),
                MineLight(x: 0.15, y: 0.8, color: .orange, radius: 0.3, seed: 7, kind: .torch),
                MineLight(x: 0.85, y: 0.8, color: .orange, radius: 0.3, seed: 8, kind: .torch),
            ],
            fogColor: Color.gray, fogDensity: 0.18, emberRate: 5
        ),
        MineLayerLighting(
            layer: "Deepstone",
            background: [Color(red: 0.14, green: 0.1, blue: 0.22), Color(red: 0.02, green: 0.02, blue: 0.05)],
            lights: [
                MineLight(x: 0.25, y: 0.5, color: .blue, radius: 0.4, seed: 9, kind: .lantern),
                MineLight(x: 0.75, y: 0.55, color: .purple, radius: 0.45, seed: 10, kind: .crystal),
            ],
            fogColor: Color.purple, fogDensity: 0.28, emberRate: 6
        ),
        MineLayerLighting(
            layer: "Crystal Hollows",
            background: [Color(red: 0.12, green: 0.08, blue: 0.28), Color(red: 0.03, green: 0.02, blue: 0.1)],
            lights: [
                MineLight(x: 0.2, y: 0.6, color: .purple, radius: 0.5, seed: 11, kind: .crystal),
                MineLight(x: 0.5, y: 0.4, color: .cyan, radius: 0.55, seed: 12, kind: .crystal),
                MineLight(x: 0.8, y: 0.65, color: .pink, radius: 0.5, seed: 13, kind: .crystal),
            ],
            fogColor: Color(red: 0.5, green: 0.3, blue: 0.8), fogDensity: 0.22, emberRate: 10
        ),
        MineLayerLighting(
            layer: "Magma Core",
            background: [Color(red: 0.35, green: 0.08, blue: 0.05), Color(red: 0.08, green: 0.02, blue: 0.02)],
            lights: [
                MineLight(x: 0.5, y: 0.95, color: .orange, radius: 0.9, seed: 14, kind: .lava),
                MineLight(x: 0.2, y: 0.3, color: .red, radius: 0.4, seed: 15, kind: .lava),
                MineLight(x: 0.8, y: 0.3, color: .red, radius: 0.4, seed: 16, kind: .lava),
            ],
            fogColor: Color.red, fogDensity: 0.25, emberRate: 22
        ),
    ]

    static func preset(for layerTitle: String) -> MineLayerLighting {
        all.first(where: { $0.layer == layerTitle }) ?? all[2]
    }
}

// ============================================================
// MARK: - 2. Torch flame (Canvas fire with noise flicker)
// ============================================================

/// Torch stick + Canvas flame: three layered teardrops breathing on
/// deterministic noise, plus rising ember dots. Runs on TimelineView.
struct MineTorchFlame: View {
    var scale: CGFloat = 1.0
    var seed: Double = 1.0

    var body: some View {
        VStack(spacing: 0) {
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    let f = MineFlicker.flame(t, seed: seed)
                    let cx = Double(size.width) / 2
                    let base = Double(size.height)
                    // Outer flame (orange teardrop).
                    let outer = flamePath(
                        cx: cx, base: base,
                        w: 26 * Double(scale) * (0.9 + 0.2 * f),
                        h: 64 * Double(scale) * (0.85 + 0.3 * f),
                        lean: 6 * sin(t * 3 + seed)
                    )
                    context.fill(outer, with: .color(Color(red: 1.0, green: 0.45, blue: 0.1).opacity(0.85)))
                    context.stroke(outer, with: .color(.orange.opacity(0.4)), lineWidth: 1)
                    // Mid flame (yellow).
                    context.fill(
                        flamePath(
                            cx: cx, base: base,
                            w: 16 * Double(scale) * f,
                            h: 42 * Double(scale) * f,
                            lean: 4 * sin(t * 4.2 + seed)
                        ),
                        with: .color(Color(red: 1.0, green: 0.8, blue: 0.25).opacity(0.9))
                    )
                    // Core (near-white).
                    context.fill(
                        flamePath(
                            cx: cx, base: base,
                            w: 8 * Double(scale),
                            h: 22 * Double(scale) * (0.7 + 0.5 * f),
                            lean: 0
                        ),
                        with: .color(Color(white: 0.98).opacity(0.95))
                    )
                    // Embers.
                    for i in 0..<7 {
                        let life = fmod(t * (0.5 + Double(i % 3) * 0.25) + Double(i) * 0.77 + seed, 1.0)
                        let ex = cx + sin(t * 2 + Double(i) * 2.1 + seed) * 10 - life * 14 * sin(seed + Double(i))
                        let ey = base - life * 90 * Double(scale)
                        context.opacity = (1 - life) * 0.9
                        context.fill(
                            Circle().path(in: CGRect(x: ex - 1.5, y: ey - 1.5, width: 3, height: 3)),
                            with: .color(.orange)
                        )
                    }
                }
            }
            .frame(width: 44 * scale, height: 84 * scale)
            // Stick.
            RoundedRectangle(cornerRadius: 3)
                .fill(Color(red: 0.35, green: 0.22, blue: 0.12))
                .frame(width: 7 * scale, height: 44 * scale)
                .offset(y: -4)
        }
    }

    private func flamePath(cx: Double, base: Double, w: Double, h: Double, lean: Double) -> Path {        var p = Path()
        p.move(to: CGPoint(x: cx - w / 2, y: base))
        p.addCurve(
            to: CGPoint(x: cx + lean, y: base - h),
            control1: CGPoint(x: cx - w / 2, y: base - h * 0.55),
            control2: CGPoint(x: cx - w * 0.2 + lean, y: base - h * 0.85)
        )
        p.addCurve(
            to: CGPoint(x: cx + w / 2, y: base),
            control1: CGPoint(x: cx + w * 0.2 + lean, y: base - h * 0.85),
            control2: CGPoint(x: cx + w / 2, y: base - h * 0.55)
        )
        p.closeSubpath()
        return p
    }
}

// ============================================================
// MARK: - 3. Lantern glow (swing + moth orbit)
// ============================================================

/// Hanging lantern: swinging lamp, radial glow falloff, orbiting moth.
struct MineLanternGlow: View {
    var color: Color = .orange
    var seed: Double = 2.0
    @State private var swing = false

    var body: some View {
        ZStack {
            // Glow falloff.
            Circle()
                .fill(
                    RadialGradient(
                        colors: [color.opacity(0.5), .clear],
                        center: .center, startRadius: 6, endRadius: 90
                    )
                )
                .frame(width: 180, height: 180)
                .opacity(swing ? 0.85 : 0.65)
                .animation(
                    .easeInOut(duration: 2.8).repeatForever(autoreverses: true),
                    value: swing
                )
            VStack(spacing: 0) {
                // Chain.
                Rectangle()
                    .fill(Color.gray.opacity(0.8))
                    .frame(width: 2, height: 26)
                // Cage.
                ZStack {
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color.gray, lineWidth: 2)
                        .frame(width: 30, height: 40)
                    RoundedRectangle(cornerRadius: 6)
                        .fill(color.opacity(0.85))
                        .frame(width: 24, height: 34)
                        .shadow(color: color, radius: 12)
                    // Flame dot.
                    Circle()
                        .fill(Color.white)
                        .frame(width: 6, height: 6)
                        .offset(y: swing ? -3 : 3)
                        .animation(
                            .easeInOut(duration: 1.1).repeatForever(autoreverses: true),
                            value: swing
                        )
                }
            }
            .rotationEffect(.degrees(swing ? 7 : -7), anchor: .top)
            .animation(
                .easeInOut(duration: 2.4).repeatForever(autoreverses: true),
                value: swing
            )
            // Moth orbit.
            TimelineView(.animation) { timeline in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let a = MineFlicker.moth(t, seed: seed)
                Ellipse()
                    .fill(Color.white.opacity(0.8))
                    .frame(width: 5, height: 3)
                    .offset(x: cos(a) * 44, y: sin(a * 1.3) * 30 + 10)
            }
            .frame(width: 120, height: 120)
        }
        .onAppear { swing.toggle() }
    }
}

// ============================================================
// MARK: - 4. Lava glow (crust cracks + bubble pops)
// ============================================================

/// Lava bed: pulsing crust plates, glowing cracks, rising bubble pops.
struct MineLavaGlow: View {
    var seed: Double = 3.0

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let pulse = MineFlicker.lava(t, seed: seed)
                let w = Double(size.width), h = Double(size.height)
                // Base gradient.
                context.fill(
                    Path(CGRect(x: 0, y: 0, width: w, height: h)),
                    with: .color(Color(red: 0.55 + 0.25 * pulse, green: 0.12 + 0.08 * pulse, blue: 0.02))
                )
                // Crust plates (dark polygons drifting).
                for i in 0..<9 {
                    let px = fmod(Double(i) * 97.3 + t * (2 + Double(i % 3)), w)
                    let py = fmod(Double(i) * 61.7, h)
                    let s = 18 + Double(i % 4) * 10
                    var plate = Path()
                    plate.move(to: CGPoint(x: px, y: py))
                    plate.addLine(to: CGPoint(x: px + s, y: py + s * 0.3))
                    plate.addLine(to: CGPoint(x: px + s * 0.7, y: py + s))
                    plate.addLine(to: CGPoint(x: px - s * 0.2, y: py + s * 0.6))
                    plate.closeSubpath()
                    context.fill(plate, with: .color(Color(white: 0.06).opacity(0.85)))
                }
                // Cracks glow between plates.
                context.stroke(
                    Path { p in
                        for i in 0..<6 {
                            let y = h * Double(i) / 5 + 8 * sin(t * 1.5 + Double(i))
                            p.move(to: CGPoint(x: 0, y: y))
                            p.addCurve(
                                to: CGPoint(x: w, y: y + 6 * sin(t + Double(i) * 2)),
                                control1: CGPoint(x: w * 0.3, y: y - 10),
                                control2: CGPoint(x: w * 0.7, y: y + 10)
                            )
                        }
                    },
                    with: .color(Color(red: 1.0, green: 0.5 + 0.3 * pulse, blue: 0.1)),
                    lineWidth: 2.5
                )
                // Bubble pops.
                for i in 0..<5 {
                    let life = fmod(t * 0.4 + Double(i) * 0.23 + seed * 0.1, 1.0)
                    let bx = fmod(Double(i) * 173.1 + seed * 31, w)
                    let by = h - life * h * 0.5
                    context.opacity = (1 - life) * 0.9
                    context.stroke(
                        Circle().path(in: CGRect(x: bx - 3 - life * 7, y: by - 3 - life * 7, width: 6 + life * 14, height: 6 + life * 14)),
                        with: .color(.yellow),
                        lineWidth: 2
                    )
                }
            }
        }
    }
}

// ============================================================
// MARK: - 5. Crystal light pools
// ============================================================

/// Colored light pool cast on the floor beneath a crystal growth.
struct MineCrystalPool: View {
    var color: Color
    var seed: Double = 4.0
    @State private var breathe = false

    var body: some View {
        Ellipse()
            .fill(
                RadialGradient(
                    colors: [color.opacity(0.55), color.opacity(0.12), .clear],
                    center: .center, startRadius: 4, endRadius: 70
                )
            )
            .frame(width: 150, height: 56)
            .scaleEffect(x: breathe ? 1.12 : 0.94, y: breathe ? 1.05 : 0.97)
            .opacity(breathe ? 0.95 : 0.6)
            .hueRotation(.degrees(breathe ? 10 : -10))
            .blur(radius: 1)
            .animation(
                .easeInOut(duration: 2 + seed.truncatingRemainder(dividingBy: 2))
                    .repeatForever(autoreverses: true),
                value: breathe
            )
            .onAppear { breathe.toggle() }
    }
}

// ============================================================
// MARK: - 6. Dusty light cones
// ============================================================

/// Slow-rotating dusty cone from a shaft or grate above.
struct MineLightCone: View {
    var color: Color = Color(red: 1.0, green: 0.92, blue: 0.75)
    var seed: Double = 5.0
    @State private var sway = false

    var body: some View {
        ZStack {
            // Cone body.
            MineConeShape()
                .fill(
                    LinearGradient(
                        colors: [color.opacity(0.32), .clear],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: 150, height: 260)
                .blur(radius: 7)
            // Dust motes inside the beam.
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    for i in 0..<16 {
                        let life = fmod(t * 0.25 + Double(i) * 0.13 + seed * 0.05, 1.0)
                        let spread = 20 + life * 55
                        let x = Double(size.width) / 2 + sin(Double(i) * 2.4 + t) * spread * 0.5
                        let y = life * Double(size.height)
                        context.opacity = (1 - life) * 0.7
                        context.fill(
                            Circle().path(in: CGRect(x: x - 1, y: y - 1, width: 2, height: 2)),
                            with: .color(.white)
                        )
                    }
                }
            }
            .frame(width: 150, height: 260)
        }
        .rotationEffect(.degrees(sway ? 3 : -3), anchor: .top)
        .opacity(sway ? 0.95 : 0.7)
        .animation(
            .easeInOut(duration: 5).repeatForever(autoreverses: true),
            value: sway
        )
        .onAppear { sway.toggle() }
    }
}

/// Trapezoid cone shape.
struct MineConeShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.midX - rect.width * 0.12, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.midX + rect.width * 0.12, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.closeSubpath()
        return p
    }
}

// ============================================================
// MARK: - 7. Shadow vignette + warning pulse
// ============================================================

/// Soft shadow vignette that deepens toward the edges.
struct MineVignette: View {
    var strength: Double = 0.55

    var body: some View {
        RadialGradient(
            colors: [.clear, Color.black.opacity(strength)],
            center: .center, startRadius: 60, endRadius: 220
        )
        .allowsHitTesting(false)
    }
}

/// Non-lethal warning pulse (lava proximity): red edge breathing.
/// Pure signal — god-mode means it never means damage.
struct MineWarningPulse: View {
    var active: Bool
    @State private var pulse = false

    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .stroke(Color.red.opacity(pulse && active ? 0.8 : 0.0), lineWidth: 5)
            .scaleEffect(pulse && active ? 1.0 : 0.97)
            .animation(
                active ? .easeInOut(duration: 0.7).repeatForever(autoreverses: true) : .default,
                value: pulse
            )
            .onChange(of: active) { _, new in
                if new { pulse = true } else { pulse = false }
            }
            .allowsHitTesting(false)
    }
}

// ============================================================
// MARK: - 8. Layer lighting rigs (full scenes)
// ============================================================

/// Complete animated lighting rig for one layer: background wash,
/// placed lights with flicker, fog veil and ember drift.
struct MineLayerRig: View {
    var preset: MineLayerLighting

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Background wash.
                LinearGradient(
                    colors: preset.background,
                    startPoint: .top, endPoint: .bottom
                )
                // Placed lights.
                ForEach(preset.lights) { light in
                    rigLight(light, in: geo.size)
                }
                // Fog veil.
                preset.fogColor
                    .opacity(preset.fogDensity)
                    .blur(radius: 24)
                // Ember drift.
                TimelineView(.animation) { timeline in
                    Canvas { context, size in
                        let t = timeline.date.timeIntervalSinceReferenceDate
                        let n = Int(preset.emberRate * 3)
                        for i in 0..<max(1, n) {
                            let life = fmod(t * 0.3 + Double(i) * 0.37, 1.0)
                            let x = fmod(Double(i) * 149.7 + t * 8, Double(size.width))
                            let y = Double(size.height) - life * Double(size.height)
                            context.opacity = (1 - life) * 0.8
                            context.fill(
                                Circle().path(in: CGRect(x: x - 1.5, y: y - 1.5, width: 3, height: 3)),
                                with: .color(.orange)
                            )
                        }
                    }
                }
            }
        }
    }

    private func rigLight(_ light: MineLight, in size: CGSize) -> some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            let glow: Double
            switch light.kind {
            case .torch: glow = MineFlicker.flame(t, seed: light.seed)
            case .lantern: glow = MineFlicker.breathe(t, seed: light.seed)
            case .lava: glow = MineFlicker.lava(t, seed: light.seed)
            case .crystal: glow = MineFlicker.breathe(t, seed: light.seed, period: 4.2)
            case .shaft: glow = 0.85 + 0.15 * sin(t * 0.5 + light.seed)
            case .wisp: glow = MineFlicker.breathe(t, seed: light.seed, period: 1.8)
            }
            Circle()
                .fill(
                    RadialGradient(
                        colors: [light.color.opacity(0.55 * glow + 0.15), .clear],
                        center: .center, startRadius: 4,
                        endRadius: Double(size.width) * light.radius * 0.5
                    )
                )
                .frame(
                    width: size.width * light.radius,
                    height: size.width * light.radius
                )
                .position(x: size.width * light.x, y: size.height * light.y)
        }
    }
}

// ============================================================
// MARK: - 9. Lighting showcase
// ============================================================

/// Lighting lab: every fixture plus all six layer rigs.
struct MineLightingShowcaseView: View {
    @State private var layer = "Crystal Hollows"
    @State private var warn = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🔥 Fixtures").font(.headline)
                        HStack(spacing: 24) {
                            MineTorchFlame(scale: 1.0, seed: 1)
                            MineLanternGlow(seed: 2)
                        }
                        .frame(height: 170)
                        Text("Torch fire: Canvas teardrops on noise flicker. Lantern: swing + moth orbit.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    VStack(spacing: 8) {
                        Text("🌋 Lava bed").font(.headline)
                        MineLavaGlow(seed: 3)
                            .frame(height: 150)
                            .cornerRadius(14)
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🔦 Light cone").font(.headline)
                        ZStack {
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.black)
                                .frame(height: 260)
                            MineLightCone()
                        }
                        .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("💠 Crystal pools").font(.headline)
                        HStack(spacing: 16) {
                            MineCrystalPool(color: .purple, seed: 1)
                            MineCrystalPool(color: .cyan, seed: 2)
                            MineCrystalPool(color: .pink, seed: 3)
                        }
                    }
                    VStack(spacing: 8) {
                        Text("🌑 Vignette + warning").font(.headline)
                        ZStack {
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color(red: 0.2, green: 0.15, blue: 0.2))
                                .frame(height: 150)
                            MineVignette(strength: 0.7)
                            MineWarningPulse(active: warn)
                                .padding(6)
                        }
                        .padding(.horizontal)
                        Toggle("Preview warning pulse", isOn: $warn)
                            .padding(.horizontal, 40)
                    }
                    VStack(spacing: 8) {
                        Text("🌓 Layer rigs").font(.headline)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(MineLayerLightingGuide.all, id: \.layer) { preset in
                                    Button(action: { layer = preset.layer }) {
                                        Text(preset.layer)
                                            .font(.caption.bold())
                                            .padding(.horizontal, 10).padding(.vertical, 6)
                                            .background(layer == preset.layer ? Color.orange : Color.white.opacity(0.1))
                                            .foregroundColor(layer == preset.layer ? .black : .white)
                                            .cornerRadius(8)
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                        MineLayerRig(preset: MineLayerLightingGuide.preset(for: layer))
                            .frame(height: 240)
                            .cornerRadius(14)
                            .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Lighting Lab")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
