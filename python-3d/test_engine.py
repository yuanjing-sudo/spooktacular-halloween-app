"""Headless engine tests: run anywhere with `python test_engine.py`."""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import engine as E
from gamedata import GHOSTS, CANDIES, MINIGAMES

passed = failed = 0


def check(name, cond, detail=''):
    global passed, failed
    if cond:
        passed += 1
    else:
        failed += 1
        print('FAIL:', name, detail)


# RNG
a, b = E.SeededRNG(7), E.SeededRNG(7)
check('rng deterministic', [a.next() for _ in range(50)] == [b.next() for _ in range(50)])
a, b = E.SeededRNG(7), E.SeededRNG(8)
check('rng seed-sensitive', [a.next() for _ in range(20)] != [b.next() for _ in range(20)])
r = E.SeededRNG(99)
check('rng doubles in [0,1)', all(0 <= r.next_double() < 1 for _ in range(500)))
# maze
bad = 0
for seed in (1, 7, 42):
    for size in (9, 15, 21):
        cells, _, _ = E.carve_dfs(size, size, seed)
        if not E.connected(cells):
            bad += 1
check('maze connected 3x3', bad == 0, bad)
# astar
p = E.astar((0, 0), (5, 5), lambda n: True)
check('astar open diagonal', p is not None and len(p) == 6, p)
walls = {('2,%d' % y) for y in range(7)} - {'2,6'}
walk = lambda n: (n not in {(2, y) for y in range(7)} - {(2, 6)}) and -2 <= n[0] <= 8 and -2 <= n[1] <= 8
p2 = E.astar((0, 3), (5, 3), walk)
check('astar wall detour', p2 is not None and all(n not in walls for n in p2))
check('astar budget', E.astar((0, 0), (50, 50), lambda n: False, max_iter=10) is None)
# easing + scoring
check('ease quadOut', abs(E.ease('quadOut', 0.5) - 0.75) < 1e-9)
check('ease backOut overshoot', E.ease('backOut', 0.7) > 1.0)
check('combo cap', E.combo_mult(1000) == 3.0 and E.combo_mult(0) == 1.0)
check('streak tiers', E.streak_bonus(5) == 10 and E.streak_bonus(15) == 70 and E.streak_bonus(25) == 125)
check('xp curve', E.xp_next(1) == 80 and E.xp_next(5) == 215)
check('applyXP', E.apply_xp(1, 0, 80) == (True, 2, 0))
check('compact', E.compact(1500) == '1.5K' and E.compact(2300000) == '2.3M')
# tables
check('7 picks ascending', len(E.PICKS) == 7 and all(E.PICKS[i]['cost'] < E.PICKS[i + 1]['cost'] for i in range(6)))
check('12 relics', len(E.RELICS) == 12)
check('14 fish', len(E.FISH) == 14)
# catalogs from the real app
check('25 ghosts', len(GHOSTS) == 25, len(GHOSTS))
check('ghost rarities valid', all(g['rarity'] in ('common', 'uncommon', 'rare', 'epic', 'legendary') for g in GHOSTS))
check('18 candies', len(CANDIES) == 18, len(CANDIES))
check('candy points positive', all(c['points'] > 0 for c in CANDIES))
check('11 minigames', len(MINIGAMES) == 11, len(MINIGAMES))

print('PASSED: %d FAILED: %d' % (passed, failed))
sys.exit(1 if failed else 0)
