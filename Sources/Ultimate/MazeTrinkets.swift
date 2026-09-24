//
//  MazeTrinkets.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Lost & found: monsters sometimes drop trinkets — flavor-rich pocket
//  loot with tiny gold values. Collection lives on the manager; the
//  journal shows the shadow box. One hook in the combat drop path.
//

import SwiftUI
import Combine
import SceneKit

// ============================================================
// MARK: - 1. Trinket catalog + drops (manager extension)
// ============================================================

/// One lost item with flavor.
struct MazeTrinket {
    var name: String
    var emoji: String
    var value: Int
    var flavor: String
}

enum MazeTrinketGuide {
    static var all: [MazeTrinket] = [
        MazeTrinket(name: "Bent Spoon", emoji: "🥄", value: 5, flavor: "Bent by something strong. Possibly soup."),
        MazeTrinket(name: "Single Die", emoji: "🎲", value: 8, flavor: "Always rolls Bones. The bones are loaded. Keep it."),
        MazeTrinket(name: "Brass Button", emoji: "🔘", value: 6, flavor: "From a coat of unusual size. The coat is still out there."),
        MazeTrinket(name: "Tiny Crown", emoji: "👑", value: 40, flavor: "Fits a mouse, a wisp, or your pinky. Wear it everywhere."),
        MazeTrinket(name: "Glass Eye", emoji: "👁️", value: 25, flavor: "It watches back. Blinks first. Loses often."),
        MazeTrinket(name: "Love Letter", emoji: "💌", value: 12, flavor: "\"Dear darkness, it's not you…\" Unsent. Frame it."),
        MazeTrinket(name: "Lucky Pebble", emoji: "🪨", value: 7, flavor: "Perfectly round. Suspiciously lucky. Pocket it."),
        MazeTrinket(name: "Silver Key", emoji: "🔑", value: 30, flavor: "Opens something. The maze declines to specify what."),
        MazeTrinket(name: "Music Box", emoji: "🎵", value: 35, flavor: "Plays one bar of something haunting, then giggles."),
        MazeTrinket(name: "Pocket Watch", emoji: "⌚", value: 28, flavor: "Stopped at midnight. Correct twice a day, spooky always."),
        MazeTrinket(name: "Marble", emoji: "🔮", value: 9, flavor: "Someone lost their marbles down here. Found one."),
        MazeTrinket(name: "Golden Tooth", emoji: "🦷", value: 50, flavor: "The tooth fairy overpays down here. Don't ask."),
    ]

    /// Weighted trinket roll (cheap ones common, crown rare).
    static func roll() -> MazeTrinket? {
        guard Double.random(in: 0...1) < 0.22 else { return nil }
        let weights = all.map({ max(1, 60 - $0.value) })
        let total = weights.reduce(0, +)
        var r = Int.random(in: 1...total)
        for (trinket, w) in zip(all, weights) {
            r -= w
            if r <= 0 { return trinket }
        }
        return all.first
    }
}

extension TunnelMazeManager {
    /// Trinket shelf: name → count.
    var trinkets: [String: Int] {
        get {
            var dict: [String: Int] = [:]
            for item in player.inventory where item.name.hasPrefix("Trinket: ") {
                dict[String(item.name.dropFirst(9)), default: 0] += item.quantity
            }
            return dict
        }
    }

    /// Maybe drop a trinket on a kill. Returns the trinket (if any).
    @discardableResult
    func maybeDropTrinket(at position: SCNVector3) -> MazeTrinket? {
        guard let trinket = MazeTrinketGuide.roll() else { return nil }
        player.inventory.append(MazeInventoryItem(
            name: "Trinket: \(trinket.name)", type: .treasure, quantity: 1, maxQuantity: 99,
            description: trinket.flavor,
            icon: trinket.emoji, value: trinket.value, rarity: .uncommon
        ))
        player.gold += trinket.value / 2
        addNotification("\(trinket.emoji) Lost & found: \(trinket.name)! \(trinket.flavor)")
        createParticles(at: position, count: 12, emoji: trinket.emoji)
        return trinket
    }
}

// ============================================================
// MARK: - 2. Shadow box view
// ============================================================

/// Trinket shadow box: found vs missing curios.
struct MazeTrinketBoxView: View {
    @ObservedObject var manager: TunnelMazeManager

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("🎰 Lost & Found")
                    .font(.headline).foregroundColor(.white)
                Spacer()
                Text("\(foundCount)/\(MazeTrinketGuide.all.count)")
                    .font(.caption.bold()).foregroundColor(.white.opacity(0.7))
                    .monospacedDigit()
            }
            Text("Monsters drop pocket loot. 22% per kill, cheap ones often, crowns rarely.")
                .font(.caption).foregroundColor(.white.opacity(0.6))
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(MazeTrinketGuide.all, id: \.name) { trinket in
                    let n = manager.trinkets[trinket.name, default: 0]
                    VStack(spacing: 3) {
                        Text(n > 0 ? trinket.emoji : "❓")
                            .font(.title2)
                        Text(n > 0 ? trinket.name : "???")
                            .font(.caption2.bold())
                            .foregroundColor(.white)
                            .lineLimit(1)
                        Text(n > 0 ? "×\(n)" : "\(trinket.value)🪙")
                            .font(.caption2)
                            .foregroundColor(n > 0 ? .yellow : .gray)
                            .monospacedDigit()
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(n > 0 ? Color.yellow.opacity(0.15) : Color.white.opacity(0.05))
                    .cornerRadius(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(n > 0 ? Color.yellow.opacity(0.5) : Color.clear, lineWidth: 1)
                    )
                }
            }
        }
    }

    private var foundCount: Int {
        MazeTrinketGuide.all.filter({ manager.trinkets[$0.name, default: 0] > 0 }).count
    }
}
