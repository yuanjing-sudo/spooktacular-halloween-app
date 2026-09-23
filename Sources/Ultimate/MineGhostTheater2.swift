//
//  MineGhostTheater2.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Advanced ghost effects, act two: swinging chains, possession shimmer,
//  the midnight parade, six signature moves (one per kind), animated
//  portrait cards, name banners and a grand showcase. Companions the
//  base theater file — same models, wilder staging.
//

import SwiftUI

// ============================================================
// MARK: - 1. Chains (pendulum physics look)
// ============================================================

/// A swinging chain: N links trailing a pivot with staggered phase lag.
/// Reads like pendulum physics, costs one state bool.
struct MineGhostChain: View {
    var links = 7
    var tint: Color = Color(white: 0.7)
    @State private var swing = false

    var body: some View {
        VStack(spacing: 0) {
            // Shackle.
            Circle()
                .stroke(tint, lineWidth: 3)
                .frame(width: 16, height: 16)
            // Links with progressive lag + amplitude.
            ForEach(0..<links, id: \.self) { i in
                RoundedRectangle(cornerRadius: 5)
                    .stroke(tint.opacity(1 - Double(i) * 0.09), lineWidth: 3)
                    .frame(width: 14, height: 20)
                    .offset(x: swing ? CGFloat(4 + i * 3) : CGFloat(-4 - i * 3))
                    .rotationEffect(.degrees(swing ? Double(6 + i * 2) : Double(-6 - i * 2)))
                    .animation(
                        .easeInOut(duration: 1.4).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.09),
                        value: swing
                    )
            }
        }
        .onAppear { swing.toggle() }
    }
}

/// Wraith dragging two chains: the classic entrance.
struct MineChainedWraith: View {
    @State private var bob = false

    var body: some View {
        ZStack {
            MineGhostChain(links: 6)
                .offset(x: -44, y: 30)
                .rotationEffect(.degrees(14))
            MineGhostChain(links: 8)
                .offset(x: 44, y: 34)
                .rotationEffect(.degrees(-12))
            MineGhostSprite(kind: .wraith, size: 84)
        }
        .offset(y: bob ? -8 : 8)
        .animation(
            .easeInOut(duration: 2.0).repeatForever(autoreverses: true),
            value: bob
        )
        .onAppear { bob.toggle() }
    }
}

// ============================================================
// MARK: - 2. Possession shimmer overlay
// ============================================================

/// Possession shimmer: hue-cycling vignette + floating runes + heartbeat.
/// Sits over any screen during spooky moments. Tap to banish.
struct MinePossessionShimmer: View {
    var active: Bool
    var onBanish: () -> Void = {}
    @State private var throb = false

    var body: some View {
        ZStack {
            // Hue-cycling edge glow.
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.purple.opacity(throb && active ? 0.9 : 0.0), lineWidth: 8)
                .hueRotation(.degrees(throb ? 60 : 0))
                .scaleEffect(throb && active ? 1.0 : 0.97)
                .animation(
                    active ? .easeInOut(duration: 1.1).repeatForever(autoreverses: true) : .default,
                    value: throb
                )
            // Floating runes.
            if active {
                ForEach(0..<6, id: \.self) { i in
                    Text(["ᚱ", "ᚦ", "ᚨ", "ᛚ", "ᛟ", "ᛞ"][i])
                        .font(.title)
                        .foregroundColor(.purple.opacity(0.8))
                        .offset(runeOffset(i))
                        .opacity(throb ? 1 : 0.3)
                        .scaleEffect(throb ? 1.15 : 0.9)
                        .animation(
                            .easeInOut(duration: 1.4).repeatForever(autoreverses: true)
                                .delay(Double(i) * 0.18),
                            value: throb
                        )
                }
            }
        }
        .onChange(of: active) { _, new in
            if new {
                throb = true
                SpookyHaptics.play(.warning)
            } else {
                throb = false
            }
        }
        .onTapGesture {
            if active { onBanish() }
        }
        .allowsHitTesting(active)
    }

    private func runeOffset(_ i: Int) -> CGSize {
        let spots = [
            CGSize(width: -110, height: -160), CGSize(width: 110, height: -150),
            CGSize(width: -130, height: 0), CGSize(width: 130, height: 10),
            CGSize(width: -100, height: 160), CGSize(width: 105, height: 165),
        ]
        return spots[i % spots.count]
    }
}

// ============================================================
// MARK: - 3. Midnight parade
// ============================================================

/// Six ghosts marching in formation with staggered bobs, lanterns lit,
/// chains dragging. Loops forever; tap a marcher to startle it.
struct MineMidnightParade: View {
    var onStartle: (MineGhostKind) -> Void = { _ in }
    @State private var march = false

    var body: some View {
        VStack(spacing: 0) {
            // Moon.
            Circle()
                .fill(
                    RadialGradient(
                        colors: [.white, Color(red: 0.9, green: 0.9, blue: 0.7).opacity(0.2)],
                        center: .center, startRadius: 4, endRadius: 40
                    )
                )
                .frame(width: 80, height: 80)
                .offset(y: 10)
            // Marchers.
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(Array(MineGhostKind.allCases.enumerated()), id: \.offset) { i, kind in
                    Button(action: { onStartle(kind) }) {
                        MineGhostSprite(kind: kind, size: 44 + CGFloat((i * 13) % 20))
                            .offset(y: march ? -10 : 6)
                            .rotationEffect(.degrees(march ? 4 : -4))
                            .animation(
                                .easeInOut(duration: 0.9).repeatForever(autoreverses: true)
                                    .delay(Double(i) * 0.15),
                                value: march
                            )
                    }
                }
            }
            .offset(y: 10)
            // Ground fog.
            MineHauntedMist(tint: Color(red: 0.6, green: 0.6, blue: 0.9))
                .frame(height: 60)
                .offset(y: -6)
        }
        .padding(.vertical, 8)
        .background(
            LinearGradient(
                colors: [Color(red: 0.05, green: 0.04, blue: 0.12), Color(red: 0.1, green: 0.08, blue: 0.18)],
                startPoint: .top, endPoint: .bottom
            )
        )
        .cornerRadius(16)
        .onAppear { march.toggle() }
    }
}

// ============================================================
// MARK: - 4. Signature moves (one per kind)
// ============================================================

/// Wisp spiral dance: corkscrewing ascent with spark wake.
struct MineWispDance: View {
    @State private var dance = false

    var body: some View {
        ZStack {
            // Spiral guide glow.
            Ellipse()
                .stroke(Color.yellow.opacity(0.3), lineWidth: 2)
                .frame(width: 110, height: 200)
                .rotationEffect(.degrees(dance ? 180 : 0))
                .animation(
                    .linear(duration: 6).repeatForever(autoreverses: false),
                    value: dance
                )
            MineGhostSprite(kind: .wisp, size: 52)
                .offset(
                    x: dance ? 40 : -40,
                    y: dance ? -80 : 80
                )
                .rotationEffect(.degrees(dance ? 360 : 0))
                .animation(
                    .easeInOut(duration: 4).repeatForever(autoreverses: true),
                    value: dance
                )
            // Spark wake.
            ForEach(0..<6, id: \.self) { i in
                Circle()
                    .fill(Color.yellow)
                    .frame(width: 5, height: 5)
                    .offset(
                        x: dance ? -30 + CGFloat(i) * 12 : 30 - CGFloat(i) * 12,
                        y: dance ? 60 - CGFloat(i) * 22 : -60 + CGFloat(i) * 22
                    )
                    .opacity(dance ? 0.9 : 0.2)
                    .animation(
                        .easeInOut(duration: 4).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.1),
                        value: dance
                    )
            }
        }
        .frame(height: 240)
        .onAppear { dance.toggle() }
    }
}

/// Shade split-and-merge: one shade becomes three, then one again.
struct MineShadeSplit: View {
    @State private var split = false

    var body: some View {
        ZStack {
            ForEach(-1...1, id: \.self) { i in
                MineGhostSprite(kind: .shade, size: 48)
                    .offset(x: split ? CGFloat(i) * 52 : 0)
                    .opacity(split ? (i == 0 ? 1.0 : 0.75) : 1.0)
                    .scaleEffect(split ? (i == 0 ? 1.0 : 0.85) : 1.0)
                    .animation(
                        .spring(response: 0.7, dampingFraction: 0.6),
                        value: split
                    )
            }
        }
        .frame(height: 170)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 3.2, repeats: true) { _ in
                split.toggle()
            }
        }
    }
}

/// Wraith spiral ascent: rising corkscrew with gathering rings.
struct MineWraithAscent: View {
    @State private var climb = false

    var body: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { i in
                Ellipse()
                    .stroke(Color.cyan.opacity(0.35), lineWidth: 2)
                    .frame(width: 120 - CGFloat(i) * 24, height: 26)
                    .offset(y: CGFloat(50 - i * 45))
                    .opacity(climb ? 0.9 : 0.25)
                    .animation(
                        .easeInOut(duration: 3).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.3),
                        value: climb
                    )
            }
            MineGhostSprite(kind: .wraith, size: 64)
                .offset(x: climb ? 26 : -26, y: climb ? -70 : 60)
                .rotationEffect(.degrees(climb ? 540 : 0))
                .animation(
                    .easeInOut(duration: 3).repeatForever(autoreverses: true),
                    value: climb
                )
        }
        .frame(height: 260)
        .onAppear { climb.toggle() }
    }
}

/// Poltergeist tantrum: screen shake, pebble storm, flashing eyes.
struct MinePoltergeistTantrum: View {
    @State private var tantrum = false

    var body: some View {
        ZStack {
            MineGhostSprite(kind: .poltergeist, size: 76, wailing: tantrum)
                .offset(x: tantrum ? 10 : -10)
                .rotationEffect(.degrees(tantrum ? -8 : 8))
                .animation(
                    .easeInOut(duration: 0.28).repeatForever(autoreverses: true),
                    value: tantrum
                )
            // Pebble storm.
            ForEach(0..<10, id: \.self) { i in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.gray)
                    .frame(width: 9, height: 7)
                    .offset(pebbleOffset(i))
                    .rotationEffect(.degrees(tantrum ? Double(i) * 40 : 0))
                    .opacity(tantrum ? 1 : 0)
                    .animation(
                        .easeInOut(duration: 0.5).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.05),
                        value: tantrum
                    )
            }
            MineWailRings(kind: .poltergeist, firing: tantrum)
        }
        .frame(height: 220)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 4.0, repeats: true) { _ in
                tantrum.toggle()
                if tantrum { SpookyHaptics.play(.heavy) }
            }
        }
    }

    private func pebbleOffset(_ i: Int) -> CGSize {
        let angle = Double(i) / 10 * 2 * Double.pi
        if tantrum {
            return CGSize(width: cos(angle) * 85, height: sin(angle) * 70)
        }
        return CGSize(width: cos(angle) * 30, height: sin(angle) * 24)
    }
}

/// Lantern-lighting ceremony: keeper lights three lanterns in sequence.
struct MineLanternCeremony: View {
    @State private var lit = 0

    var body: some View {
        VStack(spacing: 14) {
            HStack(spacing: 30) {
                ForEach(0..<3, id: \.self) { i in
                    VStack(spacing: 4) {
                        Text("🏮")
                            .font(.system(size: 40))
                            .opacity(lit > i ? 1 : 0.25)
                            .scaleEffect(lit > i ? 1.15 : 0.9)
                            .shadow(color: lit > i ? .orange : .clear, radius: lit > i ? 12 : 0)
                            .animation(.spring(response: 0.5, dampingFraction: 0.55), value: lit)
                        Circle()
                            .fill(lit > i ? Color.orange : Color.gray.opacity(0.4))
                            .frame(width: 8, height: 8)
                    }
                }
            }
            MineGhostSprite(kind: .lanternKeeper, size: 56)
            Text(lit >= 3 ? "All lanterns lit. The tunnels approve." : "The keeper makes its rounds…")
                .font(.caption).foregroundStyle(.secondary)
        }
        .frame(height: 260)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.4, repeats: true) { _ in
                lit = (lit + 1) % 4
                if lit > 0 { SpookyHaptics.play(.light) }
            }
        }
    }
}

/// Gloom rain: a personal weather system following one sad cloud-ghost.
struct MineGloomRain: View {
    @State private var drift = false

    var body: some View {
        ZStack {
            MineGhostSprite(kind: .gloom, size: 72)
                .offset(x: drift ? 50 : -50)
                .animation(
                    .easeInOut(duration: 5).repeatForever(autoreverses: true),
                    value: drift
                )
            // Rain sheet under the ghost.
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    let gx = Double(size.width) / 2 + (drift ? 50 : -50)
                    for i in 0..<26 {
                        let life = fmod(t * 0.9 + Double(i) * 0.17, 1.0)
                        let x = gx - 40 + fmod(Double(i) * 37.7, 80.0)
                        let y = 90 + life * (Double(size.height) - 100)
                        context.opacity = (1 - life) * 0.7
                        context.fill(
                            Capsule().path(in: CGRect(x: x - 1, y: y - 6, width: 2, height: 12)),
                            with: .color(.blue)
                        )
                    }
                }
            }
        }
        .frame(height: 260)
        .onAppear { drift.toggle() }
    }
}

// ============================================================
// MARK: - 5. Portrait cards + name banners
// ============================================================

/// Framed portrait with animated gilt border + kind seal.
struct MineGhostPortrait: View {
    var kind: MineGhostKind
    @State private var sheen = false

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(
                        LinearGradient(
                            colors: [Color(red: 0.16, green: 0.1, blue: 0.2), Color.black],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .frame(width: 150, height: 190)
                RoundedRectangle(cornerRadius: 18)
                    .stroke(
                        LinearGradient(
                            colors: [.yellow.opacity(0.9), kind.tint, .yellow.opacity(0.9)],
                            startPoint: sheen ? .topLeading : .bottomTrailing,
                            endPoint: sheen ? .bottomTrailing : .topLeading
                        ),
                        lineWidth: 3
                    )
                    .frame(width: 150, height: 190)
                    .animation(
                        .easeInOut(duration: 2.6).repeatForever(autoreverses: true),
                        value: sheen
                    )
                MineGhostSprite(kind: kind, size: 64)
                    .offset(y: -8)
                Text(kind.emoji)
                    .font(.caption)
                    .padding(4)
                    .background(Circle().fill(Color.black.opacity(0.6)))
                    .offset(x: 52, y: -72)
            }
            Text(kind.title).font(.headline)
            Text(kind.flavor)
                .font(.caption).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(width: 150)
        }
        .onAppear { sheen.toggle() }
    }
}

/// Waving name banner for the featured haunt.
struct MineGhostBanner: View {
    var kind: MineGhostKind
    @State private var wave = false

    var body: some View {
        HStack(spacing: 10) {
            Text(kind.emoji).font(.largeTitle)
            VStack(alignment: .leading, spacing: 2) {
                Text("NOW HAUNTING").font(.caption2.bold()).foregroundColor(.purple)
                Text(kind.title).font(.title2.bold())
            }
            Spacer()
            MineWailRings(kind: kind, firing: wave)
                .frame(width: 60, height: 60)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.07))
        )
        .rotationEffect(.degrees(wave ? 0.8 : -0.8))
        .animation(
            .easeInOut(duration: 2).repeatForever(autoreverses: true),
            value: wave
        )
        .onAppear { wave.toggle() }
    }
}

/// Grand chorus: all nine kinds wailing in a round, conductor wisp.
struct MineGrandChorus: View {
    @State private var beat = 0

    var body: some View {
        VStack(spacing: 8) {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(Array(MineGhostKind.allCases.enumerated()), id: \.offset) { i, kind in
                    MineGhostSprite(kind: kind, size: 44, wailing: beat % 9 == i)
                        .scaleEffect(beat % 9 == i ? 1.2 : 0.92)
                        .animation(.spring(response: 0.4, dampingFraction: 0.55), value: beat)
                        .frame(height: 90)
                }
            }
            MineGhostSprite(kind: .wisp, size: 40)
            Text("Grand chorus — nine voices, one round")
                .font(.caption).foregroundStyle(.secondary)
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 0.55, repeats: true) { _ in
                beat = (beat + 1) % 9
                if beat == 0 { SpookyHaptics.play(.light) }
            }
        }
    }
}

// ============================================================
// MARK: - 6. Grand showcase
// ============================================================

/// Act-two showcase: chains, possession demo, parade, six signature
/// moves, portraits, banners.
struct MineGhostTheater2ShowcaseView: View {
    @State private var possessed = false
    @State private var curtain = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("⛓️ Chained wraith").font(.headline)
                        MineChainedWraith()
                            .frame(height: 220)
                    }
                    VStack(spacing: 8) {
                        Text("🌀 Possession shimmer (tap to banish)").font(.headline)
                        ZStack {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color(red: 0.1, green: 0.08, blue: 0.16))
                                .frame(height: 300)
                            MineGhostSprite(kind: .shade, size: 72)
                            MinePossessionShimmer(active: possessed) {
                                possessed = false
                            }
                        }
                        .padding(.horizontal)
                        Toggle("Preview possession", isOn: $possessed)
                            .padding(.horizontal, 40)
                    }
                    VStack(spacing: 8) {
                        Text("🌙 Midnight parade (tap a marcher)").font(.headline)
                        MineMidnightParade(onStartle: { _ in SpookyHaptics.play(.warning) })
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("✨ Wisp spiral dance").font(.headline)
                        MineWispDance()
                    }
                    VStack(spacing: 8) {
                        Text("🌫️ Shade split-and-merge").font(.headline)
                        MineShadeSplit()
                    }
                    VStack(spacing: 8) {
                        Text("👻 Wraith spiral ascent").font(.headline)
                        MineWraithAscent()
                    }
                    VStack(spacing: 8) {
                        Text("🌀 Poltergeist tantrum").font(.headline)
                        MinePoltergeistTantrum()
                    }
                    VStack(spacing: 8) {
                        Text("🏮 Lantern ceremony").font(.headline)
                        MineLanternCeremony()
                    }
                    VStack(spacing: 8) {
                        Text("🌧️ Gloom rain").font(.headline)
                        MineGloomRain()
                    }
                    VStack(spacing: 8) {
                        Text("🎼 Grand chorus").font(.headline)
                        Text("All nine kinds wailing in a round.").font(.caption).foregroundStyle(.secondary)
                        MineGrandChorus()
                    }
                    VStack(spacing: 8) {
                        Text("🖼️ Portraits").font(.headline)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 14) {
                                ForEach(MineGhostKind.allCases, id: \.self) { kind in
                                    MineGhostPortrait(kind: kind)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    VStack(spacing: 8) {
                        Text("📯 Banners").font(.headline)
                        ForEach(MineGhostKind.allCases, id: \.self) { kind in
                            MineGhostBanner(kind: kind)
                                .padding(.horizontal)
                        }
                    }
                    VStack(spacing: 8) {
                        Text("🎭 Curtain call").font(.headline)
                        Text("The full cast of nine takes a bow.").font(.caption).foregroundStyle(.secondary)
                        HStack(spacing: 2) {
                            ForEach(Array(MineGhostKind.allCases.enumerated()), id: \.offset) { i, kind in
                                MineGhostSprite(kind: kind, size: 34)
                                    .rotationEffect(.degrees(curtain ? 14 : 0), anchor: .bottom)
                                    .offset(y: curtain ? 6 : 0)
                                    .animation(
                                        .easeInOut(duration: 0.9).repeatForever(autoreverses: true)
                                            .delay(Double(i) * 0.12),
                                        value: curtain
                                    )
                            }
                        }
                        MineShimmerText(text: "✨ THE END ✨")
                    }
                    .onAppear { curtain.toggle() }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Ghost Theater II")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
