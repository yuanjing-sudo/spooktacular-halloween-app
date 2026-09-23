//
//  MineWeather.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Weather engine for the mine: dust devils, drip storms, ember storms,
//  spore falls, frost breath, fog banks and payday gold-rain. A director
//  picks weather per layer (with manual override), views render full-screen
//  overlays, and a showcase demos every system.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Weather kinds + director
// ============================================================

/// Mine weather systems. All decorative — god-mode means storms are moods.
enum MineWeatherKind: String, CaseIterable {
    case clear, dust, dripStorm, emberStorm, sporeFall, frostBreath, fogBank, goldRain

    var title: String {
        switch self {
        case .clear: return "Clear"
        case .dust: return "Dust Devil"
        case .dripStorm: return "Drip Storm"
        case .emberStorm: return "Ember Storm"
        case .sporeFall: return "Spore Fall"
        case .frostBreath: return "Frost Breath"
        case .fogBank: return "Fog Bank"
        case .goldRain: return "Gold Rain"
        }
    }

    var emoji: String {
        switch self {
        case .clear: return "🌤️"
        case .dust: return "🌪️"
        case .dripStorm: return "🌧️"
        case .emberStorm: return "🔥"
        case .sporeFall: return "🌟"
        case .frostBreath: return "❄️"
        case .fogBank: return "🌫️"
        case .goldRain: return "🪙"
        }
    }

    var flavor: String {
        switch self {
        case .clear: return "Still air. The mine holds its breath with you."
        case .dust: return "A devil of dust tours the tunnels. Twirls, never harms."
        case .dripStorm: return "Every stalactite drips at once. The cave applauds."
        case .emberStorm: return "The Core exhales sparks. Stand in it. Feel rich."
        case .sporeFall: return "Wisp spores snow sideways. Follow them to friends."
        case .frostBreath: return "Cold pockets exhale. See your breath, then see gold."
        case .fogBank: return "A bank of fog clocks in for its shift. Visibility: vibes."
        case .goldRain: return "Payday weather. Coins from nowhere, joy everywhere."
        }
    }
}

/// Director: layer-driven weather with manual override + intensity.
final class MineWeatherDirector: ObservableObject {
    @Published private(set) var kind: MineWeatherKind = .clear
    @Published private(set) var intensity: Double = 0.6
    @Published var manual: MineWeatherKind?
    private var driftTimer: Timer?

    init() {
        driftTimer = Timer.scheduledTimer(withTimeInterval: 25, repeats: true) { [weak self] _ in
            self?.drift()
        }
    }

    /// Layer → ambient weather mapping.
    func weatherForLayer(_ title: String) -> MineWeatherKind {
        if let manual = manual { return manual }
        switch title {
        case "Sunlit Tops": return .clear
        case "Dirt Tunnels": return .dust
        case "Stone Depths": return .dripStorm
        case "Deepstone": return .fogBank
        case "Crystal Hollows": return .sporeFall
        case "Magma Core": return .emberStorm
        default: return .clear
        }
    }

    func refresh(layerTitle: String) {
        let next = weatherForLayer(layerTitle)
        if next != kind {
            kind = next
            intensity = Double.random(in: 0.4...0.9)
        }
    }

    func celebrate() {
        manual = .goldRain
        kind = .goldRain
        intensity = 1.0
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in
            self?.manual = nil
        }
    }

    func setManual(_ kind: MineWeatherKind?) {
        manual = kind
        if let kind = kind {
            self.kind = kind
            intensity = 0.8
        }
    }

    private func drift() {
        guard manual == nil else { return }
        intensity = max(0.3, min(1.0, intensity + Double.random(in: -0.2...0.2)))
    }
}

// ============================================================
// MARK: - 2. Weather systems (full-screen overlays)
// ============================================================

/// Dust devil: a wandering funnel of dust + debris.
struct MineDustDevil: View {
    var intensity: Double = 0.6
    @State private var roam = false

    var body: some View {
        ZStack {
            // Funnel (stacked shrinking ellipses).
            VStack(spacing: -14) {
                ForEach(0..<6, id: \.self) { i in
                    Ellipse()
                        .fill(Color.brown.opacity(0.25))
                        .frame(width: 110 - CGFloat(i) * 14, height: 26)
                        .blur(radius: 4)
                        .offset(x: roam ? CGFloat(10 - i * 4) : CGFloat(-10 + i * 4))
                        .animation(
                            .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                                .delay(Double(i) * 0.1),
                            value: roam
                        )
                }
            }
            .rotationEffect(.degrees(roam ? 6 : -6))
            .animation(
                .easeInOut(duration: 4).repeatForever(autoreverses: true),
                value: roam
            )
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [Color(white: 0.6)],
                shapes: [.circle], flow: .drift, count: Int(30 * intensity),
                gravity: 0, wind: 60, size: 3.0, life: 3.0, twinkle: false,
                flavor: ""
            ))
        }
        .offset(x: roam ? 60 : -60)
        .animation(
            .easeInOut(duration: 9).repeatForever(autoreverses: true),
            value: roam
        )
        .onAppear { roam.toggle() }
    }
}

/// Drip storm: heavy falling streaks + splash rings + rising mist.
struct MineDripStorm: View {
    var intensity: Double = 0.7

    var body: some View {
        ZStack {
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.cyan, .blue],
                shapes: [.streak], flow: .fall, count: Int(70 * intensity),
                gravity: 500, wind: 4, size: 2.4, life: 1.8, twinkle: false,
                flavor: ""
            ))
            // Splash rings along the floor.
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    let w = Double(size.width), h = Double(size.height)
                    for i in 0..<8 {
                        let life = fmod(t * 0.8 + Double(i) * 0.31, 1.0)
                        let x = fmod(Double(i) * 211.3, w)
                        let r = 4 + life * 16
                        context.opacity = (1 - life) * 0.6
                        context.stroke(
                            Ellipse().path(in: CGRect(x: x - r, y: h - 20 - r * 0.3, width: r * 2, height: r * 0.6)),
                            with: .color(.cyan),
                            lineWidth: 1.5
                        )
                    }
                }
            }
        }
    }
}

/// Ember storm: rising ember torrent + heat shimmer + glow floor.
struct MineEmberStorm: View {
    var intensity: Double = 0.8

    var body: some View {
        ZStack {
            // Heat glow floor.
            Ellipse()
                .fill(Color.orange.opacity(0.3))
                .frame(width: 260, height: 50)
                .blur(radius: 10)
                .offset(y: 120)
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.red, .orange, .yellow],
                shapes: [.circle, .streak], flow: .rise, count: Int(80 * intensity),
                gravity: -80, wind: 14, size: 2.8, life: 2.6, twinkle: true,
                flavor: ""
            ))
            // Lightning flickers (heat lightning, harmless).
            MineHeatFlicker(intensity: intensity)
        }
    }
}

/// Heat lightning flicker: full-screen soft white blink, rare.
struct MineHeatFlicker: View {
    var intensity: Double = 0.8
    @State private var flash = false

    var body: some View {
        Color.white
            .opacity(flash ? 0.14 * intensity : 0)
            .animation(.easeOut(duration: 0.18), value: flash)
            .onAppear {
                schedule()
            }
    }

    private func schedule() {
        DispatchQueue.main.asyncAfter(deadline: .now() + Double.random(in: 4...9)) { [self] in
            flash = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
                flash = false
                schedule()
            }
        }
    }
}

/// Spore fall: slow glowing drift with pulse.
struct MineSporeFall: View {
    var intensity: Double = 0.6

    var body: some View {
        MineParticleField(preset: .init(
            name: "x", emoji: "x", colors: [.yellow, .white, .pink],
            shapes: [.circle, .star], flow: .drift, count: Int(50 * intensity),
            gravity: -18, wind: 12, size: 2.4, life: 6.0, twinkle: true,
            flavor: ""
        ))
    }
}

/// Frost breath: falling snow + icy vignette + fog puffs.
struct MineFrostBreath: View {
    var intensity: Double = 0.6
    @State private var puff = false

    var body: some View {
        ZStack {
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.white, Color(red: 0.8, green: 0.9, blue: 1.0)],
                shapes: [.star, .circle], flow: .fall, count: Int(60 * intensity),
                gravity: 40, wind: 26, size: 2.6, life: 5.0, twinkle: true,
                flavor: ""
            ))
            // Icy edge vignette.
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color(red: 0.7, green: 0.9, blue: 1.0).opacity(puff ? 0.5 : 0.2), lineWidth: 10)
                .blur(radius: 8)
                .animation(
                    .easeInOut(duration: 2.4).repeatForever(autoreverses: true),
                    value: puff
                )
            // Fog puffs.
            ForEach(0..<3, id: \.self) { i in
                Ellipse()
                    .fill(Color.white.opacity(0.12))
                    .frame(width: 150, height: 44)
                    .blur(radius: 10)
                    .offset(x: puff ? CGFloat(-30 + i * 30) : CGFloat(30 - i * 30), y: CGFloat(80 - i * 60))
                    .animation(
                        .easeInOut(duration: 5).repeatForever(autoreverses: true)
                            .delay(Double(i)),
                        value: puff
                    )
            }
        }
        .onAppear { puff.toggle() }
    }
}

/// Fog bank: layered rolling fog sheets.
struct MineFogBank: View {
    var intensity: Double = 0.7
    @State private var roll = false

    var body: some View {
        ZStack {
            ForEach(0..<5, id: \.self) { i in
                Ellipse()
                    .fill(Color(red: 0.55, green: 0.5, blue: 0.7).opacity(0.16 * intensity + 0.06))
                    .frame(width: 300 + CGFloat(i) * 40, height: 70)
                    .blur(radius: 14)
                    .offset(x: roll ? CGFloat(-60 + i * 12) : CGFloat(60 - i * 12), y: CGFloat(-80 + i * 40))
                    .animation(
                        .easeInOut(duration: 7 + Double(i)).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.6),
                        value: roll
                    )
            }
        }
        .onAppear { roll.toggle() }
    }
}

/// Gold rain: payday coins + sparkles + glow.
struct MineGoldRain: View {    var intensity: Double = 1.0

    var body: some View {
        ZStack {
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.yellow, .orange],
                shapes: [.circle, .star], flow: .fall, count: Int(70 * intensity),
                gravity: 300, wind: 10, size: 3.0, life: 2.2, twinkle: true,
                flavor: ""
            ))
            Ellipse()
                .fill(Color.yellow.opacity(0.25))
                .frame(width: 240, height: 60)
                .blur(radius: 12)
                .offset(y: 110)
        }
    }
}

/// Lightning storm: jagged bolts, thunder flash, rain sheet.
struct MineLightningStorm: View {
    var intensity: Double = 0.8
    @State private var bolt = 0

    var body: some View {
        ZStack {
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.cyan, .blue],
                shapes: [.streak], flow: .fall, count: Int(60 * intensity),
                gravity: 520, wind: 20, size: 2.4, life: 1.6, twinkle: false,
                flavor: ""
            ))
            // Jagged bolt.
            Path { p in
                var x = 120.0
                var y = 0.0
                p.move(to: CGPoint(x: x, y: y))
                for i in 0..<7 {
                    x += Double((i * 37) % 40) - 20
                    y += 34
                    p.addLine(to: CGPoint(x: x, y: y))
                }
            }
            .stroke(Color.white, lineWidth: 3)
            .shadow(color: .cyan, radius: 12)
            .opacity(bolt == 1 ? 1 : 0)
            .animation(.easeOut(duration: 0.25), value: bolt)
            // Thunder flash.
            Color.white
                .opacity(bolt == 2 ? 0.22 * intensity : 0)
                .animation(.easeOut(duration: 0.3), value: bolt)
        }
        .onAppear { storm() }
    }

    private func storm() {
        DispatchQueue.main.asyncAfter(deadline: .now() + Double.random(in: 2...5)) { [self] in
            bolt = 1
            SpookyHaptics.play(.heavy)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                bolt = 2
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                bolt = 0
                storm()
            }
        }
    }
}

/// Rainbow veil: slow arcs + sparkle rain, post-storm reward sky.
struct MineRainbowVeil: View {
    @State private var glow = false

    var body: some View {
        ZStack {
            ForEach(0..<6, id: \.self) { i in
                Circle()
                    .trim(from: 0.5, to: 1.0)
                    .stroke(
                        [.red, .orange, .yellow, .green, .cyan, .purple][i].opacity(0.5),
                        lineWidth: 10
                    )
                    .frame(width: 260 - CGFloat(i) * 20, height: 260 - CGFloat(i) * 20)
                    .offset(y: 60)
                    .opacity(glow ? 1 : 0.4)
                    .animation(
                        .easeInOut(duration: 2.4).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.2),
                        value: glow
                    )
            }
            MineParticleField(preset: .init(
                name: "x", emoji: "x", colors: [.red, .orange, .yellow, .green, .cyan, .purple],
                shapes: [.circle, .star], flow: .fall, count: 36,
                gravity: 200, wind: 12, size: 2.4, life: 3.0, twinkle: true,
                flavor: ""
            ))
        }
        .onAppear { glow.toggle() }
    }
}

// ============================================================
// MARK: - 3. Overlay router
// ============================================================

/// Full-screen weather overlay for the live mine HUD. Reads the layer,
/// refreshes the director, renders the matching system.
struct MineWeatherOverlay: View {
    var layerTitle: String
    @ObservedObject var director: MineWeatherDirector

    var body: some View {
        ZStack {
            switch director.kind {
            case .clear:
                EmptyView()
            case .dust:
                MineDustDevil(intensity: director.intensity)
            case .dripStorm:
                MineDripStorm(intensity: director.intensity)
            case .emberStorm:
                MineEmberStorm(intensity: director.intensity)
            case .sporeFall:
                MineSporeFall(intensity: director.intensity)
            case .frostBreath:
                MineFrostBreath(intensity: director.intensity)
            case .fogBank:
                MineFogBank(intensity: director.intensity)
            case .goldRain:
                MineGoldRain(intensity: director.intensity)
            }
        }
        .allowsHitTesting(false)
        .onAppear { director.refresh(layerTitle: layerTitle) }
        .onChange(of: layerTitle) { _, title in
            director.refresh(layerTitle: title)
        }
    }
}

// ============================================================
// MARK: - 4. Weather showcase
// ============================================================

/// Weather station: every system live + manual override demo.
struct MineWeatherShowcaseView: View {
    @StateObject private var director = MineWeatherDirector()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    Text("Layer-driven by default — override below.")
                        .font(.caption).foregroundStyle(.secondary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(MineWeatherKind.allCases, id: \.self) { kind in
                                Button(action: { director.setManual(kind) }) {
                                    VStack {
                                        Text(kind.emoji).font(.title2)
                                        Text(kind.title).font(.caption2.bold())
                                    }
                                    .padding(8)
                                    .background(director.kind == kind ? Color.orange.opacity(0.35) : Color.white.opacity(0.08))
                                    .cornerRadius(10)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    Button("Back to auto") { director.setManual(nil) }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    ZStack {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color.black)
                            .frame(height: 260)
                        MineWeatherOverlay(layerTitle: "Dirt Tunnels", director: director)
                        VStack {
                            Spacer()
                            Text("\(director.kind.emoji) \(director.kind.title)")
                                .font(.headline).foregroundColor(.white)
                                .padding(6)
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(8)
                        }
                        .padding(.bottom, 10)
                    }
                    .padding(.horizontal)
                    ForEach(MineWeatherKind.allCases.filter({ $0 != .clear }), id: \.self) { kind in
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(kind.emoji) \(kind.title)").font(.headline)
                            Text(kind.flavor).font(.caption).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)
                    }
                    Button("🎉 Payday demo (gold rain 6s)") {
                        director.celebrate()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    VStack(spacing: 8) {
                        Text("⛈️ Lightning storm").font(.headline)
                        MineLightningStorm(intensity: 0.8)
                            .frame(height: 200)
                            .background(Color(red: 0.05, green: 0.08, blue: 0.14))
                            .cornerRadius(14)
                            .padding(.horizontal)
                    }
                    VStack(spacing: 8) {
                        Text("🌈 Rainbow veil").font(.headline)
                        MineRainbowVeil()
                            .frame(height: 200)
                            .background(Color(red: 0.08, green: 0.08, blue: 0.14))
                            .cornerRadius(14)
                            .padding(.horizontal)
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Weather Station")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
