package spooktacular.game;

import spooktacular.data.Block;
import spooktacular.data.Data;
import spooktacular.data.Entities;
import spooktacular.engine.Engine;
import spooktacular.quests.*;

import javax.swing.*;
import java.awt.*;
import java.util.*;
import java.util.List;

/** Playable mining-sim tycoon: swing, break, backpack, sell, picks, pets,
 *  rebirth — every action feeds the quest + achievement boards. */
public class MineSim extends JPanel {
    private static final int COLS = 14, ROWS = 9;

    private final QuestBoard quests;
    private final AchievementBoard achievements;
    private final ExpeditionBoard expeditions;
    private final Engine.RNG rng = new Engine.RNG(System.nanoTime());

    private final Entities.MNPlayer player = new Entities.MNPlayer();
    private long coal;
    private int sellValue, bestSale;
    private final List<Entities.CrystalCave> caves = new ArrayList<>();
    private final List<Entities.ClosetCache> closets = new ArrayList<>();
    private final List<Entities.FrostPocket> frost = new ArrayList<>();
    private final List<Entities.BoxyCritter> critters = new ArrayList<>();
    private final Map<String, Integer> fishCaught = new HashMap<>();
    private int hatched;

    private record Cell(Block block, double hp) {}
    private final Cell[][] grid = new Cell[ROWS][COLS];
    private final JButton[][] btns = new JButton[ROWS][COLS];

    private final JLabel status1 = new JLabel("", SwingConstants.CENTER);
    private final JLabel status2 = new JLabel("", SwingConstants.CENTER);
    private final JLabel message = new JLabel("Swing at glowing ore!", SwingConstants.CENTER);
    private final JPanel gridPanel = new JPanel(new GridLayout(ROWS, COLS, 2, 2));

    // band ore tables (band -> block weights), faithful tiers/values from Block
    private static final Block[] BAND0 = {Block.stone, Block.stone, Block.dirt, Block.coalOre, Block.ironOre};
    private static final Block[] BAND1 = {Block.stone, Block.deepslate, Block.coalOre, Block.ironOre, Block.goldOre, Block.lapisOre, Block.redstoneOre, Block.crystalCube};
    private static final Block[] BAND2 = {Block.deepslate, Block.goldOre, Block.emeraldOre, Block.rubyOre, Block.diamondOre, Block.opalOre, Block.crystalSpike, Block.crystalOrb, Block.frostOre, Block.glacierCrystal, Block.closetCrate};

    public MineSim(QuestBoard quests, AchievementBoard achievements, ExpeditionBoard expeditions) {
        super(new BorderLayout());
        this.quests = quests;
        this.achievements = achievements;
        this.expeditions = expeditions;
        quests.onReward = (g, x) -> {
            player.gold += g;
            earnXP(x);
            flash("Quest reward: +" + g + " gold, +" + x + " XP");
        };
        achievements.onReward = (g, x) -> {
            player.gold += g;
            earnXP(x);
            flash("Achievement reward: +" + g + " gold, +" + x + " XP");
        };
        for (int r = 0; r < ROWS; r++) for (int c = 0; c < COLS; c++) {
            JButton b = new JButton();
            b.setMargin(new Insets(1, 1, 1, 1));
            b.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 16));
            final int rr = r, cc = c;
            b.addActionListener(e -> swing(rr, cc));
            btns[r][c] = b;
            gridPanel.add(b);
        }
        JPanel top = new JPanel(new GridLayout(3, 1));
        top.add(status1);
        top.add(status2);
        message.setForeground(Color.ORANGE);
        top.add(message);
        add(top, BorderLayout.NORTH);
        add(gridPanel, BorderLayout.CENTER);
        JPanel actions = new JPanel(new GridLayout(2, 4));
        actions.add(btn("Sell backpack", this::sell));
        actions.add(btn("Buy pick", this::buyPick));
        actions.add(btn("Upgrade pack", this::upgradePack));
        actions.add(btn("Hatch egg (150g)", this::hatchEgg));
        actions.add(btn("Rebirth (Lv 15)", this::rebirth));
        actions.add(btn("New vein", e -> { newVein(); refresh(); }));
        actions.add(btn("Claim quests", e -> { claimAll(); refresh(); }));
        actions.add(btn("Fish: cast Fresh", e -> fish("Fresh")));
        add(actions, BorderLayout.SOUTH);
        newVein();
        refresh();
    }

    private JButton btn(String t, java.util.function.Consumer<java.awt.event.ActionEvent> fn) {
        JButton b = new JButton(t);
        b.addActionListener(fn::accept);
        return b;
    }

    // ================= world gen =================
    private void newVein() {
        for (int r = 0; r < ROWS; r++) for (int c = 0; c < COLS; c++) {
            Block b;
            if (r == 0 || r == ROWS - 1 || c == 0 || c == COLS - 1) b = Block.bedrock;
            else {
                Block[] band = r < 3 ? BAND0 : r < 6 ? BAND1 : BAND2;
                b = band[rng.nextInt(band.length)];
                if (rng.nextDouble() < 0.03) b = Block.closetCrate;
            }
            grid[r][c] = new Cell(b, b.toughness);
        }
        // a boxy visitor sometimes wanders in (feeds greet quests)
        if (rng.nextDouble() < 0.4) {
            String[][] sp = {{"Mole", "🦔"}, {"Bat", "🦇"}, {"Axolotl", "🦎"}, {"Fox", "🦊"}, {"Wisp", "💨"}};
            String[] s = sp[rng.nextInt(sp.length)];
            critters.add(new Entities.BoxyCritter(s[0], s[1], true));
            quests.record(new QEvent.CritterGreeted());
            flash("A boxy " + s[0] + " visits and says hi!");
        }
    }

    // ================= actions =================
    private double pickDamage() {
        double d = Data.PICKS[player.pickTier].speed();
        for (Entities.Pet p : player.pets)
            if (p.equipped() && p.boostKind().equals("Speed")) d *= 1 + p.boostValue();
        return d;
    }

    private double goldMult() {
        double m = 1 + 0.15 * player.rebirths;
        for (Entities.Pet p : player.pets)
            if (p.equipped() && p.boostKind().equals("Gold")) m *= 1 + p.boostValue();
        return m;
    }

    private void swing(int r, int c) {
        Cell cell = grid[r][c];
        if (cell == null) return;
        Block b = cell.block();
        if (b.unbreakable) { flash(b.displayName + " is unbreakable."); return; }
        if (player.pickTier < b.minTier) {
            flash("Too tough — needs " + Data.PICKS[b.minTier].name() + ".");
            return;
        }
        double hp = cell.hp() - pickDamage();
        if (hp > 0) {
            grid[r][c] = new Cell(b, hp);
            paintCell(r, c);
            return;
        }
        breakBlock(r, c, b);
    }

    private void breakBlock(int r, int c, Block b) {
        boolean valuable = b.gold > 0 || b == Block.coalOre;
        if (valuable && player.backpackFull()) {
            flash("Backpack full — sell first!");
            paintCell(r, c);
            return;
        }
        player.blocksMined++;
        quests.record(new QEvent.BlockBroken());
        if (b == Block.coalOre) {
            coal++;
        } else if (b.gold > 0) {
            player.ores.merge("ore", 1, Integer::sum);
            sellValue += b.gold;
            // luck pets: double-drop roll
            for (Entities.Pet p : player.pets) {
                if (p.equipped() && p.boostKind().equals("Luck") && rng.nextDouble() < p.boostValue()) {
                    player.ores.merge("ore", 1, Integer::sum);
                    sellValue += b.gold;
                    flash("Lucky double-drop!");
                }
            }
        }
        if (b.name().startsWith("crystal") || b == Block.glacierCrystal) {
            caves.add(new Entities.CrystalCave(true, false));
            quests.record(new QEvent.CaveHarvested());
            quests.record(new QEvent.CaveUnlocked());
        }
        if (b == Block.frostOre) frost.add(new Entities.FrostPocket(true));
        if (b == Block.closetCrate) {
            closets.add(new Entities.ClosetCache(true));
            quests.record(new QEvent.ClosetOpened());
            player.gold += 5;
        }
        if (b.ore) quests.record(new QEvent.OreMined(b.displayName, 1));
        earnXP(b.xp);
        grid[r][c] = new Cell(Block.stone, Block.stone.toughness);
        refresh();
    }

    private void earnXP(int n) {
        if (n <= 0) return;
        Engine.XP r = Engine.applyXP(player.level, player.experience, n);
        if (r.leveled()) {
            flash("Level " + r.level() + "! +25 gold");
            player.gold += 25;
        }
        player.level = r.level();
        player.experience = r.xp();
        quests.record(new QEvent.XpEarned(n));
    }

    private void sell(java.awt.event.ActionEvent e) {
        if (sellValue <= 0) { flash("Backpack empty — break some ore first."); return; }
        int g = (int) Math.round(sellValue * goldMult());
        player.gold += g;
        bestSale = Math.max(bestSale, g);
        quests.record(new QEvent.GoldSold(g));
        player.ores.clear();
        sellValue = 0;
        flash("Sold for " + g + " gold" + (goldMult() > 1 ? " (mult x" + String.format("%.2f", goldMult()) + ")" : "") + ". Coal stays banked: " + coal);
        refresh();
    }

    private void buyPick(java.awt.event.ActionEvent e) {
        if (player.pickTier + 1 >= Data.PICKS.length) { flash("Void Drill is max!"); return; }
        int cost = Data.PICKS[player.pickTier + 1].cost();
        if (coal < cost) { flash("Needs " + cost + " coal (have " + coal + ")."); return; }
        coal -= cost;
        player.pickTier++;
        quests.record(new QEvent.PickForged());
        flash("Forged " + Data.PICKS[player.pickTier].name() + "!");
        refresh();
    }

    private void upgradePack(java.awt.event.ActionEvent e) {
        int cost = 50 * (1 << player.backpackTier);
        if (player.gold < cost) { flash("Pack upgrade needs " + cost + " gold."); return; }
        player.gold -= cost;
        player.backpackTier++;
        player.backpackCapacity += 25;
        quests.record(new QEvent.PackUpgraded());
        flash("Backpack Mk " + (player.backpackTier + 1) + " (" + player.backpackCapacity + " cap).");
        refresh();
    }

    private void hatchEgg(java.awt.event.ActionEvent e) {
        if (player.gold < 150) { flash("Eggs cost 150 gold."); return; }
        player.gold -= 150;
        hatched++;
        Entities.Pet pet = Entities.hatch(hatched, 1 + rng.nextInt(100), hatched);
        long equipped = player.pets.stream().filter(Entities.Pet::equipped).count();
        player.pets.add(new Entities.Pet(pet.species(), pet.emoji(), pet.rarity(),
                pet.boostKind(), pet.boostValue(), equipped < 3));
        quests.record(new QEvent.PetHatched());
        flash("Hatched " + pet.rarity() + " " + pet.species() + " (" + pet.boostKind() + " +" + (int) (pet.boostValue() * 100) + "%)!");
        refresh();
    }

    private void rebirth(java.awt.event.ActionEvent e) {
        if (player.level < 15) { flash("Rebirth needs level 15 (now " + player.level + ")."); return; }
        player.rebirths++;
        player.level = 1;
        player.experience = 0;
        player.gold = 0;
        player.ores.clear();
        sellValue = 0;
        quests.record(new QEvent.Rebirthed());
        flash("Rebirth #" + player.rebirths + " — gold gains x" + String.format("%.2f", 1 + 0.15 * player.rebirths) + " forever.");
        refresh();
    }

    private void claimAll() {
        int n = 0;
        for (Quest q : quests.claimable()) if (quests.claim(q)) n++;
        for (Achievement a : AchievementCatalog.all())
            if (!achievements.isClaimed(a.id()) && achievements.isUnlocked(a.id())
                    && achievements.claim(a)) n++;
        flash(n == 0 ? "Nothing claimable yet." : "Claimed " + n + " reward(s)!");
    }

    private void fish(String water) {
        Data.Fish f = spooktacular.systems.Fishing.cast(water, 0,
                new Engine.RNG(System.nanoTime()));
        long gv = Math.round(f.value() * goldMult());
        player.gold += gv;
        fishCaught.merge(f.name(), 1, Integer::sum);
        flash("Caught " + f.name() + " (+" + gv + "g).");
        refresh();
    }

    /** Test hooks (same package, headless-safe). */
    Snapshot snapshotView() { return snapshot(); }
    void swingAt(int r, int c) { swing(r, c); }
    Block blockAt(int r, int c) { return grid[r][c].block(); }
    Entities.MNPlayer player() { return player; }
    long coal() { return coal; }
    int sellValue() { return sellValue; }
    void grantCoal(long n) { coal += n; }
    void grantGold(int n) { player.gold += n; }
    void doSell() { sell(null); }
    void buyPickPublic() { buyPick(null); }

    private Snapshot snapshot() {
        return new Snapshot(player, List.of(), new HashMap<>(fishCaught), 0, 0,
                new ArrayList<>(critters), new ArrayList<>(caves),
                new ArrayList<>(closets), new ArrayList<>(frost),
                quests, 0, bestSale, 0);
    }

    // ================= view =================
    private void paintCell(int r, int c) {
        Cell cell = grid[r][c];
        JButton b = btns[r][c];
        b.setText(cell.block().emoji);
        b.setToolTipText(cell.block().displayName + " (" + (int) Math.ceil(cell.hp()) + " hp)");
        b.setBackground(colorFor(cell.block()));
    }

    private static Color colorFor(Block b) {
        return switch (b) {
            case coalOre -> new Color(40, 40, 46);
            case ironOre -> new Color(120, 90, 70);
            case goldOre -> new Color(190, 160, 40);
            case lapisOre -> new Color(40, 80, 190);
            case redstoneOre -> new Color(190, 40, 40);
            case emeraldOre -> new Color(40, 170, 80);
            case rubyOre -> new Color(200, 40, 90);
            case diamondOre -> new Color(120, 220, 240);
            case opalOre -> new Color(180, 140, 240);
            case crystalCube, crystalSpike, crystalOrb, glacierCrystal -> new Color(140, 220, 255);
            case frostOre -> new Color(200, 230, 255);
            case closetCrate -> new Color(150, 100, 50);
            case bedrock, lava -> Color.BLACK;
            case dirt, gravel -> new Color(90, 65, 45);
            default -> new Color(95, 85, 110);
        };
    }

    private void flash(String m) {
        message.setText(m);
    }

    private void refresh() {
        for (int r = 0; r < ROWS; r++) for (int c = 0; c < COLS; c++) paintCell(r, c);
        status1.setText(String.format("Gold %s  Coal %d  Lv %d (%d xp)  %s  Pack %d/%d  Sell value %d",
                Engine.compact(player.gold), coal, player.level, player.experience,
                Data.PICKS[player.pickTier].name(), player.backpackUsed(), player.backpackCapacity, sellValue));
        StringBuilder pets = new StringBuilder("Pets: ");
        if (player.pets.isEmpty()) pets.append("none (hatch an egg!)");
        else for (Entities.Pet p : player.pets)
            pets.append(p.emoji()).append(p.equipped() ? "*" : "").append(" ");
        status2.setText(pets + " Rebirths " + player.rebirths
                + "  Quests " + quests.doneCount() + "/" + quests.totalCount()
                + "  Blocks " + player.blocksMined);
        List<Achievement> fresh = achievements.refresh(snapshot());
        if (!fresh.isEmpty()) {
            StringBuilder sb = new StringBuilder("Achievement: ");
            for (Achievement a : fresh) sb.append(a.title()).append("; ");
            flash(sb.toString());
        }
    }
}
