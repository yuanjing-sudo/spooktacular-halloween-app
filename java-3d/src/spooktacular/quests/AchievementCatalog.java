package spooktacular.quests;

import spooktacular.data.Data;
import spooktacular.systems.Fishing;
import spooktacular.systems.Store;
import java.util.*;

/** All achievements, verbatim checks from MineAchievementCatalog. Generated. */
public final class AchievementCatalog {
    private AchievementCatalog() {}
    public static List<Achievement> all() {
        List<Achievement> q = new ArrayList<>();
        q.add(new Achievement("d-break-50", "Delver", "Rockbreaker", "Break 50 blocks.", "🧱", 100, 60, s -> s.player().blocksMined >= 50, s -> new int[]{Math.min(s.player().blocksMined, 50), 50}));
        q.add(new Achievement("d-break-500", "Delver", "Quarryheart", "Break 500 blocks.", "🏗️", 800, 500, s -> s.player().blocksMined >= 500, s -> new int[]{Math.min(s.player().blocksMined, 500), 500}));
        q.add(new Achievement("d-break-2500", "Delver", "Mountain Eater", "Break 2,500 blocks.", "⛰️", 2500, 1500, s -> s.player().blocksMined >= 2500, s -> new int[]{Math.min(s.player().blocksMined, 2500), 2500}));
        q.add(new Achievement("d-break-10000", "Delver", "Geological Event", "Break 10,000 blocks.", "🌋", 8000, 5000, s -> s.player().blocksMined >= 10000, s -> new int[]{Math.min(s.player().blocksMined, 10000), 10000}));
        q.add(new Achievement("d-magma", "Delver", "Core Touched", "Reach the Magma Core.", "🔥", 600, 400, s -> s.player().deepestY <= -4.5, s -> new int[]{s.player().deepestY <= -4.5 ? 1 : 0, 1}));
        q.add(new Achievement("d-sectors-5", "Delver", "Wayfinder", "Map 5 sectors.", "🧭", 500, 300, s -> s.player().sectorsFound.size() >= 5, s -> new int[]{Math.min(s.player().sectorsFound.size(), 5), 5}));
        q.add(new Achievement("d-sectors-9", "Delver", "Omnipresent", "Map all 9 sectors.", "🗺️", 1200, 800, s -> s.player().sectorsFound.size() >= 9, s -> new int[]{Math.min(s.player().sectorsFound.size(), 9), 9}));
        q.add(new Achievement("d-caves-3", "Delver", "Spelunker", "Harvest 3 crystal caves.", "🔮", 700, 450, s -> (int) s.mineCaves().stream().filter(e -> e.harvested()).count() >= 3, s -> new int[]{(int) Math.min(s.mineCaves().stream().filter(e -> e.harvested()).count(), 3), 3}));
        q.add(new Achievement("d-frost-3", "Delver", "Icebreaker", "Harvest 3 frost pockets.", "❄️", 600, 400, s -> (int) s.mineFrost().stream().filter(e -> e.harvested()).count() >= 3, s -> new int[]{(int) Math.min(s.mineFrost().stream().filter(e -> e.harvested()).count(), 3), 3}));
        q.add(new Achievement("d-closets-10", "Delver", "Nosy", "Open 10 closets.", "🚪", 400, 250, s -> (int) s.mineClosets().stream().filter(e -> e.isOpened()).count() >= 10, s -> new int[]{(int) Math.min(s.mineClosets().stream().filter(e -> e.isOpened()).count(), 10), 10}));
        q.add(new Achievement("d-lava-proof", "Delver", "Lava Proof", "Stand where lava lives (y −5.2).", "🌋", 700, 450, s -> s.player().deepestY <= -5.2, s -> new int[]{s.player().deepestY <= -5.2 ? 1 : 0, 1}));
        q.add(new Achievement("t-gold-1k", "Tycoon", "First Thousand", "Hold 1,000 gold.", "💰", 200, 120, s -> s.player().gold >= 1000, s -> new int[]{s.player().gold >= 1000 ? 1 : 0, 1}));
        q.add(new Achievement("t-gold-25k", "Tycoon", "Vault Dweller", "Hold 25,000 gold.", "🏦", 1500, 900, s -> s.player().gold >= 25000, s -> new int[]{s.player().gold >= 25000 ? 1 : 0, 1}));
        q.add(new Achievement("t-gold-250k", "Tycoon", "Dragon Hoard", "Hold 250,000 gold.", "🐉", 6000, 3000, s -> s.player().gold >= 250000, s -> new int[]{s.player().gold >= 250000 ? 1 : 0, 1}));
        q.add(new Achievement("t-sell-10k", "Tycoon", "Merchant Prince", "Best single sale over 10,000.", "🧾", 1200, 700, s -> s.bestSale() >= 10000, s -> new int[]{s.bestSale() >= 10000 ? 1 : 0, 1}));
        q.add(new Achievement("t-pick-diamond", "Tycoon", "Diamond Standard", "Own a Diamond pick or better.", "💎⛏️", 800, 500, s -> s.player().pickTier >= 4, s -> new int[]{s.player().pickTier >= 4 ? 1 : 0, 1}));
        q.add(new Achievement("t-pick-drill", "Tycoon", "Maximum Spin", "Own the Void Drill.", "🌀⛏️", 2000, 1200, s -> s.player().pickTier == 6, s -> new int[]{s.player().pickTier == 6 ? 1 : 0, 1}));
        q.add(new Achievement("t-pack-3", "Tycoon", "Pack Rat King", "Backpack tier 3+.", "🎒", 700, 400, s -> s.player().backpackTier >= 3, s -> new int[]{Math.min(s.player().backpackTier, 3), 3}));
        q.add(new Achievement("t-rod-3", "Tycoon", "Master Angler Gear", "Own the Warden's Rod.", "🎣", 900, 500, s -> s.rodTier() >= 3, s -> new int[]{Math.min(s.rodTier(), 3), 3}));
        q.add(new Achievement("t-pets-3", "Tycoon", "Full Crew", "Hatch 3 pets.", "🐾", 600, 400, s -> s.player().pets.size() >= 3, s -> new int[]{Math.min(s.player().pets.size(), 3), 3}));
        q.add(new Achievement("t-merchant-5", "Tycoon", "Regular Customer", "Buy from the merchant 5 times.", "🧳", 500, 300, s -> s.merchantDeals() >= 5, s -> new int[]{Math.min(s.merchantDeals(), 5), 5}));
        q.add(new Achievement("t-pack-5", "Tycoon", "Freight Emperor", "Backpack tier 5.", "🚂", 1400, 800, s -> s.player().backpackTier >= 5, s -> new int[]{Math.min(s.player().backpackTier, 5), 5}));
        q.add(new Achievement("a-first-catch", "Angler", "First Splash", "Catch any fish.", "🐟", 120, 80, s -> s.fishCaught().values().stream().mapToInt(i -> i).sum() >= 1, s -> new int[]{Math.min(s.fishCaught().values().stream().mapToInt(i -> i).sum(), 1), 1}));
        q.add(new Achievement("a-ten-fish", "Angler", "Creel Filler", "Catch 10 fish lifetime.", "🧺", 350, 220, s -> s.fishCaught().values().stream().mapToInt(i -> i).sum() >= 10, s -> new int[]{Math.min(s.fishCaught().values().stream().mapToInt(i -> i).sum(), 10), 10}));
        q.add(new Achievement("a-fifty-fish", "Angler", "Lake Legend", "Catch 50 fish lifetime.", "🏆", 1200, 800, s -> s.fishCaught().values().stream().mapToInt(i -> i).sum() >= 50, s -> new int[]{Math.min(s.fishCaught().values().stream().mapToInt(i -> i).sum(), 50), 50}));
        q.add(new Achievement("a-rare-fish", "Angler", "Something Glints", "Catch a Rare+ fish.", "✨", 400, 250, s -> s.fishCaught().keySet().stream().anyMatch(n -> !Fishing.rarityOf(n).equals("Common")), s -> new int[]{0, 0}));
        q.add(new Achievement("a-magma-fish", "Angler", "Hot Catch", "Catch any magma fish.", "🔥", 450, 300, s -> s.fishCaught().keySet().stream().anyMatch(n -> Fishing.waterOf(n).equals("Magma")), s -> new int[]{0, 0}));
        q.add(new Achievement("a-legend-fish", "Angler", "Myth Angler", "Catch a Legendary fish.", "🐉", 1500, 1000, s -> s.fishCaught().keySet().stream().anyMatch(n -> Fishing.rarityOf(n).equals("Legendary")), s -> new int[]{0, 0}));
        q.add(new Achievement("a-all-fresh", "Angler", "Freshwater Master", "Catch all 7 freshwater species.", "🌊", 1000, 700, s -> Fishing.forWater("Fresh").stream().allMatch(f -> s.fishCaught().getOrDefault(f.name(), 0) > 0), s -> new int[]{0, 0}));
        q.add(new Achievement("a-all-magma", "Angler", "Magma Master", "Catch all 7 magma species.", "🌋", 1400, 900, s -> Fishing.forWater("Magma").stream().allMatch(f -> s.fishCaught().getOrDefault(f.name(), 0) > 0), s -> new int[]{0, 0}));
        q.add(new Achievement("a-fish-market", "Angler", "Fishmonger", "Sell one haul for 500+.", "⚖️", 300, 200, s -> s.fishMarketBest() >= 500, s -> new int[]{0, 0}));
        q.add(new Achievement("s-first-friend", "Socialite", "Hello, Cube", "Greet a boxy critter.", "📦", 150, 100, s -> s.critters().stream().anyMatch(e -> e.greeted()), s -> new int[]{s.critters().stream().anyMatch(e -> e.greeted()) ? 1 : 0, 1}));
        q.add(new Achievement("s-five-friends", "Socialite", "Popular", "Greet 5 critters.", "🎉", 600, 400, s -> (int) s.critters().stream().filter(e -> e.greeted()).count() >= 5, s -> new int[]{(int) Math.min(s.critters().stream().filter(e -> e.greeted()).count(), 5), 5}));
        q.add(new Achievement("s-pet-hatch", "Socialite", "New Arrival", "Hatch a pet.", "🥚", 250, 150, s -> !s.player().pets.isEmpty(), s -> new int[]{s.player().pets.isEmpty() ? 0 : 1, 1}));
        q.add(new Achievement("s-pet-6", "Socialite", "Zoo Director", "Hatch 6 pets.", "🎪", 900, 600, s -> s.player().pets.size() >= 6, s -> new int[]{Math.min(s.player().pets.size(), 6), 6}));
        q.add(new Achievement("s-merchant-meet", "Socialite", "Sharp Dresser", "Buy from the traveling merchant.", "🧳", 200, 120, s -> s.merchantDeals() >= 1, s -> new int[]{Math.min(s.merchantDeals(), 1), 1}));
        q.add(new Achievement("s-ghost-wave", "Socialite", "Parade Marshal", "See 5+ events.", "👻", 450, 300, s -> s.eventsSeen() >= 5, s -> new int[]{Math.min(s.eventsSeen(), 5), 5}));
        q.add(new Achievement("s-bat-friend", "Socialite", "Bat Whisperer", "Repel 5 bats.", "🦇", 350, 220, s -> s.player().batsRepelled >= 5, s -> new int[]{Math.min(s.player().batsRepelled, 5), 5}));
        q.add(new Achievement("s-monster-10", "Socialite", "Bouncer", "Slay 10 monsters.", "⚔️", 400, 250, s -> s.player().monstersSlain >= 10, s -> new int[]{Math.min(s.player().monstersSlain, 10), 10}));
        q.add(new Achievement("e-first-relic", "Explorer", "Charm School", "Own any relic.", "🗿", 300, 200, s -> !s.relics().isEmpty(), s -> new int[]{s.relics().isEmpty() ? 0 : 1, 1}));
        q.add(new Achievement("e-relics-6", "Explorer", "Curio Cabinet", "Own 6 relics.", "🏛️", 1000, 700, s -> s.relics().size() >= 6, s -> new int[]{Math.min(s.relics().size(), 6), 6}));
        q.add(new Achievement("e-relics-all", "Explorer", "Completionist", "Own all 12 relics.", "👑", 3000, 2000, s -> s.relics().size() >= Data.RELICS.length, s -> new int[]{Math.min(s.relics().size(), Data.RELICS.length), Data.RELICS.length}));
        q.add(new Achievement("e-first-seal", "Explorer", "Lockpick", "Break a cave seal.", "🔓", 350, 220, s -> s.mineCaves().stream().anyMatch(e -> !e.isLocked() && !e.unlockCost().isEmpty()), s -> new int[]{0, 0}));
        q.add(new Achievement("e-seals-5", "Explorer", "Master of Keys", "Break 5 seals.", "🗝️", 1100, 750, s -> (int) s.mineCaves().stream().filter(e -> !e.isLocked() && !e.unlockCost().isEmpty()).count() >= 5, s -> new int[]{(int) Math.min(s.mineCaves().stream().filter(e -> !e.isLocked() && !e.unlockCost().isEmpty()).count(), 5), 5}));
        q.add(new Achievement("e-frost-all", "Explorer", "Winter Count", "Harvest all 5 frost pockets.", "❄️", 900, 600, s -> (int) s.mineFrost().stream().filter(e -> e.harvested()).count() >= 5, s -> new int[]{(int) Math.min(s.mineFrost().stream().filter(e -> e.harvested()).count(), 5), 5}));
        q.add(new Achievement("e-bombs-10", "Explorer", "Powder Monkey", "Mine 400 blocks (bomb fuel).", "🧨", 450, 300, s -> s.player().blocksMined >= 400, s -> new int[]{Math.min(s.player().blocksMined, 400), 400}));
        q.add(new Achievement("e-pack-5", "Explorer", "Freight Train", "Backpack tier 5.", "🚂", 1100, 700, s -> s.player().backpackTier >= 5, s -> new int[]{Math.min(s.player().backpackTier, 5), 5}));
        q.add(new Achievement("e-spin", "Explorer", "Wheel Watcher", "Spin the daily wheel.", "🎡", 150, 100, s -> !Store.str("mineLastSpinDay.v1", "").isEmpty(), s -> new int[]{0, 0}));
        q.add(new Achievement("e-streak-7", "Explorer", "Weekling", "7-day login streak.", "🔥", 800, 500, s -> Store.num("loginStreak.size()", 0) >= 7, s -> new int[]{0, 0}));
        q.add(new Achievement("p-rank-10", "Prestige", "Double Digits", "Reach rank 10.", "🔟", 400, 0, s -> s.player().level >= 10, s -> new int[]{Math.min(s.player().level, 10), 10}));
        q.add(new Achievement("p-rank-15", "Prestige", "Rebirth Ready", "Reach rank 15.", "🎓", 700, 0, s -> s.player().level >= 15, s -> new int[]{Math.min(s.player().level, 15), 15}));
        q.add(new Achievement("p-rank-25", "Prestige", "Living Monument", "Reach rank 25.", "🗿", 1500, 0, s -> s.player().level >= 25, s -> new int[]{Math.min(s.player().level, 25), 25}));
        q.add(new Achievement("p-rebirth-1", "Prestige", "Second Life", "Rebirth once.", "💫", 0, 800, s -> s.player().rebirths >= 1, s -> new int[]{Math.min(s.player().rebirths, 1), 1}));
        q.add(new Achievement("p-rebirth-3", "Prestige", "Serial Rebirther", "Rebirth 3 times.", "♾️", 0, 2000, s -> s.player().rebirths >= 3, s -> new int[]{Math.min(s.player().rebirths, 3), 3}));
        q.add(new Achievement("p-rebirth-5", "Prestige", "Eternal Return", "Rebirth 5 times.", "☯️", 0, 5000, s -> s.player().rebirths >= 5, s -> new int[]{Math.min(s.player().rebirths, 5), 5}));
        q.add(new Achievement("p-drill-magma", "Prestige", "Core Diver", "Own the drill AND touch magma.", "🌋", 1800, 1200, s -> s.player().pickTier == 6 && s.player().deepestY <= -4.5, s -> new int[]{0, 0}));
        q.add(new Achievement("p-legend-pet", "Prestige", "Dragon Rumor True", "Hatch a Legendary pet.", "🐉", 1200, 800, s -> s.player().pets.stream().anyMatch(e -> e.rarity().equals("Legendary")), s -> new int[]{0, 0}));
        q.add(new Achievement("p-100k-xp", "Prestige", "XP Titan Jr.", "Earn 100,000 XP lifetime (quest-tracked).", "🌟", 2500, 0, s -> s.questBoard().lifetimeXP() >= 100000, s -> new int[]{Math.min(s.questBoard().lifetimeXP(), 100000), 100000}));
        q.add(new Achievement("p-all-sectors-gold", "Prestige", "Gilded Atlas", "Map all sectors with 10,000+ gold held.", "🗺️", 2000, 1200, s -> s.player().sectorsFound.size() >= 9 && s.player().gold >= 10000, s -> new int[]{0, 0}));
        q.add(new Achievement("p-millionaire", "Prestige", "Millionaire", "Hold 1,000,000 gold.", "💎", 8000, 4000, s -> s.player().gold >= 1000000, s -> new int[]{s.player().gold >= 1000000 ? 1 : 0, 1}));
        return q;
    }
}