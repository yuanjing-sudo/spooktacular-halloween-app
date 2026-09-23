//
//  MineParticles.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Canvas particle engine for the mine: stateless, time-driven emitters
//  (sparks, embers, drips, dust, splashes, confetti, spores, snow, magic,
//  rubble, bubbles, leaves) plus tap bursts, fountains, trails and a
//  showcase. Everything is a pure function of time — no per-frame state,
//  no hitches, 60fps friendly.
//

import SwiftUI

// ============================================================
// MARK: - 1. Particle shapes + emitter presets
// ============================================================

/// Renderable particle shapes.
enum MineParticleShape: String, CaseIterable {
    case circle, square, diamond, streak, star

    /// Path centered on (x, y) with radius r.
    func path(x: Double, y: Double, r: Double, angle: Double = 0) -> Path {
        switch self {
        case .circle:
            return Circle().path(in: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
        case .square:
            var p = Path()
            let c = cos(angle), s = sin(angle)
            let corners = [(-r, -r), (r, -r), (r, r), (-r, r)]
            for (i, (ox, oy)) in corners.enumerated() {
                let px = x + ox * c - oy * s
                let py = y + ox * s + oy * c
                if i == 0 { p.move(to: CGPoint(x: px, y: py)) }
                else { p.addLine(to: CGPoint(x: px, y: py)) }
            }
            p.closeSubpath()
            return p
        case .diamond:
            var p = Path()
            p.move(to: CGPoint(x: x, y: y - r * 1.5))
            p.addLine(to: CGPoint(x: x + r, y: y))
            p.addLine(to: CGPoint(x: x, y: y + r * 1.5))
            p.addLine(to: CGPoint(x: x - r, y: y))
            p.closeSubpath()
            return p
        case .streak:
            var p = Path()
            p.move(to: CGPoint(x: x, y: y - r * 2.2))
            p.addLine(to: CGPoint(x: x + r * 0.45, y: y))
            p.addLine(to: CGPoint(x: x, y: y + r * 2.2))
            p.addLine(to: CGPoint(x: x - r * 0.45, y: y))
            p.closeSubpath()
            return p
        case .star:
            var p = Path()
            for k in 0..<10 {
                let a = Double(k) / 10 * 2 * Double.pi - Double.pi / 2 + angle
                let rr = k % 2 == 0 ? r * 1.6 : r * 0.7
                let px = x + cos(a) * rr
                let py = y + sin(a) * rr
                if k == 0 { p.move(to: CGPoint(x: px, y: py)) }
                else { p.addLine(to: CGPoint(x: px, y: py)) }
            }
            p.closeSubpath()
            return p
        }
    }
}

/// Emitter flow direction.
enum MineEmitterFlow {
    case rise, fall, drift, fountain, implosion
}

/// One emitter preset: colors, shapes, physics, density, area.
struct MineEmitterPreset {
    var name: String
    var emoji: String
    var colors: [Color]
    var shapes: [MineParticleShape]
    var flow: MineEmitterFlow
    var count: Int
    var gravity: Double // px/s² in unit space
    var wind: Double // px/s sideways
    var size: Double // base radius
    var life: Double // seconds per loop
    var twinkle: Bool
    var flavor: String
}

enum MineEmitterGuide {
    static var all: [MineEmitterPreset] = [
        MineEmitterPreset(
            name: "Forge Sparks", emoji: "✨",
            colors: [.yellow, .orange, .white],
            shapes: [.circle, .streak],
            flow: .fountain, count: 48,
            gravity: 320, wind: 12, size: 2.2, life: 1.1, twinkle: false,
            flavor: "Pick strikes throw these. Hot, fast, gone in a blink."
        ),
        MineEmitterPreset(
            name: "Lava Embers", emoji: "🔥",
            colors: [.red, .orange, .yellow],
            shapes: [.circle],
            flow: .rise, count: 40,
            gravity: -60, wind: 8, size: 2.4, life: 3.2, twinkle: true,
            flavor: "The Magma Core breathes these out. Do not inhale. Admire."
        ),
        MineEmitterPreset(
            name: "Cave Drips", emoji: "💧",
            colors: [.cyan, .blue],
            shapes: [.streak],
            flow: .fall, count: 26,
            gravity: 420, wind: 0, size: 2.0, life: 2.4, twinkle: false,
            flavor: "Stalactite metronomes. Each drip is the cave counting time."
        ),
        MineEmitterPreset(
            name: "Tunnel Dust", emoji: "💨",
            colors: [Color(white: 0.7), Color(white: 0.5)],
            shapes: [.circle],
            flow: .drift, count: 44,
            gravity: -8, wind: 22, size: 3.0, life: 6.0, twinkle: false,
            flavor: "Kicked up by boots and blasts. Hangs, drifts, settles on helmets."
        ),
        MineEmitterPreset(
            name: "Gem Splash", emoji: "💎",
            colors: [.cyan, .purple, .pink, .white],
            shapes: [.diamond, .circle],
            flow: .fountain, count: 52,
            gravity: 380, wind: 0, size: 2.6, life: 1.4, twinkle: true,
            flavor: "Crystal harvests explode in these. Profit you can see."
        ),
        MineEmitterPreset(
            name: "Payday Confetti", emoji: "🎉",
            colors: [.green, .yellow, .pink, .cyan, .orange],
            shapes: [.square, .star],
            flow: .fountain, count: 70,
            gravity: 260, wind: 30, size: 3.0, life: 2.2, twinkle: true,
            flavor: "Sell-cart celebrations. The surface throws these at you. Deserved."
        ),
        MineEmitterPreset(
            name: "Wisp Spores", emoji: "🌟",
            colors: [.yellow, .white, .pink],
            shapes: [.circle, .star],
            flow: .drift, count: 36,
            gravity: -25, wind: 14, size: 2.2, life: 5.0, twinkle: true,
            flavor: "Where wisps passed, spores remember. Follow them to friends."
        ),
        MineEmitterPreset(
            name: "Frost Breath", emoji: "❄️",
            colors: [.white, Color(red: 0.8, green: 0.9, blue: 1.0)],
            shapes: [.star, .circle],
            flow: .fall, count: 60,
            gravity: 40, wind: 26, size: 2.4, life: 5.5, twinkle: true,
            flavor: "Cold pockets near the surface exhale these. Winter lives down there too."
        ),
        MineEmitterPreset(
            name: "Arcane Magic", emoji: "🔮",
            colors: [.purple, .cyan, .pink],
            shapes: [.star, .diamond],
            flow: .rise, count: 44,
            gravity: -90, wind: -10, size: 2.6, life: 3.0, twinkle: true,
            flavor: "Spellbook residue. Rebirth ceremonies run on this stuff."
        ),
        MineEmitterPreset(
            name: "Blast Rubble", emoji: "🧱",
            colors: [Color(white: 0.4), Color(white: 0.25), .orange],
            shapes: [.square],
            flow: .fountain, count: 56,
            gravity: 460, wind: 20, size: 3.4, life: 1.6, twinkle: false,
            flavor: "Bombs make these. Helmets are rated for exactly this."
        ),
        MineEmitterPreset(
            name: "Bubble Rise", emoji: "🫧",
            colors: [.cyan, .white],
            shapes: [.circle],
            flow: .rise, count: 30,
            gravity: -120, wind: 6, size: 3.2, life: 4.0, twinkle: false,
            flavor: "Flooded nooks exhale slowly. Pop one for luck (luck not included)."
        ),
        MineEmitterPreset(
            name: "Moss Leaves", emoji: "🍂",
            colors: [.green, Color(red: 0.5, green: 0.7, blue: 0.3), .brown],
            shapes: [.square, .diamond],
            flow: .fall, count: 34,
            gravity: 60, wind: 34, size: 2.8, life: 6.5, twinkle: false,
            flavor: "Upper tunnels grow moss; moss sheds style. Catches the lamplight beautifully."
        ),
        MineEmitterPreset(
            name: "Rainbow Falls", emoji: "🌈",
            colors: [.red, .orange, .yellow, .green, .cyan, .purple],
            shapes: [.circle, .star],
            flow: .fall, count: 56,
            gravity: 200, wind: 12, size: 2.6, life: 3.0, twinkle: true,
            flavor: "Prism runoff after a big refraction. Taste the rainbow; sell the rainbow."
        ),
        MineEmitterPreset(
            name: "Firefly Swarm", emoji: "🪲",
            colors: [.yellow, .green],
            shapes: [.circle],
            flow: .drift, count: 30,
            gravity: -12, wind: 18, size: 2.8, life: 5.0, twinkle: true,
            flavor: "Surface fireflies lost underground years ago. They run the night shift now."
        ),
        MineEmitterPreset(
            name: "Ash Drift", emoji: "🌫️",
            colors: [Color(white: 0.45), Color(white: 0.3)],
            shapes: [.circle, .square],
            flow: .drift, count: 46,
            gravity: 14, wind: 40, size: 3.2, life: 7.0, twinkle: false,
            flavor: "Old campfires never leave; they just become weather."
        ),
        MineEmitterPreset(
            name: "Coin Fountain", emoji: "🪙",
            colors: [.yellow, Color(red: 0.9, green: 0.7, blue: 0.2)],
            shapes: [.circle, .diamond],
            flow: .fountain, count: 60,
            gravity: 340, wind: 0, size: 2.8, life: 1.8, twinkle: true,
            flavor: "Jackpot weather in a bottle. Shake well before payday."
        ),
        MineEmitterPreset(
            name: "Heart Pops", emoji: "💖",
            colors: [.pink, .red, .white],
            shapes: [.circle, .star],
            flow: .rise, count: 28,
            gravity: -70, wind: 0, size: 2.6, life: 2.6, twinkle: true,
            flavor: "Boxy affection made visible. Critters emit these. Science confirms."
        ),
        MineEmitterPreset(
            name: "Lightning Bugs", emoji: "⚡",
            colors: [.yellow, .white],
            shapes: [.streak, .circle],
            flow: .drift, count: 26,
            gravity: -20, wind: 44, size: 2.2, life: 2.2, twinkle: true,
            flavor: "Fast, bright, gone. Like your weekend, but prettier."
        ),
        MineEmitterPreset(
            name: "Oil Bubbles", emoji: "🫧",
            colors: [Color(red: 0.3, green: 0.25, blue: 0.5), .purple],
            shapes: [.circle],
            flow: .rise, count: 32,
            gravity: -100, wind: 4, size: 3.6, life: 4.5, twinkle: false,
            flavor: "Deep seep bubbles. Iridescent, slow, faintly judgmental."
        ),
        MineEmitterPreset(
            name: "Crystal Snow", emoji: "🔮",
            colors: [.cyan, .white, .purple],
            shapes: [.diamond, .star],
            flow: .fall, count: 54,
            gravity: 50, wind: 20, size: 2.4, life: 5.5, twinkle: true,
            flavor: "The Hollows snow upward crystal dust. Catch some on your tongue (rich)."
        ),
        MineEmitterPreset(
            name: "Pick Chips", emoji: "🪨",
            colors: [Color(white: 0.55), Color(white: 0.35), .orange],
            shapes: [.square],
            flow: .fountain, count: 44,
            gravity: 420, wind: 10, size: 2.8, life: 1.2, twinkle: false,
            flavor: "Every swing chips these. The floor is 2% former wall by volume."
        ),
        MineEmitterPreset(
            name: "Lantern Moths", emoji: "🦋",
            colors: [.yellow, .white],
            shapes: [.circle],
            flow: .drift, count: 20,
            gravity: -8, wind: 22, size: 2.2, life: 4.0, twinkle: true,
            flavor: "Drawn to every flame, loyal to none. The mine's tiniest commuters."
        ),
        MineEmitterPreset(
            name: "Void Wisps", emoji: "🌌",
            colors: [.purple, .blue, .black],
            shapes: [.circle, .star],
            flow: .rise, count: 30,
            gravity: -50, wind: -14, size: 2.6, life: 4.5, twinkle: true,
            flavor: "Reality-thin spots leak these. Collect seven for a wish (unverified)."
        ),
        MineEmitterPreset(
            name: "Honey Drops", emoji: "🍯",
            colors: [.yellow, .orange],
            shapes: [.circle],
            flow: .fall, count: 24,
            gravity: 180, wind: 0, size: 3.0, life: 3.0, twinkle: false,
            flavor: "Somewhere upstairs keeps bees. The mine keeps the drips. Fair trade."
        ),
    ]
}

// ============================================================
// MARK: - 2. Stateless field view (pure function of time)
// ============================================================

/// Particle field: every mote's position is f(time) — zero per-frame
/// state, zero hitches. Seed offsets decorrelate identical emitters.
struct MineParticleField: View {
    var preset: MineEmitterPreset
    var seed: Double = 0
    var speed: Double = 1.0

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate * speed
                let w = Double(size.width), h = Double(size.height)
                for i in 0..<preset.count {
                    let p = mote(i: i, t: t, w: w, h: h)
                    context.opacity = p.opacity
                    context.fill(
                        preset.shapes[i % preset.shapes.count]
                            .path(x: p.x, y: p.y, r: p.r, angle: p.spin),
                        with: .color(preset.colors[i % preset.colors.count])
                    )
                }
            }
        }
        .allowsHitTesting(false)
    }

    private struct Mote {
        var x: Double
        var y: Double
        var r: Double
        var opacity: Double
        var spin: Double
    }

    private func mote(i: Int, t: Double, w: Double, h: Double) -> Mote {
        // Decorrelated pseudo-randoms from the index + seed.
        let a = Double(i) * 12.9898 + seed * 78.233
        let b = Double(i) * 78.233 + seed * 12.9898
        let f1 = fract(sin(a) * 43758.5453)
        let f2 = fract(sin(b) * 24634.6345)
        let f3 = fract(sin(a + b) * 56445.2345)
        let life = fmod(t / preset.life + f1, 1.0)
        let r = preset.size * (0.6 + 0.8 * f3)
        let spin = t * (1 + f2 * 3) + f1 * 6.28
        var alpha = 1.0 - life
        if preset.twinkle {
            alpha *= 0.35 + 0.65 * abs(sin(t * 3 + f1 * 20))
        }
        // Fade in fast, out slow.
        alpha *= min(1, life * 8)
        switch preset.flow {
        case .fall:
            let x = fmod(f1 * w + t * preset.wind * 0.3, w)
            let y = fmod(f2 * h + life * life * h * 1.2, h + 40) - 20
            return Mote(x: x, y: y, r: r, opacity: alpha * 0.9, spin: spin)
        case .rise:
            let x = fmod(f1 * w + sin(t + f2 * 9) * 14, w)
            let y = h - fmod(f2 * h + life * h * 1.1, h + 40) + 20
            return Mote(x: x, y: y, r: r, opacity: alpha * 0.9, spin: spin)
        case .drift:
            let x = fmod(f1 * w + t * preset.wind, w)
            let y = fmod(f2 * h + sin(t * 0.7 + f1 * 9) * 18, h)
            return Mote(x: x, y: y, r: r, opacity: alpha * 0.55, spin: spin)
        case .fountain:
            // Looping radial burst from bottom-center with gravity arc.
            let ang = f1 * 2 * Double.pi
            let power = (0.4 + 0.6 * f2) * h * 0.55
            let px = w / 2 + cos(ang) * power * life
            let rise = power * life - preset.gravity * 0.0016 * life * life * h
            let py = h * 0.98 - rise
            let y = max(-10, min(h + 10, py))
            return Mote(x: px, y: y, r: r * (1 - life * 0.5), opacity: alpha, spin: spin)
        case .implosion:
            let ang = f1 * 2 * Double.pi
            let rad = h * 0.45 * (1 - life)
            let x = w / 2 + cos(ang + t * 0.5) * rad
            let y = h / 2 + sin(ang + t * 0.5) * rad * 0.7
            return Mote(x: x, y: y, r: r, opacity: alpha, spin: spin)
        }
    }

    private func fract(_ x: Double) -> Double {
        x - floor(x)
    }
}

// ============================================================
// MARK: - 3. Tap bursts (state-driven, one-shot)
// ============================================================

/// Generic one-shot burst: tap to fire N shards of a preset outward.
struct MineTapBurst: View {
    var preset: MineEmitterPreset
    var count = 14
    @State private var firing = false
    @State private var visible = false

    var body: some View {
        ZStack {
            ForEach(0..<count, id: \.self) { i in
                burstShard(i)
            }
        }
        .opacity(visible ? 1 : 0)
        .onTapGesture { fire() }
    }

    func fire() {
        visible = true
        firing = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.03) {
            firing = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) {
            visible = false
        }
    }

    private func burstShard(_ i: Int) -> some View {
        let shape = preset.shapes[i % preset.shapes.count]
        let color = preset.colors[i % preset.colors.count]
        let angle = Double(i) / Double(count) * 2 * Double.pi
        let dist = 46 + Double(i % 4) * 16
        return shapeView(shape: shape, color: color)
            .offset(x: firing ? cos(angle) * dist : 0,
                    y: firing ? sin(angle) * dist + 18 : 0)
            .opacity(firing ? 0 : 1)
            .scaleEffect(firing ? 0.35 : 1.0)
            .rotationEffect(.degrees(firing ? Double(i) * 24 : 0))
            .animation(
                .spring(response: 0.55, dampingFraction: 0.62)
                    .delay(Double(i) * 0.012),
                value: firing
            )
    }

    private func shapeView(shape: MineParticleShape, color: Color) -> some View {
        Group {
            switch shape {
            case .circle: Circle().fill(color).frame(width: 10, height: 10)
            case .square: Rectangle().fill(color).frame(width: 9, height: 9)
            case .diamond: MineTapDiamond().fill(color).frame(width: 12, height: 16)
            case .streak: Capsule().fill(color).frame(width: 4, height: 16)
            case .star: Text("✨").font(.body)
            }
        }
    }
}

/// Diamond shape helper for bursts.
struct MineTapDiamond: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.midX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
        p.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.midY))
        p.closeSubpath()
        return p
    }
}

// ============================================================
// MARK: - 4. Fountains + trails + rain sheets
// ============================================================

/// Celebration fountain (sell/rebirth/legendary moments): looping plume
/// with a glowing basin.
struct MineFountainView: View {
    var preset: MineEmitterPreset
    var active: Bool
    @State private var glow = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Basin glow.
            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [preset.colors.first?.opacity(0.6) ?? .yellow, .clear],
                        center: .center, startRadius: 6, endRadius: 90
                    )
                )
                .frame(width: 180, height: 60)
                .opacity(glow && active ? 1 : 0.3)
                .animation(
                    .easeInOut(duration: 1.2).repeatForever(autoreverses: true),
                    value: glow
                )
            MineParticleField(preset: preset, speed: 1.4)
                .frame(height: 220)
                .opacity(active ? 1 : 0)
                .animation(.easeInOut(duration: 0.6), value: active)
        }
        .frame(height: 240)
        .onAppear { glow.toggle() }
    }
}

/// Comet trail: a bright head with a fading ribbon tail.
struct MineCometTrail: View {
    var color: Color = .cyan
    @State private var fly = false

    var body: some View {
        ZStack {
            // Ribbon.
            Capsule()
                .fill(
                    LinearGradient(
                        colors: [color.opacity(0.7), .clear],
                        startPoint: .leading, endPoint: .trailing
                    )
                )
                .frame(width: fly ? 150 : 40, height: 10)
                .offset(x: fly ? -60 : 30)
                .blur(radius: 2)
                .animation(
                    .easeInOut(duration: 1.6).repeatForever(autoreverses: true),
                    value: fly
                )
            // Head.
            Circle()
                .fill(Color.white)
                .frame(width: 16, height: 16)
                .shadow(color: color, radius: 10)
                .offset(x: fly ? 20 : -80)
                .animation(
                    .easeInOut(duration: 1.6).repeatForever(autoreverses: true),
                    value: fly
                )
            // Sparkle wake.
            ForEach(0..<5, id: \.self) { i in
                Circle()
                    .fill(color)
                    .frame(width: 5, height: 5)
                    .offset(
                        x: fly ? -20 - CGFloat(i) * 18 : 40,
                        y: sin(Double(i) * 1.3) * 10
                    )
                    .opacity(fly ? 0.8 : 0.2)
                    .animation(
                        .easeInOut(duration: 1.6).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.08),
                        value: fly
                    )
            }
        }
        .frame(width: 220, height: 60)
        .onAppear { fly.toggle() }
    }
}

// ============================================================
// MARK: - 5. Particle showcase
// ============================================================

/// Particle lab: every emitter preset live, plus bursts + fountains.
struct MineParticleShowcaseView: View {
    @State private var fountain = true
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    Text("Tap any burst card to fire it.")
                        .font(.caption).foregroundStyle(.secondary)
                    // Live fields grid.
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ForEach(MineEmitterGuide.all, id: \.name) { preset in
                            VStack(spacing: 6) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.black)
                                        .frame(height: 130)
                                    MineParticleField(preset: preset)
                                }
                                Text("\(preset.emoji) \(preset.name)")
                                    .font(.caption.bold())
                                Text(preset.flavor)
                                    .font(.caption2).foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                                    .frame(height: 44)
                            }
                            .padding(8)
                            .background(Color(.secondarySystemBackground))
                            .cornerRadius(14)
                        }
                    }
                    .padding(.horizontal)
                    // Bursts.
                    VStack(spacing: 10) {
                        Text("Tap bursts").font(.headline)
                        HStack(spacing: 20) {
                            burstCard(preset: MineEmitterGuide.all[4], label: "Gems")
                            burstCard(preset: MineEmitterGuide.all[5], label: "Payday")
                            burstCard(preset: MineEmitterGuide.all[0], label: "Sparks")
                        }
                    }
                    // Fountain + comet.
                    VStack(spacing: 10) {
                        Text("Fountain + comet").font(.headline)
                        MineFountainView(preset: MineEmitterGuide.all[5], active: fountain)
                        Toggle("Fountain on", isOn: $fountain)
                            .padding(.horizontal, 60)
                        MineCometTrail(color: .cyan)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Particle Lab")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func burstCard(preset: MineEmitterPreset, label: String) -> some View {
        VStack {
            MineTapBurst(preset: preset)
                .frame(width: 90, height: 90)
                .background(Circle().fill(Color.black))
            Text(label).font(.caption)
        }
    }
}
