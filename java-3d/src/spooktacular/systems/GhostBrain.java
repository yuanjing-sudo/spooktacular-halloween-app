package spooktacular.systems;

/** Ghost AI brain — verbatim port of GhostBehaviorBrain. */
public final class GhostBrain {
    private GhostBrain() {}

    public enum State { lurking, hunting, fleeing, playful, enraged }

    public record Decision(State state, double speedMultiplier, double aggression) {}

    public static Decision decide(double hpFraction, boolean isBoss, int combo, int nearbyGhosts) {
        double hp = Math.min(1, Math.max(0, hpFraction));
        if (isBoss && hp < 0.3) return new Decision(State.enraged, 1.8, 0.9);
        if (hp < 0.25) return new Decision(State.fleeing, 1.5, 0.2);
        if (combo >= 10) return new Decision(State.hunting, 1.3, 0.8);
        if (nearbyGhosts >= 4) return new Decision(State.playful, 1.1, 0.4);
        if (hp < 0.6) return new Decision(State.hunting, 1.15, 0.6);
        return new Decision(State.lurking, 1.0, 0.3);
    }

    public static double dodgeChance(Decision d, boolean isShiny) {
        return Math.min(0.6, Math.max(0.05, d.aggression() * 0.35 + (isShiny ? 0.1 : 0)));
    }
}
