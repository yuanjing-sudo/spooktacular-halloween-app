# Spooktacular Mine 3D + Tabs (Python)

Portable Python edition: real 3D mine (Ursina/Panda3D) with **all 7 iOS tabs
preserved** — Maze, Candy, Mine, World, Explore, Games, Achieve.

Game logic (`engine.py`) is an exact port of the verified Swift engine
(seeded RNG, DFS mazes, A* ghost, combo/streak/XP scoring). Catalogs
(`gamedata.py`: 25 ghosts, 18 candies, 11 minigames) are extracted verbatim
from the iOS sources.

## Run

```sh
pip install -r requirements.txt
python run.py          # play
python test_engine.py  # 22 headless logic checks
```

## Controls

- WASD / arrows: move (left/right turn), mouse: look, O: diorama orbit
- Walk into candy/crystals/relics/ponds; dodge the ghost
- Tabs at the bottom switch views (game pauses off the Maze tab)
- Games tab: Pumpkin Smash is playable in the maze (click pumpkins)
- Esc: back to Maze
