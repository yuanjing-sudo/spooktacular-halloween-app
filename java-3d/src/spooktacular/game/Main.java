package spooktacular.game;

import javax.swing.*;

/** Entry point: all 7 tabs in one window. */
public class Main {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame f = new JFrame("Spooktacular Ultimate — Java Edition");
            f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            f.add(new Tabs().build());
            f.pack();
            f.setLocationRelativeTo(null);
            f.setVisible(true);
        });
    }
}
