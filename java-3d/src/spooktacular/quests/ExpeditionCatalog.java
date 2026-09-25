package spooktacular.quests;

import java.util.*;

/** All maze expeditions, verbatim from MazeExpeditionCatalog. Generated. */
public final class ExpeditionCatalog {
    private ExpeditionCatalog() {}
    public static List<Expedition> all() {
        List<Expedition> q = new ArrayList<>();
        q.add(new Expedition("first-cache", "First Cache", "Every expedition starts with a single creaking door.", "🚪", 1, "closets", 150, 60, "Closet crates glow faintly orange. Tap to open."));
        q.add(new Expedition("fork-scout", "Fork Scout", "Stand at 3 fresh forkroads. The mine keeps branching — keep up.", "🔱", 3, "forks", 250, 100, "New chunks stamp Y-forks, T-junctions, crosses and chambers."));
        q.add(new Expedition("boxy-hello", "Boxy Hello", "Witness 2 rare boxy encounters. Do not spook them. They spook easily. They are cubes.", "📦", 2, "friends", 400, 150, "Roam far tunnels; the ticker fires ~0.5% per tick."));
        q.add(new Expedition("crystal-cutter", "Crystal Cutter", "Mine 12 cave crystals. Cubes, spikes, orbs — all pay.", "🔮", 12, "crystals", 350, 140, "Caves ping the log when they crack open nearby."));
        q.add(new Expedition("cave-comber", "Cave Comber", "Fully harvest 2 crystal caves for their completion glow.", "⛏️", 2, "caves", 600, 250, "Clear every growth in the ring to trigger the bonus."));
        q.add(new Expedition("cartographer-2", "Maze Cartographer", "Map 4 of the 8 regions. Big maze. Bigger legend.", "🗺️", 4, "regions", 700, 300, "Push past z ±120 — the far bands hide the best loot."));
        q.add(new Expedition("marathon", "Tunnel Marathon", "Bank 500 meters of travel. Sprinting counts double-ish. (It counts the same. Run anyway.)", "🏃", 500, "meters", 450, 200, "Sprint toggle is in the hotbar. Hydrate."));
        q.add(new Expedition("treasure-goblin", "Treasure Goblin", "Pocket 6 treasures. Shiny things go in the pack, no questions asked.", "💎", 6, "treasures", 550, 260, "Treasure rooms glow at 0.5 light. Follow the shimmer."));
        q.add(new Expedition("monster-bouncer", "Monster Bouncer", "Defeat 10 monsters. The maze has a strict no-haunting policy, enforced by you.", "⚔️", 10, "monsters", 500, 220, "Bosses pay 10×. Bring your meanest spell."));
        q.add(new Expedition("high-roller", "High Roller", "Earn 5,000 score lifetime. Style points are real points here.", "🎰", 5000, "points", 1000, 500, "Combos over 10× pay bonus points. Chain captures."));
        q.add(new Expedition("grand-tour", "Grand Tour", "Map all 8 regions. See every band from Northgate to the Far Reaches.", "🌍", 8, "regions", 1500, 700, "Check the atlas for the band you keep missing."));
        q.add(new Expedition("living-myth", "Living Myth", "Earn 25,000 score lifetime. The tunnels will whisper your name. (That's the wind. Probably.)", "👑", 25000, "points", 3000, 1200, "Shiny bosses + combos + expeditions stack fast."));
        q.add(new Expedition("fork-frenzy", "Fork Frenzy", "Trigger 12 frontier forks. You don't explore the maze so much as unfold it.", "🔱", 12, "forks", 800, 350, "Every fresh 24-unit chunk stamps a new junction."));
        q.add(new Expedition("closet-crawl", "Closet Crawl", "Open 12 caches. At this point the cobwebs know your name too.", "🚪", 12, "closets", 700, 300, "Frontier chunks restock closets near their forks."));
        q.add(new Expedition("wisp-whisperer", "Wisp Whisperer", "Witness 6 boxy encounters. You are now officially the cube person.", "✨", 6, "friends", 900, 400, "Far Reaches bands hold the best encounter odds."));
        q.add(new Expedition("ultra-marathon", "Ultra Marathon", "Bank 2,000 meters. Your boots file a formal complaint. The maze files a compliment.", "🥾", 2000, "meters", 1000, 450, "Sprint the Far Reaches spine end to end."));
        q.add(new Expedition("treasure-tycoon", "Treasure Tycoon", "Pocket 15 treasures. Your inventory clinks when you walk. People notice.", "🤑", 15, "treasures", 900, 420, "Gilded Warrens and roundabout chambers pay best."));
        q.add(new Expedition("extermination", "Extermination", "Defeat 30 monsters. The maze's monster union requests a meeting. Decline.", "💀", 30, "monsters", 850, 380, "Boss rooms respawn pressure — farm the warm band."));
        q.add(new Expedition("crystal-magnate", "Crystal Magnate", "Mine 50 cave crystals. You don't cut gems; you harvest them like wheat.", "💠", 50, "crystals", 950, 430, "Howling Deeps caves grow thickest. Clear whole rings."));
        q.add(new Expedition("score-legend", "Score Legend", "Earn 100,000 score lifetime. There is no higher number. (There is. It's your next run.)", "🌟", 100000, "points", 5000, 2000, "Legendary shinies + max combos + claimed expeditions."));
        q.add(new Expedition("closet-magnate", "Closet Magnate", "Open 25 caches. You own a controlling share in doors.", "🚪", 25, "closets", 1200, 550, "Every frontier chunk restocks. Never pass a 🚪."));
        q.add(new Expedition("fork-lord", "Fork Lord", "Trigger 25 frontier forks. The maze unfolds at your command.", "🔱", 25, "forks", 1300, 600, "Sprint fresh chunks — each stamps exactly one fork."));
        q.add(new Expedition("cube-royalty", "Cube Royalty", "Witness 12 boxy encounters. The cubes hold court, and you are invited.", "👑", 12, "friends", 1400, 650, "Bond early: high-level pals gift gems that fund everything."));
        q.add(new Expedition("gem-emperor", "Gem Emperor", "Mine 100 cave crystals. The caves file a noise complaint. Frame it.", "💠", 100, "crystals", 1500, 700, "Orb rings pay densest per swing. Howling Deeps first."));
        q.add(new Expedition("spelunker", "Master Spelunker", "Fully harvest 6 crystal caves. The Hollows know your name and your pick.", "🏺", 6, "caves", 1600, 750, "Track caves in the journal — finish rings before wandering off."));
        q.add(new Expedition("dragon-hoard", "Dragon Hoard", "Pocket 30 treasures. Your inventory now has its own gravity.", "🐉", 30, "treasures", 1700, 800, "Boss chambers + Gilded Warrens. Greed is a compass."));
        q.add(new Expedition("bounty-board", "Bounty Board", "Defeat 60 monsters. The union meeting is cancelled. Permanently.", "📌", 60, "monsters", 1800, 850, "Warm-band loops: dense spawns, short walks."));
        q.add(new Expedition("pathfinder", "Pathfinder", "Bank 5,000 meters. Your boots achieve sentience and keep going without you.", "🥾", 5000, "meters", 1900, 900, "Sprint the full spine Northgate to Far Reaches, twice."));
        q.add(new Expedition("mythic-score", "Mythic Score", "Earn 250,000 score lifetime. Numbers this big need their own weather system.", "🌠", 250000, "points", 10000, 4000, "Everything compounded: bonds, combos, shinies, claims."));
        q.add(new Expedition("first-blood", "First Blood", "Defeat your first monster. The maze has a strict no-haunting policy, and you are the policy.", "🩸", 1, "monsters", 100, 40, "Any monster counts. Bare hands work in a pinch."));
        q.add(new Expedition("pocket-change", "Pocket Change", "Find your first treasure. Shiny things go in the pack, no questions asked — this is the entire economy.", "🪙", 1, "treasures", 120, 50, "Treasure rooms shimmer. Follow the shimmer."));
        q.add(new Expedition("baby-steps", "Baby Steps", "Bank 100 meters. Every legend starts with a single staircase joke. Make it.", "👣", 100, "meters", 120, 50, "A stroll to the first fork covers it."));
        q.add(new Expedition("cube-curious", "Cube Curious", "Witness your first boxy encounter. Do not spook it. It spooks easily. It is a cube.", "❓", 1, "friends", 200, 80, "Roam far tunnels and listen for squeaks."));
        q.add(new Expedition("home-turf", "Home Turf", "Map your first region beyond the Heart. The maze gets bigger the moment you look at it.", "🏠", 2, "regions", 220, 90, "Push 40 units north or south of center."));
        q.add(new Expedition("thousand-club", "Thousand Club", "Earn 1,000 score lifetime. Four digits. The tunnels take notice.", "💯", 1000, "points", 300, 140, "Combos and closets stack fast early."));
        q.add(new Expedition("cave-scout", "Cave Scout", "Mine 3 cave crystals. Cubes, spikes or orbs — the cave doesn't judge, and neither do we.", "⛏️", 3, "crystals", 200, 80, "Caves ping the log when they crack open."));
        q.add(new Expedition("fork-fan", "Fork Fan", "Trigger your first frontier fork. You don't explore the maze so much as unfold it.", "🍴", 1, "forks", 150, 60, "Walk into a fresh 24-unit chunk."));
        q.add(new Expedition("treasure-chest-10", "Chest Ache", "Pocket 10 treasures. Your inventory clinks. People notice. People are jealous.", "🧰", 10, "treasures", 750, 340, "Roundabout chambers hide the densest caches."));
        q.add(new Expedition("marathon-plus", "Marathon Plus", "Bank 1,000 meters. Your boots file a second complaint. Denied again.", "🥾", 1000, "meters", 700, 320, "The full spine Northgate to Far Reaches, one way."));
        q.add(new Expedition("boss-hunter", "Boss Hunter", "Take down 3 bosses. Ten times the points, zero times the mercy. (Yours.)", "👑", 3, "monsters", 1200, 600, "Boss rooms glow. Save cooldowns for the tantrum phase."));
        return q;
    }
}