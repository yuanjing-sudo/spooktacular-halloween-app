package spooktacular.data;

import java.util.*;

/** Portable mine entities (SceneKit vectors/colors dropped; stats kept). */
public final class Entities {
    private Entities() {}

    public record BoxyCritter(String species, String emoji, boolean greeted) {}
    public record CrystalCave(boolean harvested, boolean isLocked, Map<String, Integer> unlockCost) {
        public CrystalCave(boolean harvested, boolean isLocked) { this(harvested, isLocked, new HashMap<>()); }
    }
    public record ClosetCache(boolean isOpened) {}
    public record FrostPocket(boolean harvested) {}
    public record Pet(String species, String emoji, String rarity,
                      String boostKind, double boostValue, boolean equipped) {}

    public static class MNPlayer {
        public int health = 6, maxHealth = 6;
        public int experience, level = 1, gold;
        public Map<String, Integer> ores = new HashMap<>();
        public int blocksMined, batsRepelled, monstersSlain;
        public int pickTier;
        public int backpackCapacity = 50, backpackTier;
        public int sellValue;
        public List<Pet> pets = new ArrayList<>();
        public int rebirths;
        public double deepestY = 99;
        public Set<String> sectorsFound = new HashSet<>();

        public int backpackUsed() { return ores.values().stream().mapToInt(i -> i).sum(); }
        public boolean backpackFull() { return backpackUsed() >= backpackCapacity; }
    }

    /** Pet hatching table from MNPet.hatch (rarity odds verbatim). */
    public static Pet hatch(int number, int roll1to100, int pick) {
        String[][] species = {{"Mole", "🦔"}, {"Bat", "🦇"}, {"Axolotl", "🦎"},
                {"Fox", "🦊"}, {"Wisp", "💨"}, {"Dragon", "🐉"}};
        String rarity;
        double value;
        if (roll1to100 <= 2) { rarity = "Legendary"; value = 1.0; }
        else if (roll1to100 <= 10) { rarity = "Epic"; value = 0.5; }
        else if (roll1to100 <= 30) { rarity = "Rare"; value = 0.25; }
        else { rarity = "Common"; value = 0.1; }
        String[] kinds = {"Speed", "Luck", "Gold"};
        String[] sp = species[pick % species.length];
        return new Pet(sp[0], sp[1], rarity, kinds[(number + roll1to100) % kinds.length], value, false);
    }
}
