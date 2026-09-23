//
//  MineCodex.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Collector's codex for the Abandoned Mine: every ore, critter, layer and
//  sector with flavor text and live discovery state. Pure view layer — it
//  reads existing manager state, so zero hooks were needed.
//

import SwiftUI

// ============================================================
// MARK: - 1. Ore entries
// ============================================================

/// Static field guide entry for anything minable.
struct MineOreEntry {
    var name: String
    var emoji: String
    var pick: String
    var depth: String
    var value: Int
    var flavor: String
}

enum MineOreGuide {
    static var all: [MineOreEntry] = [
        MineOreEntry(
            name: "Coal Ore", emoji: "⬛", pick: "Wooden+", depth: "Everywhere",
            value: 2,
            flavor: "The forge's bread and butter. Burns black, spends gold. New picks are priced in this stuff, so never sell the whole stash."
        ),
        MineOreEntry(
            name: "Iron Ore", emoji: "🟫", pick: "Stone+", depth: "Dirt → Stone",
            value: 4,
            flavor: "Honest metal for honest miners. The backbone of every mid-game backpack — common enough to trust, rich enough to matter."
        ),
        MineOreEntry(
            name: "Gold Ore", emoji: "🟨", pick: "Stone+", depth: "Stone → Deep",
            value: 10,
            flavor: "Heavy, soft, and universally loved. Deep haulage walls sweat this stuff. Sell high, hatch eggs, feel rich."
        ),
        MineOreEntry(
            name: "Lapis Ore", emoji: "🟦", pick: "Stone+", depth: "Stone → Deep",
            value: 8,
            flavor: "Blue as a midnight promise. Wizards pay extra, or so the sign at the forge claims. Nobody has met the wizards."
        ),
        MineOreEntry(
            name: "Redstone Ore", emoji: "🟥", pick: "Iron+", depth: "Deepstone",
            value: 6,
            flavor: "It hums when you walk past. Engineers swear it hums in tune. It does not hum in tune, but it sells in bulk."
        ),
        MineOreEntry(
            name: "Emerald Ore", emoji: "🟩", pick: "Iron+", depth: "Deepstone",
            value: 20,
            flavor: "Green lightning trapped in rock. One emerald haul funds a whole backpack tier. Guard it with your life — kidding, you're immortal."
        ),
        MineOreEntry(
            name: "Ruby Ore", emoji: "♦️", pick: "Golden+", depth: "Crystal → Magma",
            value: 30,
            flavor: "The cavern's heartbeat. Rubies cluster where the walls glitter — if the walls glitter, swing there."
        ),
        MineOreEntry(
            name: "Diamond Ore", emoji: "💎", pick: "Diamond", depth: "Deep → Magma",
            value: 25,
            flavor: "Classic for a reason. Hard to crack, harder to stop mining once you start. Funds drills. Dreams. Everything."
        ),
        MineOreEntry(
            name: "Opal Ore", emoji: "🔮", pick: "Diamond", depth: "Magma fringe",
            value: 40,
            flavor: "The rarest shimmer in the mine. Opals only show at the ragged edge of the melt. Bring your best pick and low expectations for sleep."
        ),
        MineOreEntry(
            name: "Cube Crystal", emoji: "🟪", pick: "Stone+", depth: "Crystal caves",
            value: 14,
            flavor: "Square-mile manners: these grow in tidy grids on cave floors. Shatter the whole cave for a harvest bonus."
        ),
        MineOreEntry(
            name: "Spike Crystal", emoji: "🔺", pick: "Stone+", depth: "Crystal caves",
            value: 18,
            flavor: "Triangle trouble — stalactites above, stalagmites below. Mind your head in the figurative sense; nothing here can hurt you."
        ),
        MineOreEntry(
            name: "Orb Crystal", emoji: "🔮", pick: "Iron+", depth: "Crystal caves",
            value: 26,
            flavor: "Perfect spheres that hum at exactly the wrong frequency. Float mid-cave in glowing rings. Worth every swing."
        ),
        MineOreEntry(
            name: "Stone", emoji: "🪨", pick: "Any", depth: "Everywhere",
            value: 0,
            flavor: "Filler with ambition. Worth nothing, blocks everything, teaches patience. Every tycoon empire is built on ignored stone."
        ),
        MineOreEntry(
            name: "Deepslate", emoji: "⬛", pick: "Any", depth: "Deepstone",
            value: 0,
            flavor: "Stone that went to finishing school. Darker, denser, faintly judgmental. Still worth zero coins."
        ),
        MineOreEntry(
            name: "Dirt", emoji: "🟫", pick: "Any", depth: "Upper tunnels",
            value: 0,
            flavor: "One tap and it's gone. Dirt is less an ore and more a suggestion that rock used to be here."
        ),
        MineOreEntry(
            name: "Gravel", emoji: "⬜", pick: "Any", depth: "Upper tunnels",
            value: 0,
            flavor: "Crunchy. Gravel exists to make the good ores feel special by comparison. Thank it for its service."
        ),
        MineOreEntry(
            name: "Timber", emoji: "🪵", pick: "Any", depth: "Tunnel flanks",
            value: 1,
            flavor: "Old support beams from miners past. They held the ceiling for a century; now they hold 1 gold of value. Respect."
        ),
        MineOreEntry(
            name: "Planks", emoji: "🪵", pick: "Any", depth: "Tunnel flanks",
            value: 1,
            flavor: "Somebody's floorboards, once. Now your pocket change. The mine recycles everything, including architecture."
        ),
        MineOreEntry(
            name: "Closet Crate", emoji: "🚪", pick: "By hand", depth: "Near forks",
            value: 5,
            flavor: "Not ore at all — a cupboard. Opens by hand: snacks, tools, treasure… or cobwebs. The cobwebs are also treasure, emotionally."
        ),
        MineOreEntry(
            name: "Lava", emoji: "🔥", pick: "Unbreakable", depth: "Magma Core",
            value: 0,
            flavor: "Molten nope. Unbreakable, undrinkable, but great lighting. It warms you (warning only — god-mode means never harm)."
        ),
        MineOreEntry(
            name: "Bedrock", emoji: "⬛", pick: "Unbreakable", depth: "World edge",
            value: 0,
            flavor: "The mine's way of saying 'this far, no further.' Exists at the borders so the void doesn't have to."
        ),
    ]

    static func entry(for name: String) -> MineOreEntry? {
        all.first(where: { $0.name == name })
    }
}

// ============================================================
// MARK: - 2. Critter + layer + sector guides
// ============================================================

struct MineCritterEntry {
    var species: String
    var emoji: String
    var gift: String
    var flavor: String
}

enum MineCritterGuide {
    static var all: [MineCritterEntry] = [
        MineCritterEntry(
            species: "Mole", emoji: "📦",
            gift: "Gold + Iron Ore",
            flavor: "A cube that digs. It has strong opinions about soil compaction and shares them at length, in squeaks."
        ),
        MineCritterEntry(
            species: "Bat", emoji: "📦",
            gift: "Gold + Gold Ore",
            flavor: "Flies in squares because circles are for show-offs. Navigates by echo and vibes. Mostly vibes."
        ),
        MineCritterEntry(
            species: "Axolotl", emoji: "📦",
            gift: "Gold + Emerald Ore",
            flavor: "An amphibian box that never grew up and never will. Regrows lost corners. An inspiration to us all."
        ),
        MineCritterEntry(
            species: "Fox", emoji: "📦",
            gift: "Gold + Diamond Ore",
            flavor: "Sly, cubical, and faster than your swing. Leaves gifts to apologize for being untouchably cool."
        ),
        MineCritterEntry(
            species: "Wisp", emoji: "✨",
            gift: "Big gold + rare ore",
            flavor: "Not technically an animal. Not technically anything. A glowing rumor that pays 20–40 gold per visit. Believe."
        ),
    ]
}

struct MineLayerEntry {
    var title: String
    var emoji: String
    var depth: String
    var pay: String
    var danger: String
    var flavor: String
}

enum MineLayerGuide {
    static var all: [MineLayerEntry] = [
        MineLayerEntry(
            title: "Sunlit Tops", emoji: "🌿", depth: "y ≥ 3", pay: "×1.0",
            danger: "None. Birds, probably.",
            flavor: "Where every legend starts: daylight, dirt, and the smell of opportunity. Coal country."
        ),
        MineLayerEntry(
            title: "Dirt Tunnels", emoji: "🟫", depth: "y 1…3", pay: "×1.2",
            danger: "Splinters, emotionally.",
            flavor: "The commute layer. Iron starts showing up if you squint at the walls hard enough."
        ),
        MineLayerEntry(
            title: "Stone Depths", emoji: "🪨", depth: "y −1…1", pay: "×1.5",
            danger: "+1 rock toughness.",
            flavor: "Real mining begins. Gold veins, redstone hums, and the shaft down to serious money."
        ),
        MineLayerEntry(
            title: "Deepstone", emoji: "⬛", depth: "y −3…−1", pay: "×2.0",
            danger: "+2 rock toughness.",
            flavor: "Dark, dense, double pay. Emeralds and wraiths. The wraiths are decorative (god-mode)."
        ),
        MineLayerEntry(
            title: "Crystal Hollows", emoji: "🔮", depth: "y −4.5…−3", pay: "×3.0",
            danger: "+3 rock toughness.",
            flavor: "Caves of singing glass. Cubes, spikes, orbs — harvest whole caves for completion bonuses."
        ),
        MineLayerEntry(
            title: "Magma Core", emoji: "🔥", depth: "y < −4.5", pay: "×5.0",
            danger: "+5 rock toughness. Lava glare.",
            flavor: "The bottom of the world and the top of the market. Opals, rubies, rebirth eligibility. Bring a drill."
        ),
    ]
}

// ============================================================
// MARK: - 3. Codex view (reads live manager state)
// ============================================================

/// Collector's codex sheet. Discovery state comes straight from the
/// manager (ores banked, critters met, sectors mapped), so it never
/// goes stale and needs no hooks.
struct MineCodexView: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("📊 Collection progress")) {
                    HStack {
                        Text("Ores catalogued")
                        Spacer()
                        Text("\(foundOres)/\(MineOreGuide.all.count)")
                            .bold().monospacedDigit()
                    }
                    ProgressView(value: Double(foundOres), total: Double(MineOreGuide.all.count))
                        .progressViewStyle(LinearProgressViewStyle(tint: .orange))
                    HStack {
                        Text("Critters met")
                        Spacer()
                        Text("\(metCritters)/\(MineCritterGuide.all.count)")
                            .bold().monospacedDigit()
                    }
                    ProgressView(value: Double(metCritters), total: Double(MineCritterGuide.all.count))
                        .progressViewStyle(LinearProgressViewStyle(tint: .pink))
                    HStack {
                        Text("Sectors mapped")
                        Spacer()
                        Text("\(manager.player.sectorsFound.count)/9")
                            .bold().monospacedDigit()
                    }
                    ProgressView(value: Double(manager.player.sectorsFound.count), total: 9)
                        .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                    HStack {
                        Text("Caves tracked / harvested")
                        Spacer()
                        Text("\(manager.mineCaves.count) / \(manager.mineCaves.filter({ $0.harvested }).count)")
                            .bold().monospacedDigit()
                    }
                    HStack {
                        Text("Closets found / opened")
                        Spacer()
                        Text("\(manager.mineClosets.count) / \(manager.mineClosets.filter({ $0.isOpened }).count)")
                            .bold().monospacedDigit()
                    }
                }
                Section(header: Text("💎 Ore field guide")) {
                    ForEach(MineOreGuide.all, id: \.name) { entry in
                        let count = manager.player.ores[entry.name, default: 0]
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(entry.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(entry.name).font(.headline)
                                    Text("Needs \(entry.pick) • \(entry.depth) • \(entry.value)🪙 base")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if count > 0 {
                                    Text("×\(count)")
                                        .font(.subheadline.bold())
                                        .foregroundColor(.orange)
                                        .monospacedDigit()
                                } else {
                                    Text("???")
                                        .font(.caption).foregroundColor(.gray)
                                }
                            }
                            Text(entry.flavor)
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                Section(header: Text("📦 Boxy bestiary")) {
                    ForEach(MineCritterGuide.all, id: \.species) { entry in
                        let met = manager.critters.contains(where: { $0.species == entry.species && $0.greeted })
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(entry.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(met ? "Boxy \(entry.species)" : "???")
                                        .font(.headline)
                                    Text("Gifts: \(entry.gift)")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if met {
                                    Image(systemName: "heart.fill").foregroundColor(.pink)
                                } else {
                                    Image(systemName: "questionmark.circle").foregroundColor(.gray)
                                }
                            }
                            Text(met ? entry.flavor : "Something cubical hops in the dark. Walk up and say hi.")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                Section(header: Text("🕳️ Layer guide")) {
                    ForEach(MineLayerGuide.all, id: \.title) { layer in
                        VStack(alignment: .leading, spacing: 4) {
                            MineLayerDiorama(title: layer.title)
                            HStack {
                                Text(layer.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(layer.title).font(.headline)
                                    Text("\(layer.depth) • Pay \(layer.pay)")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if manager.currentLayer.title == layer.title {
                                    Text("YOU ARE HERE")
                                        .font(.caption2.bold()).foregroundColor(.green)
                                }
                            }
                            Text("Hazard: \(layer.danger)")
                                .font(.caption).foregroundColor(.orange)
                            Text(layer.flavor)
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                Section(header: Text("🗺️ Sector atlas")) {
                    ForEach(sectorRows, id: \.key) { row in
                        HStack {
                            Text(row.found ? "✅" : "⬜")
                            Text(row.name).font(.subheadline)
                            Spacer()
                            Text(row.found ? "Mapped" : "Unmapped")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                Section(header: Text("🔨 Pick forge guide")) {
                    Text("Coal buys picks (never sold — it stays banked). Each tier swings harder and unlocks new ores. Costs grow; magma hauls keep pace.")
                        .font(.caption).foregroundStyle(.secondary)
                    ForEach(MNPickTier.allCases, id: \.rawValue) { tier in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(tier.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(tier.name).font(.headline)
                                    Text("DMG \(tier.damage, specifier: "%.1f") • Cost \(tier.coalCost)⬛")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if tier == manager.player.pickTier {
                                    Text("EQUIPPED").font(.caption2.bold()).foregroundColor(.green)
                                } else if tier.rawValue < manager.player.pickTier.rawValue {
                                    Text("OWNED").font(.caption2).foregroundStyle(.secondary)
                                } else {
                                    Text("🔒").font(.caption)
                                }
                            }
                            Text("Unlocks: \(tier.unlocks).")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                Section(header: Text("🥚 Pet field guide")) {
                    Text("Eggs cost gold and scale with your herd (\(manager.petEggCost)🪙 next). Only 3 ride at once. Rarity sets the boost size.")
                        .font(.caption).foregroundStyle(.secondary)
                    HStack {
                        Text("Common +10%").font(.caption)
                        Spacer()
                        Text("Rare +25%").font(.caption)
                        Spacer()
                        Text("Epic +50%").font(.caption)
                        Spacer()
                        Text("Legendary +100%").font(.caption.bold()).foregroundColor(.orange)
                    }
                    .padding(.vertical, 2)
                    ForEach(petGuideRows, id: \.kind) { row in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(row.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("+\(row.kind) pets").font(.headline)
                                    Text("Equipped: \(row.equipped) • Total boost: +\(Int(row.total * 100))%")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                            }
                            Text(row.flavor)
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                Section(header: Text("👾 Monster manual")) {
                    Text("Three pests, zero threat (god-mode). Whack them for gold — spiders are fast, slimes hop, wraiths hover.")
                        .font(.caption).foregroundStyle(.secondary)
                    ForEach(monsterGuideRows, id: \.name) { row in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(row.emoji).font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(row.name).font(.headline)
                                    Text("HP \(row.hp) • DMG \(row.dmg) • SPD \(row.speed, specifier: "%.1f") • +\(row.gold)🪙")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(row.habitat)
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Text(row.flavor)
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                Section(header: Text("🧨 Bomb handbook")) {
                    Text("Bombs blast anything but bedrock and lava — no pick-tier gate. You earn one per 20 blocks mined (max 9). Blasts never hurt you badly (god-mode floors everything at a warning), but standing close still smarts for 8 HP of drama.")
                        .font(.caption).foregroundStyle(.secondary)
                    HStack {
                        Text("🧨 Stock: \(manager.bombs)/9")
                        Spacer()
                        Text("Next bomb in \(max(0, 20 - (manager.player.blocksMined % 20))) blocks")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                Section(header: Text("🥇 Firsts checklist")) {
                    Text("One of each, ever. The hall of tiny triumphs.")
                        .font(.caption).foregroundStyle(.secondary)
                    ForEach(firstsRows, id: \.label) { row in
                        HStack {
                            Text(row.done ? "✅" : "⬜")
                            Text(row.label).font(.subheadline)
                            Spacer()
                            Text(row.done ? row.have : "—")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                Section(header: Text("🏆 Hall of records")) {                    Text("All-time bests. The mine keeps score even when you don't.")
                        .font(.caption).foregroundStyle(.secondary)
                    HStack {
                        Text("💰 Best single sale")
                        Spacer()
                        Text("\(manager.bestSale)🪙").bold().foregroundColor(.yellow).monospacedDigit()
                    }
                    HStack {
                        Text("🎒 Richest backpack")
                        Spacer()
                        Text("\(manager.richestPack)🪙 unsold value").bold().monospacedDigit()
                    }
                    HStack {
                        Text("⛏️ Blocks broken")
                        Spacer()
                        Text("\(manager.player.blocksMined)").bold().monospacedDigit()
                    }
                    HStack {
                        Text("👾 Monsters slain")
                        Spacer()
                        Text("\(manager.player.monstersSlain)").bold().monospacedDigit()
                    }
                    HStack {
                        Text("💫 Rebirths")
                        Spacer()
                        Text("\(manager.player.rebirths) (+\(Int(manager.rebirthMult * 100 - 100))% power)").bold().foregroundColor(.purple).monospacedDigit()
                    }
                    HStack {
                        Text("🐾 Pets hatched")
                        Spacer()
                        Text("\(manager.player.pets.count)").bold().monospacedDigit()
                    }
                }
                Section(header: Text("💹 Tycoon playbook")) {
                    Text("The loop: dig deep → fill the pack → sell at the surface cart (+25%) → buy picks (coal) and packs (gold) → hatch pets → dig deeper → rebirth at rank 15 + Magma → repeat at +15% forever.")
                        .font(.caption).foregroundStyle(.secondary)
                    VStack(alignment: .leading, spacing: 6) {
                        Text("💰 Where the money is").font(.subheadline.bold())
                        Text("Magma Core pays ×5 base. A single Opal there banks 200 sell-value before pets, rebirths and the surface bonus. One full magma pack funds a backpack tier with change.")
                            .font(.caption).foregroundStyle(.secondary)
                        Text("🎒 Pack math").font(.subheadline.bold())
                        Text("Capacity 50 → 100 → 150… at quadratic gold cost. Rule of thumb: upgrade the pack when you fill it twice per trip. Current value riding: \(manager.player.sellValue)🪙 in \(manager.player.backpackUsed) units.")
                            .font(.caption).foregroundStyle(.secondary)
                        Text("🥚 Pet priority").font(.subheadline.bold())
                        Text("First egg: pray for Speed (faster breaks compound everything). Mid game: Luck (doubles are free money). Late: Gold (multiplies whole sales). Three riders max — retire Commons without mercy.")
                            .font(.caption).foregroundStyle(.secondary)
                        Text("💫 Rebirth timing").font(.subheadline.bold())
                        Text(manager.canRebirth ? "✅ You can rebirth RIGHT NOW: rank \(manager.player.level), magma-touched. Each cycle is +15% forever." : "Rebirth unlocks at rank 15 after touching the Magma Core (rank \(manager.player.level), deepest \(Int(manager.player.deepestY))). Don't rush the first one; do rush the second.")
                            .font(.caption).foregroundStyle(.secondary)
                        Text("🗺️ Sector income").font(.subheadline.bold())
                        Text("First visits pay 150🪙 × rebirth and bloom forks, caves, closets and visitors. Nine sectors = nine paydays plus the content they spawn.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                Section(header: Text("🛡️ House rules")) {
                    Text("God mode is locked on: lava, monsters, bats and your own bombs can startle you but never harm you. Rebirth keeps your position. Death is not on the menu.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Mine Codex")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private struct FirstsRow {
        var label: String
        var done: Bool
        var have: String
    }

    private var firstsRows: [FirstsRow] {
        let ores = manager.player.ores
        func has(_ names: [String]) -> (Bool, String) {
            for n in names where ores[n, default: 0] > 0 { return (true, n) }
            return (false, "")
        }
        let checks: [(String, [String])] = [
            ("First coal", ["Coal Ore"]),
            ("First iron", ["Iron Ore"]),
            ("First gold", ["Gold Ore"]),
            ("First blue (lapis/sapphire)", ["Lapis Ore"]),
            ("First red (redstone/ruby)", ["Redstone Ore", "Ruby Ore"]),
            ("First green (emerald)", ["Emerald Ore"]),
            ("First diamond-grade", ["Diamond Ore", "Opal Ore"]),
            ("First cave crystal", ["Cube Crystal", "Spike Crystal", "Orb Crystal"]),
            ("First closet loot", ["Closet Crate"]),
            ("First timber", ["Timber", "Planks"]),
        ]
        // Closets/crates aren't banked as ore — check opened registry instead.
        return checks.map { label, names in
            if label == "First closet loot" {
                let opened = !manager.mineClosets.filter({ $0.isOpened }).isEmpty
                return FirstsRow(label: label, done: opened, have: opened ? "opened!" : "")
            }
            let (done, have) = has(names)
            return FirstsRow(label: label, done: done, have: done ? "×\(ores[have, default: 0])" : "")
        }
    }

    private struct PetGuideRow {
        var kind: String
        var emoji: String
        var equipped: Int
        var total: Double
        var flavor: String
    }

    private var petGuideRows: [PetGuideRow] {
        let pets = manager.player.pets
        let flavors = [
            "Speed": "Swing damage up. Deep rock melts faster; committees of moles approve.",
            "Luck": "Double-drop chance up to +50%. Luck is a skill you can hatch.",
            "Gold": "Every sale fatter. Gold pets pay for themselves, then for everything else.",
        ]
        let emojis = ["Speed": "⚡", "Luck": "🍀", "Gold": "🪙"]
        return ["Speed", "Luck", "Gold"].map { kind in
            let mine = pets.filter({ $0.boostKind == kind })
            return PetGuideRow(
                kind: kind,
                emoji: emojis[kind] ?? "🐾",
                equipped: mine.filter({ $0.isEquipped }).count,
                total: mine.filter({ $0.isEquipped }).reduce(0.0, { $0 + $1.boostValue }),
                flavor: flavors[kind] ?? ""
            )
        }
    }

    private struct MonsterGuideRow {
        var name: String
        var emoji: String
        var hp: Int
        var dmg: Int
        var speed: Float
        var gold: Int
        var habitat: String
        var flavor: String
    }

    private var monsterGuideRows: [MonsterGuideRow] {
        let habitats = ["spider": "Upper tunnels", "slime": "Deep level", "wraith": "Crystal deep"]
        let flavors = [
            "spider": "Fast, leggy, dramatic. Eight legs, zero threat. Whack with confidence.",
            "slime": "Hops like it pays rent in bounce. Splits? No. Pays? Yes.",
            "wraith": "Hovering cone of menace (decorative menace). Drops the best purse.",
        ]
        return MNMonsterKind.allCases.map { kind in
            MonsterGuideRow(
                name: kind.rawValue.capitalized,
                emoji: kind.emoji,
                hp: kind.maxHP,
                dmg: kind.damage,
                speed: kind.speed,
                gold: kind.goldReward,
                habitat: habitats[kind.rawValue] ?? "The dark",
                flavor: flavors[kind.rawValue] ?? "Pest. Whack it."
            )
        }
    }

    private var foundOres: Int {
        MineOreGuide.all.filter({ manager.player.ores[$0.name, default: 0] > 0 }).count
    }

    private var metCritters: Int {
        MineCritterGuide.all.filter({ e in manager.critters.contains(where: { $0.species == e.species && $0.greeted }) }).count
    }

    private struct SectorRow {
        var key: String
        var name: String
        var found: Bool
    }

    private var sectorRows: [SectorRow] {
        let cols = ["West", "Central", "East"]
        let rows = ["North", "Heart", "South"]
        var out: [SectorRow] = []
        for row in 0..<3 {
            for col in 0..<3 {
                let key = "\(col),\(row)"
                out.append(SectorRow(
                    key: key,
                    name: "\(rows[row])-\(cols[col]) Dig",
                    found: manager.player.sectorsFound.contains(key)
                ))
            }
        }
        return out
    }
}
