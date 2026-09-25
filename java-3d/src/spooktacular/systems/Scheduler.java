package spooktacular.systems;

import java.util.*;
import java.util.function.Consumer;

/** Virtual-time scheduler: deterministic replacement for RunLoop timers.
 *  Hosts advance it from their frame loop; tests drive it manually. */
public class Scheduler {
    public static final Scheduler main = new Scheduler();
    private double now;
    private record Task(UUID id, double fireAt, Double interval, Consumer<UUID> action) {}
    private final Map<UUID, Task> tasks = new LinkedHashMap<>();

    public double now() { return now; }

    public UUID schedule(double delay, Consumer<UUID> action) {
        return schedule(delay, null, action);
    }

    public UUID schedule(double delay, Double repeating, Consumer<UUID> action) {
        UUID id = UUID.randomUUID();
        tasks.put(id, new Task(id, now + Math.max(0, delay), repeating, action));
        return id;
    }

    public void cancel(UUID id) { tasks.remove(id); }
    public void cancelAll() { tasks.clear(); }

    /** Advance virtual time, firing due tasks in chronological order. */
    public int advance(double dt) {
        double end = now + Math.max(0, dt);
        int fired = 0, guard = 0;
        while (guard++ < 100_000) {
            Task next = null;
            for (Task t : tasks.values())
                if (t.fireAt() <= end && (next == null || t.fireAt() < next.fireAt())) next = t;
            if (next == null) break;
            now = Math.max(now, next.fireAt());
            if (next.interval() != null && next.interval() > 0)
                tasks.put(next.id(), new Task(next.id(), next.fireAt() + next.interval(), next.interval(), next.action()));
            else
                tasks.remove(next.id());
            fired++;
            next.action().accept(next.id());
        }
        now = end;
        return fired;
    }

    /** Timer with the same shape as Foundation.Timer.scheduledTimer. */
    public static class VirtualTimer {
        private final Scheduler scheduler;
        private UUID id;
        private boolean valid = true;

        private VirtualTimer(Scheduler s) { scheduler = s; }

        public static VirtualTimer scheduled(double interval, boolean repeats, Consumer<VirtualTimer> block) {
            return scheduled(main, interval, repeats, block);
        }

        public static VirtualTimer scheduled(Scheduler s, double interval, boolean repeats, Consumer<VirtualTimer> block) {
            VirtualTimer t = new VirtualTimer(s);
            if (repeats) {
                t.id = s.schedule(interval, interval, u -> { if (t.valid) block.accept(t); });
            } else {
                t.id = s.schedule(interval, u -> {
                    if (!t.valid) return;
                    t.valid = false;
                    block.accept(t);
                });
            }
            return t;
        }

        public void invalidate() {
            valid = false;
            if (id != null) scheduler.cancel(id);
            id = null;
        }

        public boolean isValid() { return valid; }
    }
}
