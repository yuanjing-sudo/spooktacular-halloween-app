//
//  MineLoopKit.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Drift-free loops + a shared beat clock. repeatForever chains drift
//  apart over long sessions; these oscillators derive every frame from
//  absolute time, so torches, ghosts and crystals stay in sync forever.
//  Includes a beat clock that pulses the whole mine on one rhythm.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Phase oscillators (never drift)
// ============================================================

/// Absolute-time oscillator: value is f(now), so loops never accumulate
/// error no matter how long the session runs.
struct MineOscillator {
    /// Sine in [-1, 1] at period seconds, phase-shifted.
    static func sine(now: Double, period: Double, phase: Double = 0) -> Double {
        sin(2 * Double.pi * now / max(0.01, period) + phase)
    }

    /// Triangle 0…1.
    static func triangle(now: Double, period: Double, phase: Double = 0) -> Double {
        let t = fmod(now / max(0.01, period) + phase / (2 * Double.pi), 1.0)
        return t < 0.5 ? t * 2 : 2 - t * 2
    }

    /// Breathing scale around 1 (amplitude = peak deviation).
    static func breathe(now: Double, period: Double, amplitude: Double, phase: Double = 0) -> Double {
        1 + amplitude * sine(now: now, period: period, phase: phase)
    }

    /// Ping-pong 0…1 with eased ends (smootherstep of triangle).
    static func pingPong(now: Double, period: Double, phase: Double = 0) -> Double {
        let t = triangle(now: now, period: period, phase: phase)
        return t * t * (3 - 2 * t)
    }
}

/// Drift-free pulsing dot: scale + glow from absolute time.
struct MinePulseDot: View {
    var color: Color = .orange
    var period: Double = 2.0
    var phase: Double = 0
    var size: CGFloat = 18

    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            let k = MineOscillator.pingPong(now: t, period: period, phase: phase)
            ZStack {
                Circle()
                    .fill(color.opacity(0.3))
                    .frame(width: size * (1.6 + k * 0.8), height: size * (1.6 + k * 0.8))
                Circle()
                    .fill(color)
                    .frame(width: size * (0.7 + k * 0.5), height: size * (0.7 + k * 0.5))
                    .shadow(color: color, radius: 6 + 8 * k)
            }
        }
        .frame(width: size * 2.6, height: size * 2.6)
    }
}

/// Drift-free bobbing row: N items on staggered absolute phases.
struct MineBobRow: View {
    var count = 5
    var period: Double = 1.8
    var emoji: String = "👻"

    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            HStack(spacing: 14) {
                ForEach(0..<count, id: \.self) { i in
                    let k = MineOscillator.sine(
                        now: t, period: period,
                        phase: Double(i) * 2 * Double.pi / Double(count)
                    )
                    Text(emoji)
                        .font(.title)
                        .offset(y: k * -12)
                        .scaleEffect(1 + k * 0.08)
                }
            }
        }
    }
}

// ============================================================
// MARK: - 2. Beat clock (one rhythm for the whole mine)
// ============================================================

/// Shared beat clock: publishes beat boundaries at a BPM. Visuals stay on
/// TimelineView; this fires triggers (flashes, haptics, accents).
final class MineBeatClock: ObservableObject {
    @Published private(set) var beat: Int = 0
    @Published private(set) var running: Bool = false
    @Published var bpm: Double = 100

    private var timer: Timer?
    private var nextBeat = Date()

    /// Start ticking. Interval derives from BPM (60000/bpm ms).
    func start() {
        stop()
        running = true
        nextBeat = Date()
        schedule()
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        running = false
    }

    private func schedule() {
        let interval = 60.0 / max(20, min(240, bpm))
        timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: false) { [weak self] _ in
            guard let self = self, self.running else { return }
            self.beat += 1
            self.schedule()
        }
    }

    /// Beat phase 0…1 for smooth visuals synced to the clock.
    func phase() -> Double {
        let interval = 60.0 / max(20, min(240, bpm))
        let elapsed = Date().timeIntervalSince(nextBeat)
        return max(0, min(1, elapsed / interval))
    }
}

/// Beat-synced torch row: flames kick on every beat.
struct MineBeatTorches: View {
    @ObservedObject var clock: MineBeatClock

    var body: some View {
        HStack(spacing: 24) {
            ForEach(0..<4, id: \.self) { i in
                MineTorchFlame(scale: 0.8, seed: Double(i) * 5.1 + 2)
                    .scaleEffect(clock.beat % 4 == i ? 1.18 : 1.0)
                    .animation(MineSpring.snappy, value: clock.beat)
            }
        }
        .padding(.vertical, 8)
    }
}

/// Beat-synced ghost bounce line.
struct MineBeatGhosts: View {
    @ObservedObject var clock: MineBeatClock
    private let kinds: [MineGhostKind] = [.wisp, .shade, .wraith, .poltergeist]

    var body: some View {
        HStack(spacing: 16) {
            ForEach(Array(kinds.enumerated()), id: \.offset) { i, kind in
                MineGhostSprite(kind: kind, size: 48)
                    .offset(y: clock.beat % 4 == i ? -14 : 4)
                    .scaleEffect(clock.beat % 4 == i ? 1.12 : 0.96)
                    .animation(MineSpring.snappy, value: clock.beat)
            }
        }
        .frame(height: 120)
    }
}

/// Beat-synced crystal pulse ring.
struct MineBeatCrystals: View {
    @ObservedObject var clock: MineBeatClock

    var body: some View {
        HStack(spacing: 18) {
            MineAnimatedCube(color: .purple, size: 44)
                .scaleEffect(clock.beat % 3 == 0 ? 1.2 : 1.0)
                .animation(MineSpring.snappy, value: clock.beat)
            MineAnimatedSpike(color: .cyan, height: 64)
                .scaleEffect(clock.beat % 3 == 1 ? 1.15 : 1.0)
                .animation(MineSpring.snappy, value: clock.beat)
            MineAnimatedOrb(color: .pink, size: 44)
                .scaleEffect(clock.beat % 3 == 2 ? 1.2 : 1.0)
                .animation(MineSpring.snappy, value: clock.beat)
        }
        .frame(height: 120)
    }
}

// ============================================================
// MARK: - 3. Loop showcase
// ============================================================

/// Loop lab: oscillators, beat-synced stage, BPM control.
struct MineLoopShowcaseView: View {
    @StateObject private var clock = MineBeatClock()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    Text("Absolute-time loops never drift; the beat clock keeps every actor on one rhythm.")
                        .font(.caption).foregroundStyle(.secondary)
                        .padding(.horizontal)
                    VStack(spacing: 8) {
                        Text("🕰️ Drift-free oscillators").font(.headline)
                        HStack(spacing: 20) {
                            MinePulseDot(color: .orange, period: 1.6, phase: 0)
                            MinePulseDot(color: .cyan, period: 1.6, phase: 2.1)
                            MinePulseDot(color: .pink, period: 1.6, phase: 4.2)
                        }
                        MineBobRow(count: 5, period: 1.8, emoji: "👻")
                        MineBobRow(count: 5, period: 1.8, emoji: "🔮")
                    }
                    VStack(spacing: 8) {
                        Text("🥁 Beat stage (BPM \(Int(clock.bpm)))").font(.headline)
                        Text("Beat \(clock.beat) — torches, ghosts and crystals accent in turn.")
                            .font(.caption).foregroundStyle(.secondary)
                            .monospacedDigit()
                        MineBeatTorches(clock: clock)
                        MineBeatGhosts(clock: clock)
                        MineBeatCrystals(clock: clock)
                        Slider(value: $clock.bpm, in: 60...180)
                            .padding(.horizontal, 60)
                            .onChange(of: clock.bpm) { _, _ in
                                if clock.running {
                                    clock.stop()
                                    clock.start()
                                }
                            }
                        Button(clock.running ? "Stop the band" : "Start the band") {
                            if clock.running {
                                clock.stop()
                            } else {
                                clock.start()
                                SpookyHaptics.play(.medium)
                            }
                        }
                        .buttonStyle(MineSpringButtonStyle(tint: .purple, glow: true))
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Loop Lab")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onDisappear { clock.stop() }
        }
    }
}
