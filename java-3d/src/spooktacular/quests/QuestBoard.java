package spooktacular.quests;

import spooktacular.systems.GameStore;

import java.util.*;
import java.util.function.BiConsumer;

/** Quest board engine — logic port of MineQuestBoard (record/advance/claim,
 *  lifetime totals, persistence keys identical). */
public class QuestBoard {
    private final Map<String, Integer> progress = new HashMap<>();
    private final Set<String> completed = new HashSet<>();
    private final Set<String> claimed = new HashSet<>();
    private int lifetimeSold, lifetimeXP;
    public BiConsumer<Integer, Integer> onReward;
    public final int activeLimit = 3;
    private final GameStore store;

    public QuestBoard() { this(GameStore.standard); }
    public QuestBoard(GameStore store) { this.store = store; load(); }

    public List<Quest> active() {
        List<Quest> open = new ArrayList<>();
        for (Quest q : QuestCatalog.all()) if (!completed.contains(q.id())) open.add(q);
        return open.subList(0, Math.min(activeLimit, open.size()));
    }

    public List<Quest> claimable() {
        List<Quest> out = new ArrayList<>();
        for (Quest q : active()) if (isDone(q) && !claimed.contains(q.id())) out.add(q);
        return out;
    }

    public int doneCount() { return completed.size(); }
    public int totalCount() { return QuestCatalog.all().size(); }
    public int progressOf(Quest q) { return progress.getOrDefault(q.id(), 0); }

    public int targetOf(Quest q) {
        Trigger t = q.trigger();
        if (t instanceof Trigger.BreakBlocks b) return b.n();
        if (t instanceof Trigger.MineOre m) return m.n();
        if (t instanceof Trigger.SellGold s) return s.n();
        if (t instanceof Trigger.EarnXP e) return e.n();
        if (t instanceof Trigger.ReachLayer) return 1;
        if (t instanceof Trigger.MapSectors m) return m.n();
        if (t instanceof Trigger.OpenClosets o) return o.n();
        if (t instanceof Trigger.HarvestCaves h) return h.n();
        if (t instanceof Trigger.UnlockCaves u) return u.n();
        if (t instanceof Trigger.HatchPets h) return h.n();
        if (t instanceof Trigger.ForgePicks f) return f.n();
        if (t instanceof Trigger.UpgradePacks u) return u.n();
        if (t instanceof Trigger.Rebirth r) return r.n();
        if (t instanceof Trigger.GreetCritters g) return g.n();
        if (t instanceof Trigger.SlayMonsters s) return s.n();
        if (t instanceof Trigger.ThrowBombs b) return b.n();
        return 1; // ReachDepth
    }

    public double fractionOf(Quest q) {
        int t = targetOf(q);
        return t <= 0 ? 1 : Math.min(1, (double) progressOf(q) / t);
    }

    public boolean isDone(Quest q) { return completed.contains(q.id()) || progressOf(q) >= targetOf(q); }

    public boolean claim(Quest q) {
        if (!isDone(q) || claimed.contains(q.id())) return false;
        claimed.add(q.id());
        if (onReward != null) onReward.accept(q.rewardGold(), q.rewardXP());
        save();
        return true;
    }

    public void record(QEvent event) {
        if (event instanceof QEvent.GoldSold g) lifetimeSold += g.amount();
        if (event instanceof QEvent.XpEarned x) lifetimeXP += x.amount();
        boolean changed = false;
        for (Quest q : active()) {
            if (isDone(q)) continue;
            int before = progressOf(q);
            int after = advance(q, before, event);
            if (after != before) {
                progress.put(q.id(), after);
                changed = true;
                if (after >= targetOf(q)) completed.add(q.id());
            }
        }
        for (Quest q : active()) {
            if (isDone(q)) continue;
            int v = -1;
            if (q.trigger() instanceof Trigger.SellGold) v = Math.min(lifetimeSold, targetOf(q));
            if (q.trigger() instanceof Trigger.EarnXP) v = Math.min(lifetimeXP, targetOf(q));
            if (v >= 0 && v != progressOf(q)) {
                progress.put(q.id(), v);
                changed = true;
                if (v >= targetOf(q)) completed.add(q.id());
            }
        }
        if (changed) save();
    }

    private int advance(Quest quest, int from, QEvent event) {
        int target = targetOf(quest);
        Trigger t = quest.trigger();
        if (t instanceof Trigger.BreakBlocks && event instanceof QEvent.BlockBroken)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.MineOre mo && event instanceof QEvent.OreMined om) {
            if (mo.name().equals("any") || mo.name().equals(om.name()))
                return Math.min(target, from + om.count());
            return from;
        }
        if (t instanceof Trigger.ReachLayer rl && event instanceof QEvent.LayerReached lr)
            return rl.name().equals(lr.name()) ? target : from;
        if (t instanceof Trigger.MapSectors && event instanceof QEvent.SectorMapped sm)
            return Math.min(target, Math.max(from, sm.count()));
        if (t instanceof Trigger.OpenClosets && event instanceof QEvent.ClosetOpened)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.HarvestCaves && event instanceof QEvent.CaveHarvested)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.UnlockCaves && event instanceof QEvent.CaveUnlocked)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.HatchPets && event instanceof QEvent.PetHatched)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.ForgePicks && event instanceof QEvent.PickForged)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.UpgradePacks && event instanceof QEvent.PackUpgraded)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.Rebirth && event instanceof QEvent.Rebirthed)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.GreetCritters && event instanceof QEvent.CritterGreeted)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.SlayMonsters && event instanceof QEvent.MonsterSlain)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.ThrowBombs && event instanceof QEvent.BombThrown)
            return Math.min(target, from + 1);
        if (t instanceof Trigger.ReachDepth rd && event instanceof QEvent.DepthReached dr)
            return dr.y() <= rd.depth() ? target : from;
        return from;
    }

    public int lifetimeSold() { return lifetimeSold; }
    public int lifetimeXP() { return lifetimeXP; }

    private void save() {
        store.setMap("mineQuestProgress.v1", progress);
        store.setStrings("mineQuestCompleted.v1", completed);
        store.setStrings("mineQuestClaimed.v1", claimed);
        store.set("mineQuestSold.v1", lifetimeSold);
        store.set("mineQuestXP.v1", lifetimeXP);
    }

    private void load() {
        progress.putAll(store.map("mineQuestProgress.v1"));
        completed.addAll(store.stringArray("mineQuestCompleted.v1"));
        claimed.addAll(store.stringArray("mineQuestClaimed.v1"));
        lifetimeSold = store.num("mineQuestSold.v1");
        lifetimeXP = store.num("mineQuestXP.v1");
    }

    public void resetAll() {
        progress.clear();
        completed.clear();
        claimed.clear();
        lifetimeSold = 0;
        lifetimeXP = 0;
        save();
    }
}
