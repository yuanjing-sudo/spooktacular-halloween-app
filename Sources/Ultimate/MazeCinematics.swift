//
//  MazeCinematics.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Full-screen cinematic moments for the Tunnel Maze: expedition
//  completions, region discoveries, bond level-ups, combo milestones,
//  shiny encounters, boss takedowns and the grand tour. Phased shell,
//  queue director, overlay host and showcase. Wired into the manager.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Cinematic model + director
// ============================================================

/// Playable maze cinematic kinds with payload.
enum MazeCinematicKind {
    case expeditionDone(title: String, score: Int)
    case regionFound(name: String)
    case bondUp(species: String, level: Int)
    case comboMilestone(n: Int)
    case shinyMet(name: String)
    case bossDown(name: String)
    case grandTour

    var emoji: String {
        switch self {
        case .expeditionDone: return "🧭"
        case .regionFound: return "🗺️"
        case .bondUp: return "💖"
        case .comboMilestone: return "🔥"
        case .shinyMet: return "✨"
        case .bossDown: return "👑"
        case .grandTour: return "🌍"
        }
    }

    var title: String {
        switch self {
        case .expeditionDone(let title, _): return title
        case .regionFound(let name): return name
        case .bondUp(let species, let level): return "\(species) Lv.\(level)!"
        case .comboMilestone(let n): return "\(n) COMBO!"
        case .shinyMet(let name): return name
        case .bossDown(let name): return "\(name) DOWN!"
        case .grandTour: return "GRAND TOUR!"
        }
    }

    var subtitle: String {
        switch self {
        case .expeditionDone(_, let score): return "Expedition complete! +\(score) points and glory."
        case .regionFound: return "New region mapped. The atlas grows ever wider."
        case .bondUp(let species, _): return "\(species) trusts you a little more. Cubes remember kindness."
        case .comboMilestone: return "The tunnels whisper your name. (That's the wind. Probably.)"
        case .shinyMet: return "A shiny crosses your path! Gem luck for a full minute."
        case .bossDown: return "Ten times the points. Zero times the mercy. (Yours.)"
        case .grandTour: return "All eight regions mapped. See every band, be every legend."
        }
    }

    var tint: Color {
        switch self {
        case .expeditionDone: return .orange
        case .regionFound: return .blue
        case .bondUp: return .pink
        case .comboMilestone: return .red
        case .shinyMet: return .yellow
        case .bossDown: return .purple
        case .grandTour: return .green
        }
    }
}

/// Queue director: stacks maze cinematics, plays front, dismisses forward.
final class MazeCinematicDirector: ObservableObject {
    @Published private(set) var current: MazeCinematicKind?
    private var queue: [MazeCinematicKind] = []

    var hasPending: Bool { current != nil || !queue.isEmpty }

    func play(_ kind: MazeCinematicKind) {
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
// MARK: - 2. Phased shell
// ============================================================

/// Cinematic phases: fade in → swell → celebrate → settle.
enum MazeCinematicPhase: CaseIterable {
    case fadeIn, swell, celebrate, settle
}

/// Generic shell: dim backdrop, phased emblem, tap to skip.
struct MazeCinematicShell<Content: View>: View {
    var kind: MazeCinematicKind
    var onDone: () -> Void
    @ViewBuilder var content: () -> Content
    @State private var phase = 0
    @State private var gone = false

    var body: some View {
        ZStack {
            Color.black
                .opacity(backdropOpacity)
                .animation(.easeInOut(duration: 0.6), value: phase)
                .ignoresSafeArea()
            VStack(spacing: 14) {
                Text(kind.emoji)
                    .font(.system(size: emblemSize))
                    .scaleEffect(emblemScale)
                    .opacity(emblemOpacity)
                    .animation(.spring(response: 0.6, dampingFraction: 0.6), value: phase)
                Text(kind.title)
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)
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

    private var backdropOpacity: Double {
        switch phase {
        case 0: return 0
        case 1: return 0.72
        case 2: return 0.8
        default: return 0.72
        }
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
// MARK: - 3. Seven moments
// ============================================================

/// Expedition completion: stamped seal + score rain.
struct MazeExpeditionCinematic: View {
    var title: String
    var score: Int
    var onDone: () -> Void
    @State private var stamped = false

    var body: some View {
        MazeCinematicShell(kind: .expeditionDone(title: title, score: score), onDone: onDone) {
            ZStack {
                ForEach(0..<14, id: \.self) { i in
                    Circle()
                        .fill(Color.orange)
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
                Text("✔")
                    .font(.system(size: 60, weight: .black))
                    .foregroundColor(.green)
                    .padding(18)
                    .background(Circle().fill(Color.white))
                    .scaleEffect(stamped ? 1.0 : 2.2)
                    .opacity(stamped ? 1 : 0)
                    .rotationEffect(.degrees(stamped ? 0 : -24))
                    .animation(.spring(response: 0.45, dampingFraction: 0.5), value: stamped)
                Text("+\(score) pts")
                    .font(.title.bold())
                    .foregroundColor(.yellow)
                    .offset(y: 110)
                    .opacity(stamped ? 1 : 0)
            }
            .frame(height: 260)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    stamped = true
                    SpookyHaptics.play(.reward)
                }
            }
        }
    }
}

/// Region discovery: map tiles flipping in + compass spin.
struct MazeRegionCinematic: View {
    var name: String
    var onDone: () -> Void
    @State private var unfold = false

    var body: some View {
        MazeCinematicShell(kind: .regionFound(name: name), onDone: onDone) {
            ZStack {
                VStack(spacing: 4) {
                    ForEach(0..<3, id: \.self) { row in
                        HStack(spacing: 4) {
                            ForEach(0..<3, id: \.self) { col in
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.blue.opacity(0.7))
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

/// Bond level-up: hearts rising + species banner.
struct MazeBondCinematic: View {
    var species: String
    var level: Int
    var onDone: () -> Void
    @State private var rise = false

    var body: some View {
        MazeCinematicShell(kind: .bondUp(species: species, level: level), onDone: onDone) {
            ZStack {
                Text(BoxyBondLedger.speciesEmoji[species] ?? "📦")
                    .font(.system(size: 84))
                    .scaleEffect(rise ? 1.0 : 0.5)
                    .opacity(rise ? 1 : 0)
                    .animation(.spring(response: 0.7, dampingFraction: 0.55), value: rise)
                ForEach(0..<8, id: \.self) { i in
                    Text("💖")
                        .offset(rise ? heartOffset(i) : .zero)
                        .opacity(rise ? 1 : 0)
                        .animation(
                            .spring(response: 0.8, dampingFraction: 0.6)
                                .delay(0.5 + Double(i) * 0.09),
                            value: rise
                        )
                }
                Text("Lv.\(level) \(BoxyBondRank.title(level: level))")
                    .font(.headline.bold())
                    .foregroundColor(.pink)
                    .offset(y: 100)
                    .opacity(rise ? 1 : 0)
            }
            .frame(height: 260)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    rise = true
                }
            }
        }
    }

    private func heartOffset(_ i: Int) -> CGSize {
        let angle = Double(i) / 8 * 2 * Double.pi - Double.pi / 2
        return CGSize(width: cos(angle) * 95, height: sin(angle) * 80)
    }
}

/// Combo milestone: giant number + shockwave rings.
struct MazeComboCinematic: View {
    var combo: Int
    var onDone: () -> Void
    @State private var blast = false

    var body: some View {
        MazeCinematicShell(kind: .comboMilestone(n: combo), onDone: onDone) {
            ZStack {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .stroke(Color.red.opacity(0.7), lineWidth: 4)
                        .frame(width: blast ? 220 - CGFloat(i) * 40 : 40, height: blast ? 220 - CGFloat(i) * 40 : 40)
                        .opacity(blast ? 0.9 : 0)
                        .animation(
                            .easeOut(duration: 0.9).delay(Double(i) * 0.12),
                            value: blast
                        )
                }
                Text("\(combo)")
                    .font(.system(size: 84, weight: .black))
                    .foregroundColor(.white)
                    .scaleEffect(blast ? 1.0 : 0.3)
                    .opacity(blast ? 1 : 0)
                    .animation(.spring(response: 0.6, dampingFraction: 0.5), value: blast)
                Text(combo >= 25 ? "UNSTOPPABLE" : "ON FIRE")
                    .font(.headline.bold())
                    .foregroundColor(.red)
                    .offset(y: 90)
                    .opacity(blast ? 1 : 0)
            }
            .frame(height: 260)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    blast = true
                    SpookyHaptics.play(.heavy)
                }
            }
        }
    }
}

/// Shiny encounter: slow glow reveal + orbiting stars.
struct MazeShinyCinematic: View {
    var name: String
    var onDone: () -> Void
    @State private var reveal = false

    var body: some View {
        MazeCinematicShell(kind: .shinyMet(name: name), onDone: onDone) {
            ZStack {
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
                Text("✨")
                    .font(.system(size: 84))
                    .scaleEffect(reveal ? 1.0 : 0.2)
                    .opacity(reveal ? 1 : 0)
                    .shadow(color: .yellow, radius: reveal ? 30 : 0)
                    .animation(.spring(response: 0.7, dampingFraction: 0.5), value: reveal)
                ForEach(0..<6, id: \.self) { i in
                    Text("💎")
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

/// Boss takedown: desaturating scene + gold shower + crown.
struct MazeBossDownCinematic: View {
    var name: String
    var onDone: () -> Void
    @State private var slow = false

    var body: some View {
        MazeCinematicShell(kind: .bossDown(name: name), onDone: onDone) {
            ZStack {
                Text("👑")
                    .font(.system(size: 84))
                    .scaleEffect(slow ? 0.7 : 1.2)
                    .opacity(slow ? 0.5 : 1.0)
                    .rotationEffect(.degrees(slow ? -18 : 0))
                    .saturation(slow ? 0.2 : 1.2)
                    .animation(.easeOut(duration: 1.2), value: slow)
                ForEach(0..<12, id: \.self) { i in
                    Circle()
                        .fill(Color.yellow)
                        .frame(width: 8, height: 8)
                        .offset(slow ? showerOffset(i) : .zero)
                        .opacity(slow ? 1 : 0)
                        .animation(
                            .spring(response: 0.7, dampingFraction: 0.6)
                                .delay(0.5 + Double(i) * 0.05),
                            value: slow
                        )
                }
                Text("10× PAY!")
                    .font(.title.bold())
                    .foregroundColor(.yellow)
                    .offset(y: -90)
                    .opacity(slow ? 1 : 0)
            }
            .frame(height: 260)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) {
                    slow = true
                    SpookyHaptics.play(.levelUp)
                }
            }
        }
    }

    private func showerOffset(_ i: Int) -> CGSize {
        let angle = Double(i) / 12 * 2 * Double.pi - Double.pi / 2
        return CGSize(width: cos(angle) * 85, height: sin(angle) * 65 - 20)
    }
}

/// Grand tour: eight region seals lighting in sequence + globe.
struct MazeGrandTourCinematic: View {
    var onDone: () -> Void
    @State private var lit = 0

    var body: some View {
        MazeCinematicShell(kind: .grandTour, onDone: onDone) {
            VStack(spacing: 12) {
                Text("🌍")
                    .font(.system(size: 72))
                    .scaleEffect(lit >= 8 ? 1.1 : 0.9)
                    .animation(.spring(response: 0.6, dampingFraction: 0.55), value: lit)
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(MazeRegionAtlas.all.prefix(8).indices, id: \.self) { i in
                        let region = MazeRegionAtlas.all[i]
                        Text(region.emoji)
                            .font(.title2)
                            .opacity(lit > i ? 1 : 0.2)
                            .scaleEffect(lit > i ? 1.15 : 0.8)
                            .animation(.spring(response: 0.4, dampingFraction: 0.55), value: lit)
                    }
                }
                .padding(.horizontal, 60)
            }
            .frame(height: 260)
            .onAppear {
                Timer.scheduledTimer(withTimeInterval: 0.45, repeats: true) { timer in
                    lit += 1
                    SpookyHaptics.play(.light)
                    if lit >= 8 {
                        timer.invalidate()
                        SpookyHaptics.play(.levelUp)
                    }
                }
            }
        }
    }
}

// ============================================================
// MARK: - 4. Overlay host + showcase
// ============================================================

/// Overlay host: drops over the maze, plays the director's queue.
struct MazeCinematicHost: View {
    @ObservedObject var director: MazeCinematicDirector

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
    private func cinematic(for kind: MazeCinematicKind) -> some View {
        switch kind {
        case .expeditionDone(let title, let score):
            MazeExpeditionCinematic(title: title, score: score, onDone: { director.finish() })
        case .regionFound(let name):
            MazeRegionCinematic(name: name, onDone: { director.finish() })
        case .bondUp(let species, let level):
            MazeBondCinematic(species: species, level: level, onDone: { director.finish() })
        case .comboMilestone(let n):
            MazeComboCinematic(combo: n, onDone: { director.finish() })
        case .shinyMet(let name):
            MazeShinyCinematic(name: name, onDone: { director.finish() })
        case .bossDown(let name):
            MazeBossDownCinematic(name: name, onDone: { director.finish() })
        case .grandTour:
            MazeGrandTourCinematic(onDone: { director.finish() })
        }
    }
}

/// Maze cinematic showcase: all seven moments + play-all queue.
struct MazeCinematicShowcaseView: View {
    @StateObject private var director = MazeCinematicDirector()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                ScrollView {
                    VStack(spacing: 12) {
                        Text("Tap a moment to play it full-screen.")
                            .font(.caption).foregroundStyle(.secondary)
                        cinematicButton(emoji: "🧭", title: "Expedition done") {
                            director.play(.expeditionDone(title: "Closet Crawl", score: 700))
                        }
                        cinematicButton(emoji: "🗺️", title: "Region found") {
                            director.play(.regionFound(name: "The Heart"))
                        }
                        cinematicButton(emoji: "💖", title: "Bond up") {
                            director.play(.bondUp(species: "Boxy Axolotl", level: 3))
                        }
                        cinematicButton(emoji: "🔥", title: "Combo milestone") {
                            director.play(.comboMilestone(n: 25))
                        }
                        cinematicButton(emoji: "✨", title: "Shiny met") {
                            director.play(.shinyMet(name: "Shiny Ghost"))
                        }
                        cinematicButton(emoji: "👑", title: "Boss down") {
                            director.play(.bossDown(name: "Elder Guardian"))
                        }
                        cinematicButton(emoji: "🌍", title: "Grand tour") {
                            director.play(.grandTour)
                        }
                        Button("Play ALL (queue)") {
                            director.play(.expeditionDone(title: "Marathon", score: 450))
                            director.play(.regionFound(name: "Far Reaches"))
                            director.play(.bondUp(species: "Boxy Fox", level: 4))
                            director.play(.comboMilestone(n: 10))
                            director.play(.shinyMet(name: "Golden Wisp"))
                            director.play(.bossDown(name: "Wither"))
                            director.play(.grandTour)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.purple)
                        .padding(.top, 8)
                    }
                    .padding()
                    .padding(.bottom, 30)
                }
                MazeCinematicHost(director: director)
            }
            .navigationTitle("Maze Cinematics")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func cinematicButton(emoji: String, title: String, play: @escaping () -> Void) -> some View {
        Button(action: play) {
            HStack {
                Text(emoji).font(.title2)
                Text(title).font(.headline).foregroundColor(.white)
                Spacer()
                Image(systemName: "play.circle.fill")
                    .font(.title2).foregroundColor(.purple)
            }
            .padding(12)
            .background(Color.white.opacity(0.08))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}
