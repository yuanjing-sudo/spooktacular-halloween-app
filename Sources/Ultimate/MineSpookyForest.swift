//
//  MineSpookyForest.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  A walkable spooky forest: real-world pines and dead oaks towering over
//  the avatar, mixed with boxy rocks, mushrooms and stumps. 4K-crisp vector
//  ghosts (resolution-independent Shapes, layered translucency, rim light)
//  with superb animations. Two skies — pink/purple sunset and midnight —
//  auto-cycle on a timer (the user can't pick); every change arrives with
//  a huge lightning flash. Midnight moons cycle all eight crescent phases.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Sky director (auto sunset <-> midnight + lightning)
// ============================================================

/// The two skies. The user never picks — time picks.
enum MineForestSky {
    case sunset, midnight
}

/// Moon phases in order, new → full → new.
enum MineMoonPhase: Int, CaseIterable {
    case newMoon = 0
    case waxingCrescent, firstQuarter, waxingGibbous
    case full
    case waningGibbous, lastQuarter, waningCrescent

    var name: String {
        switch self {
        case .newMoon: return "New Moon"
        case .waxingCrescent: return "Waxing Crescent"
        case .firstQuarter: return "First Quarter"
        case .waxingGibbous: return "Waxing Gibbous"
        case .full: return "Full Moon"
        case .waningGibbous: return "Waning Gibbous"
        case .lastQuarter: return "Last Quarter"
        case .waningCrescent: return "Waning Crescent"
        }
    }

    /// Lit fraction 0…1 for glow scaling.
    var litFraction: Double {
        switch self {
        case .newMoon: return 0.02
        case .waxingCrescent: return 0.25
        case .firstQuarter: return 0.5
        case .waxingGibbous: return 0.75
        case .full: return 1.0
        case .waningGibbous: return 0.75
        case .lastQuarter: return 0.5
        case .waningCrescent: return 0.25
        }
    }
}

/// Auto sky director: sunset and midnight take turns; each change lands
/// with a huge lightning flash. Demo mode shortens eras for showcases.
final class MineForestSkyDirector: ObservableObject {
    @Published private(set) var sky: MineForestSky = .sunset
    @Published private(set) var countdown: Double = 90
    @Published private(set) var lightning = false
    @Published private(set) var moonPhase: MineMoonPhase = .waxingCrescent
    @Published private(set) var flashes: Int = 0
    @Published var demoMode = false

    private var timer: Timer?
    private var moonClock = 0.0

    var eraLength: Double { demoMode ? 14 : 90 }

    func start() {
        stop()
        countdown = eraLength
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.tick(dt: 0.5)
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    private func tick(dt: Double) {
        // Moon phases turn during midnight, one step per ~12s (demo: 3s).
        if sky == .midnight {
            moonClock += dt
            let step = demoMode ? 3.0 : 12.0
            if moonClock >= step {
                moonClock = 0
                if let next = MineMoonPhase(rawValue: (moonPhase.rawValue + 1) % 8) {
                    moonPhase = next
                }
            }
        }
        countdown -= dt
        if countdown <= 0 {
            changeSky()
        }
    }

    /// The huge lightning flash, then the sky turns over.
    private func changeSky() {
        lightning = true
        flashes += 1
        SpookyHaptics.play(.heavy)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in
            guard let self = self else { return }
            self.sky = self.sky == .sunset ? .midnight : .sunset
            self.countdown = self.eraLength
            self.moonClock = 0
            self.lightning = false
        }
    }

    var countdownText: String {
        "\(Int(ceil(countdown)))s to \(sky == .sunset ? "midnight" : "sunset")"
    }
}

// ============================================================
// MARK: - 2. Skies (sunset pink/purple, midnight + moon)
// ============================================================

/// Sunset sky: pink-to-purple gradient, low sun disc, ember clouds.
struct MineSunsetSky: View {
    @State private var glow = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.25, green: 0.1, blue: 0.3),
                    Color(red: 0.65, green: 0.25, blue: 0.45),
                    Color(red: 0.95, green: 0.45, blue: 0.45),
                    Color(red: 1.0, green: 0.7, blue: 0.5),
                ],
                startPoint: .top, endPoint: .bottom
            )
            // Low sun with breathing halo.
            ZStack {
                Circle()
                    .fill(Color(red: 1.0, green: 0.75, blue: 0.55).opacity(0.35))
                    .frame(width: 150, height: 150)
                    .scaleEffect(glow ? 1.15 : 0.95)
                    .animation(
                        .easeInOut(duration: 3).repeatForever(autoreverses: true),
                        value: glow
                    )
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [.white, Color(red: 1.0, green: 0.7, blue: 0.45)],
                            center: .center, startRadius: 4, endRadius: 34
                        )
                    )
                    .frame(width: 68, height: 68)
            }
            .offset(y: 70)
            // Ember clouds.
            ForEach(0..<4, id: \.self) { i in
                Ellipse()
                    .fill(Color(red: 0.9, green: 0.4, blue: 0.5).opacity(0.4))
                    .frame(width: 160 - CGFloat(i) * 20, height: 26)
                    .blur(radius: 8)
                    .offset(x: glow ? CGFloat(-20 + i * 10) : CGFloat(20 - i * 10), y: CGFloat(-120 + i * 36))
                    .animation(
                        .easeInOut(duration: 6 + Double(i)).repeatForever(autoreverses: true),
                        value: glow
                    )
            }
            // Bird silhouettes.
            ForEach(0..<3, id: \.self) { i in
                Text("﹏")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.black.opacity(0.7))
                    .offset(x: glow ? CGFloat(-60 + i * 60) : CGFloat(60 - i * 60), y: CGFloat(-90 + i * 22))
                    .animation(
                        .easeInOut(duration: 7).repeatForever(autoreverses: true)
                            .delay(Double(i)),
                        value: glow
                    )
            }
        }
        .onAppear { glow.toggle() }
    }
}

/// Midnight sky: near-black blue, starfield, phase-cycling moon.
struct MineMidnightSky: View {
    var phase: MineMoonPhase

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.01, green: 0.02, blue: 0.07),
                    Color(red: 0.03, green: 0.05, blue: 0.14),
                    Color(red: 0.02, green: 0.02, blue: 0.06),
                ],
                startPoint: .top, endPoint: .bottom
            )
            MazeStars(count: 70, seed: 9)
            MinePhaseMoon(phase: phase)
                .offset(x: 80, y: -90)
            // Thin night clouds crossing the moon.
            ForEach(0..<2, id: \.self) { i in
                Ellipse()
                    .fill(Color(red: 0.1, green: 0.12, blue: 0.22).opacity(0.7))
                    .frame(width: 170, height: 24)
                    .blur(radius: 8)
                    .offset(x: CGFloat(60 - i * 90), y: -90)
            }
        }
    }
}

/// The moon itself: lit disc carved by a shadow disc per phase.
struct MinePhaseMoon: View {
    var phase: MineMoonPhase
    @State private var shimmer = false

    var body: some View {
        ZStack {
            // Halo scales with lit fraction.
            Circle()
                .fill(Color(red: 0.9, green: 0.92, blue: 1.0).opacity(0.12 + 0.2 * phase.litFraction))
                .frame(width: 110, height: 110)
                .blur(radius: 6)
            // Lit disc.
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color(white: 0.98), Color(red: 0.82, green: 0.85, blue: 0.92)],
                        center: UnitPoint(x: 0.38, y: 0.35),
                        startRadius: 4, endRadius: 34
                    )
                )
                .frame(width: 62, height: 62)
                .opacity(phase == .newMoon ? 0.12 : 1)
            // Shadow carve (Canvas so the terminator stays crisp).
            TimelineView(.animation) { _ in
                Canvas { context, size in
                    let w = Double(size.width)
                    let (dx, cover) = shadowForPhase(phase, radius: w / 2)
                    context.fill(
                        Circle().path(in: CGRect(x: w / 2 + dx - w / 2, y: 0, width: w, height: w)),
                        with: .color(Color(red: 0.02, green: 0.03, blue: 0.08).opacity(cover))
                    )
                }
            }
            .frame(width: 62, height: 62)
            .clipShape(Circle())
            .frame(width: 62, height: 62)
            // Craters (fade out as shadow covers).
            Circle().fill(Color(red: 0.8, green: 0.82, blue: 0.88)).frame(width: 9, height: 9).offset(x: -10, y: -8)
                .opacity(phase.litFraction)
            Circle().fill(Color(red: 0.8, green: 0.82, blue: 0.88)).frame(width: 6, height: 6).offset(x: 11, y: 9)
                .opacity(phase.litFraction)
            Circle().fill(Color(red: 0.8, green: 0.82, blue: 0.88)).frame(width: 5, height: 5).offset(x: 2, y: -14)
                .opacity(phase.litFraction)
            // Twinkle ring on full moon.
            if phase == .full {
                Circle()
                    .stroke(Color.white.opacity(shimmer ? 0.8 : 0.3), lineWidth: 2)
                    .frame(width: 74, height: 74)
                    .animation(
                        .easeInOut(duration: 1.6).repeatForever(autoreverses: true),
                        value: shimmer
                    )
                    .onAppear { shimmer.toggle() }
            }
        }
        .frame(width: 110, height: 110)
    }

    /// Shadow offset + coverage for each of the 8 phases.
    /// Same-size shadow disc: waxing bites from the left (right stays
    /// lit), waning bites from the right. Offset sets the bite size.
    private func shadowForPhase(_ phase: MineMoonPhase, radius: Double) -> (dx: Double, cover: Double) {
        switch phase {
        case .newMoon: return (0, 0.97)
        case .waxingCrescent: return (-radius * 0.55, 0.97)
        case .firstQuarter: return (-radius * 1.0, 0.97)
        case .waxingGibbous: return (-radius * 1.7, 0.97)
        case .full: return (radius * 4, 0)
        case .waningGibbous: return (radius * 1.7, 0.97)
        case .lastQuarter: return (radius * 1.0, 0.97)
        case .waningCrescent: return (radius * 0.55, 0.97)
        }
    }
}

// ============================================================
// MARK: - 3. Lightning flash transition
// ============================================================

/// The huge lightning flash: jagged bolts, white-out, thunder shake.
struct MineLightningFlash: View {
    var firing: Bool
    @State private var shake = false

    var body: some View {
        ZStack {
            // Bolt forest.
            if firing {
                ForEach(0..<4, id: \.self) { i in
                    MineBoltShape(seed: Double(i) * 7.7)
                        .stroke(Color.white, lineWidth: 4 - CGFloat(i))
                        .shadow(color: .cyan, radius: 14)
                        .frame(width: 120, height: 320)
                        .offset(x: CGFloat(i * 60 - 90))
                        .opacity(0.95)
                        .transition(.opacity)
                }
            }
            // White-out.
            Color.white
                .opacity(firing ? 0.85 : 0)
                .animation(.easeOut(duration: 0.22), value: firing)
        }
        .offset(x: shake && firing ? 8 : -8)
        .animation(
            firing ? .easeInOut(duration: 0.07).repeatCount(7, autoreverses: true) : .default,
            value: shake
        )
        .onChange(of: firing) { _, new in
            if new {
                shake = true
                SpookyHaptics.play(.heavy)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
                    shake = false
                }
            }
        }
        .allowsHitTesting(false)
    }
}

/// One jagged bolt path from a seed.
struct MineBoltShape: Shape {
    var seed: Double

    func path(in rect: CGRect) -> Path {
        var p = Path()
        var x = rect.midX + CGFloat(sin(seed) * 20)
        var y = rect.minY
        p.move(to: CGPoint(x: x, y: y))
        var i = 0
        while y < rect.maxY {
            x += CGFloat(sin(seed + Double(i) * 2.3) * 34)
            y += rect.height / 8
            p.addLine(to: CGPoint(x: x, y: min(y, rect.maxY)))
            // Fork.
            if i % 3 == 1 {
                var fx = x
                var fy = y - rect.height / 16
                p.move(to: CGPoint(x: fx, y: fy))
                fx += CGFloat(cos(seed + Double(i)) * 30)
                fy += rect.height / 12
                p.addLine(to: CGPoint(x: fx, y: fy))
                p.move(to: CGPoint(x: x, y: y))
            }
            i += 1
        }
        return p
    }
}

// ============================================================
// MARK: - 4. Trees (towering real + boxy)
// ============================================================

/// A towering pine: tapered trunk, layered boughs, needle shimmer.
/// Heights run 300–480pt — far taller than the 70pt avatar.
struct MineTallPine: View {
    var height: CGFloat
    var seed: Double
    var moonlit: Bool
    @State private var sway = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Trunk.
            MineTaperedTrunk(width: height * 0.09, height: height, seed: seed, moonlit: moonlit)
            // Bough layers (more layers for taller trees).
            ForEach(0..<7, id: \.self) { i in
                let t = Double(i) / 6 // 0 bottom → 1 top
                Ellipse()
                    .fill(boughColor(depth: t))
                    .frame(
                        width: height * 0.52 * (1 - t * 0.78),
                        height: height * 0.09
                    )
                    .offset(y: -height * CGFloat(0.12 + t * 0.82))
                    .rotationEffect(.degrees(sway ? (1.2 + t * 1.6) : -(1.2 + t * 1.6)))
                    .animation(
                        .easeInOut(duration: 3 + t * 2).repeatForever(autoreverses: true)
                            .delay(t * 0.4),
                        value: sway
                    )
            }
            // Needle glints.
            ForEach(0..<5, id: \.self) { i in
                Circle()
                    .fill(Color.white.opacity(0.5))
                    .frame(width: 3, height: 3)
                    .offset(
                        x: CGFloat(sin(seed + Double(i) * 2.1) * Double(height) * 0.14),
                        y: -height * CGFloat(0.3 + Double(i) * 0.13)
                    )
                    .opacity(sway ? 0.8 : 0.2)
                    .animation(
                        .easeInOut(duration: 2).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.3),
                        value: sway
                    )
            }
        }
        .frame(height: height + 20)
        .onAppear { sway.toggle() }
    }

    private func boughColor(depth t: Double) -> Color {
        if moonlit {
            return Color(red: 0.08 + 0.06 * (1 - t), green: 0.14 + 0.08 * (1 - t), blue: 0.16)
        }
        return Color(red: 0.1 + 0.12 * (1 - t), green: 0.25 + 0.15 * (1 - t), blue: 0.16)
    }
}

/// Tapered trunk with bark streaks.
struct MineTaperedTrunk: View {
    var width: CGFloat
    var height: CGFloat
    var seed: Double
    var moonlit: Bool

    var body: some View {
        ZStack(alignment: .bottom) {
            Path { p in
                p.move(to: CGPoint(x: -width / 2, y: 0))
                p.addLine(to: CGPoint(x: -width * 0.28, y: -height))
                p.addLine(to: CGPoint(x: width * 0.28, y: -height))
                p.addLine(to: CGPoint(x: width / 2, y: 0))
                p.closeSubpath()
            }
            .fill(
                LinearGradient(
                    colors: moonlit
                        ? [Color(red: 0.12, green: 0.1, blue: 0.14), Color(red: 0.2, green: 0.17, blue: 0.22)]
                        : [Color(red: 0.3, green: 0.2, blue: 0.13), Color(red: 0.45, green: 0.3, blue: 0.18)],
                    startPoint: .bottom, endPoint: .top
                )
            )
            .frame(width: width, height: height)
            // Bark streaks.
            ForEach(0..<3, id: \.self) { i in
                Capsule()
                    .fill(Color.black.opacity(0.3))
                    .frame(width: 3, height: height * 0.7)
                    .offset(x: CGFloat(i * 8 - 8))
            }
            // Roots.
            HStack(spacing: 6) {
                ForEach(0..<3, id: \.self) { _ in
                    Ellipse()
                        .fill(Color(red: 0.22, green: 0.14, blue: 0.09))
                        .frame(width: width * 0.9, height: 12)
                }
            }
            .offset(y: 4)
        }
    }
}

/// A dead oak: gnarled trunk, reaching branches, hanging moss, owl hollow.
struct MineDeadOak: View {
    var height: CGFloat
    var seed: Double
    var moonlit: Bool
    var owlAwake: Bool
    @State private var creak = false

    var body: some View {
        ZStack(alignment: .bottom) {
            MineTaperedTrunk(width: height * 0.12, height: height, seed: seed, moonlit: moonlit)
            // Reaching branches.
            ForEach(0..<6, id: \.self) { i in
                Capsule()
                    .fill(Color(red: 0.22, green: 0.15, blue: 0.1))
                    .frame(width: 8, height: height * 0.3)
                    .offset(
                        x: CGFloat(sin(seed + Double(i) * 1.9) * Double(height) * 0.16),
                        y: -height * CGFloat(0.55 + Double(i % 3) * 0.14)
                    )
                    .rotationEffect(.degrees(Double((i * 53) % 70) - 35 + (creak ? 2 : -2)))
                    .animation(
                        .easeInOut(duration: 4).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.3),
                        value: creak
                    )
            }
            // Hanging moss.
            ForEach(0..<4, id: \.self) { i in
                Capsule()
                    .fill(Color(red: 0.3, green: 0.4, blue: 0.25).opacity(0.8))
                    .frame(width: 7, height: 34 + CGFloat((i * 29) % 22))
                    .offset(x: CGFloat(i * 26 - 39), y: -height * 0.62)
                    .rotationEffect(.degrees(creak ? 4 : -4))
                    .animation(
                        .easeInOut(duration: 3).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.4),
                        value: creak
                    )
            }
            // Hollow with owl eyes.
            Ellipse()
                .fill(Color.black)
                .frame(width: height * 0.1, height: height * 0.07)
                .offset(y: -height * 0.3)
            if owlAwake {
                HStack(spacing: 6) {
                    Circle().fill(Color.yellow).frame(width: 6, height: 6)
                        .shadow(color: .yellow, radius: 4)
                    Circle().fill(Color.yellow).frame(width: 6, height: 6)
                        .shadow(color: .yellow, radius: 4)
                }
                .offset(y: -height * 0.3)
            }
        }
        .frame(height: height + 20)
        .onAppear { creak.toggle() }
    }
}

/// Boxy pine: the voxel cousin — cube foliage tiers on a beam trunk.
struct MineBoxyPine: View {
    var height: CGFloat
    var seed: Double
    @State private var bob = false

    var body: some View {
        VStack(spacing: -6) {
            ForEach(0..<4, id: \.self) { i in
                let t = Double(i) / 3
                RoundedRectangle(cornerRadius: 4)
                    .fill(
                        Color(red: 0.12 + 0.1 * t, green: 0.35 + 0.12 * t, blue: 0.18)
                    )
                    .frame(width: height * 0.4 * (1 - t * 0.55), height: height * 0.16)
                    .rotationEffect(.degrees(bob ? 1.5 : -1.5))
                    .animation(
                        .easeInOut(duration: 2.6).repeatForever(autoreverses: true)
                            .delay(t * 0.5),
                        value: bob
                    )
            }
            Rectangle()
                .fill(Color(red: 0.4, green: 0.28, blue: 0.16))
                .frame(width: height * 0.07, height: height * 0.3)
        }
        .frame(height: height + 20)
        .onAppear { bob.toggle() }
    }
}

// ============================================================
// MARK: - 5. Forest floor (fog, mushrooms, rocks, owls, leaves)
// ============================================================

/// Ground fog banks rolling between trunks.
struct MineForestFog: View {
    @State private var roll = false

    var body: some View {
        ZStack {
            ForEach(0..<4, id: \.self) { i in
                Ellipse()
                    .fill(Color(red: 0.6, green: 0.6, blue: 0.75).opacity(0.16))
                    .frame(width: 260 + CGFloat(i) * 40, height: 46)
                    .blur(radius: 12)
                    .offset(x: roll ? CGFloat(-50 + i * 20) : CGFloat(50 - i * 20), y: CGFloat(40 - i * 30))
                    .animation(
                        .easeInOut(duration: 7 + Double(i)).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.7),
                        value: roll
                    )
            }
        }
        .onAppear { roll.toggle() }
    }
}

/// Mushroom cluster: real rounds + one boxy oddball.
struct MineMushrooms: View {
    @State private var glow = false

    var body: some View {
        HStack(alignment: .bottom, spacing: 6) {
            MineToadstool(size: 26, cap: .red)
            MineToadstool(size: 34, cap: .purple)
            // The boxy oddball.
            VStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color.teal)
                    .frame(width: 26, height: 18)
                    .overlay(
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(glow ? 0.5 : 0.2))
                            .frame(width: 26, height: 18)
                            .animation(
                                .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                                value: glow
                            )
                    )
                Rectangle()
                    .fill(Color(white: 0.85))
                    .frame(width: 8, height: 18)
            }
            MineToadstool(size: 22, cap: .orange)
        }
        .onAppear { glow.toggle() }
    }
}

/// One round toadstool with glowing dots.
struct MineToadstool: View {
    var size: CGFloat
    var cap: Color
    @State private var glow = false

    var body: some View {
        VStack(spacing: 0) {
            Ellipse()
                .fill(cap)
                .frame(width: size, height: size * 0.55)
                .overlay(
                    HStack(spacing: 4) {
                        Circle().fill(Color.white.opacity(glow ? 0.9 : 0.4)).frame(width: 4, height: 4)
                        Circle().fill(Color.white.opacity(glow ? 0.9 : 0.4)).frame(width: 3, height: 3)
                    }
                    .animation(
                        .easeInOut(duration: 2).repeatForever(autoreverses: true),
                        value: glow
                    )
                )
            Rectangle()
                .fill(Color(white: 0.88))
                .frame(width: size * 0.3, height: size * 0.5)
        }
        .onAppear { glow.toggle() }
    }
}

/// Boxy boulder + stump: voxel props among the realism.
struct MineBoxyProps: View {
    @State private var settle = false

    var body: some View {
        HStack(alignment: .bottom, spacing: 18) {
            // Boxy boulder.
            RoundedRectangle(cornerRadius: 6)
                .fill(
                    LinearGradient(
                        colors: [Color(white: 0.45), Color(white: 0.25)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .frame(width: 54, height: 44)
                .rotationEffect(.degrees(settle ? -3 : 3))
                .animation(
                    .easeInOut(duration: 4).repeatForever(autoreverses: true),
                    value: settle
                )
            // Boxy stump with rings.
            ZStack(alignment: .top) {
                Rectangle()
                    .fill(Color(red: 0.42, green: 0.29, blue: 0.16))
                    .frame(width: 40, height: 44)
                Ellipse()
                    .fill(Color(red: 0.72, green: 0.55, blue: 0.32))
                    .frame(width: 40, height: 14)
                    .overlay(
                        Ellipse()
                            .stroke(Color(red: 0.5, green: 0.36, blue: 0.2), lineWidth: 2)
                            .frame(width: 26, height: 9)
                    )
            }
        }
        .onAppear { settle.toggle() }
    }
}

/// Falling leaves + fireflies for the floor air.
struct MineFloorAir: View {
    var sunset: Bool

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                // Leaves.
                for i in 0..<14 {
                    let life = fmod(t * 0.22 + Double(i) * 0.31, 1.0)
                    let x = fmod(Double(i) * 167.3 + sin(t * 0.8 + Double(i)) * 26, w)
                    let y = life * h
                    context.opacity = (1 - life * 0.4) * 0.85
                    context.fill(
                        MineParticleShape.diamond.path(x: x, y: y, r: 4, angle: t * 2 + Double(i)),
                        with: .color(sunset ? .orange : .green)
                    )
                }
                // Fireflies (brighter at midnight).
                for i in 0..<12 {
                    let f1 = fmod(Double(i) * 12.9898, 1.0)
                    let f2 = fmod(Double(i) * 78.233, 1.0)
                    let x = fmod(f1 * w + sin(t * 0.6 + Double(i)) * 30, w)
                    let y = fmod(f2 * h + cos(t * 0.5 + Double(i) * 1.7) * 24, h)
                    let blink = 0.2 + 0.8 * abs(sin(t * 2 + Double(i) * 2.4))
                    context.opacity = blink * (sunset ? 0.3 : 0.95)
                    context.fill(
                        Circle().path(in: CGRect(x: x - 1.5, y: y - 1.5, width: 3, height: 3)),
                        with: .color(.yellow)
                    )
                }
            }
        }
        .allowsHitTesting(false)
    }
}

// ============================================================
// MARK: - 6. HD ghosts (4K-crisp layered rendering)
// ============================================================

/// 4K ghost: vector-crisp at any size — layered translucency, rim light,
/// inner glow, drifting eyes that look around, tap-to-wail.
struct MineGhostHD: View {
    var kind: MineGhostKind
    var size: CGFloat = 110
    @State private var look = false
    @State private var wailing = false
    @State private var breathe = false

    var body: some View {
        ZStack {
            // Outer aura (two offset glows for depth).
            Circle()
                .fill(
                    RadialGradient(
                        colors: [kind.tint.opacity(0.4), .clear],
                        center: .center, startRadius: 8, endRadius: size * 0.85
                    )
                )
                .frame(width: size * 1.7, height: size * 1.7)
                .opacity(breathe ? 0.9 : 0.55)
                .animation(
                    .easeInOut(duration: 2.4).repeatForever(autoreverses: true),
                    value: breathe
                )
            // Body, drawn bigger + crisper than the sprite.
            MineGhostBody(kind: kind, size: size)
            // Rim light: top-left sheen masked to the sheet silhouette.
            LinearGradient(
                colors: [.white.opacity(0.55), .clear, .clear, .white.opacity(0.25)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            .mask(MineGhostSheet(kind: kind, size: size))
            // Looking-around eyes.
            HStack(spacing: size * 0.16) {
                MineGhostEye(kind: kind, size: size * 0.13, blink: false)
                MineGhostEye(kind: kind, size: size * 0.13, blink: false)
            }
            .offset(x: look ? size * 0.07 : -size * 0.07, y: -size * 0.2)
            .animation(
                .easeInOut(duration: 2.8).repeatForever(autoreverses: true),
                value: look
            )
            // Wail mouth.
            if wailing {
                Ellipse()
                    .fill(Color.black.opacity(0.85))
                    .frame(width: size * 0.22, height: size * 0.34)
                    .offset(y: size * 0.02)
                    .transition(.scale.combined(with: .opacity))
            }
            MineWailRings(kind: kind, firing: wailing)
        }
        .scaleEffect(x: wailing ? 1.15 : 1.0, y: wailing ? 0.88 : 1.0)
        .animation(.spring(response: 0.35, dampingFraction: 0.45), value: wailing)
        .onTapGesture {
            wailing = true
            SpookyHaptics.play(.warning)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                wailing = false
            }
        }
        .onAppear {
            look.toggle()
            breathe.toggle()
        }
    }
}

// ============================================================
// MARK: - 7. Avatar walker (scale reference + stroll)
// ============================================================

/// The miner avatar: helmet lamp, bobbing stroll, footstep dust.
/// Stands ~70pt so the 300–480pt trees read as towering.
struct MineForestAvatar: View {
    var walking: Bool
    var lampOn: Bool
    @State private var step = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Lamp glow.
            if lampOn {
                Circle()
                    .fill(Color.yellow.opacity(0.25))
                    .frame(width: 90, height: 90)
                    .blur(radius: 6)
                    .offset(y: -44)
            }
            VStack(spacing: 0) {
                // Helmet + lamp.
                ZStack {
                    Ellipse()
                        .fill(Color.yellow)
                        .frame(width: 30, height: 14)
                    Circle()
                        .fill(Color.white)
                        .frame(width: 8, height: 8)
                        .shadow(color: .yellow, radius: lampOn ? 8 : 0)
                        .offset(y: -2)
                }
                .offset(y: 4)
                // Head.
                Circle()
                    .fill(Color(red: 0.95, green: 0.78, blue: 0.62))
                    .frame(width: 22, height: 22)
                // Body (coat).
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color(red: 0.5, green: 0.25, blue: 0.15))
                    .frame(width: 26, height: 30)
                // Legs alternate.
                HStack(spacing: 6) {
                    Capsule()
                        .fill(Color(red: 0.25, green: 0.18, blue: 0.12))
                        .frame(width: 8, height: walking ? (step ? 16 : 10) : 13)
                        .offset(y: walking && step ? -3 : 0)
                        .animation(walking ? .easeInOut(duration: 0.32).repeatForever(autoreverses: true) : .default, value: step)
                    Capsule()
                        .fill(Color(red: 0.25, green: 0.18, blue: 0.12))
                        .frame(width: 8, height: walking ? (step ? 10 : 16) : 13)
                        .offset(y: walking && !step ? -3 : 0)
                        .animation(walking ? .easeInOut(duration: 0.32).repeatForever(autoreverses: true) : .default, value: step)
                }
            }
            .offset(y: walking ? (step ? -3 : 0) : 0)
            .animation(walking ? .easeInOut(duration: 0.32).repeatForever(autoreverses: true) : .default, value: step)
            // Footstep dust.
            if walking {
                Ellipse()
                    .fill(Color.brown.opacity(0.4))
                    .frame(width: step ? 26 : 14, height: 8)
                    .blur(radius: 3)
                    .offset(y: 2)
                    .animation(.easeInOut(duration: 0.32).repeatForever(autoreverses: true), value: step)
            }
        }
        .frame(width: 60, height: 110)
        .onAppear { step.toggle() }
        .onChange(of: walking) { _, _ in
            // Restart the stepping loop cleanly on toggle.
            step.toggle()
        }
    }
}

// ============================================================
// MARK: - 8. The walkable forest (parallax engine)
// ============================================================

/// Parallax tree descriptor: base position, layer, kind, size, seed.
struct MineForestTree: Identifiable {
    let id = UUID()
    var baseX: Double // pattern space 0…1200
    var layer: Int // 0 far, 1 mid, 2 near
    var pine: Bool
    var boxy: Bool
    var oak: Bool
    var height: CGFloat
    var seed: Double
}

/// The forest itself: three parallax bands scrolling with distance,
/// avatar strolling center, ghosts drifting, floor life everywhere.
struct MineSpookyForestView: View {
    @StateObject private var sky = MineForestSkyDirector()
    @State private var distance = 0.0
    @State private var walking = true
    @State private var speed = 1.0
    @State private var timer: Timer?

    private let trees: [MineForestTree] = MineSpookyForestView.makeForest()
    private let patternWidth = 1200.0

    static func makeForest() -> [MineForestTree] {
        var out: [MineForestTree] = []
        // Far band: silhouettes every ~90pt.
        for i in 0..<14 {
            out.append(MineForestTree(
                baseX: Double(i) * 90 + Double((i * 53) % 30),
                layer: 0, pine: i % 3 != 2, boxy: false, oak: i % 3 == 2,
                height: 300 + CGFloat((i * 71) % 120),
                seed: Double(i) * 1.7
            ))
        }
        // Mid band: mixed real + occasional boxy, every ~110pt.
        for i in 0..<11 {
            out.append(MineForestTree(
                baseX: Double(i) * 110 + Double((i * 37) % 50),
                layer: 1, pine: i % 4 < 2, boxy: i % 4 == 2, oak: i % 4 == 3,
                height: 340 + CGFloat((i * 89) % 140),
                seed: Double(i) * 2.3 + 40
            ))
        }
        // Near band: heroes every ~170pt (tallest, fastest).
        for i in 0..<7 {
            out.append(MineForestTree(
                baseX: Double(i) * 170 + Double((i * 61) % 60),
                layer: 2, pine: i % 3 != 1, boxy: i % 5 == 4, oak: i % 3 == 1,
                height: 380 + CGFloat((i * 47) % 100),
                seed: Double(i) * 3.1 + 90
            ))
        }
        return out
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Sky (auto sunset/midnight).
                Group {
                    if sky.sky == .sunset {
                        MineSunsetSky()
                    } else {
                        MineMidnightSky(phase: sky.moonPhase)
                    }
                }
                .ignoresSafeArea()
                // Tree bands back → front.
                ForEach(0..<3, id: \.self) { layer in
                    treeBand(layer: layer, width: geo.size.width, height: geo.size.height)
                }
                // Floor life.
                VStack {
                    Spacer()
                    HStack {
                        MineMushrooms()
                        Spacer()
                        MineBoxyProps()
                    }
                    .padding(.horizontal, 30)
                    .padding(.bottom, 26)
                }
                MineForestFog()
                    .offset(y: 120)
                MineFloorAir(sunset: sky.sky == .sunset)
                // HD ghosts drifting through.
                MineGhostHD(kind: .wraith, size: 96)
                    .offset(x: ghostX(0.13, width: geo.size.width), y: -60)
                    .opacity(sky.sky == .midnight ? 1 : 0.45)
                MineGhostHD(kind: .shade, size: 70)
                    .offset(x: ghostX(0.47, width: geo.size.width), y: 30)
                    .opacity(0.8)
                MineGhostHD(kind: .wisp, size: 60)
                    .offset(x: ghostX(0.81, width: geo.size.width), y: -100)
                    .opacity(sky.sky == .midnight ? 1 : 0.5)
                // Avatar strolling center.
                MineForestAvatar(walking: walking, lampOn: sky.sky == .midnight)
                    .offset(y: geo.size.height * 0.32)
                // Lightning over everything.
                MineLightningFlash(firing: sky.lightning)
                // HUD.
                VStack {
                    forestHUD
                    Spacer()
                }
            }
        }
        .onAppear {
            sky.start()
            timer?.invalidate()
            timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
                if walking {
                    distance += 2.2 * speed
                }
            }
        }
        .onDisappear {
            sky.stop()
            timer?.invalidate()
        }
    }

    /// Screen x for a tree: wrap pattern space into view width + margin.
    private func treeX(_ tree: MineForestTree, width: Double) -> Double {
        let factor = [0.15, 0.4, 1.0][tree.layer]
        let span = patternWidth + 400
        var x = fmod(tree.baseX - distance * factor, span)
        if x < 0 { x += span }
        return x - 200
    }

    /// Slow independent ghost drift.
    private func ghostX(_ f: Double, width: Double) -> Double {
        let span = width + 300
        var x = fmod(f * span + distance * 0.08, span)
        if x < 0 { x += span }
        return x - 150
    }

    private func treeBand(layer: Int, width: Double, height: Double) -> some View {
        ZStack {
            ForEach(trees.filter({ $0.layer == layer })) { tree in
                treeView(tree, moonlit: sky.sky == .midnight)
                    .offset(
                        x: treeX(tree, width: width),
                        y: height * 0.5 - tree.height - 60 + CGFloat(layer) * 36
                    )
                    .opacity(layer == 0 ? 0.75 : 1.0)
            }
        }
    }

    @ViewBuilder
    private func treeView(_ tree: MineForestTree, moonlit: Bool) -> some View {
        if tree.boxy {
            MineBoxyPine(height: tree.height * 0.8, seed: tree.seed)
        } else if tree.oak {
            MineDeadOak(height: tree.height, seed: tree.seed, moonlit: moonlit, owlAwake: moonlit)
        } else {
            MineTallPine(height: tree.height, seed: tree.seed, moonlit: moonlit)
        }
    }

    private var forestHUD: some View {
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                Text(sky.sky == .sunset ? "🌇 Sunset" : "🌙 Midnight")
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                if sky.sky == .midnight {
                    Text("• \(sky.moonPhase.name)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                }
                Spacer()
                Text(sky.countdownText)
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.7))
                    .monospacedDigit()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.black.opacity(0.55))
            .cornerRadius(10)
            .padding(.horizontal, 10)
            .padding(.top, 8)
            // Countdown to the lightning changeover.
            MineShimmerBar(fraction: 1 - sky.countdown / sky.eraLength, tint: sky.sky == .sunset ? .purple : .blue, height: 6)
                .padding(.horizontal, 14)
            HStack(spacing: 10) {
                Button(action: { walking.toggle() }) {
                    Label(walking ? "Pause stroll" : "Stroll", systemImage: walking ? "pause.fill" : "figure.walk")
                        .font(.caption.bold())
                }
                .buttonStyle(.bordered)
                .tint(.orange)
                Button(action: { speed = speed >= 2 ? 0.5 : speed + 0.5 }) {
                    Label("×\(speed, specifier: "%.1f")", systemImage: "gauge")
                        .font(.caption.bold())
                }
                .buttonStyle(.bordered)
                Button(action: { sky.demoMode.toggle() }) {
                    Label(sky.demoMode ? "Demo: ON" : "Demo: brisk skies", systemImage: "bolt.fill")
                        .font(.caption.bold())
                }
                .buttonStyle(.bordered)
                .tint(sky.demoMode ? .yellow : .gray)
            }
        }
    }
}

// ============================================================
// MARK: - 9. Forest showcase
// ============================================================

/// Forest gate: the walkable scene plus a field guide.
struct MineForestShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    Text("A real-feeling spooky forest: towering pines, boxy odds and ends, 4K ghosts. Skies turn themselves with lightning.")
                        .font(.caption).foregroundStyle(.secondary)
                        .padding(.horizontal)
                    MineSpookyForestView()
                        .frame(height: 560)
                        .cornerRadius(16)
                        .padding(.horizontal)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("🌲 Field guide").font(.headline).padding(.horizontal)
                        guideRow("🌲", "Real pines", "300–480pt tall vs your 70pt stroll. Layers, glints, sway.")
                        guideRow("🦉", "Dead oaks", "Gnarled branches, moss, and owls that wake at midnight.")
                        guideRow("📦", "Boxy things", "Cube pines, boulder cubes, one oddball mushroom. Some things are boxy. That's the rule.")
                        guideRow("👻", "HD ghosts", "Vector-crisp at any size. Tap one to make it wail.")
                        guideRow("🌇→🌙", "Auto skies", "Pink sunset, then lightning, then crescent-cycling midnight. You don't pick. Time picks.")
                        guideRow("⛈️", "Lightning", "Every changeover lands with bolts, white-out and thunder.")
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Spooky Forest")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func guideRow(_ emoji: String, _ title: String, _ detail: String) -> some View {
        HStack(spacing: 10) {
            Text(emoji).font(.title2)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.bold())
                Text(detail).font(.caption).foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal)
    }
}
