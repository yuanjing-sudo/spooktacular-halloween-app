# Spooktacular Ultimate — Java Edition

Roblox-grade portable edition: textured software-raycast 3D maze (zero native
dependencies — just a JRE) with **all 7 iOS tabs**: Maze, Candy, Mine, World,
Explore, Games (Memory Match + Pumpkin Smash, both playable), Achieve.

Engine (`Engine.java`) is an exact port of the verified game math (seeded RNG,
DFS mazes, A* ghost, combo/streak/XP). Catalogs (`Data.java`: 25 ghosts,
18 candies, 11 minigames, 7 picks, 12 relics, 14 fish) are extracted verbatim.

## Run (Windows)

```bat
java-3d\run.bat
```

## Run (macOS/Linux, needs a JDK 17+)

```sh
cd java-3d
javac -encoding UTF-8 -d classes $(find src -name '*.java')
java -cp classes spooktacular.game.TestEngine   # headless checks
java -cp classes spooktacular.game.Main         # play
```

## Controls

WASD/arrows move, ENTER start/retry, B buy in shop, N descend.
