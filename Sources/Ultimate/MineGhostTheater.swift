//
//  MineGhostTheater.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Ghost animation theater for the Abandoned Mine: high-resolution,
//  from-scratch SwiftUI animations built on declarative modifiers
//  (.scaleEffect, .opacity, .rotationEffect, .blur, .hueRotation) and the
//  modern PhaseAnimator. Six ghost kinds, wail shockwaves, ectoplasm
//  trails, haunted mist, spectral glow, encounter cards, a radar, an
//  ambient overlay and a full showcase gallery.
//
//  Pure view layer + tiny models. Nothing here affects gameplay state.
//

import SwiftUI

// ============================================================
// MARK: - 1. Ghost kinds, phases, actors, director
// ============================================================

/// The six haunting kinds. Each gets its own sprite, eyes, wail and trail.
enum MineGhostKind: String, CaseIterable {
    case wisp, shade, wraith, poltergeist, lanternKeeper, gloom
    case partyGhost, sleepyBat, mossSpirit

    var title: String {
        switch self {
        case .wisp: return "Wisp"
        case .shade: return "Shade"
        case .wraith: return "Wraith"
        case .poltergeist: return "Poltergeist"
        case .lanternKeeper: return "Lantern Keeper"
        case .gloom: return "Gloom"
        case .partyGhost: return "Party Ghost"
        case .sleepyBat: return "Sleepy Bat"
        case .mossSpirit: return "Moss Spirit"
        }
    }

    var emoji: String {
        switch self {
        case .wisp: return "✨"
        case .shade: return "🌫️"
        case .wraith: return "👻"
        case .poltergeist: return "🌀"
        case .lanternKeeper: return "🏮"
        case .gloom: return "🌑"
        case .partyGhost: return "🎉"
        case .sleepyBat: return "🦇"
        case .mossSpirit: return "🌿"
        }
    }

    /// Body tint per kind.
    var tint: Color {
        switch self {
        case .wisp: return Color(red: 1.0, green: 0.85, blue: 0.4)
        case .shade: return Color(red: 0.6, green: 0.65, blue: 0.8)
        case .wraith: return Color(red: 0.75, green: 0.9, blue: 1.0)
        case .poltergeist: return Color(red: 0.7, green: 0.5, blue: 1.0)
        case .lanternKeeper: return Color(red: 1.0, green: 0.6, blue: 0.25)
        case .gloom: return Color(red: 0.25, green: 0.2, blue: 0.45)
        case .partyGhost: return Color(red: 1.0, green: 0.5, blue: 0.75)
        case .sleepyBat: return Color(red: 0.4, green: 0.35, blue: 0.6)
        case .mossSpirit: return Color(red: 0.35, green: 0.75, blue: 0.4)
        }
    }

    /// Ambient float amplitude (points).
    var floatAmplitude: CGFloat {
        switch self {
        case .wisp: return 14
        case .shade: return 8
        case .wraith: return 12
        case .poltergeist: return 18
        case .lanternKeeper: return 6
        case .gloom: return 10
        case .partyGhost: return 16
        case .sleepyBat: return 5
        case .mossSpirit: return 9
        }
    }

    /// Ambient float period (seconds).
    var floatPeriod: Double {
        switch self {
        case .wisp: return 1.6
        case .shade: return 2.6
        case .wraith: return 2.0
        case .poltergeist: return 1.2
        case .lanternKeeper: return 3.0
        case .gloom: return 2.4
        case .partyGhost: return 1.0
        case .sleepyBat: return 3.4
        case .mossSpirit: return 2.2
        }
    }

    var flavor: String {
        switch self {
        case .wisp: return "A rumor with a halo. Pays in gold, vanishes in giggles."
        case .shade: return "Folded gloom that forgot how to be scary. Tries anyway."
        case .wraith: return "Classic sheet, upgraded reproach. Rattles chains it knitted itself."
        case .poltergeist: return "Throws pebbles, moves helmets, denies everything. Chaotic neutral."
        case .lanternKeeper: return "Tends the dead lanterns. Tips its cap to miners. Has no cap."
        case .gloom: return "Weather, but personal. Follows you until you compliment its aura."
        case .partyGhost: return "Haunts celebrations. Throws confetti, catches compliments."
        case .sleepyBat: return "Naps hanging upside down. Snores in squeaks. Dreams in squares."
        case .mossSpirit: return "A garden that learned to float. Smells like rain. Hums like moss."
        }
    }
}

/// Event phases for the full scare sequence.
enum MineGhostPhase: CaseIterable {
    case lurking, rising, wailing, darting, fading
}

/// A ghost actor: pure animation data (no gameplay).
struct MineGhostActor: Identifiable {
    let id = UUID()
    var kind: MineGhostKind
    var size: CGFloat = 64
    var speed: Double = 1.0
    var phase: MineGhostPhase = .lurking
    var seed: Double = Double.random(in: 0...1000)
}

/// Ambient director: spawns decorative actors and fires scares.
/// Views observe it; the game loop never has to.
final class MineGhostDirector: ObservableObject {
    @Published private(set) var actors: [MineGhostActor] = []
    @Published private(set) var scares: Int = 0
    let maxActors = 8

    func populate() {
        guard actors.isEmpty else { return }
        for kind in MineGhostKind.allCases {
            actors.append(MineGhostActor(kind: kind, size: CGFloat.random(in: 48...84)))
        }
        while actors.count < maxActors {
            let kind = MineGhostKind.allCases.randomElement()!
            actors.append(MineGhostActor(kind: kind, size: CGFloat.random(in: 40...72)))
        }
    }

    func startleAll() {
        scares += 1
        for i in actors.indices {
            actors[i].phase = .wailing
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { [weak self] in
            guard let self = self else { return }
            for i in self.actors.indices {
                self.actors[i].phase = .lurking
            }
        }
    }

    func startle(id: UUID) {
        guard let i = actors.firstIndex(where: { $0.id == id }) else { return }
        scares += 1
        actors[i].phase = .wailing
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { [weak self] in
            guard let self = self, self.actors.indices.contains(i) else { return }
            self.actors[i].phase = .lurking
        }
    }

    func clear() {
        actors.removeAll()
    }
}

// ============================================================
// MARK: - 2. Ghost sprites (one per kind)
// ============================================================

/// Shared body shell: soft radial glow + sheet body + wavy hem.
/// Children inject kind-specific faces and props.
struct MineGhostBody: View {
    var kind: MineGhostKind
    var size: CGFloat
    @State private var floating = false

    var body: some View {
        ZStack {
            // Halo glow.
            Circle()
                .fill(
                    RadialGradient(
                        colors: [kind.tint.opacity(0.55), kind.tint.opacity(0.0)],
                        center: .center, startRadius: size * 0.1, endRadius: size * 0.75
                    )
                )
                .frame(width: size * 1.5, height: size * 1.5)
                .opacity(floating ? 0.9 : 0.6)
                .animation(
                    .easeInOut(duration: kind.floatPeriod).repeatForever(autoreverses: true),
                    value: floating
                )
            // Sheet body.
            MineGhostSheet(kind: kind, size: size)
        }
        .offset(y: floating ? -kind.floatAmplitude : kind.floatAmplitude)
        .animation(
            .easeInOut(duration: kind.floatPeriod).repeatForever(autoreverses: true),
            value: floating
        )
        .onAppear { floating.toggle() }
    }
}

/// The sheet itself: rounded head, tapered body, scalloped hem.
struct MineGhostSheet: View {
    var kind: MineGhostKind
    var size: CGFloat

    var body: some View {
        ZStack(alignment: .top) {
            // Main sheet.
            UnevenRoundedRectangle(
                topLeadingRadius: size * 0.5, bottomLeadingRadius: size * 0.12,
                bottomTrailingRadius: size * 0.12, topTrailingRadius: size * 0.5
            )
            .fill(
                LinearGradient(
                    colors: [Color.white.opacity(0.95), kind.tint.opacity(0.75)],
                    startPoint: .top, endPoint: .bottom
                )
            )
            .frame(width: size, height: size * 1.25)
            // Hem scallops.
            HStack(spacing: -size * 0.04) {
                ForEach(0..<4, id: \.self) { _ in
                    Circle()
                        .fill(kind.tint.opacity(0.75))
                        .frame(width: size * 0.28, height: size * 0.28)
                        .offset(y: size * 0.1)
                }
            }
            .offset(y: size * 1.08)
        }
    }
}

/// Full sprite per kind: body + face + prop.
struct MineGhostSprite: View {
    var kind: MineGhostKind
    var size: CGFloat = 64
    var wailing: Bool = false
    @State private var squash = false

    var body: some View {
        ZStack {
            MineGhostBody(kind: kind, size: size)
            MineGhostFace(kind: kind, size: size, wailing: wailing)
                .offset(y: -size * 0.18)
            MineGhostProp(kind: kind, size: size)
        }
        // Wail squash-and-stretch.
        .scaleEffect(x: wailing ? 1.18 : 1.0, y: wailing ? 0.86 : 1.0)
        .animation(.spring(response: 0.35, dampingFraction: 0.45), value: wailing)
        // Idle breathing.
        .scaleEffect(squash ? 1.03 : 0.98)
        .animation(
            .easeInOut(duration: 2.2).repeatForever(autoreverses: true),
            value: squash
        )
        .onAppear { squash.toggle() }
    }
}

// ============================================================
// MARK: - 3. Faces (eyes that blink, mouths that wail)
// ============================================================

/// Per-kind face: blinking eyes + mouth that opens on wail.
struct MineGhostFace: View {
    var kind: MineGhostKind
    var size: CGFloat
    var wailing: Bool
    @State private var blink = false

    var body: some View {
        VStack(spacing: size * 0.08) {
            HStack(spacing: size * 0.16) {
                MineGhostEye(kind: kind, size: size * 0.13, blink: blink)
                MineGhostEye(kind: kind, size: size * 0.13, blink: blink)
            }
            // Mouth: dot at rest, oval scream on wail.
            Group {
                if wailing {
                    Ellipse()
                        .fill(Color.black.opacity(0.85))
                        .frame(width: size * 0.2, height: size * 0.3)
                        .transition(.scale.combined(with: .opacity))
                } else {
                    Circle()
                        .fill(Color.black.opacity(0.7))
                        .frame(width: size * 0.09, height: size * 0.09)
                }
            }
            .animation(.spring(response: 0.3, dampingFraction: 0.5), value: wailing)
        }
        .onAppear {
            // Staggered blinking loop.
            Timer.scheduledTimer(withTimeInterval: 2.8, repeats: true) { _ in
                blink = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.14) {
                    blink = false
                }
            }
        }
    }
}

/// One eye: white glow, dark pupil, lid blink via scaleY.
struct MineGhostEye: View {
    var kind: MineGhostKind
    var size: CGFloat
    var blink: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.white)
                .frame(width: size * 2, height: size * 2)
                .shadow(color: kind.tint, radius: 4)
            Circle()
                .fill(eyeColor)
                .frame(width: size, height: size)
                // Pupil darts on wail via offset handled by parent scale.
        }
        .scaleEffect(y: blink ? 0.08 : 1.0)
        .animation(.easeInOut(duration: 0.12), value: blink)
    }

    private var eyeColor: Color {
        switch kind {
        case .wisp: return .orange
        case .shade: return .gray
        case .wraith: return .blue
        case .poltergeist: return .purple
        case .lanternKeeper: return .red
        case .gloom: return .black
        case .partyGhost: return .pink
        case .sleepyBat: return .brown
        case .mossSpirit: return .green
        }
    }
}

/// Kind props: wisp halo, keeper lantern, poltergeist pebbles, gloom cloud.
struct MineGhostProp: View {
    var kind: MineGhostKind
    var size: CGFloat
    @State private var spin = false

    var body: some View {
        Group {
            switch kind {
            case .wisp:
                // Orbiting spark halo.
                ZStack {
                    ForEach(0..<6, id: \.self) { i in
                        Circle()
                            .fill(Color.yellow)
                            .frame(width: 5, height: 5)
                            .offset(y: -size * 0.62)
                            .rotationEffect(.degrees(Double(i) * 60))
                    }
                }
                .rotationEffect(.degrees(spin ? 360 : 0))
                .animation(
                    .linear(duration: 6).repeatForever(autoreverses: false),
                    value: spin
                )
                .onAppear { spin.toggle() }
            case .lanternKeeper:
                // Swinging lantern.
                VStack(spacing: 0) {
                    Rectangle()
                        .fill(Color.gray)
                        .frame(width: 2, height: size * 0.2)
                    Text("🏮")
                        .font(.system(size: size * 0.34))
                }
                .offset(x: size * 0.42, y: size * 0.1)
                .rotationEffect(.degrees(spin ? 12 : -12), anchor: .top)
                .animation(
                    .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                    value: spin
                )
                .onAppear { spin.toggle() }
            case .poltergeist:
                // Orbiting pebbles.
                ZStack {
                    ForEach(0..<3, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.gray)
                            .frame(width: 8, height: 6)
                            .offset(y: -size * 0.7)
                            .rotationEffect(.degrees(Double(i) * 120))
                    }
                }
                .rotationEffect(.degrees(spin ? -360 : 0))
                .animation(
                    .linear(duration: 4).repeatForever(autoreverses: false),
                    value: spin
                )
                .onAppear { spin.toggle() }
            case .gloom:
                // Brooding cloud cap.
                Ellipse()
                    .fill(Color.black.opacity(0.4))
                    .frame(width: size * 1.1, height: size * 0.3)
                    .offset(y: -size * 0.52)
                    .blur(radius: 3)
            case .partyGhost:
                // Party hat + confetti dot.
                ZStack {
                    Triangle()
                        .fill(Color.pink)
                        .frame(width: size * 0.3, height: size * 0.34)
                        .offset(y: -size * 0.58)
                    Circle()
                        .fill(Color.yellow)
                        .frame(width: 8, height: 8)
                        .offset(y: -size * 0.78)
                    HStack(spacing: 3) {
                        Circle().fill(Color.cyan).frame(width: 5, height: 5)
                        Circle().fill(Color.yellow).frame(width: 5, height: 5)
                        Circle().fill(Color.pink).frame(width: 5, height: 5)
                    }
                    .offset(x: size * 0.42, y: -size * 0.3)
                }
            case .sleepyBat:
                // Nightcap + "Z" drift.
                ZStack {
                    Capsule()
                        .fill(Color.blue.opacity(0.85))
                        .frame(width: size * 0.4, height: size * 0.2)
                        .offset(x: -size * 0.1, y: -size * 0.52)
                        .rotationEffect(.degrees(-14))
                    Circle()
                        .fill(Color.white)
                        .frame(width: size * 0.12, height: size * 0.12)
                        .offset(x: -size * 0.28, y: -size * 0.46)
                    Text("Z")
                        .font(.system(size: size * 0.22, weight: .bold))
                        .foregroundColor(Color.white.opacity(0.8))
                        .offset(x: size * 0.44, y: -size * 0.5)
                }
            case .mossSpirit:
                // Leafy crown + vine pemdants.
                ZStack {
                    HStack(spacing: 2) {
                        ForEach(0..<5, id: \.self) { i in
                            Ellipse()
                                .fill(Color(red: 0.3, green: 0.65, blue: 0.35))
                                .frame(width: size * 0.14, height: size * 0.22)
                                .rotationEffect(.degrees(Double(i * 18 - 36)))
                        }
                    }
                    .offset(y: -size * 0.52)
                    Capsule()
                        .fill(Color(red: 0.3, green: 0.6, blue: 0.3))
                        .frame(width: 6, height: size * 0.3)
                        .offset(x: -size * 0.42, y: -size * 0.2)
                    Capsule()
                        .fill(Color(red: 0.3, green: 0.6, blue: 0.3))
                        .frame(width: 6, height: size * 0.24)
                        .offset(x: size * 0.42, y: -size * 0.22)
                }
            case .shade, .wraith:
                EmptyView()
            }
        }
    }
}

// ============================================================
// MARK: - 4. Wail rings + shockwaves
// ============================================================

/// Expanding wail rings driven by PhaseAnimator: swell → burst → settle.
struct MineWailRings: View {
    var kind: MineGhostKind
    var firing: Bool

    enum RingPhase: CaseIterable {
        case idle, swell, burst, settle
    }

    var body: some View {
        PhaseAnimator(RingPhase.allCases, trigger: firing) { phase in
            ZStack {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .stroke(kind.tint.opacity(ringOpacity(phase, index: i)), lineWidth: 3)
                        .frame(width: ringSize(phase, index: i), height: ringSize(phase, index: i))
                }
            }
        } animation: { phase in
            switch phase {
            case .idle: .easeInOut(duration: 0.4)
            case .swell: .spring(response: 0.35, dampingFraction: 0.6)
            case .burst: .easeOut(duration: 0.5)
            case .settle: .easeInOut(duration: 0.4)
            }
        }
    }

    private func ringSize(_ phase: RingPhase, index: Int) -> CGFloat {
        let base = CGFloat(40 + index * 26)
        switch phase {
        case .idle: return base * 0.6
        case .swell: return base * 0.9
        case .burst: return firing ? base * 1.6 : base * 0.6
        case .settle: return base * 0.6
        }
    }

    private func ringOpacity(_ phase: RingPhase, index: Int) -> Double {
        switch phase {
        case .idle: return 0
        case .swell: return 0.7 - Double(index) * 0.15
        case .burst: return firing ? 0.9 - Double(index) * 0.2 : 0
        case .settle: return 0
        }
    }
}

/// Full-screen-edge shockwave flash on a big wail.
struct MineWailFlash: View {
    var firing: Bool
    @State private var flash = false

    var body: some View {
        RoundedRectangle(cornerRadius: 24)
            .stroke(Color.white.opacity(flash ? 0.8 : 0.0), lineWidth: 6)
            .scaleEffect(flash ? 1.04 : 0.96)
            .animation(.easeOut(duration: 0.45), value: flash)
            .onChange(of: firing) { _, new in
                if new {
                    flash = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        flash = false
                    }
                }
            }
    }
}

// ============================================================
// MARK: - 5. Ectoplasm trails, mist, spectral glow
// ============================================================

/// Fading blob trail behind a darting ghost.
struct MineEctoplasmTrail: View {
    var kind: MineGhostKind
    var active: Bool
    @State private var drift = false

    var body: some View {
        HStack(spacing: -8) {
            ForEach(0..<5, id: \.self) { i in
                Circle()
                    .fill(kind.tint.opacity(0.5 - Double(i) * 0.09))
                    .frame(width: 22 - CGFloat(i) * 3.5, height: 22 - CGFloat(i) * 3.5)
                    .offset(y: drift ? -6 : 6)
                    .animation(
                        .easeInOut(duration: 0.9 + Double(i) * 0.12)
                            .repeatForever(autoreverses: true),
                        value: drift
                    )
            }
        }
        .opacity(active ? 1 : 0)
        .animation(.easeInOut(duration: 0.4), value: active)
        .onAppear { drift.toggle() }
    }
}

/// Drifting haunted mist: blurred ellipses on slow loops.
struct MineHauntedMist: View {
    var tint: Color = Color(white: 0.75)
    @State private var drift = false

    var body: some View {
        ZStack {
            ForEach(0..<5, id: \.self) { i in
                Ellipse()
                    .fill(tint.opacity(0.16))
                    .frame(width: 180 + CGFloat(i) * 30, height: 44)
                    .blur(radius: 10)
                    .offset(
                        x: drift ? CGFloat(-40 + i * 8) : CGFloat(40 - i * 8),
                        y: CGFloat(i * 26 - 40)
                    )
                    .animation(
                        .easeInOut(duration: 7 + Double(i) * 1.3)
                            .repeatForever(autoreverses: true),
                        value: drift
                    )
            }
        }
        .onAppear { drift.toggle() }
    }
}

/// Pulsing spectral glow behind featured ghosts.
struct MineSpectralGlow: View {
    var kind: MineGhostKind
    @State private var pulse = false

    var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [kind.tint.opacity(0.5), .clear],
                    center: .center, startRadius: 10, endRadius: 120
                )
            )
            .frame(width: 240, height: 240)
            .scaleEffect(pulse ? 1.15 : 0.9)
            .opacity(pulse ? 0.9 : 0.55)
            .hueRotation(.degrees(pulse ? 12 : -12))
            .animation(
                .easeInOut(duration: 2.4).repeatForever(autoreverses: true),
                value: pulse
            )
            .onAppear { pulse.toggle() }
    }
}

// ============================================================
// MARK: - 6. Full scare sequence (PhaseAnimator showcase)
// ============================================================

/// The signature scare: lurk → rise → wail → dart → fade, driven by a
/// PhaseAnimator with per-phase spring physics.
struct MineGhostScare: View {
    var actor: MineGhostActor
    @State private var trigger = false

    var body: some View {
        PhaseAnimator(MineGhostPhase.allCases, trigger: trigger) { phase in
            ZStack {
                MineSpectralGlow(kind: actor.kind)
                    .opacity(phase == .lurking ? 0.25 : 1)
                MineGhostSprite(kind: actor.kind, size: actor.size, wailing: phase == .wailing)
                    .scaleEffect(scareScale(phase))
                    .opacity(scareOpacity(phase))
                    .offset(scareOffset(phase))
                    .rotationEffect(.degrees(scareSpin(phase)))
                    .blur(radius: phase == .darting ? 2 : 0)
                MineWailRings(kind: actor.kind, firing: phase == .wailing)
                MineEctoplasmTrail(kind: actor.kind, active: phase == .darting)
            }
        } animation: { phase in
            switch phase {
            case .lurking: .easeInOut(duration: 0.8)
            case .rising: .spring(response: 0.6, dampingFraction: 0.55)
            case .wailing: .spring(response: 0.3, dampingFraction: 0.4)
            case .darting: .easeIn(duration: 0.45)
            case .fading: .easeOut(duration: 0.8)
            }
        }
        .onAppear {
            // Loop the scare forever for the showcase; gameplay fires
            // single passes by toggling the actor phase instead.
            Timer.scheduledTimer(withTimeInterval: 4.5, repeats: true) { _ in
                trigger.toggle()
            }
        }
    }

    private func scareScale(_ phase: MineGhostPhase) -> CGFloat {
        switch phase {
        case .lurking: return 0.7
        case .rising: return 1.0
        case .wailing: return 1.25
        case .darting: return 0.9
        case .fading: return 0.5
        }
    }

    private func scareOpacity(_ phase: MineGhostPhase) -> Double {
        switch phase {
        case .lurking: return 0.35
        case .rising: return 0.9
        case .wailing: return 1.0
        case .darting: return 0.85
        case .fading: return 0.0
        }
    }

    private func scareOffset(_ phase: MineGhostPhase) -> CGSize {
        switch phase {
        case .lurking: return CGSize(width: 0, height: 30)
        case .rising: return CGSize(width: 0, height: -10)
        case .wailing: return CGSize(width: 0, height: -16)
        case .darting: return CGSize(width: 60, height: -40)
        case .fading: return CGSize(width: 90, height: -60)
        }
    }

    private func scareSpin(_ phase: MineGhostPhase) -> Double {
        switch phase {
        case .darting: return -14
        case .fading: return -24
        default: return 0
        }
    }
}

// ============================================================
// MARK: - 7. Encounter cards + radar
// ============================================================

/// Encounter card: sprite, name, flavor, wail button, scare flash.
struct MineGhostEncounterCard: View {
    var kind: MineGhostKind
    var onWail: () -> Void
    @State private var tapped = false

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                MineSpectralGlow(kind: kind)
                MineGhostSprite(kind: kind, size: 72, wailing: tapped)
                MineWailRings(kind: kind, firing: tapped)
            }
            .frame(height: 170)
            HStack {
                Text(kind.emoji).font(.title)
                VStack(alignment: .leading, spacing: 2) {
                    Text(kind.title).font(.headline)
                    Text(kind.flavor).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
            }
            Button(action: {
                tapped = true
                SpookyHaptics.play(.warning)
                onWail()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                    tapped = false
                }
            }) {
                Label("Startle it!", systemImage: "speaker.wave.2.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(kind.tint)
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}

/// Radar dots for nearby haunts: pulse + drift, tap to startle.
struct MineGhostRadar: View {
    var kinds: [MineGhostKind]
    var onTap: (MineGhostKind) -> Void
    @State private var ping = false

    var body: some View {
        ZStack {
            // Sweep rings.
            ForEach(0..<2, id: \.self) { i in
                Circle()
                    .stroke(Color.green.opacity(0.35), lineWidth: 1.5)
                    .frame(width: ping ? 130 : 40, height: ping ? 130 : 40)
                    .opacity(ping ? 0 : 0.8)
                    .animation(
                        .easeOut(duration: 2.2).repeatForever(autoreverses: false)
                            .delay(Double(i) * 1.1),
                        value: ping
                    )
            }
            // Blips.
            ForEach(Array(kinds.enumerated()), id: \.offset) { i, kind in
                Button(action: { onTap(kind) }) {
                    Text(kind.emoji)
                        .font(.title2)
                        .scaleEffect(ping ? 1.15 : 0.95)
                        .animation(
                            .easeInOut(duration: 1.4).repeatForever(autoreverses: true)
                                .delay(Double(i) * 0.25),
                            value: ping
                        )
                }
                .offset(blipOffset(i, total: max(1, kinds.count)))
            }
        }
        .frame(width: 150, height: 150)
        .background(Circle().fill(Color.black.opacity(0.55)))
        .onAppear { ping.toggle() }
    }

    private func blipOffset(_ i: Int, total: Int) -> CGSize {
        guard total > 0 else { return .zero }
        let angle = Double(i) / Double(total) * 2 * Double.pi - Double.pi / 2
        let r: CGFloat = 44
        return CGSize(width: cos(angle) * r, height: sin(angle) * r)
    }
}

// ============================================================
// MARK: - 8. Ambient haunt overlay (TimelineView motes)
// ============================================================

/// Floating dust-motes + ember field rendered on a Canvas, driven by a
/// TimelineView animation schedule. Cheap enough to sit behind any screen.
struct MineAmbientHaunt: View {
    var moteCount = 40
    var tint: Color = .white

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let n = MineMotionGate.count(moteCount)
                for i in 0..<n {
                    let speed = 0.12 + Double(i % 5) * 0.05
                    let x = fmod(Double(i) * 197.3 + t * 12 * speed, Double(size.width))
                    let y = fmod(Double(i) * 131.7 - t * 9 * speed, Double(size.height))
                    let yy = y < 0 ? y + Double(size.height) : y
                    let twinkle = 0.25 + 0.55 * abs(sin(t * (0.6 + Double(i % 4) * 0.3) + Double(i)))
                    let r = 1.0 + Double(i % 3)
                    context.opacity = twinkle * 0.7
                    context.fill(
                        Circle().path(in: CGRect(x: x, y: yy, width: r * 2, height: r * 2)),
                        with: .color(tint)
                    )
                }
            }
        }
        .allowsHitTesting(false)
    }
}

// ============================================================
// MARK: - 9. Boo burst (tap celebration via manual particles)
// ============================================================

/// Tap-anywhere burst: twelve shards fly out with staggered springs.
struct MineBooBurst: View {
    var emoji: String = "👻"
    @State private var burst = false
    @State private var visible = false

    var body: some View {
        ZStack {
            ForEach(0..<12, id: \.self) { i in
                Text(i % 3 == 0 ? "✨" : emoji)
                    .font(.title3)
                    .offset(burst ? burstOffset(i) : .zero)
                    .opacity(burst ? 0 : 1)
                    .scaleEffect(burst ? 0.4 : 1.0)
                    .animation(
                        .spring(response: 0.55, dampingFraction: 0.6)
                            .delay(Double(i) * 0.015),
                        value: burst
                    )
            }
        }
        .opacity(visible ? 1 : 0)
        .onTapGesture {
            visible = true
            burst = false
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.03) {
                burst = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                visible = false
            }
        }
    }

    private func burstOffset(_ i: Int) -> CGSize {
        let angle = Double(i) / 12 * 2 * Double.pi
        return CGSize(width: cos(angle) * 70, height: sin(angle) * 70)
    }
}

// ============================================================
// MARK: - 11. Elder trio + ghost choir
// ============================================================

/// Elder trio: three ancients stacked in a totem with shared halo.
struct MineElderTrio: View {
    @State private var hum = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Shared halo.
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.purple.opacity(0.5), .clear],
                        center: .center, startRadius: 10, endRadius: 130
                    )
                )
                .frame(width: 260, height: 260)
                .opacity(hum ? 1 : 0.5)
                .animation(
                    .easeInOut(duration: 2.6).repeatForever(autoreverses: true),
                    value: hum
                )
            VStack(spacing: -18) {
                MineGhostSprite(kind: .wisp, size: 52)
                    .offset(y: hum ? -6 : 6)
                    .animation(
                        .easeInOut(duration: 1.8).repeatForever(autoreverses: true),
                        value: hum
                    )
                MineGhostSprite(kind: .wraith, size: 68)
                MineGhostSprite(kind: .gloom, size: 84)
                    .offset(y: hum ? 6 : -6)
                    .animation(
                        .easeInOut(duration: 2.2).repeatForever(autoreverses: true),
                        value: hum
                    )
            }
            Text("👑").font(.title).offset(y: -172)
        }
        .frame(height: 330)
        .onAppear { hum.toggle() }
    }
}

/// Ghost choir: five singers scaling in canon, conductor wisp in front.
struct MineGhostChoir: View {
    @State private var beat = 0

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                ForEach(0..<5, id: \.self) { i in
                    MineGhostSprite(
                        kind: [MineGhostKind.shade, .wraith, .gloom, .shade, .wraith][i],
                        size: 44,
                        wailing: beat % 5 == i
                    )
                    .scaleEffect(beat % 5 == i ? 1.18 : 0.94)
                    .animation(.spring(response: 0.4, dampingFraction: 0.55), value: beat)
                }
            }
            MineGhostSprite(kind: .wisp, size: 40)
            Text("The Hollows Choir — wailing in canon")
                .font(.caption).foregroundStyle(.secondary)
        }
        .frame(height: 220)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 0.7, repeats: true) { _ in
                beat = (beat + 1) % 5
                if beat == 0 { SpookyHaptics.play(.light) }
            }
        }
    }
}

// ============================================================
// MARK: - 10. Showcase gallery (all ghosts, all moves)
// ============================================================

/// Full theater showcase: every kind, every sequence, ambient beds.
/// Present it from a debug button or the codex for a live demo.
struct MineGhostShowcaseView: View {
    @StateObject private var director = MineGhostDirector()
    @State private var selected: MineGhostKind = .wraith
    @State private var showRings = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    // Featured scare.
                    VStack {
                        Text("👻 Featured haunting").font(.headline)
                        if let actor = director.actors.first(where: { $0.kind == selected }) {
                            MineGhostScare(actor: actor)
                                .frame(height: 260)
                        }
                        Text(selected.flavor)
                            .font(.caption).foregroundStyle(.secondary)
                            .padding(.horizontal)
                    }
                    .padding(.vertical, 8)
                    // Kind picker.
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(MineGhostKind.allCases, id: \.self) { kind in
                                Button(action: { selected = kind }) {
                                    VStack {
                                        Text(kind.emoji).font(.largeTitle)
                                        Text(kind.title).font(.caption2.bold())
                                    }
                                    .padding(10)
                                    .background(selected == kind ? kind.tint.opacity(0.35) : Color.white.opacity(0.08))
                                    .cornerRadius(12)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    // Sprite lineup.
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Sprite lineup").font(.headline).padding(.horizontal)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 18) {
                                ForEach(MineGhostKind.allCases, id: \.self) { kind in
                                    VStack {
                                        MineGhostSprite(kind: kind, size: 56)
                                            .frame(height: 110)
                                        Text(kind.title).font(.caption2)
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    // Wail lab.
                    VStack(spacing: 10) {
                        Text("Wail lab").font(.headline)
                        ZStack {
                            MineGhostSprite(kind: selected, size: 80, wailing: showRings)
                            MineWailRings(kind: selected, firing: showRings)
                        }
                        .frame(height: 190)
                        Button(showRings ? "Settle" : "WAIL!") {
                            showRings.toggle()
                            if showRings { SpookyHaptics.play(.warning) }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(selected.tint)
                    }
                    // Mist + motes bed.
                    VStack(spacing: 8) {
                        Text("Atmosphere bed").font(.headline)
                        ZStack {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.black)
                                .frame(height: 150)
                            MineHauntedMist()
                            MineAmbientHaunt(moteCount: 30, tint: selected.tint)
                        }
                        .padding(.horizontal)
                    }
                    // Encounter cards.
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Encounter cards").font(.headline).padding(.horizontal)
                        ForEach(MineGhostKind.allCases, id: \.self) { kind in
                            MineGhostEncounterCard(kind: kind, onWail: {
                                director.startleAll()
                            })
                            .padding(.horizontal)
                        }
                    }
                    // Radar.
                    VStack(spacing: 8) {
                        Text("Haunt radar").font(.headline)
                        Text("Tap a blip to startle that kind.").font(.caption).foregroundStyle(.secondary)
                        MineGhostRadar(kinds: Array(MineGhostKind.allCases.prefix(4))) { _ in
                            director.startleAll()
                        }
                    }
                    VStack(spacing: 8) {
                        Text("Elder trio").font(.headline)
                        Text("Three ancients, one totem, shared halo.").font(.caption).foregroundStyle(.secondary)
                        MineElderTrio()
                    }
                    VStack(spacing: 8) {
                        Text("Hollows choir").font(.headline)
                        Text("Five singers wailing in canon.").font(.caption).foregroundStyle(.secondary)
                        MineGhostChoir()
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Ghost Theater")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("Startle all") { director.startleAll() }
                }
            }
            .onAppear { director.populate() }
        }
    }
}
