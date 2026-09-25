package spooktacular.data;

/** Real catalogs extracted from the iOS sources (verbatim). Generated - do not hand-edit. */
public final class Data {
    private Data() {}

    public record Ghost(String key, String name, String emoji, String rarity, int pmin, int pmax) {}
    public static final Ghost[] GHOSTS = {
        new Ghost("poltergeist", "👻 Poltergeist", "👻", "common", 10, 20),
        new Ghost("specter", "👻 Specter", "👻", "common", 10, 20),
        new Ghost("phantom", "👻 Phantom", "👻", "common", 10, 20),
        new Ghost("wraith", "👻 Wraith", "👻", "common", 10, 20),
        new Ghost("banshee", "👻 Banshee", "Scream Attack - Stuns all ghosts", "common", 10, 20),
        new Ghost("ghoul", "🧟 Ghoul", "🧟", "common", 10, 20),
        new Ghost("zombie", "🧟 Zombie", "🧟", "common", 10, 20),
        new Ghost("mummy", "🧟 Mummy", "🧟", "common", 10, 20),
        new Ghost("vampire", "🧛 Vampire", "🧛", "uncommon", 25, 40),
        new Ghost("werewolf", "🐺 Werewolf", "🐺", "uncommon", 25, 40),
        new Ghost("witch", "🧙 Witch", "🧙", "uncommon", 25, 40),
        new Ghost("ghostKnight", "⚔️ Ghost Knight", "⚔️", "uncommon", 25, 40),
        new Ghost("shadowDemon", "🌑 Shadow Demon", "🌑", "uncommon", 25, 40),
        new Ghost("demonLord", "👿 Demon Lord", "Inferno - Burns all enemies", "rare", 50, 75),
        new Ghost("ancientSpirit", "🏛️ Ancient Spirit", "🏛️", "rare", 50, 75),
        new Ghost("dragonGhost", "🐉 Dragon Ghost", "🐉", "rare", 50, 75),
        new Ghost("necromancer", "💀 Necromancer", "💀", "rare", 50, 75),
        new Ghost("lichKing", "👑 Lich King", "Raise Dead - Revives fallen ghosts", "epic", 100, 150),
        new Ghost("voidBeast", "🌀 Void Beast", "🌀", "epic", 100, 150),
        new Ghost("timeWraith", "⏳ Time Wraith", "Time Slow - Slows all movement", "epic", 100, 150),
        new Ghost("chaosDemon", "🔥 Chaos Demon", "🔥", "epic", 100, 150),
        new Ghost("halloweenKing", "🎃 Halloween King", "🎃", "legendary", 300, 500),
        new Ghost("pumpkinLord", "🎃 Pumpkin Lord", "🎃", "legendary", 300, 500),
        new Ghost("nightmare", "🌙 Nightmare", "Fear Aura - Reduces enemy stats", "legendary", 300, 500),
        new Ghost("voidEntity", "🌌 Void Entity", "🌌", "legendary", 300, 500),
    };

    public record Candy(String key, String name, int points) {}
    public static final Candy[] CANDIES = {
        new Candy("chocolate", "🍫 Chocolate", 3),
        new Candy("lollipop", "🍭 Lollipop", 3),
        new Candy("gummi", "🐻 Gummi", 3),
        new Candy("candyCorn", "🌽 Candy Corn", 2),
        new Candy("licorice", "🖤 Licorice", 2),
        new Candy("jawbreaker", "🔴 Jawbreaker", 2),
        new Candy("taffy", "🍬 Taffy", 2),
        new Candy("peppermint", "🍬 Peppermint", 2),
        new Candy("truffle", "🍫 Truffle", 5),
        new Candy("caramel", "🍬 Caramel", 5),
        new Candy("fudge", "🍫 Fudge", 5),
        new Candy("toffee", "🍬 Toffee", 5),
        new Candy("goldenCandy", "⭐ Golden Candy", 15),
        new Candy("magicalCandy", "✨ Magical Candy", 20),
        new Candy("rainbowCandy", "🌈 Rainbow Candy", 25),
        new Candy("candycornKing", "👑 Candy Corn King", 50),
        new Candy("chocolateDragon", "🐉 Chocolate Dragon", 60),
        new Candy("lollipopTower", "🗼 Lollipop Tower", 70),
    };

    public record Minigame(String key, String name) {}
    public static final Minigame[] MINIGAMES = {
        new Minigame("memoryMatch", "🧠 Memory Match"),
        new Minigame("pumpkinSmash", "🎃 Pumpkin Smash"),
        new Minigame("ghostRace", "👻 Ghost Race"),
        new Minigame("candySort", "🍬 Candy Sort"),
        new Minigame("spellDuel", "✨ Spell Duel"),
        new Minigame("mazeEscape", "🌀 Maze Escape"),
        new Minigame("trivia", "🧠 Trivia"),
        new Minigame("rhythm", "🎵 Rhythm"),
        new Minigame("voxelRun", "🧱 Voxel Run 3D"),
        new Minigame("graveyard3D", "🪦 Graveyard 3D"),
        new Minigame("abandonedMine", "🦇 Abandoned Mine"),
    };

    public record Pick(String name, double speed, int cost) {}
    public static final Pick[] PICKS = {
        new Pick("Wooden Pick", 1.5, 0),
        new Pick("Stone Pick", 2.0, 8),
        new Pick("Iron Pick", 2.5, 20),
        new Pick("Golden Pick", 3.0, 35),
        new Pick("Diamond Pick", 4.5, 60),
        new Pick("Crystal Pick", 6.0, 100),
        new Pick("Void Drill", 8.5, 160),
    };

    public record Relic(String name, String effect, double value) {}
    public static final Relic[] RELICS = {
        new Relic("Mole's Knuckle", "Damage", 0.15),
        new Relic("Sledge of Echoes", "Damage", 0.25),
        new Relic("Core Drill Bit", "Damage", 0.4),
        new Relic("Rabbit's Foot", "Luck", 0.08),
        new Relic("Four-Leaf Pick", "Luck", 0.12),
        new Relic("Wisp in a Jar", "Luck", 0.2),
        new Relic("Gilded Scale", "Gold", 0.15),
        new Relic("Merchant's Smile", "Gold", 0.25),
        new Relic("Crown Fragment", "Gold", 0.4),
        new Relic("Swift Boots", "Speed", 0.15),
        new Relic("Hummingbird Charm", "Speed", 0.25),
        new Relic("Bottomless Pocket", "Pack", 25),
    };

    public record Fish(String name, String rarity, int value) {}
    public static final Fish[] FISH = {
        new Fish("Cave Minnow", "Common", 6),
        new Fish("Lantern Guppy", "Common", 8),
        new Fish("Blind Barb", "Common", 7),
        new Fish("Moss Carp", "Common", 9),
        new Fish("Echo Trout", "Rare", 22),
        new Fish("Mirror Koi", "Rare", 28),
        new Fish("Axolotl Pal", "Epic", 60),
        new Fish("Ember Eel", "Common", 14),
        new Fish("Cinder Carp", "Common", 16),
        new Fish("Magma Jelly", "Rare", 34),
        new Fish("Obsidian Bass", "Rare", 40),
        new Fish("Phoenix Fry", "Epic", 85),
        new Fish("Core Serpent", "Legendary", 220),
        new Fish("Golden Walleye", "Legendary", 180),
    };
    public static final String[] LAYERS = {"Dirt Tunnels", "Crystal Hollows", "Magma Core"};
}