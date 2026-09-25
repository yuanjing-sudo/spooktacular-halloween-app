package spooktacular.data;

import java.util.*;

/** Layer codex, verbatim. Generated. */
public final class LayerCodex {
    private LayerCodex() {}
    public record Layer(String title, String emoji, String depth, String pay, String danger, String flavor) {}
    public static List<Layer> all() {
        List<Layer> q = new ArrayList<>();
        q.add(new Layer("Sunlit Tops", "🌿", "y ≥ 3", "×1.0", "None. Birds, probably.", "Where every legend starts: daylight, dirt, and the smell of opportunity. Coal country."));
        q.add(new Layer("Dirt Tunnels", "🟫", "y 1…3", "×1.2", "Splinters, emotionally.", "The commute layer. Iron starts showing up if you squint at the walls hard enough."));
        q.add(new Layer("Stone Depths", "🪨", "y −1…1", "×1.5", "+1 rock toughness.", "Real mining begins. Gold veins, redstone hums, and the shaft down to serious money."));
        q.add(new Layer("Deepstone", "⬛", "y −3…−1", "×2.0", "+2 rock toughness.", "Dark, dense, double pay. Emeralds and wraiths. The wraiths are decorative (god-mode)."));
        q.add(new Layer("Crystal Hollows", "🔮", "y −4.5…−3", "×3.0", "+3 rock toughness.", "Caves of singing glass. Cubes, spikes, orbs — harvest whole caves for completion bonuses."));
        q.add(new Layer("Magma Core", "🔥", "y < −4.5", "×5.0", "+5 rock toughness. Lava glare.", "The bottom of the world and the top of the market. Opals, rubies, rebirth eligibility. Bring a drill."));
        return q;
    }
}