package spooktacular.quests;

import java.util.function.Function;
import java.util.function.Predicate;

/** Achievement definition — mirrors MineAchievement (check/progress lambdas). */
public record Achievement(String id, String house, String title, String detail,
                          String icon, int rewardGold, int rewardXP,
                          Predicate<Snapshot> check, Function<Snapshot, int[]> progress) {}
