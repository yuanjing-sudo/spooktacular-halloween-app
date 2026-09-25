package spooktacular.systems;

import spooktacular.data.Data;
import spooktacular.engine.Engine;

import java.util.*;

/** Fishing kit — rod tiers verbatim from MNRodTier, water tables from
 *  MineFishing, weighted catches, bite-window checks. */
public final class Fishing {
    private Fishing() {}

    public record Rod(String name, String emoji, int cost, double window, String flavor) {}

    public static List<Rod> rods() {
        return List.of(
            new Rod("Stick + String", "🎣", 0, 0.22, "A classic. Catches minnows and disappointment."),
            new Rod("Copper Rig", "🎣", 400, 0.3, "Proper reel. Rare fish start believing in you."),
            new Rod("Magma-Proof Rod", "🎣", 1500, 0.38, "Unlocks lava fishing. Does not melt. Mostly."),
            new Rod("Warden's Rod", "🎣", 4000, 0.48, "The lake respects this rod. Legendaries surface for it."));
    }

    /** Fish available in a water, verbatim catalog rows. */
    public static List<Data.Fish> forWater(String water) {
        Set<String> fresh = Set.of("Cave Minnow", "Lantern Guppy", "Blind Barb", "Moss Carp",
                "Echo Trout", "Mirror Koi", "Axolotl Pal", "Golden Walleye");
        List<Data.Fish> out = new ArrayList<>();
        for (Data.Fish f : Data.FISH) {
            boolean isFresh = fresh.contains(f.name());
            if (water.equals("Magma") == !isFresh) out.add(f);
        }
        return out;
    }

    private static final Map<String, Integer> WEIGHTS = Map.of(
            "Common", 60, "Rare", 28, "Epic", 10, "Legendary", 2);

    /** Weighted catch from a water. Magma water needs rod index >= 2. */
    public static Data.Fish cast(String water, int rodIdx, Engine.RNG rng) {
        if (water.equals("Magma") && rodIdx < 2) water = "Fresh";
        List<Data.Fish> pool = forWater(water);
        List<Data.Fish> bag = new ArrayList<>();
        for (Data.Fish f : pool)
            for (int i = 0; i < WEIGHTS.getOrDefault(f.rarity(), 1); i++) bag.add(f);
        return bag.get(rng.nextInt(bag.size()));
    }

    /** Water table for a fish name (verbatim catalog mapping). */
    public static String waterOf(String name) {
        return forWater("Magma").stream().anyMatch(f -> f.name().equals(name)) ? "Magma" : "Fresh";
    }

    /** Rarity for a fish name (verbatim catalog mapping). */
    public static String rarityOf(String name) {
        return java.util.Arrays.stream(Data.FISH).filter(f -> f.name().equals(name))
                .map(Data.Fish::rarity).findFirst().orElse("Common");
    }

    /** Bite-timing check: strike position 0..1 hits inside the rod window. */
    public static boolean strike(double at, Rod rod) {
        double half = rod.window() / 2;
        return at >= 0.5 - half && at <= 0.5 + half;
    }
}
