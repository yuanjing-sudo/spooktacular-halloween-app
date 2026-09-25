package spooktacular.combat;

import java.util.List;

/** Avatar-world combat + travel, ported from AvatarWorld.swift:
 *  bolt shooting (nearest-in-range, speed 18, life 1.2s), wolf stalk/circle/
 *  bite AI, ghost blast rewards, walk-in portals between worlds, player vitals.
 *  SceneKit nodes are replaced by plain x/z state; all numbers verbatim. */
public final class World {
    private World() {}

    /** The five themed worlds portals travel between. */
    public static List<String> levels() {
        return List.of("Spooky Forest", "Ghost Cave", "Haunted House", "Lava World", "Tunnel Maze");
    }

    /** Player vitals (manager hp/maxHp/boltDmg, heal +50). */
    public static class Vitals {
        public int hp = 100, maxHp = 100, boltDmg = 1;

        /** Returns true if healed. */
        public boolean heal() {
            if (hp >= maxHp) return false;
            hp = Math.min(maxHp, hp + 50);
            return true;
        }

        public void hurt(int n) { hp -= n; }
        public boolean alive() { return hp > 0; }
    }

    /** Ghost-hunter bolt: cyan shot, speed 18, life 1.2s. */
    public static class Bolt {
        public double x, z, vx, vz, life = 1.2;

        public Bolt(double x, double z, double dx, double dz) {
            this.x = x;
            this.z = z;
            double l = Math.max(0.01, Math.hypot(dx, dz));
            this.vx = dx / l * 18;
            this.vz = dz / l * 18;
        }

        public void step(double dt) {
            x += vx * dt;
            z += vz * dt;
            life -= dt;
        }

        public boolean alive() { return life > 0; }
    }

    /** Wolf enemy: hp 2, stalks within 7 at speed 2.6, circles at 2.5,
     *  bites within 1.3 for 6 with a 1s cooldown. Killed: 8-12 gold. */
    public static class Wolf {
        public double x, z, yaw, hp = 2, wait, wx, wz, lastBite = -10;
        public boolean noticed;

        public Wolf(double x, double z) {
            this.x = x;
            this.z = z;
            this.wx = x;
            this.wz = z;
        }

        public enum Event { NONE, NOTICED, BITE }

        /** Steering + bite checks. Walls blocks movement via the given test. */
        public Event update(double px, double pz, double dt, double now,
                            java.util.function.BiPredicate<Double, Double> free) {
            double dx = px - x, dz = pz - z;
            double dist = Math.hypot(dx, dz);
            if (dist >= 7) {
                noticed = false;
                if (wait > 0) {
                    wait -= dt;
                } else {
                    double tx = wx - x, tz = wz - z;
                    if (Math.hypot(tx, tz) < 0.5) {
                        wait = 2;
                    } else if (free.test(x + tx * dt, z + tz * dt)) {
                        x += tx * dt * 1.2;
                        z += tz * dt * 1.2;
                    }
                }
                return Event.NONE;
            }
            boolean first = !noticed;
            noticed = true;
            if (dist > 2.5) {
                yaw = lerpAngle(yaw, Math.atan2(dx, dz), Math.min(1, dt * 5));
                double nx = x + Math.sin(yaw) * 2.6 * dt, nz = z + Math.cos(yaw) * 2.6 * dt;
                if (free.test(nx, nz)) { x = nx; z = nz; }
            } else {
                yaw += dt * 1.2;
                double ox = px + Math.sin(yaw) * 2.5, oz = pz + Math.cos(yaw) * 2.5;
                if (free.test(ox, oz)) { x = ox; z = oz; }
                yaw = lerpAngle(yaw, Math.atan2(dx, dz), Math.min(1, dt * 3));
            }
            if (dist < 1.3 && now - lastBite >= 1.0) {
                lastBite = now;
                return first ? Event.NOTICED : Event.BITE;
            }
            return first ? Event.NOTICED : Event.NONE;
        }

        private static double lerpAngle(double a, double b, double t) {
            double d = b - a;
            while (d > Math.PI) d -= 2 * Math.PI;
            while (d < -Math.PI) d += 2 * Math.PI;
            return a + d * Math.min(1, Math.max(0, t));
        }
    }

    /** Walk-in portal: hint within 9 (maze scale: 3 cells), travel within 1.7. */
    public record Portal(double x, double z, int toLevel, String label) {}

    /** Ghost blast reward roll (5-15 gold), wolf reward roll (8-12 gold). */
    public static int ghostReward(java.util.Random r) { return 5 + r.nextInt(11); }
    public static int wolfReward(java.util.Random r) { return 8 + r.nextInt(5); }
}
