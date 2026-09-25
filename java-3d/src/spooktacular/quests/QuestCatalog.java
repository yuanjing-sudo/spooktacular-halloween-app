package spooktacular.quests;

import java.util.*;

/** All mine quests, verbatim from MineQuestCatalog. Generated. */
public final class QuestCatalog {
    private QuestCatalog() {}
    public static List<Quest> all() {
        List<Quest> q = new ArrayList<>();
        q.add(new Quest("first-swing", "First Swing", "Every tycoon starts with a single crack in the rock.", "⛏️", new Trigger.BreakBlocks(1), 25, 10, "Tap any glowing ore to swing."));
        q.add(new Quest("warming-up", "Warming Up", "Ten blocks. The backpack barely notices.", "🧱", new Trigger.BreakBlocks(10), 60, 25, "Hold the ⛏️ button to mine without tapping."));
        q.add(new Quest("coal-blooded", "Coal-Blooded", "Coal is the forge's currency. Stockpile the black stuff.", "⬛", new Trigger.MineOre("Coal Ore", 5), 40, 30, "Coal glows faintly near the entrance tunnels."));
        q.add(new Quest("heavy-pockets", "Heavy Pockets", "Bank 25 ore units, then cash them in.", "🎒", new Trigger.MineOre("any", 25), 120, 60, "Watch the 🎒 meter — full means payday."));
        q.add(new Quest("first-payday", "First Payday", "Sell your first haul. Gold spends everywhere.", "💰", new Trigger.SellGold(200), 100, 50, "The surface cart by the entrance pays +25%."));
        q.add(new Quest("sharper-stick", "A Sharper Stick", "Forge the Stone Pick. Iron country awaits.", "🪨⛏️", new Trigger.ForgePicks(1), 80, 60, "Coal buys picks in the ⛏️ panel."));
        q.add(new Quest("iron-age", "Iron Age", "Drag 8 iron out of the dark.", "🟫", new Trigger.MineOre("Iron Ore", 8), 150, 90, "Iron needs Stone pick or better."));
        q.add(new Quest("cartographer", "Cartographer", "Map 3 of the 9 sectors. The mine grows as you roam.", "🗺️", new Trigger.MapSectors(3), 200, 100, "Walk into dark map — new sectors bloom content."));
        q.add(new Quest("snoop", "Snoop", "Pop open your first closet cache. Mind the cobwebs.", "🚪", new Trigger.OpenClosets(1), 120, 60, "Wooden 🚪 crates open by hand — no pick needed."));
        q.add(new Quest("deeper-feeling", "A Deeper Feeling", "Descend to the Stone Depths. The pay bump is real.", "🪨", new Trigger.ReachLayer("Stone Depths"), 180, 100, "Take the shaft down at x 6…10."));
        q.add(new Quest("gold-rush", "Gold Rush", "Six gold ore. Shiny, heavy, spendable.", "🟨", new Trigger.MineOre("Gold Ore", 6), 250, 140, "Gold likes the deep haulage walls."));
        q.add(new Quest("big-pack", "Big Pack Energy", "Buy your first backpack upgrade. Stay down longer.", "🎒", new Trigger.UpgradePacks(1), 150, 80, "Backpack Mk.2 holds 100 units."));
        q.add(new Quest("boom-tech", "Boom Tech", "Throw 3 bombs. Subtlety is for the surface.", "🧨", new Trigger.ThrowBombs(3), 200, 120, "Mine 20 blocks to earn each bomb."));
        q.add(new Quest("pest-control", "Pest Control", "Slay 5 mine monsters. They can't hurt you — return the favor.", "🕷️", new Trigger.SlayMonsters(5), 220, 140, "Tap monsters to whack them with your pick."));
        q.add(new Quest("deepstone-diver", "Deepstone Diver", "Reach Deepstone. Rewards double from here.", "⬛", new Trigger.ReachLayer("Deepstone"), 350, 200, "Below y −1 the rock fights back (+2 toughness)."));
        q.add(new Quest("redstone-racer", "Redstone Racer", "Five redstone. It practically hums.", "🟥", new Trigger.MineOre("Redstone Ore", 5), 300, 200, "Needs an Iron pick."));
        q.add(new Quest("boxy-friend", "Boxy Friend", "Greet your first boxy critter. It comes bearing gifts.", "📦", new Trigger.GreetCritters(1), 250, 150, "Walk up to hopping cubes — they gift gold and ore."));
        q.add(new Quest("egg-day", "Egg Day", "Hatch your first pet. Speed, luck, or gold — fate decides.", "🥚", new Trigger.HatchPets(1), 200, 150, "Eggs cost gold; the first three pets ride free."));
        q.add(new Quest("crystal-tourist", "Crystal Tourist", "Set foot in the Crystal Hollows. Triple pay, triple pretty.", "🔮", new Trigger.ReachLayer("Crystal Hollows"), 500, 300, "Around y −3 to −4.5, and inside the cave pockets."));
        q.add(new Quest("cave-raider", "Cave Raider", "Fully harvest a crystal cave for its completion bonus.", "⛏️", new Trigger.HarvestCaves(1), 450, 300, "Clear every growth: cubes, spikes and orbs."));
        q.add(new Quest("ruby-tuesday", "Ruby Tuesday", "Four rubies. Any day is ruby day down here.", "♦️", new Trigger.MineOre("Ruby Ore", 4), 600, 400, "Needs a Golden pick. Caverns help."));
        q.add(new Quest("closet-enthusiast", "Closet Enthusiast", "Open 8 caches. You know about the fakes and you open them anyway.", "🚪", new Trigger.OpenClosets(8), 500, 300, "New sectors restock closets near their forks."));
        q.add(new Quest("magma-walker", "Magma Walker", "Stand in the Magma Core. Five times the pay. Zero times the death.", "🔥", new Trigger.ReachLayer("Magma Core"), 900, 600, "Below y −4.5. The lava glows; you glow brighter."));
        q.add(new Quest("core-sample", "Core Sample", "Touch the Magma Core floor (y −4.5 or deeper). Bring back stories and soot.", "🕳️", new Trigger.ReachDepth(-4.5), 500, 350, "The shaft down at x 6…10 ends at the melt."));
        q.add(new Quest("diamond-hands", "Diamond Hands", "Hold six diamonds all the way to the sell cart.", "💎", new Trigger.MineOre("Diamond Ore", 6), 1000, 700, "Needs a Diamond pick. Deep walls, caverns, patience."));
        q.add(new Quest("pack-mule", "Pack Mule", "Triple-upgrade the backpack. Two hundred units of greed.", "🎒", new Trigger.UpgradePacks(3), 700, 400, "Costs scale quadratically — sell deep ores."));
        q.add(new Quest("opal-dreams", "Opal Dreams", "Three opals, the rarest shimmer in the mine.", "🔮", new Trigger.MineOre("Opal Ore", 3), 1200, 800, "Opals hide in the deepest walls."));
        q.add(new Quest("menagerie", "Menagerie", "Befriend 4 different boxy critters.", "📦", new Trigger.GreetCritters(4), 800, 500, "Five species roam; the Wisp pays best."));
        q.add(new Quest("whale-watch", "Whale Watch", "Sell 25,000🪙 lifetime. The cart groans under the weight.", "🐋", new Trigger.SellGold(25000), 2000, 1200, "Magma Core hauls + surface bonus = thousands per trip."));
        q.add(new Quest("second-life", "Second Life", "Rebirth. Rank 15, Magma-touched, ready to start richer.", "💫", new Trigger.Rebirth(1), 0, 500, "Each rebirth is +15% everything, forever."));
        q.add(new Quest("living-legend", "Living Legend", "Earn 50,000 XP lifetime. The mine carves your name in deepslate.", "👑", new Trigger.EarnXP(50000), 3000, 0, "Deep ores, quests, rebirths. Grind gloriously."));
        q.add(new Quest("cube-farmer", "Cube Farmer", "Fifteen square crystals. Geometry has never paid so well.", "🟪", new Trigger.MineOre("Cube Crystal", 15), 700, 450, "Cube grids carpet the floors of new frontier caves."));
        q.add(new Quest("spike-specialist", "Spike Specialist", "Ten triangle spikes, up and down. Watch the ceiling ones.", "🔺", new Trigger.MineOre("Spike Crystal", 10), 650, 420, "Spikes ring cave walls — check floor AND ceiling."));
        q.add(new Quest("orb-oracle", "Orb Oracle", "Eight floating orbs. They saw you coming. They always do.", "🔮", new Trigger.MineOre("Orb Crystal", 8), 800, 500, "Orbs hover mid-cave in glowing rings."));
        q.add(new Quest("timber-timber", "Timber! (Sorry)", "Clear 20 old support beams. Somebody had to hold the ceiling; now somebody has to clear it.", "🪵", new Trigger.MineOre("Timber", 20), 250, 200, "Beams flank every tunnel. They forgive you."));
        q.add(new Quest("sector-sweeper", "Sector Sweeper", "Map 6 sectors. Two-thirds of the known world, personally walked.", "🧹", new Trigger.MapSectors(6), 900, 550, "Each new sector blooms a fork, a cave and caches."));
        q.add(new Quest("sector-master", "Sector Master", "All 9 sectors mapped. You have walked everywhere there is.", "🌍", new Trigger.MapSectors(9), 1500, 900, "Corners hide the last sectors. Check the atlas."));
        q.add(new Quest("tool-collector", "Tool Collector", "Forge 3 pick upgrades. A wall of increasingly serious metal.", "🔨", new Trigger.ForgePicks(3), 600, 400, "Stone → Iron → Golden climbs fast on coal."));
        q.add(new Quest("drill-sergeant", "Drill Sergeant", "Forge all 6 upgrades up to the Void Drill. Maximum spin achieved.", "🌀⛏️", new Trigger.ForgePicks(6), 2000, 1200, "The drill costs 160 coal. Magma hauls fund it in trips."));
        q.add(new Quest("pack-mule-2", "Freight Train", "Upgrade the backpack 5 times. Three hundred units of pure greed.", "🚂", new Trigger.UpgradePacks(5), 1200, 700, "Deep magma hauls make quadratic costs feel linear."));
        q.add(new Quest("pet-trainer", "Pet Trainer", "Hatch 3 eggs. A small crew of cube-adjacent weirdos.", "🐾", new Trigger.HatchPets(3), 700, 450, "Only 3 ride at once — pick complementary boosts."));
        q.add(new Quest("pet-magnate", "Pet Magnate", "Hatch 6 eggs. You are now running a small furry economy.", "🎪", new Trigger.HatchPets(6), 1400, 800, "Eggs get pricier. Magma gold keeps pace."));
        q.add(new Quest("exterminator", "Exterminator", "Slay 25 mine monsters. The tunnels are officially bouncy-castle safe.", "⚔️", new Trigger.SlayMonsters(25), 900, 600, "Bombs soften packs; picks finish them."));
        q.add(new Quest("demolitionist", "Demolitionist", "Throw 15 bombs. The mine has great acoustics, you're just testing them.", "💥", new Trigger.ThrowBombs(15), 800, 500, "Every 20 blocks earns a bomb. Spend them loudly."));
        q.add(new Quest("gold-magnate", "Gold Magnate", "Sell 100,000🪙 lifetime. The cart needs new axles because of you.", "🏦", new Trigger.SellGold(100000), 5000, 2500, "Surface bonus + gold pets + rebirths compound hard."));
        q.add(new Quest("xp-titan", "XP Titan", "Earn 150,000 XP lifetime. Your pick has a fan club.", "🌟", new Trigger.EarnXP(150000), 6000, 0, "Deep crystals + quest cascades + rebirth loops."));
        q.add(new Quest("serial-rebirther", "Serial Rebirther", "Rebirth 3 times. Die never, restart eternally, profit always.", "💫", new Trigger.Rebirth(3), 0, 2000, "Three rebirths is +45% everything, forever."));
        q.add(new Quest("critter-congress", "Critter Congress", "Befriend 6 boxy critters. Quorum achieved. Motions: snacks.", "📦", new Trigger.GreetCritters(6), 1100, 700, "Five seeded species plus frontier wanderers."));
        q.add(new Quest("cave-cartographer-2", "Cave Magnate", "Fully harvest 5 crystal caves. The mine's glassware section fears you.", "🏺", new Trigger.HarvestCaves(5), 1300, 800, "Frontier sectors crack open fresh caves."));
        q.add(new Quest("closet-king", "Closet King", "Open 20 caches. You have seen every cobweb the mine owns.", "🚪", new Trigger.OpenClosets(20), 1000, 650, "Forks restock closets. Fakes still count."));
        q.add(new Quest("stone-cold", "Stone Cold", "Break 500 blocks. The tally wall needed a second wall because of you.", "🧱", new Trigger.BreakBlocks(500), 1500, 900, "Bombs count. Everything counts. Keep swinging."));
        q.add(new Quest("quarry-lord", "Quarry Lord", "Break 2,000 blocks. At this point you aren't mining the mine — you ARE the mine.", "🏗️", new Trigger.BreakBlocks(2000), 4000, 2500, "Drill + speed pets + magma walls = hundreds per trip."));
        q.add(new Quest("coal-baron", "Coal Baron", "Bank 100 coal. The forge master smiles with teeth. Frame the moment.", "⬛", new Trigger.MineOre("Coal Ore", 100), 1200, 800, "Coal is never sold — it piles up while you chase gold."));
        q.add(new Quest("timber-mill", "Timber Mill", "Clear 50 support beams. The ceiling holds itself now. Probably. Say thanks anyway.", "🪚", new Trigger.MineOre("Timber", 50), 800, 500, "Beams flank every tunnel and fork arch."));
        q.add(new Quest("lapis-librarian", "Lapis Librarian", "Catalog 15 lapis. Still no wizards. You are the wizard now.", "📘", new Trigger.MineOre("Lapis Ore", 15), 900, 600, "Stone pick or better, stone layer and below."));
        q.add(new Quest("gold-vault", "Gold Vault", "Sell 500,000🪙 lifetime. They renamed the cart after you (pending paperwork).", "🏦", new Trigger.SellGold(500000), 12000, 6000, "Rebirth multipliers make the second 250k faster than the first."));
        q.add(new Quest("xp-mythic", "XP Mythic", "Earn 500,000 XP lifetime. Your pick has a fan club with chapters.", "🌠", new Trigger.EarnXP(500000), 15000, 0, "Deep crystals, quest cascades, serial rebirths."));
        q.add(new Quest("rebirth-5", "Eternal Return", "Rebirth 5 times. +75% everything. The mine pretends not to know you. The ore says otherwise.", "♾️", new Trigger.Rebirth(5), 0, 5000, "Each cycle funds the next. Compound interest, but pickaxes."));
        q.add(new Quest("full-house", "Full House", "Befriend all 5 seeded species. The congress photo goes on the chapel wall.", "🏠", new Trigger.GreetCritters(5), 1000, 650, "Mole, Bat, Axolotl, Fox, Wisp — check the bestiary… er, codex."));
        q.add(new Quest("bomb-brigade", "Bomb Brigade", "Throw 50 bombs. The demolition club elects you president for life.", "💣", new Trigger.ThrowBombs(50), 2000, 1200, "Twenty blocks per bomb. Magma walls are dense — farm blasts there."));
        q.add(new Quest("slay-centurion", "Slay Centurion", "Slay 100 mine monsters. The tunnels are now a bouncy castle with ore flooring.", "💯", new Trigger.SlayMonsters(100), 2500, 1500, "Drill damage carries to whacks. Bombs soften packs first."));
        q.add(new Quest("seal-breaker", "Seal Breaker", "Redeem minerals to open your first sealed cave. The seal counts your minerals. Bring minerals.", "🔓", new Trigger.UnlockCaves(1), 400, 250, "Sealed caves shimmer gray. Costs live in the 🔒 Caves panel."));
        q.add(new Quest("master-key", "Master Key", "Break 5 cave seals. Doors open when you walk past now, out of respect.", "🗝️", new Trigger.UnlockCaves(5), 1200, 800, "Every third pocket is sealed; frontier sectors seal two in five."));
        q.add(new Quest("frostbitten", "Frostbitten", "Mine 8 Frost Ore. Cold to the touch, warm to the wallet.", "❄️", new Trigger.MineOre("Frost Ore", 8), 350, 220, "Frost pockets ring both levels — look for the chill."));
        q.add(new Quest("glacier-glass", "Glacier Glass", "Mine 5 Glacier Crystals. Windows for giants, paychecks for you.", "🧊", new Trigger.MineOre("Glacier Crystal", 5), 550, 350, "Needs an Iron pick. Frost walls glitter blue-white."));
        q.add(new Quest("snow-day", "Snow Day", "Clear 20 Snowstone. Somebody has to shovel the mine.", "⛏️", new Trigger.MineOre("Snowstone", 20), 200, 150, "One tap each — the fastest quest in the book."));
        q.add(new Quest("permafrost-pro", "Permafrost Pro", "Mine 20 Frost Ore. You don't feel the cold anymore. The cold feels you.", "❄️", new Trigger.MineOre("Frost Ore", 20), 700, 450, "Five pockets plus patience. Check the map."));
        q.add(new Quest("ice-palace", "Ice Palace", "Mine 12 Glacier Crystals. Royalty mines here. You ARE royalty now.", "🏰", new Trigger.MineOre("Glacier Crystal", 12), 1100, 700, "Clear whole pockets for the harvest bonus."));
        q.add(new Quest("deep-freeze", "Deep Freeze", "Clear 50 Snowstone. The mine's sidewalks have never been safer.", "🌨️", new Trigger.MineOre("Snowstone", 50), 500, 300, "Frost walls crumble fast — bring a big backpack."));
        return q;
    }
}