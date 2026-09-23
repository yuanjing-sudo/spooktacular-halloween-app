//
//  MazeSkybox.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Animated skies for the ten maze regions: gradient atmospheres with
//  moons, starfields, fog drifts, ember rises and lantern glows. Used as
//  journal atlas backdrops and a standalone showcase.
//

import SwiftUI

// ============================================================
// MARK: - 1. Sky primitives
// ============================================================

/// Drifting starfield layer.
struct MazeStars: View {
    var count = 26
    var seed: Double = 0

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                for i in 0..<count {
                    let f1 = fract(Double(i) * 12.9898 + seed)
                    let f2 = fract(Double(i) * 78.233 + seed * 0.5)
                    let x = f1 * w
                    let y = f2 * h
                    let tw = 0.25 + 0.75 * abs(sin(t * 1.2 + Double(i)))
                    context.opacity = tw * 0.9
                    context.fill(
                        Circle().path(in: CGRect(x: x - 1, y: y - 1, width: 2, height: 2)),
                        with: .color(.white)
                    )
                }
            }
        }
        .allowsHitTesting(false)
    }

    private func fract(_ x: Double) -> Double {
        x - floor(x)
    }
}

/// Rolling fog band.
struct MazeFogBand: View {
    var tint: Color
    var seed: Double = 0
    @State private var roll = false

    var body: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { i in
                Ellipse()
                    .fill(tint.opacity(0.22))
                    .frame(width: 220 + CGFloat(i) * 30, height: 40)
                    .blur(radius: 12)
                    .offset(x: roll ? CGFloat(-40 + i * 20) : CGFloat(40 - i * 20))
                    .animation(
                        .easeInOut(duration: 6 + Double(i)).repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.5 + seed),
                        value: roll
                    )
            }
        }
        .onAppear { roll.toggle() }
    }
}

/// Low moon with halo.
struct MazeMoon: View {    var tint: Color = Color(red: 0.95, green: 0.93, blue: 0.8)

    var body: some View {
        ZStack {
            Circle()
                .fill(tint.opacity(0.18))
                .frame(width: 66, height: 66)
            Circle()
                .fill(tint)
                .frame(width: 40, height: 40)
            // Craters.
            Circle().fill(tint.opacity(0.7)).frame(width: 8, height: 8).offset(x: -8, y: -6)
            Circle().fill(tint.opacity(0.7)).frame(width: 5, height: 5).offset(x: 9, y: 7)
            Circle().fill(tint.opacity(0.7)).frame(width: 6, height: 6).offset(x: 4, y: -12)
        }
    }
}

// ============================================================
// MARK: - 2. Ten region skies
// ============================================================

/// Animated sky backdrop keyed by region id. Falls back to Heart.
struct MazeRegionSky: View {
    var id: String

    var body: some View {
        ZStack {
            skyGradient
            switch id {
            case "northgate-west", "northgate-east":
                MazeStars(count: 30, seed: 1)
                MazeMoon().offset(x: 60, y: -40).scaleEffect(0.8)
                MazeFogBand(tint: .gray, seed: 1)
            case "deeps-west":
                MazeFogBand(tint: .cyan, seed: 2)
                MazeStars(count: 14, seed: 2)
            case "deeps-east":
                MazeEmberRise()
                MazeFogBand(tint: .orange, seed: 3)
            case "heart-west":
                MazeLanternDots()
                MazeFogBand(tint: .purple, seed: 4)
            case "heart-east":
                MazeLanternDots()
                MazeMoon().offset(x: -60, y: -44).scaleEffect(0.6)
            case "warrens-west":
                MazeFogBand(tint: Color(red: 0.5, green: 0.4, blue: 0.8), seed: 5)
                MazeStars(count: 18, seed: 5)
            case "warrens-east":
                MazeGoldMotes()
                MazeFogBand(tint: .yellow, seed: 6)
            case "far-west", "far-east":
                MazeStars(count: 44, seed: 7)
                MazeMoon().offset(x: 0, y: -46)
                MazeShootingStars()
                MazeFogBand(tint: .blue, seed: 7)
            default:
                MazeFogBand(tint: .purple, seed: 0)
            }
        }
    }

    private var skyGradient: some View {
        LinearGradient(colors: skyColors, startPoint: .top, endPoint: .bottom)
    }

    private var skyColors: [Color] {
        switch id {
        case "northgate-west", "northgate-east":
            return [Color(red: 0.08, green: 0.09, blue: 0.16), Color(red: 0.03, green: 0.03, blue: 0.07)]
        case "deeps-west":
            return [Color(red: 0.07, green: 0.14, blue: 0.2), Color(red: 0.02, green: 0.04, blue: 0.08)]
        case "deeps-east":
            return [Color(red: 0.22, green: 0.08, blue: 0.08), Color(red: 0.06, green: 0.02, blue: 0.03)]
        case "heart-west":
            return [Color(red: 0.14, green: 0.08, blue: 0.18), Color(red: 0.04, green: 0.02, blue: 0.07)]
        case "heart-east":
            return [Color(red: 0.16, green: 0.12, blue: 0.1), Color(red: 0.05, green: 0.03, blue: 0.04)]
        case "warrens-west":
            return [Color(red: 0.12, green: 0.08, blue: 0.22), Color(red: 0.03, green: 0.02, blue: 0.08)]
        case "warrens-east":
            return [Color(red: 0.2, green: 0.14, blue: 0.06), Color(red: 0.05, green: 0.03, blue: 0.02)]
        case "far-west", "far-east":
            return [Color(red: 0.03, green: 0.03, blue: 0.1), Color.black]
        default:
            return [Color(red: 0.1, green: 0.07, blue: 0.14), Color(red: 0.03, green: 0.02, blue: 0.06)]
        }
    }
}

/// Rising ember dots for warm skies.
struct MazeEmberRise: View {
    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                for i in 0..<18 {
                    let life = fmod(t * 0.4 + Double(i) * 0.29, 1.0)
                    let x = fmod(Double(i) * 97.7, w)
                    let y = h - life * h
                    context.opacity = (1 - life) * 0.85
                    context.fill(
                        Circle().path(in: CGRect(x: x - 1.5, y: y - 1.5, width: 3, height: 3)),
                        with: .color(i % 2 == 0 ? .orange : .red)
                    )
                }
            }
        }
        .allowsHitTesting(false)
    }
}

/// Floating lantern dots for home skies.
struct MazeLanternDots: View {
    @State private var bob = false

    var body: some View {
        HStack(spacing: 40) {
            ForEach(0..<4, id: \.self) { i in
                VStack(spacing: 2) {
                    Circle()
                        .fill(Color.orange)
                        .frame(width: 7, height: 7)
                        .shadow(color: .orange, radius: 8)
                    Rectangle()
                        .fill(Color.gray.opacity(0.6))
                        .frame(width: 1.5, height: 14)
                }
                .offset(y: bob ? -6 : 6)
                .animation(
                    .easeInOut(duration: 2 + Double(i) * 0.3).repeatForever(autoreverses: true)
                        .delay(Double(i) * 0.4),
                    value: bob
                )
            }
        }
        .offset(y: -30)
        .onAppear { bob.toggle() }
    }
}

/// Gold motes for rich skies.
struct MazeGoldMotes: View {
    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                for i in 0..<22 {
                    let life = fmod(t * 0.3 + Double(i) * 0.41, 1.0)
                    let x = fmod(Double(i) * 131.3 + sin(t + Double(i)) * 12, w)
                    let y = fmod(Double(i) * 71.7 + life * h * 0.4, h)
                    context.opacity = (0.4 + 0.6 * abs(sin(t * 2 + Double(i)))) * (1 - life * 0.4)
                    context.fill(
                        Circle().path(in: CGRect(x: x - 1.5, y: y - 1.5, width: 3, height: 3)),
                        with: .color(.yellow)
                    )
                }
            }
        }
        .allowsHitTesting(false)
    }
}

/// Shooting stars: occasional bright streaks with fading tails.
struct MazeShootingStars: View {
    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let w = Double(size.width), h = Double(size.height)
                for i in 0..<3 {
                    let cycle = 7.0
                    let life = fmod(t + Double(i) * 2.9, cycle) / cycle
                    // Visible only in the first 15% of each cycle.
                    guard life < 0.15 else { continue }
                    let k = life / 0.15
                    let sx = w * (0.2 + 0.25 * Double(i)) + k * 120
                    let sy = h * 0.15 + k * 60
                    context.opacity = (1 - k) * 0.95
                    // Tail.
                    var tail = Path()
                    tail.move(to: CGPoint(x: sx, y: sy))
                    tail.addLine(to: CGPoint(x: sx - 46 * (1 - k * 0.5), y: sy - 22 * (1 - k * 0.5)))
                    context.stroke(tail, with: .color(.white), lineWidth: 2)
                    // Head.
                    context.fill(
                        Circle().path(in: CGRect(x: sx - 2.5, y: sy - 2.5, width: 5, height: 5)),
                        with: .color(.white)
                    )
                    context.fill(
                        Circle().path(in: CGRect(x: sx - 6, y: sy - 6, width: 12, height: 12)),
                        with: .color(.white.opacity(0.3))
                    )
                }
            }
        }
        .allowsHitTesting(false)
    }
}

// ============================================================
// MARK: - 3. Sky showcase
// ============================================================

/// Sky observatory: all ten region skies with names.
struct MazeSkyShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    ForEach(MazeRegionAtlas.all, id: \.id) { region in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(region.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(region.name).font(.headline)
                                    Text(region.bounds).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                            .padding(.horizontal)
                            ZStack {
                                MazeRegionSky(id: region.id)
                                    .frame(height: 170)
                                    .cornerRadius(14)
                                VStack {
                                    Spacer()
                                    Text(region.flavor)
                                        .font(.caption)
                                        .foregroundColor(.white)
                                        .padding(8)
                                        .background(Color.black.opacity(0.55))
                                        .cornerRadius(8)
                                }
                                .padding(.bottom, 10)
                                .padding(.horizontal, 12)
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical, 12)
            }
            .navigationTitle("Sky Observatory")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
