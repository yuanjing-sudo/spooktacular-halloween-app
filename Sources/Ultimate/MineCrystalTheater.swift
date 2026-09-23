//
//  MineCrystalTheater.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Crystal animation theater for the Abandoned Mine: high-resolution,
//  from-scratch SwiftUI animations for the special crystals growing in the
//  numerous caves — square cubes, triangle spikes, sphere orbs — plus
//  locked-cave doors with mineral redemption, unlock sequences, harvest
//  bursts, shimmer fields and a full showcase gallery.
//
//  Built on declarative modifiers (.scaleEffect, .opacity, .rotation3D,
//  .hueRotation, .blur) and PhaseAnimator. Pure view layer.
//

import SwiftUI

// ============================================================
// MARK: - 1. Theater models
// ============================================================

/// Animation phases for a single crystal growth.
enum MineCrystalAnimPhase: CaseIterable {
    case dormant, shimmer, surge, sparkling
}

/// Lock-door styles for sealed caves.
enum MineDoorStyle: String, CaseIterable {
    case stoneSlab = "Stone Slab"
    case runeGate = "Rune Gate"
    case crystalSeal = "Crystal Seal"
    case timberBarricade = "Timber Barricade"
    case magmaGrate = "Magma Grate"

    var emoji: String {
        switch self {
        case .stoneSlab: return "🪨"
        case .runeGate: return "ᚱ"
        case .crystalSeal: return "🔮"
        case .timberBarricade: return "🪵"
        case .magmaGrate: return "🔥"
        }
    }

    var tint: Color {
        switch self {
        case .stoneSlab: return Color(red: 0.45, green: 0.45, blue: 0.5)
        case .runeGate: return Color(red: 0.4, green: 0.3, blue: 0.9)
        case .crystalSeal: return Color(red: 0.3, green: 0.8, blue: 0.95)
        case .timberBarricade: return Color(red: 0.55, green: 0.36, blue: 0.2)
        case .magmaGrate: return Color(red: 1.0, green: 0.4, blue: 0.1)
        }
    }

    var flavor: String {
        switch self {
        case .stoneSlab: return "A granite promise. Heavy, honest, openable."
        case .runeGate: return "Old words, older locks. Minerals translate."
        case .crystalSeal: return "The cave sealed itself in glass. Flattering. Expensive."
        case .timberBarricade: return "Somebody boarded this up in a hurry. Somebody was right."
        case .magmaGrate: return "Warm to the touch. The lock is the least hot thing here."
        }
    }
}

/// Unlock sequence phases for the redemption ceremony.
enum MineUnlockPhase: CaseIterable {
    case sealed, offering, turning, flashing, open
}

/// Harvest burst phases for a mined growth.
enum MineHarvestPhase: CaseIterable {
    case whole, cracking, bursting, gone
}

// ============================================================
// MARK: - 2. Animated cube crystals (square growths)
// ============================================================

/// Square cube crystal: slow 3D tumble + glow breathing + facet glints.
struct MineAnimatedCube: View {
    var color: Color = Color(red: 0.6, green: 0.3, blue: 0.95)
    var size: CGFloat = 64
    var locked: Bool = false
    @State private var alive = false

    var body: some View {
        ZStack {
            // Halo.
            RoundedRectangle(cornerRadius: 14)
                .fill(
                    RadialGradient(
                        colors: [color.opacity(locked ? 0.15 : 0.5), .clear],
                        center: .center, startRadius: 8, endRadius: size
                    )
                )
                .frame(width: size * 1.9, height: size * 1.9)
                .opacity(alive ? 0.9 : 0.55)
                .animation(
                    .easeInOut(duration: 2.2).repeatForever(autoreverses: true),
                    value: alive
                )
            // Body with 3D tumble.
            RoundedRectangle(cornerRadius: size * 0.12)
                .fill(
                    LinearGradient(
                        colors: [
                            (locked ? Color.gray : Color.white).opacity(0.85),
                            color,
                            color.opacity(0.6),
                        ],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .rotation3DEffect(
                    .degrees(alive ? 18 : -18),
                    axis: (x: 0.6, y: 1.0, z: 0.0)
                )
                .animation(
                    .easeInOut(duration: 3.4).repeatForever(autoreverses: true),
                    value: alive
                )
                .saturation(locked ? 0.1 : 1.2)
            // Facet glint sweep.
            RoundedRectangle(cornerRadius: size * 0.12)
                .fill(
                    LinearGradient(
                        colors: [.clear, .white.opacity(0.75), .clear],
                        startPoint: alive ? .topLeading : .bottomTrailing,
                        endPoint: alive ? .bottomTrailing : .topLeading
                    )
                )
                .frame(width: size, height: size)
                .opacity(alive ? 0.85 : 0.15)
                .animation(
                    .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                    value: alive
                )
                .rotation3DEffect(
                    .degrees(alive ? 18 : -18),
                    axis: (x: 0.6, y: 1.0, z: 0.0)
                )
                .animation(
                    .easeInOut(duration: 3.4).repeatForever(autoreverses: true),
                    value: alive
                )
            if locked {
                Image(systemName: "lock.fill")
                    .foregroundColor(.white.opacity(0.9))
                    .font(.system(size: size * 0.3, weight: .bold))
            }
        }
        .scaleEffect(alive ? 1.05 : 0.96)
        .animation(
            .easeInOut(duration: 2.6).repeatForever(autoreverses: true),
            value: alive
        )
        .onAppear { alive.toggle() }
    }
}

/// Cube cluster: grid of small cubes with staggered pulses.
struct MineCubeCluster: View {
    var color: Color = Color(red: 0.6, green: 0.3, blue: 0.95)
    var locked: Bool = false
    @State private var tick = false

    var body: some View {
        VStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { row in
                HStack(spacing: 6) {
                    ForEach(0..<3, id: \.self) { col in
                        MineAnimatedCube(
                            color: color,
                            size: 30 + CGFloat((row + col) % 2) * 8,
                            locked: locked
                        )
                        .scaleEffect(tick ? 1.0 : 0.92)
                        .animation(
                            .spring(response: 0.5, dampingFraction: 0.6)
                                .delay(Double(row + col) * 0.09),
                            value: tick
                        )
                    }
                }
            }
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 2.4, repeats: true) { _ in
                tick.toggle()
            }
        }
    }
}

// ============================================================
// MARK: - 3. Animated spike crystals (triangle growths)
// ============================================================

/// Triangle spike: skew shimmer + height pulse + tip glow.
struct MineAnimatedSpike: View {
    var color: Color = Color(red: 0.3, green: 0.8, blue: 0.9)
    var height: CGFloat = 90
    var locked: Bool = false
    @State private var alive = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Ground glow.
            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [color.opacity(locked ? 0.1 : 0.45), .clear],
                        center: .center, startRadius: 4, endRadius: height * 0.5
                    )
                )
                .frame(width: height, height: height * 0.3)
                .offset(y: height * 0.12)
                .opacity(alive ? 0.9 : 0.5)
                .animation(
                    .easeInOut(duration: 1.9).repeatForever(autoreverses: true),
                    value: alive
                )
            // Spike body (triangle via mask).
            Triangle()
                .fill(
                    LinearGradient(
                        colors: [
                            (locked ? Color.gray : Color.white).opacity(0.9),
                            color,
                            color.opacity(0.55),
                        ],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: height * 0.55, height: height)
                .scaleEffect(y: alive ? 1.06 : 0.95, anchor: .bottom)
                .animation(
                    .spring(response: 0.9, dampingFraction: 0.55),
                    value: alive
                )
                .hueRotation(.degrees(alive ? 14 : -14))
                .animation(
                    .easeInOut(duration: 2.6).repeatForever(autoreverses: true),
                    value: alive
                )
                .saturation(locked ? 0.1 : 1.25)
            // Hot tip.
            Circle()
                .fill(Color.white)
                .frame(width: 10, height: 10)
                .blur(radius: 1)
                .offset(y: -height - 4)
                .opacity(alive ? 1 : 0.35)
                .scaleEffect(alive ? 1.3 : 0.8)
                .animation(
                    .easeInOut(duration: 1.4).repeatForever(autoreverses: true),
                    value: alive
                )
            if locked {
                Image(systemName: "lock.fill")
                    .foregroundColor(.white.opacity(0.9))
                    .offset(y: -height * 0.4)
            }
        }
        .rotationEffect(.degrees(alive ? 1.5 : -1.5), anchor: .bottom)
        .animation(
            .easeInOut(duration: 3.2).repeatForever(autoreverses: true),
            value: alive
        )
        .onAppear { alive.toggle() }
    }
}

/// Triangle shape helper.
struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

/// Stalactite + stalagmite pair framing a cave mouth.
struct MineSpikePair: View {
    var color: Color = Color(red: 0.3, green: 0.8, blue: 0.9)
    var locked: Bool = false

    var body: some View {
        HStack(spacing: 24) {
            MineAnimatedSpike(color: color, height: 70, locked: locked)
            MineAnimatedSpike(color: color, height: 110, locked: locked)
                .rotationEffect(.degrees(180))
                .offset(y: 10)
            MineAnimatedSpike(color: color, height: 84, locked: locked)
        }
    }
}

// ============================================================
// MARK: - 4. Animated orb crystals (sphere growths)
// ============================================================

/// Sphere orb: levitation + halo rings + inner core pulse + orbit spark.
struct MineAnimatedOrb: View {
    var color: Color = Color(red: 0.9, green: 0.6, blue: 1.0)
    var size: CGFloat = 64
    var locked: Bool = false
    @State private var alive = false
    @State private var orbit = false

    var body: some View {
        ZStack {
            // Halo rings.
            ForEach(0..<2, id: \.self) { i in
                Circle()
                    .stroke(color.opacity(locked ? 0.08 : 0.4), lineWidth: 2)
                    .frame(
                        width: size * (alive ? 1.5 + CGFloat(i) * 0.25 : 1.2 + CGFloat(i) * 0.25),
                        height: size * (alive ? 1.5 + CGFloat(i) * 0.25 : 1.2 + CGFloat(i) * 0.25)
                    )
                    .opacity(alive ? 0.7 : 0.3)
                    .animation(
                        .easeInOut(duration: 2.0 + Double(i) * 0.5)
                            .repeatForever(autoreverses: true),
                        value: alive
                    )
            }
            // Glass sphere.
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            .white.opacity(locked ? 0.4 : 0.9),
                            color.opacity(locked ? 0.25 : 0.75),
                            color.opacity(0.25),
                        ],
                        center: UnitPoint(x: 0.35, y: 0.3),
                        startRadius: 2, endRadius: size * 0.6
                    )
                )
                .frame(width: size, height: size)
                .saturation(locked ? 0.1 : 1.3)
            // Inner core.
            Circle()
                .fill(Color.white)
                .frame(width: size * 0.28, height: size * 0.28)
                .blur(radius: 2)
                .scaleEffect(alive ? 1.35 : 0.8)
                .opacity(alive ? 1 : 0.6)
                .animation(
                    .easeInOut(duration: 1.5).repeatForever(autoreverses: true),
                    value: alive
                )
            // Orbiting spark.
            Circle()
                .fill(Color.white)
                .frame(width: 7, height: 7)
                .shadow(color: color, radius: 6)
                .offset(y: -size * 0.75)
                .rotationEffect(.degrees(orbit ? 360 : 0))
                .animation(
                    .linear(duration: locked ? 9 : 4).repeatForever(autoreverses: false),
                    value: orbit
                )
            if locked {
                Image(systemName: "lock.fill")
                    .foregroundColor(.white.opacity(0.9))
                    .font(.system(size: size * 0.26, weight: .bold))
            }
        }
        .offset(y: alive ? -10 : 10)
        .animation(
            .easeInOut(duration: 2.2).repeatForever(autoreverses: true),
            value: alive
        )
        .onAppear {
            alive.toggle()
            orbit.toggle()
        }
    }
}

/// Orb constellation: ring of orbs around a grand center orb.
struct MineOrbConstellation: View {
    var color: Color = Color(red: 0.9, green: 0.6, blue: 1.0)
    var locked: Bool = false
    @State private var spin = false

    var body: some View {
        ZStack {
            ForEach(0..<6, id: \.self) { i in
                MineAnimatedOrb(color: color, size: 30, locked: locked)
                    .offset(y: -78)
                    .rotationEffect(.degrees(Double(i) * 60))
            }
            MineAnimatedOrb(color: color, size: 64, locked: locked)
        }
        .rotationEffect(.degrees(spin ? 360 : 0))
        .animation(
            .linear(duration: 40).repeatForever(autoreverses: false),
            value: spin
        )
        .onAppear { spin.toggle() }
    }
}

// ============================================================
// MARK: - 5. Shimmer fields + light shafts (ambient beds)
// ============================================================

/// Cave sparkle field: twinkling diamond motes on a Canvas timeline.
struct MineCaveShimmer: View {
    var colors: [Color] = [.purple, .cyan, .white, .pink]
    var moteCount = 60

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                for i in 0..<moteCount {
                    let px = fmod(Double(i) * 211.7 + t * 6, Double(size.width))
                    var py = fmod(Double(i) * 157.3 - t * 4, Double(size.height))
                    if py < 0 { py += Double(size.height) }
                    let tw = 0.2 + 0.8 * abs(sin(t * 1.4 + Double(i) * 0.7))
                    let r = 1.0 + Double(i % 3) * 0.8
                    context.opacity = tw * 0.85
                    // Diamond spark: rotated square.
                    var path = Path()
                    let c = CGPoint(x: px, y: py)
                    path.move(to: CGPoint(x: c.x, y: c.y - r * 1.6))
                    path.addLine(to: CGPoint(x: c.x + r, y: c.y))
                    path.addLine(to: CGPoint(x: c.x, y: c.y + r * 1.6))
                    path.addLine(to: CGPoint(x: c.x - r, y: c.y))
                    path.closeSubpath()
                    context.fill(path, with: .color(colors[i % colors.count]))
                }
            }
        }
        .allowsHitTesting(false)
    }
}

/// God-ray light shafts slanting through a cave mouth.
struct MineLightShafts: View {
    var color: Color = Color(red: 1.0, green: 0.9, blue: 0.7)
    @State private var sway = false

    var body: some View {
        HStack(spacing: 26) {
            ForEach(0..<4, id: \.self) { i in
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [color.opacity(0.28), .clear],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .frame(width: 26 - CGFloat(i) * 4, height: 220)
                    .blur(radius: 6)
                    .rotationEffect(.degrees(sway ? 4 : -4))
                    .opacity(sway ? 0.9 : 0.55)
                    .animation(
                        .easeInOut(duration: 4 + Double(i))
                            .repeatForever(autoreverses: true),
                        value: sway
                    )
            }
        }
        .rotationEffect(.degrees(12))
        .onAppear { sway.toggle() }
    }
}

// ============================================================
// MARK: - 6. Locked cave doors (5 styles, mineral costs)
// ============================================================

/// A sealed cave door: style body + rune lock + cost chips + deny shake.
/// Tapping without funds shakes and flashes; the panel handles redemption.
struct MineLockedDoor: View {
    var style: MineDoorStyle
    var costs: [(emoji: String, have: Int, need: Int)]
    var affordable: Bool
    var onKnock: () -> Void
    @State private var deny = false
    @State private var breathe = false

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                doorBody
                // Rune lock medallion.
                ZStack {
                    Circle()
                        .fill(Color.black.opacity(0.55))
                        .frame(width: 64, height: 64)
                    Circle()
                        .stroke(style.tint, lineWidth: 3)
                        .frame(width: 64, height: 64)
                        .opacity(breathe ? 1 : 0.5)
                        .scaleEffect(breathe ? 1.06 : 0.96)
                        .animation(
                            .easeInOut(duration: 1.6).repeatForever(autoreverses: true),
                            value: breathe
                        )
                    Text(style.emoji)
                        .font(.system(size: 28))
                    Image(systemName: "lock.fill")
                        .foregroundColor(.white)
                        .font(.caption.bold())
                        .offset(y: 20)
                }
                .offset(x: deny ? 8 : 0)
                .animation(
                    .spring(response: 0.2, dampingFraction: 0.2),
                    value: deny
                )
            }
            .frame(height: 190)
            .onTapGesture {
                if affordable {
                    onKnock()
                } else {
                    deny = true
                    SpookyHaptics.play(.error)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        deny = false
                    }
                }
            }
            Text(style.rawValue)
                .font(.headline)
            Text(style.flavor)
                .font(.caption).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            // Mineral cost chips.
            HStack(spacing: 8) {
                ForEach(costs.indices, id: \.self) { i in
                    let c = costs[i]
                    HStack(spacing: 4) {
                        Text(c.emoji)
                        Text("\(min(c.have, c.need))/\(c.need)")
                            .font(.caption.bold())
                            .monospacedDigit()
                    }
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background((c.have >= c.need ? Color.green : Color.red).opacity(0.25))
                    .foregroundColor(c.have >= c.need ? .green : .red)
                    .cornerRadius(8)
                }
            }
            Text(affordable ? "Tap the seal to redeem & open" : "Keep digging — the seal counts your minerals")
                .font(.caption2).foregroundStyle(.secondary)
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
        .onAppear { breathe.toggle() }
    }

    /// Style body behind the medallion.
    @ViewBuilder
    private var doorBody: some View {
        switch style {
        case .stoneSlab:
            RoundedRectangle(cornerRadius: 18)
                .fill(
                    LinearGradient(
                        colors: [Color.gray, Color(red: 0.3, green: 0.3, blue: 0.35)],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: 150, height: 180)
                .overlay(
                    VStack(spacing: 26) {
                        Rectangle().fill(Color.black.opacity(0.35)).frame(height: 3)
                        Rectangle().fill(Color.black.opacity(0.35)).frame(height: 3)
                        Rectangle().fill(Color.black.opacity(0.35)).frame(height: 3)
                    }
                    .padding(.horizontal, 22)
                )
        case .runeGate:
            RoundedRectangle(cornerRadius: 70)
                .fill(Color(red: 0.12, green: 0.1, blue: 0.25))
                .frame(width: 150, height: 180)
                .overlay(
                    RoundedRectangle(cornerRadius: 70)
                        .stroke(style.tint.opacity(0.8), lineWidth: 3)
                )
                .overlay(
                    Text("ᚱᚦᚨᛚ")
                        .foregroundColor(style.tint.opacity(0.7))
                        .font(.headline)
                        .rotationEffect(.degrees(90))
                )
        case .crystalSeal:
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color(red: 0.1, green: 0.2, blue: 0.3).opacity(0.85))
                    .frame(width: 150, height: 180)
                MineAnimatedOrb(color: .cyan, size: 44, locked: true)
                    .offset(y: -40)
                MineAnimatedCube(color: .purple, size: 34, locked: true)
                    .offset(y: 44)
            }
        case .timberBarricade:
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.black.opacity(0.5))
                    .frame(width: 150, height: 180)
                VStack(spacing: 10) {
                    ForEach(0..<4, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(
                                LinearGradient(
                                    colors: [Color(red: 0.6, green: 0.42, blue: 0.24), Color(red: 0.4, green: 0.26, blue: 0.14)],
                                    startPoint: .leading, endPoint: .trailing
                                )
                            )
                            .frame(width: 150, height: 22)
                            .rotationEffect(.degrees(i % 2 == 0 ? 6 : -6))
                    }
                }
            }
        case .magmaGrate:
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color.black)
                    .frame(width: 150, height: 180)
                VStack(spacing: 12) {
                    ForEach(0..<5, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 3)
                            .fill(
                                LinearGradient(
                                    colors: [.red, .orange, .red],
                                    startPoint: .leading, endPoint: .trailing
                                )
                            )
                            .frame(width: 130, height: 10)
                            .shadow(color: .orange, radius: 6)
                    }
                }
            }
        }
    }
}

// ============================================================
// MARK: - 7. Unlock ceremony + harvest burst
// ============================================================

/// Redemption ceremony: sealed → offering → turning → flashing → open.
/// Fire by toggling `play`; calls `done()` at the finale.
struct MineUnlockCeremony: View {
    var style: MineDoorStyle
    var play: Bool
    var done: () -> Void

    enum CeremonyPhase: CaseIterable {
        case sealed, offering, turning, flashing, open
    }

    var body: some View {
        PhaseAnimator(CeremonyPhase.allCases, trigger: play) { phase in
            ZStack {
                // Door dissolving out.
                MineLockedDoor(
                    style: style,
                    costs: [],
                    affordable: true,
                    onKnock: {}
                )
                .scaleEffect(phase == .open ? 1.25 : 1.0)
                .opacity(phase == .open ? 0 : 1)
                .blur(radius: phase == .flashing ? 6 : 0)
                .saturation(phase == .sealed ? 0.4 : 1.2)
                // Offering glow.
                Circle()
                    .fill(Color.yellow.opacity(phase == .offering || phase == .turning ? 0.5 : 0))
                    .frame(width: 200, height: 200)
                    .blur(radius: 20)
                // Flash.
                Color.white
                    .opacity(phase == .flashing ? 0.85 : 0)
                    .cornerRadius(16)
                // Opened reveal.
                if phase == .open {
                    VStack(spacing: 8) {
                        Text("🔓").font(.system(size: 64))
                        Text("CAVE OPEN!")
                            .font(.title.bold())
                            .foregroundColor(.green)
                    }
                    .scaleEffect(1.0)
                    .transition(.scale.combined(with: .opacity))
                }
            }
            .rotationEffect(.degrees(phase == .turning ? 3 : 0))
        } animation: { phase in
            switch phase {
            case .sealed: .easeInOut(duration: 0.5)
            case .offering: .spring(response: 0.6, dampingFraction: 0.6)
            case .turning: .spring(response: 0.4, dampingFraction: 0.5)
            case .flashing: .easeOut(duration: 0.35)
            case .open: .spring(response: 0.5, dampingFraction: 0.55)
            }
        }
        .onChange(of: play) { _, new in
            if new {
                SpookyHaptics.play(.reward)
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) {
                    done()
                }
            }
        }
    }
}

/// Harvest burst: whole → cracking → bursting → gone, with shard spray.
struct MineHarvestBurst: View {
    var emoji: String
    var color: Color
    @State private var phase = 0

    var body: some View {
        ZStack {
            Text(emoji)
                .font(.system(size: 64))
                .scaleEffect([1.0, 1.12, 1.3, 0.2][phase])
                .opacity([1.0, 1.0, 0.9, 0.0][phase])
                .rotationEffect(.degrees([0, -6, 8, 0][phase]))
                .animation(.spring(response: 0.4, dampingFraction: 0.55), value: phase)
            ForEach(0..<10, id: \.self) { i in
                Circle()
                    .fill(color)
                    .frame(width: 8, height: 8)
                    .offset(phase >= 2 ? shardOffset(i) : .zero)
                    .opacity(phase >= 2 ? 0 : 1)
                    .animation(
                        .spring(response: 0.5, dampingFraction: 0.6)
                            .delay(Double(i) * 0.02),
                        value: phase
                    )
            }
        }
        .onTapGesture {
            phase = 0
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { phase = 1 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { phase = 2 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { phase = 3 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { phase = 0 }
            SpookyHaptics.play(.medium)
        }
    }

    private func shardOffset(_ i: Int) -> CGSize {
        let angle = Double(i) / 10 * 2 * Double.pi
        return CGSize(width: cos(angle) * 64, height: sin(angle) * 64)
    }
}

// ============================================================
// MARK: - 8. Locked-cave redemption panel (bound to manager)
// ============================================================

/// Redemption panel: every tracked cave with lock state, mineral costs
/// and one-tap redeem. Open caves show their harvest progress instead.
struct MineLockedCavePanel: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss
    @State private var showCeremony = false
    @State private var ceremonyFired = false

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🔒 Sealed caves (\(locked.count))")) {
                    if locked.isEmpty {
                        VStack(spacing: 8) {
                            Text("🔓").font(.system(size: 44))
                            Text("Every cave stands open.")
                                .font(.headline)
                            Text("The mine trusts you with sharp objects and open doors.")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    } else {
                        ForEach(locked) { cave in
                            lockedRow(cave)
                        }
                    }
                }
                Section(header: Text("🔓 Open caves (\(open.count))")) {
                    if open.isEmpty {
                        Text("No open caves yet — redeem a seal above.")
                            .font(.caption).foregroundStyle(.secondary)
                    } else {
                        ForEach(open) { cave in
                            openRow(cave)
                        }
                    }
                }
                Section(header: Text("💡 How seals work")) {
                    Text("Sealed caves can't be mined — growths bounce your pick. Redeem the listed minerals (they leave your backpack) to break the seal forever. Costs scale with depth: magma seals are dear.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Crystal Caves")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showCeremony) {
                VStack {
                    MineUnlockCeremony(
                        style: .crystalSeal,
                        play: ceremonyFired,
                        done: { showCeremony = false }
                    )
                    .frame(height: 420)
                    .padding()
                }
                .onAppear {
                    ceremonyFired = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        ceremonyFired = true
                    }
                }
            }
        }
    }

    // MARK: Ceremony plumbing

    private var locked: [MNCrystalCave] {
        manager.mineCaves.filter({ $0.isLocked }).sorted(by: { $0.center.y < $1.center.y })
    }

    private var open: [MNCrystalCave] {
        manager.mineCaves.filter({ !$0.isLocked }).sorted(by: { $0.center.y < $1.center.y })
    }

    private func lockedRow(_ cave: MNCrystalCave) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(cave.shape.emoji).font(.title2)
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(cave.shape.rawValue.capitalized) Cave — SEALED")
                        .font(.headline)
                    Text("Depth \(Int(cave.center.y)) • \(cave.cells.count) growths inside")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
            }
            // Cost chips with live have/need.
            HStack(spacing: 8) {
                ForEach(costLines(cave), id: \.name) { line in
                    HStack(spacing: 4) {
                        Text(line.emoji)
                        Text("\(min(line.have, line.need))/\(line.need)")
                            .font(.caption.bold()).monospacedDigit()
                    }
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background((line.have >= line.need ? Color.green : Color.red).opacity(0.25))
                    .foregroundColor(line.have >= line.need ? .green : .red)
                    .cornerRadius(8)
                }
            }
            Button(action: {
                if manager.unlockCave(cave.id) {
                    SpookyHaptics.play(.reward)
                    ceremonyFired = false
                    showCeremony = true
                } else {
                    SpookyHaptics.play(.error)
                }
            }) {
                Label("Redeem minerals & open", systemImage: "key.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.purple)
            .controlSize(.small)
        }
        .padding(.vertical, 4)
    }

    private func openRow(_ cave: MNCrystalCave) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(cave.shape.emoji)
                Text("\(cave.shape.rawValue.capitalized) Cave")
                    .font(.subheadline.bold())
                Spacer()
                if cave.harvested {
                    Text("HARVESTED ✅").font(.caption2.bold()).foregroundColor(.green)
                } else {
                    Text("OPEN").font(.caption2.bold()).foregroundColor(.blue)
                }
            }
            Text("Depth \(Int(cave.center.y)) • \(cave.cells.count) growths")
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }

    private struct CostLine {
        var name: String
        var emoji: String
        var have: Int
        var need: Int
    }

    private func costLines(_ cave: MNCrystalCave) -> [CostLine] {
        let emojis = [
            "Coal Ore": "⬛", "Iron Ore": "🟫", "Gold Ore": "🟨",
            "Lapis Ore": "🟦", "Redstone Ore": "🟥", "Emerald Ore": "🟩",
            "Ruby Ore": "♦️", "Diamond Ore": "💎", "Opal Ore": "🔮",
        ]
        return cave.unlockCost.map { name, need in
            CostLine(
                name: name,
                emoji: emojis[name] ?? "💎",
                have: manager.player.ores[name, default: 0],
                need: need
            )
        }
        .sorted(by: { $0.name < $1.name })
    }
}

// ============================================================
// MARK: - 9. Crystal showcase gallery
// ============================================================

/// Full crystal showcase: every shape, locks, doors, ceremonies, beds.
/// Present from the codex or a debug button for a live demo.
struct MineCrystalShowcaseView: View {
    @State private var locked = true
    @State private var doorStyle: MineDoorStyle = .crystalSeal
    @State private var ceremony = false
    @State private var ceremonyDone = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Hero: constellation over shimmer.
                    VStack(spacing: 8) {
                        Text("💎 The Living Vault").font(.headline)
                        ZStack {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.black)
                                .frame(height: 260)
                            MineCaveShimmer()
                            MineLightShafts()
                                .offset(y: -20)
                            MineOrbConstellation(color: .purple, locked: false)
                        }
                        .padding(.horizontal)
                    }
                    // Shape studies.
                    VStack(spacing: 12) {
                        Text("Shape studies").font(.headline)
                        HStack(spacing: 20) {
                            VStack {
                                MineAnimatedCube(color: .purple, size: 64, locked: locked)
                                Text("Square cubes").font(.caption)
                            }
                            VStack {
                                MineAnimatedSpike(color: .cyan, height: 90, locked: locked)
                                Text("Triangle spikes").font(.caption)
                            }
                            VStack {
                                MineAnimatedOrb(color: .pink, size: 64, locked: locked)
                                Text("Sphere orbs").font(.caption)
                            }
                        }
                        Toggle("Preview locked", isOn: $locked)
                            .padding(.horizontal, 40)
                    }
                    // Cluster + pair + constellation row.
                    VStack(spacing: 12) {
                        Text("Growth patterns").font(.headline)
                        MineCubeCluster(locked: locked)
                        MineSpikePair(locked: locked)
                        Text("Cube grids • stalactite pairs • orb rings")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    // Door gallery.
                    VStack(spacing: 12) {
                        Text("Sealed doors").font(.headline)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(MineDoorStyle.allCases, id: \.self) { style in
                                    Button(action: { doorStyle = style }) {
                                        MineLockedDoor(
                                            style: style,
                                            costs: [
                                                (emoji: "🟨", have: 5, need: 8),
                                                (emoji: "💎", have: 2, need: 2),
                                            ],
                                            affordable: style == doorStyle ? false : true,
                                            onKnock: {}
                                        )
                                        .frame(width: 220)
                                        .opacity(style == doorStyle ? 1 : 0.75)
                                        .scaleEffect(style == doorStyle ? 1.0 : 0.94)
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                        Text("Selected: \(doorStyle.rawValue) — \(doorStyle.flavor)")
                            .font(.caption).foregroundStyle(.secondary)
                            .padding(.horizontal)
                    }
                    // Unlock ceremony demo.
                    VStack(spacing: 10) {
                        Text("Redemption ceremony").font(.headline)
                        if ceremonyDone {
                            VStack(spacing: 8) {
                                Text("🔓").font(.system(size: 64))
                                Text("Seal broken — try it again!")
                                    .font(.headline).foregroundColor(.green)
                            }
                            .frame(height: 300)
                        } else {
                            MineUnlockCeremony(style: doorStyle, play: ceremony) {
                                ceremonyDone = true
                            }
                            .frame(height: 380)
                        }
                        Button(ceremonyDone ? "Replay ceremony" : "Play ceremony") {
                            ceremonyDone = false
                            ceremony = false
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                ceremony = true
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.purple)
                    }
                    // Harvest lab.
                    VStack(spacing: 10) {
                        Text("Harvest lab — tap the crystals").font(.headline)
                        HStack(spacing: 30) {
                            MineHarvestBurst(emoji: "🟪", color: .purple)
                            MineHarvestBurst(emoji: "🔺", color: .cyan)
                            MineHarvestBurst(emoji: "🔮", color: .pink)
                        }
                        .frame(height: 140)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Crystal Theater")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
