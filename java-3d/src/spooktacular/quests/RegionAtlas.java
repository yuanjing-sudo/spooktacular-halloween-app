package spooktacular.quests;

import java.util.*;

/** Region atlas, verbatim from MazeRegionAtlas. Generated. */
public final class RegionAtlas {
    private RegionAtlas() {}
    public record Region(String id, String name, String emoji, String bounds, String flavor, String tip, int bonusScore) {}
    public static List<Region> all() {
        List<Region> q = new ArrayList<>();
        q.add(new Region("northgate-west", "Northgate Warren", "🧱", "z < −120, x < 0", "Where the haulage thins and the dark gets opinionated. First stop past civilization, last stop before stories.", "Follow the west spine north until the torches give up.", 200));
        q.add(new Region("northgate-east", "Northgate Galleries", "🖼️", "z < −120, x ≥ 0", "Natural galleries of stone ribs. Miners swear the ribs hum. The ribs decline to comment.", "East spine, far north. Bring a light and an open mind.", 200));
        q.add(new Region("deeps-west", "Howling Deeps", "🌬️", "−120 ≤ z < −40, x < 0", "The wind down here has a voice and it practices scales. Crystals grow thick where the howling is worst.", "Best crystal odds in the west Deeps. Harvest whole caves.", 150));
        q.add(new Region("deeps-east", "Ember Deeps", "🔥", "−120 ≤ z < −40, x ≥ 0", "Warm walls, red seams, the smell of old campfires. Something cozy lives here. It pays rent in gold.", "Treasure rooms cluster in the warm band.", 150));
        q.add(new Region("heart-west", "The Heart", "💜", "−40 ≤ z < 40, x < 0", "The maze's living room: forks, chambers, closets, friends. If you're lost, you're probably here, and that's fine.", "Home base. Most closets per tunnel of anywhere.", 100));
        q.add(new Region("heart-east", "Lantern Row", "🏮", "−40 ≤ z < 40, x ≥ 0", "Somebody lit every tunnel here, once, a century ago. The lanterns never went out. Nobody asks why. (It's the wiring. Probably.)", "Safest monster odds. Farm combos here.", 100));
        q.add(new Region("warrens-west", "Tangle Warrens", "🌀", "40 ≤ z < 120, x < 0", "Forks inside forks inside forks. Bring chalk. The chalk lobby thanks you for your continued patronage.", "Fork Scout progress flies here.", 150));
        q.add(new Region("warrens-east", "Gilded Warrens", "👑", "40 ≤ z < 120, x ≥ 0", "Everything glitters and most of it is actually gold. The maze's jewelry box, left slightly open.", "Highest treasure density outside the Far Reaches.", 150));
        q.add(new Region("far-west", "Far Reaches West", "🌌", "z ≥ 120, x < 0", "Past the last torch, past the last map, past the last sensible decision. Boxy wisps vacation here.", "Golden Wisp odds peak at the edge of the world.", 300));
        q.add(new Region("far-east", "Far Reaches East", "🌠", "z ≥ 120, x ≥ 0", "The end of the line and the start of legends. The tunnels here were dug by something enormous, friendly, and gone.", "Marathon meters melt here. Sprint south to nowhere.", 300));
        return q;
    }

    /** Band lookup shared with the Swift atlas (z bands x east/west half). */
    public static Region at(double x, double z) {
        String band = z < -120 ? "northgate" : z < -40 ? "deeps" : z < 40 ? "heart" : z < 120 ? "warrens" : "far";
        String id = band + "-" + (x < 0 ? "west" : "east");
        return all().stream().filter(r -> r.id().equals(id)).findFirst().orElse(all().get(0));
    }
}