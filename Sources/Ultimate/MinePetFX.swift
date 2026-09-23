//
//  MinePetFX.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Animated pet sprites for the mine's hatchable crew: six species built
//  from shapes with idle loops, a hatch ceremony (shake → crack → reveal),
//  equip shine, and a showcase. Pure view layer.
//

import SwiftUI

// ============================================================
// MARK: - 1. Pet sprites (one per species)
// ============================================================

/// Animated pet sprite by species name. Unknown species get a mystery egg.
struct MinePetSprite: View {
    var species: String
    var size: CGFloat = 44

    var body: some View {
        Group {
            switch species {
            case "Mole": MinePetMole(size: size)
            case "Bat": MinePetBat(size: size)
            case "Axolotl": MinePetAxolotl(size: size)
            case "Fox": MinePetFox(size: size)
            case "Wisp": MinePetWisp(size: size)
            case "Dragon": MinePetDragon(size: size)
            default: MinePetEgg(size: size)
            }
        }
    }
}

/// Shared bounce wrapper: idle hop loop.
struct MinePetBounce<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var delay: Double = 0
    @State private var hop = false

    var body: some View {
        content()
            .offset(y: hop ? -6 : 2)
            .scaleEffect(x: hop ? 0.96 : 1.04, y: hop ? 1.06 : 0.96)
            .animation(
                .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                    .delay(delay),
                value: hop
            )
            .onAppear { hop.toggle() }
    }
}

/// Mole: brown mound body, pink nose, tiny hard hat.
struct MinePetMole: View {
    var size: CGFloat

    var body: some View {
        MinePetBounce {
            ZStack {
                // Body mound.
                Ellipse()
                    .fill(Color(red: 0.5, green: 0.36, blue: 0.24))
                    .frame(width: size, height: size * 0.8)
                // Snout + nose.
                Ellipse()
                    .fill(Color(red: 0.95, green: 0.75, blue: 0.65))
                    .frame(width: size * 0.4, height: size * 0.3)
                    .offset(y: size * 0.12)
                Circle()
                    .fill(Color.pink)
                    .frame(width: size * 0.12, height: size * 0.12)
                    .offset(y: size * 0.2)
                // Eyes.
                HStack(spacing: size * 0.2) {
                    Circle().fill(Color.black).frame(width: 5, height: 5)
                    Circle().fill(Color.black).frame(width: 5, height: 5)
                }
                .offset(y: -size * 0.05)
                // Hard hat.
                MinePetHat(color: .yellow, width: size * 0.55)
                    .offset(y: -size * 0.42)
                // Digger claws.
                HStack(spacing: size * 0.5) {
                    Capsule().fill(Color(red: 0.95, green: 0.75, blue: 0.65)).frame(width: 8, height: 14)
                    Capsule().fill(Color(red: 0.95, green: 0.75, blue: 0.65)).frame(width: 8, height: 14)
                }
                .offset(y: size * 0.32)
            }
        }
        .frame(width: size, height: size)
    }
}

/// Bat: flapping wings, hanging sway, red eyes.
struct MinePetBat: View {
    var size: CGFloat
    @State private var flap = false
    @State private var sway = false

    var body: some View {
        ZStack {
            // Wings.
            HStack(spacing: -6) {
                MineBatWing(flip: false, flap: flap, size: size)
                MineBatWing(flip: true, flap: flap, size: size)
            }
            // Body.
            Ellipse()
                .fill(Color(red: 0.3, green: 0.22, blue: 0.45))
                .frame(width: size * 0.5, height: size * 0.62)
            // Ears.
            HStack(spacing: size * 0.2) {
                Triangle()
                    .fill(Color(red: 0.3, green: 0.22, blue: 0.45))
                    .frame(width: 12, height: 14)
                Triangle()
                    .fill(Color(red: 0.3, green: 0.22, blue: 0.45))
                    .frame(width: 12, height: 14)
            }
            .offset(y: -size * 0.32)
            // Red eyes.
            HStack(spacing: size * 0.14) {
                Circle().fill(Color.red).frame(width: 6, height: 6)
                    .shadow(color: .red, radius: 4)
                Circle().fill(Color.red).frame(width: 6, height: 6)
                    .shadow(color: .red, radius: 4)
            }
            .offset(y: -size * 0.05)
        }
        .rotationEffect(.degrees(sway ? 5 : -5))
        .animation(
            .easeInOut(duration: 2.2).repeatForever(autoreverses: true),
            value: sway
        )
        .frame(width: size, height: size)
        .onAppear {
            flap.toggle()
            sway.toggle()
        }
    }
}

/// One bat wing with flap.
struct MineBatWing: View {
    var flip: Bool
    var flap: Bool
    var size: CGFloat

    var body: some View {
        Ellipse()
            .fill(Color(red: 0.38, green: 0.28, blue: 0.55))
            .frame(width: size * 0.5, height: size * 0.34)
            .scaleEffect(y: flap ? 0.35 : 1.0)
            .offset(y: flap ? -size * 0.1 : 0)
            .scaleEffect(x: flip ? -1 : 1)
            .animation(
                .easeInOut(duration: 0.45).repeatForever(autoreverses: true),
                value: flap
            )
    }
}

/// Axolotl: pink blob, frilly gills, eternal smile.
struct MinePetAxolotl: View {
    var size: CGFloat
    @State private var wiggle = false

    var body: some View {
        MinePetBounce {
            ZStack {
                // Gills (frilly sides).
                HStack(spacing: size * 0.52) {
                    VStack(spacing: 2) {
                        ForEach(0..<3, id: \.self) { _ in
                            Capsule()
                                .fill(Color(red: 1.0, green: 0.45, blue: 0.6))
                                .frame(width: 10, height: 6)
                        }
                    }
                    VStack(spacing: 2) {
                        ForEach(0..<3, id: \.self) { _ in
                            Capsule()
                                .fill(Color(red: 1.0, green: 0.45, blue: 0.6))
                                .frame(width: 10, height: 6)
                        }
                    }
                }
                // Body.
                Ellipse()
                    .fill(Color(red: 1.0, green: 0.72, blue: 0.8))
                    .frame(width: size * 0.72, height: size * 0.6)
                // Smile.
                HStack(spacing: size * 0.16) {
                    Circle().fill(Color.black).frame(width: 5, height: 5)
                    Circle().fill(Color.black).frame(width: 5, height: 5)
                }
                .offset(y: -size * 0.04)
                Path { p in
                    p.move(to: CGPoint(x: -8, y: 6))
                    p.addQuadCurve(to: CGPoint(x: 8, y: 6), control: CGPoint(x: 0, y: 14))
                }
                .stroke(Color.black, lineWidth: 2)
                .frame(width: size * 0.4, height: size * 0.3)
                .offset(y: size * 0.06)
                // Tail fin.
                Ellipse()
                    .fill(Color(red: 1.0, green: 0.6, blue: 0.72))
                    .frame(width: size * 0.3, height: size * 0.5)
                    .offset(x: size * 0.42)
                    .rotationEffect(.degrees(wiggle ? 12 : -12))
                    .animation(
                        .easeInOut(duration: 0.9).repeatForever(autoreverses: true),
                        value: wiggle
                    )
            }
        }
        .frame(width: size, height: size)
        .onAppear { wiggle.toggle() }
    }
}

/// Fox: orange wedge head, white cheeks, swishing tail.
struct MinePetFox: View {
    var size: CGFloat
    @State private var swish = false

    var body: some View {
        MinePetBounce {
            ZStack {
                // Tail.
                Ellipse()
                    .fill(Color(red: 0.95, green: 0.5, blue: 0.2))
                    .frame(width: size * 0.5, height: size * 0.3)
                    .offset(x: -size * 0.4, y: size * 0.2)
                    .rotationEffect(.degrees(swish ? 18 : -10))
                    .animation(
                        .easeInOut(duration: 1.1).repeatForever(autoreverses: true),
                        value: swish
                    )
                Ellipse()
                    .fill(Color.white)
                    .frame(width: size * 0.2, height: size * 0.18)
                    .offset(x: -size * 0.55, y: size * 0.24)
                // Head.
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(red: 0.95, green: 0.5, blue: 0.2))
                    .frame(width: size * 0.66, height: size * 0.56)
                // Cheeks + nose.
                Ellipse()
                    .fill(Color.white)
                    .frame(width: size * 0.4, height: size * 0.24)
                    .offset(y: size * 0.14)
                Circle()
                    .fill(Color.black)
                    .frame(width: 7, height: 7)
                    .offset(y: size * 0.12)
                // Ears.
                HStack(spacing: size * 0.3) {
                    Triangle().fill(Color(red: 0.9, green: 0.42, blue: 0.16)).frame(width: 16, height: 18)
                    Triangle().fill(Color(red: 0.9, green: 0.42, blue: 0.16)).frame(width: 16, height: 18)
                }
                .offset(y: -size * 0.32)
                // Eyes (cool half-lidded).
                HStack(spacing: size * 0.18) {
                    Capsule().fill(Color.black).frame(width: 9, height: 5)
                    Capsule().fill(Color.black).frame(width: 9, height: 5)
                }
                .offset(y: -size * 0.02)
            }
        }
        .frame(width: size, height: size)
        .onAppear { swish.toggle() }
    }
}

/// Wisp: glowing flame blob with trailing sparks.
struct MinePetWisp: View {
    var size: CGFloat
    @State private var flicker = false

    var body: some View {
        MinePetBounce {
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [.yellow.opacity(0.7), .clear],
                            center: .center, startRadius: 4, endRadius: size * 0.6
                        )
                    )
                    .frame(width: size * 1.2, height: size * 1.2)
                    .opacity(flicker ? 1 : 0.6)
                    .animation(
                        .easeInOut(duration: 1.1).repeatForever(autoreverses: true),
                        value: flicker
                    )
                // Flame body.
                Ellipse()
                    .fill(
                        LinearGradient(
                            colors: [.white, .yellow, .orange],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .frame(width: size * 0.55, height: size * 0.7)
                    .scaleEffect(y: flicker ? 1.12 : 0.94, anchor: .bottom)
                    .animation(
                        .easeInOut(duration: 0.9).repeatForever(autoreverses: true),
                        value: flicker
                    )
                // Happy closed eyes.
                HStack(spacing: size * 0.16) {
                    Capsule().fill(Color.black).frame(width: 8, height: 4)
                    Capsule().fill(Color.black).frame(width: 8, height: 4)
                }
            }
        }
        .frame(width: size, height: size)
        .onAppear { flicker.toggle() }
    }
}

/// Dragon: horned head, wing nubs, smoke puff.
struct MinePetDragon: View {
    var size: CGFloat
    @State private var puff = false

    var body: some View {
        MinePetBounce {
            ZStack {
                // Wing nubs.
                HStack(spacing: size * 0.5) {
                    Triangle().fill(Color(red: 0.5, green: 0.2, blue: 0.7)).frame(width: 20, height: 26)
                    Triangle().fill(Color(red: 0.5, green: 0.2, blue: 0.7)).frame(width: 20, height: 26)
                }
                .offset(y: -size * 0.1)
                // Head.
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(red: 0.6, green: 0.3, blue: 0.85))
                    .frame(width: size * 0.62, height: size * 0.55)
                // Horns.
                HStack(spacing: size * 0.28) {
                    Triangle().fill(Color(white: 0.9)).frame(width: 12, height: 16)
                    Triangle().fill(Color(white: 0.9)).frame(width: 12, height: 16)
                }
                .offset(y: -size * 0.34)
                // Eyes + snout smoke.
                HStack(spacing: size * 0.16) {
                    Circle().fill(Color.yellow).frame(width: 8, height: 8)
                        .shadow(color: .yellow, radius: 4)
                    Circle().fill(Color.yellow).frame(width: 8, height: 8)
                        .shadow(color: .yellow, radius: 4)
                }
                .offset(y: -size * 0.04)
                Circle()
                    .fill(Color.gray.opacity(puff ? 0.7 : 0.0))
                    .frame(width: puff ? 14 : 4, height: puff ? 14 : 4)
                    .blur(radius: 2)
                    .offset(y: size * 0.3)
                    .animation(
                        .easeOut(duration: 1.2).repeatForever(autoreverses: false),
                        value: puff
                    )
            }
        }
        .frame(width: size, height: size)
        .onAppear { puff.toggle() }
    }
}

/// Mystery egg (unknown species placeholder).
struct MinePetEgg: View {
    var size: CGFloat
    @State private var wobble = false

    var body: some View {
        ZStack {
            Ellipse()
                .fill(
                    LinearGradient(
                        colors: [Color(red: 0.95, green: 0.85, blue: 0.7), Color(red: 0.8, green: 0.65, blue: 0.45)],
                        startPoint: .top, endPoint: .bottom
                    )
                )
                .frame(width: size * 0.7, height: size * 0.85)
            Text("?")
                .font(.system(size: size * 0.35, weight: .black))
                .foregroundColor(.brown)
        }
        .rotationEffect(.degrees(wobble ? 8 : -8))
        .animation(
            .easeInOut(duration: 0.8).repeatForever(autoreverses: true),
            value: wobble
        )
        .frame(width: size, height: size)
        .onAppear { wobble.toggle() }
    }
}

/// Construction hard hat helper.
struct MinePetHat: View {
    var color: Color
    var width: CGFloat

    var body: some View {
        ZStack(alignment: .bottom) {
            Ellipse()
                .fill(color)
                .frame(width: width, height: width * 0.45)
            Rectangle()
                .fill(color)
                .frame(width: width * 0.4, height: width * 0.25)
                .offset(y: -width * 0.18)
        }
    }
}

// ============================================================
// MARK: - 2. Hatch ceremony (shake → crack → reveal)
// ============================================================

/// Egg hatching ceremony: wobble, cracks, flash, reveal + burst.
struct MineHatchCeremony: View {
    var species: String
    var rarity: String
    @State private var stage = 0

    var body: some View {
        ZStack {
            if stage < 3 {
                // Shaking egg with growing cracks.
                ZStack {
                    MinePetEgg(size: 110)
                        .rotationEffect(.degrees(stage == 0 ? 0 : (stage == 1 ? 10 : -10)))
                        .scaleEffect(stage == 2 ? 1.08 : 1.0)
                        .animation(.spring(response: 0.4, dampingFraction: 0.4), value: stage)
                    if stage >= 1 {
                        Path { p in
                            p.move(to: CGPoint(x: -20, y: -30))
                            p.addLine(to: CGPoint(x: -6, y: -8))
                            p.addLine(to: CGPoint(x: -16, y: 12))
                            p.move(to: CGPoint(x: 18, y: -28))
                            p.addLine(to: CGPoint(x: 6, y: -4))
                            p.addLine(to: CGPoint(x: 16, y: 16))
                        }
                        .stroke(Color.black, lineWidth: 2.5)
                        .frame(width: 90, height: 90)
                    }
                    if stage == 2 {
                        Color.white.opacity(0.5)
                            .frame(width: 130, height: 130)
                            .cornerRadius(20)
                            .blur(radius: 6)
                    }
                }
                Text(["…", "Something stirs…", "It's hatching!!"][stage])
                    .font(.headline)
                    .offset(y: 100)
            } else {
                // Reveal.
                VStack(spacing: 8) {
                    MinePetSprite(species: species, size: 110)
                        .scaleEffect(1.0)
                        .transition(.scale.combined(with: .opacity))
                    Text(species)
                        .font(.title.bold())
                    Text(rarity)
                        .font(.headline)
                        .foregroundColor(rarityColor)
                        .padding(.horizontal, 14).padding(.vertical, 5)
                        .background(rarityColor.opacity(0.2))
                        .cornerRadius(10)
                    Text("A new friend joins the parade!")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .frame(height: 320)
        .onAppear { run() }
    }

    private var rarityColor: Color {
        switch rarity {
        case "Legendary": return .orange
        case "Epic": return .purple
        case "Rare": return .blue
        default: return .gray
        }
    }

    private func run() {
        stage = 0
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            stage = 1
            SpookyHaptics.play(.light)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.7) {
            stage = 2
            SpookyHaptics.play(.medium)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            stage = 3
            SpookyHaptics.play(.levelUp)
        }
    }
}

// ============================================================
// MARK: - 3. Equip shine + showcase
// ============================================================

/// Equip toggle with shine pop: checkmark burst on equip.
struct MineEquipShine: View {
    var equipped: Bool
    var action: () -> Void

    var body: some View {
        Button(action: {
            SpookyHaptics.play(equipped ? .light : .reward)
            action()
        }) {
            ZStack {
                if equipped {
                    Circle()
                        .stroke(Color.green, lineWidth: 2)
                        .frame(width: 40, height: 40)
                        .scaleEffect(1.0)
                        .transition(.scale.combined(with: .opacity))
                }
                Image(systemName: equipped ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(equipped ? .green : .gray)
                    .scaleEffect(equipped ? 1.15 : 1.0)
                    .animation(.spring(response: 0.35, dampingFraction: 0.5), value: equipped)
            }
            .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
    }
}

/// Pet FX showcase: all species, ceremony demo, equip row.
struct MinePetFXShowcaseView: View {
    @State private var demoSpecies = "Axolotl"
    @State private var demoRarity = "Rare"
    @State private var ceremonyKey = 0
    @State private var equipped: Set<String> = ["Axolotl"]
    @Environment(\.dismiss) private var dismiss
    private let species = ["Mole", "Bat", "Axolotl", "Fox", "Wisp", "Dragon"]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Text("🐾 The crew").font(.headline)
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            ForEach(species, id: \.self) { s in
                                VStack {
                                    MinePetSprite(species: s, size: 64)
                                        .frame(height: 76)
                                    Text(s).font(.caption.bold())
                                }
                                .padding(8)
                                .background(Color(.secondarySystemBackground))
                                .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🥚 Hatch ceremony").font(.headline)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(species, id: \.self) { s in
                                    Button(action: {
                                        demoSpecies = s
                                        demoRarity = ["Common", "Rare", "Epic", "Legendary"].randomElement()!
                                        ceremonyKey += 1
                                    }) {
                                        Text(s).font(.caption.bold())
                                            .padding(.horizontal, 10).padding(.vertical, 6)
                                            .background(demoSpecies == s ? Color.orange : Color.white.opacity(0.1))
                                            .foregroundColor(demoSpecies == s ? .black : .white)
                                            .cornerRadius(8)
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                        MineHatchCeremony(species: demoSpecies, rarity: demoRarity)
                            .id(ceremonyKey)
                    }
                    VStack(spacing: 8) {
                        Text("✨ Equip shine").font(.headline)
                        HStack(spacing: 20) {
                            ForEach(species.prefix(3), id: \.self) { s in
                                VStack {
                                    MinePetSprite(species: s, size: 52)
                                    MineEquipShine(equipped: equipped.contains(s)) {
                                        if equipped.contains(s) {
                                            equipped.remove(s)
                                        } else {
                                            equipped.insert(s)
                                        }
                                    }
                                    Text(s).font(.caption2)
                                }
                            }
                        }
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Pet FX Lab")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
