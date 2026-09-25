package spooktacular.quests;

/** Quest triggers — sealed records mirroring MineQuestTrigger (verbatim). */
public sealed interface Trigger permits Trigger.BreakBlocks, Trigger.MineOre,
        Trigger.SellGold, Trigger.EarnXP, Trigger.ReachLayer, Trigger.MapSectors,
        Trigger.OpenClosets, Trigger.HarvestCaves, Trigger.UnlockCaves,
        Trigger.HatchPets, Trigger.ForgePicks, Trigger.UpgradePacks,
        Trigger.Rebirth, Trigger.GreetCritters, Trigger.SlayMonsters,
        Trigger.ThrowBombs, Trigger.ReachDepth {
    record BreakBlocks(int n) implements Trigger {}
    record MineOre(String name, int n) implements Trigger {}
    record SellGold(int n) implements Trigger {}
    record EarnXP(int n) implements Trigger {}
    record ReachLayer(String name) implements Trigger {}
    record MapSectors(int n) implements Trigger {}
    record OpenClosets(int n) implements Trigger {}
    record HarvestCaves(int n) implements Trigger {}
    record UnlockCaves(int n) implements Trigger {}
    record HatchPets(int n) implements Trigger {}
    record ForgePicks(int n) implements Trigger {}
    record UpgradePacks(int n) implements Trigger {}
    record Rebirth(int n) implements Trigger {}
    record GreetCritters(int n) implements Trigger {}
    record SlayMonsters(int n) implements Trigger {}
    record ThrowBombs(int n) implements Trigger {}
    record ReachDepth(double depth) implements Trigger {}

    default String hint() {
        if (this instanceof BreakBlocks b) return "Break " + b.n() + " blocks";
        if (this instanceof MineOre m) return m.name().equals("any") ? "Mine " + m.n() + " ores" : "Mine " + m.n() + "x " + m.name();
        if (this instanceof SellGold s) return "Sell " + s.n() + " lifetime";
        if (this instanceof EarnXP e) return "Earn " + e.n() + " XP lifetime";
        if (this instanceof ReachLayer r) return "Reach " + r.name();
        if (this instanceof MapSectors m) return "Map " + m.n() + " sectors";
        if (this instanceof OpenClosets o) return "Open " + o.n() + " closets";
        if (this instanceof HarvestCaves h) return "Harvest " + h.n() + " crystal caves";
        if (this instanceof UnlockCaves u) return u.n() == 1 ? "Break a cave seal" : "Break " + u.n() + " cave seals";
        if (this instanceof HatchPets h) return "Hatch " + h.n() + " pets";
        if (this instanceof ForgePicks f) return "Forge " + f.n() + " pick upgrades";
        if (this instanceof UpgradePacks u) return "Upgrade backpack " + u.n() + "x";
        if (this instanceof Rebirth r) return r.n() == 1 ? "Rebirth once" : "Rebirth " + r.n() + "x";
        if (this instanceof GreetCritters g) return "Meet " + g.n() + " boxy critters";
        if (this instanceof SlayMonsters s) return "Slay " + s.n() + " monsters";
        if (this instanceof ThrowBombs t) return "Throw " + t.n() + " bombs";
        return "Touch the Magma Core";
    }
}
