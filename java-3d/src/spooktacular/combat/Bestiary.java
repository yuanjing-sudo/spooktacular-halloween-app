package spooktacular.combat;

import java.util.*;

/** Hunter bestiary: all 39 field notes, verbatim from MazeBestiary. Generated. */
public final class Bestiary {
    private Bestiary() {}
    public record Note(String monster, String habitat, String tactic, String flavor) {}
    public static List<Note> all() {
        List<Note> q = new ArrayList<>();
        q.add(new Note("🟢 Slime", "Damp floors everywhere", "Walk up and bonk it. It bounces. You win.", "The tutorial monster. Jiggles when struck, apologizes never."));
        q.add(new Note("🧟 Zombie", "Dark straightaways", "Kite backward; it walks in a straight line, like its plans.", "Shambles with purpose and zero follow-through."));
        q.add(new Note("💀 Skeleton", "Bone-dry side drifts", "Ranged spells shine — it has no cover and no fear.", "All that remains of a miner who skipped leg day. Rattles ominously."));
        q.add(new Note("🕷️ Spider", "Ceilings and webs", "Fast! Hit first, keep moving, check the ceiling.", "Eight legs, all of them faster than you. Rude but fair."));
        q.add(new Note("🕷️ Cave Spider", "Deep cracks", "Even faster. Save sprint for the dodge, not the chase.", "The regular spider's overachieving cousin."));
        q.add(new Note("🦇 Bat", "High ceilings", "It dives in lines — step sideways at the screech.", "Navigates by echo. Finds you anyway. Impressive, annoying."));
        q.add(new Note("💥 Creeper", "Behind you (always behind you)", "One hit then retreat — it needs a moment. So do you.", "Hisses before it pops. The hiss is your cue to be elsewhere."));
        q.add(new Note("👾 Enderman", "Tall chambers", "Don't stare. Hit its feet. Apologize to no one.", "Rude to look at, ruder to fight. Teleports when embarrassed."));
        q.add(new Note("🧙 Witch", "Potion-scented nooks", "Interrupt the brewing arm first.", "Throws bottles with labels like 'ouch'. Excellent penmanship."));
        q.add(new Note("👻 Ghast", "Tall shafts", "It floats — aim up and keep cover between volleys.", "Cries like a kettle. Explodes like a kettle. Do not hug."));
        q.add(new Note("🟧 Magma Cube", "Warm bands", "Splits when struck? Hit the big one hardest, first.", "A slime that chose violence and central heating."));
        q.add(new Note("🔥 Blaze", "Hot junctions", "Strafe in circles; its volleys lead the target.", "On fire, emotionally and otherwise. Douse with damage."));
        q.add(new Note("💀 Wither Skeleton", "Ashen drifts", "Tall and tanky — burst damage beats long duels.", "The skeleton's goth phase. It never ended."));
        q.add(new Note("🧟 Stray", "Cold pockets", "Slows your sprint — finish it before the second volley.", "A zombie that discovered winter and never recovered."));
        q.add(new Note("🧟 Husk", "Dry deeps", "Tanky but slow. Patience and pickaxes.", "Desiccated, dehydrated, and deeply committed to the bit."));
        q.add(new Note("🧟 Drowned", "Flooded nooks", "Lures you into water — fight from dry stone.", "Gurgles threats. The threats are real. The water is worse."));
        q.add(new Note("👻 Phantom", "Open caverns", "Watches from above, dives without warning. Keep moving.", "Insomnia given wings. It hasn't slept and neither will you."));
        q.add(new Note("📦 Shulker", "Chamber walls", "It IS the wall now. Burst it between volleys.", "A box with opinions about trespassing. Respect the box. Break the box."));
        q.add(new Note("👻 Vex", "Near evokers", "Tiny, fast, phases through rock. Swing where it's going, not where it is.", "A flying footnote to someone else's evil plan."));
        q.add(new Note("🏹 Pillager", "Patrolled tunnels", "Close distance fast — its bow hates point-blank.", "Crossbow enthusiast. Terrible at directions, great at volleys."));
        q.add(new Note("🪓 Vindicator", "Guard posts", "Heavy axe, slow swing. Dodge sideways, punish the whiff.", "Shouts its own name mid-charge. HR has been notified."));
        q.add(new Note("🔮 Evoker", "Rune chambers", "Kill summons first, then the evoker. Never the reverse.", "Middle management of the monster world. Summons interns (vexes)."));
        q.add(new Note("🐂 Ravager", "Wide junctions", "It charges in lines — pillars are your best friends.", "A bull with a grudge against architecture. And you."));
        q.add(new Note("⚔️ Dungeon Guardian", "Sealed doors", "Rare and proud. Save cooldowns, burst on openings.", "Has guarded the same door for a century. The door is gone. The duty remains."));
        q.add(new Note("💎 Crystal Golem", "Crystal caves", "Drops gems when cracked. Aim for the glowing joints.", "A walking payday with anger issues. Polished, literally."));
        q.add(new Note("🌑 Shadow Beast", "Unlit stretches", "Bring light — it fights worse while visible.", "Mostly shadow, partly beast, entirely done with lanterns."));
        q.add(new Note("🌌 Void Walker", "Reality-thin spots", "Blinks around. Watch the shimmer, swing at the landing.", "Commutes through the void to menace you specifically."));
        q.add(new Note("💀 Eternal Skeleton", "Ancient floors", "Outlast it — it cannot outlast you (god-mode).", "Old as the maze, twice as stubborn, half as fast."));
        q.add(new Note("👑 Elder Guardian", "Flooded vaults", "Boss: clear adds, burst the eye, respect the slam.", "Royalty of the deep. Its crown is real. So is its temper."));
        q.add(new Note("💀 Wither", "Ashen arenas", "Boss: three heads, zero mercy. Keep moving, always.", "The final exam of the monster curriculum. Study: running."));
        q.add(new Note("🐉 Ender Dragon", "The biggest chamber", "Boss: dodge the dives, punish the perches.", "A dragon. In your maze. It has notes on your interior design."));
        q.add(new Note("👿 Void Lord", "Beyond the far torches", "Boss: phases fast, hits hardest. Max pick, max nerve.", "Middle manager of the abyss. Your expeditions are its quarterly review."));
        q.add(new Note("🌑 Shadow King", "The darkest junction", "Boss: the maze's final answer. Everything you learned, at once.", "Bows before duels. Fights dirty after them."));
        q.add(new Note("📦 Boxy Mole", "Wherever tunnels feel lonely", "FRIEND. Feed it (journal button). It digs straight and loves you.", "A cube that digs. Strong opinions on soil. Stronger feelings for you."));
        q.add(new Note("📦 Boxy Bat", "High ceilings, square flight paths", "FRIEND. Flies in squares because squares are honest.", "Navigates by echo and vibes. Mostly vibes."));
        q.add(new Note("📦 Boxy Axolotl", "Damp nooks", "FRIEND. Smiles with its whole cube. Feed for maximum smile.", "Never grew up, never will. Regrows corners. An inspiration."));
        q.add(new Note("📦 Boxy Fox", "Golden-lit drifts", "FRIEND. Too cool for corners it didn't choose. Gifts anyway.", "Sly, cubical, untouchably cool. Leaves gifts to maintain mystique."));
        q.add(new Note("✨ Golden Wisp", "Far Reaches, past the last torch", "FRIEND (legendary). Richest gifts in the maze. Follow the glow.", "A glowing rumor that pays 300 XP per sighting. Believe."));
        return q;
    }
}