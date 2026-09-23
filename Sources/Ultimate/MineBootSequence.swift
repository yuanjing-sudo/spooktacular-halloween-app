//
//  MineBootSequence.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Commercial launch experience: animated sigil build-up, honest phased
//  progress (each phase yields so boot never janks), rotating tips, skip
//  support and a spring handoff into the game. Presented by the App entry
//  until `onBooted` fires.
//

import SwiftUI

// ============================================================
// MARK: - 1. Boot sequence view
// ============================================================

/// Full-screen launch sequence. Calls `onBooted` exactly once.
struct MineBootSequenceView: View {
    var onBooted: () -> Void
    @State private var phaseIndex = 0
    @State private var progress = 0.0
    @State private var sigil = false
    @State private var tipIndex = 0
    @State private var finished = false
    @State private var skipped = false

    private let phases = SpookyBootScript.phases

    var body: some View {
        ZStack {
            // Night backdrop.
            LinearGradient(
                colors: [
                    Color(red: 0.04, green: 0.02, blue: 0.1),
                    Color(red: 0.1, green: 0.04, blue: 0.18),
                    Color(red: 0.05, green: 0.01, blue: 0.08),
                ],
                startPoint: .top, endPoint: .bottom
            )
            .ignoresSafeArea()
            MineAmbientHaunt(moteCount: 36, tint: .orange)
            VStack(spacing: 18) {
                Spacer()
                // Sigil build-up: pumpkin scales in, ring draws, bats orbit.
                ZStack {
                    Circle()
                        .stroke(Color.orange.opacity(0.7), lineWidth: 3)
                        .frame(width: sigil ? 190 : 40, height: sigil ? 190 : 40)
                        .opacity(sigil ? 1 : 0)
                        .animation(.spring(response: 0.9, dampingFraction: 0.6), value: sigil)
                    ForEach(0..<3, id: \.self) { i in
                        Text(["🦇", "👻", "🦇"][i])
                            .font(.title2)
                            .offset(y: sigil ? -104 : 0)
                            .rotationEffect(.degrees(sigil ? Double(i) * 120 + 40 : Double(i) * 120))
                            .opacity(sigil ? 1 : 0)
                            .animation(
                                .spring(response: 0.9, dampingFraction: 0.65)
                                    .delay(0.3 + Double(i) * 0.12),
                                value: sigil
                            )
                    }
                    Text("🎃")
                        .font(.system(size: 92))
                        .scaleEffect(sigil ? 1.0 : 0.2)
                        .opacity(sigil ? 1 : 0)
                        .animation(.spring(response: 0.7, dampingFraction: 0.55), value: sigil)
                }
                .frame(height: 230)
                Text("SPOOKTACULAR")
                    .font(.system(size: 34, weight: .black))
                    .foregroundColor(.orange)
                    .opacity(sigil ? 1 : 0)
                    .offset(y: sigil ? 0 : 16)
                    .animation(.easeOut(duration: 0.6).delay(0.4), value: sigil)
                // Phased progress.
                VStack(spacing: 8) {
                    HStack {
                        if phaseIndex < phases.count {
                            Text("\(phases[phaseIndex].emoji) \(phases[phaseIndex].label)…")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.9))
                                .transition(.opacity.combined(with: .move(edge: .top)))
                                .id(phaseIndex)
                        } else {
                            Text("🎉 Ready!")
                                .font(.subheadline.bold())
                                .foregroundColor(.green)
                        }
                        Spacer()
                        Text("\(Int(progress * 100))%")
                            .font(.caption.bold())
                            .foregroundColor(.white.opacity(0.7))
                            .monospacedDigit()
                    }
                    MineShimmerBar(fraction: progress, tint: .orange, height: 12)
                }
                .padding(.horizontal, 44)
                // Rotating tip.
                VStack(spacing: 4) {
                    Text("💡 TIP").font(.caption2.bold()).foregroundColor(.yellow)
                    Text(SpookyTips.mine[tipIndex % SpookyTips.mine.count])
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 50)
                        .id(tipIndex)
                        .transition(.opacity)
                }
                .frame(height: 60)
                Spacer()
                // Skip + version.
                HStack {
                    Button("Skip →") { finish(skipped: true) }
                        .font(.caption.bold())
                        .foregroundColor(.white.opacity(0.6))
                    Spacer()
                    Text("v1.0 • god-mode inside")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.4))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 20)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            sigil = true
            SpookyHaptics.play(.medium)
            SpookyStore.markLaunched()
            runPhases()
            Timer.scheduledTimer(withTimeInterval: 4.0, repeats: true) { _ in
                tipIndex += 1
            }
        }
    }

    /// Walk the phases with yields; each step advances honest progress.
    private func runPhases() {
        guard !finished else { return }
        if phaseIndex >= phases.count {
            finish(skipped: false)
            return
        }
        // Yield so the runloop breathes between phases (no boot jank).
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.32) {
            guard !finished else { return }
            let done = phases.prefix(phaseIndex + 1).reduce(0, { $0 + $1.weight })
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                progress = done / SpookyBootScript.totalWeight
            }
            if phaseIndex == 2 { SpookyHaptics.play(.light) }
            phaseIndex += 1
            runPhases()
        }
    }

    private func finish(skipped: Bool) {
        guard !finished else { return }
        finished = true
        self.skipped = skipped
        withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
            progress = 1.0
        }
        SpookyHaptics.play(.reward)
        DispatchQueue.main.asyncAfter(deadline: .now() + (skipped ? 0.1 : 0.45)) {
            onBooted()
        }
    }
}

// ============================================================
// MARK: - 2. First-launch welcome sheet content
// ============================================================

/// Welcome card shown once (flagged in SpookyStore): what the game is,
///
/// the god-mode promise, where everything lives.
struct MineWelcomeCard: View {
    var onDone: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Text("🎃").font(.system(size: 72))
            Text("Welcome to Spooktacular!")
                .font(.title.bold())
            Text("A haunted mining tycoon + endless maze. Dig deep, sell high, befriend cubes, rebirth forever.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            VStack(alignment: .leading, spacing: 8) {
                welcomeRow("🛡️", "God-mode locked on", "Nothing can kill you. Ever.")
                welcomeRow("⛏️", "Mine", "Ores → backpack → surface cart → upgrades → pets → rebirth.")
                welcomeRow("🌀", "Maze", "Forks, caves, closets, boxy friends, expeditions.")
                welcomeRow("🎨", "Theaters", "20 animation galleries live in the forge panel.")
            }
            .padding(.horizontal)
            Button(action: {
                SpookyStore.markOnboardingDone()
                onDone()
            }) {
                Text("Start haunting!")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(MineSpringButtonStyle(tint: .orange, glow: true))
            .padding(.horizontal, 40)
        }
        .padding(.vertical, 20)
    }

    private func welcomeRow(_ emoji: String, _ title: String, _ detail: String) -> some View {
        HStack(spacing: 10) {
            Text(emoji).font(.title2)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.bold())
                Text(detail).font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}
