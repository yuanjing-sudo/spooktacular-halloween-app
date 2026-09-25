package spooktacular.data;

import java.util.*;

/** Ore codex, verbatim. Generated. */
public final class OreCodex {
    private OreCodex() {}
    public record Ore(String name, String emoji, String pick, String depth, int value, String flavor) {}
    public static List<Ore> all() {
        List<Ore> q = new ArrayList<>();
        q.add(new Ore("Coal Ore", "⬛", "Wooden+", "Everywhere", 2, "The forge's bread and butter. Burns black, spends gold. New picks are priced in this stuff, so never sell the whole stash."));
        q.add(new Ore("Iron Ore", "🟫", "Stone+", "Dirt → Stone", 4, "Honest metal for honest miners. The backbone of every mid-game backpack — common enough to trust, rich enough to matter."));
        q.add(new Ore("Gold Ore", "🟨", "Stone+", "Stone → Deep", 10, "Heavy, soft, and universally loved. Deep haulage walls sweat this stuff. Sell high, hatch eggs, feel rich."));
        q.add(new Ore("Lapis Ore", "🟦", "Stone+", "Stone → Deep", 8, "Blue as a midnight promise. Wizards pay extra, or so the sign at the forge claims. Nobody has met the wizards."));
        q.add(new Ore("Redstone Ore", "🟥", "Iron+", "Deepstone", 6, "It hums when you walk past. Engineers swear it hums in tune. It does not hum in tune, but it sells in bulk."));
        q.add(new Ore("Emerald Ore", "🟩", "Iron+", "Deepstone", 20, "Green lightning trapped in rock. One emerald haul funds a whole backpack tier. Guard it with your life — kidding, you're immortal."));
        q.add(new Ore("Ruby Ore", "♦️", "Golden+", "Crystal → Magma", 30, "The cavern's heartbeat. Rubies cluster where the walls glitter — if the walls glitter, swing there."));
        q.add(new Ore("Diamond Ore", "💎", "Diamond", "Deep → Magma", 25, "Classic for a reason. Hard to crack, harder to stop mining once you start. Funds drills. Dreams. Everything."));
        q.add(new Ore("Opal Ore", "🔮", "Diamond", "Magma fringe", 40, "The rarest shimmer in the mine. Opals only show at the ragged edge of the melt. Bring your best pick and low expectations for sleep."));
        q.add(new Ore("Cube Crystal", "🟪", "Stone+", "Crystal caves", 14, "Square-mile manners: these grow in tidy grids on cave floors. Shatter the whole cave for a harvest bonus."));
        q.add(new Ore("Spike Crystal", "🔺", "Stone+", "Crystal caves", 18, "Triangle trouble — stalactites above, stalagmites below. Mind your head in the figurative sense; nothing here can hurt you."));
        q.add(new Ore("Orb Crystal", "🔮", "Iron+", "Crystal caves", 26, "Perfect spheres that hum at exactly the wrong frequency. Float mid-cave in glowing rings. Worth every swing."));
        q.add(new Ore("Stone", "🪨", "Any", "Everywhere", 0, "Filler with ambition. Worth nothing, blocks everything, teaches patience. Every tycoon empire is built on ignored stone."));
        q.add(new Ore("Deepslate", "⬛", "Any", "Deepstone", 0, "Stone that went to finishing school. Darker, denser, faintly judgmental. Still worth zero coins."));
        q.add(new Ore("Dirt", "🟫", "Any", "Upper tunnels", 0, "One tap and it's gone. Dirt is less an ore and more a suggestion that rock used to be here."));
        q.add(new Ore("Gravel", "⬜", "Any", "Upper tunnels", 0, "Crunchy. Gravel exists to make the good ores feel special by comparison. Thank it for its service."));
        q.add(new Ore("Timber", "🪵", "Any", "Tunnel flanks", 1, "Old support beams from miners past. They held the ceiling for a century; now they hold 1 gold of value. Respect."));
        q.add(new Ore("Planks", "🪵", "Any", "Tunnel flanks", 1, "Somebody's floorboards, once. Now your pocket change. The mine recycles everything, including architecture."));
        q.add(new Ore("Closet Crate", "🚪", "By hand", "Near forks", 5, "Not ore at all — a cupboard. Opens by hand: snacks, tools, treasure… or cobwebs. The cobwebs are also treasure, emotionally."));
        q.add(new Ore("Frost Ore", "❄️", "Stone+", "Frost pockets", 12, "Winter hiding in the rock. Cold to the touch, warm to the wallet. Five pockets across both levels."));
        q.add(new Ore("Glacier Crystal", "🧊", "Iron+", "Frost pockets", 22, "Windows for giants. Sings bass in the cave choir. Clear whole pockets for the harvest bonus."));
        q.add(new Ore("Snowstone", "⬜", "Any", "Frost pockets", 1, "One tap and it's slush. The fastest quest progress in the book — shovel first, ask never."));
        q.add(new Ore("Lava", "🔥", "Unbreakable", "Magma Core", 0, "Molten nope. Unbreakable, undrinkable, but great lighting. It warms you (warning only — god-mode means never harm)."));
        q.add(new Ore("Bedrock", "⬛", "Unbreakable", "World edge", 0, "The mine's way of saying 'this far, no further.' Exists at the borders so the void doesn't have to."));
        return q;
    }
}