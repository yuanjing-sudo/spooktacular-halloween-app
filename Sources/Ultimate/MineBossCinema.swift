//
//  MineBossCinema.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Boss cinema kit: wanted-poster intros for all five mine bosses… er,
//  all five MAZE bosses plus mine-monster bounties, animated HP drain
//  bars, slow-mo defeat moments, victory loot showers and a showcase.
//  Names are strings — no coupling, all drama.
//

import SwiftUI

// ============================================================
// MARK: - 1. Boss data
// ============================================================

/// Boss dossier for cinema purposes (display data only).
struct MineBossData {
    var name: String
    var emoji: String
    var title: String
    var tint: Color
    var threat: Int // skulls 1…5
    var intro: String
    var weakness: String
}

enum MineBossGuide {
    static var all: [MineBossData] = [
        MineBossData(
            name: "Elder Guardian", emoji: "👑", title: "Royalty of the Deep",
            tint: .cyan, threat: 3,
            intro: "It rose from the flooded vault, crown first, manners nowhere.",
            weakness: "Burst the adds, shield the enrage."
        ),
        MineBossData(
            name: "Wither", emoji: "💀", title: "The Final Exam",
            tint: Color(white: 0.2), threat: 4,
            intro: "Three heads. Zero mercy. One very large arena.",
            weakness: "Strafe, pillar, punish. Sprint always."
        ),
        MineBossData(
            name: "Ender Dragon", emoji: "🐉", title: "Landlord of the Sky",
            tint: .purple, threat: 5,
            intro: "It has notes on your interior design. It will deliver them personally.",
            weakness: "Ranged in the air, everything on the perch."
        ),
        MineBossData(
            name: "Void Lord", emoji: "👿", title: "Middle Manager of the Abyss",
            tint: .red, threat: 5,
            intro: "Your expeditions are its quarterly review. It is not pleased.",
            weakness: "Swing at landings, never at fades."
        ),
        MineBossData(
            name: "Shadow King", emoji: "🌑", title: "The Final Answer",
            tint: Color(red: 0.3, green: 0.2, blue: 0.5), threat: 5,
            intro: "It bows before duels. It fights dirty after them.",
            weakness: "Everything maxed. All consumables. No fear."
        ),
    ]

    /// Mine-monster bounty cards (the small game).
    static var bounties: [(emoji: String, name: String, pay: Int, tip: String)] = [
        ("🕷️", "Spider", 6, "Fast. Bonk first, ask never."),
        ("🟢", "Slime", 10, "Hops toward you. Let it. Then whack."),
        ("👻", "Wraith", 18, "Hovers. Time the swing at the dip."),
    ]
}

// ============================================================
// MARK: - 2. Wanted poster intro
// ============================================================

/// Wanted-poster boss intro: paper slam, skull meter, intro crawl.
struct MineBossIntro: View {
    var boss: MineBossData
    @State private var slammed = false

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                // Poster paper.
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(red: 0.92, green: 0.85, blue: 0.7))
                    .frame(width: 220, height: 280)
                    .shadow(color: .black.opacity(0.5), radius: 10)
                    .rotationEffect(.degrees(slammed ? -2 : -14))
                    .scaleEffect(slammed ? 1.0 : 1.6)
                    .opacity(slammed ? 1 : 0)
                    .animation(.spring(response: 0.45, dampingFraction: 0.5), value: slammed)
                VStack(spacing: 6) {
                    Text("WANTED").font(.caption.bold()).foregroundColor(.red)
                    Text(boss.emoji).font(.system(size: 64))
                    Text(boss.name).font(.headline).foregroundColor(.black)
                    Text(boss.title).font(.caption).foregroundColor(.black.opacity(0.7))
                    HStack(spacing: 2) {
                        ForEach(0..<5, id: \.self) { i in
                            Text("💀")
                                .opacity(i < boss.threat ? 1 : 0.25)
                        }
                        .font(.caption)
                    }
                    Text("REWARD: LEGEND PAY").font(.caption2.bold()).foregroundColor(.red)
                }
                .opacity(slammed ? 1 : 0)
                .scaleEffect(slammed ? 1.0 : 0.6)
                .animation(.spring(response: 0.5, dampingFraction: 0.55).delay(0.15), value: slammed)
            }
            .frame(height: 300)
            Text(boss.intro)
                .font(.subheadline).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)
                .opacity(slammed ? 1 : 0)
            Text("Weakness: \(boss.weakness)")
                .font(.caption).foregroundColor(.orange)
                .opacity(slammed ? 1 : 0)
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                slammed = true
                SpookyHaptics.play(.heavy)
            }
        }
    }
}

// ============================================================
// MARK: - 3. HP drain bar
// ============================================================

/// Boss HP bar with damage ghosting: white flash chunk drains after red.
struct MineBossBar: View {
    var fraction: Double // 0…1 live HP
    var name: String
    @State private var ghost: Double = 1.0

    var body: some View {
        VStack(spacing: 4) {
            HStack {
                Text("👑 \(name)").font(.caption.bold()).foregroundColor(.white)
                Spacer()
                Text("\(Int(fraction * 100))%").font(.caption.bold()).foregroundColor(.white).monospacedDigit()
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.15)).frame(height: 14)
                    // Ghost (delayed white).
                    Capsule()
                        .fill(Color.white.opacity(0.75))
                        .frame(width: geo.size.width * ghost, height: 14)
                        .animation(.easeOut(duration: 0.9).delay(0.25), value: ghost)
                    // Live (instant red).
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [.red, .orange],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * max(0, min(1, fraction)), height: 14)
                        .animation(.easeOut(duration: 0.2), value: fraction)
                }
            }
            .frame(height: 14)
        }
        .padding(10)
        .background(Color.black.opacity(0.6))
        .cornerRadius(12)
        .onChange(of: fraction) { _, new in
            if new < ghost {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    ghost = new
                }
            } else {
                ghost = new
            }
        }
        .onAppear { ghost = fraction }
    }
}

/// Interactive HP demo: tap to deal chunks, watch ghosting + shake.
struct MineBossBarDemo: View {
    @State private var hp = 1.0
    @State private var shake = false

    var body: some View {
        VStack(spacing: 10) {
            MineBossBar(fraction: hp, name: "Elder Guardian")
                .offset(x: shake ? 6 : -6)
                .animation(
                    hp < 1 ? .easeInOut(duration: 0.09).repeatCount(4, autoreverses: true) : .default,
                    value: shake
                )
            HStack(spacing: 12) {
                Button("Hit!") {
                    hp = max(0, hp - 0.18)
                    shake.toggle()
                    SpookyHaptics.play(.medium)
                }
                .buttonStyle(MineSpringButtonStyle(tint: .red, glow: true))
                Button("Reset") {
                    hp = 1.0
                }
                .buttonStyle(MineSpringButtonStyle(tint: .gray))
            }
            .buttonStyle(.plain)
            Text(hp <= 0 ? "BOSS DOWN! 🎉" : "Tap Hit! to chunk it down.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }
}

// ============================================================
// MARK: - 4. Slow-mo defeat + victory shower
// ============================================================

/// Slow-motion defeat: desaturating scene, expanding ring, gold fountain.
struct MineDefeatSlowMo: View {
    @State private var slow = false

    var body: some View {
        ZStack {
            // Scene freezing over.
            RoundedRectangle(cornerRadius: 14)
                .fill(Color(red: 0.15, green: 0.1, blue: 0.2))
                .frame(height: 220)
                .saturation(slow ? 0.1 : 1.0)
                .animation(.easeOut(duration: 1.2), value: slow)
            Text("👑").font(.system(size: 64))
                .scaleEffect(slow ? 0.6 : 1.0)
                .opacity(slow ? 0.4 : 1.0)
                .rotationEffect(.degrees(slow ? -90 : 0))
                .animation(.easeOut(duration: 1.2), value: slow)
            // Expanding ring.
            Circle()
                .stroke(Color.yellow.opacity(slow ? 0.9 : 0), lineWidth: 4)
                .frame(width: slow ? 220 : 40, height: slow ? 220 : 40)
                .animation(.easeOut(duration: 1.0), value: slow)
            // Gold fountain.
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
            if slow {
                Text("BOSS DOWN!")
                    .font(.title.bold())
                    .foregroundColor(.yellow)
                    .offset(y: -80)
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .frame(height: 240)
        .onTapGesture {
            slow.toggle()
            if slow { SpookyHaptics.play(.levelUp) }
        }
    }

    private func showerOffset(_ i: Int) -> CGSize {
        let angle = Double(i) / 12 * 2 * Double.pi - Double.pi / 2
        return CGSize(width: cos(angle) * 80, height: sin(angle) * 60 - 30)
    }
}

/// Bounty card for mine monsters with animated reward seal.
struct MineBountyCard: View {
    var emoji: String
    var name: String
    var pay: Int
    var tip: String
    @State private var shine = false

    var body: some View {
        HStack(spacing: 12) {
            Text(emoji).font(.largeTitle)
            VStack(alignment: .leading, spacing: 3) {
                Text(name).font(.headline)
                Text(tip).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            VStack {
                Text("+\(pay)🪙").font(.headline.bold()).foregroundColor(.yellow)
                Image(systemName: "seal.fill")
                    .foregroundColor(.orange)
                    .rotationEffect(.degrees(shine ? 12 : -12))
                    .animation(
                        .easeInOut(duration: 1.4).repeatForever(autoreverses: true),
                        value: shine
                    )
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .onAppear { shine.toggle() }
    }
}

// ============================================================
// MARK: - 5. Boss cinema showcase
// ============================================================

/// Boss cinema hall: intros, HP lab, slow-mo, bounties.
struct MineBossCinemaShowcaseView: View {
    @State private var bossIndex = 0
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🎬 Now featuring").font(.headline)
                        MineBossIntro(boss: MineBossGuide.all[bossIndex])
                            .id(bossIndex)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(MineBossGuide.all.indices, id: \.self) { i in
                                    Button(action: { bossIndex = i }) {
                                        Text(MineBossGuide.all[i].emoji)
                                            .font(.title)
                                            .padding(8)
                                            .background(bossIndex == i ? Color.red.opacity(0.4) : Color.white.opacity(0.08))
                                            .cornerRadius(10)
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    VStack(spacing: 8) {
                        Text("❤️ HP drain lab (tap Hit!)").font(.headline)
                        MineBossBarDemo()
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🐌 Slow-mo defeat (tap the scene)").font(.headline)
                        MineDefeatSlowMo()
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("📌 Mine bounties").font(.headline)
                        ForEach(MineBossGuide.bounties, id: \.name) { b in
                            MineBountyCard(emoji: b.emoji, name: b.name, pay: b.pay, tip: b.tip)
                                .padding(.horizontal)
                        }
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Boss Cinema")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
