package spooktacular.quests;

import spooktacular.data.Data;
import spooktacular.data.Entities;

import java.util.List;
import java.util.Map;

/** Live-state surface the achievement checks read (was MineManager). */
public record Snapshot(
        Entities.MNPlayer player,
        List<Data.Relic> relics,
        Map<String, Integer> fishCaught,
        int rodTier,
        int merchantDeals,
        List<Entities.BoxyCritter> critters,
        List<Entities.CrystalCave> mineCaves,
        List<Entities.ClosetCache> mineClosets,
        List<Entities.FrostPocket> mineFrost,
        QuestBoard questBoard,
        int fishMarketBest,
        int bestSale,
        int eventsSeen) {

    public static Snapshot empty(QuestBoard qb) {
        return new Snapshot(new Entities.MNPlayer(), List.of(), Map.of(), 0, 0,
                List.of(), List.of(), List.of(), List.of(), qb, 0, 0, 0);
    }
}
