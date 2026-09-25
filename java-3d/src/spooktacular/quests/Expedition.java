package spooktacular.quests;

/** Expedition definition + kind — mirrors MazeExpedition / MazeExpeditionKind. */
public record Expedition(String id, String title, String detail, String icon,
                         int target, String unit, int rewardScore, int rewardGold, String tip) {
    public enum Kind { closets, caves, boxy, forks, regions, distance, treasure, monsters, crystals, score }
}
