package spooktacular.quests;

import spooktacular.systems.GameStore;

import java.util.*;
import java.util.function.BiConsumer;

/** Expedition board engine — logic port of MazeExpeditionBoard. */
public class ExpeditionBoard {
    private final Map<String, Integer> progress = new HashMap<>();
    private final Set<String> completed = new HashSet<>();
    private final Set<String> claimed = new HashSet<>();
    private int lifetimeScore, lifetimeDistance;
    public BiConsumer<Integer, Integer> onReward; // (score, gold)
    public final int activeLimit = 3;
    private final GameStore store;

    private static final Set<String> SCORE_IDS = Set.of(
            "high-roller", "living-myth", "score-legend", "mythic-score", "thousand-club");
    private static final Set<String> DIST_IDS = Set.of(
            "marathon", "ultra-marathon", "pathfinder", "baby-steps", "marathon-plus");

    public ExpeditionBoard() { this(GameStore.standard); }
    public ExpeditionBoard(GameStore store) { this.store = store; load(); }

    public List<Expedition> active() {
        List<Expedition> open = new ArrayList<>();
        for (Expedition e : ExpeditionCatalog.all()) if (!completed.contains(e.id())) open.add(e);
        return open.subList(0, Math.min(activeLimit, open.size()));
    }

    public int progressOf(Expedition e) { return progress.getOrDefault(e.id(), 0); }
    public double fractionOf(Expedition e) { return Math.min(1, (double) progressOf(e) / Math.max(1, e.target())); }
    public boolean isDone(Expedition e) { return completed.contains(e.id()) || progressOf(e) >= e.target(); }
    public int doneCount() { return completed.size(); }

    public boolean claim(Expedition e) {
        if (!isDone(e) || claimed.contains(e.id())) return false;
        claimed.add(e.id());
        if (onReward != null) onReward.accept(e.rewardScore(), e.rewardGold());
        save();
        return true;
    }

    public void record(EEvent event) {
        if (event instanceof EEvent.ScoreEarned s) lifetimeScore += s.points();
        if (event instanceof EEvent.DistanceBanked d) lifetimeDistance += d.meters();
        boolean changed = false;
        for (Expedition e : active()) {
            if (isDone(e)) continue;
            int before = progressOf(e);
            int after = advance(e, before, event);
            if (after != before) {
                progress.put(e.id(), after);
                changed = true;
                if (after >= e.target()) completed.add(e.id());
            }
        }
        for (Expedition e : active()) {
            if (isDone(e)) continue;
            int v = -1;
            if (SCORE_IDS.contains(e.id())) v = Math.min(lifetimeScore, e.target());
            if (DIST_IDS.contains(e.id())) v = Math.min(lifetimeDistance, e.target());
            if (v >= 0 && v != progressOf(e)) {
                progress.put(e.id(), v);
                changed = true;
                if (v >= e.target()) completed.add(e.id());
            }
        }
        if (changed) save();
    }

    static Expedition.Kind kindOf(String id) {
        if (Set.of("first-cache", "closet-crawl", "closet-magnate").contains(id)) return Expedition.Kind.closets;
        if (Set.of("fork-scout", "fork-frenzy", "fork-lord", "fork-fan").contains(id)) return Expedition.Kind.forks;
        if (Set.of("boxy-hello", "wisp-whisperer", "cube-royalty", "cube-curious").contains(id)) return Expedition.Kind.boxy;
        if (Set.of("crystal-cutter", "crystal-magnate", "gem-emperor", "cave-scout").contains(id)) return Expedition.Kind.crystals;
        if (Set.of("cave-comber", "spelunker").contains(id)) return Expedition.Kind.caves;
        if (Set.of("cartographer-2", "grand-tour", "home-turf").contains(id)) return Expedition.Kind.regions;
        if (Set.of("marathon", "ultra-marathon", "pathfinder", "baby-steps", "marathon-plus").contains(id)) return Expedition.Kind.distance;
        if (Set.of("treasure-goblin", "treasure-tycoon", "dragon-hoard", "pocket-change", "treasure-chest-10").contains(id)) return Expedition.Kind.treasure;
        if (Set.of("monster-bouncer", "extermination", "bounty-board", "first-blood", "boss-hunter").contains(id)) return Expedition.Kind.monsters;
        return Expedition.Kind.score;
    }

    private int advance(Expedition e, int from, EEvent event) {
        int cap = Math.min(e.target(), from + 1);
        return switch (kindOf(e.id())) {
            case closets -> event instanceof EEvent.ClosetOpened ? cap : from;
            case caves -> event instanceof EEvent.CaveHarvested ? cap : from;
            case boxy -> event instanceof EEvent.BoxyMet ? cap : from;
            case forks -> event instanceof EEvent.ForkRaised ? cap : from;
            case regions -> event instanceof EEvent.RegionMapped r ? Math.min(e.target(), Math.max(from, r.count())) : from;
            case treasure -> event instanceof EEvent.TreasureFound ? cap : from;
            case monsters -> event instanceof EEvent.MonsterSlain ? cap : from;
            case crystals -> event instanceof EEvent.CrystalMined ? cap : from;
            default -> from;
        };
    }

    public int lifetimeScore() { return lifetimeScore; }
    public int lifetimeDistance() { return lifetimeDistance; }

    private void save() {
        store.setMap("mazeExpProgress.v1", progress);
        store.setStrings("mazeExpCompleted.v1", completed);
        store.setStrings("mazeExpClaimed.v1", claimed);
        store.set("mazeExpScore.v1", lifetimeScore);
        store.set("mazeExpDist.v1", lifetimeDistance);
    }

    private void load() {
        progress.putAll(store.map("mazeExpProgress.v1"));
        completed.addAll(store.stringArray("mazeExpCompleted.v1"));
        claimed.addAll(store.stringArray("mazeExpClaimed.v1"));
        lifetimeScore = store.num("mazeExpScore.v1");
        lifetimeDistance = store.num("mazeExpDist.v1");
    }

    public void resetAll() {
        progress.clear();
        completed.clear();
        claimed.clear();
        lifetimeScore = 0;
        lifetimeDistance = 0;
        save();
    }
}
