package spooktacular.systems;

import java.time.LocalDate;
import java.util.*;

/** Daily challenges + store — ports of SpookyDailyChallenge,
 *  DailyChallengeEngine, SpookyDailyStore (notification delivery replaced by
 *  a portable reminder record the host delivers). */
public final class Daily {
    private Daily() {}

    public record Challenge(String id, String title, String detail, int targetGhosts,
                            int targetCandy, int bonusGold, int bonusXP,
                            int ghostsDone, int candyDone, boolean claimed) {
        public double progress() {
            double g = targetGhosts > 0 ? Math.min(ghostsDone, targetGhosts) / (double) targetGhosts : 1;
            double c = targetCandy > 0 ? Math.min(candyDone, targetCandy) / (double) targetCandy : 1;
            return (g + c) / 2;
        }
        public boolean isComplete() { return ghostsDone >= targetGhosts && candyDone >= targetCandy; }
        public Challenge withGhosts(int n) {
            return new Challenge(id, title, detail, targetGhosts, targetCandy, bonusGold, bonusXP, ghostsDone + Math.max(0, n), candyDone, claimed);
        }
        public Challenge withCandy(int n) {
            return new Challenge(id, title, detail, targetGhosts, targetCandy, bonusGold, bonusXP, ghostsDone, candyDone + Math.max(0, n), claimed);
        }
        public Challenge markClaimed() {
            return new Challenge(id, title, detail, targetGhosts, targetCandy, bonusGold, bonusXP, ghostsDone, candyDone, true);
        }
    }

    public static String challengeID(LocalDate date) { return date.toString(); }

    private static long seed(String s) {
        // FNV-1a offset basis as signed long (identical bit pattern to UInt64).
        long h = -3750763034362895579L;
        for (byte b : s.getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
            h ^= (b & 0xFF);
            h *= 1099511628211L;
        }
        return h;
    }

    private static String pick(long seed, long salt, String[] options) {
        return options[(int) Long.remainderUnsigned(seed + salt, options.length)];
    }

    public static Challenge generate(LocalDate date) {
        String id = challengeID(date);
        long s = seed(id);
        int[] ghostTargets = {3, 5, 8, 10, 12};
        int[] candyTargets = {15, 25, 40, 60, 80};
        int tg = ghostTargets[(int) Long.remainderUnsigned(s, ghostTargets.length)];
        int tc = candyTargets[(int) Long.remainderUnsigned(s >>> 16, candyTargets.length)];
        String theme = pick(s, 7, new String[]{"Pumpkin Hunt", "Haunted Harvest", "Midnight Mischief", "Candy Siege", "Full-Moon Frenzy"});
        return new Challenge(id, theme,
                "Capture " + tg + " ghosts and collect " + tc + " candies before midnight.",
                tg, tc, 60 + tg * 8 + tc, 80 + tg * 10 + tc * 2, 0, 0, false);
    }

    public record MidnightReminder(String identifier, String title, String body, int hour) {}

    public static class Store {
        private Challenge challenge;
        private final GameStore store;
        private static final String PREFIX = "spookyDaily.v1.";

        public Store() { this(LocalDate.now(), GameStore.standard); }
        public Store(LocalDate date, GameStore store) {
            this.store = store;
            String id = challengeID(date);
            String raw = store.str(PREFIX + id, null);
            Challenge loaded = raw == null ? null : decode(id, raw);
            challenge = loaded != null ? loaded : generate(date);
        }

        public Challenge challenge() { return challenge; }
        public void recordGhosts(int n) { challenge = challenge.withGhosts(n); persist(); }
        public void recordCandy(int n) { challenge = challenge.withCandy(n); persist(); }

        /** Returns {gold, xp} granted, or null if not claimable. */
        public int[] claim() {
            if (!challenge.isComplete() || challenge.claimed()) return null;
            challenge = challenge.markClaimed();
            persist();
            return new int[]{challenge.bonusGold(), challenge.bonusXP()};
        }

        public MidnightReminder midnightReminder() {
            return new MidnightReminder("spooky-daily", "Daily Haunt expires soon",
                    "Finish today's challenge before midnight for bonus gold!", 20);
        }

        private void persist() {
            Challenge c = challenge;
            store.set(PREFIX + c.id(), String.join("|", c.title(), c.detail(),
                    String.valueOf(c.targetGhosts()), String.valueOf(c.targetCandy()),
                    String.valueOf(c.bonusGold()), String.valueOf(c.bonusXP()),
                    String.valueOf(c.ghostsDone()), String.valueOf(c.candyDone()),
                    c.claimed() ? "1" : "0"));
        }

        private Challenge decode(String id, String raw) {
            try {
                String[] p = raw.split("\\|", -1);
                return new Challenge(id, p[0], p[1], Integer.parseInt(p[2]),
                        Integer.parseInt(p[3]), Integer.parseInt(p[4]), Integer.parseInt(p[5]),
                        Integer.parseInt(p[6]), Integer.parseInt(p[7]), p[8].equals("1"));
            } catch (Exception e) { return null; }
        }
    }
}
