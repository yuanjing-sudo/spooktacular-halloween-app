# Halloween Spooktacular Ultimate 🎃

A collection of spooky little games and 3D experiments: the original 2D maze, a
voxel world, spectral ghost hunts, and a new streaming 3D forest. Most of the web
demos are dependency-free and run straight from the `docs/` folder.

## Play

```sh
python3 -m http.server 8000 --directory docs
```

Then open <http://localhost:8000/>.

| Experience | Page |
| --- | --- |
| ⛏️ Maze 2D — the original candy hunt | `index.html` |
| 🧱 3D mine — first-person voxel mine | `mine3d.html` |
| 👻 3D ghosts — spectral shooter | `ghost3d.html` |
| 🌲 Voxel forest & deep-mine | `voxel.html` |
| 🌌 **Endless Spooky Forest 3D** — streaming X/Y/Z forest | `forest/endless-forest.html` |

## 🌌 Endless Spooky Forest

The newest addition is a near-infinite procedural forest with:

- deterministic 16 m chunks across unbounded X/Z and a vertical range of
  −18 m to +78 m, including floating islands;
- five biomes, weather, a 24-hour day/night cycle, aurora and blood moons;
- articulate, tameable rabbits with warrens and twelve AI states;
- plantable and wild carrots in four growth stages, with detailed ridged roots;
- campfires you can light, cook on, warm up at, sit beside and hear stories from;
- a journal, achievements, minimap, compass, photo mode and full touch controls.

See [`docs/forest/README.md`](docs/forest/README.md) for controls, seeds,
architecture and performance notes.

## Other implementations

- `Sources/` — the SwiftUI game engine reference implementation.
- `Tests/` — Swift logic tests.
- `python-3d/` — Python/Ursina prototype and headless tests.
- `java-3d/` — Java 3D renderer.

## Controls (web)

Use **WASD** or the arrow keys to move, **Shift** to run, **Space** to jump,
**E** to interact, and **Esc** to pause. Each page lists its own extras in the
in-game help and footer.
