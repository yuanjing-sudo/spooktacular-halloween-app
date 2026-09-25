package spooktacular.systems;

import java.util.List;

/** Namespaced static helpers mirroring SpookyStore (bool/int/double/string,
 *  string arrays, day strings, login streaks, launch flags, danger-zone). */
public final class Store {
    private Store() {}
    private static final String P = "spooky.v1.";
    private static String k(String n) { return P + n; }

    public static boolean bool(String n, boolean def) {
        return GameStore.standard.has(k(n)) ? GameStore.standard.bool(k(n), def) : def;
    }
    public static void set(boolean v, String n) { GameStore.standard.set(k(n), v); }
    public static int num(String n, int def) {
        return GameStore.standard.has(k(n)) ? GameStore.standard.num(k(n), def) : def;
    }
    public static void set(int v, String n) { GameStore.standard.set(k(n), v); }
    public static double dbl(String n, double def) {
        return GameStore.standard.has(k(n)) ? GameStore.standard.dbl(k(n), def) : def;
    }
    public static void set(double v, String n) { GameStore.standard.set(k(n), v); }
    public static String str(String n, String def) {
        String v = GameStore.standard.str(k(n), null);
        return v == null ? def : v;
    }
    public static void set(String v, String n) { GameStore.standard.set(k(n), v); }
    public static List<String> stringArray(String n) { return GameStore.standard.stringArray(k(n)); }
    public static void set(List<String> v, String n) { GameStore.standard.setStrings(k(n), v); }
    public static void remove(String n) { GameStore.standard.remove(k(n)); }

    public static String todayString() {
        return java.time.LocalDate.now().toString(); // yyyy-MM-dd
    }

    public static Integer daysBetween(String older, String newer) {
        try {
            return (int) java.time.temporal.ChronoUnit.DAYS.between(
                    java.time.LocalDate.parse(older), java.time.LocalDate.parse(newer));
        } catch (Exception e) { return null; }
    }

    public record Streak(int streak, boolean isNewDay) {}
    public static Streak touchLoginStreak(String today) {
        String last = str("loginStreak.day", "");
        if (last.equals(today)) return new Streak(num("loginStreak.count", 1), false);
        int streak = 1;
        if (!last.isEmpty()) {
            Integer gap = daysBetween(last, today);
            if (gap != null && gap == 1) streak = num("loginStreak.count", 0) + 1;
        }
        set(streak, "loginStreak.count");
        set(today, "loginStreak.day");
        return new Streak(streak, true);
    }
    public static int loginStreak() { return num("loginStreak.count", 0); }
    public static boolean hasLaunchedBefore() { return bool("hasLaunchedBefore", false); }
    public static void markLaunched() { set(true, "hasLaunchedBefore"); }
}
