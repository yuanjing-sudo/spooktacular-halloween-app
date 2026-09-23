//
//  MineCrystalTheater2.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Advanced crystal effects, act two: geode cross-sections, growth
//  timelapses, prismatic refraction fans, the treasure vault, five more
//  sealed-door styles, shining mineral gems, bouncing price tags and a
//  grand showcase. Companions the base crystal theater file.
//

import SwiftUI

// ============================================================
// MARK: - 1. Geodes (cross-section sparkle)
// ============================================================

/// Cracked geode: dark rind, glittering crystal heart, sparkle sweep.
struct MineGeodeView: View {
    var color: Color = .purple
    var size: CGFloat = 130
    @State private var alive = false

    var body: some View {
        ZStack {
            // Outer rind (two halves, slightly parted).
            HStack(spacing: size * 0.1) {
                MineGeodeHalf(color: color, size: size, flip: false)
                    .offset(x: alive ? -4 : 0)
                MineGeodeHalf(color: color, size: size, flip: true)
                    .offset(x: alive ? 4 : 0)
            }
            .animation(
                .easeInOut(duration: 3).repeatForever(autoreverses: true),
                value: alive
            )
            // Heart sparkle sweep.
            Ellipse()
                .fill(
                    LinearGradient(
                        colors: [.clear, .white.opacity(0.8), .clear],
                        startPoint: alive ? .leading : .trailing,
                        endPoint: alive ? .trailing : .leading
                    )
                )
                .frame(width: size * 0.7, height: size * 0.5)
                .blur(radius: 3)
                .animation(
                    .easeInOut(duration: 2.2).repeatForever(autoreverses: true),
                    value: alive
                )
            // Rising glints.
            ForEach(0..<5, id: \.self) { i in
                Circle()
                    .fill(Color.white)
                    .frame(width: 4, height: 4)
                    .offset(
                        x: CGFloat(i * 12 - 24),
                        y: alive ? -size * 0.4 : size * 0.1
                    )
                    .opacity(alive ? 0 : 0.9)
                    .animation(
                        .easeOut(duration: 1.8).repeatForever(autoreverses: false)
                            .delay(Double(i) * 0.2),
                        value: alive
                    )
            }
        }
        .frame(width: size * 1.4, height: size)
        .onAppear { alive.toggle() }
    }
}

/// One rind half with crystal teeth.
struct MineGeodeHalf: View {
    var color: Color
    var size: CGFloat
    var flip: Bool

    var body: some View {
        ZStack(alignment: flip ? .trailing : .leading) {
            // Rind.
            UnevenRoundedRectangle(
                topLeadingRadius: flip ? 6 : size * 0.45,
                bottomLeadingRadius: flip ? 6 : size * 0.45,
                bottomTrailingRadius: flip ? size * 0.45 : 6,
                topTrailingRadius: flip ? size * 0.45 : 6
            )
            .fill(Color(white: 0.16))
            .frame(width: size * 0.52, height: size * 0.8)
            // Crystal teeth.
            HStack(spacing: 2) {
                ForEach(0..<4, id: \.self) { i in
                    Triangle()
                        .fill(color.opacity(0.9))
                        .frame(width: 10, height: 18 + CGFloat((i * 29) % 14))
                }
            }
            .rotationEffect(.degrees(flip ? -90 : 90))
        }
    }
}

// ============================================================
// MARK: - 2. Growth timelapse (seed → spire loop)
// ============================================================

/// Timelapse: seed dot → sprout → spire → shimmer → seed again.
struct MineGrowthTimelapse: View {
    var color: Color = .cyan
    @State private var stage = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            // Soil glow.
            Ellipse()
                .fill(color.opacity(0.3))
                .frame(width: 90, height: 20)
            // Growing spire.
            Triangle()
                .fill(
                    LinearGradient(
                        colors: [.white, color, color.opacity(0.5)],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: 12 + CGFloat(stage) * 10, height: CGFloat(stage) * 26)
                .opacity(stage == 0 ? 0 : 1)
                .animation(.spring(response: 0.7, dampingFraction: 0.55), value: stage)
            // Seed dot.
            Circle()
                .fill(Color.white)
                .frame(width: 8, height: 8)
                .opacity(stage == 0 ? 1 : 0)
            // Shimmer at full growth.
            if stage == 3 {
                Circle()
                    .stroke(color, lineWidth: 2)
                    .frame(width: 90, height: 90)
                    .opacity(0.7)
                    .transition(.scale.combined(with: .opacity))
            }
            Text(["seed", "sprout", "spire", "bloom"][stage])
                .font(.caption2.bold())
                .foregroundColor(.white.opacity(0.8))
                .offset(y: 34)
        }
        .frame(height: 170)
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { _ in
                stage = (stage + 1) % 4
                if stage == 3 { SpookyHaptics.play(.light) }
            }
        }
    }
}

// ============================================================
// MARK: - 3. Prism refraction fans
// ============================================================

/// Prism fan: white beam in, rainbow fan out, slowly rotating.
struct MinePrismFan: View {
    @State private var spin = false

    var body: some View {
        ZStack {
            // Incoming beam.
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [.white, .clear],
                        startPoint: .leading, endPoint: .trailing
                    )
                )
                .frame(width: 90, height: 8)
                .offset(x: -75)
                .blur(radius: 1)
            // Prism.
            Triangle()
                .fill(
                    LinearGradient(
                        colors: [.white.opacity(0.9), Color(white: 0.6).opacity(0.7)],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: 44, height: 52)
                .shadow(color: .white.opacity(0.5), radius: 8)
            // Outgoing fan.
            ForEach(0..<7, id: \.self) { i in
                Capsule()
                    .fill(prismColor(i).opacity(0.65))
                    .frame(width: 86, height: 5)
                    .offset(x: 62)
                    .rotationEffect(.degrees(Double(i * 9 - 27)))
                    .blur(radius: 1)
            }
            // Sparkle at the split point.
            Circle()
                .fill(Color.white)
                .frame(width: 8, height: 8)
                .blur(radius: 1)
                .scaleEffect(spin ? 1.4 : 0.8)
                .animation(
                    .easeInOut(duration: 1.2).repeatForever(autoreverses: true),
                    value: spin
                )
        }
        .rotationEffect(.degrees(spin ? 8 : -8))
        .animation(
            .easeInOut(duration: 5).repeatForever(autoreverses: true),
            value: spin
        )
        .frame(height: 170)
        .onAppear { spin.toggle() }
    }

    private func prismColor(_ i: Int) -> Color {
        [.red, .orange, .yellow, .green, .cyan, .blue, .purple][i % 7]
    }
}

// ============================================================
// MARK: - 4. Treasure vault room
// ============================================================

/// The vault: coin pile with glow, gem clusters, chalice, dripping gold.
struct MineTreasureVault: View {
    @State private var gleam = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Back glow.
            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [Color.yellow.opacity(0.5), .clear],
                        center: .center, startRadius: 10, endRadius: 120
                    )
                )
                .frame(width: 240, height: 120)
                .opacity(gleam ? 1 : 0.6)
                .animation(
                    .easeInOut(duration: 2).repeatForever(autoreverses: true),
                    value: gleam
                )
            // Coin pile (stacked rows).
            VStack(spacing: -8) {
                ForEach(0..<4, id: \.self) { row in
                    HStack(spacing: -6) {
                        ForEach(0..<(7 - row), id: \.self) { _ in
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [.yellow, Color(red: 0.85, green: 0.6, blue: 0.1)],
                                        startPoint: .topLeading, endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 22, height: 22)
                                .shadow(color: .yellow.opacity(0.6), radius: gleam ? 6 : 2)
                        }
                    }
                }
            }
            .offset(y: -6)
            // Gem clusters on top.
            HStack(spacing: 8) {
                MineAnimatedCube(color: .red, size: 22)
                MineAnimatedOrb(color: .cyan, size: 24)
                MineAnimatedSpike(color: .green, height: 30)
                MineAnimatedCube(color: .purple, size: 20)
            }
            .offset(y: -86)
            // Chalice.
            Text("🏆")
                .font(.system(size: 34))
                .offset(x: 70, y: -60)
                .rotationEffect(.degrees(gleam ? 6 : -6))
                .animation(
                    .easeInOut(duration: 2.4).repeatForever(autoreverses: true),
                    value: gleam
                )
            // Dripping gold sparkles.
            ForEach(0..<5, id: \.self) { i in
                Circle()
                    .fill(Color.yellow)
                    .frame(width: 4, height: 4)
                    .offset(
                        x: CGFloat(i * 24 - 48),
                        y: gleam ? -110 : -70
                    )
                    .opacity(gleam ? 0 : 0.9)
                    .animation(
                        .easeOut(duration: 1.6).repeatForever(autoreverses: false)
                            .delay(Double(i) * 0.25),
                        value: gleam
                    )
            }
        }
        .frame(height: 220)
        .onAppear { gleam.toggle() }
    }
}

// ============================================================
// MARK: - 5. Five more door styles
// ============================================================

/// Extended door style set for frontier + deep seals.
enum MineDoorStyle2: String, CaseIterable {
    case iceGate = "Ice Gate"
    case vineDoor = "Vine Door"
    case gearVault = "Gear Vault"
    case mirrorPortal = "Mirror Portal"
    case boneArch = "Bone Arch"

    var emoji: String {
        switch self {
        case .iceGate: return "🧊"
        case .vineDoor: return "🌿"
        case .gearVault: return "⚙️"
        case .mirrorPortal: return "🪞"
        case .boneArch: return "🦴"
        }
    }

    var tint: Color {
        switch self {
        case .iceGate: return Color(red: 0.6, green: 0.9, blue: 1.0)
        case .vineDoor: return Color(red: 0.3, green: 0.7, blue: 0.35)
        case .gearVault: return Color(red: 0.8, green: 0.65, blue: 0.3)
        case .mirrorPortal: return Color(red: 0.8, green: 0.85, blue: 1.0)
        case .boneArch: return Color(white: 0.85)
        }
    }

    var flavor: String {
        switch self {
        case .iceGate: return "Cold to the touch, warm to the idea of minerals."
        case .vineDoor: return "Grown shut. The vines accept ore as pruning fees."
        case .gearVault: return "Clicks when you walk past. It is counting your coins."
        case .mirrorPortal: return "Shows you rich. Pay to make it true."
        case .boneArch: return "Ancient ribs, older lock. Respect the architecture."
        }
    }
}

/// Second door gallery body (medallion + cost chips supplied by caller).
struct MineLockedDoor2: View {
    var style: MineDoorStyle2
    var costs: [(emoji: String, have: Int, need: Int)]
    var affordable: Bool
    var onKnock: () -> Void
    @State private var deny = false
    @State private var breathe = false

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                doorBody
                ZStack {
                    Circle()
                        .fill(Color.black.opacity(0.55))
                        .frame(width: 60, height: 60)
                    Circle()
                        .stroke(style.tint, lineWidth: 3)
                        .frame(width: 60, height: 60)
                        .opacity(breathe ? 1 : 0.5)
                        .scaleEffect(breathe ? 1.06 : 0.96)
                        .animation(
                            .easeInOut(duration: 1.6).repeatForever(autoreverses: true),
                            value: breathe
                        )
                    Text(style.emoji).font(.system(size: 26))
                    Image(systemName: "lock.fill")
                        .foregroundColor(.white)
                        .font(.caption.bold())
                        .offset(y: 19)
                }
                .offset(x: deny ? 8 : 0)
                .animation(.spring(response: 0.2, dampingFraction: 0.2), value: deny)
            }
            .frame(height: 180)
            .onTapGesture {
                if affordable {
                    onKnock()
                } else {
                    deny = true
                    SpookyHaptics.play(.error)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        deny = false
                    }
                }
            }
            Text(style.rawValue).font(.headline)
            Text(style.flavor)
                .font(.caption).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            HStack(spacing: 8) {
                ForEach(costs.indices, id: \.self) { i in
                    let c = costs[i]
                    HStack(spacing: 4) {
                        Text(c.emoji)
                        Text("\(min(c.have, c.need))/\(c.need)")
                            .font(.caption.bold()).monospacedDigit()
                    }
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background((c.have >= c.need ? Color.green : Color.red).opacity(0.25))
                    .foregroundColor(c.have >= c.need ? .green : .red)
                    .cornerRadius(8)
                }
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
        .onAppear { breathe.toggle() }
    }

    @ViewBuilder
    private var doorBody: some View {
        switch style {
        case .iceGate:
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(
                        LinearGradient(
                            colors: [Color(red: 0.7, green: 0.9, blue: 1.0), Color(red: 0.3, green: 0.55, blue: 0.8)],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .frame(width: 150, height: 170)
                // Frost cracks.
                ForEach(0..<4, id: \.self) { i in
                    Rectangle()
                        .fill(Color.white.opacity(0.6))
                        .frame(width: 2, height: 120 - CGFloat(i) * 18)
                        .rotationEffect(.degrees(Double(i) * 22 - 30))
                }
            }
        case .vineDoor:
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(red: 0.1, green: 0.2, blue: 0.1))
                    .frame(width: 150, height: 170)
                ForEach(0..<5, id: \.self) { i in
                    Capsule()
                        .fill(Color(red: 0.25, green: 0.6, blue: 0.3))
                        .frame(width: 12, height: 160 - CGFloat((i * 53) % 40))
                        .offset(x: CGFloat(i * 26 - 52))
                        .rotationEffect(.degrees(Double((i * 37) % 20) - 10))
                }
                Text("🍃").font(.title).offset(x: 40, y: -50)
            }
        case .gearVault:
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color(red: 0.75, green: 0.6, blue: 0.3), Color(red: 0.3, green: 0.22, blue: 0.1)],
                            center: .center, startRadius: 10, endRadius: 85
                        )
                    )
                    .frame(width: 170, height: 170)
                ForEach(0..<8, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(red: 0.5, green: 0.38, blue: 0.18))
                        .frame(width: 16, height: 26)
                        .offset(y: -78)
                        .rotationEffect(.degrees(Double(i) * 45))
                }
                Circle()
                    .fill(Color(red: 0.2, green: 0.14, blue: 0.06))
                    .frame(width: 110, height: 110)
            }
        case .mirrorPortal:
            ZStack {
                Ellipse()
                    .fill(
                        LinearGradient(
                            colors: [.white, Color(red: 0.7, green: 0.8, blue: 1.0), .white],
                            startPoint: .leading, endPoint: .trailing
                        )
                    )
                    .frame(width: 120, height: 170)
                    .blur(radius: 1)
                Ellipse()
                    .stroke(Color.white, lineWidth: 4)
                    .frame(width: 120, height: 170)
                // Your rich reflection (sparkles).
                ForEach(0..<5, id: \.self) { i in
                    Circle()
                        .fill(Color.yellow)
                        .frame(width: 5, height: 5)
                        .offset(x: CGFloat((i * 41) % 60 - 30), y: CGFloat((i * 67) % 100 - 50))
                }
            }
        case .boneArch:
            ZStack {
                RoundedRectangle(cornerRadius: 60)
                    .fill(Color.black.opacity(0.6))
                    .frame(width: 140, height: 170)
                ForEach(0..<5, id: \.self) { i in
                    Capsule()
                        .fill(Color(white: 0.85))
                        .frame(width: 10, height: 150 - CGFloat(i) * 8)
                        .offset(x: CGFloat(i * 28 - 56))
                        .rotationEffect(.degrees(Double(i) * 8 - 16))
                }
            }
        }
    }
}

// ============================================================
// MARK: - 6. Shining mineral gems + price tags
// ============================================================

/// One mineral gem icon with a shine sweep + count badge.
struct MineMineralGem: View {
    var emoji: String
    var have: Int
    var need: Int
    @State private var shine = false

    var body: some View {
        ZStack {
            Circle()
                .fill((have >= need ? Color.green : Color.red).opacity(0.2))
                .frame(width: 54, height: 54)
            Text(emoji).font(.title)
            // Shine sweep.
            Circle()
                .fill(
                    LinearGradient(
                        colors: [.clear, .white.opacity(0.7), .clear],
                        startPoint: shine ? .topLeading : .bottomTrailing,
                        endPoint: shine ? .bottomTrailing : .topLeading
                    )
                )
                .frame(width: 54, height: 54)
                .clipShape(Circle())
                .opacity(0.8)
                .animation(
                    .easeInOut(duration: 1.6).repeatForever(autoreverses: true),
                    value: shine
                )
            Text("\(min(have, need))/\(need)")
                .font(.caption2.bold())
                .padding(.horizontal, 6).padding(.vertical, 2)
                .background(Color.black.opacity(0.7))
                .foregroundColor(have >= need ? .green : .white)
                .cornerRadius(6)
                .offset(y: 32)
        }
        .frame(width: 60, height: 72)
        .onAppear { shine.toggle() }
    }
}

/// Bouncing price tag: total cost with bargain pulse when affordable.
struct MinePriceTag: View {
    var totalHave: Int
    var totalNeed: Int
    @State private var bounce = false

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: totalHave >= totalNeed ? "tag.fill" : "tag")
            Text(totalHave >= totalNeed ? "Deal! Open it!" : "\(totalHave)/\(totalNeed) minerals")
                .font(.headline)
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .background(totalHave >= totalNeed ? Color.green : Color.gray.opacity(0.4))
        .foregroundColor(.white)
        .cornerRadius(14)
        .scaleEffect(bounce && totalHave >= totalNeed ? 1.06 : 1.0)
        .animation(
            .spring(response: 0.4, dampingFraction: 0.5).repeatForever(autoreverses: true),
            value: bounce
        )
        .onAppear { bounce.toggle() }
    }
}

// ============================================================
// MARK: - 7. Grand showcase
// ============================================================

/// Act-two crystal showcase: geodes, timelapse, prisms, vault,
///
/// second doors, gems, tags.
struct MineCrystalTheater2ShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🪨 Living geodes").font(.headline)
                        HStack(spacing: 20) {
                            MineGeodeView(color: .purple, size: 120)
                            MineGeodeView(color: .cyan, size: 100)
                        }
                        Text("Cracked rind, glitter hearts, rising glints.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    VStack(spacing: 8) {
                        Text("🌱 Growth timelapse").font(.headline)
                        HStack(spacing: 30) {
                            MineGrowthTimelapse(color: .cyan)
                            MineGrowthTimelapse(color: .purple)
                        }
                        Text("Seed → sprout → spire → bloom, forever.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    VStack(spacing: 8) {
                        Text("🌈 Prism fan").font(.headline)
                        MinePrismFan()
                        Text("White light in, seven colors out.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    VStack(spacing: 8) {
                        Text("🏆 Treasure vault").font(.headline)
                        MineTreasureVault()
                    }
                    VStack(spacing: 8) {
                        Text("🚪 Second door gallery").font(.headline)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(MineDoorStyle2.allCases, id: \.self) { style in
                                    MineLockedDoor2(
                                        style: style,
                                        costs: [(emoji: "🟨", have: 6, need: 6), (emoji: "💎", have: 1, need: 3)],
                                        affordable: true,
                                        onKnock: { SpookyHaptics.play(.medium) }
                                    )
                                    .frame(width: 220)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    VStack(spacing: 8) {
                        Text("💎 Mineral gems + price tags").font(.headline)
                        HStack(spacing: 16) {
                            MineMineralGem(emoji: "🟨", have: 8, need: 6)
                            MineMineralGem(emoji: "💎", have: 1, need: 3)
                            MineMineralGem(emoji: "🟩", have: 4, need: 4)
                        }
                        MinePriceTag(totalHave: 13, totalNeed: 13)
                        MinePriceTag(totalHave: 5, totalNeed: 13)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Crystal Theater II")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
