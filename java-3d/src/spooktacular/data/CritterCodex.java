package spooktacular.data;

import java.util.*;

/** Critter codex, verbatim. Generated. */
public final class CritterCodex {
    private CritterCodex() {}
    public record Critter(String species, String emoji, String gift, String flavor) {}
    public static List<Critter> all() {
        List<Critter> q = new ArrayList<>();
        q.add(new Critter("Mole", "📦", "Gold + Iron Ore", "A cube that digs. It has strong opinions about soil compaction and shares them at length, in squeaks."));
        q.add(new Critter("Bat", "📦", "Gold + Gold Ore", "Flies in squares because circles are for show-offs. Navigates by echo and vibes. Mostly vibes."));
        q.add(new Critter("Axolotl", "📦", "Gold + Emerald Ore", "An amphibian box that never grew up and never will. Regrows lost corners. An inspiration to us all."));
        q.add(new Critter("Fox", "📦", "Gold + Diamond Ore", "Sly, cubical, and faster than your swing. Leaves gifts to apologize for being untouchably cool."));
        q.add(new Critter("Wisp", "✨", "Big gold + rare ore", "Not technically an animal. Not technically anything. A glowing rumor that pays 20–40 gold per visit. Believe."));
        return q;
    }
}