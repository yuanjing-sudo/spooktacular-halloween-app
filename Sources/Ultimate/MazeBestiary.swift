//
//  MazeBestiary.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Hunter's bestiary for the Tunnel Maze: all 39 monster types with habitat,
//  tactics and flavor. Stats (rarity) read live from MonsterType; flavor is
//  keyed by raw value with a safe fallback, so new types can never break it.
//  Boxy friends get a FRIEND badge instead of a threat rating.
//

import SwiftUI

// ============================================================
// MARK: - 1. Field notes (keyed by raw value, fallback-safe)
// ============================================================

struct MazeBestiaryNote {
    var habitat: String
    var tactic: String
    var flavor: String
}

enum MazeBestiary {
    static var notes: [String: MazeBestiaryNote] = [
        "🟢 Slime": MazeBestiaryNote(
            habitat: "Damp floors everywhere",
            tactic: "Walk up and bonk it. It bounces. You win.",
            flavor: "The tutorial monster. Jiggles when struck, apologizes never."
        ),
        "🧟 Zombie": MazeBestiaryNote(
            habitat: "Dark straightaways",
            tactic: "Kite backward; it walks in a straight line, like its plans.",
            flavor: "Shambles with purpose and zero follow-through."
        ),
        "💀 Skeleton": MazeBestiaryNote(
            habitat: "Bone-dry side drifts",
            tactic: "Ranged spells shine — it has no cover and no fear.",
            flavor: "All that remains of a miner who skipped leg day. Rattles ominously."
        ),
        "🕷️ Spider": MazeBestiaryNote(
            habitat: "Ceilings and webs",
            tactic: "Fast! Hit first, keep moving, check the ceiling.",
            flavor: "Eight legs, all of them faster than you. Rude but fair."
        ),
        "🕷️ Cave Spider": MazeBestiaryNote(
            habitat: "Deep cracks",
            tactic: "Even faster. Save sprint for the dodge, not the chase.",
            flavor: "The regular spider's overachieving cousin."
        ),
        "🦇 Bat": MazeBestiaryNote(
            habitat: "High ceilings",
            tactic: "It dives in lines — step sideways at the screech.",
            flavor: "Navigates by echo. Finds you anyway. Impressive, annoying."
        ),
        "💥 Creeper": MazeBestiaryNote(
            habitat: "Behind you (always behind you)",
            tactic: "One hit then retreat — it needs a moment. So do you.",
            flavor: "Hisses before it pops. The hiss is your cue to be elsewhere."
        ),
        "👾 Enderman": MazeBestiaryNote(
            habitat: "Tall chambers",
            tactic: "Don't stare. Hit its feet. Apologize to no one.",
            flavor: "Rude to look at, ruder to fight. Teleports when embarrassed."
        ),
        "🧙 Witch": MazeBestiaryNote(
            habitat: "Potion-scented nooks",
            tactic: "Interrupt the brewing arm first.",
            flavor: "Throws bottles with labels like 'ouch'. Excellent penmanship."
        ),
        "👻 Ghast": MazeBestiaryNote(
            habitat: "Tall shafts",
            tactic: "It floats — aim up and keep cover between volleys.",
            flavor: "Cries like a kettle. Explodes like a kettle. Do not hug."
        ),
        "🟧 Magma Cube": MazeBestiaryNote(
            habitat: "Warm bands",
            tactic: "Splits when struck? Hit the big one hardest, first.",
            flavor: "A slime that chose violence and central heating."
        ),
        "🔥 Blaze": MazeBestiaryNote(
            habitat: "Hot junctions",
            tactic: "Strafe in circles; its volleys lead the target.",
            flavor: "On fire, emotionally and otherwise. Douse with damage."
        ),
        "💀 Wither Skeleton": MazeBestiaryNote(
            habitat: "Ashen drifts",
            tactic: "Tall and tanky — burst damage beats long duels.",
            flavor: "The skeleton's goth phase. It never ended."
        ),
        "🧟 Stray": MazeBestiaryNote(
            habitat: "Cold pockets",
            tactic: "Slows your sprint — finish it before the second volley.",
            flavor: "A zombie that discovered winter and never recovered."
        ),
        "🧟 Husk": MazeBestiaryNote(
            habitat: "Dry deeps",
            tactic: "Tanky but slow. Patience and pickaxes.",
            flavor: "Desiccated, dehydrated, and deeply committed to the bit."
        ),
        "🧟 Drowned": MazeBestiaryNote(
            habitat: "Flooded nooks",
            tactic: "Lures you into water — fight from dry stone.",
            flavor: "Gurgles threats. The threats are real. The water is worse."
        ),
        "👻 Phantom": MazeBestiaryNote(
            habitat: "Open caverns",
            tactic: "Watches from above, dives without warning. Keep moving.",
            flavor: "Insomnia given wings. It hasn't slept and neither will you."
        ),
        "📦 Shulker": MazeBestiaryNote(
            habitat: "Chamber walls",
            tactic: "It IS the wall now. Burst it between volleys.",
            flavor: "A box with opinions about trespassing. Respect the box. Break the box."
        ),
        "👻 Vex": MazeBestiaryNote(
            habitat: "Near evokers",
            tactic: "Tiny, fast, phases through rock. Swing where it's going, not where it is.",
            flavor: "A flying footnote to someone else's evil plan."
        ),
        "🏹 Pillager": MazeBestiaryNote(
            habitat: "Patrolled tunnels",
            tactic: "Close distance fast — its bow hates point-blank.",
            flavor: "Crossbow enthusiast. Terrible at directions, great at volleys."
        ),
        "🪓 Vindicator": MazeBestiaryNote(
            habitat: "Guard posts",
            tactic: "Heavy axe, slow swing. Dodge sideways, punish the whiff.",
            flavor: "Shouts its own name mid-charge. HR has been notified."
        ),
        "🔮 Evoker": MazeBestiaryNote(
            habitat: "Rune chambers",
            tactic: "Kill summons first, then the evoker. Never the reverse.",
            flavor: "Middle management of the monster world. Summons interns (vexes)."
        ),
        "🐂 Ravager": MazeBestiaryNote(
            habitat: "Wide junctions",
            tactic: "It charges in lines — pillars are your best friends.",
            flavor: "A bull with a grudge against architecture. And you."
        ),
        "⚔️ Dungeon Guardian": MazeBestiaryNote(
            habitat: "Sealed doors",
            tactic: "Rare and proud. Save cooldowns, burst on openings.",
            flavor: "Has guarded the same door for a century. The door is gone. The duty remains."
        ),
        "💎 Crystal Golem": MazeBestiaryNote(
            habitat: "Crystal caves",
            tactic: "Drops gems when cracked. Aim for the glowing joints.",
            flavor: "A walking payday with anger issues. Polished, literally."
        ),
        "🌑 Shadow Beast": MazeBestiaryNote(
            habitat: "Unlit stretches",
            tactic: "Bring light — it fights worse while visible.",
            flavor: "Mostly shadow, partly beast, entirely done with lanterns."
        ),
        "🌌 Void Walker": MazeBestiaryNote(
            habitat: "Reality-thin spots",
            tactic: "Blinks around. Watch the shimmer, swing at the landing.",
            flavor: "Commutes through the void to menace you specifically."
        ),
        "💀 Eternal Skeleton": MazeBestiaryNote(
            habitat: "Ancient floors",
            tactic: "Outlast it — it cannot outlast you (god-mode).",
            flavor: "Old as the maze, twice as stubborn, half as fast."
        ),
        "👑 Elder Guardian": MazeBestiaryNote(
            habitat: "Flooded vaults",
            tactic: "Boss: clear adds, burst the eye, respect the slam.",
            flavor: "Royalty of the deep. Its crown is real. So is its temper."
        ),
        "💀 Wither": MazeBestiaryNote(
            habitat: "Ashen arenas",
            tactic: "Boss: three heads, zero mercy. Keep moving, always.",
            flavor: "The final exam of the monster curriculum. Study: running."
        ),
        "🐉 Ender Dragon": MazeBestiaryNote(
            habitat: "The biggest chamber",
            tactic: "Boss: dodge the dives, punish the perches.",
            flavor: "A dragon. In your maze. It has notes on your interior design."
        ),
        "👿 Void Lord": MazeBestiaryNote(
            habitat: "Beyond the far torches",
            tactic: "Boss: phases fast, hits hardest. Max pick, max nerve.",
            flavor: "Middle manager of the abyss. Your expeditions are its quarterly review."
        ),
        "🌑 Shadow King": MazeBestiaryNote(
            habitat: "The darkest junction",
            tactic: "Boss: the maze's final answer. Everything you learned, at once.",
            flavor: "Bows before duels. Fights dirty after them."
        ),
        "📦 Boxy Mole": MazeBestiaryNote(
            habitat: "Wherever tunnels feel lonely",
            tactic: "FRIEND. Feed it (journal button). It digs straight and loves you.",
            flavor: "A cube that digs. Strong opinions on soil. Stronger feelings for you."
        ),
        "📦 Boxy Bat": MazeBestiaryNote(
            habitat: "High ceilings, square flight paths",
            tactic: "FRIEND. Flies in squares because squares are honest.",
            flavor: "Navigates by echo and vibes. Mostly vibes."
        ),
        "📦 Boxy Axolotl": MazeBestiaryNote(
            habitat: "Damp nooks",
            tactic: "FRIEND. Smiles with its whole cube. Feed for maximum smile.",
            flavor: "Never grew up, never will. Regrows corners. An inspiration."
        ),
        "📦 Boxy Fox": MazeBestiaryNote(
            habitat: "Golden-lit drifts",
            tactic: "FRIEND. Too cool for corners it didn't choose. Gifts anyway.",
            flavor: "Sly, cubical, untouchably cool. Leaves gifts to maintain mystique."
        ),
        "✨ Golden Wisp": MazeBestiaryNote(
            habitat: "Far Reaches, past the last torch",
            tactic: "FRIEND (legendary). Richest gifts in the maze. Follow the glow.",
            flavor: "A glowing rumor that pays 300 XP per sighting. Believe."
        ),
    ]

    static func note(for type: MonsterType) -> MazeBestiaryNote {
        notes[type.rawValue] ?? MazeBestiaryNote(
            habitat: "The dark",
            tactic: "Hit it until it stops. (God-mode: it stops first.)",
            flavor: "Undocumented fauna. swings solve most introductions."
        )
    }

    static var friendCount: Int {
        MonsterType.allCases.filter({ $0.isBoxy }).count
    }

    static var foeCount: Int {
        MonsterType.allCases.count - friendCount
    }
}

// ============================================================
// MARK: - 2. Bestiary view
// ============================================================

/// Hunter's bestiary sheet, grouped by rarity with live counts.
struct MazeBestiaryView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🎓 Hunter's handbook")) {
                    Text("Golden rules of the tunnels, bought with other people's HP (yours is guaranteed).")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("1. Cubes are friends. If it's a cube and it squeaks, feed it — do not swing. Bond halves don't grow back overnight.")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("2. Tall things telegraph. Spiders rear, vindicators shout, dragons perch. The wind-up is your window.")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("3. Corners are cover. Pillars beat ravagers, walls beat ghasts, doorframes beat everything with a bow.")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("4. Farm the warm band. Ember Deeps packs density without boss pressure — combos grow fat there.")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("5. Bosses pay 10× and shinies 5×. Save cooldowns, burst openings, collect legend pay.")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("6. You cannot die here. Fight like it — aggression is free, caution is a style choice.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section(header: Text("👑 Boss dossiers")) {
                    Text("Five bosses rotate through boss rooms. All pay big, all hit big (never lethal — god-mode). Study up.")
                        .font(.caption).foregroundStyle(.secondary)
                    bossDossier(
                        name: "Elder Guardian",
                        phases: "Phase 1 (>60% HP): slow slams, wide tells. Phase 2: summons two adds — clear them, they buff its slam. Phase 3 (<30%): enrage, 1.8× speed, eye-beam volleys.",
                        loadout: "Bring burst spells + a shield. Save Crystal Shield for phase 3.",
                        pay: "10× points, legendary drops, expedition progress."
                    )
                    bossDossier(
                        name: "Wither",
                        phases: "Phase 1: three heads rotate volleys — strafe, never backpedal. Phase 2 (<50%): skull rain, keep a pillar between you and two heads. Phase 3 (<25%): dash slam, dodge sideways only.",
                        loadout: "High-DPS single target + stamina food. Sprint is mandatory.",
                        pay: "Top-tier score. Brags forever."
                    )
                    bossDossier(
                        name: "Ender Dragon",
                        phases: "Airborne circles, then perches. Perch = punish window: everything you have, all at once. Grounded breath leaves safe wedges — stand in the wedges.",
                        loadout: "Ranged spells for air phase, melee burst for perch.",
                        pay: "Dragon scale drops + massive score."
                    )
                    bossDossier(
                        name: "Void Lord",
                        phases: "Blinks every few seconds — watch the shimmer, swing at the landing, never at the fade. Adds are portals: kill the portal, not the spawns.",
                        loadout: "Fast-cast spells beat big slow ones. Reaction over rotation.",
                        pay: "Void-touched loot, rarest expedition ticks."
                    )
                    bossDossier(
                        name: "Shadow King",
                        phases: "The final exam: cycles every pattern in this book — slams, volleys, summons, dives — faster each loop. Learn the rhythm, then dance.",
                        loadout: "Everything maxed. All consumables. No fear (literally can't die).",
                        pay: "The maze's best purse + eternal bragging rights."
                    )
                }
                Section(header: Text("⚔️ Weakness chart")) {
                    Text("Rarity × approach: what works on everything, at a glance.")
                        .font(.caption).foregroundStyle(.secondary)
                    weaknessRow(rarity: "⬜ Commons", approach: "Walk up, swing, loot. Save nothing, fear nothing. They are XP with legs.")
                    weaknessRow(rarity: "🔷 Uncommons", approach: "Respect the gimmick (slow, webs, phases). One counter-play each, then they fold.")
                    weaknessRow(rarity: "💎 Rares", approach: "Burst windows + adds control. Bring cooldowns, leave with gems and stories.")
                    weaknessRow(rarity: "👑 Legendaries", approach: "Full loadout, full stomach, full nerve. Study the dossiers above. You cannot die — they can.")
                    weaknessRow(rarity: "📦 Boxies", approach: "No weakness. Only snacks. Feeding is the whole meta.")
                }
                Section(header: Text("📊 Field census")) {
                    HStack {
                        Text("Documented foes")
                        Spacer()
                        Text("\(MazeBestiary.foeCount)").bold().monospacedDigit()
                    }
                    HStack {
                        Text("Boxy friends")
                        Spacer()
                        Text("\(MazeBestiary.friendCount)").bold().foregroundColor(.pink)
                    }
                    Text("Friends never hunt you (detection range zero, aggression off). Foes do. The entries below tell you exactly how.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                ForEach(["Legendary", "Rare", "Uncommon", "Common"], id: \.self) { rarity in
                    Section(header: Text("\(rarityBadge(rarity)) \(rarity)")) {
                        ForEach(types(of: rarity), id: \.rawValue) { type in
                            entryCard(type)
                        }
                    }
                }
            }
            .navigationTitle("Hunter's Bestiary")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func weaknessRow(rarity: String, approach: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(rarity).font(.subheadline.bold())
            Text(approach).font(.caption).foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }

    private func bossDossier(name: String, phases: String, loadout: String, pay: String) -> some View {        VStack(alignment: .leading, spacing: 4) {
            Text("👑 \(name)").font(.headline)
            Text("Phases: \(phases)").font(.caption)
            Text("Loadout: \(loadout)").font(.caption).foregroundColor(.orange)
            Text("Pay: \(pay)").font(.caption).foregroundColor(.yellow)
        }
        .padding(.vertical, 4)
    }

    private func rarityBadge(_ rarity: String) -> String {        switch rarity {
        case "Legendary": return "👑"
        case "Rare": return "💎"
        case "Uncommon": return "🔷"
        default: return "⬜"
        }
    }

    private func types(of rarity: String) -> [MonsterType] {
        MonsterType.allCases
            .filter({ $0.rarity.rawValue == rarity })
            .sorted(by: { $0.displayName < $1.displayName })
    }

    private func entryCard(_ type: MonsterType) -> some View {
        let note = MazeBestiary.note(for: type)
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(type.rawValue).font(.headline)
                Spacer()
                if type.isBoxy {
                    Text("FRIEND").font(.caption2.bold())
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Color.pink).foregroundColor(.white)
                        .cornerRadius(6)
                } else if type.rarity.rawValue == "Legendary" {
                    Text("BOSS POOL").font(.caption2.bold())
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Color.red.opacity(0.8)).foregroundColor(.white)
                        .cornerRadius(6)
                }
            }
            HStack {
                Text("📍 \(note.habitat)")
                    .font(.caption).foregroundStyle(.secondary)
                Spacer()
                Text(type.rarity.rawValue)
                    .font(.caption).foregroundColor(.orange)
            }
            Text("⚔️ \(note.tactic)")
                .font(.caption)
            Text(note.flavor)
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
