package spooktacular.quests;

import spooktacular.systems.GameStore;

import java.util.*;
import java.util.function.BiConsumer;

/** Achievement board — logic port of MineAchievementBoard. */
public class AchievementBoard {
    private final Set<String> unlocked = new HashSet<>();
    private final Set<String> claimed = new HashSet<>();
    public BiConsumer<Integer, Integer> onReward;
    private final GameStore store;

    public AchievementBoard() { this(GameStore.standard); }
    public AchievementBoard(GameStore store) {
        this.store = store;
        unlocked.addAll(store.stringArray("mineAchUnlocked.v1"));
        claimed.addAll(store.stringArray("mineAchClaimed.v1"));
    }

    /** Poll live state; returns newly unlocked achievements this pass. */
    public List<Achievement> refresh(Snapshot snapshot) {
        List<Achievement> fresh = new ArrayList<>();
        for (Achievement ach : AchievementCatalog.all()) {
            if (unlocked.contains(ach.id())) continue;
            boolean ok;
            try { ok = ach.check().test(snapshot); }
            catch (Exception e) { ok = false; }
            if (ok) {
                unlocked.add(ach.id());
                fresh.add(ach);
            }
        }
        if (!fresh.isEmpty()) save();
        return fresh;
    }

    public boolean claim(Achievement ach) {
        if (!unlocked.contains(ach.id()) || claimed.contains(ach.id())) return false;
        claimed.add(ach.id());
        if (onReward != null) onReward.accept(ach.rewardGold(), ach.rewardXP());
        save();
        return true;
    }

    public int[] progressOf(Achievement ach, Snapshot s) {
        try { return ach.progress().apply(s); }
        catch (Exception e) { return new int[]{0, 0}; }
    }

    public boolean isUnlocked(String id) { return unlocked.contains(id); }
    public boolean isClaimed(String id) { return claimed.contains(id); }

    private void save() {
        store.setStrings("mineAchUnlocked.v1", unlocked);
        store.setStrings("mineAchClaimed.v1", claimed);
    }

    public void resetAll() {
        unlocked.clear();
        claimed.clear();
        save();
    }
}
