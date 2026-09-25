package spooktacular.quests;

/** Quest definition — mirrors MineQuest. */
public record Quest(String id, String title, String detail, String icon,
                    Trigger trigger, int rewardGold, int rewardXP, String tip) {}
