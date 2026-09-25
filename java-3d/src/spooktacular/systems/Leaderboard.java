package spooktacular.systems;

import java.util.*;

/** Persistent leaderboard — port of SpookyProLeaderboard (prefs JSON-free). */
public class Leaderboard {
    public record Entry(String name, int score, int level) implements Comparable<Entry> {
        public int compareTo(Entry o) { return Integer.compare(o.score, score); }
    }

    private final List<Entry> entries = new ArrayList<>();
    private final GameStore store;
    private static final String KEY = "spookyLeaderboard.v1";

    public Leaderboard() { this(GameStore.standard); }
    public Leaderboard(GameStore store) {
        this.store = store;
        load();
    }

    public void record(String name, int score, int level) {
        entries.add(new Entry(name, score, level));
        Collections.sort(entries);
        save();
    }

    public List<Entry> top(int n) { return entries.subList(0, Math.max(0, Math.min(n, entries.size()))); }
    public int bestScore() { return entries.isEmpty() ? 0 : entries.get(0).score(); }
    public int rank(int score) { return (int) entries.stream().filter(e -> e.score() > score).count() + 1; }

    public void clear() {
        entries.clear();
        save();
    }

    private void save() {
        StringJoiner j = new StringJoiner(";");
        for (Entry e : entries) j.add(e.name().replace(";", ",") + "|" + e.score() + "|" + e.level());
        store.set(KEY, j.toString());
    }

    private void load() {
        String raw = store.str(KEY, "");
        if (raw.isEmpty()) return;
        for (String row : raw.split(";")) {
            String[] p = row.split("\\|", -1);
            if (p.length == 3) {
                try { entries.add(new Entry(p[0], Integer.parseInt(p[1]), Integer.parseInt(p[2]))); }
                catch (NumberFormatException ignored) {}
            }
        }
        Collections.sort(entries);
    }
}
