//
//  GhostCapture.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Interactive ghost-capture battle:
//  tap / ZAP to weaken (damage floaters, squash + shake, dodge slides,
//  crits, regen pressure), then throw the net when the ghost is weak.
//  Success bursts into HalloweenUltimateManager.captureGhost;
//  failure bursts free and the struggle continues.
//

import SwiftUI

// MARK: - Capture Battle View

struct GhostCaptureBattleView: View {
    @EnvironmentObject var manager: HalloweenUltimateManager
    var ghost: Ghost
    var onDone: () -> Void

    @State private var hp: Int
    @State private var maxHP: Int
    @State private var zaps = 0
    @State private var lockZap = false
    @State private var ghostShake = 0
    @State private var ghostSquash = 0
    @State private var dodgeOffset: CGFloat = 0
    @State private var hitFlash = false
    @State private var floater: Floater?
    @State private var burstKey = 0
    @State private var netThrown = false
    @State private var captured = false
    @State private var showIntro = true
    @State private var regenTimer: Timer?
    @State private var reward: Int = 0

    init(ghost: Ghost, onDone: @escaping () -> Void) {
        self.ghost = ghost
        self.onDone = onDone
        _hp = State(initialValue: max(1, ghost.health))
        _maxHP = State(initialValue: max(1, ghost.maxHealth))
    }

    private var weakened: Bool { hp <= Int(Double(maxHP) * 0.35) }
    private var hpFraction: Double { max(0, Double(hp) / Double(maxHP)) }

    var body: some View {
        NavigationView {
            ZStack {
                TwinkleBackground()

                VStack(spacing: 14) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(ghost.type.rawValue)
                                .font(.headline)
                                .foregroundColor(.white)
                            Text("Lv.\(ghost.level) • \(ghost.type.rarity.rawValue)")
                                .font(.caption)
                                .foregroundColor(ghost.type.color)
                        }
                        Spacer()
                        StatBadge(icon: "⚡", value: "\(zaps)", color: .yellow)
                        Button(action: flee) {
                            Text("Flee")
                                .font(.caption.bold())
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .background(Color.gray.opacity(0.4))
                                .foregroundColor(.white)
                                .cornerRadius(9)
                        }
                    }
                    .padding(.horizontal)

                    // Ghost arena
                    ZStack {
                        Circle()
                            .fill(ghost.type.color.opacity(0.16))
                            .frame(width: 220, height: 220)
                            .arcadeGlowPulse(ghost.type.color)

                        if ghost.isBoss {
                            Circle()
                                .fill(Color.red.opacity(0.18))
                                .frame(width: 250, height: 250)
                                .blur(radius: 14)
                        }

                        Text(ghost.type.emoji)
                            .font(.system(size: 120))
                            .arcadeFloat(amplitude: 10, duration: 1.8)
                            .offset(x: dodgeOffset)
                            .arcadeShake(trigger: ghostShake)
                            .arcadeSquash(trigger: ghostSquash)
                            .overlay(
                                Circle()
                                    .fill(Color.red.opacity(hitFlash ? 0.45 : 0))
                                    .frame(width: 170, height: 170)
                            )
                            .onTapGesture { zap() }

                        if netThrown {
                            Text("🕸️")
                                .font(.system(size: 40))
                                .scaleEffect(netThrown ? 3.4 : 0.4)
                                .opacity(netThrown ? 0.95 : 0)
                                .animation(.spring(response: 0.5, dampingFraction: 0.6), value: netThrown)
                        }

                        if let f = floater {
                            FloaterStack(floaters: [f])
                                .offset(y: -90)
                        }

                        if captured {
                            ParticleBurst(emoji: "🎉", count: 22)
                            ParticleBurst(emoji: ghost.type.emoji, count: 10)
                        }

                        // Mood bubble
                        Text(moodBubble)
                            .font(.title2)
                            .offset(x: 74, y: -70)
                            .arcadePopIn()
                    }
                    .frame(height: 250)
                    .onTapGesture { zap() }

                    // HP bar
                    VStack(spacing: 5) {
                        HStack {
                            Text("GHOST HP")
                                .font(.caption2.bold())
                                .foregroundColor(.white.opacity(0.65))
                            Spacer()
                            Text("\(max(hp, 0))/\(maxHP)")
                                .font(.caption.monospacedDigit().bold())
                                .foregroundColor(weakened ? .green : .white)
                        }
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.white.opacity(0.14)).frame(height: 14)
                                Capsule()
                                    .fill(weakened ? Color.green.gradient : Color.red.gradient)
                                    .frame(width: geo.size.width * hpFraction, height: 14)
                                    .animation(.spring(response: 0.35, dampingFraction: 0.7), value: hp)
                            }
                        }
                        .frame(height: 14)

                        if weakened && !captured {
                            Text("WEAK! Throw the net! 🕸️")
                                .font(.headline.bold())
                                .foregroundColor(.green)
                                .arcadeGlowPulse(.green)
                        } else if !captured {
                            Text("Zap it until it glows green…")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.65))
                        }
                    }
                    .padding(.horizontal, 24)

                    Spacer()

                    // Actions
                    if captured {
                        captureRewardCard
                    } else {
                        HStack(spacing: 12) {
                            Button(action: zap) {
                                HStack {
                                    Image(systemName: "bolt.fill")
                                    Text("ZAP!")
                                }
                                .font(.title2.weight(.black))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    lockZap ? Color.gray : Color.blue,
                                    in: RoundedRectangle(cornerRadius: 16)
                                )
                                .arcadeGlowPulse(.blue)
                            }
                            .disabled(lockZap)

                            Button(action: throwNet) {
                                VStack(spacing: 2) {
                                    Text("🕸️").font(.title)
                                    Text("NET")
                                        .font(.caption.bold())
                                }
                                .foregroundColor(.white)
                                .frame(width: 92)
                                .padding(.vertical, 10)
                                .background(
                                    weakened ? Color.green : Color.gray.opacity(0.5),
                                    in: RoundedRectangle(cornerRadius: 16)
                                )
                                .arcadeGlowPulse(weakened ? .green : .clear)
                            }
                            .disabled(!weakened || lockZap || netThrown)
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 8)
                    }
                }
                .padding(.top)
                .disabled(captured)

                // VS intro splash
                if showIntro {
                    Color.black.opacity(0.6).ignoresSafeArea()
                    VStack(spacing: 8) {
                        Text("⚔️")
                            .font(.system(size: 64))
                            .arcadePopIn()
                        Text("WILD \(ghost.type.emoji) APPEARED!")
                            .font(.title2.weight(.black))
                            .foregroundColor(.white)
                            .arcadePopIn(delay: 0.12)
                        Text(ghost.isBoss ? "👑 It's a BOSS — big zaps needed!" : "Tap the ghost or smash ZAP!")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.8))
                            .arcadePopIn(delay: 0.22)
                    }
                    .transition(.opacity)
                }
            }
            .navigationTitle("⚔️ Capture Battle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { flee() }) {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                            Text("Back")
                        }
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Give Up") { flee() }
                }
            }
            .onAppear {
                startRegen()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                    withAnimation { showIntro = false }
                }
            }
            .onDisappear { regenTimer?.invalidate() }
        }
    }

    private var moodBubble: String {
        if captured { return "😵" }
        if weakened { return "😨" }
        if hpFraction < 0.7 { return "😡" }
        return "😜"
    }

    private var captureRewardCard: some View {
        VStack(spacing: 10) {
            Text("🎉 CAPTURED! 🎉")
                .font(.title.bold())
                .foregroundColor(.gold)
                .arcadePopIn()
            Text("\(ghost.type.rawValue) • +\(reward) pts")
                .font(.headline)
                .foregroundColor(.white)
            Button(action: onDone) {
                Text("Awesome!")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .cornerRadius(12)
            }
            Button(action: onDone) {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                    Text("Back")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .cornerRadius(12)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }

    // MARK: - Battle logic

    private func startRegen() {
        regenTimer?.invalidate()
        regenTimer = Timer.scheduledTimer(withTimeInterval: 4, repeats: true) { _ in
            guard !captured, hp > 0, hp < maxHP else { return }
            let heal = max(2, Int(Double(maxHP) * 0.05))
            hp = min(maxHP, hp + heal)
            floater = Floater(text: "+\(heal) 💚", color: .green)
            manager.addNotification("👻 \(ghost.type.rawValue) rallies and heals +\(heal)!")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { floater = nil }
        }
    }

    private func zap() {
        guard !lockZap, !captured, !netThrown, !showIntro else { return }
        lockZap = true
        zaps += 1

        // Every 4th zap the ghost playfully dodges.
        if zaps % 4 == 0 {
            dodgeOffset = CGFloat.random(in: -70...70)
            floater = Floater(text: "Missed!", color: .gray)
            manager.triggerHaptic(.light)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                withAnimation(.spring()) { dodgeOffset = 0 }
                floater = nil
                lockZap = false
            }
            return
        }

        var dmg = Int(Double(maxHP) * Double.random(in: 0.09...0.13))
        dmg = max(6, dmg)
        var label = "−\(dmg)"
        var color = Color.yellow
        if Double.random(in: 0...1) < 0.15 {
            dmg *= 2
            label = "CRIT −\(dmg)! 💥"
            color = .orange
        }
        hp = max(0, hp - dmg)
        ghostShake += 1
        ghostSquash += 1
        hitFlash = true
        floater = Floater(text: label, color: color)
        manager.triggerHaptic(.medium)
        manager.createParticles(at: CGPoint(x: 200, y: 300), count: 8, emoji: "⚡")

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { hitFlash = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            floater = nil
            lockZap = false
        }
    }

    private func throwNet() {
        guard weakened, !captured, !netThrown else { return }
        netThrown = true
        lockZap = true
        manager.triggerHaptic(.heavy)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.65) {
            // 85% catch — otherwise it bursts free and the fight goes on.
            if Double.random(in: 0...1) < 0.85 {
                completeCapture()
            } else {
                netThrown = false
                lockZap = false
                hp = Int(Double(maxHP) * 0.45)
                ghostShake += 1
                floater = Floater(text: "Broke free! 😱", color: .red)
                manager.addNotification("😱 \(ghost.type.rawValue) burst out of the net!")
                manager.triggerHaptic(.heavy)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { floater = nil }
            }
        }
    }

    private func completeCapture() {
        reward = ghost.type.points * (ghost.isBoss ? 10 : 1) * (ghost.hasShiny ? 5 : 1)
        burstKey += 1
        regenTimer?.invalidate()
        if manager.ghosts.contains(where: { $0.id == ghost.id }) {
            manager.captureGhost(ghost)
        } else {
            manager.score += reward
            manager.addNotification("🎃 Captured \(ghost.type.rawValue)! +\(reward) points!")
            manager.checkAchievements()
        }
        manager.triggerHaptic(.success)
        withAnimation { captured = true }
    }

    private func flee() {
        regenTimer?.invalidate()
        manager.comboCounter = 0
        manager.addNotification("💨 You fled — the \(ghost.type.rawValue) slips back into the dark...")
        onDone()
    }
}
