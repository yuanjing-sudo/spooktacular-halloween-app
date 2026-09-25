package spooktacular.game;

import spooktacular.data.Data;
import spooktacular.engine.Engine;
import spooktacular.engine.Engine.Cell;

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
        System.out.println("PASSED: " + pass + " FAILED: " + fail);
        System.out.flush();
        System.exit(fail > 0 ? 1 : 0); // EDT/Timer threads are non-daemon
    }

    // test-only accessors (same package)
    static List<double[]> getCandies(MazePanel mp) { return mp.candies(); }
    static double getGX(MazePanel mp) { return mp.ghostPos()[0]; }
    static double getGZ(MazePanel mp) { return mp.ghostPos()[1]; }
}
