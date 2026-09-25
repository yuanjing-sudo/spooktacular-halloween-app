package spooktacular.systems;

import java.util.*;
import java.util.function.Consumer;

/** Motion kit — ports of MineSmoother, MineOscillator, MineBeatClock,
 *  MineTween, MineOrchestra, MineFrameStopwatch, PortableClock. All timing
 *  runs on virtual schedulers (deterministic, headless-testable). */
public final class Motion {
    private Motion() {}

    /** Frame-rate-independent exponential damp (same feel at any fps). */
    public static class Smoother {
        public double current, lambda = 8.0;
        public Smoother(double current) { this.current = current; }
        public void step(double target, double dt) {
            double k = 1 - Math.exp(-lambda * Math.max(0, dt));
            current += (target - current) * k;
        }
        public void snap(double v) { current = v; }
    }

    /** Absolute-time oscillators (never drift). */
    public static final class Oscillator {
        private Oscillator() {}
        public static double sine(double now, double period, double phase) {
            return Math.sin(2 * Math.PI * now / Math.max(0.01, period) + phase);
        }
        public static double sine(double now, double period) { return sine(now, period, 0); }
        public static double triangle(double now, double period, double phase) {
            double t = ((now / Math.max(0.01, period) + phase / (2 * Math.PI)) % 1.0 + 1.0) % 1.0;
            return t < 0.5 ? t * 2 : 2 - t * 2;
        }
        public static double breathe(double now, double period, double amp, double phase) {
            return 1 + amp * sine(now, period, phase);
        }
        public static double pingPong(double now, double period, double phase) {
            double t = triangle(now, period, phase);
            return t * t * (3 - 2 * t);
        }
    }

    /** Shared beat clock (BPM rhythms for torches/ghosts/crystals). */
    public static class BeatClock {
        private int beat;
        private boolean running;
        public double bpm = 100;
        private Scheduler.VirtualTimer timer;
        public Scheduler scheduler = Scheduler.main;

        public BeatClock() {}
        public BeatClock(Scheduler s) { scheduler = s; }
        public int beat() { return beat; }
        public boolean running() { return running; }

        public void start() {
            stop();
            running = true;
            schedule();
        }

        public void stop() {
            if (timer != null) timer.invalidate();
            timer = null;
            running = false;
        }

        private void schedule() {
            double interval = 60.0 / Math.max(20, Math.min(240, bpm));
            timer = Scheduler.VirtualTimer.scheduled(scheduler, interval, false, t -> {
                if (!running) return;
                beat++;
                schedule();
            });
        }

        public double phase() {
            double interval = 60.0 / Math.max(20, Math.min(240, bpm));
            // phase since last whole beat boundary on virtual time
            double since = scheduler.now() % interval;
            return Math.max(0, Math.min(1, since / interval));
        }
    }

    /** Explicit tween driving 0..1 progress with any easing. */
    public static class Tween {
        private double progress;
        private boolean running;
        public Scheduler scheduler = Scheduler.main;
        private Scheduler.VirtualTimer timer;
        private double startTime = 0, duration = 1;
        private Easing.Curve easing = Easing.Curve.quadInOut;
        private Runnable done;

        public Tween() {}
        public Tween(Scheduler s) { scheduler = s; }
        public double progress() { return progress; }
        public boolean running() { return running; }
        public double value(double from, double to) { return Easing.map(easing, from, to, progress); }

        public void start(double duration, Easing.Curve easing, Runnable done) {
            stop();
            this.duration = Math.max(0.01, duration);
            this.easing = easing;
            this.done = done;
            progress = 0;
            running = true;
            startTime = scheduler.now();
            timer = Scheduler.VirtualTimer.scheduled(scheduler, 1.0 / 60, true, t -> tick());
        }

        public void stop() {
            if (timer != null) timer.invalidate();
            timer = null;
            running = false;
        }

        private void tick() {
            double t = (scheduler.now() - startTime) / duration;
            if (t >= 1) {
                progress = 1;
                stop();
                if (done != null) done.run();
            } else progress = t;
        }
    }

    /** Staggered multi-part sequences (parades, ceremonies). */
    public record OrchestraStep(double delay, boolean repeats, double interval) {
        public OrchestraStep(double delay) { this(delay, false, 1.0); }
    }

    public static class Orchestra {
        private int beat;
        private boolean running;
        private final List<Scheduler.VirtualTimer> timers = new ArrayList<>();
        private Consumer<Integer> onStep;
        public Scheduler scheduler = Scheduler.main;

        public Orchestra() {}
        public Orchestra(Scheduler s) { scheduler = s; }
        public int beat() { return beat; }
        public boolean running() { return running; }

        public void play(List<OrchestraStep> steps, boolean loop, Consumer<Integer> onStep) {
            stop();
            this.onStep = onStep;
            running = true;
            double cursor = 0;
            for (int i = 0; i < steps.size(); i++) {
                cursor += steps.get(i).delay();
                schedule(cursor, i, steps.get(i).repeats(), steps.get(i).interval());
            }
            if (loop) {
                double total = cursor + 0.5;
                timers.add(Scheduler.VirtualTimer.scheduled(scheduler, total, true, t -> {
                    beat = 0;
                    play(steps, true, onStep);
                }));
            }
        }

        private void schedule(double delay, int index, boolean repeats, double interval) {
            if (repeats) {
                final Scheduler.VirtualTimer[] loopHolder = new Scheduler.VirtualTimer[1];
                Scheduler.VirtualTimer kick = Scheduler.VirtualTimer.scheduled(scheduler, delay, false, t -> {
                    fire(index);
                    loopHolder[0] = Scheduler.VirtualTimer.scheduled(scheduler, interval, true, u -> fire(index));
                    timers.add(loopHolder[0]);
                });
                timers.add(kick);
            } else {
                timers.add(Scheduler.VirtualTimer.scheduled(scheduler, delay, false, t -> fire(index)));
            }
        }

        private void fire(int index) {
            beat = index + 1;
            if (onStep != null) onStep.accept(index);
        }

        public void stop() {
            timers.forEach(Scheduler.VirtualTimer::invalidate);
            timers.clear();
            running = false;
            beat = 0;
        }
    }

    /** Rolling frame-time stats (avg/p95 FPS, hitch share). */
    public static class FrameStopwatch {
        private final List<Double> samples = new ArrayList<>();
        private int tick;
        private static final int CAP = 120;

        public void record(double dt) {
            if (dt <= 0 || dt >= 1) return;
            samples.add(dt);
            while (samples.size() > CAP) samples.remove(0);
            tick++;
        }

        public int tick() { return tick; }
        public int count() { return samples.size(); }

        public double avgFPS() {
            if (samples.isEmpty()) return 60;
            double avg = samples.stream().mapToDouble(d -> d).average().orElse(1.0 / 60);
            return 1 / Math.max(avg, 1.0 / 1000);
        }

        public double p95FPS() {
            if (samples.isEmpty()) return 60;
            List<Double> s = new ArrayList<>(samples);
            Collections.sort(s);
            double dt = s.get(Math.min(s.size() - 1, (int) (s.size() * 0.95)));
            return 1 / Math.max(dt, 1.0 / 1000);
        }

        public double hitchShare() {
            if (samples.isEmpty()) return 0;
            return samples.stream().filter(d -> d > 1.0 / 30).count() / (double) samples.size();
        }

        public void reset() { samples.clear(); tick++; }
    }

    /** Vsync-style game clock on virtual time (was CADisplayLink). */
    public static class PortableClock {
        public interface TickHandler { void tick(double dt); }
        private final Map<UUID, TickHandler> handlers = new LinkedHashMap<>();
        private Double lastTime;
        private static final double MAX_DELTA = 1.0 / 20.0;
        private boolean pausedBySystem;
        private Scheduler.VirtualTimer timer;
        private final double fps;
        public Scheduler scheduler = Scheduler.main;

        public PortableClock() { this(30); }
        public PortableClock(int fps) { this.fps = Math.max(1, fps); }
        public PortableClock(int fps, Scheduler s) { this.fps = Math.max(1, fps); scheduler = s; }

        public void setSystemActive(boolean active) {
            if (active) {
                if (pausedBySystem) {
                    pausedBySystem = false;
                    lastTime = null;
                    if (!handlers.isEmpty()) startTimer();
                }
            } else if (timer != null) {
                pausedBySystem = true;
                timer.invalidate();
                timer = null;
            }
        }

        public UUID add(TickHandler h) {
            UUID id = UUID.randomUUID();
            handlers.put(id, h);
            lastTime = null;
            startTimer();
            return id;
        }

        public void remove(UUID id) {
            handlers.remove(id);
            if (handlers.isEmpty() && timer != null) { timer.invalidate(); timer = null; }
        }

        public void stop() {
            handlers.clear();
            if (timer != null) { timer.invalidate(); timer = null; }
        }

        public void pause() {
            if (timer != null) { timer.invalidate(); timer = null; }
        }

        public void resume() {
            lastTime = null;
            if (!handlers.isEmpty()) startTimer();
        }

        public void invalidate() { stop(); }

        public void tick(double now) {
            Double last = lastTime;
            lastTime = now;
            if (last == null) return;
            double dt = now - last;
            if (dt <= 0) return;
            dt = Math.min(dt, MAX_DELTA);
            for (TickHandler h : handlers.values()) h.tick(dt);
        }

        private void startTimer() {
            if (timer != null) timer.invalidate();
            timer = Scheduler.VirtualTimer.scheduled(scheduler, 1.0 / fps, true, t -> tick(scheduler.now()));
        }
    }
}
