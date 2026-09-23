//
//  MineCinematic.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Full-screen cinematic moments for the mine: rebirth ascensions,
//  sector discoveries, level-up fanfares, quest completions, legendary
//  drops and wisp greetings. Phased sequences with particles, haptics
//  and auto-dismiss — plus a queue director and a showcase.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Cinematic model + director
// ============================================================

/// Playable cinematic kinds with payload.
enum MineCinematicKind {
    case rebirth(number: Int)
    case discovery(name: String)
    case levelUp(level: Int)
    case questDone(title: String, gold: Int)
    case legendaryDrop(name: String)
    case wispGreeting
    case sealBroken(shape: String)
    case firstMagma
    case petHatched(name: String)
    case packFull
    case payday(amount: Int)
    case sweepDone

    var emoji: String {
        switch self {
        case .rebirth: return "💫"
        case .discovery: return "🗺️"
        case .levelUp: return "⬆️"
        case .questDone: return "📜"
        case .legendaryDrop: return "🌟"
        case .wispGreeting: return "✨"
        case .sealBroken: return "🔓"
        case .firstMagma: return "🔥"
        case .petHatched: return "🥚"
        case .packFull: return "🎒"
        case .payday: return "💰"
        case .sweepDone: return "🧹"
        }
    }

    var title: String {
        switch self {
        case .rebirth(let n): return "REBIRTH #\(n)"
        case .discovery(let name): return name
        case .levelUp(let lv): return "RANK \(lv)"
        case .questDone(let title, _): return title
        case .legendaryDrop(let name): return name
        case .wispGreeting: return "A Wisp Appears"
        case .sealBroken(let shape): return "\(shape) Cave Open"
        case .firstMagma: return "THE MAGMA CORE"
        case .petHatched(let name): return "\(name) HATCHED!"
        case .packFull: return "PACK FULL!"
        case .payday(let amount): return "PAYDAY +\(amount)!"
        case .sweepDone: return "SECTOR SWEPT!"
        }
    }

    var subtitle: String {
        switch self {
        case .rebirth: return "The mine remembers you. +15% everything, forever."
        case .discovery: return "New sector mapped. The frontier blooms behind you."
        case .levelUp: return "Stronger pick arm. Both arms. Legs too."
        case .questDone(_, let gold): return "Quest complete! +\(gold) gold and glory."
        case .legendaryDrop: return "Legendary! Hold it up to the lamplight."
        case .wispGreeting: return "It likes you. It pays in gold. Believe."
        case .sealBroken: return "Minerals redeemed. The glitter is yours."
        case .firstMagma: return "Five times the pay. Zero times the death."
        case .petHatched: return "A new friend joins the parade. Feed it promptly."
        case .packFull: return "The backpack runneth over. Payday time."
        case .payday: return "The cart groans happily. The vault echoes your name."
        case .sweepDone: return "Every pocket picked clean. Beautiful. Next sector."
        }
    }

    var tint: Color {
        switch self {
        case .rebirth: return .purple
        case .discovery: return .blue
        case .levelUp: return .green
        case .questDone: return .orange
        case .legendaryDrop: return .yellow
        case .wispGreeting: return .pink
        case .sealBroken: return .cyan
        case .firstMagma: return .red
        case .petHatched: return .pink
        case .packFull: return .orange
        case .payday: return .green
        case .sweepDone: return .blue
        }
    }
}

/// Queue director: stacks cinematics, plays front, dismisses forward.
final class MineCinematicDirector: ObservableObject {
    @Published private(set) var current: MineCinematicKind?
    private var queue: [MineCinematicKind] = []

    var hasPending: Bool { current != nil || !queue.isEmpty }

    func play(_ kind: MineCinematicKind) {
        if current == nil {
            current = kind
        } else {
            queue.append(kind)
        }
    }

    func finish() {
        if queue.isEmpty {
            current = nil
        } else {
            current = queue.removeFirst()
        }
    }

    func clear() {
        current = nil
        queue.removeAll()
    }
}

// ============================================================
// MARK: - 2. Phased cinematic shell
// ============================================================

/// Cinematic phases: fade in → swell → celebrate → settle.
enum MineCinematicPhase: CaseIterable {
    case fadeIn, swell, celebrate, settle
}

/// Generic shell: dim backdrop, phased emblem, particles, tap to skip.
struct MineCinematicShell<Content: View>: View {
    var kind: MineCinematicKind
    var onDone: () -> Void
    @ViewBuilder var content: () -> Content
    @State private var phase = 0
    @State private var gone = false

    var body: some View {
        ZStack {
            Color.black
                .opacity([0.0, 0.72, 0.8, 0.72][phase])
                .animation(.easeInOut(duration: 0.6), value: phase)
                .ignoresSafeArea()
            VStack(spacing: 14) {
                Text(kind.emoji)
                    .font(.system(size: emblemSize))
                    .scaleEffect(emblemScale)
                    .opacity(emblemOpacity)
                    .animation(.spring(response: 0.6, dampingFraction: 0.6), value: phase)
                Text(kind.title)
                    .font(.system(size: 34, weight: .black))
                    .foregroundColor(.white)
                    .opacity(phase >= 1 ? 1 : 0)
                    .scaleEffect(phase >= 2 ? 1.05 : 0.9)
                    .animation(.spring(response: 0.5, dampingFraction: 0.6), value: phase)
                Text(kind.subtitle)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .opacity(phase >= 2 ? 1 : 0)
                    .animation(.easeInOut(duration: 0.5), value: phase)
                content()
                    .opacity(phase >= 2 ? 1 : 0)
            }
            .scaleEffect(gone ? 0.8 : 1.0)
            .opacity(gone ? 0 : 1)
        }
        .onAppear {
            SpookyHaptics.play(.reward)
            advance()
        }
        .onTapGesture { skip() }
    }

    private var emblemSize: CGFloat {
        switch phase {
        case 0: return 0
        case 1: return 84
        case 2: return 96
        default: return 72
        }
    }

    private var emblemScale: CGFloat {
        switch phase {
        case 0: return 0.5
        case 2: return 1.12
        default: return 1.0
        }
    }

    private var emblemOpacity: Double {
        phase == 0 ? 0 : 1
    }

    private func advance() {
        guard phase < 3 else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { skip() }
            return
        }
        let delays = [0.15, 0.7, 1.5]
        DispatchQueue.main.asyncAfter(deadline: .now() + delays[min(phase, 2)]) {
            phase += 1
            if phase == 2 { SpookyHaptics.play(.levelUp) }
            advance()
        }
    }

    private func skip() {
        gone = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            onDone()
        }
    }
}

// ============================================================
// MARK: - 3. Eight cinematics
// ============================================================

/// Rebirth ascension: rising light pillar + orbiting orbs + counter.
struct MineRebirthCinematic: View {
    var number: Int
    var onDone: () -> Void
    @State private var rise = false

    var body: some View {
        MineCinematicShell(kind: .rebirth(number: number), onDone: onDone) {
            ZStack {
                // Light pillar.
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.purple, .clear],
                            startPoint: .bottom, endPoint: .top
                        )
                    )
                    .frame(width: 60, height: rise ? 300 : 40)
                    .blur(radius: 8)
                    .animation(
                        .easeOut(duration: 1.8),
                        value: rise
                    )
                // Orbiting orbs.
                ForEach(0..<8, id: \.self) { i in
                    Circle()
                        .fill(Color.purple)
                        .frame(width: 8, height: 8)
                        .offset(y: rise ? -110 : 0)
                        .rotationEffect(.degrees(rise ? Double(i) * 45 + 180 : Double(i) * 45))
                        .animation(
                            .spring(response: 1.0, dampingFraction: 0.7)
                                .delay(Double(i) * 0.06),
                            value: rise
                        )
                }
                Text("+\(number * 15)%")
                    .font(.title.bold())
                    .foregroundColor(.purple)
                    .opacity(rise ? 1 : 0)
                    .offset(y: 90)
            }
            .frame(height: 260)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    rise = true
                }
            }
        }
    }
}

/// Sector discovery: map unfolding with a golden path + compass spin.
struct MineDiscoveryCinematic: View {
    var name: String
    var onDone: () -> Void
    @State private var unfold = false

    var body: some View {
        MineCinematicShell(kind: .discovery(name: name), onDone: onDone) {
            ZStack {
                // Unfolding map (3×3 grid fading in row by row).
                VStack(spacing: 4) {
                    ForEach(0..<3, id: \.self) { row in
                        HStack(spacing: 4) {
                            ForEach(0..<3, id: \.self) { col in
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.orange.opacity(0.7))
                                    .frame(width: 44, height: 44)
                                    .opacity(unfold ? 1 : 0)
                                    .scaleEffect(unfold ? 1 : 0.3)
                                    .animation(
                                        .spring(response: 0.5, dampingFraction: 0.6)
                                            .delay(Double(row * 3 + col) * 0.12),
                                        value: unfold
                                    )
                            }
                        }
                    }
                }
                // Compass rose spinning above.
                Text("🧭")
                    .font(.system(size: 40))
                    .rotationEffect(.degrees(unfold ? 360 : 0))
                    .animation(.easeOut(duration: 1.6), value: unfold)
                    .offset(y: -110)
            }
            .frame(height: 280)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    unfold = true
                }
            }
        }
    }
}

/// Level-up fanfare: starburst + rank banner + confetti rain.
struct MineLevelUpCinematic: View {
    var level: Int
    var onDone: () -> Void
    @State private var burst = false

    var body: some View {
        MineCinematicShell(kind: .levelUp(level: level), onDone: onDone) {
            ZStack {
                // Starburst rays.
                ForEach(0..<12, id: \.self) { i in
                    Capsule()
                        .fill(Color.green.opacity(0.7))
                        .frame(width: burst ? 90 : 10, height: 6)
                        .offset(x: burst ? 70 : 0)
                        .rotationEffect(.degrees(Double(i) * 30))
                        .opacity(burst ? 0.9 : 0)
                        .animation(
                            .spring(response: 0.6, dampingFraction: 0.6)
                                .delay(Double(i) * 0.02),
                            value: burst
                        )
                }
                // Rank medallion.
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.green, Color(red: 0.1, green: 0.4, blue: 0.2)],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 110, height: 110)
                        .shadow(color: .green, radius: burst ? 24 : 4)
                    Text("\(level)")
                        .font(.system(size: 44, weight: .black))
                        .foregroundColor(.white)
                }
                .scaleEffect(burst ? 1.0 : 0.4)
                .animation(.spring(response: 0.6, dampingFraction: 0.5), value: burst)
            }
            .frame(height: 240)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    burst = true
                }
            }
        }
    }
}

/// Quest completion: seal stamp + gold rain + reward card.
struct MineQuestDoneCinematic: View {
    var title: String
    var gold: Int
    var onDone: () -> Void
    @State private var stamped = false

    var body: some View {
        MineCinematicShell(kind: .questDone(title: title, gold: gold), onDone: onDone) {
            ZStack {
                // Gold rain.
                ForEach(0..<14, id: \.self) { i in
                    Circle()
                        .fill(Color.yellow)
                        .frame(width: 8, height: 8)
                        .offset(
                            x: CGFloat((i * 53) % 200 - 100),
                            y: stamped ? 110 : -110
                        )
                        .opacity(stamped ? 0 : 1)
                        .animation(
                            .easeIn(duration: 1.1).delay(Double(i) * 0.05),
                            value: stamped
                        )
                }
                // Seal stamp.
                Text("✔")
                    .font(.system(size: 60, weight: .black))
                    .foregroundColor(.green)
                    .padding(18)
                    .background(Circle().fill(Color.white))
                    .scaleEffect(stamped ? 1.0 : 2.2)
                    .opacity(stamped ? 1 : 0)
                    .rotationEffect(.degrees(stamped ? 0 : -24))
                    .animation(.spring(response: 0.45, dampingFraction: 0.5), value: stamped)
                Text("+\(gold)🪙")
                    .font(.title.bold())
                    .foregroundColor(.yellow)
                    .offset(y: 110)
                    .opacity(stamped ? 1 : 0)
            }
            .frame(height: 260)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    stamped = true
                    SpookyHaptics.play(.success)
                }
            }
        }
    }
}

/// Legendary drop: slow-motion glow reveal + rotating loot.
struct MineLegendaryCinematic: View {
    var name: String
    var onDone: () -> Void
    @State private var reveal = false

    var body: some View {
        MineCinematicShell(kind: .legendaryDrop(name: name), onDone: onDone) {
            ZStack {
                // Rotating glow disc.
                ForEach(0..<2, id: \.self) { i in
                    Circle()
                        .stroke(Color.yellow.opacity(0.6), lineWidth: 3)
                        .frame(width: reveal ? 190 - CGFloat(i) * 30 : 60, height: reveal ? 190 - CGFloat(i) * 30 : 60)
                        .rotationEffect(.degrees(reveal ? 180 : 0))
                        .animation(
                            .easeOut(duration: 1.4).delay(Double(i) * 0.15),
                            value: reveal
                        )
                }
                // The loot.
                Text("💎")
                    .font(.system(size: 84))
                    .scaleEffect(reveal ? 1.0 : 0.2)
                    .opacity(reveal ? 1 : 0)
                    .rotationEffect(.degrees(reveal ? 0 : -90))
                    .shadow(color: .yellow, radius: reveal ? 30 : 0)
                    .animation(.spring(response: 0.7, dampingFraction: 0.5), value: reveal)
                // Orbiting stars.
                ForEach(0..<6, id: \.self) { i in
                    Text("✨")
                        .offset(y: reveal ? -100 : 0)
                        .rotationEffect(.degrees(reveal ? Double(i) * 60 + 120 : Double(i) * 60))
                        .opacity(reveal ? 1 : 0)
                        .animation(
                            .spring(response: 0.9, dampingFraction: 0.65)
                                .delay(0.4 + Double(i) * 0.07),
                            value: reveal
                        )
                }
            }
            .frame(height: 260)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    reveal = true
                }
            }
        }
    }
}

/// Wisp greeting: pink spiral + hearts + gift box pop.
struct MineWispCinematic: View {
    var onDone: () -> Void
    @State private var greet = false

    var body: some View {
        MineCinematicShell(kind: .wispGreeting, onDone: onDone) {
            ZStack {
                MineGhostSprite(kind: .wisp, size: 84)
                    .scaleEffect(greet ? 1.0 : 0.5)
                    .opacity(greet ? 1 : 0)
                    .animation(.spring(response: 0.7, dampingFraction: 0.55), value: greet)
                ForEach(0..<6, id: \.self) { i in
                    Text(["💖", "✨", "🎁"][i % 3])
                        .font(.title2)
                        .offset(greet ? giftOffset(i) : .zero)
                        .opacity(greet ? 1 : 0)
                        .animation(
                            .spring(response: 0.8, dampingFraction: 0.6)
                                .delay(0.5 + Double(i) * 0.1),
                            value: greet
                        )
                }
            }
            .frame(height: 240)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    greet = true
                }
            }
        }
    }

    private func giftOffset(_ i: Int) -> CGSize {
        let angle = Double(i) / 6 * 2 * Double.pi - Double.pi / 2
        return CGSize(width: cos(angle) * 95, height: sin(angle) * 80)
    }
}

/// Seal-broken + first-magma cinematics share the rising-glow treatment.
struct MineGlowRiseCinematic: View {
    var kind: MineCinematicKind
    var accent: Color
    var onDone: () -> Void
    @State private var rise = false

    var body: some View {
        MineCinematicShell(kind: kind, onDone: onDone) {
            ZStack {
                ForEach(0..<3, id: \.self) { i in
                    Ellipse()
                        .stroke(accent.opacity(0.7), lineWidth: 3)
                        .frame(width: rise ? 200 - CGFloat(i) * 40 : 60, height: 60)
                        .offset(y: rise ? -60 - CGFloat(i) * 30 : 60)
                        .opacity(rise ? 0.9 : 0)
                        .animation(
                            .easeOut(duration: 1.2).delay(Double(i) * 0.15),
                            value: rise
                        )
                }
                Circle()
                    .fill(accent)
                    .frame(width: 70, height: 70)
                    .blur(radius: rise ? 4 : 20)
                    .scaleEffect(rise ? 1.0 : 0.5)
                    .animation(.spring(response: 0.7, dampingFraction: 0.55), value: rise)
            }
            .frame(height: 240)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    rise = true
                }
            }
        }
    }
}

// ============================================================
// MARK: - 4. Overlay host + showcase
// ============================================================

/// Overlay host: drops over any screen, plays the director's queue.
struct MineCinematicHost: View {
    @ObservedObject var director: MineCinematicDirector

    var body: some View {
        ZStack {
            if let kind = director.current {
                cinematic(for: kind)
                    .transition(.opacity)
                    .zIndex(100)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: director.current != nil)
    }

    @ViewBuilder
    private func cinematic(for kind: MineCinematicKind) -> some View {
        switch kind {
        case .rebirth(let n):
            MineRebirthCinematic(number: n, onDone: { director.finish() })
        case .discovery(let name):
            MineDiscoveryCinematic(name: name, onDone: { director.finish() })
        case .levelUp(let lv):
            MineLevelUpCinematic(level: lv, onDone: { director.finish() })
        case .questDone(let title, let gold):
            MineQuestDoneCinematic(title: title, gold: gold, onDone: { director.finish() })
        case .legendaryDrop(let name):
            MineLegendaryCinematic(name: name, onDone: { director.finish() })
        case .wispGreeting:
            MineWispCinematic(onDone: { director.finish() })
        case .sealBroken(let shape):
            MineGlowRiseCinematic(kind: kind, accent: .cyan, onDone: { director.finish() })
        case .firstMagma:
            MineGlowRiseCinematic(kind: kind, accent: .red, onDone: { director.finish() })
        case .petHatched:
            MineGlowRiseCinematic(kind: kind, accent: .pink, onDone: { director.finish() })
        case .packFull:
            MineGlowRiseCinematic(kind: kind, accent: .orange, onDone: { director.finish() })
        case .payday(let amount):
            MineQuestDoneCinematic(title: "Payday!", gold: amount, onDone: { director.finish() })
        case .sweepDone:
            MineGlowRiseCinematic(kind: kind, accent: .blue, onDone: { director.finish() })
        }
    }
}

/// Cinematic showcase: all eight moments back to back.
struct MineCinematicShowcaseView: View {
    @StateObject private var director = MineCinematicDirector()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                ScrollView {
                    VStack(spacing: 12) {
                        Text("Tap a moment to play it full-screen.")
                            .font(.caption).foregroundStyle(.secondary)
                        cinematicButton(emoji: "💫", title: "Rebirth ascension") {
                            director.play(.rebirth(number: 3))
                        }
                        cinematicButton(emoji: "🗺️", title: "Sector discovery") {
                            director.play(.discovery(name: "Heart-Central Dig"))
                        }
                        cinematicButton(emoji: "⬆️", title: "Level-up fanfare") {
                            director.play(.levelUp(level: 15))
                        }
                        cinematicButton(emoji: "📜", title: "Quest completion") {
                            director.play(.questDone(title: "Gold Rush", gold: 250))
                        }
                        cinematicButton(emoji: "🌟", title: "Legendary drop") {
                            director.play(.legendaryDrop(name: "Opal Ore"))
                        }
                        cinematicButton(emoji: "✨", title: "Wisp greeting") {
                            director.play(.wispGreeting)
                        }
                        cinematicButton(emoji: "🔓", title: "Seal broken") {
                            director.play(.sealBroken(shape: "Orb"))
                        }
                        cinematicButton(emoji: "🔥", title: "First magma") {
                            director.play(.firstMagma)
                        }
                        cinematicButton(emoji: "🥚", title: "Pet hatched") {
                            director.play(.petHatched(name: "Wisp"))
                        }
                        cinematicButton(emoji: "🎒", title: "Pack full") {
                            director.play(.packFull)
                        }
                        cinematicButton(emoji: "💰", title: "Payday") {
                            director.play(.payday(amount: 1240))
                        }
                        cinematicButton(emoji: "🧹", title: "Sector swept") {
                            director.play(.sweepDone)
                        }
                        Button("Play ALL (queue)") {
                            director.play(.rebirth(number: 1))
                            director.play(.discovery(name: "Marathon"))
                            director.play(.levelUp(level: 10))
                            director.play(.questDone(title: "Combo", gold: 100))
                            director.play(.legendaryDrop(name: "Diamond Ore"))
                            director.play(.wispGreeting)
                            director.play(.sealBroken(shape: "Cube"))
                            director.play(.firstMagma)
                            director.play(.petHatched(name: "Axolotl"))
                            director.play(.packFull)
                            director.play(.payday(amount: 500))
                            director.play(.sweepDone)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.purple)
                        .padding(.top, 8)
                    }
                    .padding()
                    .padding(.bottom, 30)
                }
                MineCinematicHost(director: director)
            }
            .navigationTitle("Cinematic Theater")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func cinematicButton(emoji: String, title: String, play: @escaping () -> Void) -> some View {
        Button(action: play) {
            HStack {
                Text(emoji).font(.title2)
                Text(title).font(.headline)
                Spacer()
                Image(systemName: "play.circle.fill")
                    .font(.title2).foregroundColor(.purple)
            }
            .padding(12)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}
