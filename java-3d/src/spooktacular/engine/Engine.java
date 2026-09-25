package spooktacular.engine;

import java.util.*;

/** Pure game logic — exact port of the verified engine (Swift/Python mirrors).
 *  SeededRNG relies on Java long overflow == UInt64 wrap. No UI imports. */
public final class Engine {
    private Engine() {}

    // ---------- SeededRNG ----------
    public static final class RNG {
        private long state;
        public RNG(long seed) { state = seed == 0 ? 0x9E3779B97F4A7C15L : seed; }
        public long next() {
            state += 0x6D2B79F5L;
            long z = state;
            z = (z ^ (z >>> 15)) * (z | 1);
            z = z ^ (z + ((z ^ (z >>> 7)) * (z | 61)));
            return z ^ (z >>> 14);
        }
        public double nextDouble() { return (next() >>> 11) / (double) (1L << 53); }
        public int nextInt(int n) {
            if (n <= 0) return 0;
            return (int) (nextDouble() * n) % n;
        }
        public <T> T pick(List<T> a) { return a.get(nextInt(a.size())); }
        public <T> List<T> shuffle(List<T> a) {
            List<T> r = new ArrayList<>(a);
            for (int i = r.size() - 1; i > 0; i--) {
                int j = nextInt(i + 1);
                T t = r.get(i); r.set(i, r.get(j)); r.set(j, t);
            }
            return r;
        }
    }

    // ---------- Maze carver (DFS) ----------
    public record Cell(int x, int z) {}
    public record Maze(Set<Cell> open, int w, int d) {}

    public static Maze carveDFS(int w, int d, long seed) {
        RNG rng = new RNG(seed);
        w = Math.max(3, w | 1);
        d = Math.max(3, d | 1);
        boolean[][] grid = new boolean[w][d];
        grid[1][1] = true;
        Deque<Cell> stack = new ArrayDeque<>();
        stack.push(new Cell(1, 1));
        int steps = 0;
        int[][] dirs = {{2, 0}, {-2, 0}, {0, 2}, {0, -2}};
        while (!stack.isEmpty() && steps < w * d * 4) {
            steps++;
            Cell cur = stack.peek();
            List<int[]> opts = new ArrayList<>();
            for (int[] dd : dirs) {
                int nx = cur.x() + dd[0], nz = cur.z() + dd[1];
                if (nx > 0 && nx < w - 1 && nz > 0 && nz < d - 1 && !grid[nx][nz])
                    opts.add(new int[]{dd[0], dd[1], nx, nz});
            }
            if (!opts.isEmpty()) {
                int[] c = rng.pick(opts);
                grid[cur.x() + c[0] / 2][cur.z() + c[1] / 2] = true;
                grid[c[2]][c[3]] = true;
                stack.push(new Cell(c[2], c[3]));
            } else stack.pop();
        }
        Set<Cell> open = new HashSet<>();
        for (int x = 0; x < w; x++) for (int z = 0; z < d; z++)
            if (grid[x][z]) open.add(new Cell(x, z));
        return new Maze(open, w, d);
    }

    public static boolean connected(Set<Cell> cells) {
        Cell start = new Cell(1, 1);
        Set<Cell> seen = new HashSet<>(List.of(start));
        Deque<Cell> stack = new ArrayDeque<>(List.of(start));
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!stack.isEmpty()) {
            Cell c = stack.pop();
            for (int[] dd : dirs) {
                Cell n = new Cell(c.x() + dd[0], c.z() + dd[1]);
                if (cells.contains(n) && seen.add(n)) stack.push(n);
            }
        }
        return seen.equals(cells);
    }

    // ---------- A* (octile, corner rule, budget) ----------
    private record PQNode(Cell cell, double f, long seq) implements Comparable<PQNode> {
        public int compareTo(PQNode o) { return Double.compare(f, o.f); }
    }

    public static List<Cell> astar(Cell start, Cell goal,
                                   java.util.function.Predicate<Cell> walkable, int maxIter) {
        if (start.equals(goal)) return List.of(start);
        PriorityQueue<PQNode> open = new PriorityQueue<>();
        Map<Cell, Cell> came = new HashMap<>();
        Map<Cell, Double> g = new HashMap<>();
        Set<Cell> closed = new HashSet<>();
        g.put(start, 0.0);
        open.add(new PQNode(start, octile(start, goal), 0));
        long seq = 0;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
        double[] cost = {1, 1, 1, 1, 1.4142, 1.4142, 1.4142, 1.4142};
        int it = 0;
        while (!open.isEmpty() && it < maxIter) {
            it++;
            Cell cur = open.poll().cell();
            if (cur.equals(goal)) {
                LinkedList<Cell> path = new LinkedList<>();
                for (Cell c = cur; c != null; c = came.get(c)) path.addFirst(c);
                return path;
            }
            if (!closed.add(cur)) continue;
            for (int i = 0; i < 8; i++) {
                Cell nxt = new Cell(cur.x() + dirs[i][0], cur.z() + dirs[i][1]);
                if (closed.contains(nxt)) continue;
                if (dirs[i][0] != 0 && dirs[i][1] != 0) {
                    if (!walkable.test(new Cell(cur.x() + dirs[i][0], cur.z()))
                     && !walkable.test(new Cell(cur.x(), cur.z() + dirs[i][1]))) continue;
                }
                if (!walkable.test(nxt) && !nxt.equals(goal)) continue;
                double t = g.get(cur) + cost[i];
                if (t < g.getOrDefault(nxt, Double.POSITIVE_INFINITY)) {
                    came.put(nxt, cur);
                    g.put(nxt, t);
                    open.add(new PQNode(nxt, t + octile(nxt, goal), ++seq));
                }
            }
        }
        return null;
    }

    private static double octile(Cell a, Cell b) {
        double dx = Math.abs(a.x() - b.x()), dz = Math.abs(a.z() - b.z());
        return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz);
    }

    // ---------- scoring ----------
    public static double comboMult(int c) { return c <= 0 ? 1.0 : Math.min(3.0, 1.0 + c * 0.05); }

    public static int streakBonus(int s) {
        if (s <= 0) return 0;
        if (s >= 20) return 100 + (s - 20) * 5;
        if (s >= 10) return 40 + (s - 10) * 6;
        return s * 2;
    }

    public static int xpNext(int lv) { return Math.max(50, (int) Math.round(80.0 * Math.pow(1.28, Math.max(1, lv) - 1))); }

    public record XP(boolean leveled, int level, int xp) {}
    public static XP applyXP(int level, int xp, int earned) {
        level = Math.max(1, level);
        xp = Math.max(0, xp) + Math.max(0, earned);
        boolean leveled = false;
        while (xp >= xpNext(level)) { xp -= xpNext(level); level++; leveled = true; }
        return new XP(leveled, level, xp);
    }

    public static String compact(long n) {
        if (n < 1000) return Long.toString(n);
        if (n < 1_000_000) {
            double k = n / 1000.0;
            return (k == Math.floor(k)) ? ((long) k + "K") : String.format("%.1fK", k);
        }
        double m = n / 1_000_000.0;
        return (m == Math.floor(m)) ? ((long) m + "M") : String.format("%.1fM", m);
    }

    public static double ease(String kind, double t) {
        double x = Math.min(1.0, Math.max(0.0, t));
        return switch (kind) {
            case "linear" -> x;
            case "quadIn" -> x * x;
            case "quadOut" -> 1 - (1 - x) * (1 - x);
            case "quadInOut" -> x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
            case "cubicIn" -> x * x * x;
            case "cubicOut" -> 1 - Math.pow(1 - x, 3);
            case "cubicInOut" -> x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
            case "quartOut" -> 1 - Math.pow(1 - x, 4);
            case "sineInOut" -> -(Math.cos(Math.PI * x) - 1) / 2;
            case "backOut" -> 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
            case "elasticOut" -> {
                if (x == 0) yield 0.0;
                if (x == 1) yield 1.0;
                yield Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
            }
            case "bounceOut" -> {
                double n1 = 7.5625, d1 = 2.75, r;
                if (x < 1 / d1) r = n1 * x * x;
                else if (x < 2 / d1) { double tt = x - 1.5 / d1; r = n1 * tt * tt + 0.75; }
                else if (x < 2.5 / d1) { double tt = x - 2.25 / d1; r = n1 * tt * tt + 0.9375; }
                else { double tt = x - 2.625 / d1; r = n1 * tt * tt + 0.984375; }
                yield r;
            }
            default -> throw new IllegalArgumentException(kind);
        };
    }
}
