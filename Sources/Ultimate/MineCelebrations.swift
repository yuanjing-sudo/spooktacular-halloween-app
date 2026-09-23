//
//  MineCelebrations.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Celebration kit: daily spin wheel with prize logic, sell-day parade,
//  rebirth countdown, milestone toasts and a showcase. The wheel is wired
//  to the manager (one UserDefaults date gate); everything else is instant.
//

import SwiftUI

// ============================================================
// MARK: - 1. Spin wheel model + prizes
// ============================================================

/// Daily spin prizes. Weights sum to 100.
struct MineSpinPrize {
    var emoji: String
    var label: String
    var gold: Int
    var xp: Int
    var bombs: Int
    var weight: Int
    var tint: Color
}

enum MineSpinTable {
    static var prizes: [MineSpinPrize] = [
        MineSpinPrize(emoji: "🪙", label: "+100 gold", gold: 100, xp: 0, bombs: 0, weight: 25, tint: .yellow),
        MineSpinPrize(emoji: "🪙", label: "+250 gold", gold: 250, xp: 0, bombs: 0, weight: 20, tint: .yellow),
        MineSpinPrize(emoji: "⭐", label: "+150 XP", gold: 0, xp: 150, bombs: 0, weight: 18, tint: .green),
        MineSpinPrize(emoji: "🧨", label: "+2 bombs", gold: 0, xp: 40, bombs: 2, weight: 12, tint: .red),
        MineSpinPrize(emoji: "💎", label: "+400 gold", gold: 400, xp: 100, bombs: 0, weight: 10, tint: .cyan),
        MineSpinPrize(emoji: "🎒", label: "Pack luck +300", gold: 300, xp: 80, bombs: 0, weight: 8, tint: .orange),
        MineSpinPrize(emoji: "🥚", label: "Egg fund +600", gold: 600, xp: 150, bombs: 0, weight: 5, tint: .pink),
        MineSpinPrize(emoji: "👑", label: "JACKPOT +1500", gold: 1500, xp: 500, bombs: 1, weight: 2, tint: .purple),
    ]

    /// Weighted random prize.
    static func roll() -> MineSpinPrize {
        let total = prizes.reduce(0, { $0 + $1.weight })
        var r = Int.random(in: 1...total)
        for prize in prizes {
            r -= prize.weight
            if r <= 0 { return prize }
        }
        return prizes[0]
    }

    /// Slice angle for each prize (for the wheel face).
    static func sliceAngle(index: Int) -> Double {
        let total = Double(prizes.reduce(0, { $0 + $1.weight }))
        var start = 0.0
        for i in 0..<index {
            start += Double(prizes[i].weight) / total * 360
        }
        return start
    }

    static func sliceSize(index: Int) -> Double {
        let total = Double(prizes.reduce(0, { $0 + $1.weight }))
        return Double(prizes[index].weight) / total * 360
    }
}

// ============================================================
// MARK: - 2. Spin wheel view
// ============================================================

/// Daily spin wheel: weighted slices, pointer, spin physics look,
///
/// result banner. Calls `award` with the rolled prize.
struct MineSpinWheel: View {
    var canSpin: Bool
    var award: (MineSpinPrize) -> Void
    @State private var rotation = 0.0
    @State private var spinning = false
    @State private var spent = false
    @State private var result: MineSpinPrize?
    @State private var lamp = false

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                // Rim lamps.
                ForEach(0..<12, id: \.self) { i in
                    Circle()
                        .fill(lamp && i % 2 == 0 ? Color.yellow : Color.gray.opacity(0.5))
                        .frame(width: 8, height: 8)
                        .offset(y: -118)
                        .rotationEffect(.degrees(Double(i) * 30))
                        .animation(
                            .easeInOut(duration: 0.4).repeatForever(autoreverses: true),
                            value: lamp
                        )
                }
                // Wheel face.
                ZStack {
                    ForEach(MineSpinTable.prizes.indices, id: \.self) { i in
                        wheelSlice(index: i)
                    }
                    Circle()
                        .fill(Color(red: 0.15, green: 0.1, blue: 0.2))
                        .frame(width: 64, height: 64)
                        .overlay(
                            Text("SPIN")
                                .font(.caption.bold())
                                .foregroundColor(.white)
                        )
                }
                .frame(width: 220, height: 220)
                .rotationEffect(.degrees(rotation))
                .animation(
                    spinning ? .easeOut(duration: 3.2) : .default,
                    value: rotation
                )
                // Pointer.
                Triangle()
                    .fill(Color.red)
                    .frame(width: 22, height: 26)
                    .offset(y: -128)
                    .shadow(color: .red, radius: 4)
            }
            .frame(height: 260)
            if let result = result {
                VStack(spacing: 4) {
                    Text("\(result.emoji) \(result.label)!")
                        .font(.title2.bold())
                        .foregroundColor(result.tint)
                        .scaleEffect(1.0)
                        .transition(.scale.combined(with: .opacity))
                    Text("The wheel has spoken. The wheel is generous.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            } else {
                Text(canSpin ? "One free spin daily. Fortune favors miners." : "Come back tomorrow — the wheel recharges at midnight.")
                    .font(.caption).foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)
            }
            Button(action: spin) {
                Label(spinning ? "Spinning…" : (spent ? "Come back tomorrow" : "SPIN!"), systemImage: "arrow.triangle.2.circlepath")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(MineSpringButtonStyle(tint: .purple, glow: true))
            .disabled(!canSpin || spinning || spent)
            .opacity(!canSpin || spinning || spent ? 0.6 : 1.0)
            .padding(.horizontal, 40)
        }
        .padding(.vertical, 8)
        .onAppear { lamp.toggle() }
    }

    private func wheelSlice(index: Int) -> some View {
        let prize = MineSpinTable.prizes[index]
        let start = MineSpinTable.sliceAngle(index: index)
        let size = MineSpinTable.sliceSize(index: index)
        return ZStack {
            Circle()
                .trim(from: CGFloat(start / 360), to: CGFloat((start + size) / 360))
                .stroke(prize.tint.opacity(0.85), lineWidth: 109)
                .frame(width: 220, height: 220)
                .rotationEffect(.degrees(-90))
            // Emoji rides a fixed frame rotated to the slice center, with
            // a counter-rotation so the glyph stays upright.
            ZStack {
                Text(prize.emoji)
                    .font(.title3)
                    .offset(y: -82)
                    .rotationEffect(.degrees(-(start + size / 2)))
            }
            .frame(width: 220, height: 220)
            .rotationEffect(.degrees(start + size / 2))
        }
    }

    private func spin() {
        guard canSpin, !spinning, !spent else { return }
        spinning = true
        result = nil
        let prize = MineSpinTable.roll()
        // Land the pointer on the prize: rotate so its slice center hits top.
        let index = MineSpinTable.prizes.firstIndex(where: { $0.label == prize.label }) ?? 0
        let center = MineSpinTable.sliceAngle(index: index) + MineSpinTable.sliceSize(index: index) / 2
        let target = 360 * 5 + (360 - center)
        rotation += target + Double.random(in: -8...8)
        SpookyHaptics.play(.medium)
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.3) {
            result = prize
            award(prize)
            spinning = false
            spent = true
            SpookyHaptics.play(.levelUp)
        }
    }
}

/// Daily wheel bound to the manager: day-gated, prizes land for real.
struct MineDailyWheelView: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack {
                MineSpinWheel(canSpin: manager.canSpinToday) { prize in
                    manager.applySpin(prize)
                    manager.stampSpinDay()
                }
            }
            .navigationTitle("Daily Spin")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// ============================================================
// MARK: - 3. Sell parade + milestone toasts
// ============================================================

/// Sell-day parade: marching coins, cart, confetti when a big sale lands.
struct MineSellParade: View {
    var amount: Int
    @State private var march = false

    var body: some View {
        ZStack {
            HStack(spacing: 10) {
                ForEach(0..<7, id: \.self) { i in
                    Text(["🪙", "💰", "🪙", "💎", "🪙", "💰", "🪙"][i])
                        .font(.title)
                        .offset(y: march ? -12 : 8)
                        .animation(
                            .easeInOut(duration: 0.6).repeatForever(autoreverses: true)
                                .delay(Double(i) * 0.09),
                            value: march
                        )
                }
            }
            Text("🛒")
                .font(.system(size: 44))
                .offset(x: march ? 90 : -90)
                .animation(
                    .easeInOut(duration: 2.4).repeatForever(autoreverses: true),
                    value: march
                )
            Text("+\(amount)🪙")
                .font(.headline.bold())
                .foregroundColor(.yellow)
                .offset(y: 52)
        }
        .frame(height: 130)
        .onAppear { march.toggle() }
    }
}

/// Milestone toast: big-number celebration card with star sweep.
struct MineMilestoneToast: View {
    var emoji: String
    var title: String
    var detail: String
    @State private var shine = false

    var body: some View {
        HStack(spacing: 12) {
            Text(emoji)
                .font(.system(size: 44))
                .rotationEffect(.degrees(shine ? 10 : -10))
                .animation(
                    .easeInOut(duration: 1.2).repeatForever(autoreverses: true),
                    value: shine
                )
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline)
                Text(detail)
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "star.fill")
                .foregroundColor(.yellow)
                .scaleEffect(shine ? 1.3 : 0.9)
                .animation(
                    .spring(response: 0.5, dampingFraction: 0.5).repeatForever(autoreverses: true),
                    value: shine
                )
        }
        .padding(12)
        .background(
            LinearGradient(
                colors: [Color.purple.opacity(0.35), Color.black.opacity(0.6)],
                startPoint: .leading, endPoint: .trailing
            )
        )
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.yellow.opacity(shine ? 0.8 : 0.3), lineWidth: 2)
                .animation(
                    .easeInOut(duration: 1.2).repeatForever(autoreverses: true),
                    value: shine
                )
        )
        .onAppear { shine.toggle() }
    }
}

// ============================================================
// MARK: - 4. Celebrations showcase
// ============================================================

/// Celebration hall: wheel demo, parade, milestones.
struct MineCelebrationShowcaseView: View {
    @State private var lastPrize = "No spin yet"
    @State private var paradeGold = 1240
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🎡 Daily spin wheel").font(.headline)
                        MineSpinWheel(canSpin: true) { prize in
                            lastPrize = "\(prize.emoji) \(prize.label)"
                        }
                        Text(lastPrize).font(.caption).foregroundStyle(.secondary)
                    }
                    VStack(spacing: 8) {
                        Text("🛒 Sell parade").font(.headline)
                        MineSellParade(amount: paradeGold)
                        Button("+100 parade gold") { paradeGold += 100 }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                    VStack(spacing: 8) {
                        Text("🏆 Milestones").font(.headline)
                        MineMilestoneToast(emoji: "⛏️", title: "1,000 blocks!", detail: "The tally wall needed a second wall.")
                            .padding(.horizontal)
                        MineMilestoneToast(emoji: "💰", title: "100,000 gold lifetime!", detail: "The cart needs new axles because of you.")
                            .padding(.horizontal)
                        MineMilestoneToast(emoji: "💫", title: "Third rebirth!", detail: "+45% everything. Compound interest, but pickaxes.")
                            .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Celebrations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
