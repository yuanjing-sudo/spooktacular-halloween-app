package spooktacular.game;

import spooktacular.data.Data;
import spooktacular.engine.Engine;

import javax.swing.*;
import java.awt.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** All 7 iOS tabs preserved: Maze, Candy, Mine, World, Explore, Games, Achieve.
 *  Games tab hosts two playable minigames (Memory Match, Pumpkin Smash). */
public class Tabs {
    private final MazePanel maze = new MazePanel();
    private final JLabel candyLabel = new JLabel();
    private final JLabel mineLabel = new JLabel();
    private final JLabel achLabel = new JLabel();
    private final JLabel smashLabel = new JLabel("Smashes: 0  (+25 each)");
    private int smashes;

    public JTabbedPane build() {
        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Maze", maze);
        tabs.addTab("Candy", candyPanel());
        tabs.addTab("Mine", minePanel());
        tabs.addTab("World", listPanel("Avatar World — Companions",
                ghostNames(8), "Your boxy companions from the ghost cast:"));
        tabs.addTab("Explore", explorePanel());
        tabs.addTab("Games", gamesPanel());
        tabs.addTab("Achieve", achPanel());
        tabs.addChangeListener(e -> {
            maze.setPaused(tabs.getSelectedIndex() != 0);
            if (tabs.getSelectedIndex() == 1) refreshCandy();
            if (tabs.getSelectedIndex() == 2) refreshMine();
            if (tabs.getSelectedIndex() == 6) refreshAch();
            maze.requestFocusInWindow();
        });
        maze.setPaused(false);
        javax.swing.Timer poll = new javax.swing.Timer(500, e -> {
            if (tabs.getSelectedIndex() == 1) refreshCandy();
            if (tabs.getSelectedIndex() == 2) refreshMine();
            if (tabs.getSelectedIndex() == 6) refreshAch();
        });
        poll.start();
        return tabs;
    }

    private static List<String> ghostNames(int n) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < Math.min(n, Data.GHOSTS.length); i++)
            out.add(Data.GHOSTS[i].name() + "  [" + Data.GHOSTS[i].rarity() + "]");
        return out;
    }

    private JComponent listPanel(String title, List<String> items, String head) {
        JPanel p = new JPanel(new BorderLayout());
        p.add(new JLabel(title, SwingConstants.CENTER), BorderLayout.NORTH);
        DefaultListModel<String> m = new DefaultListModel<>();
        if (head != null) m.addElement(head);
        items.forEach(m::addElement);
        p.add(new JScrollPane(new JList<>(m)), BorderLayout.CENTER);
        return p;
    }

    private JComponent candyPanel() {
        JPanel p = new JPanel(new BorderLayout());
        candyLabel.setHorizontalAlignment(SwingConstants.CENTER);
        p.add(candyLabel, BorderLayout.NORTH);
        DefaultListModel<String> m = new DefaultListModel<>();
        for (Data.Candy c : Data.CANDIES) m.addElement(c.name() + "  (" + c.points() + " pts)");
        p.add(new JScrollPane(new JList<>(m)), BorderLayout.CENTER);
        refreshCandy();
        return p;
    }

    private void refreshCandy() {
        candyLabel.setText("Candy Vault — collected: " + maze.collectedCandy + "  (18 kinds from the app)");
    }

    private JComponent minePanel() {
        JPanel p = new JPanel(new BorderLayout());
        mineLabel.setHorizontalAlignment(SwingConstants.CENTER);
        p.add(mineLabel, BorderLayout.NORTH);
        DefaultListModel<String> m = new DefaultListModel<>();
        for (Data.Pick pk : Data.PICKS) m.addElement(pk.name() + " — " + pk.cost() + " gold");
        p.add(new JScrollPane(new JList<>(m)), BorderLayout.CENTER);
        JButton buy = new JButton("Buy next pick");
        buy.addActionListener(e -> {
            if (!maze.buyPick())
                JOptionPane.showMessageDialog(p, "Need more gold! Clear maze rooms for gold.");
            refreshMine();
        });
        p.add(buy, BorderLayout.SOUTH);
        refreshMine();
        return p;
    }

    private void refreshMine() {
        mineLabel.setText(String.format("Gold %s  Lv %d  Wielding: %s  Relics %d/12",
                Engine.compact(maze.gold), maze.level,
                Data.PICKS[maze.pickIdx].name(), maze.relics.size()));
    }

    private JComponent explorePanel() {
        JPanel p = new JPanel(new BorderLayout());
        DefaultListModel<String> m = new DefaultListModel<>();
        m.addElement("REGIONS:");
        for (String r : new String[]{"Northgate Warren", "Ember Deeps", "The Heart", "Lantern Row",
                "Tangle Warrens", "Gilded Warrens", "Far Reaches", "Howling Deeps"}) m.addElement("  " + r);
        m.addElement("WORLDS:");
        m.addElement("  Maze 3D (this tab!)");
        m.addElement("  Graveyard 3D (press M in Maze for full automap)");
        p.add(new JScrollPane(new JList<>(m)), BorderLayout.CENTER);
        return p;
    }

    private JComponent gamesPanel() {
        JPanel p = new JPanel(new BorderLayout());
        DefaultListModel<String> m = new DefaultListModel<>();
        for (Data.Minigame g : Data.MINIGAMES) m.addElement(g.name());
        p.add(new JScrollPane(new JList<>(m)), BorderLayout.CENTER);
        JPanel games = new JPanel(new GridLayout(1, 2));
        games.add(memoryMatch());
        games.add(pumpkinSmash());
        p.add(games, BorderLayout.SOUTH);
        return p;
    }

    /** Playable Memory Match: 4x4 candy pairs. */
    private JComponent memoryMatch() {
        JPanel p = new JPanel(new BorderLayout());
        p.add(new JLabel("Memory Match", SwingConstants.CENTER), BorderLayout.NORTH);
        JPanel grid = new JPanel(new GridLayout(4, 4));
        List<String> deck = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            deck.add(Data.CANDIES[i].name());
            deck.add(Data.CANDIES[i].name());
        }
        Collections.shuffle(deck);
        JLabel status = new JLabel("Moves: 0", SwingConstants.CENTER);
        JButton[] btns = new JButton[16];
        final int[] first = {-1};
        final int[] moves = {0};
        final int[] found = {0};
        final boolean[] lock = {false};
        for (int i = 0; i < 16; i++) {
            final int idx = i;
            btns[i] = new JButton("?");
            btns[i].addActionListener(e -> {
                if (lock[0] || !btns[idx].getText().equals("?")) return;
                btns[idx].setText(deck.get(idx));
                if (first[0] < 0) { first[0] = idx; return; }
                moves[0]++;
                status.setText("Moves: " + moves[0]);
                if (deck.get(first[0]).equals(deck.get(idx))) {
                    found[0] += 2;
                    first[0] = -1;
                    if (found[0] == 16) status.setText("Cleared in " + moves[0] + " moves!");
                } else {
                    lock[0] = true;
                    int a = first[0];
                    first[0] = -1;
                    javax.swing.Timer t = new javax.swing.Timer(700, ev -> {
                        btns[a].setText("?");
                        btns[idx].setText("?");
                        lock[0] = false;
                    });
                    t.setRepeats(false);
                    t.start();
                }
            });
            grid.add(btns[i]);
        }
        p.add(grid, BorderLayout.CENTER);
        p.add(status, BorderLayout.SOUTH);
        return p;
    }

    /** Playable Pumpkin Smash: 3x3 grid, pumpkins pop, click for +25 maze score. */
    private JComponent pumpkinSmash() {
        JPanel p = new JPanel(new BorderLayout());
        p.add(new JLabel("Pumpkin Smash", SwingConstants.CENTER), BorderLayout.NORTH);
        JPanel grid = new JPanel(new GridLayout(3, 3));
        JButton[] btns = new JButton[9];
        for (int i = 0; i < 9; i++) {
            btns[i] = new JButton("");
            final int idx = i;
            btns[i].addActionListener(e -> {
                if (btns[idx].getText().equals("🎃")) {
                    btns[idx].setText("");
                    smashes++;
                    maze.score += 25;
                    if (smashes >= 10) maze.ach.add("smash-10");
                    smashLabel.setText("Smashes: " + smashes + "  (+25 each)");
                    spawnPumpkin(btns);
                }
            });
            grid.add(btns[i]);
        }
        spawnPumpkin(btns);
        spawnPumpkin(btns);
        p.add(grid, BorderLayout.CENTER);
        smashLabel.setHorizontalAlignment(SwingConstants.CENTER);
        p.add(smashLabel, BorderLayout.SOUTH);
        return p;
    }

    private void spawnPumpkin(JButton[] btns) {
        List<Integer> empty = new ArrayList<>();
        for (int i = 0; i < btns.length; i++)
            if (btns[i].getText().isEmpty()) empty.add(i);
        if (!empty.isEmpty()) btns[empty.get(new java.util.Random().nextInt(empty.size()))].setText("🎃");
    }

    private JComponent achPanel() {
        JPanel p = new JPanel(new BorderLayout());
        achLabel.setHorizontalAlignment(SwingConstants.CENTER);
        p.add(achLabel, BorderLayout.NORTH);
        DefaultListModel<String> m = new DefaultListModel<>();
        for (String a : new String[]{"first-candy: First Bite", "clear-1: Pathfinder",
                "first-pick: New Edge", "void-drill: Maximum Spin", "level-5: Living Myth",
                "score-1k: Score Legend", "smash-10: Pumpkin Pro"}) m.addElement(a);
        p.add(new JScrollPane(new JList<>(m)), BorderLayout.CENTER);
        refreshAch();
        return p;
    }

    private void refreshAch() {
        achLabel.setText("Unlocked " + maze.ach.size() + "/7 tracked here: " + maze.ach);
    }
}
