package spooktacular.game;

import spooktacular.data.Data;
import spooktacular.engine.Engine;
import spooktacular.engine.Engine.Cell;
import spooktacular.combat.World;
import spooktacular.quests.EEvent;
import spooktacular.quests.ExpeditionBoard;
import spooktacular.engine.Engine.Maze;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.util.*;
import java.util.List;

/** Wolfenstein-style software raycaster: textured walls, billboard sprites,
 *  floor shading, fog, minimap. Same engine systems as every other edition:
 *  seeded DFS mazes, A* ghost, combo/streak/XP, shop/picks/relics/fishing. */
public class MazePanel extends JPanel implements KeyListener {
    public static final int VW = 480, VH = 270;
    private final BufferedImage frame = new BufferedImage(VW, VH, BufferedImage.TYPE_INT_RGB);
    private final double[] zbuffer = new double[VW];

    // palette per depth: wall base, wall dark, floor, ceiling, fog(0..1 target)
    private static final int[][][] PAL = {
        {{0x3b, 0x1d, 0x5e}, {0x24, 0x12, 0x43}, {0x0d, 0x08, 0x1c}, {0x06, 0x03, 0x12}},
        {{0x0e, 0x4a, 0x5e}, {0x0a, 0x2e, 0x43}, {0x06, 0x12, 0x1c}, {0x03, 0x08, 0x12}},
        {{0x5e, 0x1d, 0x1d}, {0x43, 0x12, 0x12}, {0x1c, 0x08, 0x08}, {0x12, 0x03, 0x03}},
    };
    private static final int[] DEPTH_SIZE = {15, 19, 23};
    private static final int[] DEPTH_CANDY = {8, 12, 16};
    private static final int[] DEPTH_GEMS = {2, 3, 4};
    private static final double[] GHOST_SPEED = {3.4, 3.8, 4.2};
    private static final double[] GHOST_THINK = {0.55, 0.45, 0.35};

    // ---- run state ----
    public long seed = 20261031L;
    public int depth;
    public long score;
    public int combo, streak;
    public long gold;
    public int level = 1, xp;
    public int pickIdx;
    public final List<Data.Relic> relics = new ArrayList<>();
    public final Set<String> ach = new LinkedHashSet<>();
    public int collectedCandy;
    public int smashed;
    public String state = "title"; // title|play|dead|win|shop
    public double px = 1.5, pz = 1.5, dirX = -1, dirZ = 0, planeX = 0, planeY = 0.66;
    private double ghostX = 1.5, ghostZ = 1.5;
    private List<Cell> ghostPath = new ArrayList<>();
    private double ghostThink;
    private final List<double[]> candies = new ArrayList<>();
    private final List<double[]> gems = new ArrayList<>();
    private double[] relicSpot;
    private double[] pond;
    private boolean pondUsed;
    Maze maze;
    private Engine.RNG rng;
    private double time;
    private String flashMsg = "";
    private double flashT;
    private boolean paused;
    private final Set<Integer> keys = new HashSet<>();
    private int[][] wallTex = new int[64][64];
    private int ghostType = 0;
    private final javax.swing.Timer loop;
    private boolean automap;
    /** Expedition board fed by maze play (distance, score, treasure). Set by host. */
    public ExpeditionBoard expeditions;
    private long lastExpScore;
    private double distAcc;
    /** Avatar-world combat state (bolts, wolves, portals, vitals). */
    public final World.Vitals vitals = new World.Vitals();
    public final List<World.Wolf> wolves = new ArrayList<>();
    public final List<World.Bolt> bolts = new ArrayList<>();
    public final List<World.Portal> portals = new ArrayList<>();
    private final Set<String> portalHinted = new HashSet<>();
    private int ghostHp = 2;
    private double ghostSpawnX = 1.5, ghostSpawnZ = 1.5;
    private final Random combatRng = new Random();

    public MazePanel() {
        setPreferredSize(new Dimension(VW * 2, VH * 2));
        setFocusable(true);
        addKeyListener(this);
        setBackground(Color.BLACK);
        buildDepth();
        loop = new javax.swing.Timer(16, e -> {
            if (!paused) tick(0.016);
            repaint();
        });
        loop.start();
    }

    public void setPaused(boolean p) { paused = p; }

    /** Test hooks (same package): inspect live lists without a display. */
    List<double[]> candies() { return candies; }
    double[] ghostPos() { return new double[]{ghostX, ghostZ}; }
    int ghostHp() { return ghostHp; }
    void setGhost(double x, double z) { ghostX = x; ghostZ = z; }

    // ================= world =================
    private boolean walkable(int x, int z) { return maze.open().contains(new Cell(x, z)); }

    public void buildDepth() {
        int size = DEPTH_SIZE[depth];
        rng = new Engine.RNG(seed + depth * 7919L);
        maze = Engine.carveDFS(size, size, seed + depth * 7919L);
        List<Cell> rooms = new ArrayList<>();
        for (Cell c : maze.open())
            if (c.x() % 2 == 1 && c.z() % 2 == 1 && !(c.x() == 1 && c.z() == 1)) rooms.add(c);
        rooms = rng.shuffle(rooms);
        int n = 0;
        candies.clear();
        for (int i = 0; i < DEPTH_CANDY[depth] && n < rooms.size(); i++, n++)
            candies.add(new double[]{rooms.get(n).x() + 0.5, rooms.get(n).z() + 0.5});
        gems.clear();
        int extra = Math.min(2, (int) relics.stream().filter(r -> r.effect().equals("Pack")).count());
        for (int i = 0; i < DEPTH_GEMS[depth] + extra && n < rooms.size(); i++, n++)
            gems.add(new double[]{rooms.get(n).x() + 0.5, rooms.get(n).z() + 0.5});
        relicSpot = n < rooms.size() ? new double[]{rooms.get(n).x() + 0.5, rooms.get(n).z() + 0.5} : null;
        n++;
        pond = n < rooms.size() ? new double[]{rooms.get(n).x() + 0.5, rooms.get(n).z() + 0.5} : null;
        pondUsed = false;
        double bx = 1.5, bz = 1.5;
        int best = -1;
        for (Cell r : rooms) {
            int dist = Math.abs(r.x() - 1) + Math.abs(r.z() - 1);
            if (dist > best) { best = dist; bx = r.x() + 0.5; bz = r.z() + 0.5; }
        }
        ghostX = bx; ghostZ = bz;
        ghostSpawnX = bx;
        ghostSpawnZ = bz;
        ghostHp = 2;
        ghostPath.clear();
        ghostThink = 0;
        px = 1.5; pz = 1.5;
        dirX = -1; dirZ = 0; planeX = 0; planeY = 0.66;
        ghostType = (int) ((seed + depth) % Data.GHOSTS.length);
        // wolves stalk the far rooms; portals bridge depths
        wolves.clear();
        bolts.clear();
        portals.clear();
        portalHinted.clear();
        List<Cell> byDist = new ArrayList<>(rooms);
        byDist.sort((a, b) -> Integer.compare(
                Math.abs(b.x() - 1) + Math.abs(b.z() - 1), Math.abs(a.x() - 1) + Math.abs(a.z() - 1)));
        for (int i = 1; i <= 2 && i < byDist.size(); i++)
            wolves.add(new World.Wolf(byDist.get(i).x() + 0.5, byDist.get(i).z() + 0.5));
        if (rooms.size() > 6) {
            Cell p1 = rooms.get(rooms.size() / 3), p2 = rooms.get(2 * rooms.size() / 3);
            portals.add(new World.Portal(p1.x() + 0.5, p1.z() + 0.5, (depth + 1) % 3, "forward"));
            portals.add(new World.Portal(p2.x() + 0.5, p2.z() + 0.5, (depth + 2) % 3, "back"));
        }
        genWallTex();
    }

    private void genWallTex() {
        int[] base = PAL[depth][0];
        Engine.RNG r = new Engine.RNG(seed * 31 + depth);
        for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) {
            boolean mortar = (y % 16 == 0) || ((x + (y / 16) * 32) % 64 == 0);
            double v = mortar ? 0.55 : 0.85 + r.nextDouble() * 0.3;
            wallTex[y][x] = rgb(base[0] * v, base[1] * v, base[2] * v);
        }
    }

    private static int rgb(double r, double g, double b) {
        return ((clamp(r) << 16) | (clamp(g) << 8) | clamp(b));
    }

    private static int clamp(double v) { return Math.max(0, Math.min(255, (int) v)); }

    // ================= scoring helpers =================
    private double goldMult() { return 1 + relics.stream().filter(r -> r.effect().equals("Gold")).mapToDouble(Data.Relic::value).sum(); }
    private double dmgMult() { return 1 + relics.stream().filter(r -> r.effect().equals("Damage")).mapToDouble(Data.Relic::value).sum(); }
    private double speedMult() { return 1 + relics.stream().filter(r -> r.effect().equals("Speed")).mapToDouble(Data.Relic::value).sum(); }
    private double moveSpeed() { return (2.6 + pickIdx * 0.35) * speedMult(); }

    private void unlock(String id) { ach.add(id); }

    private void flash(String m, double d) { flashMsg = m; flashT = d; }
    private void flash(String m) { flash(m, 2.2); }

    private void gainXP(int n) {
        xp += n;
        while (xp >= Engine.xpNext(level)) {
            xp -= Engine.xpNext(level);
            level++;
            gold += 25;
            score += 100;
            flash("Level " + level + "! +25 gold", 2.2);
            if (level >= 5) unlock("level-5");
        }
    }

    // ================= tick (explicit input set: testable) =================
    public void step(double dt, Set<Integer> down) {
        keys.clear();
        keys.addAll(down);
        tick(dt);
    }

    private void tick(double dt) {
        time += dt;
        if (flashT > 0) flashT -= dt;
        if (!state.equals("play")) return;
        double sp = moveSpeed() * dt;
        double fw = (keys.contains(KeyEvent.VK_W) || keys.contains(KeyEvent.VK_UP) ? 1 : 0)
                  - (keys.contains(KeyEvent.VK_S) || keys.contains(KeyEvent.VK_DOWN) ? 1 : 0);
        double st = (keys.contains(KeyEvent.VK_D) ? 1 : 0) - (keys.contains(KeyEvent.VK_A) ? 1 : 0);
        if (keys.contains(KeyEvent.VK_LEFT)) rotate(2.4 * dt);
        if (keys.contains(KeyEvent.VK_RIGHT)) rotate(-2.4 * dt);
        double mx = dirX * fw + -dirZ * st, mz = dirZ * fw + dirX * st;
        double l = Math.hypot(mx, mz);
        if (l > 0) { mx = mx / l * sp; mz = mz / l * sp; moveWithCollision(mx, 0); moveWithCollision(0, mz); }
        updateGhost(dt);
        updatePickups();
    }

    private void rotate(double a) {
        double c = Math.cos(a), s = Math.sin(a);
        double ox = dirX, opx = planeX;
        dirX = ox * c - dirZ * s;
        dirZ = ox * s + dirZ * c;
        planeX = opx * c - planeY * s;
        planeY = opx * s + planeY * c;
    }

    private void moveWithCollision(double dx, double dz) {
        double r = 0.22, nx = px + dx, nz = pz + dz;
        double ox = px, oz = pz;
        if (!hitsWall(nx, pz, r)) px = nx;
        if (!hitsWall(px, nz, r)) pz = nz;
        px = Math.max(0.4, Math.min(maze.w() - 0.4, px));
        pz = Math.max(0.4, Math.min(maze.d() - 0.4, pz));
        if (expeditions != null) {
            distAcc += Math.hypot(px - ox, pz - oz);
            while (distAcc >= 1) {
                expeditions.record(new EEvent.DistanceBanked(1));
                distAcc -= 1;
            }
        }
    }

    private boolean hitsWall(double wx, double wz, double r) {
        int cx0 = (int) Math.floor(wx), cz0 = (int) Math.floor(wz);
        for (int ox = -1; ox <= 1; ox++) for (int oz = -1; oz <= 1; oz++) {
            int cx = cx0 + ox, cz = cz0 + oz;
            if (walkable(cx, cz)) continue;
            double nx = Math.max(cx, Math.min(wx, cx + 1));
            double nz = Math.max(cz, Math.min(wz, cz + 1));
            if ((wx - nx) * (wx - nx) + (wz - nz) * (wz - nz) < r * r) return true;
        }
        return false;
    }

    private void updateGhost(double dt) {
        ghostThink -= dt;
        if (ghostThink <= 0) {
            ghostThink = GHOST_THINK[depth];
            List<Cell> p = Engine.astar(new Cell((int) ghostX, (int) ghostZ),
                    new Cell((int) px, (int) pz), c -> walkable(c.x(), c.z()), 600);
            ghostPath = (p != null && p.size() > 1) ? new ArrayList<>(p.subList(1, p.size())) : new ArrayList<>();
        }
        double gs = GHOST_SPEED[depth] * dt;
        while (gs > 0 && !ghostPath.isEmpty()) {
            Cell t = ghostPath.get(0);
            double tx = t.x() + 0.5, tz = t.z() + 0.5;
            double dx = tx - ghostX, dz = tz - ghostZ, dist = Math.hypot(dx, dz);
            if (dist < 1e-4) { ghostPath.remove(0); continue; }
            double step = Math.min(gs, dist);
            ghostX += dx / dist * step;
            ghostZ += dz / dist * step;
            gs -= step;
            if (step >= dist - 1e-6) ghostPath.remove(0);
        }
        if (Math.hypot(px - ghostX, pz - ghostZ) < 0.6) die();
        updateCombat(dt);
    }

    /** Bolt flight, wolf AI, portal travel — AvatarWorld combat in the maze. */
    private void updateCombat(double dt) {
        // bolts fly
        Iterator<World.Bolt> bi = bolts.iterator();
        while (bi.hasNext()) {
            World.Bolt b = bi.next();
            b.step(dt);
            boolean dead = !b.alive() || hitsWall(b.x, b.z, 0.1);
            if (!dead) {
                // wolves first (they body-block)
                for (Iterator<World.Wolf> wi = wolves.iterator(); wi.hasNext();) {
                    World.Wolf w = wi.next();
                    if ((w.x - b.x) * (w.x - b.x) + (w.z - b.z) * (w.z - b.z) < 0.64) {
                        dead = true;
                        w.hp -= vitals.boltDmg;
                        if (w.hp <= 0) {
                            int reward = World.wolfReward(combatRng);
                            gold += reward;
                            flash("Wolf driven off! +" + reward + " gold");
                            wi.remove();
                        }
                        break;
                    }
                }
            }
            if (!dead && (ghostX - b.x) * (ghostX - b.x) + (ghostZ - b.z) * (ghostZ - b.z) < 0.64) {
                dead = true;
                ghostHp -= vitals.boltDmg;
                if (ghostHp <= 0) {
                    int reward = World.ghostReward(combatRng);
                    gold += reward;
                    score += 100;
                    flash("Ghost blasted! +" + reward + " gold");
                    ghostX = ghostSpawnX;
                    ghostZ = ghostSpawnZ;
                    ghostHp = 2;
                    ghostPath.clear();
                    ghostThink = 1.0;
                } else {
                    flash("Ghost hit! (" + ghostHp + " hp left)");
                }
            }
            if (dead) bi.remove();
        }
        // wolves stalk
        for (World.Wolf w : new ArrayList<>(wolves)) {
            World.Wolf.Event ev = w.update(px, pz, dt, time,
                    (wx, wz) -> !hitsWall(wx, wz, 0.3));
            if (ev == World.Wolf.Event.NOTICED) flash("Wolves are stalking you!");
            else if (ev == World.Wolf.Event.BITE) {
                vitals.hurt(6);
                flash("Wolf bite! -6 HP (" + Math.max(0, vitals.hp) + " left)");
                if (!vitals.alive()) die();
            }
        }
        // portals hum then hop
        for (World.Portal p : portals) {
            double d = Math.hypot(px - p.x(), pz - p.z());
            String key = depth + ":" + p.x() + "," + p.z();
            if (d < 3 && portalHinted.add(key)) flash("A glowing portal hums nearby...");
            if (d < 1.0) {
                depth = p.toLevel();
                buildDepth();
                flash("Stepped through! Now: " + Data.LAYERS[depth]);
                return;
            }
        }
    }

    /** Fire a bolt in the facing direction (SPACE). */
    public void fireBolt() {
        if (!state.equals("play")) return;
        bolts.add(new World.Bolt(px, pz, dirX, dirZ));
    }

    /** Heal +50 (H key). Returns true if healed. */
    public boolean heal() {
        if (!state.equals("play")) return false;
        if (vitals.heal()) {
            flash("Healed +50 HP");
            return true;
        }
        flash("HP already full!");
        return false;
    }

    private boolean near(double ax, double az, double bx, double bz, double r) {
        return (ax - bx) * (ax - bx) + (az - bz) * (az - bz) < r * r;
    }

    private void updatePickups() {
        Iterator<double[]> it = candies.iterator();
        while (it.hasNext()) {
            double[] c = it.next();
            if (near(px, pz, c[0], c[1], 0.5)) {
                it.remove();
                combo++;
                streak++;
                score += Math.round((10 * Engine.comboMult(combo) + Engine.streakBonus(streak)) * dmgMult());
                gold += Math.round(2 * goldMult());
                gainXP(8);
                collectedCandy++;
                unlock("first-candy");
                if (score >= 1000) unlock("score-1k");
            }
        }
        it = gems.iterator();
        while (it.hasNext()) {
            double[] c = it.next();
            if (near(px, pz, c[0], c[1], 0.5)) {
                it.remove();
                combo += 2;
                score += Math.round(50 * Engine.comboMult(combo) * dmgMult());
                gold += Math.round(5 * goldMult());
                gainXP(20);
                if (expeditions != null) expeditions.record(new EEvent.TreasureFound());
            }
        }
        if (relicSpot != null && near(px, pz, relicSpot[0], relicSpot[1], 0.5)) {
            Set<String> owned = new HashSet<>();
            for (Data.Relic r : relics) owned.add(r.name());
            List<Data.Relic> pool = new ArrayList<>();
            for (Data.Relic r : Data.RELICS) if (!owned.contains(r.name())) pool.add(r);
            if (!pool.isEmpty()) {
                Data.Relic relic = pool.get(rng.nextInt(pool.size()));
                relics.add(relic);
                score += 150;
                flash("Relic: " + relic.name() + " (" + relic.effect() + ")", 3);
            }
            relicSpot = null;
        }
        if (pond != null && !pondUsed && near(px, pz, pond[0], pond[1], 0.6)) {
            pondUsed = true;
            List<Data.Fish> bag = new ArrayList<>();
            int[] wts = {60, 28, 10, 2};
            String[] rar = {"Common", "Rare", "Epic", "Legendary"};
            for (Data.Fish f : Data.FISH)
                for (int i = 0; i < wts[List.of(rar).indexOf(f.rarity())]; i++) bag.add(f);
            Data.Fish f = bag.get(rng.nextInt(bag.size()));
            long gv = Math.round(f.value() * goldMult());
            gold += gv;
            score += Math.round(f.value() * dmgMult());
            flash("Caught " + f.name() + " (+" + gv + " gold)", 3);
        }
        if (candies.isEmpty() && gems.isEmpty()) depthCleared();
        if (expeditions != null) {
            long gained = score - lastExpScore;
            if (gained > 0) {
                expeditions.record(new EEvent.ScoreEarned((int) Math.min(gained, 1_000_000)));
                lastExpScore = score;
            }
        }
    }

    // ================= flow =================
    public void startNewRun(long s) {
        seed = s;
        depth = 0;
        score = 0;
        combo = 0;
        streak = 0;
        gold = 0;
        level = 1;
        xp = 0;
        pickIdx = 0;
        relics.clear();
        ach.clear();
        collectedCandy = 0;
        state = "play";
        lastExpScore = 0;
        distAcc = 0;
        buildDepth();
    }

    private void die() {
        state = "dead";
        combo = 0;
    }

    private void win() {
        state = "win";
        score += 1000;
    }

    private void depthCleared() {
        score += 250L * (depth + 1);
        gold += 30;
        unlock("clear-1");
        if (depth >= DEPTH_SIZE.length - 1) { win(); return; }
        depth++;
        buildDepth();
        state = "shop";
    }

    /** Buy next pick. Returns false if unaffordable. */
    public boolean buyPick() {
        if (pickIdx + 1 >= Data.PICKS.length) return true;
        if (gold < Data.PICKS[pickIdx + 1].cost()) return false;
        gold -= Data.PICKS[pickIdx + 1].cost();
        pickIdx++;
        score += 50;
        if (pickIdx == 1) unlock("first-pick");
        if (Data.PICKS[pickIdx].name().equals("Void Drill")) unlock("void-drill");
        if (level >= 5) unlock("level-5");
        return true;
    }

    // ================= input =================
    @Override public void keyPressed(KeyEvent e) {
        keys.add(e.getKeyCode());
        if (e.getKeyCode() == KeyEvent.VK_ENTER) {
            if (state.equals("title") || state.equals("dead") || state.equals("win")) startNewRun(new Random().nextLong() & Long.MAX_VALUE);
            else if (state.equals("shop")) state = "play";
        }
        if (e.getKeyCode() == KeyEvent.VK_SPACE) fireBolt();
        if (e.getKeyCode() == KeyEvent.VK_H) heal();
        if (e.getKeyCode() == KeyEvent.VK_M) automap = !automap;
        if (state.equals("shop")) {
            if (e.getKeyCode() == KeyEvent.VK_B) { buyPick(); }
            if (e.getKeyCode() == KeyEvent.VK_N) state = "play";
            if (e.getKeyCode() == KeyEvent.VK_U) {
                if (gold >= 150) {
                    gold -= 150;
                    vitals.boltDmg++;
                }
            }
        }
    }
    @Override public void keyReleased(KeyEvent e) { keys.remove(e.getKeyCode()); }
    @Override public void keyTyped(KeyEvent e) {}

    // ================= render =================
    @Override protected void paintComponent(Graphics g0) {
        super.paintComponent(g0);
        render();
        g0.drawImage(frame, 0, 0, getWidth(), getHeight(), null);
        g0.setColor(Color.WHITE);
        g0.setFont(new Font(Font.MONOSPACED, Font.BOLD, 13));
        String hud = String.format("Score %s  %s  Left %d  Gold %s  Lv %d  %s  HP %d  [SPACE zap/H heal]",
                Engine.compact(score), Data.LAYERS[depth], candies.size() + gems.size(),
                Engine.compact(gold), level, Data.PICKS[pickIdx].name(), Math.max(0, vitals.hp));
        g0.drawString(hud, 8, 18);
        if (flashT > 0) {
            g0.setColor(Color.YELLOW);
            g0.drawString(flashMsg, 8, 36);
        }
        drawMinimap(g0);
        if (automap) drawAutomap(g0);
        g0.setColor(Color.LIGHT_GRAY);
        g0.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        if (state.equals("title"))
            centerText(g0, "SPOOKTACULAR MAZE 3D — press ENTER  (WASD/arrows move)", 0);
        else if (state.equals("dead"))
            centerText(g0, "CAUGHT! Score " + Engine.compact(score) + " — ENTER to retry", 0);
        else if (state.equals("win"))
            centerText(g0, "SPOOKTACULAR! All depths cleared: " + Engine.compact(score) + " — ENTER", 0);
        else if (state.equals("shop")) {
            String bolt = "U: bolt damage +" + vitals.boltDmg + "->" + (vitals.boltDmg + 1) + " (150g)";
            String offer = pickIdx + 1 < Data.PICKS.length
                    ? ("B: buy " + Data.PICKS[pickIdx + 1].name() + " (" + Data.PICKS[pickIdx + 1].cost() + "g, you have " + gold + ")   " + bolt + "   N: descend")
                    : "Max pick! " + bolt + "   N: descend";
            centerText(g0, "MINE SHOP — " + offer, 0);
        }
    }

    private void centerText(Graphics g0, String s, int dy) {
        FontMetrics fm = g0.getFontMetrics();
        g0.drawString(s, (getWidth() - fm.stringWidth(s)) / 2, getHeight() / 2 + dy);
    }

    private void render() {
        int[] px2 = ((java.awt.image.DataBufferInt) frame.getRaster().getDataBuffer()).getData();
        int[] wall = PAL[depth][0], floor = PAL[depth][2], ceil = PAL[depth][3];
        double flick = 0.88 + 0.08 * Math.sin(time * 7) + 0.04 * Math.sin(time * 13);
        // ceiling + floor gradient
        for (int y = 0; y < VH; y++) {
            int[] c = y < VH / 2 ? ceil : floor;
            double shade = y < VH / 2 ? 1.0 : 0.4 + 0.6 * (1.0 - (double) (y - VH / 2) / (VH / 2));
            int col = rgb(c[0] * shade * flick, c[1] * shade * flick, c[2] * shade * flick);
            Arrays.fill(px2, y * VW, (y + 1) * VW, col);
        }
        // walls (DDA per column)
        for (int x = 0; x < VW; x++) {
            double camX = 2.0 * x / VW - 1;
            double rayX = dirX + planeX * camX, rayZ = dirZ + planeY * camX;
            int mapX = (int) px, mapZ = (int) pz;
            double dDX = Math.abs(1 / (rayX == 0 ? 1e-9 : rayX));
            double dDZ = Math.abs(1 / (rayZ == 0 ? 1e-9 : rayZ));
            int stepX, stepZ;
            double sDX, sDZ;
            if (rayX < 0) { stepX = -1; sDX = (px - mapX) * dDX; } else { stepX = 1; sDX = (mapX + 1 - px) * dDX; }
            if (rayZ < 0) { stepZ = -1; sDZ = (pz - mapZ) * dDZ; } else { stepZ = 1; sDZ = (mapZ + 1 - pz) * dDZ; }
            int side = 0, guard = 0;
            while (guard++ < 64) {
                if (sDX < sDZ) { sDX += dDX; mapX += stepX; side = 0; }
                else { sDZ += dDZ; mapZ += stepZ; side = 1; }
                if (!walkable(mapX, mapZ)) break;
            }
            double dist = (side == 0 ? sDX - dDX : sDZ - dDZ);
            if (dist < 0.02) dist = 0.02;
            zbuffer[x] = dist;
            int lineH = (int) (VH / dist);
            int y0 = Math.max(0, VH / 2 - lineH / 2), y1 = Math.min(VH - 1, VH / 2 + lineH / 2);
            double wallX = side == 0 ? pz + dist * rayZ : px + dist * rayX;
            wallX -= Math.floor(wallX);
            int tx = Math.min(63, Math.max(0, (int) (wallX * 64)));
            double shade = (side == 0 ? 0.8 : 0.6) * flick / (1 + dist * dist * 0.045);
            for (int y = y0; y <= y1; y++) {
                int ty = Math.min(63, (y - (VH / 2 - lineH / 2)) * 64 / Math.max(1, lineH));
                int t = wallTex[ty][tx];
                int r = (t >> 16) & 255, gg = (t >> 8) & 255, b = t & 255;
                px2[y * VW + x] = rgb(r * shade, gg * shade, b * shade);
            }
        }
        drawSprites(px2);
    }

    private record Sprite(double x, double z, int kind, double size) {}
    // kinds: 0 candy, 1 gem, 2 relic, 3 pond, 4 ghost, 5 bolt, 6 wolf, 7 portal

    private void drawSprites(int[] px2) {
        List<Sprite> spr = new ArrayList<>();
        for (double[] c : candies) spr.add(new Sprite(c[0], c[1], 0, 0.45));
        for (double[] c : gems) spr.add(new Sprite(c[0], c[1], 1, 0.55));
        if (relicSpot != null) spr.add(new Sprite(relicSpot[0], relicSpot[1], 2, 0.6));
        if (pond != null && !pondUsed) spr.add(new Sprite(pond[0], pond[1], 3, 0.8));
        spr.add(new Sprite(ghostX, ghostZ, 4, 0.9));
        for (World.Bolt b : bolts) spr.add(new Sprite(b.x, b.z, 5, 0.35));
        for (World.Wolf w : wolves) spr.add(new Sprite(w.x, w.z, 6, 0.8));
        for (World.Portal p : portals) spr.add(new Sprite(p.x(), p.z(), 7, 1.0));
        double invDet = 1.0 / (planeX * dirZ - dirX * planeY);
        spr.sort((a, b) -> Double.compare(dist2(b), dist2(a)));
        for (Sprite s : spr) {
            double relX = s.x() - px, relZ = s.z() - pz;
            double tX = invDet * (dirZ * relX - dirX * relZ);
            double tY = invDet * (-planeY * relX + planeX * relZ);
            if (tY <= 0.1) continue;
            int sx = (int) ((VW / 2.0) * (1 + tX / tY));
            int size = Math.min(VH * 2, (int) Math.abs(VH / tY * s.size()));
            int yOff = (int) (VH / tY * 0.1);
            drawSpriteTex(px2, sx, size, yOff, tY, s.kind());
        }
    }

    private double dist2(Sprite s) {
        double dx = s.x() - px, dz = s.z() - pz;
        return dx * dx + dz * dz;
    }

    private void drawSpriteTex(int[] px2, int sx, int size, int yOff, double depth, int kind) {
        int y0 = VH / 2 - size / 2 - yOff;
        for (int stripe = -size / 2; stripe < size / 2; stripe++) {
            int x = sx + stripe;
            if (x < 0 || x >= VW || depth >= zbuffer[x]) continue;
            double u = (stripe + size / 2.0) / size;
            for (int y = 0; y < size; y++) {
                int yy = y0 + y;
                if (yy < 0 || yy >= VH) continue;
                double v = (double) y / size;
                int col = spritePixel(kind, u, v, depth);
                if (col >= 0) px2[yy * VW + x] = col;
            }
        }
    }

    /** Procedural sprite texel, -1 = transparent. */
    private int spritePixel(int kind, double u, double v, double depth) {
        double dx = u - 0.5, dy = v - 0.5, d = Math.hypot(dx, dy);
        double shade = 1.0 / (1 + depth * depth * 0.05);
        int r, g, b;
        switch (kind) {
            case 0 -> { // candy: orange orb
                if (d > 0.42) return -1;
                r = 255; g = 140; b = 20;
            }
            case 1 -> { // gem: cyan diamond
                if (Math.abs(dx) + Math.abs(dy) > 0.45) return -1;
                r = 90; g = 230; b = 255;
            }
            case 2 -> { // relic: stone gray block
                if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) return -1;
                r = 150; g = 145; b = 160;
            }
            case 3 -> { // pond: blue pool
                if (d > 0.48) return -1;
                r = 40; g = 120; b = 255;
            }
            case 5 -> { // bolt: cyan streak
                if (Math.abs(dx) > 0.1) return -1;
                r = 160; g = 255; b = 255;
            }
            case 6 -> { // wolf: dark beast with ears
                boolean ear = v < 0.28 && Math.abs(Math.abs(dx) - 0.24) < 0.1;
                if (d > 0.42 && !ear) return -1;
                if (ear) { r = 60; g = 40; b = 30; }
                else { r = 110; g = 80; b = 55; }
            }
            case 7 -> { // portal: violet swirl ring
                if (d < 0.12 || d > 0.46) return -1;
                double band = ((d * 9 + time * 2) % 1.0);
                if (band < 0.5) { r = 190; g = 90; b = 255; }
                else { r = 255; g = 90; b = 220; }
            }
            default -> { // ghost: pale body + dark eyes
                if (d > 0.45 || v > 0.9) return -1;
                boolean eye = Math.hypot(dx - 0.15, dy + 0.08) < 0.09 || Math.hypot(dx + 0.15, dy + 0.08) < 0.09;
                if (eye) { r = 20; g = 20; b = 40; }
                else { r = 235; g = 235; b = 245; }
            }
        }
        return rgb(r * shade, g * shade, b * shade);
    }

    private void drawAutomap(Graphics g0) {
        int n = Math.max(maze.w(), maze.d());
        double k = Math.min(getWidth(), getHeight() - 40) / (n + 2);
        int ox = (int) ((getWidth() - maze.w() * k) / 2), oy = 30;
        g0.setColor(new Color(5, 2, 14, 230));
        g0.fillRect(0, 0, getWidth(), getHeight());
        g0.setColor(new Color(120, 80, 200));
        g0.drawString("AUTOMAP — " + Data.LAYERS[depth] + " (M to close)", ox, 18);
        for (Cell c : maze.open())
            g0.fillRect(ox + (int) (c.x() * k), oy + (int) (c.z() * k), Math.max(1, (int) k), Math.max(1, (int) k));
        g0.setColor(Color.ORANGE);
        for (double[] c : candies) g0.fillRect(ox + (int) ((c[0] - 0.5) * k), oy + (int) ((c[1] - 0.5) * k), 4, 4);
        g0.setColor(Color.CYAN);
        for (double[] c : gems) g0.fillRect(ox + (int) ((c[0] - 0.5) * k), oy + (int) ((c[1] - 0.5) * k), 4, 4);
        g0.setColor(new Color(139, 92, 46));
        for (World.Wolf w : wolves) g0.fillOval(ox + (int) (w.x * k) - 3, oy + (int) (w.z * k) - 3, 6, 6);
        g0.setColor(new Color(190, 90, 255));
        for (World.Portal p : portals) g0.fillOval(ox + (int) (p.x() * k) - 3, oy + (int) (p.z() * k) - 3, 6, 6);
        g0.setColor(Color.RED);
        g0.fillOval(ox + (int) (ghostX * k) - 3, oy + (int) (ghostZ * k) - 3, 6, 6);
        g0.setColor(Color.YELLOW);
        g0.fillOval(ox + (int) (px * k) - 3, oy + (int) (pz * k) - 3, 6, 6);
    }

    private void drawMinimap(Graphics g0) {
        int s = 120, n = maze.w();
        double k = (double) s / n;
        int ox = getWidth() - s - 8, oy = getHeight() - s - 8;
        g0.setColor(new Color(11, 6, 32, 200));
        g0.fillRect(ox, oy, s, s);
        g0.setColor(new Color(70, 40, 130));
        for (Cell c : maze.open()) g0.fillRect(ox + (int) (c.x() * k), oy + (int) (c.z() * k), Math.max(1, (int) k), Math.max(1, (int) k));
        g0.setColor(Color.ORANGE);
        for (double[] c : candies) g0.fillRect(ox + (int) ((c[0] - 0.5) * k), oy + (int) ((c[1] - 0.5) * k), 3, 3);
        g0.setColor(Color.CYAN);
        for (double[] c : gems) g0.fillRect(ox + (int) ((c[0] - 0.5) * k), oy + (int) ((c[1] - 0.5) * k), 3, 3);
        g0.setColor(Color.RED);
        g0.fillOval(ox + (int) (ghostX * k) - 3, oy + (int) (ghostZ * k) - 3, 6, 6);
        g0.setColor(new Color(139, 92, 46));
        for (World.Wolf w : wolves)
            g0.fillOval(ox + (int) (w.x * k) - 2, oy + (int) (w.z * k) - 2, 4, 4);
        g0.setColor(new Color(190, 90, 255));
        for (World.Portal p : portals)
            g0.fillOval(ox + (int) (p.x() * k) - 2, oy + (int) (p.z() * k) - 2, 4, 4);
        g0.setColor(Color.YELLOW);
        g0.fillOval(ox + (int) (px * k) - 3, oy + (int) (pz * k) - 3, 6, 6);
    }
}
