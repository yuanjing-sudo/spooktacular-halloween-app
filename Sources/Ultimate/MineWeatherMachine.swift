//
//  MineWeatherMachine.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Weather beacons: burn ores to command the sky for two minutes —
//  gold rain, ember surges, spore falls and more. The director takes
//  requests; the mine complies. Pure manager extension + console view.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Beacon catalog + firing (manager extension)
// ============================================================

/// One weather beacon recipe.
struct MineWeatherBeacon {
    var name: String
    var emoji: String
    var kind: MineWeatherKind
    var costOre: String
    var cost: Int
    var flavor: String
}

enum MineBeaconGuide {
    static var all: [MineWeatherBeacon] = [
        MineWeatherBeacon(name: "Gilded Beacon", emoji: "🪙", kind: .goldRain,
                          costOre: "Diamond Ore", cost: 2,
                          flavor: "Burn two diamonds. It rains gold for two minutes. Economics."),
        MineWeatherBeacon(name: "Ember Beacon", emoji: "🔥", kind: .emberStorm,
                          costOre: "Ruby Ore", cost: 3,
                          flavor: "Crackle the sky into a spark storm. Lava country anywhere."),
        MineWeatherBeacon(name: "Spore Beacon", emoji: "🌟", kind: .sporeFall,
                          costOre: "Emerald Ore", cost: 3,
                          flavor: "Wisp bait that works on weather. Spores for days."),
        MineWeatherBeacon(name: "Frost Beacon", emoji: "❄️", kind: .frostBreath,
                          costOre: "Frost Ore", cost: 5,
                          flavor: "Bottled pocket weather. Exhale winter on demand."),
        MineWeatherBeacon(name: "Fog Beacon", emoji: "🌫️", kind: .fogBank,
                          costOre: "Coal Ore", cost: 12,
                          flavor: "Cheap fog by the bucket. Spookiness per coin: unmatched."),
        MineWeatherBeacon(name: "Storm Beacon", emoji: "🌧️", kind: .dripStorm,
                          costOre: "Iron Ore", cost: 8,
                          flavor: "Every stalactite applauds at once. Dramatic. Damp."),
    ]
}

extension MineManager {
    /// Fire a beacon: spend ore, command the sky for two minutes.
    @discardableResult
    func fireBeacon(_ beacon: MineWeatherBeacon) -> Bool {
        guard player.ores[beacon.costOre, default: 0] >= beacon.cost else {
            notify("📡 Need \(beacon.cost)× \(beacon.costOre) (have \(player.ores[beacon.costOre, default: 0])).")
            return false
        }
        player.ores[beacon.costOre, default: 0] -= beacon.cost
        weather.setManual(beacon.kind)
        // Auto-release back to layer weather after two minutes.
        DispatchQueue.main.asyncAfter(deadline: .now() + 120) { [weak self] in
            self?.weather.setManual(nil)
            self?.notify("📡 Beacon fades — the sky returns to local weather.")
        }
        notify("\(beacon.emoji) \(beacon.name) lit! \(beacon.kind.title) for two minutes!")
        return true
    }
}

// ============================================================
// MARK: - 2. Weather console view
// ============================================================

/// Weather console: live sky, beacon recipes, fire buttons.
struct MineWeatherConsoleView: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🌤️ Now (\(manager.weather.kind.title))")) {
                    HStack {
                        Text(manager.weather.kind.emoji).font(.largeTitle)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(manager.currentLayer.title).font(.headline)
                            Text("Intensity \(Int(manager.weather.intensity * 100))% • \(manager.weather.kind.flavor)")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                Section(header: Text("📡 Beacon recipes")) {
                    Text("Burn ore, command the sky for two minutes. The mine finds this hilarious and complies.")
                        .font(.caption).foregroundStyle(.secondary)
                    ForEach(MineBeaconGuide.all, id: \.name) { beacon in
                        HStack {
                            Text(beacon.emoji).font(.title2)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(beacon.name).font(.subheadline.bold())
                                Text(beacon.flavor).font(.caption).foregroundStyle(.secondary)
                                Text("Makes \(beacon.kind.title)")
                                    .font(.caption2).foregroundColor(.orange)
                            }
                            Spacer()
                            VStack(spacing: 4) {
                                Text("\(manager.player.ores[beacon.costOre, default: 0])/\(beacon.cost) \(shortOre(beacon.costOre))")
                                    .font(.caption.bold())
                                    .foregroundColor(manager.player.ores[beacon.costOre, default: 0] >= beacon.cost ? .green : .gray)
                                    .monospacedDigit()
                                Button("Fire") {
                                    _ = manager.fireBeacon(beacon)
                                    SpookyHaptics.play(.medium)
                                }
                                .buttonStyle(.borderedProminent)
                                .controlSize(.small)
                                .disabled(manager.player.ores[beacon.costOre, default: 0] < beacon.cost)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Weather Console")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func shortOre(_ name: String) -> String {
        let map = ["Diamond Ore": "💎", "Ruby Ore": "♦️", "Emerald Ore": "🟩",
                   "Frost Ore": "❄️", "Coal Ore": "⬛", "Iron Ore": "🟫"]
        return map[name] ?? "⛏️"
    }
}
