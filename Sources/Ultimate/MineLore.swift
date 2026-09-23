//
//  MineLore.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Echoes of the old miners: 45 lore fragments that unlock from live game
//  state (sectors mapped, depth reached, ores banked, closets opened, pets
//  hatched, rebirths). Pure view layer — no hooks, nothing lethal.
//

import SwiftUI

// ============================================================
// MARK: - 1. Fragment model
// ============================================================

/// Unlock rule evaluated against the manager at view time.
enum MineLoreRule {
    case always
    case sectors(Int)
    case depth(y: Float) // deepestY <= y
    case ore(name: String, count: Int)
    case closets(Int)
    case caves(Int)
    case pets(Int)
    case rebirths(Int)
    case level(Int)
    case gold(Int)
    case critters(Int)
    case seals(Int)
}

struct MineLoreFragment: Identifiable {
    let id: String
    var title: String
    var text: String
    var source: String
    var rule: MineLoreRule
}

// ============================================================
// MARK: - 2. The 45 echoes
// ============================================================

enum MineLoreCatalog {
    static var all: [MineLoreFragment] = [
        MineLoreFragment(
            id: "echo-01",
            title: "First Day",
            text: "Day one. The foreman handed me a wooden pick and a warning: the mine provides. He didn't say it provides this much. First swing, first coal, first grin.",
            source: "Diary of Mabel Pick, p.1",
            rule: .always
        ),
        MineLoreFragment(
            id: "echo-02",
            title: "The God-Mode Accord",
            text: "We signed it in lampblack on a timber beam: nobody dies down here. The mine agreed. It has kept its word for a hundred years. So will you.",
            source: "Beam carving, entrance shaft",
            rule: .always
        ),
        MineLoreFragment(
            id: "echo-03",
            title: "Coal Is King",
            text: "Forget gold. Coal buys the picks that mine the gold that buys the packs that haul the coal. The circle of mine life. Worship accordingly.",
            source: "Forge graffiti",
            rule: .ore(name: "Coal Ore", count: 5)
        ),
        MineLoreFragment(
            id: "echo-04",
            title: "The Surface Cart",
            text: "Old Joren built the cart at the entrance and never explained the +25%. 'Surface air does something to the prices,' he said, pocketing the difference. Genius.",
            source: "Joren's ledger",
            rule: .sectors(1)
        ),
        MineLoreFragment(
            id: "echo-05",
            title: "Sector Superstition",
            text: "Every new sector gets a name, a cheer, and a timber arch. The arch holds nothing up. It holds everything together.",
            source: "Surveyor's handbook",
            rule: .sectors(3)
        ),
        MineLoreFragment(
            id: "echo-06",
            title: "Six Sectors Deep",
            text: "Half the known world walked. The other half is jealous. Keep going — the corners hide the last three.",
            source: "Margin note, survey map",
            rule: .sectors(6)
        ),
        MineLoreFragment(
            id: "echo-07",
            title: "The Whole Map",
            text: "All nine sectors. You have walked everywhere there is. The mine has no more secrets, only deeper ones.",
            source: "Your own handwriting, somehow",
            rule: .sectors(9)
        ),
        MineLoreFragment(
            id: "echo-08",
            title: "Stone Depths Letter",
            text: "Dear surface: the pay is 1.5× and the rock fights back a little. I have never been happier. Send socks.",
            source: "Unsent letter, shaft wall",
            rule: .depth(y: -1)
        ),
        MineLoreFragment(
            id: "echo-09",
            title: "Deepstone Confession",
            text: "Down here the dark has texture. I licked a wall once. Tasted like double pay. Would lick again.",
            source: "Anonymous, obviously",
            rule: .depth(y: -3)
        ),
        MineLoreFragment(
            id: "echo-10",
            title: "Crystal Hymn",
            text: "They sing, the caves. Cubes hum low, spikes whistle, orbs ring like bells. Harvest the whole cave and the song pays a bonus.",
            source: "Choir notes, Hollows chapel",
            rule: .depth(y: -4.5)
        ),
        MineLoreFragment(
            id: "echo-11",
            title: "Magma Postcard",
            text: "Wish you were here. Five times the pay, zero times the death. The lava is decorative. I waved at it.",
            source: "Postcard, never mailed",
            rule: .depth(y: -5)
        ),
        MineLoreFragment(
            id: "echo-12",
            title: "Iron Resolve",
            text: "Eight iron. That's a pick upgrade and a half. The forge master nodded at me today. A nod! From HER.",
            source: "Apprentice log",
            rule: .ore(name: "Iron Ore", count: 8)
        ),
        MineLoreFragment(
            id: "echo-13",
            title: "Gold Feverdream",
            text: "Saw gold in the wall and forgot my own name for an hour. Remembered it at the sell cart. It's Gold.",
            source: "Medical-ish report",
            rule: .ore(name: "Gold Ore", count: 6)
        ),
        MineLoreFragment(
            id: "echo-14",
            title: "Redstone Lullaby",
            text: "Hummed along with a redstone seam all shift. Foreman says that's how they get you. Foreman hums too.",
            source: "Shift songbook",
            rule: .ore(name: "Redstone Ore", count: 5)
        ),
        MineLoreFragment(
            id: "echo-15",
            title: "Emerald Evening",
            text: "One emerald funds a backpack tier. I did the math on the wall in chalk. The wall agreed. The wall always agrees.",
            source: "Chalk math, Deepstone",
            rule: .ore(name: "Emerald Ore", count: 3)
        ),
        MineLoreFragment(
            id: "echo-16",
            title: "Ruby Tuesday",
            text: "Found four rubies on a Tuesday. Renamed the day. It's Ruby Tuesday now. All Tuesdays. Forever.",
            source: "Calendar amendment",
            rule: .ore(name: "Ruby Ore", count: 4)
        ),
        MineLoreFragment(
            id: "echo-17",
            title: "Diamond Eulogy",
            text: "Here lies my old pick, retired after the sixth diamond. It served honorably. It is now a paperweight. A rich paperweight.",
            source: "Toolbox inscription",
            rule: .ore(name: "Diamond Ore", count: 6)
        ),
        MineLoreFragment(
            id: "echo-18",
            title: "Opal Secret",
            text: "If you're reading this, you found opals at the melt's edge. Tell no one. Actually tell everyone — the melt has plenty.",
            source: "Folded note in a helmet",
            rule: .ore(name: "Opal Ore", count: 3)
        ),
        MineLoreFragment(
            id: "echo-19",
            title: "Cube Theory",
            text: "Cubes grow in grids because the cave likes order. I respect that. I mine them anyway. The cave respects that.",
            source: "Geologist's margin",
            rule: .ore(name: "Cube Crystal", count: 10)
        ),
        MineLoreFragment(
            id: "echo-20",
            title: "Spike Warning",
            text: "Stalactites above, stalagmites below. The cave is a mouth and we are the dentists. Drill accordingly.",
            source: "Safety poster (defaced, fondly)",
            rule: .ore(name: "Spike Crystal", count: 8)
        ),
        MineLoreFragment(
            id: "echo-21",
            title: "Orb Meditation",
            text: "Sat among the floating orbs for an hour. Achieved enlightenment. Enlightenment is worth 26 gold per orb, pre-multiplier.",
            source: "Monk's expense report",
            rule: .ore(name: "Orb Crystal", count: 6)
        ),
        MineLoreFragment(
            id: "echo-22",
            title: "Closet Charter",
            text: "Article 1: all crates open by hand. Article 2: cobwebs count as treasure emotionally. Article 3: see Article 2.",
            source: "Closet openers' charter",
            rule: .closets(1)
        ),
        MineLoreFragment(
            id: "echo-23",
            title: "Snack Stash Sermon",
            text: "Blessed are the snack caches, for they restore the worker. Cursed are the fakes, for they restore only humility.",
            source: "Chapel pamphlet",
            rule: .closets(5)
        ),
        MineLoreFragment(
            id: "echo-24",
            title: "The Twentieth Door",
            text: "Twenty crates opened. Behind the last one: more mine. It is crates all the way down, and I mean that lovingly.",
            source: "Opener's memoir",
            rule: .closets(20)
        ),
        MineLoreFragment(
            id: "echo-25",
            title: "Cave Harvest Festival",
            text: "Once a year we clear a whole cave together and split the bonus. This year the cave was huge. Next year we bring a bigger crew: you.",
            source: "Festival poster",
            rule: .caves(1)
        ),
        MineLoreFragment(
            id: "echo-26",
            title: "Five Caves Anthem",
            text: "Five caves harvested, five songs sung. The Hollows hum our names now. Off-key, but ours.",
            source: "Choir notes, vol. 2",
            rule: .caves(5)
        ),
        MineLoreFragment(
            id: "echo-27",
            title: "First Egg",
            text: "It hatched! Something small, cubical, and opinionated. It boosts my swings and judges my form. I love it.",
            source: "Pet journal, entry 1",
            rule: .pets(1)
        ),
        MineLoreFragment(
            id: "echo-28",
            title: "Full Crew",
            text: "Three pets riding. Speed, luck, gold — the holy trinity. We are no longer a miner; we are a parade.",
            source: "Pet journal, entry 12",
            rule: .pets(3)
        ),
        MineLoreFragment(
            id: "echo-29",
            title: "Dragon Rumor",
            text: "They say a dragon pet exists. +100% everything. Nobody has seen one. Everybody knows somebody who knows somebody.",
            source: "Tavern talk",
            rule: .pets(6)
        ),
        MineLoreFragment(
            id: "echo-30",
            title: "Rebirth Certificate",
            text: "I hereby restart, richer in spirit and +15% in everything else. My position: unchanged. My power: compounding.",
            source: "Your certificate, framed",
            rule: .rebirths(1)
        ),
        MineLoreFragment(
            id: "echo-31",
            title: "Third Life Notice",
            text: "Third rebirth filed. The mine has started leaving the good ore where I'll find it. It denies everything.",
            source: "Clerk's stamp collection",
            rule: .rebirths(3)
        ),
        MineLoreFragment(
            id: "echo-32",
            title: "Rank Fifteen Speech",
            text: "Fifteen ranks. They gave a speech. I quote: 'Keep digging.' Shortest speech on record. Best speech on record.",
            source: "Ceremony program",
            rule: .level(15)
        ),
        MineLoreFragment(
            id: "echo-33",
            title: "Rank Twenty-Five Ode",
            text: "Ode to twenty-five: your arms are legend, your boots are myth, your backpack has its own weather system.",
            source: "Commissioned poem (paid in gold)",
            rule: .level(25)
        ),
        MineLoreFragment(
            id: "echo-34",
            title: "First Fortune",
            text: "First thousand gold. I held a coin to the lamp and it winked. Or I imagined it. Either way: rich.",
            source: "Bank book, page 1",
            rule: .gold(1000)
        ),
        MineLoreFragment(
            id: "echo-35",
            title: "Whale Song",
            text: "Twenty-five thousand lifetime. The cart needed new axles. The foreman needed a fainting couch. Worth it.",
            source: "Bank book, page 40",
            rule: .gold(25000)
        ),
        MineLoreFragment(
            id: "echo-36",
            title: "Mole Manifesto",
            text: "The mole digs straight because curves are a surface luxury. Read this, nod, dig straight.",
            source: "Found near a mole, unsigned",
            rule: .critters(1)
        ),
        MineLoreFragment(
            id: "echo-37",
            title: "Bat Geometry",
            text: "Squares are honest, says the bat. Circles are for show-offs. I have adopted this philosophy and my tunnels improved.",
            source: "Ibid.",
            rule: .critters(2)
        ),
        MineLoreFragment(
            id: "echo-38",
            title: "Axolotl Blessing",
            text: "Smile with your whole cube. Regrow what breaks. Believe in the miner unconditionally, as the axolotl believes in you.",
            source: "Chapel pamphlet, vol. 2",
            rule: .critters(3)
        ),
        MineLoreFragment(
            id: "echo-39",
            title: "Fox Epigram",
            text: "'Be too cool for corners,' said the fox, 'but never too cool for gifts.' Profound. Cubical. Correct.",
            source: "Ibid.",
            rule: .critters(4)
        ),
        MineLoreFragment(
            id: "echo-40",
            title: "Wisp Testimony",
            text: "I saw the Wisp and it saw me and we understood each other completely for exactly one second. Then it paid me 40 gold.",
            source: "Sworn statement",
            rule: .critters(5)
        ),
        MineLoreFragment(
            id: "echo-41",
            title: "Fork Philosophy",
            text: "Y-forks for the hasty, T-junctions for the decisive, crosses for the social, round chambers for the lost. All roads pay.",
            source: "Surveyor's handbook, ch. 2",
            rule: .sectors(4)
        ),
        MineLoreFragment(
            id: "echo-42",
            title: "Bomb Ethics",
            text: "Blast etiquette: warn the bats, spare the closets (they're sturdy), never stand close (dramatic, not dangerous).",
            source: "Demolition club rules",
            rule: .level(10)
        ),
        MineLoreFragment(
            id: "echo-43",
            title: "Timber Eulogy",
            text: "These beams held the ceiling for a century. We mine them for 1 gold and zero guilt, because the ceiling holds itself now. Probably.",
            source: "Beam carving, deep shaft",
            rule: .ore(name: "Timber", count: 10)
        ),
        MineLoreFragment(
            id: "echo-44",
            title: "Lapis Conspiracy",
            text: "The wizards never paid extra. There are no wizards. The lapis is still beautiful and that's enough. That's always been enough.",
            source: "Retraction notice",
            rule: .ore(name: "Lapis Ore", count: 5)
        ),
        MineLoreFragment(
            id: "echo-45",
            title: "The Last Page",
            text: "If you've read all forty-five echoes, you are the mine's memory now. Dig kindly, sell wisely, feed every cube. — M.P.",
            source: "Diary of Mabel Pick, last page",
            rule: .rebirths(1)
        ),
        MineLoreFragment(
            id: "echo-46",
            title: "Stone Ledger",
            text: "Five hundred blocks broken. The tally wall ran out of wall. We started a second wall. The second wall is load-bearing. Everything is fine.",
            source: "Tally wall, second wall",
            rule: .level(8)
        ),
        MineLoreFragment(
            id: "echo-47",
            title: "Coal Baron's Boast",
            text: "One hundred coal banked and the forge master smiled. A full smile. Teeth and everything. Tell the grandkids.",
            source: "Boast, notarized",
            rule: .ore(name: "Coal Ore", count: 100)
        ),
        MineLoreFragment(
            id: "echo-48",
            title: "Bomb Poem",
            text: "Fifty blasts. Roses are red, magma is hot, my backpack is empty, ka-boom goes the rock.",
            source: "Demolition club chapbook",
            rule: .level(12)
        ),
        MineLoreFragment(
            id: "echo-49",
            title: "Full House Rules",
            text: "All five species greeted. The congress is complete: mole, bat, axolotl, fox, wisp. Motions pass unanimously. Snacks are served.",
            source: "Congress minutes",
            rule: .critters(5)
        ),
        MineLoreFragment(
            id: "echo-50",
            title: "Fifty Doors",
            text: "Forty crates opened and counting toward fifty. I have been faked out many times and I regret nothing. The next cobweb is almost beautiful.",
            source: "Opener's memoir, vol. 2",
            rule: .closets(40)
        ),
        MineLoreFragment(
            id: "echo-51",
            title: "Ten Caves Cantata",
            text: "Seven caves harvested, sung in four-part harmony. The Hollows harmonize back now. We are a duet with geology.",
            source: "Choir notes, vol. 3",
            rule: .caves(7)
        ),
        MineLoreFragment(
            id: "echo-52",
            title: "Fifth Dawn",
            text: "Fifth rebirth. I remember every life and every shortcut. The mine pretends not to know me. The ore placement says otherwise.",
            source: "Clerk's stamp collection, overflow drawer",
            rule: .rebirths(5)
        ),
        MineLoreFragment(
            id: "echo-53",
            title: "Half-Million Hymn",
            text: "Five hundred thousand gold lifetime. They renamed the cart after me. It's called Joren still, but everyone knows.",
            source: "Bank book, final page",
            rule: .gold(500000)
        ),
        MineLoreFragment(
            id: "echo-54",
            title: "Thirty Ranks",
            text: "Rank thirty. The ceremony ran long. The speech was one word again: 'Deeper.' The crowd went wild.",
            source: "Ceremony program, annotated",
            rule: .level(30)
        ),
        MineLoreFragment(
            id: "echo-55",
            title: "Hundred Slain Sonnet",
            text: "One hundred monsters slain, shall I compare thee to a tidy tunnel? Thou art more orderly and less bitey. Mostly.",
            source: "Bard's commission (paid in gold)",
            rule: .level(20)
        ),
        MineLoreFragment(
            id: "echo-56",
            title: "Timber Centennial",
            text: "Fifty beams cleared. The ceiling held. The ceiling always holds. Say thank you to the ceiling.",
            source: "Beam carving, far shaft",
            rule: .ore(name: "Timber", count: 50)
        ),
        MineLoreFragment(
            id: "echo-57",
            title: "Lapis Epilogue",
            text: "Fifteen lapis and still no wizards. I have become the wizard I was waiting for. The blue was inside us all along.",
            source: "Retraction of the retraction",
            rule: .ore(name: "Lapis Ore", count: 15)
        ),
        MineLoreFragment(
            id: "echo-58",
            title: "Pet Census",
            text: "Ten eggs hatched. The crew roster: speedsters, lucky charms, gold goblins (affectionate). Parades daily at noon.",
            source: "Pet journal, appendix",
            rule: .pets(10)
        ),
        MineLoreFragment(
            id: "echo-59",
            title: "Opal Octave",
            text: "Eight opals. The melt's edge glitters like a held breath. Exhale slowly. Sell high. Return tomorrow.",
            source: "Folded note, second helmet",
            rule: .ore(name: "Opal Ore", count: 8)
        ),
        MineLoreFragment(
            id: "echo-60",
            title: "Mabel's Thanks",
            text: "Sixty echoes found. You read everything, mapped everything, befriended everything cubical. The mine is yours. It always was. — M.P.",
            source: "Margin of the margin",
            rule: .rebirths(3)
        ),
        MineLoreFragment(
            id: "echo-61",
            title: "First Seal Broken",
            text: "Paid the minerals, watched the runes go dark, walked into a glittering room that was waiting specifically for me. Seals aren't locks. They're invitations with a cover charge.",
            source: "Your own hand, still dusty",
            rule: .seals(1)
        ),
        MineLoreFragment(
            id: "echo-62",
            title: "Master of Keys",
            text: "Five seals broken. Doors open when I walk past now, out of respect. Or loose hinges. Either way: open.",
            source: "Carved above the fifth door",
            rule: .seals(5)
        ),
    ]

    /// Fragments unlocked by a snapshot of manager state.
    static func unlocked(
        sectors: Int, deepestY: Float, ores: [String: Int],
        closets: Int, caves: Int, pets: Int, rebirths: Int,
        level: Int, gold: Int, critters: Int, seals: Int = 0
    ) -> [MineLoreFragment] {
        all.filter { f in
            switch f.rule {
            case .always: return true
            case .sectors(let n): return sectors >= n
            case .depth(let y): return deepestY <= y
            case .ore(let name, let n): return ores[name, default: 0] >= n
            case .closets(let n): return closets >= n
            case .caves(let n): return caves >= n
            case .pets(let n): return pets >= n
            case .rebirths(let n): return rebirths >= n
            case .level(let n): return level >= n
            case .gold(let n): return gold >= n
            case .critters(let n): return critters >= n
            case .seals(let n): return seals >= n
            }
        }
    }
}

// ============================================================
// MARK: - 3. Lore journal view
// ============================================================

/// Lore journal sheet. Unlock state derives from the manager, so entries
/// appear exactly when earned — no hooks, no timers.
struct MineLoreView: View {
    @ObservedObject var manager: MineManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("📜 Echoes (\(found.count)/\(MineLoreCatalog.all.count))")) {
                    ProgressView(value: Double(found.count), total: Double(MineLoreCatalog.all.count))
                        .progressViewStyle(LinearProgressViewStyle(tint: .purple))
                    Text("Fragments of old miners surface as you dig, map, befriend and rebirth. The mine remembers — now, so do you.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                ForEach(MineLoreCatalog.all, id: \.id) { fragment in
                    let open = foundIds.contains(fragment.id)
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(open ? "📜" : "🔒")
                            Text(open ? fragment.title : "Sealed echo")
                                .font(.headline)
                            Spacer()
                        }
                        if open {
                            Text(fragment.text)
                                .font(.subheadline)
                            Text("— \(fragment.source)")
                                .font(.caption).foregroundStyle(.secondary)
                        } else {
                            Text(hint(for: fragment.rule))
                                .font(.caption).foregroundStyle(.tertiary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Echoes of the Mine")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private var found: [MineLoreFragment] {
        MineLoreCatalog.unlocked(
            sectors: manager.player.sectorsFound.count,
            deepestY: manager.player.deepestY,
            ores: manager.player.ores,
            closets: manager.mineClosets.filter({ $0.isOpened }).count,
            caves: manager.mineCaves.filter({ $0.harvested }).count,
            pets: manager.player.pets.count,
            rebirths: manager.player.rebirths,
            level: manager.player.level,
            gold: manager.player.gold,
            critters: manager.critters.filter({ $0.greeted }).count,
            seals: manager.mineCaves.filter({ !$0.isLocked && !$0.unlockCost.isEmpty }).count
        )
    }

    private var foundIds: Set<String> {
        Set(found.map(\.id))
    }

    private func hint(for rule: MineLoreRule) -> String {
        switch rule {
        case .always: return "Yours from the start."
        case .sectors(let n): return "Map \(n) sectors."
        case .depth: return "Dig deeper…"
        case .ore(let name, let n): return "Bank \(n)× \(name)."
        case .closets(let n): return "Open \(n) closets."
        case .caves(let n): return "Harvest \(n) caves."
        case .pets(let n): return "Hatch \(n) pets."
        case .rebirths(let n): return "Rebirth \(n)×."
        case .level(let n): return "Reach rank \(n)."
        case .gold(let n): return "Hold \(n)🪙."
        case .critters(let n): return "Befriend \(n) critters."
        case .seals(let n): return "Break \(n) cave seals."
        }
    }
}
