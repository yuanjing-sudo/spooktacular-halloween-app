package spooktacular.systems;

import spooktacular.engine.Engine;

import java.util.ArrayList;
import java.util.List;

/** Classic improved Perlin noise (2D) — verbatim port of PerlinNoise. */
public class PerlinNoise {
    private final int[] p = new int[512];

    public PerlinNoise(long seed) {
        Engine.RNG rng = new Engine.RNG(seed);
        List<Integer> perm = new ArrayList<>();
        for (int i = 0; i < 256; i++) perm.add(i);
        perm = rng.shuffle(perm);
        for (int i = 0; i < 512; i++) p[i] = perm.get(i & 255);
    }

    public PerlinNoise() { this(1337); }

    private static double fade(double t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    private static double lerp(double a, double b, double t) { return a + t * (b - a); }

    private static double grad(int hash, double x, double y) {
        return switch (hash & 7) {
            case 0 -> x + y;
            case 1 -> x - y;
            case 2 -> -x + y;
            case 3 -> -x - y;
            case 4 -> x;
            case 5 -> -x;
            case 6 -> y;
            default -> -y;
        };
    }

    public double noise(double x, double y) {
        int xi = ((int) Math.floor(x)) & 255;
        int yi = ((int) Math.floor(y)) & 255;
        double xf = x - Math.floor(x), yf = y - Math.floor(y);
        double u = fade(xf), v = fade(yf);
        int aa = p[p[xi] + yi], ab = p[p[xi] + yi + 1];
        int ba = p[p[xi + 1] + yi], bb = p[p[xi + 1] + yi + 1];
        return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
                lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v) * 1.42;
    }

    public double fbm(double x, double y, int octaves, double lacunarity, double gain) {
        double total = 0, norm = 0, amp = 0.5, freq = 1.0;
        for (int i = 0; i < Math.max(1, octaves); i++) {
            total += noise(x * freq, y * freq) * amp;
            norm += amp;
            amp *= gain;
            freq *= lacunarity;
        }
        return norm == 0 ? 0 : total / norm;
    }
}
