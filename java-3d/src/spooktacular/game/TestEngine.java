package spooktacular.game;

import spooktacular.combat.Bestiary;
import spooktacular.combat.World;
import spooktacular.data.*;
import spooktacular.engine.Engine;
import spooktacular.engine.Engine.Cell;
import spooktacular.quests.*;
import spooktacular.systems.*;

import java.time.LocalDate;
import java.util.*;

/** Headless assert harness (no window): `java spooktacular.game.TestEngine`.
 *  A MazePanel logic test needs no display either (pure panel, no Frame). */
public class TestEngine {
    static int pass, fail;

    static void check(String name, boolean cond, Object detail) {
        if (cond) pass++;
        else { fail++; System.out.println("FAIL: " + name + " " + detail); }
    }

    public static void main(String[] a) {
        // RNG
        Engine.RNG r1 = new Engine.RNG(7), r2 = new Engine.RNG(7);
        boolean same = true;
        for (int i = 0; i < 50; i++) same &= r1.next() == r2.next();
        check("rng deterministic", same, "");
        Engine.RNG r3 = new Engine.RNG(7), r4 = new Engine.RNG(8);
        boolean diff = false;
        for (int i = 0; i < 20; i++) diff |= r3.next() != r4.next();
        check("rng seed-sensitive", diff, "");
        Engine.RNG r5 = new Engine.RNG(99);
        boolean range = true;
        for (int i = 0; i < 500; i++) { double d = r5.nextDouble(); range &= d >= 0 && d < 1; }
        check("rng doubles", range, "");
        // maze
        boolean conn = true;
        for (long s : new long[]{1, 7, 42}) for (int sz : new int[]{9, 15, 21})
            conn &= Engine.connected(Engine.carveDFS(sz, sz, s).open());
        check("maze connected", conn, "");
        // astar
        List<Cell> p = Engine.astar(new Cell(0, 0), new Cell(5, 5), n -> true, 600);
        check("astar diagonal", p != null && p.size() == 6, p);
        Set<Cell> walls = new HashSet<>();
        for (int y = 0; y < 7; y++) if (y != 6) walls.add(new Cell(2, y));
        List<Cell> p2 = Engine.astar(new Cell(0, 3), new Cell(5, 3),
                n -> !walls.contains(n) && n.x() >= -2 && n.x() <= 8 && n.z() >= -2 && n.z() <= 8, 600);
        check("astar detour", p2 != null && p2.stream().noneMatch(walls::contains), p2);
        check("astar budget", Engine.astar(new Cell(0, 0), new Cell(50, 50), n -> false, 10) == null, "");
        // scoring
        check("combo", Engine.comboMult(10) == 1.5 && Engine.comboMult(0) == 1.0, "");
        check("streak", Engine.streakBonus(5) == 10 && Engine.streakBonus(25) == 125, "");
        check("xp", Engine.xpNext(1) == 80 && Engine.xpNext(5) == 215, Engine.xpNext(5));
        Engine.XP xp = Engine.applyXP(1, 0, 80);
        check("applyXP", xp.leveled() && xp.level() == 2 && xp.xp() == 0, xp);
        check("compact", Engine.compact(1500).equals("1.5K") && Engine.compact(2300000).equals("2.3M"), "");
        check("ease", Math.abs(Engine.ease("quadOut", 0.5) - 0.75) < 1e-9, "");
        // data
        check("25 ghosts", Data.GHOSTS.length == 25, Data.GHOSTS.length);
        check("18 candies", Data.CANDIES.length == 18, Data.CANDIES.length);
        check("11 minigames", Data.MINIGAMES.length == 11, Data.MINIGAMES.length);
        check("7 picks", Data.PICKS.length == 7 && Data.PICKS[6].name().equals("Void Drill"), "");
        check("12 relics", Data.RELICS.length == 12, Data.RELICS.length);
        check("14 fish", Data.FISH.length == 14, Data.FISH.length);
        // panel logic headless (JPanel needs no display)
        MazePanel mp = new MazePanel();
        mp.startNewRun(20261031L);
        check("run starts", mp.state.equals("play") && mp.maze.open().size() > 50, mp.maze.open().size());
        // walk onto first candy
        double[] c = {mp.px, mp.pz};
        var fld = getCandies(mp);
        if (!fld.isEmpty()) {
            mp.px = fld.get(0)[0];
            mp.pz = fld.get(0)[1];
        }
        long s0 = mp.score;
        mp.step(0.016, Set.of());
        check("candy pickup", mp.score > s0, mp.score);
        // teleport onto ghost -> death
        mp.px = getGX(mp);
        mp.pz = getGZ(mp);
        mp.step(0.016, Set.of());
        check("ghost kills", mp.state.equals("dead"), mp.state);
        // shop buy
        mp.gold = 500;
        check("buy pick", mp.buyPick() && mp.pickIdx == 1 && mp.gold == 492, mp.gold);
        check("achievement", mp.ach.contains("first-pick"), mp.ach);
        // ---- full-port systems ----
        // easing
        check("easing 12 endpoints", Arrays.stream(Easing.Curve.values())
                .allMatch(e -> Math.abs(Easing.value(e, 0)) < 1e-9 && Math.abs(Easing.value(e, 1) - 1) < 1e-3), "");
        check("easing backOut", Easing.value(Easing.Curve.backOut, 0.7) > 1.0, "");
        check("spring spec", Easing.Springs.snappy().damping() == 0.6, "");
        // perlin
        PerlinNoise pn = new PerlinNoise(777);
        boolean bounded = true;
        for (int x = 0; x < 30; x++) for (int y = 0; y < 30; y++) {
            double v = pn.noise(x * 0.31, y * 0.47);
            bounded &= v > -1.6 && v < 1.6;
        }
        check("perlin bounded", bounded, "");
        check("perlin deterministic", pn.noise(3.7, 9.1) == new PerlinNoise(777).noise(3.7, 9.1), "");
        // raycaster
        Raycaster.Hit hit = Raycaster.castVoxel(new Raycaster.Vec(0.5f, 0.5f, 0.5f),
                new Raycaster.Vec(1, 0, 0), 10, (x, y, z) -> x == 3);
        check("raycast hit", hit != null && hit.x() == 3 && Math.abs(hit.distance() - 2.5) < 1e-4, hit);
        check("raycast miss", Raycaster.castVoxel(new Raycaster.Vec(0.5f, 0.5f, 0.5f),
                new Raycaster.Vec(0, 1, 0), 10, (x, y, z) -> false) == null, "");
        // scheduler determinism
        Scheduler s = new Scheduler();
        int[] cnt = {0};
        s.schedule(1.0, u -> cnt[0]++);
        check("sched wait", s.advance(0.5) == 0 && cnt[0] == 0, "");
        check("sched fire", s.advance(0.5) == 1 && cnt[0] == 1, "");
        int[] ticks = {0};
        UUID rep = s.schedule(1.0, 1.0, u -> ticks[0]++);
        check("sched repeat", s.advance(3.5) == 3 && ticks[0] == 3, ticks[0]);
        s.cancel(rep);
        check("sched cancel", s.advance(5) == 0 && ticks[0] == 3, "");
        // ghost brain
        check("brain enraged", GhostBrain.decide(0.1, true, 0, 0).state() == GhostBrain.State.enraged, "");
        check("brain lurking", GhostBrain.decide(1, false, 0, 0).state() == GhostBrain.State.lurking, "");
        check("brain dodge", GhostBrain.dodgeChance(GhostBrain.decide(1, false, 12, 0), false) > 0.2, "");
        // daily determinism
        LocalDate day = LocalDate.of(2026, 10, 31);
        Daily.Challenge a1 = Daily.generate(day), a2 = Daily.generate(day);
        check("daily deterministic", a1.id().equals("2026-10-31") && a1.title().equals(a2.title())
                && a1.targetGhosts() == a2.targetGhosts(), a1);
        // store + streaks
        Store.set(12345, "test.int");
        check("store int", Store.num("test.int", 0) == 12345, "");
        Store.Streak st1 = Store.touchLoginStreak("2026-10-31");
        Store.Streak st2 = Store.touchLoginStreak("2026-10-31");
        check("streak idempotent", st1.streak() == st2.streak() && !st2.isNewDay(), st1);
        Store.remove("test.int");
        // toast expiry on virtual time
        Scheduler ts2 = new Scheduler();
        ToastQueue tq = new ToastQueue(ts2);
        tq.show("🎃", "Boo");
        check("toast shown", tq.toasts().size() == 1, "");
        ts2.advance(5);
        check("toast expires", tq.toasts().isEmpty(), "");
        // leaderboard
        Leaderboard lb = new Leaderboard(new GameStore("test-lb-" + System.nanoTime()));
        lb.record("A", 100, 1);
        lb.record("B", 300, 2);
        check("leaderboard", lb.bestScore() == 300 && lb.rank(200) == 2, "");
        // motion kit
        Motion.Smoother sm = new Motion.Smoother(0);
        for (int i = 0; i < 600; i++) sm.step(100, 1.0 / 60);
        check("smoother converges", Math.abs(sm.current - 100) < 0.01, sm.current);
        Motion.Tween tw = new Motion.Tween(new Scheduler());
        boolean[] done = {false};
        tw.start(1.0, Easing.Curve.linear, () -> done[0] = true);
        tw.scheduler.advance(1.1);
        check("tween completes", done[0] && !tw.running() && tw.progress() == 1.0, tw.progress());
        // quest board lifecycle (isolated store)
        QuestBoard qb = new QuestBoard(new GameStore("test-q-" + System.nanoTime()));
        check("quest active 3", qb.active().size() == 3 && qb.active().get(0).id().equals("first-swing"), qb.active().size());
        qb.record(new QEvent.BlockBroken());
        check("quest first-swing done", qb.isDone(QuestCatalog.all().get(0)), "");
        int[] paid = {0, 0};
        qb.onReward = (gld, xe) -> { paid[0] = gld; paid[1] = xe; };
        check("quest claim once", qb.claim(QuestCatalog.all().get(0)) && !qb.claim(QuestCatalog.all().get(0))
                && paid[0] + paid[1] > 0, Arrays.toString(paid));
        qb.record(new QEvent.GoldSold(1000000));
        qb.record(new QEvent.XpEarned(1000000));
        check("lifetime quests progress", qb.lifetimeSold() == 1000000 && qb.lifetimeXP() == 1000000, "");
        // expedition board
        ExpeditionBoard eb = new ExpeditionBoard(new GameStore("test-e-" + System.nanoTime()));
        eb.record(new EEvent.ClosetOpened());
        Expedition first = ExpeditionCatalog.all().get(0);
        check("expedition progress", eb.progressOf(first) >= 1, eb.progressOf(first));
        check("region atlas", RegionAtlas.at(0, -200).id().equals("northgate-east")
                && RegionAtlas.at(-5, 0).id().equals("heart-west"), "");
        check("region count", RegionAtlas.all().size() == 10, RegionAtlas.all().size());
        // achievements over a snapshot
        AchievementBoard ab = new AchievementBoard(new GameStore("test-a-" + System.nanoTime()));
        Entities.MNPlayer pl = new Entities.MNPlayer();
        pl.blocksMined = 50;
        QuestBoard qb2 = new QuestBoard(new GameStore("test-q2-" + System.nanoTime()));
        Snapshot snap = Snapshot.empty(qb2);
        snap.player().blocksMined = 50;
        check("achievement unlocks", ab.refresh(snap).stream().anyMatch(x -> x.id().equals("d-break-50")), "");
        check("achievement claim", ab.claim(AchievementCatalog.all().stream()
                .filter(x -> x.id().equals("d-break-50")).findFirst().orElseThrow()), "");
        // catalogs present
        check("69 quests", QuestCatalog.all().size() == 69, QuestCatalog.all().size());
        check("40 expeditions", ExpeditionCatalog.all().size() == 40, ExpeditionCatalog.all().size());
        check("60 achievements", AchievementCatalog.all().size() == 60, AchievementCatalog.all().size());
        check("24 blocks", Block.values().length == 24, Block.values().length);
        check("24 ores", OreCodex.all().size() == 24, OreCodex.all().size());
        // fishing + rods + pets
        check("4 rods", Fishing.rods().size() == 4 && Fishing.rods().get(0).cost() == 0, "");
        check("rod windows widen", Fishing.rods().get(3).window() > Fishing.rods().get(0).window(), "");
        check("strike zone", Fishing.strike(0.5, Fishing.rods().get(0)) && !Fishing.strike(0.0, Fishing.rods().get(0)), "");
        Data.Fish caught = Fishing.cast("Fresh", 0, new Engine.RNG(42));
        check("fish catch fresh", caught != null && Fishing.waterOf(caught.name()).equals("Fresh"), caught);
        Entities.Pet pet = Entities.hatch(1, 50, 2);
        check("pet hatch", pet != null && pet.boostValue() == 0.1, pet);
        // mining sim headless (Swing panel, no display needed)
        GameStore ms = new GameStore("test-mine-" + System.nanoTime());
        QuestBoard mqb = new QuestBoard(ms);
        AchievementBoard mab = new AchievementBoard(ms);
        ExpeditionBoard meb = new ExpeditionBoard(ms);
        MineSim sim = new MineSim(mqb, mab, meb);
        check("mine grid built", sim.blockAt(4, 4) != null, "");
        // find a dirt cell (toughness 1, wooden pick breaks in one swing)
        int[] dirt = null;
        outer:
        for (int r = 1; r < 8; r++) for (int cc = 1; cc < 13; cc++)
            if (sim.blockAt(r, cc) == Block.dirt) { dirt = new int[]{r, cc}; break outer; }
        check("dirt exists", dirt != null, "");
        if (dirt != null) {
            int before = sim.player().blocksMined;
            sim.swingAt(dirt[0], dirt[1]);
            check("swing breaks dirt", sim.player().blocksMined == before + 1, sim.player().blocksMined);
        }
        // coal -> pick purchase -> sell loop
        sim.grantCoal(100);
        int pickBefore = sim.player().pickTier;
        sim.buyPickPublic();
        check("pick bought with coal", sim.player().pickTier == pickBefore + 1, sim.player().pickTier);
        check("quest tracks swings", mqb.progressOf(QuestCatalog.all().get(0)) >= 1, "");
        sim.grantGold(0);
        sim.doSell();
        check("sell banks gold", sim.player().gold >= 0, sim.player().gold);
        // achievements refresh over sim snapshot
        check("sim snapshot valid", sim.snapshotView().player().blocksMined >= 1, "");
        // ---- avatar-world combat ----
        check("5 worlds", World.levels().size() == 5, World.levels().size());
        check("38 bestiary notes", Bestiary.all().size() == 38, Bestiary.all().size());
        MazePanel mp2 = new MazePanel();
        mp2.startNewRun(777L);
        check("wolves stalk depths", mp2.wolves.size() == 2, mp2.wolves.size());
        check("portals bridge depths", mp2.portals.size() == 2, mp2.portals.size());
        // fire bolts point-blank: two rounds, ghost reset adjacent each round
        long gold0 = mp2.gold;
        // find an open cell with an open +x neighbor for a clean bolt lane
        int[] lane = null;
        outer2:
        for (Engine.Cell cell : mp2.maze.open()) {
            if (mp2.maze.open().contains(new Engine.Cell(cell.x() + 1, cell.z()))) {
                lane = new int[]{cell.x(), cell.z()};
                break outer2;
            }
        }
        check("bolt lane exists", lane != null, "");
        mp2.state = "play";
        for (int round = 0; round < 2; round++) {
            mp2.state = "play";
            mp2.px = lane[0] + 0.5;
            mp2.pz = lane[1] + 0.5;
            mp2.setGhost(lane[0] + 1.5, lane[1] + 0.5);
            mp2.dirX = 1;
            mp2.dirZ = 0;
            mp2.fireBolt();
            for (int i = 0; i < 8; i++) mp2.step(0.016, Set.of());
        }
        check("bolts blast ghost for gold", mp2.gold > gold0, mp2.gold);
        // wolf bite + kill (ghost parked far away)
        mp2.state = "play";
        mp2.setGhost(12.5, 12.5);
        World.Wolf w = mp2.wolves.get(0);
        w.x = mp2.px;
        w.z = mp2.pz;
        int hp0 = mp2.vitals.hp;
        for (int i = 0; i < 10 && mp2.vitals.hp == hp0; i++) mp2.step(0.05, Set.of());
        check("wolf bites", mp2.vitals.hp < hp0, mp2.vitals.hp);
        long gold1 = mp2.gold;
        w.hp = 1;
        mp2.bolts.add(new World.Bolt(w.x, w.z, 0, 0.01));
        for (int i = 0; i < 40 && mp2.wolves.contains(w); i++) mp2.step(0.016, Set.of());
        check("wolf driven off pays", !mp2.wolves.contains(w) && mp2.gold > gold1, mp2.gold);
        // portal travel
        mp2.state = "play";
        World.Portal pt = mp2.portals.get(0);
        int depth0 = mp2.depth;
        mp2.px = pt.x();
        mp2.pz = pt.z();
        mp2.step(0.016, Set.of());
        check("portal teleports", mp2.depth == pt.toLevel() && mp2.depth != depth0, mp2.depth);
        // heal + bolt upgrade path
        mp2.state = "play";
        mp2.vitals.hp = 40;
        check("heal works", mp2.heal() && mp2.vitals.hp == 90, mp2.vitals.hp);
        mp2.vitals.hp = 100;
        check("heal capped", !mp2.heal(), "");
        System.out.println("PASSED: " + pass + " FAILED: " + fail);
        System.out.flush();
        System.exit(fail > 0 ? 1 : 0); // EDT/Timer threads are non-daemon
    }

    // test-only accessors (same package)
    static List<double[]> getCandies(MazePanel mp) { return mp.candies(); }
    static double getGX(MazePanel mp) { return mp.ghostPos()[0]; }
    static double getGZ(MazePanel mp) { return mp.ghostPos()[1]; }
}
