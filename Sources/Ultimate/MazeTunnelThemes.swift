//
//  MazeTunnelThemes.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Tunnel themes: Mossy, Crystal, Ember and Void atmospheres for the maze.
//  Pure flavor + luck — the active theme boosts boxy encounters and tints
//  the journal. Switching is free and instant. One stored pick on the
//  manager; everything else reads it.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Theme catalog (manager extension for the pick)
// ============================================================

/// One tunnel theme: mood, encounter luck, journal accent.
struct MazeTunnelTheme {
    var id: String
    var name: String
    var emoji: String
    var accent: Color
    var boxyLuck: Double // bonus spawn weight
    var flavor: String
}

enum MazeThemeGuide {
    static var all: [MazeTunnelTheme] = [
        MazeTunnelTheme(id: "mossy", name: "Mossy", emoji: "🌿", accent: .green, boxyLuck: 0.0,
                        flavor: "The classic. Damp, green, honest. Boxy friends feel at home."),
        MazeTunnelTheme(id: "crystal", name: "Crystal", emoji: "🔮", accent: .cyan, boxyLuck: 0.15,
                        flavor: "Everything glitters. Shiny things attract shiny friends."),
        MazeTunnelTheme(id: "ember", name: "Ember", emoji: "🔥", accent: .orange, boxyLuck: 0.1,
                        flavor: "Warm walls, warm welcomes. Axolotls love it here."),
        MazeTunnelTheme(id: "void", name: "Void", emoji: "🌌", accent: .purple, boxyLuck: 0.25,
                        flavor: "Reality-thin paint. Wisps vacation in this aesthetic."),
    ]

    static func theme(id: String) -> MazeTunnelTheme {
        all.first(where: { $0.id == id }) ?? all[0]
    }
}

extension TunnelMazeManager {
    private static var themeKey: String { "mazeTheme.v1" }

    /// Active theme id (persisted).
    var mazeThemeID: String {
        get {
            let id = UserDefaults.standard.string(forKey: Self.themeKey) ?? "mossy"
            return MazeThemeGuide.all.contains(where: { $0.id == id }) ? id : "mossy"
        }
        set {
            UserDefaults.standard.set(newValue, forKey: Self.themeKey)
        }
    }

    var mazeTheme: MazeTunnelTheme {
        MazeThemeGuide.theme(id: mazeThemeID)
    }

    func setMazeTheme(_ id: String) {
        mazeThemeID = id
        addNotification("\(mazeTheme.emoji) Tunnels re-themed: \(mazeTheme.name)! \(mazeTheme.flavor)")
        triggerHaptic(.medium)
    }
}

// ============================================================
// MARK: - 2. Theme picker view
// ============================================================

/// Theme picker: four atmospheres with luck readout.
struct MazeThemePickerView: View {
    @ObservedObject var manager: TunnelMazeManager

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("🎨 Tunnel theme")
                .font(.headline).foregroundColor(.white)
            Text("Flavor + boxy luck. Free to switch, instant everywhere.")
                .font(.caption).foregroundColor(.white.opacity(0.6))
            ForEach(MazeThemeGuide.all, id: \.id) { theme in
                let active = manager.mazeThemeID == theme.id
                Button(action: { manager.setMazeTheme(theme.id) }) {
                    HStack {
                        Text(theme.emoji).font(.title2)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(theme.name).font(.subheadline.bold()).foregroundColor(.white)
                            Text(theme.flavor).font(.caption).foregroundColor(.white.opacity(0.6))
                            Text("Boxy luck +\(Int(theme.boxyLuck * 100))%")
                                .font(.caption2.bold()).foregroundColor(theme.accent)
                        }
                        Spacer()
                        if active {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(theme.accent)
                        }
                    }
                    .padding(10)
                    .background(active ? theme.accent.opacity(0.2) : Color.white.opacity(0.06))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(active ? theme.accent : Color.clear, lineWidth: 2)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }
}
