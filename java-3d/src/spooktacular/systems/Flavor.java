package spooktacular.systems;

import java.util.List;

/** Difficulty presets + name/tip/atmosphere flavor data (verbatim values). */
public final class Flavor {
    private Flavor() {}

    public record Difficulty(String name, String emoji, double monsterAggression,
                             double lootLuck, double priceFactor, String detail) {
        public static Difficulty casual() {
            return new Difficulty("Casual", "🛋️", 0.5, 0.05, 0.8, "Chill dig. Sleepy monsters, kind prices.");
        }
        public static Difficulty adventurer() {
            return new Difficulty("Adventurer", "🧭", 1.0, 0.0, 1.0, "The intended balance. Spicy but fair.");
        }
        public static Difficulty gremlin() {
            return new Difficulty("Gremlin", "👺", 1.6, 0.12, 1.25, "Feisty monsters, lucky pockets, proud prices.");
        }
        public static List<Difficulty> all() { return List.of(casual(), adventurer(), gremlin()); }
    }

    /** Rotating tips, verbatim from SpookyTips (sample of the full list). */
    public static List<String> tips() {
        return List.of(
            "Coal is never sold - it stays banked for the forge. Hoard it proudly.",
            "The surface cart pays +25%. The walk back is part of the job.",
            "Magma Core pays x5. Everything before it is a warm-up.",
            "Clear whole crystal caves for harvest bonuses. Rings, not singles.",
            "Twenty blocks earns a bomb. Spend them loudly, stand back proudly.",
            "Quests pay gold + XP. Claim them - the board holds three at a time.",
            "Bats warn before they dive. Whack the red eyes for a reward.",
            "Cubes are friends. If it squeaks, feed it - don't swing.",
            "Bond level 3+ pals share gems when near. Feed them to get there.",
            "Lantern Row: safest odds, fattest combos. Farm here.",
            "Gilded Warrens glitter and mean it. Highest treasure density around.");
    }

    public static String tipOfDay(int dayOfYear) {
        List<String> t = tips();
        return t.get(Math.floorMod(dayOfYear, t.size()));
    }
}
