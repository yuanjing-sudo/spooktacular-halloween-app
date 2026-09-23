//
//  MineQuests.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Quest board for the Abandoned Mine: 30 story quests from first swing to
//  rebirth and beyond. The manager forwards one-line `record(...)` hooks;
//  rewards arrive through the `onReward` closure. Session-persistent
//  completion (completed IDs survive restarts).
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Events + triggers
// ============================================================

/// Game events the quest board listens to. Managers forward these.
enum MineQuestEvent {
    case blockBroken
    case oreMined(name: String, count: Int)
    case goldSold(amount: Int)
    case xpEarned(amount: Int)
    case layerReached(name: String)
    case sectorMapped(count: Int)
    case closetOpened
    case caveHarvested
    case caveUnlocked
    case petHatched
    case pickForged
    case packUpgraded
    case rebirthed
    case critterGreeted
    case monsterSlain
    case bombThrown
    case depthReached(y: Float)
}

/// What completes a quest. Associated value is the target.
enum MineQuestTrigger {
    case breakBlocks(Int)
    case mineOre(String, Int) // "any" matches everything
    case sellGold(Int) // cumulative lifetime
    case earnXP(Int) // cumulative lifetime
    case reachLayer(String) // layer title
    case mapSectors(Int)
    case openClosets(Int)
    case harvestCaves(Int)
    case unlockCaves(Int)
    case hatchPets(Int)
    case forgePicks(Int)
    case upgradePacks(Int)
    case rebirth(Int)
    case greetCritters(Int)
    case slayMonsters(Int)
    case throwBombs(Int)
    case reachDepth(Float) // deepestY <= value

    var hint: String {
        switch self {
        case .breakBlocks(let n): return "Break \(n) blocks"
        case .mineOre(let name, let n):
            return name == "any" ? "Mine \(n) ores" : "Mine \(n)× \(name)"
        case .sellGold(let n): return "Sell \(n)🪙 lifetime"
        case .earnXP(let n): return "Earn \(n) XP lifetime"
        case .reachLayer(let name): return "Reach \(name)"
        case .mapSectors(let n): return "Map \(n) sectors"
        case .openClosets(let n): return "Open \(n) closets"
        case .harvestCaves(let n): return "Harvest \(n) crystal caves"
        case .unlockCaves(let n): return n == 1 ? "Break a cave seal" : "Break \(n) cave seals"
        case .hatchPets(let n): return "Hatch \(n) pets"
        case .forgePicks(let n): return "Forge \(n) pick upgrades"
        case .upgradePacks(let n): return "Upgrade backpack \(n)×"
        case .rebirth(let n): return n == 1 ? "Rebirth once" : "Rebirth \(n)×"
        case .greetCritters(let n): return "Meet \(n) boxy critters"
        case .slayMonsters(let n): return "Slay \(n) monsters"
        case .throwBombs(let n): return "Throw \(n) bombs"
        case .reachDepth: return "Touch the Magma Core"
        }
    }
}

// ============================================================
// MARK: - 2. Quest definition
// ============================================================

struct MineQuest: Identifiable {
    let id: String
    var title: String
    var detail: String
    var icon: String
    var trigger: MineQuestTrigger
    var rewardGold: Int
    var rewardXP: Int
    var tip: String
}

// ============================================================
// MARK: - 3. Catalog (30 quests, early → endgame)
// ============================================================

enum MineQuestCatalog {
    static var all: [MineQuest] = [
        MineQuest(
            id: "first-swing",
            title: "First Swing",
            detail: "Every tycoon starts with a single crack in the rock.",
            icon: "⛏️",
            trigger: .breakBlocks(1),
            rewardGold: 25, rewardXP: 10,
            tip: "Tap any glowing ore to swing."
        ),
        MineQuest(
            id: "warming-up",
            title: "Warming Up",
            detail: "Ten blocks. The backpack barely notices.",
            icon: "🧱",
            trigger: .breakBlocks(10),
            rewardGold: 60, rewardXP: 25,
            tip: "Hold the ⛏️ button to mine without tapping."
        ),
        MineQuest(
            id: "coal-blooded",
            title: "Coal-Blooded",
            detail: "Coal is the forge's currency. Stockpile the black stuff.",
            icon: "⬛",
            trigger: .mineOre("Coal Ore", 5),
            rewardGold: 40, rewardXP: 30,
            tip: "Coal glows faintly near the entrance tunnels."
        ),
        MineQuest(
            id: "heavy-pockets",
            title: "Heavy Pockets",
            detail: "Bank 25 ore units, then cash them in.",
            icon: "🎒",
            trigger: .mineOre("any", 25),
            rewardGold: 120, rewardXP: 60,
            tip: "Watch the 🎒 meter — full means payday."
        ),
        MineQuest(
            id: "first-payday",
            title: "First Payday",
            detail: "Sell your first haul. Gold spends everywhere.",
            icon: "💰",
            trigger: .sellGold(200),
            rewardGold: 100, rewardXP: 50,
            tip: "The surface cart by the entrance pays +25%."
        ),
        MineQuest(
            id: "sharper-stick",
            title: "A Sharper Stick",
            detail: "Forge the Stone Pick. Iron country awaits.",
            icon: "🪨⛏️",
            trigger: .forgePicks(1),
            rewardGold: 80, rewardXP: 60,
            tip: "Coal buys picks in the ⛏️ panel."
        ),
        MineQuest(
            id: "iron-age",
            title: "Iron Age",
            detail: "Drag 8 iron out of the dark.",
            icon: "🟫",
            trigger: .mineOre("Iron Ore", 8),
            rewardGold: 150, rewardXP: 90,
            tip: "Iron needs Stone pick or better."
        ),
        MineQuest(
            id: "cartographer",
            title: "Cartographer",
            detail: "Map 3 of the 9 sectors. The mine grows as you roam.",
            icon: "🗺️",
            trigger: .mapSectors(3),
            rewardGold: 200, rewardXP: 100,
            tip: "Walk into dark map — new sectors bloom content."
        ),
        MineQuest(
            id: "snoop",
            title: "Snoop",
            detail: "Pop open your first closet cache. Mind the cobwebs.",
            icon: "🚪",
            trigger: .openClosets(1),
            rewardGold: 120, rewardXP: 60,
            tip: "Wooden 🚪 crates open by hand — no pick needed."
        ),
        MineQuest(
            id: "deeper-feeling",
            title: "A Deeper Feeling",
            detail: "Descend to the Stone Depths. The pay bump is real.",
            icon: "🪨",
            trigger: .reachLayer("Stone Depths"),
            rewardGold: 180, rewardXP: 100,
            tip: "Take the shaft down at x 6…10."
        ),
        MineQuest(
            id: "gold-rush",
            title: "Gold Rush",
            detail: "Six gold ore. Shiny, heavy, spendable.",
            icon: "🟨",
            trigger: .mineOre("Gold Ore", 6),
            rewardGold: 250, rewardXP: 140,
            tip: "Gold likes the deep haulage walls."
        ),
        MineQuest(
            id: "big-pack",
            title: "Big Pack Energy",
            detail: "Buy your first backpack upgrade. Stay down longer.",
            icon: "🎒",
            trigger: .upgradePacks(1),
            rewardGold: 150, rewardXP: 80,
            tip: "Backpack Mk.2 holds 100 units."
        ),
        MineQuest(
            id: "boom-tech",
            title: "Boom Tech",
            detail: "Throw 3 bombs. Subtlety is for the surface.",
            icon: "🧨",
            trigger: .throwBombs(3),
            rewardGold: 200, rewardXP: 120,
            tip: "Mine 20 blocks to earn each bomb."
        ),
        MineQuest(
            id: "pest-control",
            title: "Pest Control",
            detail: "Slay 5 mine monsters. They can't hurt you — return the favor.",
            icon: "🕷️",
            trigger: .slayMonsters(5),
            rewardGold: 220, rewardXP: 140,
            tip: "Tap monsters to whack them with your pick."
        ),
        MineQuest(
            id: "deepstone-diver",
            title: "Deepstone Diver",
            detail: "Reach Deepstone. Rewards double from here.",
            icon: "⬛",
            trigger: .reachLayer("Deepstone"),
            rewardGold: 350, rewardXP: 200,
            tip: "Below y −1 the rock fights back (+2 toughness)."
        ),
        MineQuest(
            id: "redstone-racer",
            title: "Redstone Racer",
            detail: "Five redstone. It practically hums.",
            icon: "🟥",
            trigger: .mineOre("Redstone Ore", 5),
            rewardGold: 300, rewardXP: 200,
            tip: "Needs an Iron pick."
        ),
        MineQuest(
            id: "boxy-friend",
            title: "Boxy Friend",
            detail: "Greet your first boxy critter. It comes bearing gifts.",
            icon: "📦",
            trigger: .greetCritters(1),
            rewardGold: 250, rewardXP: 150,
            tip: "Walk up to hopping cubes — they gift gold and ore."
        ),
        MineQuest(
            id: "egg-day",
            title: "Egg Day",
            detail: "Hatch your first pet. Speed, luck, or gold — fate decides.",
            icon: "🥚",
            trigger: .hatchPets(1),
            rewardGold: 200, rewardXP: 150,
            tip: "Eggs cost gold; the first three pets ride free."
        ),
        MineQuest(
            id: "crystal-tourist",
            title: "Crystal Tourist",
            detail: "Set foot in the Crystal Hollows. Triple pay, triple pretty.",
            icon: "🔮",
            trigger: .reachLayer("Crystal Hollows"),
            rewardGold: 500, rewardXP: 300,
            tip: "Around y −3 to −4.5, and inside the cave pockets."
        ),
        MineQuest(
            id: "cave-raider",
            title: "Cave Raider",
            detail: "Fully harvest a crystal cave for its completion bonus.",
            icon: "⛏️",
            trigger: .harvestCaves(1),
            rewardGold: 450, rewardXP: 300,
            tip: "Clear every growth: cubes, spikes and orbs."
        ),
        MineQuest(
            id: "ruby-tuesday",
            title: "Ruby Tuesday",
            detail: "Four rubies. Any day is ruby day down here.",
            icon: "♦️",
            trigger: .mineOre("Ruby Ore", 4),
            rewardGold: 600, rewardXP: 400,
            tip: "Needs a Golden pick. Caverns help."
        ),
        MineQuest(
            id: "closet-enthusiast",
            title: "Closet Enthusiast",
            detail: "Open 8 caches. You know about the fakes and you open them anyway.",
            icon: "🚪",
            trigger: .openClosets(8),
            rewardGold: 500, rewardXP: 300,
            tip: "New sectors restock closets near their forks."
        ),
        MineQuest(
            id: "magma-walker",
            title: "Magma Walker",
            detail: "Stand in the Magma Core. Five times the pay. Zero times the death.",
            icon: "🔥",
            trigger: .reachLayer("Magma Core"),
            rewardGold: 900, rewardXP: 600,
            tip: "Below y −4.5. The lava glows; you glow brighter."
        ),
        MineQuest(
            id: "diamond-hands",
            title: "Diamond Hands",
            detail: "Hold six diamonds all the way to the sell cart.",
            icon: "💎",
            trigger: .mineOre("Diamond Ore", 6),
            rewardGold: 1000, rewardXP: 700,
            tip: "Needs a Diamond pick. Deep walls, caverns, patience."
        ),
        MineQuest(
            id: "pack-mule",
            title: "Pack Mule",
            detail: "Triple-upgrade the backpack. Two hundred units of greed.",
            icon: "🎒",
            trigger: .upgradePacks(3),
            rewardGold: 700, rewardXP: 400,
            tip: "Costs scale quadratically — sell deep ores."
        ),
        MineQuest(
            id: "opal-dreams",
            title: "Opal Dreams",
            detail: "Three opals, the rarest shimmer in the mine.",
            icon: "🔮",
            trigger: .mineOre("Opal Ore", 3),
            rewardGold: 1200, rewardXP: 800,
            tip: "Opals hide in the deepest walls."
        ),
        MineQuest(
            id: "menagerie",
            title: "Menagerie",
            detail: "Befriend 4 different boxy critters.",
            icon: "📦",
            trigger: .greetCritters(4),
            rewardGold: 800, rewardXP: 500,
            tip: "Five species roam; the Wisp pays best."
        ),
        MineQuest(
            id: "whale-watch",
            title: "Whale Watch",
            detail: "Sell 25,000🪙 lifetime. The cart groans under the weight.",
            icon: "🐋",
            trigger: .sellGold(25000),
            rewardGold: 2000, rewardXP: 1200,
            tip: "Magma Core hauls + surface bonus = thousands per trip."
        ),
        MineQuest(
            id: "second-life",
            title: "Second Life",
            detail: "Rebirth. Rank 15, Magma-touched, ready to start richer.",
            icon: "💫",
            trigger: .rebirth(1),
            rewardGold: 0, rewardXP: 500,
            tip: "Each rebirth is +15% everything, forever."
        ),
        MineQuest(
            id: "living-legend",
            title: "Living Legend",
            detail: "Earn 50,000 XP lifetime. The mine carves your name in deepslate.",
            icon: "👑",
            trigger: .earnXP(50000),
            rewardGold: 3000, rewardXP: 0,
            tip: "Deep ores, quests, rebirths. Grind gloriously."
        ),
        MineQuest(
            id: "cube-farmer",
            title: "Cube Farmer",
            detail: "Fifteen square crystals. Geometry has never paid so well.",
            icon: "🟪",
            trigger: .mineOre("Cube Crystal", 15),
            rewardGold: 700, rewardXP: 450,
            tip: "Cube grids carpet the floors of new frontier caves."
        ),
        MineQuest(
            id: "spike-specialist",
            title: "Spike Specialist",
            detail: "Ten triangle spikes, up and down. Watch the ceiling ones.",
            icon: "🔺",
            trigger: .mineOre("Spike Crystal", 10),
            rewardGold: 650, rewardXP: 420,
            tip: "Spikes ring cave walls — check floor AND ceiling."
        ),
        MineQuest(
            id: "orb-oracle",
            title: "Orb Oracle",
            detail: "Eight floating orbs. They saw you coming. They always do.",
            icon: "🔮",
            trigger: .mineOre("Orb Crystal", 8),
            rewardGold: 800, rewardXP: 500,
            tip: "Orbs hover mid-cave in glowing rings."
        ),
        MineQuest(
            id: "timber-timber",
            title: "Timber! (Sorry)",
            detail: "Clear 20 old support beams. Somebody had to hold the ceiling; now somebody has to clear it.",
            icon: "🪵",
            trigger: .mineOre("Timber", 20),
            rewardGold: 250, rewardXP: 200,
            tip: "Beams flank every tunnel. They forgive you."
        ),
        MineQuest(
            id: "sector-sweeper",
            title: "Sector Sweeper",
            detail: "Map 6 sectors. Two-thirds of the known world, personally walked.",
            icon: "🧹",
            trigger: .mapSectors(6),
            rewardGold: 900, rewardXP: 550,
            tip: "Each new sector blooms a fork, a cave and caches."
        ),
        MineQuest(
            id: "sector-master",
            title: "Sector Master",
            detail: "All 9 sectors mapped. You have walked everywhere there is.",
            icon: "🌍",
            trigger: .mapSectors(9),
            rewardGold: 1500, rewardXP: 900,
            tip: "Corners hide the last sectors. Check the atlas."
        ),
        MineQuest(
            id: "tool-collector",
            title: "Tool Collector",
            detail: "Forge 3 pick upgrades. A wall of increasingly serious metal.",
            icon: "🔨",
            trigger: .forgePicks(3),
            rewardGold: 600, rewardXP: 400,
            tip: "Stone → Iron → Golden climbs fast on coal."
        ),
        MineQuest(
            id: "drill-sergeant",
            title: "Drill Sergeant",
            detail: "Forge all 6 upgrades up to the Void Drill. Maximum spin achieved.",
            icon: "🌀⛏️",
            trigger: .forgePicks(6),
            rewardGold: 2000, rewardXP: 1200,
            tip: "The drill costs 160 coal. Magma hauls fund it in trips."
        ),
        MineQuest(
            id: "pack-mule-2",
            title: "Freight Train",
            detail: "Upgrade the backpack 5 times. Three hundred units of pure greed.",
            icon: "🚂",
            trigger: .upgradePacks(5),
            rewardGold: 1200, rewardXP: 700,
            tip: "Deep magma hauls make quadratic costs feel linear."
        ),
        MineQuest(
            id: "pet-trainer",
            title: "Pet Trainer",
            detail: "Hatch 3 eggs. A small crew of cube-adjacent weirdos.",
            icon: "🐾",
            trigger: .hatchPets(3),
            rewardGold: 700, rewardXP: 450,
            tip: "Only 3 ride at once — pick complementary boosts."
        ),
        MineQuest(
            id: "pet-magnate",
            title: "Pet Magnate",
            detail: "Hatch 6 eggs. You are now running a small furry economy.",
            icon: "🎪",
            trigger: .hatchPets(6),
            rewardGold: 1400, rewardXP: 800,
            tip: "Eggs get pricier. Magma gold keeps pace."
        ),
        MineQuest(
            id: "exterminator",
            title: "Exterminator",
            detail: "Slay 25 mine monsters. The tunnels are officially bouncy-castle safe.",
            icon: "⚔️",
            trigger: .slayMonsters(25),
            rewardGold: 900, rewardXP: 600,
            tip: "Bombs soften packs; picks finish them."
        ),
        MineQuest(
            id: "demolitionist",
            title: "Demolitionist",
            detail: "Throw 15 bombs. The mine has great acoustics, you're just testing them.",
            icon: "💥",
            trigger: .throwBombs(15),
            rewardGold: 800, rewardXP: 500,
            tip: "Every 20 blocks earns a bomb. Spend them loudly."
        ),
        MineQuest(
            id: "gold-magnate",
            title: "Gold Magnate",
            detail: "Sell 100,000🪙 lifetime. The cart needs new axles because of you.",
            icon: "🏦",
            trigger: .sellGold(100000),
            rewardGold: 5000, rewardXP: 2500,
            tip: "Surface bonus + gold pets + rebirths compound hard."
        ),
        MineQuest(
            id: "xp-titan",
            title: "XP Titan",
            detail: "Earn 150,000 XP lifetime. Your pick has a fan club.",
            icon: "🌟",
            trigger: .earnXP(150000),
            rewardGold: 6000, rewardXP: 0,
            tip: "Deep crystals + quest cascades + rebirth loops."
        ),
        MineQuest(
            id: "serial-rebirther",
            title: "Serial Rebirther",
            detail: "Rebirth 3 times. Die never, restart eternally, profit always.",
            icon: "💫",
            trigger: .rebirth(3),
            rewardGold: 0, rewardXP: 2000,
            tip: "Three rebirths is +45% everything, forever."
        ),
        MineQuest(
            id: "critter-congress",
            title: "Critter Congress",
            detail: "Befriend 6 boxy critters. Quorum achieved. Motions: snacks.",
            icon: "📦",
            trigger: .greetCritters(6),
            rewardGold: 1100, rewardXP: 700,
            tip: "Five seeded species plus frontier wanderers."
        ),
        MineQuest(
            id: "cave-cartographer-2",
            title: "Cave Magnate",
            detail: "Fully harvest 5 crystal caves. The mine's glassware section fears you.",
            icon: "🏺",
            trigger: .harvestCaves(5),
            rewardGold: 1300, rewardXP: 800,
            tip: "Frontier sectors crack open fresh caves."
        ),
        MineQuest(
            id: "closet-king",
            title: "Closet King",
            detail: "Open 20 caches. You have seen every cobweb the mine owns.",
            icon: "🚪",
            trigger: .openClosets(20),
            rewardGold: 1000, rewardXP: 650,
            tip: "Forks restock closets. Fakes still count."
        ),
        MineQuest(
            id: "stone-cold",
            title: "Stone Cold",
            detail: "Break 500 blocks. The tally wall needed a second wall because of you.",
            icon: "🧱",
            trigger: .breakBlocks(500),
            rewardGold: 1500, rewardXP: 900,
            tip: "Bombs count. Everything counts. Keep swinging."
        ),
        MineQuest(
            id: "quarry-lord",
            title: "Quarry Lord",
            detail: "Break 2,000 blocks. At this point you aren't mining the mine — you ARE the mine.",
            icon: "🏗️",
            trigger: .breakBlocks(2000),
            rewardGold: 4000, rewardXP: 2500,
            tip: "Drill + speed pets + magma walls = hundreds per trip."
        ),
        MineQuest(
            id: "coal-baron",
            title: "Coal Baron",
            detail: "Bank 100 coal. The forge master smiles with teeth. Frame the moment.",
            icon: "⬛",
            trigger: .mineOre("Coal Ore", 100),
            rewardGold: 1200, rewardXP: 800,
            tip: "Coal is never sold — it piles up while you chase gold."
        ),
        MineQuest(
            id: "timber-mill",
            title: "Timber Mill",
            detail: "Clear 50 support beams. The ceiling holds itself now. Probably. Say thanks anyway.",
            icon: "🪚",
            trigger: .mineOre("Timber", 50),
            rewardGold: 800, rewardXP: 500,
            tip: "Beams flank every tunnel and fork arch."
        ),
        MineQuest(
            id: "lapis-librarian",
            title: "Lapis Librarian",
            detail: "Catalog 15 lapis. Still no wizards. You are the wizard now.",
            icon: "📘",
            trigger: .mineOre("Lapis Ore", 15),
            rewardGold: 900, rewardXP: 600,
            tip: "Stone pick or better, stone layer and below."
        ),
        MineQuest(
            id: "gold-vault",
            title: "Gold Vault",
            detail: "Sell 500,000🪙 lifetime. They renamed the cart after you (pending paperwork).",
            icon: "🏦",
            trigger: .sellGold(500000),
            rewardGold: 12000, rewardXP: 6000,
            tip: "Rebirth multipliers make the second 250k faster than the first."
        ),
        MineQuest(
            id: "xp-mythic",
            title: "XP Mythic",
            detail: "Earn 500,000 XP lifetime. Your pick has a fan club with chapters.",
            icon: "🌠",
            trigger: .earnXP(500000),
            rewardGold: 15000, rewardXP: 0,
            tip: "Deep crystals, quest cascades, serial rebirths."
        ),
        MineQuest(
            id: "rebirth-5",
            title: "Eternal Return",
            detail: "Rebirth 5 times. +75% everything. The mine pretends not to know you. The ore says otherwise.",
            icon: "♾️",
            trigger: .rebirth(5),
            rewardGold: 0, rewardXP: 5000,
            tip: "Each cycle funds the next. Compound interest, but pickaxes."
        ),
        MineQuest(
            id: "full-house",
            title: "Full House",
            detail: "Befriend all 5 seeded species. The congress photo goes on the chapel wall.",
            icon: "🏠",
            trigger: .greetCritters(5),
            rewardGold: 1000, rewardXP: 650,
            tip: "Mole, Bat, Axolotl, Fox, Wisp — check the bestiary… er, codex."
        ),
        MineQuest(
            id: "bomb-brigade",
            title: "Bomb Brigade",
            detail: "Throw 50 bombs. The demolition club elects you president for life.",
            icon: "💣",
            trigger: .throwBombs(50),
            rewardGold: 2000, rewardXP: 1200,
            tip: "Twenty blocks per bomb. Magma walls are dense — farm blasts there."
        ),
        MineQuest(
            id: "slay-centurion",
            title: "Slay Centurion",
            detail: "Slay 100 mine monsters. The tunnels are now a bouncy castle with ore flooring.",
            icon: "💯",
            trigger: .slayMonsters(100),
            rewardGold: 2500, rewardXP: 1500,
            tip: "Drill damage carries to whacks. Bombs soften packs first."
        ),
        MineQuest(
            id: "seal-breaker",
            title: "Seal Breaker",
            detail: "Redeem minerals to open your first sealed cave. The seal counts your minerals. Bring minerals.",
            icon: "🔓",
            trigger: .unlockCaves(1),
            rewardGold: 400, rewardXP: 250,
            tip: "Sealed caves shimmer gray. Costs live in the 🔒 Caves panel."
        ),
        MineQuest(
            id: "master-key",
            title: "Master Key",
            detail: "Break 5 cave seals. Doors open when you walk past now, out of respect.",
            icon: "🗝️",
            trigger: .unlockCaves(5),
            rewardGold: 1200, rewardXP: 800,
            tip: "Every third pocket is sealed; frontier sectors seal two in five."
        ),
        MineQuest(
            id: "frostbitten",
            title: "Frostbitten",
            detail: "Mine 8 Frost Ore. Cold to the touch, warm to the wallet.",
            icon: "❄️",
            trigger: .mineOre("Frost Ore", 8),
            rewardGold: 350, rewardXP: 220,
            tip: "Frost pockets ring both levels — look for the chill."
        ),
        MineQuest(
            id: "glacier-glass",
            title: "Glacier Glass",
            detail: "Mine 5 Glacier Crystals. Windows for giants, paychecks for you.",
            icon: "🧊",
            trigger: .mineOre("Glacier Crystal", 5),
            rewardGold: 550, rewardXP: 350,
            tip: "Needs an Iron pick. Frost walls glitter blue-white."
        ),
        MineQuest(
            id: "snow-day",
            title: "Snow Day",
            detail: "Clear 20 Snowstone. Somebody has to shovel the mine.",
            icon: "⛏️",
            trigger: .mineOre("Snowstone", 20),
            rewardGold: 200, rewardXP: 150,
            tip: "One tap each — the fastest quest in the book."
        ),
        MineQuest(
            id: "permafrost-pro",
            title: "Permafrost Pro",
            detail: "Mine 20 Frost Ore. You don't feel the cold anymore. The cold feels you.",
            icon: "❄️",
            trigger: .mineOre("Frost Ore", 20),
            rewardGold: 700, rewardXP: 450,
            tip: "Five pockets plus patience. Check the map."
        ),
        MineQuest(
            id: "ice-palace",
            title: "Ice Palace",
            detail: "Mine 12 Glacier Crystals. Royalty mines here. You ARE royalty now.",
            icon: "🏰",
            trigger: .mineOre("Glacier Crystal", 12),
            rewardGold: 1100, rewardXP: 700,
            tip: "Clear whole pockets for the harvest bonus."
        ),
        MineQuest(
            id: "deep-freeze",
            title: "Deep Freeze",
            detail: "Clear 50 Snowstone. The mine's sidewalks have never been safer.",
            icon: "🌨️",
            trigger: .mineOre("Snowstone", 50),
            rewardGold: 500, rewardXP: 300,
            tip: "Frost walls crumble fast — bring a big backpack."
        ),
    ]
}

// ============================================================
// MARK: - 4. Board engine
// ============================================================

/// Three active quests at a time, drawn in catalog order. Progress and
/// completion persist across launches; claim rewards through `onReward`.
final class MineQuestBoard: ObservableObject {
    @Published private(set) var progress: [String: Int] = [:]
    @Published private(set) var completed: Set<String> = []
    @Published private(set) var claimed: Set<String> = []

    /// Lifetime counters for cumulative quests.
    @Published private(set) var lifetimeSold: Int = 0
    @Published private(set) var lifetimeXP: Int = 0

    /// Fired on claim: the manager converts (gold, xp) into player state.
    var onReward: ((Int, Int) -> Void)?

    let activeLimit = 3
    private let progressKey = "mineQuestProgress.v1"
    private let completedKey = "mineQuestCompleted.v1"
    private let claimedKey = "mineQuestClaimed.v1"
    private let soldKey = "mineQuestSold.v1"
    private let xpKey = "mineQuestXP.v1"

    init() { load() }

    var active: [MineQuest] {
        let open = MineQuestCatalog.all.filter { !completed.contains($0.id) }
        return Array(open.prefix(activeLimit))
    }

    var claimable: [MineQuest] {
        active.filter { isDone($0) && !claimed.contains($0.id) }
    }

    var doneCount: Int { completed.count }
    var totalCount: Int { MineQuestCatalog.all.count }

    func progressOf(_ quest: MineQuest) -> Int {
        progress[quest.id, default: 0]
    }

    func targetOf(_ quest: MineQuest) -> Int {
        switch quest.trigger {
        case .breakBlocks(let n): return n
        case .mineOre(_, let n): return n
        case .sellGold(let n): return n
        case .earnXP(let n): return n
        case .reachLayer: return 1
        case .mapSectors(let n): return n
        case .openClosets(let n): return n
        case .harvestCaves(let n): return n
        case .unlockCaves(let n): return n
        case .hatchPets(let n): return n
        case .forgePicks(let n): return n
        case .upgradePacks(let n): return n
        case .rebirth(let n): return n
        case .greetCritters(let n): return n
        case .slayMonsters(let n): return n
        case .throwBombs(let n): return n
        case .reachDepth: return 1
        }
    }

    func fractionOf(_ quest: MineQuest) -> Double {
        let t = targetOf(quest)
        guard t > 0 else { return 1 }
        return min(1, Double(progressOf(quest)) / Double(t))
    }

    func isDone(_ quest: MineQuest) -> Bool {
        completed.contains(quest.id) || progressOf(quest) >= targetOf(quest)
    }

    @discardableResult
    func claim(_ quest: MineQuest) -> Bool {
        guard isDone(quest), !claimed.contains(quest.id) else { return false }
        claimed.insert(quest.id)
        onReward?(quest.rewardGold, quest.rewardXP)
        save()
        return true
    }

    /// Feed a game event. Only active quests advance (plus lifetime totals).
    func record(_ event: MineQuestEvent) {
        switch event {
        case .goldSold(let n):
            lifetimeSold += n
        case .xpEarned(let n):
            lifetimeXP += n
        default:
            break
        }
        var changed = false
        for quest in active where !isDone(quest) {
            let before = progressOf(quest)
            let after = advance(quest: quest, from: before, event: event)
            if after != before {
                progress[quest.id] = after
                changed = true
                if after >= targetOf(quest) {
                    completed.insert(quest.id)
                }
            }
        }
        // Lifetime quests read totals directly.
        for quest in active where !isDone(quest) {
            switch quest.trigger {
            case .sellGold:
                let v = min(lifetimeSold, targetOf(quest))
                if v != progressOf(quest) {
                    progress[quest.id] = v
                    changed = true
                    if v >= targetOf(quest) { completed.insert(quest.id) }
                }
            case .earnXP:
                let v = min(lifetimeXP, targetOf(quest))
                if v != progressOf(quest) {
                    progress[quest.id] = v
                    changed = true
                    if v >= targetOf(quest) { completed.insert(quest.id) }
                }
            default:
                break
            }
        }
        if changed { save() }
    }

    private func advance(quest: MineQuest, from: Int, event: MineQuestEvent) -> Int {
        let target = targetOf(quest)
        func cap(_ v: Int) -> Int { min(target, v) }
        switch (quest.trigger, event) {
        case (.breakBlocks, .blockBroken):
            return cap(from + 1)
        case (.mineOre(let want, _), .oreMined(let name, let n)):
            if want == "any" || want == name { return cap(from + n) }
            return from
        case (.reachLayer(let want), .layerReached(let name)):
            return want == name ? target : from
        case (.mapSectors, .sectorMapped(let count)):
            return cap(max(from, count))
        case (.openClosets, .closetOpened):
            return cap(from + 1)
        case (.harvestCaves, .caveHarvested):
            return cap(from + 1)
        case (.unlockCaves, .caveUnlocked):
            return cap(from + 1)
        case (.hatchPets, .petHatched):
            return cap(from + 1)
        case (.forgePicks, .pickForged):
            return cap(from + 1)
        case (.upgradePacks, .packUpgraded):
            return cap(from + 1)
        case (.rebirth, .rebirthed):
            return cap(from + 1)
        case (.greetCritters, .critterGreeted):
            return cap(from + 1)
        case (.slayMonsters, .monsterSlain):
            return cap(from + 1)
        case (.throwBombs, .bombThrown):
            return cap(from + 1)
        case (.reachDepth(let depth), .depthReached(let y)):
            return y <= depth ? target : from
        default:
            return from
        }
    }

    // MARK: Persistence

    private func save() {
        UserDefaults.standard.set(progress, forKey: progressKey)
        UserDefaults.standard.set(Array(completed), forKey: completedKey)
        UserDefaults.standard.set(Array(claimed), forKey: claimedKey)
        UserDefaults.standard.set(lifetimeSold, forKey: soldKey)
        UserDefaults.standard.set(lifetimeXP, forKey: xpKey)
    }

    private func load() {
        progress = UserDefaults.standard.dictionary(forKey: progressKey) as? [String: Int] ?? [:]
        completed = Set(UserDefaults.standard.stringArray(forKey: completedKey) ?? [])
        claimed = Set(UserDefaults.standard.stringArray(forKey: claimedKey) ?? [])
        lifetimeSold = UserDefaults.standard.integer(forKey: soldKey)
        lifetimeXP = UserDefaults.standard.integer(forKey: xpKey)
    }

    func resetAll() {
        progress = [:]
        completed = []
        claimed = []
        lifetimeSold = 0
        lifetimeXP = 0
        save()
    }
}

// ============================================================
// MARK: - 5. Board UI
// ============================================================

/// Quest board sheet: active quests with progress + claim, then archive.
struct MineQuestView: View {
    @ObservedObject var board: MineQuestBoard
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("📜 Active (\(board.doneCount)/\(board.totalCount) done)")) {
                    if board.active.isEmpty {
                        VStack(spacing: 8) {
                            Text("👑").font(.system(size: 44))
                            Text("Every quest complete. Living legend.")
                                .font(.headline)
                            Text("Rebirth for a fresh board with permanent power.")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    } else {
                        ForEach(board.active) { quest in
                            questCard(quest)
                        }
                    }
                }
                if !board.claimed.isEmpty {
                    Section(header: Text("🏆 Claimed")) {
                        ForEach(MineQuestCatalog.all.filter({ board.claimed.contains($0.id) })) { quest in
                            HStack {
                                Text(quest.icon)
                                Text(quest.title).font(.subheadline)
                                Spacer()
                                Image(systemName: "checkmark.seal.fill")
                                    .foregroundColor(.green)
                            }
                        }
                    }
                }
                Section(header: Text("📖 Coming up")) {
                    ForEach(MineQuestCatalog.all.filter({
                        !board.completed.contains($0.id) && !board.active.map(\.id).contains($0.id)
                    }).prefix(4)) { quest in
                        HStack {
                            Text(quest.icon)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(quest.title).font(.subheadline.bold())
                                Text(quest.trigger.hint)
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Quests")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func questCard(_ quest: MineQuest) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(quest.icon).font(.title2)
                VStack(alignment: .leading, spacing: 2) {
                    Text(quest.title).font(.headline)
                    Text(quest.trigger.hint)
                        .font(.caption).foregroundColor(.orange)
                }
                Spacer()
                if board.claimed.contains(quest.id) {
                    Text("CLAIMED").font(.caption2.bold()).foregroundColor(.green)
                } else if board.isDone(quest) {
                    Button("Claim +\(quest.rewardGold)🪙") { _ = board.claim(quest) }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                        .tint(.green)
                } else {
                    Text("\(board.progressOf(quest))/\(board.targetOf(quest))")
                        .font(.caption.bold()).foregroundColor(.secondary)
                        .monospacedDigit()
                }
            }
            Text(quest.detail)
                .font(.subheadline).foregroundStyle(.secondary)
            ProgressView(value: board.fractionOf(quest))
                .progressViewStyle(LinearProgressViewStyle(tint: board.isDone(quest) ? .green : .orange))
            HStack {
                Text("Reward: \(quest.rewardGold)🪙 +\(quest.rewardXP) XP")
                    .font(.caption).foregroundColor(.yellow)
                Spacer()
                Text("💡 \(quest.tip)")
                    .font(.caption).foregroundColor(.gray)
            }
        }
        .padding(.vertical, 4)
    }
}
