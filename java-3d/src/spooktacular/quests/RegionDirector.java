package spooktacular.quests;

import spooktacular.systems.GameStore;

import java.util.HashSet;
import java.util.Set;

/** Region discovery — logic port of MazeRegionDirector. */
public class RegionDirector {
    private final Set<String> mapped = new HashSet<>();
    private String currentId = "heart-west";
    private final GameStore store;

    public RegionDirector() { this(GameStore.standard); }
    public RegionDirector(GameStore store) {
        this.store = store;
        mapped.addAll(store.stringArray("mazeRegionsMapped.v1"));
    }

    public String currentId() { return currentId; }
    public Set<String> mapped() { return Set.copyOf(mapped); }

    /** Returns true if this region is newly mapped. */
    public boolean visit(RegionAtlas.Region region) {
        currentId = region.id();
        if (mapped.contains(region.id())) return false;
        mapped.add(region.id());
        store.setStrings("mazeRegionsMapped.v1", mapped);
        return true;
    }

    public void resetAll() {
        mapped.clear();
        currentId = "heart-west";
        store.setStrings("mazeRegionsMapped.v1", mapped);
    }
}
