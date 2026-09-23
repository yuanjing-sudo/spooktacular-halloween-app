//
//  MineDioramas.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Animated miniature scenes for the mine: six layer dioramas, three cave
//  interiors, the entrance and the magma heart. Each is a living postcard —
//  gradient skies, rock silhouettes, working lights, drifting particles,
//  drips, ghosts and crystals — composed from the theater + lighting kits.
//

import SwiftUI

// ============================================================
// MARK: - 1. Scene primitives (rock, beams, rails, water)
// ============================================================

/// Jagged rock silhouette band with slow parallax drift.
struct MineRockBand: View {
    var color: Color
    var height: CGFloat
    var seed: Double = 0
    @State private var drift = false

    var body: some View {
        GeometryReader { geo in
            Path { p in
                let w = geo.size.width
                let h = geo.size.height
                p.move(to: CGPoint(x: 0, y: h))
                p.addLine(to: CGPoint(x: 0, y: height))
                var x: CGFloat = 0
                var i = 0
                while x < w {
                    let peak = height - CGFloat(abs(sin(Double(i) * 1.7 + seed)) * height * 0.7)
                    x += w / 9
                    p.addLine(to: CGPoint(x: min(x, w), y: peak))
                    i += 1
                }
                p.addLine(to: CGPoint(x: w, y: h))
                p.closeSubpath()
            }
            .fill(color)
            .offset(x: drift ? -8 : 8)
            .animation(
                .easeInOut(duration: 9).repeatForever(autoreverses: true),
                value: drift
            )
        }
        .onAppear { drift.toggle() }
    }
}

/// Timber support frame (two posts + lintel) with sway.
struct MineTimberFrame: View {
    var width: CGFloat = 150
    var height: CGFloat = 110
    @State private var sway = false

    var body: some View {
        ZStack(alignment: .top) {
            HStack {
                timberPost(height: height)
                Spacer()
                timberPost(height: height)
            }
            .frame(width: width)
            RoundedRectangle(cornerRadius: 4)
                .fill(
                    LinearGradient(
                        colors: [Color(red: 0.55, green: 0.38, blue: 0.22), Color(red: 0.35, green: 0.22, blue: 0.12)],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: width + 16, height: 16)
        }
        .frame(width: width + 16, height: height + 16)
        .rotationEffect(.degrees(sway ? 0.6 : -0.6))
        .animation(
            .easeInOut(duration: 5).repeatForever(autoreverses: true),
            value: sway
        )
        .onAppear { sway.toggle() }
    }

    private func timberPost(height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(
                LinearGradient(
                    colors: [Color(red: 0.5, green: 0.34, blue: 0.19), Color(red: 0.32, green: 0.2, blue: 0.11)],
                    startPoint: .leading, endPoint: .trailing
                )
            )
            .frame(width: 14, height: height)
    }
}

/// Rail pair with sleepers receding into the dark.
struct MineRailTrack: View {
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 26) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(white: 0.4))
                    .frame(width: 5, height: 60)
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(white: 0.4))
                    .frame(width: 5, height: 60)
            }
            ForEach(0..<4, id: \.self) { i in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(red: 0.4, green: 0.28, blue: 0.16))
                    .frame(width: 52 - CGFloat(i) * 6, height: 6)
                    .offset(y: CGFloat(-14 - i * 12))
                    .opacity(1 - Double(i) * 0.2)
            }
        }
    }
}

/// Still black water with moving glints.
struct MineDarkWater: View {
    var width: CGFloat = 220
    @State private var glint = false

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(
                    LinearGradient(
                        colors: [Color(red: 0.05, green: 0.12, blue: 0.2), Color(red: 0.02, green: 0.05, blue: 0.1)],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: width, height: 34)
            HStack(spacing: 30) {
                ForEach(0..<4, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.cyan.opacity(0.5))
                        .frame(width: glint ? 22 : 10, height: 2)
                        .animation(
                            .easeInOut(duration: 1.8).repeatForever(autoreverses: true)
                                .delay(Double(i) * 0.3),
                            value: glint
                        )
                }
            }
        }
        .onAppear { glint.toggle() }
    }
}

// ============================================================
// MARK: - 2. Six layer dioramas
// ============================================================

/// Sunlit Tops: daylight shaft, birds as drifting motes, timber entrance.
struct MineDioramaMeadow: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.45, green: 0.38, blue: 0.25), Color(red: 0.1, green: 0.08, blue: 0.08)],
                startPoint: .top, endPoint: .bottom
            )
            MineLightCone(color: Color(red: 1.0, green: 0.95, blue: 0.8))
                .offset(y: -30)
            MineTimberFrame(width: 130, height: 90)
                .offset(y: 40)
            MineTorchFlame(scale: 0.8, seed: 11)
                .offset(x: -84, y: 30)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.white, .yellow],
                shapes: [.circle], flow: .drift, count: 18,
                gravity: 0, wind: 16, size: 2.0, life: 5.0, twinkle: true,
                flavor: ""
            ))
            MineVignette(strength: 0.4)
        }
    }
}

/// Dirt Tunnels: warm lamps, dust, rails.
struct MineDioramaDirt: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.28, green: 0.2, blue: 0.13), Color(red: 0.07, green: 0.05, blue: 0.05)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color(red: 0.2, green: 0.13, blue: 0.08), height: 60, seed: 1)
                .frame(height: 120)
                .offset(y: -70)
            MineLanternGlow(seed: 21)
                .offset(x: -60, y: -30)
            MineLanternGlow(color: .yellow, seed: 22)
                .offset(x: 60, y: -20)
            MineRailTrack()
                .offset(y: 70)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [Color(white: 0.7)],
                shapes: [.circle], flow: .drift, count: 24,
                gravity: 0, wind: 20, size: 2.6, life: 6.0, twinkle: false,
                flavor: ""
            ))
            MineVignette(strength: 0.5)
        }
    }
}

/// Stone Depths: cool lanterns, gem glints, shade cameo.
struct MineDioramaStone: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.17, green: 0.17, blue: 0.22), Color(red: 0.04, green: 0.04, blue: 0.07)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color(red: 0.12, green: 0.12, blue: 0.17), height: 70, seed: 2)
                .frame(height: 130)
                .offset(y: -70)
            MineRockBand(color: Color.black.opacity(0.6), height: 40, seed: 3)
                .frame(height: 90)
                .offset(y: 80)
            MineLanternGlow(color: Color(red: 0.85, green: 0.92, blue: 1.0), seed: 23)
                .offset(y: -40)
            MineGhostSprite(kind: .shade, size: 44)
                .offset(x: 70, y: 10)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.cyan, .white],
                shapes: [.diamond, .circle], flow: .drift, count: 26,
                gravity: 0, wind: 10, size: 2.2, life: 5.0, twinkle: true,
                flavor: ""
            ))
            MineVignette(strength: 0.6)
        }
    }
}

/// Deepstone: violet gloom, wraith, crystal glints.
struct MineDioramaDeepstone: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.15, green: 0.1, blue: 0.25), Color(red: 0.02, green: 0.02, blue: 0.06)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color(red: 0.1, green: 0.07, blue: 0.18), height: 80, seed: 4)
                .frame(height: 140)
                .offset(y: -70)
            MineAnimatedSpike(color: Color(red: 0.5, green: 0.4, blue: 0.9), height: 60)
                .offset(x: -70, y: 40)
            MineAnimatedSpike(color: Color(red: 0.5, green: 0.4, blue: 0.9), height: 44)
                .offset(x: 74, y: 48)
            MineGhostSprite(kind: .wraith, size: 56)
                .offset(y: -30)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.purple, .white],
                shapes: [.circle, .star], flow: .rise, count: 30,
                gravity: -40, wind: 6, size: 2.2, life: 4.0, twinkle: true,
                flavor: ""
            ))
            MineVignette(strength: 0.65)
        }
    }
}

/// Crystal Hollows: full crystal garden + orb constellation + wisp.
struct MineDioramaCrystal: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.13, green: 0.08, blue: 0.3), Color(red: 0.03, green: 0.02, blue: 0.1)],
                startPoint: .top, endPoint: .bottom
            )
            MineCaveShimmer(colors: [.purple, .cyan, .pink, .white], moteCount: 50)
            MineCubeCluster(color: .purple)
                .offset(x: -80, y: 50)
            MineSpikePair(color: .cyan)
                .offset(x: 80, y: 40)
            MineOrbConstellation(color: .pink)
                .offset(y: -30)
                .scaleEffect(0.8)
            MineGhostSprite(kind: .wisp, size: 40)
                .offset(x: -40, y: -70)
            MineDarkWater(width: 240)
                .offset(y: 105)
            MineVignette(strength: 0.45)
        }
    }
}

/// Magma Core: lava bed, embers, glow, magma grate door.
struct MineDioramaMagma: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.4, green: 0.1, blue: 0.06), Color(red: 0.07, green: 0.02, blue: 0.02)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color.black.opacity(0.7), height: 90, seed: 5)
                .frame(height: 150)
                .offset(y: -80)
            MineLavaGlow(seed: 31)
                .frame(height: 90)
                .offset(y: 80)
            MineTorchFlame(scale: 1.2, seed: 32)
                .offset(x: -90, y: 10)
            MineTorchFlame(scale: 1.2, seed: 33)
                .offset(x: 90, y: 10)
            MineGhostSprite(kind: .gloom, size: 52)
                .offset(y: -50)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.red, .orange, .yellow],
                shapes: [.circle], flow: .rise, count: 40,
                gravity: -60, wind: 8, size: 2.4, life: 3.0, twinkle: true,
                flavor: ""
            ))
            MineVignette(strength: 0.5)
        }
    }
}

// ============================================================
// MARK: - 3. Cave interiors (cube / spike / orb rooms)
// ============================================================

/// Cube cave room: grid floor, timber arch, lantern, keeper cameo.
struct MineDioramaCubeRoom: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.14, green: 0.1, blue: 0.26), Color(red: 0.03, green: 0.02, blue: 0.08)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color.black.opacity(0.55), height: 60, seed: 6)
                .frame(height: 110)
                .offset(y: -85)
            MineTimberFrame(width: 170, height: 100)
                .offset(y: 10)
            MineCubeCluster(color: .purple)
                .offset(y: 55)
            MineLanternGlow(seed: 41)
                .offset(y: -60)
            MineGhostSprite(kind: .lanternKeeper, size: 46)
                .offset(x: 85, y: 20)
            MineCaveShimmer(colors: [.purple, .white], moteCount: 30)
            MineVignette(strength: 0.5)
        }
    }
}

/// Spike cave room: stalactite ceiling, stalagmite floor, poltergeist.
struct MineDioramaSpikeRoom: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.08, green: 0.16, blue: 0.24), Color(red: 0.02, green: 0.04, blue: 0.09)],
                startPoint: .top, endPoint: .bottom
            )
            HStack(spacing: 18) {
                ForEach(0..<6, id: \.self) { i in
                    Triangle()
                        .fill(Color(red: 0.2, green: 0.35, blue: 0.45).opacity(0.9))
                        .frame(width: 30, height: 60 + CGFloat((i * 37) % 40))
                }
            }
            .offset(y: -95)
            MineSpikePair(color: .cyan)
                .offset(y: 45)
            MineAnimatedSpike(color: .cyan, height: 56)
                .offset(x: -90, y: 55)
            MineGhostSprite(kind: .poltergeist, size: 52)
                .offset(x: 70, y: -40)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.cyan],
                shapes: [.streak], flow: .fall, count: 20,
                gravity: 420, wind: 0, size: 2.0, life: 2.4, twinkle: false,
                flavor: ""
            ))
            MineVignette(strength: 0.55)
        }
    }
}

/// Orb cave room: floating constellation over dark water, shade drift.
struct MineDioramaOrbRoom: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.16, green: 0.08, blue: 0.26), Color(red: 0.03, green: 0.02, blue: 0.09)],
                startPoint: .top, endPoint: .bottom
            )
            MineOrbConstellation(color: .pink)
                .offset(y: -20)
                .scaleEffect(0.9)
            MineDarkWater(width: 250)
                .offset(y: 100)
            MineGhostSprite(kind: .shade, size: 48)
                .offset(x: -80, y: 30)
            MineCaveShimmer(colors: [.pink, .white, .purple], moteCount: 40)
            MineVignette(strength: 0.5)
        }
    }
}

/// The forge: anvil, hammer strike sparks, molten trough, bellows glow.
struct MineDioramaForge: View {
    @State private var strike = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.22, green: 0.12, blue: 0.1), Color(red: 0.06, green: 0.03, blue: 0.03)],
                startPoint: .top, endPoint: .bottom
            )
            // Anvil silhouette.
            VStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(white: 0.3))
                    .frame(width: 110, height: 22)
                Rectangle()
                    .fill(Color(white: 0.22))
                    .frame(width: 30, height: 60)
            }
            .offset(y: 40)
            // Hammer strike flash + sparks.
            Circle()
                .fill(Color.yellow.opacity(strike ? 0.9 : 0))
                .frame(width: 60, height: 60)
                .blur(radius: 6)
                .offset(y: 22)
            ForEach(0..<8, id: \.self) { i in
                Circle()
                    .fill(Color.orange)
                    .frame(width: 5, height: 5)
                    .offset(strike ? hammerSpark(i) : .zero)
                    .opacity(strike ? 1 : 0)
                    .animation(
                        .spring(response: 0.5, dampingFraction: 0.6)
                            .delay(Double(i) * 0.03),
                        value: strike
                    )
            }
            // Molten trough.
            RoundedRectangle(cornerRadius: 6)
                .fill(Color(red: 1.0, green: 0.45, blue: 0.1).opacity(0.85))
                .frame(width: 150, height: 16)
                .shadow(color: .orange, radius: 10)
                .offset(y: 92)
            MineTorchFlame(scale: 0.9, seed: 71)
                .offset(x: -90, y: 20)
            MineVignette(strength: 0.5)
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 2.2, repeats: true) { _ in
                strike.toggle()
                if strike { SpookyHaptics.play(.heavy) }
            }
        }
    }

    private func hammerSpark(_ i: Int) -> CGSize {
        let angle = Double(i) / 8 * 2 * Double.pi - Double.pi / 2
        return CGSize(width: cos(angle) * 55, height: sin(angle) * 40)
    }
}

/// Vault interior: coin mountains, gem boulders, chalice shelf.
struct MineDioramaVault: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.2, green: 0.14, blue: 0.08), Color(red: 0.05, green: 0.03, blue: 0.02)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color.black.opacity(0.55), height: 70, seed: 72)
                .frame(height: 120)
                .offset(y: -80)
            // Coin mountains.
            HStack(spacing: 30) {
                MineCoinMound(width: 90)
                MineCoinMound(width: 120)
                MineCoinMound(width: 70)
            }
            .offset(y: 55)
            MineAnimatedCube(color: .red, size: 26)
                .offset(x: -60, y: -10)
            MineAnimatedOrb(color: .cyan, size: 30)
                .offset(x: 60, y: -16)
            Text("🏆").font(.system(size: 30))
                .offset(x: 0, y: -50)
            MineCaveShimmer(colors: [.yellow, .white], moteCount: 30)
            MineVignette(strength: 0.5)
        }
    }
}

/// One coin mound helper.
struct MineCoinMound: View {
    var width: CGFloat
    @State private var gleam = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Triangle()
                .fill(
                    LinearGradient(
                        colors: [.yellow, Color(red: 0.8, green: 0.55, blue: 0.1)],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: width, height: width * 0.7)
            Triangle()
                .fill(Color.white.opacity(gleam ? 0.35 : 0.1))
                .frame(width: width, height: width * 0.7)
                .animation(
                    .easeInOut(duration: 2).repeatForever(autoreverses: true),
                    value: gleam
                )
        }
        .onAppear { gleam.toggle() }
    }
}

/// Wisp grove: pink mist, lanterns, three wisps dancing.
struct MineDioramaWispGrove: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.18, green: 0.08, blue: 0.24), Color(red: 0.04, green: 0.02, blue: 0.08)],
                startPoint: .top, endPoint: .bottom
            )
            MineHauntedMist(tint: Color(red: 0.9, green: 0.6, blue: 0.9))
            MineLanternGlow(color: .pink, seed: 73)
                .offset(x: -70, y: -30)
            MineLanternGlow(color: .pink, seed: 74)
                .offset(x: 70, y: -20)
            MineGhostSprite(kind: .wisp, size: 44)
                .offset(x: -40, y: 10)
            MineGhostSprite(kind: .wisp, size: 34)
                .offset(x: 30, y: -30)
            MineGhostSprite(kind: .wisp, size: 28)
                .offset(x: 75, y: 30)
            MineDarkWater(width: 230)
                .offset(y: 105)
            MineCaveShimmer(colors: [.pink, .white, .yellow], moteCount: 40)
            MineVignette(strength: 0.4)
        }
    }
}

/// Underground lake: black water, drips, orb reflections, shade rower.
struct MineDioramaLake: View {    @State private var ripple = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.06, green: 0.12, blue: 0.2), Color(red: 0.01, green: 0.03, blue: 0.07)],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color.black.opacity(0.6), height: 80, seed: 75)
                .frame(height: 140)
                .offset(y: -80)
            MineAnimatedOrb(color: .cyan, size: 36)
                .offset(x: -60, y: -20)
            MineAnimatedOrb(color: .blue, size: 28)
                .offset(x: 60, y: -30)
            // Wide water with traveling ripples.
            ZStack {
                MineDarkWater(width: 260)
                ForEach(0..<3, id: \.self) { i in
                    Ellipse()
                        .stroke(Color.cyan.opacity(0.5), lineWidth: 2)
                        .frame(width: ripple ? 120 + CGFloat(i) * 30 : 20, height: 16)
                        .opacity(ripple ? 0 : 0.8)
                        .animation(
                            .easeOut(duration: 2.4).repeatForever(autoreverses: false)
                                .delay(Double(i) * 0.5),
                            value: ripple
                        )
                }
            }
            .offset(y: 90)
            // Tiny rowboat with a shade.
            Text("🛶").font(.system(size: 34))
                .offset(x: ripple ? 40 : -40, y: 62)
                .animation(
                    .easeInOut(duration: 6).repeatForever(autoreverses: true),
                    value: ripple
                )
            MineGhostSprite(kind: .shade, size: 30)
                .offset(x: ripple ? 40 : -40, y: 34)
                .animation(
                    .easeInOut(duration: 6).repeatForever(autoreverses: true),
                    value: ripple
                )
            MineVignette(strength: 0.5)
        }
        .onAppear { ripple.toggle() }
    }
}

// ============================================================
// MARK: - 4. Entrance + magma heart + minis
// ============================================================

/// Mine entrance at golden hour: shaft house, rails, birds.
struct MineDioramaEntrance: View {
    @State private var flag = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.55, green: 0.42, blue: 0.28), Color(red: 0.16, green: 0.12, blue: 0.1)],
                startPoint: .top, endPoint: .bottom
            )
            // Shaft house silhouette.
            ZStack(alignment: .bottom) {
                Triangle()
                    .fill(Color(red: 0.2, green: 0.12, blue: 0.08))
                    .frame(width: 170, height: 90)
                    .offset(y: -40)
                Rectangle()
                    .fill(Color(red: 0.16, green: 0.1, blue: 0.07))
                    .frame(width: 130, height: 80)
                Rectangle()
                    .fill(Color(red: 1.0, green: 0.8, blue: 0.4).opacity(0.9))
                    .frame(width: 34, height: 52)
                    .shadow(color: .orange, radius: 14)
            }
            .offset(y: 10)
            // Pennant flag.
            Triangle()
                .fill(Color.orange)
                .frame(width: 22, height: 14)
                .offset(x: 20, y: -108)
                .rotationEffect(.degrees(flag ? 6 : -6), anchor: .leading)
                .animation(
                    .easeInOut(duration: 0.9).repeatForever(autoreverses: true),
                    value: flag
                )
                .onAppear { flag.toggle() }
            MineRailTrack()
                .offset(y: 95)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.white, .yellow],
                shapes: [.circle], flow: .drift, count: 16,
                gravity: 0, wind: 24, size: 2.0, life: 5.0, twinkle: true,
                flavor: ""
            ))
            MineVignette(strength: 0.35)
        }
    }
}

/// The magma heart: great lava lake, ember storm, wisp court.
struct MineDioramaMagmaHeart: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.45, green: 0.1, blue: 0.06), Color.black],
                startPoint: .top, endPoint: .bottom
            )
            MineRockBand(color: Color.black.opacity(0.8), height: 100, seed: 7)
                .frame(height: 160)
                .offset(y: -90)
            MineLavaGlow(seed: 51)
                .frame(height: 110)
                .offset(y: 70)
            MineGhostSprite(kind: .wisp, size: 40)
                .offset(x: -70, y: -40)
            MineGhostSprite(kind: .wisp, size: 32)
                .offset(x: 60, y: -60)
            MineGhostSprite(kind: .gloom, size: 60)
                .offset(y: -70)
            MineAnimatedOrb(color: .orange, size: 54)
                .offset(x: 0, y: 20)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.red, .orange],
                shapes: [.circle], flow: .rise, count: 50,
                gravity: -60, wind: 8, size: 2.6, life: 3.0, twinkle: true,
                flavor: ""
            ))
            MineVignette(strength: 0.45)
        }
    }
}

/// Compact layer diorama for codex rows + map cells (fixed height).
struct MineLayerDiorama: View {    var title: String

    var body: some View {
        Group {
            switch title {
            case "Sunlit Tops": MineDioramaMeadow()
            case "Dirt Tunnels": MineDioramaDirt()
            case "Stone Depths": MineDioramaStone()
            case "Deepstone": MineDioramaDeepstone()
            case "Crystal Hollows": MineDioramaCrystal()
            case "Magma Core": MineDioramaMagma()
            default: MineDioramaDirt()
            }
        }
        .frame(height: 130)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
    }
}

/// Payday parade scene: cart, marching coins, confetti sky.
struct MineDioramaPayday: View {
    @State private var march = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.2, green: 0.14, blue: 0.08), Color(red: 0.05, green: 0.03, blue: 0.03)],
                startPoint: .top, endPoint: .bottom
            )
            MineTimberFrame(width: 200, height: 90)
                .offset(y: 30)
            HStack(spacing: 8) {
                ForEach(0..<6, id: \.self) { i in
                    Text(["🪙", "💰"][i % 2])
                        .font(.title2)
                        .offset(y: march ? -14 : 6)
                        .animation(
                            .easeInOut(duration: 0.6).repeatForever(autoreverses: true)
                                .delay(Double(i) * 0.1),
                            value: march
                        )
                }
            }
            .offset(y: 40)
            Text("🛒").font(.system(size: 44))
                .offset(x: march ? 70 : -70, y: 30)
                .animation(
                    .easeInOut(duration: 2.2).repeatForever(autoreverses: true),
                    value: march
                )
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.yellow, .pink, .cyan],
                shapes: [.square, .star], flow: .fall, count: 30,
                gravity: 260, wind: 10, size: 2.6, life: 2.4, twinkle: true,
                flavor: ""
            ))
            MineVignette(strength: 0.4)
        }
        .onAppear { march.toggle() }
    }
}

/// Rebirth ascension scene: light pillar, rising miner silhouette, orbs.
struct MineDioramaRebirth: View {
    @State private var rise = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.16, green: 0.08, blue: 0.26), Color.black],
                startPoint: .top, endPoint: .bottom
            )
            // Light pillar.
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [.purple, .clear],
                        startPoint: .bottom, endPoint: .top
                    )
                )
                .frame(width: 70, height: 240)
                .blur(radius: 8)
                .offset(y: 20)
                .opacity(rise ? 1 : 0.3)
                .animation(
                    .easeInOut(duration: 2).repeatForever(autoreverses: true),
                    value: rise
                )
            // Rising silhouette.
            Text("⛏️")
                .font(.system(size: 44))
                .offset(y: rise ? -50 : 50)
                .opacity(rise ? 1 : 0.6)
                .animation(
                    .easeInOut(duration: 2).repeatForever(autoreverses: true),
                    value: rise
                )
            // Orbiting orbs.
            ForEach(0..<6, id: \.self) { i in
                Circle()
                    .fill(Color.purple)
                    .frame(width: 8, height: 8)
                    .offset(y: rise ? -80 : 40)
                    .rotationEffect(.degrees(rise ? Double(i) * 60 + 120 : Double(i) * 60))
                    .animation(
                        .spring(response: 0.9, dampingFraction: 0.65)
                            .delay(Double(i) * 0.08),
                        value: rise
                    )
            }
            MineCaveShimmer(colors: [.purple, .white], moteCount: 30)
            MineVignette(strength: 0.45)
        }
        .onAppear { rise.toggle() }
    }
}

// ============================================================
// MARK: - 5. Diorama showcase
// ============================================================

/// Diorama hall: every scene, labeled, in one scroll.
struct MineDioramaShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    dioramaCard(title: "⛏️ The Entrance", detail: "Golden hour at the shaft house. Every legend clocks in here.") {
                        MineDioramaEntrance()
                    }
                    dioramaCard(title: "🌿 Sunlit Tops", detail: "Daylight, dust, and the smell of opportunity.") {
                        MineDioramaMeadow()
                    }
                    dioramaCard(title: "🟫 Dirt Tunnels", detail: "The commute layer: lamps, rails, dust.") {
                        MineDioramaDirt()
                    }
                    dioramaCard(title: "🪨 Stone Depths", detail: "Cool lanterns and a shade on patrol.") {
                        MineDioramaStone()
                    }
                    dioramaCard(title: "⬛ Deepstone", detail: "Violet gloom and a wraith at home.") {
                        MineDioramaDeepstone()
                    }
                    dioramaCard(title: "🔮 Crystal Hollows", detail: "The full garden: cubes, spikes, orbs, one wisp.") {
                        MineDioramaCrystal()
                    }
                    dioramaCard(title: "🔥 Magma Core", detail: "Lava bed, ember storm, gloom weather.") {
                        MineDioramaMagma()
                    }
                    dioramaCard(title: "🟪 Cube Room", detail: "Grid floors, timber arch, keeper on duty.") {
                        MineDioramaCubeRoom()
                    }
                    dioramaCard(title: "🔺 Spike Room", detail: "Stalactites, drips, one poltergeist mid-tantrum.") {
                        MineDioramaSpikeRoom()
                    }
                    dioramaCard(title: "🔮 Orb Room", detail: "Floating constellation over black water.") {
                        MineDioramaOrbRoom()
                    }
                    dioramaCard(title: "🌋 The Magma Heart", detail: "The bottom of the world, breathing.") {
                        MineDioramaMagmaHeart()
                    }
                    dioramaCard(title: "🔨 The Forge", detail: "Hammer falls, sparks fly, picks are born.") {
                        MineDioramaForge()
                    }
                    dioramaCard(title: "💰 The Vault", detail: "Coin mountains and gem boulders. Bring a bigger pack.") {
                        MineDioramaVault()
                    }
                    dioramaCard(title: "✨ Wisp Grove", detail: "Pink mist, lanterns, three dancing rumors.") {
                        MineDioramaWispGrove()
                    }
                    dioramaCard(title: "🌊 Underground Lake", detail: "Black water, traveling ripples, one shade in a boat.") {
                        MineDioramaLake()
                    }
                    dioramaCard(title: "🛒 Payday Parade", detail: "Marching coins and the happiest cart alive.") {
                        MineDioramaPayday()
                    }
                    dioramaCard(title: "💫 Rebirth Ascension", detail: "Light pillar, rising miner, orbiting orbs.") {
                        MineDioramaRebirth()
                    }
                }
                .padding(.vertical, 12)
            }
            .navigationTitle("Diorama Hall")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func dioramaCard<Content: View>(title: String, detail: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline).padding(.horizontal)
            content()
                .frame(height: 240)
                .cornerRadius(14)
                .padding(.horizontal)
            Text(detail)
                .font(.caption).foregroundStyle(.secondary)
                .padding(.horizontal)
        }
    }
}
