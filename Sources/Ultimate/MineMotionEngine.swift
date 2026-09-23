//
//  MineMotionEngine.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Motion engine: an easing library (12 curves), spring presets, a tween
//  driver, a staggered-sequence orchestra, a reduced-motion gate, an
//  exponential smoother, a frame stopwatch and an easing visualizer.
//  Everything animates through here for one consistent, smooth feel.
//

import SwiftUI
import UIKit
import Combine

// ============================================================
// MARK: - 1. Easing library (12 curves, pure math)
// ============================================================

/// Easing curves as pure 0…1 → 0…1 functions. Clamp inputs; outputs for
/// back/elastic intentionally overshoot (that's the point).
enum MineEasing {
    case linear
    case quadIn, quadOut, quadInOut
    case cubicIn, cubicOut, cubicInOut
    case quartOut
    case sineInOut
    case backOut
    case elasticOut
    case bounceOut

    /// Evaluate the curve at progress t (clamped 0…1, except overshoot).
    func value(_ t: Double) -> Double {
        let x = min(1, max(0, t))
        switch self {
        case .linear:
            return x
        case .quadIn:
            return x * x
        case .quadOut:
            return 1 - (1 - x) * (1 - x)
        case .quadInOut:
            return x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2
        case .cubicIn:
            return x * x * x
        case .cubicOut:
            return 1 - pow(1 - x, 3)
        case .cubicInOut:
            return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2
        case .quartOut:
            return 1 - pow(1 - x, 4)
        case .sineInOut:
            return -(cos(Double.pi * x) - 1) / 2
        case .backOut:
            let c1 = 1.70158
            let c3 = c1 + 1
            return 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2)
        case .elasticOut:
            if x == 0 { return 0 }
            if x == 1 { return 1 }
            return pow(2, -10 * x) * sin((x * 10 - 0.75) * (2 * Double.pi / 3)) + 1
        case .bounceOut:
            let n1 = 7.5625
            let d1 = 2.75
            if x < 1 / d1 {
                return n1 * x * x
            } else if x < 2 / d1 {
                let t = x - 1.5 / d1
                return n1 * t * t + 0.75
            } else if x < 2.5 / d1 {
                let t = x - 2.25 / d1
                return n1 * t * t + 0.9375
            } else {
                let t = x - 2.625 / d1
                return n1 * t * t + 0.984375
            }
        }
    }

    /// Map a value through the curve: from + (to − from) × ease(t).
    func map(from: Double, to: Double, t: Double) -> Double {
        from + (to - from) * value(t)
    }

    var title: String {
        switch self {
        case .linear: return "Linear"
        case .quadIn: return "Quad In"
        case .quadOut: return "Quad Out"
        case .quadInOut: return "Quad In-Out"
        case .cubicIn: return "Cubic In"
        case .cubicOut: return "Cubic Out"
        case .cubicInOut: return "Cubic In-Out"
        case .quartOut: return "Quart Out"
        case .sineInOut: return "Sine In-Out"
        case .backOut: return "Back Out"
        case .elasticOut: return "Elastic Out"
        case .bounceOut: return "Bounce Out"
        }
    }

    var flavor: String {
        switch self {
        case .linear: return "Honest, robotic. Timers and meters."
        case .quadIn: return "Slow start, hurrying finish. Falling rocks."
        case .quadOut: return "Fast start, soft landing. Taps and pops."
        case .quadInOut: return "The all-rounder. Camera moves, fades."
        case .cubicIn: return "Heavier fall. Diving bats."
        case .cubicOut: return "Snappy UI. Buttons, claims, toasts."
        case .cubicInOut: return "Cinematic weight. Doors, reveals."
        case .quartOut: return "Glide to rest. Ghost drifts."
        case .sineInOut: return "Breathing. Floats, glows, mist."
        case .backOut: return "Overshoot snap. Pop-ins, badges."
        case .elasticOut: return "Wobble landing. Jelly, springs, goo."
        case .bounceOut: return "Bouncing ball. Coins, drops, eggs."
        }
    }

    /// Matching SwiftUI Animation for view transitions.
    func animation(duration: Double) -> Animation {
        switch self {
        case .linear: return .linear(duration: duration)
        case .quadIn, .cubicIn: return .easeIn(duration: duration)
        case .quadOut, .cubicOut, .quartOut: return .easeOut(duration: duration)
        case .quadInOut, .cubicInOut, .sineInOut: return .easeInOut(duration: duration)
        case .backOut: return .spring(response: duration, dampingFraction: 0.6)
        case .elasticOut: return .spring(response: duration, dampingFraction: 0.35)
        case .bounceOut: return .spring(response: duration, dampingFraction: 0.5)
        }
    }

    static var all: [MineEasing] {
        [.linear, .quadIn, .quadOut, .quadInOut, .cubicIn, .cubicOut,
         .cubicInOut, .quartOut, .sineInOut, .backOut, .elasticOut, .bounceOut]
    }
}

// ============================================================
// MARK: - 2. Spring presets (one feel everywhere)
// ============================================================

/// Named springs so every control shares the same hand-feel.
enum MineSpring {
    /// Buttons, toggles, small pops.
    static var snappy: Animation {
        .spring(response: 0.32, dampingFraction: 0.6)
    }

    /// Cards, sheets, rewards.
    static var bouncy: Animation {
        .spring(response: 0.5, dampingFraction: 0.55)
    }

    /// Big reveals, ceremonies.
    static var grand: Animation {
        .spring(response: 0.8, dampingFraction: 0.6)
    }

    /// Jelly, goo, wobble landings.
    static var wobbly: Animation {
        .spring(response: 0.55, dampingFraction: 0.35)
    }

    /// Heavy machinery: doors, drills, anvils.
    static var heavy: Animation {
        .spring(response: 0.7, dampingFraction: 0.75)
    }

    /// Ambient loops (paired with repeatForever by callers).
    static func breathe(duration: Double) -> Animation {
        .easeInOut(duration: duration)
    }
}

// ============================================================
// MARK: - 3. Tween driver (explicit value animation)
// ============================================================

/// Explicit tween: drives a published 0…1 progress over a duration with
/// any easing, then calls done. For choreography the declarative
/// modifiers can't express (chained, conditional, counted).
final class MineTween: ObservableObject {
    @Published private(set) var progress: Double = 0
    @Published private(set) var running: Bool = false

    private var timer: Timer?
    private var startDate = Date()
    private var duration: Double = 1
    private var easing: MineEasing = .quadInOut
    private var done: (() -> Void)?

    /// Map current progress through an easing onto a value range.
    func value(from: Double = 0, to: Double = 1) -> Double {
        easing.map(from: from, to: to, t: progress)
    }

    func start(duration: Double, easing: MineEasing = .quadInOut, done: (() -> Void)? = nil) {
        stop()
        self.duration = max(0.01, duration)
        self.easing = easing
        self.done = done
        progress = 0
        running = true
        startDate = Date()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        running = false
    }

    private func tick() {
        let t = Date().timeIntervalSince(startDate) / duration
        if t >= 1 {
            progress = 1
            stop()
            done?()
        } else {
            progress = t
        }
    }
}

// ============================================================
// MARK: - 4. Orchestra (staggered multi-part sequences)
// ============================================================

/// One orchestra step: wait, then fire, optionally repeating.
struct MineOrchestraStep {
    var delay: Double
    var repeats: Bool = false
    var interval: Double = 1.0
}

/// Runs a counted sequence of closures on a shared clock: step i fires
/// at start + delays[0...i]. Loopable. The conductor behind parades,
///
/// canons, cannonades and ceremonies.
final class MineOrchestra: ObservableObject {
    @Published private(set) var beat: Int = 0
    @Published private(set) var running: Bool = false

    private var timers: [Timer] = []
    private var onStep: ((Int) -> Void)?

    /// Rehearse `count` steps with per-step delays, then optionally loop.
    func play(steps: [MineOrchestraStep], loop: Bool = false, onStep: @escaping (Int) -> Void) {
        stop()
        self.onStep = onStep
        running = true
        var cursor = 0.0
        for (i, step) in steps.enumerated() {
            cursor += step.delay
            schedule(at: cursor, index: i, repeats: step.repeats, interval: step.interval)
        }
        if loop {
            let total = cursor + 0.5
            let looper = Timer.scheduledTimer(withTimeInterval: total, repeats: true) { [weak self] _ in
                guard let self = self else { return }
                self.beat = 0
                self.play(steps: steps, loop: true, onStep: onStep)
            }
            timers.append(looper)
        }
    }

    private func schedule(at delay: Double, index: Int, repeats: Bool, interval: Double) {
        if repeats {
            // First hit on schedule, then steady interval.
            let kick = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
                self?.fire(index: index)
                let loop = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
                    self?.fire(index: index)
                }
                self?.timers.append(loop)
            }
            timers.append(kick)
        } else {
            let timer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
                self?.fire(index: index)
            }
            timers.append(timer)
        }
    }

    private func fire(index: Int) {
        beat = index + 1
        onStep?(index)
    }

    func stop() {
        timers.forEach({ $0.invalidate() })
        timers = []
        running = false
        beat = 0
    }
}

// ============================================================
// MARK: - 5. Reduced-motion gate (commercial accessibility)
// ============================================================

/// Central reduced-motion gate: static scale for particle counts plus a
/// SwiftUI-friendly animation picker. Respects the system setting.
enum MineMotionGate {
    /// 1.0 normally, 0.25 under Reduce Motion.
    static var particleScale: Double {
        UIAccessibility.isReduceMotionEnabled ? 0.25 : 1.0
    }

    /// Full animation normally; instant (nil) under Reduce Motion.
    static func animation(_ normal: Animation) -> Animation? {
        UIAccessibility.isReduceMotionEnabled ? nil : normal
    }

    /// Ambient loops should not autoplay under Reduce Motion.
    static var ambientLoopsAllowed: Bool {
        !UIAccessibility.isReduceMotionEnabled
    }

    /// Scaled particle count for fields.
    static func count(_ n: Int) -> Int {
        max(4, Int(Double(n) * particleScale))
    }
}

// ============================================================
// MARK: - 6. Exponential smoother (frame-rate independent)
// ============================================================

/// Frame-rate-independent exponential damp toward a target: same feel at
/// 30fps and 120fps. For camera follows, glow trails, magnet effects.
struct MineSmoother {
    var current: Double
    /// Time to cover ~63% of the remaining distance.
    var lambda: Double = 8.0

    mutating func step(target: Double, dt: Double) {
        let k = 1 - exp(-lambda * max(0, dt))
        current += (target - current) * k
    }

    mutating func snap(_ value: Double) {
        current = value
    }
}

// ============================================================
// MARK: - 7. Frame stopwatch (find the jank)
// ============================================================

/// Rolling frame-time stats for perf views: avg/p95 FPS, hitch share.
/// Reference type so display-link timers can feed it; views subscribe via
/// the `tick` heartbeat.
final class MineFrameStopwatch: ObservableObject {
    /// Heartbeat: bumped on every record/reset so views refresh.
    @Published private(set) var tick: Int = 0
    private var samples: [Double] = []
    private let cap = 120

    func record(dt: Double) {
        guard dt > 0, dt < 1 else { return }
        samples.append(dt)
        if samples.count > cap {
            samples.removeFirst(samples.count - cap)
        }
        tick += 1
    }

    var count: Int { samples.count }

    var avgFPS: Double {
        guard !samples.isEmpty else { return 60 }
        let avg = samples.reduce(0, +) / Double(samples.count)
        return 1 / max(avg, 1 / 1000)
    }

    var p95FPS: Double {
        guard !samples.isEmpty else { return 60 }
        let sorted = samples.sorted()
        let dt = sorted[min(sorted.count - 1, Int(Double(sorted.count) * 0.95))]
        return 1 / max(dt, 1 / 1000)
    }

    var hitchShare: Double {
        guard !samples.isEmpty else { return 0 }
        return Double(samples.filter({ $0 > 1 / 30 }).count) / Double(samples.count)
    }

    func reset() {
        samples.removeAll()
        tick += 1
    }
}

// ============================================================
// MARK: - 8. Easing visualizer + engine showcase
// ============================================================

/// Curve chart: all 12 easings drawn on Canvas with a traveling demo dot.
struct MineEasingChart: View {
    var easing: MineEasing

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let w = Double(size.width), h = Double(size.height)
                // Frame.
                context.stroke(
                    Path(CGRect(x: 0, y: 0, width: w, height: h)),
                    with: .color(.gray.opacity(0.4)),
                    lineWidth: 1
                )
                // Diagonal reference.
                var ref = Path()
                ref.move(to: CGPoint(x: 0, y: h))
                ref.addLine(to: CGPoint(x: w, y: 0))
                context.stroke(ref, with: .color(.gray.opacity(0.4)), lineWidth: 1)
                // Curve (note: elastic/back overshoot past the frame).
                var curve = Path()
                let n = 60
                for i in 0...n {
                    let t = Double(i) / Double(n)
                    let v = easing.value(t)
                    let x = t * w
                    let y = h - v * h
                    if i == 0 {
                        curve.move(to: CGPoint(x: x, y: y))
                    } else {
                        curve.addLine(to: CGPoint(x: x, y: y))
                    }
                }
                context.stroke(curve, with: .color(.orange), lineWidth: 2.5)
                // Traveling dot.
                let t = fmod(timeline.date.timeIntervalSinceReferenceDate / 2.2, 1.0)
                let v = easing.value(t)
                context.fill(
                    Circle().path(in: CGRect(x: t * w - 5, y: h - v * h - 5, width: 10, height: 10)),
                    with: .color(.white)
                )
            }
        }
    }
}

/// Tween demo: one tween driving position + scale + rotation together.
struct MineTweenDemo: View {
    @StateObject private var tween = MineTween()
    @State private var easing: MineEasing = .backOut

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.black)
                    .frame(height: 120)
                Text("🎃")
                    .font(.system(size: 44))
                    .offset(x: tween.value(from: -100, to: 100))
                    .scaleEffect(tween.value(from: 0.4, to: 1.2))
                    .rotationEffect(.degrees(tween.value(from: -30, to: 30)))
                    .opacity(0.3 + 0.7 * tween.progress)
            }
            Picker("Easing", selection: $easing) {
                ForEach(MineEasing.all, id: \.title) { e in
                    Text(e.title).tag(e)
                }
            }
            .pickerStyle(.menu)
            Button(tween.running ? "Running…" : "Run tween (1.2s)") {
                tween.start(duration: 1.2, easing: easing) {
                    SpookyHaptics.play(.light)
                }
            }
            .buttonStyle(MineSpringButtonStyle(tint: .orange, glow: true))
            .disabled(tween.running)
        }
    }
}

/// Engine showcase: easings, springs, tween, orchestra, stopwatch.
struct MineMotionEngineShowcaseView: View {
    @State private var easing: MineEasing = .elasticOut
    @StateObject private var orchestra = MineOrchestra()
    @State private var players = [false, false, false, false]
    @StateObject private var stopwatch = MineFrameStopwatch()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("📈 Easing library (12 curves)").font(.headline)
                        MineEasingChart(easing: easing)
                            .frame(height: 150)
                            .padding(.horizontal)
                        Picker("Curve", selection: $easing) {
                            ForEach(MineEasing.all, id: \.title) { e in
                                Text(e.title).tag(e)
                            }
                        }
                        .pickerStyle(.menu)
                        Text(easing.flavor)
                            .font(.caption).foregroundStyle(.secondary)
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🎚️ Spring presets").font(.headline)
                        HStack(spacing: 16) {
                            springDemo("Snappy", .snappy)
                            springDemo("Bouncy", .bouncy)
                            springDemo("Grand", .grand)
                            springDemo("Wobbly", .wobbly)
                        }
                    }
                    VStack(spacing: 8) {
                        Text("🎛️ Tween driver").font(.headline)
                        MineTweenDemo()
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🎼 Orchestra (staggered canon)").font(.headline)
                        Text("Four players fire in canon, then loop.")
                            .font(.caption).foregroundStyle(.secondary)
                        HStack(spacing: 20) {
                            ForEach(0..<4, id: \.self) { i in
                                Circle()
                                    .fill([Color.red, .orange, .yellow, .green][i])
                                    .frame(width: players[i] ? 34 : 22, height: players[i] ? 34 : 22)
                                    .opacity(players[i] ? 1 : 0.4)
                                    .animation(.spring(response: 0.35, dampingFraction: 0.5), value: players[i])
                            }
                        }
                        .frame(height: 60)
                        HStack(spacing: 12) {
                            Button(orchestra.running ? "Stop" : "Play canon") {
                                if orchestra.running {
                                    orchestra.stop()
                                    players = [false, false, false, false]
                                } else {
                                    orchestra.play(
                                        steps: (0..<4).map({ _ in MineOrchestraStep(delay: 0.4) }),
                                        loop: true
                                    ) { i in
                                        players = [false, false, false, false]
                                        players[i] = true
                                        SpookyHaptics.play(.light)
                                    }
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                        }
                    }
                    VStack(spacing: 8) {
                        Text("⏱️ Frame stopwatch").font(.headline)
                        Text("This view samples its own render cadence.")
                            .font(.caption).foregroundStyle(.secondary)
                        HStack(spacing: 20) {
                            Text("avg \(Int(stopwatch.avgFPS))")
                            Text("p95 \(Int(stopwatch.p95FPS))")
                            Text("hitch \(Int(stopwatch.hitchShare * 100))%")
                        }
                        .font(.headline)
                        .monospacedDigit()
                        // Heartbeat subscription (keeps the numbers live).
                        Text("sample \(stopwatch.tick)").hidden().frame(height: 0)
                        Button("Reset") { stopwatch.reset() }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    .padding(.bottom, 20)
                    .onAppear {
                        // Sample display-link-ish cadence via timer.
                        var last = Date()
                        Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
                            let now = Date()
                            stopwatch.record(dt: now.timeIntervalSince(last))
                            last = now
                        }
                    }
                }
            }
            .navigationTitle("Motion Engine")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func springDemo(_ label: String, _ animation: Animation) -> some View {
        VStack {
            Button(action: {}) {
                Text("🎃")
                    .font(.largeTitle)
                    .scaleEffect(1.0)
            }
            .buttonStyle(ScaleSpringStyle(animation: animation))
            Text(label).font(.caption2)
        }
    }
}

/// Button style driven by an injected spring (for the preset demo).
struct ScaleSpringStyle: ButtonStyle {
    var animation: Animation

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.85 : 1.0)
            .animation(animation, value: configuration.isPressed)
    }
}
