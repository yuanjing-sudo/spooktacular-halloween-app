package spooktacular.systems;

/** Voxel raycaster — verbatim port of MineRaycaster (Amanatides & Woo). */
public final class Raycaster {
    private Raycaster() {}

    public record Vec(float x, float y, float z) {
        public Vec sub(Vec o) { return new Vec(x - o.x, y - o.y, z - o.z); }
        public Vec div(float s) { return new Vec(x / s, y / s, z / s); }
        public Vec addScaled(Vec d, float s) { return new Vec(x + d.x * s, y + d.y * s, z + d.z * s); }
        public float length() { return (float) Math.sqrt(x * x + y * y + z * z); }
        public float dot(Vec o) { return x * o.x + y * o.y + z * o.z; }
    }

    public record Hit(int x, int y, int z, float distance, float nx, float ny, float nz) {}

    @FunctionalInterface
    public interface Solid {
        boolean test(int x, int y, int z);
    }

    public static Hit castVoxel(Vec origin, Vec direction, float maxDistance, Solid solid) {
        int x = (int) Math.floor(origin.x());
        int y = (int) Math.floor(origin.y());
        int z = (int) Math.floor(origin.z());
        float len = direction.length();
        if (len <= 0) return null;
        Vec dir = direction.div(len);
        int stepX = dir.x() > 0 ? 1 : -1;
        int stepY = dir.y() > 0 ? 1 : -1;
        int stepZ = dir.z() > 0 ? 1 : -1;
        float tDX = dir.x() != 0 ? Math.abs(1 / dir.x()) : Float.POSITIVE_INFINITY;
        float tDY = dir.y() != 0 ? Math.abs(1 / dir.y()) : Float.POSITIVE_INFINITY;
        float tDZ = dir.z() != 0 ? Math.abs(1 / dir.z()) : Float.POSITIVE_INFINITY;
        float tMX = dir.x() != 0 ? (dir.x() > 0 ? (x + 1) - origin.x() : origin.x() - x) * tDX : Float.POSITIVE_INFINITY;
        float tMY = dir.y() != 0 ? (dir.y() > 0 ? (y + 1) - origin.y() : origin.y() - y) * tDY : Float.POSITIVE_INFINITY;
        float tMZ = dir.z() != 0 ? (dir.z() > 0 ? (z + 1) - origin.z() : origin.z() - z) * tDZ : Float.POSITIVE_INFINITY;
        float nx = 0, ny = 0, nz = 0, t = 0;
        for (int guard = 0; t <= maxDistance && guard < 512; guard++) {
            if (tMX < tMY && tMX < tMZ) {
                x += stepX; t = tMX; tMX += tDX;
                nx = -stepX; ny = 0; nz = 0;
            } else if (tMY < tMZ) {
                y += stepY; t = tMY; tMY += tDY;
                nx = 0; ny = -stepY; nz = 0;
            } else {
                z += stepZ; t = tMZ; tMZ += tDZ;
                nx = 0; ny = 0; nz = -stepZ;
            }
            if (t > maxDistance) return null;
            if (solid.test(x, y, z)) return new Hit(x, y, z, t, nx, ny, nz);
        }
        return null;
    }

    public static float rayDistance(Vec origin, Vec direction, Vec point) {
        float len = direction.length();
        if (len <= 0) return point.sub(origin).length();
        Vec d = direction.div(len);
        Vec to = point.sub(origin);
        float along = to.dot(d);
        if (along < 0) return to.length();
        return point.sub(origin.addScaled(d, along)).length();
    }
}
