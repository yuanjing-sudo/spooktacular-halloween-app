//
//  MineGraphicsHub.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Graphics hub: one directory for all twenty showcase theaters, labs and
//  halls. Single entry point from the forge panel.
//

import SwiftUI

// ============================================================
// MARK: - 1. Showcase directory
// ============================================================

/// Every graphics showcase in one enum for the hub.
enum MineShowcaseID: String, Identifiable, CaseIterable {
    case ghosts, crystals, lighting, particles, dioramas
    case ghosts2, crystals2, cinema, motion, sectors
    case weather, bosses, pets, celebrations, workshop
    case sky, transitions, arcade, water, fire

    var id: String { rawValue }

    var emoji: String {
        switch self {
        case .ghosts: return "👻"
        case .crystals: return "💎"
        case .lighting: return "🔥"
        case .particles: return "✨"
        case .dioramas: return "🖼️"
        case .ghosts2: return "⛓️"
        case .crystals2: return "🪨"
        case .cinema: return "🎬"
        case .motion: return "🎛️"
        case .sectors: return "🗺️"
        case .weather: return "🌤️"
        case .bosses: return "👑"
        case .pets: return "🐾"
        case .celebrations: return "🎉"
        case .workshop: return "🔨"
        case .sky: return "🌌"
        case .transitions: return "🔀"
        case .arcade: return "🕹️"
        case .water: return "💧"
        case .fire: return "🔥"
        }
    }

    var title: String {
        switch self {
        case .ghosts: return "Ghost Theater"
        case .crystals: return "Crystal Theater"
        case .lighting: return "Lighting Lab"
        case .particles: return "Particle Lab"
        case .dioramas: return "Diorama Hall"
        case .ghosts2: return "Ghost Theater II"
        case .crystals2: return "Crystal Theater II"
        case .cinema: return "Cinematic Theater"
        case .motion: return "HUD Motion Lab"
        case .sectors: return "Sector Atlas Scenes"
        case .weather: return "Weather Station"
        case .bosses: return "Boss Cinema"
        case .pets: return "Pet FX Lab"
        case .celebrations: return "Celebrations"
        case .workshop: return "Workshop FX"
        case .sky: return "Maze Sky Observatory"
        case .transitions: return "Transition Lab"
        case .arcade: return "Arcade FX"
        case .water: return "Water Hall"
        case .fire: return "Fire Hall"
        }
    }

    var detail: String {
        switch self {
        case .ghosts: return "Six kinds, scares, wails, radar."
        case .crystals: return "Cubes, spikes, orbs, sealed doors."
        case .lighting: return "Torches, lanterns, lava, layer rigs."
        case .particles: return "Twenty emitters, bursts, fountains."
        case .dioramas: return "Fifteen living miniature scenes."
        case .ghosts2: return "Chains, parade, signature moves."
        case .crystals2: return "Geodes, vault, five more doors."
        case .cinema: return "Twelve full-screen moments."
        case .motion: return "Buttons, counters, waves, badges."
        case .sectors: return "Nine sector scenes."
        case .weather: return "Eight mine weather systems."
        case .bosses: return "Intros, HP bars, slow-mo."
        case .pets: return "Six sprites, hatch ceremony."
        case .celebrations: return "Spin wheel, parades, milestones."
        case .workshop: return "Anvil, pour, beam-ups, rack."
        case .sky: return "Ten animated region skies."
        case .transitions: return "Iris, pixels, flips, reveals."
        case .arcade: return "Squash, rhythm, trivia, pusher."
        case .water: return "Drips, ripples, falls, pools."
        case .fire: return "Campfires, forge beds, fireworks."
        }
    }
}

// ============================================================
// MARK: - 2. Hub view
// ============================================================

/// Graphics hub sheet: directory of all twenty showcases.
struct MineGraphicsHubView: View {
    @State private var showing: MineShowcaseID?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🎨 Twenty theaters, one mine")) {
                    Text("Every animation system in the game, live. Open any door — everything loops forever and nothing can hurt you.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section(header: Text("Directory (\(MineShowcaseID.allCases.count))")) {
                    ForEach(MineShowcaseID.allCases) { item in
                        Button(action: { showing = item }) {
                            HStack {
                                Text(item.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.title).font(.headline).foregroundColor(.primary)
                                    Text(item.detail).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.gray)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("Graphics Hub")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(item: $showing) { item in
                destination(for: item)
            }
        }
    }

    @ViewBuilder
    private func destination(for item: MineShowcaseID) -> some View {
        switch item {
        case .ghosts: MineGhostShowcaseView()
        case .crystals: MineCrystalShowcaseView()
        case .lighting: MineLightingShowcaseView()
        case .particles: MineParticleShowcaseView()
        case .dioramas: MineDioramaShowcaseView()
        case .ghosts2: MineGhostTheater2ShowcaseView()
        case .crystals2: MineCrystalTheater2ShowcaseView()
        case .cinema: MineCinematicShowcaseView()
        case .motion: MineHUDMotionShowcaseView()
        case .sectors: MineSectorShowcaseView()
        case .weather: MineWeatherShowcaseView()
        case .bosses: MineBossCinemaShowcaseView()
        case .pets: MinePetFXShowcaseView()
        case .celebrations: MineCelebrationShowcaseView()
        case .workshop: MineWorkshopShowcaseView()
        case .sky: MazeSkyShowcaseView()
        case .transitions: MineTransitionShowcaseView()
        case .arcade: MineArcadeShowcaseView()
        case .water: MineWaterShowcaseView()
        case .fire: MineFireShowcaseView()
        }
    }
}
