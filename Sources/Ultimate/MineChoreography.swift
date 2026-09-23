//
//  MineChoreography.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Orchestrated multi-actor sequences driven by MineOrchestra: wail canons,
//  crystal ripple waves, parade drills, unlocking rituals and celebration
//  cannonades. Where single views loop alone, choreography plays together.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Wail canon (round-robin ghost wails)
// ============================================================

/// Five ghosts wailing in canon: one voice at a time, conducted.
struct MineWailCanon: View {
    var kinds: [MineGhostKind] = [.wisp, .shade, .wraith, .poltergeist, .gloom]
    @StateObject private var orchestra = MineOrchestra()
    @State private var voice = -1
    @State private var rounds = 0

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                ForEach(Array(kinds.enumerated()), id: \.offset) { i, kind in
                    MineGhostSprite(kind: kind, size: 52, wailing: voice == i)
                        .scaleEffect(voice == i ? 1.2 : 0.9)
                        .opacity(voice == i ? 1 : 0.75)
                        .animation(MineSpring.bouncy, value: voice)
                }
            }
            .frame(height: 120)
            HStack(spacing: 12) {
                Button(orchestra.running ? "Stop canon" : "Start canon") {
                    if orchestra.running {
                        orchestra.stop()
                        voice = -1
                    } else {
                        rounds = 0
                        orchestra.play(
                            steps: kinds.map({ _ in MineOrchestraStep(delay: 0.55) }),
                            loop: true
                        ) { i in
                            voice = i
                            if i == 0 { rounds += 1 }
                            SpookyHaptics.play(.light)
                        }
                    }
                }
                .buttonStyle(MineSpringButtonStyle(tint: .purple, glow: true))
                Text(orchestra.running ? "Round \(rounds + 1) • voice \(voice + 1)/\(kinds.count)" : "Five voices, one round.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
        .onDisappear { orchestra.stop() }
    }
}

// ============================================================
// MARK: - 2. Crystal ripple wave (cave-wide pulse)
// ============================================================

/// A pulse that rolls across a crystal row, growth to growth.
struct MineCrystalWave: View {
    @StateObject private var orchestra = MineOrchestra()
    @State private var hot = -1
    @State private var sweeps = 0

    private let cells: [(shape: String, color: Color)] = [
        ("cube", .purple), ("spike", .cyan), ("orb", .pink),
        ("cube", .cyan), ("spike", .purple), ("orb", .cyan),
        ("cube", .pink), ("spike", .cyan),
    ]

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                ForEach(cells.indices, id: \.self) { i in
                    crystalCell(i)
                        .scaleEffect(hot == i ? 1.35 : 1.0)
                        .brightness(hot == i ? 0.25 : 0)
                        .animation(MineSpring.bouncy, value: hot)
                }
            }
            .frame(height: 110)
            HStack(spacing: 12) {
                Button(orchestra.running ? "Still the water" : "Roll a wave") {
                    if orchestra.running {
                        orchestra.stop()
                        hot = -1
                    } else {
                        sweeps = 0
                        orchestra.play(
                            steps: cells.map({ _ in MineOrchestraStep(delay: 0.22) }),
                            loop: true
                        ) { i in
                            hot = i
                            if i == 0 { sweeps += 1 }
                        }
                    }
                }
                .buttonStyle(MineSpringButtonStyle(tint: .cyan, glow: true))
                Text(orchestra.running ? "Sweep \(sweeps + 1) rolling…" : "Eight growths, one wave.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
        .onDisappear { orchestra.stop() }
    }

    @ViewBuilder
    private func crystalCell(_ i: Int) -> some View {
        let cell = cells[i]
        switch cell.shape {
        case "cube":
            MineAnimatedCube(color: cell.color, size: 40)
        case "spike":
            MineAnimatedSpike(color: cell.color, height: 56)
        default:
            MineAnimatedOrb(color: cell.color, size: 40)
        }
    }
}

// ============================================================
// MARK: - 3. Parade drill (formation changes on whistle)
// ============================================================

/// March formation drill: line → wedge → column on whistle beats.
struct MineParadeDrill: View {
    @StateObject private var orchestra = MineOrchestra()
    @State private var formation = 0
    private let formations = ["Line", "Wedge", "Column"]
    private let kinds: [MineGhostKind] = [.wisp, .shade, .wraith, .poltergeist, .gloom, .lanternKeeper]

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.black)
                    .frame(height: 190)
                ForEach(Array(kinds.enumerated()), id: \.offset) { i, kind in
                    MineGhostSprite(kind: kind, size: 44)
                        .offset(formationOffset(i))
                        .animation(MineSpring.grand, value: formation)
                }
                Text(formations[formation])
                    .font(.caption.bold())
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(8)
                    .offset(y: 70)
            }
            Button(orchestra.running ? "Halt!" : "Drill!") {
                if orchestra.running {
                    orchestra.stop()
                } else {
                    orchestra.play(
                        steps: [MineOrchestraStep(delay: 0.4), MineOrchestraStep(delay: 1.6), MineOrchestraStep(delay: 1.6)],
                        loop: true
                    ) { i in
                        formation = i
                        SpookyHaptics.play(.medium)
                    }
                }
            }
            .buttonStyle(MineSpringButtonStyle(tint: .orange, glow: true))
            Text("Line → wedge → column, on the whistle.")
                .font(.caption).foregroundStyle(.secondary)
        }
        .onDisappear { orchestra.stop() }
    }

    private func formationOffset(_ i: Int) -> CGSize {
        switch formation {
        case 0: // Line.
            return CGSize(width: CGFloat(i * 44 - 110), height: 0)
        case 1: // Wedge.
            let row = i / 3
            let col = i % 3
            return CGSize(width: CGFloat(col * 50 - 50 + row * 25), height: CGFloat(-40 + row * 40))
        default: // Column.
            return CGSize(width: 0, height: CGFloat(i * 24 - 60))
        }
    }
}

// ============================================================
// MARK: - 4. Unlocking ritual (multi-stage door ceremony)
// ============================================================

/// Unlocking ritual: runes light in order, seal cracks, door dissolves.
struct MineUnlockRitual: View {
    var style: MineDoorStyle = .runeGate
    @StateObject private var orchestra = MineOrchestra()
    @State private var runesLit = 0
    @State private var cracked = false
    @State private var open = false

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                MineLockedDoor(
                    style: style,
                    costs: [],
                    affordable: true,
                    onKnock: {}
                )
                .opacity(open ? 0 : 1)
                .scaleEffect(open ? 1.2 : 1.0)
                .animation(MineSpring.grand, value: open)
                // Rune lights overlay.
                HStack(spacing: 14) {
                    ForEach(0..<4, id: \.self) { i in
                        Circle()
                            .fill(i < runesLit ? Color.yellow : Color.gray.opacity(0.3))
                            .frame(width: 14, height: 14)
                            .shadow(color: i < runesLit ? .yellow : .clear, radius: 8)
                            .scaleEffect(i < runesLit ? 1.25 : 1.0)
                            .animation(MineSpring.snappy, value: runesLit)
                    }
                }
                .offset(y: -110)
                .opacity(open ? 0 : 1)
                // Crack overlay.
                if cracked && !open {
                    Path { p in
                        p.move(to: CGPoint(x: -10, y: -80))
                        p.addLine(to: CGPoint(x: 8, y: -20))
                        p.addLine(to: CGPoint(x: -6, y: 30))
                        p.addLine(to: CGPoint(x: 12, y: 80))
                    }
                    .stroke(Color.white, lineWidth: 3)
                    .frame(width: 60, height: 180)
                    .transition(.opacity)
                }
                if open {
                    VStack(spacing: 6) {
                        Text("🔓").font(.system(size: 64))
                        Text("SEAL BROKEN")
                            .font(.title.bold())
                            .foregroundColor(.green)
                    }
                    .transition(.scale.combined(with: .opacity))
                }
            }
            .frame(height: 340)
            Button(orchestra.running ? "…" : "Begin ritual") {
                runRitual()
            }
            .buttonStyle(MineSpringButtonStyle(tint: .purple, glow: true))
            .disabled(orchestra.running)
            Text("Four runes, one crack, one open door.")
                .font(.caption).foregroundStyle(.secondary)
        }
        .onDisappear { orchestra.stop() }
    }

    private func runRitual() {
        runesLit = 0
        cracked = false
        open = false
        var steps = (0..<4).map({ _ in MineOrchestraStep(delay: 0.55) })
        steps.append(MineOrchestraStep(delay: 0.7))
        steps.append(MineOrchestraStep(delay: 0.6))
        orchestra.play(steps: steps, loop: false) { i in
            if i < 4 {
                runesLit = i + 1
                SpookyHaptics.play(.light)
            } else if i == 4 {
                cracked = true
                SpookyHaptics.play(.heavy)
            } else {
                open = true
                SpookyHaptics.play(.reward)
            }
        }
    }
}

// ============================================================
// MARK: - 5. Celebration cannonade (timed triple volley)
// ============================================================

/// Celebration cannonade: three confetti volleys on the beat.
struct MineCannonade: View {
    @StateObject private var orchestra = MineOrchestra()
    @State private var volleys: [Bool] = [false, false, false]

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.black)
                    .frame(height: 200)
                // Cannons.
                HStack(spacing: 40) {
                    ForEach(0..<3, id: \.self) { i in
                        Text("🎉")
                            .font(.system(size: 40))
                            .rotationEffect(.degrees(volleys[i] ? -18 : 0))
                            .animation(MineSpring.snappy, value: volleys[i])
                    }
                }
                .offset(y: 50)
                // Volley bursts.
                ForEach(0..<3, id: \.self) { i in
                    HStack(spacing: 5) {
                        ForEach(0..<7, id: \.self) { j in
                            Circle()
                                .fill([Color.green, .yellow, .pink][j % 3])
                                .frame(width: 7, height: 7)
                                .offset(volleyOffset(i, j))
                                .opacity(volleys[i] ? 1 : 0)
                                .animation(
                                    MineSpring.bouncy.delay(Double(j) * 0.03),
                                    value: volleys[i]
                                )
                        }
                    }
                    .offset(x: CGFloat(i * 70 - 70), y: -30)
                }
            }
            Button(orchestra.running ? "Cease fire!" : "Fire cannonade!") {
                if orchestra.running {
                    orchestra.stop()
                    volleys = [false, false, false]
                } else {
                    orchestra.play(
                        steps: [MineOrchestraStep(delay: 0.3), MineOrchestraStep(delay: 0.7), MineOrchestraStep(delay: 0.7)],
                        loop: true
                    ) { i in
                        volleys = [false, false, false]
                        volleys[i] = true
                        SpookyHaptics.play(.medium)
                    }
                }
            }
            .buttonStyle(MineSpringButtonStyle(tint: .green, glow: true))
            Text("Three volleys, one beat apart, forever (until cease-fire).")
                .font(.caption).foregroundStyle(.secondary)
        }
        .onDisappear { orchestra.stop() }
    }

    private func volleyOffset(_ i: Int, _ j: Int) -> CGSize {
        let angle = Double(j) / 7 * 2 * Double.pi - Double.pi / 2 + Double(i) * 0.4
        return CGSize(width: cos(angle) * 52, height: sin(angle) * 44)
    }
}

// ============================================================
// MARK: - 6. Choreography showcase
// ============================================================

/// Choreography hall: canon, wave, drill, ritual, cannonade.
struct MineChoreographyShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 22) {
                    Text("One clock conducts many actors. Start each piece and watch them stay in sync.")
                        .font(.caption).foregroundStyle(.secondary)
                        .padding(.horizontal)
                    VStack(spacing: 8) {
                        Text("🎼 Wail canon").font(.headline)
                        MineWailCanon()
                    }
                    VStack(spacing: 8) {
                        Text("🌊 Crystal ripple wave").font(.headline)
                        MineCrystalWave()
                    }
                    VStack(spacing: 8) {
                        Text("🥁 Parade drill").font(.headline)
                        MineParadeDrill()
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🗝️ Unlocking ritual").font(.headline)
                        MineUnlockRitual()
                    }
                    VStack(spacing: 8) {
                        Text("🎆 Celebration cannonade").font(.headline)
                        MineCannonade()
                            .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Choreography")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
