package spooktacular.data;

/** Block/ore stats from MNBlockType (verbatim values). Generated. */
public enum Block {
    stone("Stone", "🪨", 0, 2f, 0, 1, false, false),
    deepslate("Deepslate", "🪨", 0, 2f, 0, 1, false, false),
    dirt("Dirt", "🪨", 0, 1f, 0, 0, false, false),
    gravel("Gravel", "🪨", 0, 1f, 0, 0, false, false),
    coalOre("Coal Ore", "⬛", 0, 3f, 2, 4, true, false),
    ironOre("Iron Ore", "🟫", 1, 3f, 4, 6, true, false),
    goldOre("Gold Ore", "🟨", 1, 4f, 10, 12, true, false),
    lapisOre("Lapis Ore", "🟦", 1, 3f, 8, 10, true, false),
    redstoneOre("Redstone Ore", "🟥", 2, 4f, 6, 8, true, false),
    emeraldOre("Emerald Ore", "🟩", 2, 5f, 20, 24, true, false),
    rubyOre("Ruby Ore", "♦️", 3, 5f, 30, 36, true, false),
    diamondOre("Diamond Ore", "💎", 4, 6f, 25, 30, true, false),
    opalOre("Opal Ore", "🔮", 4, 6f, 40, 50, true, false),
    woodBeam("Timber", "🪵", 0, 2f, 1, 0, false, false),
    planks("Planks", "🪵", 0, 2f, 1, 0, false, false),
    lava("Lava", "🔥", 0, Float.MAX_VALUE, 0, 0, false, true),
    bedrock("Bedrock", "🪨", 0, Float.MAX_VALUE, 0, 0, false, true),
    crystalCube("Cube Crystal", "🟪", 1, 3f, 14, 16, false, false),
    crystalSpike("Spike Crystal", "🔺", 1, 4f, 18, 22, false, false),
    crystalOrb("Orb Crystal", "🔮", 2, 5f, 26, 32, false, false),
    closetCrate("Closet Crate", "🚪", 0, 1f, 5, 8, false, false),
    frostOre("Frost Ore", "❄️", 1, 3f, 12, 14, false, false),
    glacierCrystal("Glacier Crystal", "🧊", 2, 5f, 22, 26, false, false),
    snowstone("Snowstone", "⬜", 0, 1f, 1, 1, false, false);

    public final String displayName, emoji;
    public final int minTier;
    public final float toughness;
    public final int gold, xp;
    public final boolean ore, unbreakable;
    Block(String displayName, String emoji, int minTier, float toughness, int gold, int xp, boolean ore, boolean unbreakable) {
        this.displayName = displayName; this.emoji = emoji; this.minTier = minTier;
        this.toughness = toughness; this.gold = gold; this.xp = xp;
        this.ore = ore; this.unbreakable = unbreakable;
    }
}