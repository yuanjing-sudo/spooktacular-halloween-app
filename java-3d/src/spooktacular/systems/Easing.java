package spooktacular.systems;

/** Easing library — the 12 MineEasing curves verbatim, plus portable motion
 *  specs (same duration/damping parameters the SwiftUI animations used). */
public final class Easing {
    private Easing() {}

    public enum Curve {
        linear, quadIn, quadOut, quadInOut, cubicIn, cubicOut, cubicInOut,
        quartOut, sineInOut, backOut, elasticOut, bounceOut
    }

    public static double value(Curve c, double t) {
        double x = Math.min(1, Math.max(0, t));
        return switch (c) {
            case linear -> x;
            case quadIn -> x * x;
            case quadOut -> 1 - (1 - x) * (1 - x);
            case quadInOut -> x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
            case cubicIn -> x * x * x;
            case cubicOut -> 1 - Math.pow(1 - x, 3);
            case cubicInOut -> x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
            case quartOut -> 1 - Math.pow(1 - x, 4);
            case sineInOut -> -(Math.cos(Math.PI * x) - 1) / 2;
            case backOut -> 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
            case elasticOut -> {
                if (x == 0) yield 0.0;
                if (x == 1) yield 1.0;
                yield Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
            }
            case bounceOut -> {
                double n1 = 7.5625, d1 = 2.75, r;
                if (x < 1 / d1) r = n1 * x * x;
                else if (x < 2 / d1) { double tt = x - 1.5 / d1; r = n1 * tt * tt + 0.75; }
                else if (x < 2.5 / d1) { double tt = x - 2.25 / d1; r = n1 * tt * tt + 0.9375; }
                else { double tt = x - 2.625 / d1; r = n1 * tt * tt + 0.984375; }
                yield r;
            }
        };
    }

    public static double map(Curve c, double from, double to, double t) {
        return from + (to - from) * value(c, t);
    }

    public record Spec(Kind kind, double duration, double damping) {
        public enum Kind { linear, easeIn, easeOut, easeInOut, spring }
    }

    public static Spec spec(Curve c, double duration) {
        return switch (c) {
            case linear -> new Spec(Spec.Kind.linear, duration, 1);
            case quadIn, cubicIn -> new Spec(Spec.Kind.easeIn, duration, 1);
            case quadOut, cubicOut, quartOut -> new Spec(Spec.Kind.easeOut, duration, 1);
            case quadInOut, cubicInOut, sineInOut -> new Spec(Spec.Kind.easeInOut, duration, 1);
            case backOut -> new Spec(Spec.Kind.spring, duration, 0.6);
            case elasticOut -> new Spec(Spec.Kind.spring, duration, 0.35);
            case bounceOut -> new Spec(Spec.Kind.spring, duration, 0.5);
        };
    }

    /** Named spring presets (same response/damping as MineSpring). */
    public static final class Springs {
        private Springs() {}
        public static Spec snappy() { return new Spec(Spec.Kind.spring, 0.32, 0.6); }
        public static Spec bouncy() { return new Spec(Spec.Kind.spring, 0.5, 0.55); }
        public static Spec grand() { return new Spec(Spec.Kind.spring, 0.8, 0.6); }
        public static Spec wobbly() { return new Spec(Spec.Kind.spring, 0.55, 0.35); }
        public static Spec heavy() { return new Spec(Spec.Kind.spring, 0.7, 0.75); }
        public static Spec breathe(double duration) { return new Spec(Spec.Kind.easeInOut, duration, 1); }
    }

    /** Reduced-motion gate (host sets the flag from the OS setting). */
    public static final class Gate {
        private Gate() {}
        public static boolean reduceMotion;
        public static double particleScale() { return reduceMotion ? 0.25 : 1.0; }
        public static Spec specOrNull(Spec normal) { return reduceMotion ? null : normal; }
        public static boolean ambientLoopsAllowed() { return !reduceMotion; }
        public static int count(int n) { return Math.max(4, (int) (n * particleScale())); }
    }
}
