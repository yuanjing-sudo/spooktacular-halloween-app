//
//  MineWorkshopFX.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Workshop effects: anvil strike loops, molten pours, upgrade beam-ups,
//  egg incubators, tool racks and a showcase. The forge you can feel.
//

import SwiftUI

// ============================================================
// MARK: - 1. Anvil strike loop
// ============================================================

/// Anvil with a hammer that falls, flashes and throws sparks on a loop.
struct MineAnvilStrike: View {
    @State private var strike = false

    var body: some View {
        ZStack {
            // Anvil.
            VStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(
                        LinearGradient(
                            colors: [Color(white: 0.45), Color(white: 0.2)],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .frame(width: 130, height: 30)
                Rectangle()
                    .fill(Color(white: 0.18))
                    .frame(width: 36, height: 64)
            }
            .offset(y: 30)
            // Hammer.
            ZStack(alignment: .bottom) {
                Rectangle()
                    .fill(Color(red: 0.45, green: 0.3, blue: 0.16))
                    .frame(width: 10, height: 90)
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color(white: 0.35))
                    .frame(width: 54, height: 26)
                    .offset(y: -90)
            }
            .offset(x: 30, y: -30)
            .rotationEffect(.degrees(strike ? 38 : -24), anchor: .bottom)
            .animation(
                strike ? .easeIn(duration: 0.32) : .easeOut(duration: 0.9),
                value: strike
            )
            // Strike flash + sparks.
            Circle()
                .fill(Color.yellow.opacity(strike ? 0.9 : 0))
                .frame(width: 70, height: 70)
                .blur(radius: 8)
                .offset(y: 12)
            ForEach(0..<10, id: \.self) { i in
                Circle()
                    .fill(Color.orange)
                    .frame(width: 5, height: 5)
                    .offset(strike ? anvilSpark(i) : .zero)
                    .opacity(strike ? 1 : 0)
                    .animation(
                        .spring(response: 0.5, dampingFraction: 0.6)
                            .delay(Double(i) * 0.02),
                        value: strike
                    )
            }
            // Workpiece glow.
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(red: 1.0, green: 0.55, blue: 0.15))
                .frame(width: 56, height: 12)
                .shadow(color: .orange, radius: strike ? 14 : 4)
                .offset(y: 8)
        }
        .frame(height: 220)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.6, repeats: true) { _ in
                strike.toggle()
                if strike { SpookyHaptics.play(.heavy) }
            }
        }
    }

    private func anvilSpark(_ i: Int) -> CGSize {
        let angle = Double(i) / 10 * 2 * Double.pi - Double.pi / 2
        return CGSize(width: cos(angle) * 60, height: sin(angle) * 44)
    }
}

// ============================================================
// MARK: - 2. Molten pour
// ============================================================

/// Crucible pour: tilting pot, glowing stream, spreading pool, steam.
struct MineMoltenPour: View {
    @State private var pour = false

    var body: some View {
        ZStack {
            // Pool spreading below.
            Ellipse()
                .fill(Color(red: 1.0, green: 0.45, blue: 0.1).opacity(0.85))
                .frame(width: pour ? 170 : 60, height: pour ? 30 : 14)
                .blur(radius: 3)
                .shadow(color: .orange, radius: 12)
                .offset(y: 90)
                .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: pour)
            // Stream.
            Capsule()
                .fill(
                    LinearGradient(
                        colors: [.yellow, .orange],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: 12, height: pour ? 130 : 20)
                .offset(x: 40, y: 10)
                .blur(radius: 1)
                .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: pour)
            // Crucible.
            ZStack(alignment: .top) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(white: 0.25))
                    .frame(width: 90, height: 60)
                Ellipse()
                    .fill(Color(red: 1.0, green: 0.6, blue: 0.15))
                    .frame(width: 70, height: 16)
                    .shadow(color: .orange, radius: 10)
                    .offset(y: 4)
            }
            .offset(x: 52, y: -70)
            .rotationEffect(.degrees(pour ? -22 : 0))
            .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: pour)
            // Steam wisps.
            ForEach(0..<4, id: \.self) { i in
                Ellipse()
                    .fill(Color.white.opacity(0.25))
                    .frame(width: 16, height: 30)
                    .blur(radius: 4)
                    .offset(x: CGFloat(i * 30 - 45), y: pour ? -60 : 60)
                    .opacity(pour ? 0.8 : 0)
                    .animation(
                        .easeOut(duration: 1.8).repeatForever(autoreverses: false)
                            .delay(Double(i) * 0.3),
                        value: pour
                    )
            }
        }
        .frame(height: 260)
        .onAppear { pour.toggle() }
    }
}

// ============================================================
// MARK: - 3. Upgrade beam-up
// ============================================================

/// Upgrade moment: the new tool rises in a light column, rarity flash.
struct MineUpgradeBeamUp: View {
    var emoji: String
    var rarity: String
    var rarityColor: Color
    @State private var rise = false

    var body: some View {
        ZStack {
            // Light column.
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [rarityColor.opacity(0.5), .clear],
                        startPoint: .bottom, endPoint: .top
                    )
                )
                .frame(width: 80, height: 220)
                .blur(radius: 6)
                .opacity(rise ? 1 : 0.2)
            // Rising tool.
            Text(emoji)
                .font(.system(size: 64))
                .offset(y: rise ? -40 : 60)
                .scaleEffect(rise ? 1.0 : 0.5)
                .opacity(rise ? 1 : 0.3)
                .shadow(color: rarityColor, radius: rise ? 18 : 0)
                .animation(.spring(response: 0.9, dampingFraction: 0.6), value: rise)
            // Rarity ring burst.
            Circle()
                .stroke(rarityColor, lineWidth: 3)
                .frame(width: rise ? 170 : 40, height: rise ? 170 : 40)
                .opacity(rise ? 0.9 : 0)
                .animation(.easeOut(duration: 0.9), value: rise)
            Text(rarity.uppercased())
                .font(.caption.bold())
                .foregroundColor(rarityColor)
                .padding(.horizontal, 12).padding(.vertical, 5)
                .background(rarityColor.opacity(0.2))
                .cornerRadius(8)
                .offset(y: 100)
                .opacity(rise ? 1 : 0)
        }
        .frame(height: 260)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                rise = true
                SpookyHaptics.play(.reward)
            }
        }
    }
}

// ============================================================
// MARK: - 4. Egg incubator
// ============================================================

/// Incubator: nest, heat glow, wobbling egg, hatch countdown shimmer.
struct MineEggIncubator: View {
    var progress: Double // 0…1 until next hatch
    @State private var warm = false

    var body: some View {
        ZStack {
            // Nest.
            Ellipse()
                .fill(Color(red: 0.4, green: 0.28, blue: 0.14))
                .frame(width: 130, height: 44)
                .offset(y: 40)
            ForEach(0..<6, id: \.self) { i in
                Capsule()
                    .fill(Color(red: 0.5, green: 0.36, blue: 0.18))
                    .frame(width: 8, height: 34)
                    .offset(x: CGFloat(i * 20 - 50), y: 28)
                    .rotationEffect(.degrees(Double((i * 53) % 30) - 15))
            }
            // Heat glow.
            Ellipse()
                .fill(Color.orange.opacity(warm ? 0.4 : 0.15))
                .frame(width: 150, height: 60)
                .blur(radius: 10)
                .offset(y: 20)
                .animation(
                    .easeInOut(duration: 1.6).repeatForever(autoreverses: true),
                    value: warm
                )
            // Egg with progress cracks.
            ZStack {
                MinePetEgg(size: 84)
                if progress > 0.33 {
                    crackMark.opacity(0.9)
                }
                if progress > 0.66 {
                    crackMark2.opacity(0.9)
                }
            }
            .offset(y: -10)
            // Progress arc.
            Circle()
                .trim(from: 0, to: CGFloat(max(0.02, min(1, progress))))
                .stroke(Color.orange, lineWidth: 5)
                .frame(width: 120, height: 120)
                .rotationEffect(.degrees(-90))
                .animation(.spring(response: 0.5, dampingFraction: 0.7), value: progress)
            Text("\(Int(progress * 100))% warm")
                .font(.caption.bold())
                .foregroundColor(.orange)
                .offset(y: 92)
        }
        .frame(height: 250)
        .onAppear { warm.toggle() }
    }

    private var crackMark: some View {
        Path { p in
            p.move(to: CGPoint(x: -14, y: -20))
            p.addLine(to: CGPoint(x: -4, y: -4))
            p.addLine(to: CGPoint(x: -12, y: 12))
        }
        .stroke(Color.black, lineWidth: 2)
        .frame(width: 60, height: 60)
    }

    private var crackMark2: some View {
        Path { p in
            p.move(to: CGPoint(x: 14, y: -18))
            p.addLine(to: CGPoint(x: 4, y: 0))
            p.addLine(to: CGPoint(x: 12, y: 16))
        }
        .stroke(Color.black, lineWidth: 2)
        .frame(width: 60, height: 60)
    }
}

// ============================================================
// MARK: - 5. Tool rack
// ============================================================

/// Tool rack: owned picks on pegs, selected one glowing + bobbing.
struct MineToolRack: View {
    var tiers: [(emoji: String, name: String, owned: Bool, selected: Bool)]

    var body: some View {
        VStack(spacing: 0) {
            // Peg rail.
            RoundedRectangle(cornerRadius: 4)
                .fill(Color(red: 0.4, green: 0.28, blue: 0.16))
                .frame(height: 12)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(tiers.indices, id: \.self) { i in
                    let tier = tiers[i]
                    VStack(spacing: 4) {
                        Text(tier.emoji)
                            .font(.system(size: 34))
                            .opacity(tier.owned ? 1 : 0.25)
                            .saturation(tier.owned ? 1 : 0)
                            .shadow(color: tier.selected ? .orange : .clear, radius: tier.selected ? 10 : 0)
                            .scaleEffect(tier.selected ? 1.15 : 1.0)
                            .animation(.spring(response: 0.4, dampingFraction: 0.55), value: tier.selected)
                        Text(tier.name)
                            .font(.caption2)
                            .foregroundColor(tier.owned ? .primary : .gray)
                        Text(tier.selected ? "IN HAND" : (tier.owned ? "OWNED" : "🔒"))
                            .font(.caption2.bold())
                            .foregroundColor(tier.selected ? .orange : .gray)
                    }
                    .padding(8)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(tier.selected ? Color.orange.opacity(0.15) : Color.white.opacity(0.05))
                    )
                }
            }
            .padding(.top, 10)
        }
    }
}

// ============================================================
// MARK: - 6. Workshop showcase
// ============================================================

/// Workshop hall: anvil, pour, beam-ups, incubator, rack.
struct MineWorkshopShowcaseView: View {
    @State private var warmth = 0.72
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🔨 Anvil strike loop").font(.headline)
                        MineAnvilStrike()
                    }
                    VStack(spacing: 8) {
                        Text("🫳 Molten pour").font(.headline)
                        MineMoltenPour()
                    }
                    VStack(spacing: 8) {
                        Text("⬆️ Upgrade beam-ups").font(.headline)
                        HStack {
                            MineUpgradeBeamUp(emoji: "⛏️", rarity: "Rare", rarityColor: .blue)
                            MineUpgradeBeamUp(emoji: "💎⛏️", rarity: "Legendary", rarityColor: .orange)
                        }
                        .frame(height: 270)
                    }
                    VStack(spacing: 8) {
                        Text("🥚 Incubator (drag warmth)").font(.headline)
                        MineEggIncubator(progress: warmth)
                        Slider(value: $warmth, in: 0...1)
                            .padding(.horizontal, 60)
                    }
                    VStack(spacing: 8) {
                        Text("🧰 Tool rack").font(.headline)
                        MineToolRack(tiers: [
                            (emoji: "🪵⛏️", name: "Wooden", owned: true, selected: false),
                            (emoji: "🪨⛏️", name: "Stone", owned: true, selected: false),
                            (emoji: "⛏️", name: "Iron", owned: true, selected: true),
                            (emoji: "🌟⛏️", name: "Golden", owned: false, selected: false),
                            (emoji: "💎⛏️", name: "Diamond", owned: false, selected: false),
                            (emoji: "🌀⛏️", name: "Drill", owned: false, selected: false),
                        ])
                        .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Workshop FX")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
