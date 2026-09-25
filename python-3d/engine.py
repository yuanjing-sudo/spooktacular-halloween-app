"""Spooktacular engine — pure game logic, no window needed.
Exact ports of the algorithms verified in spooktacular-verify/test_logic.py
(which mirror the Swift sources): SeededRNG, DFS carver, A* + smoothing,
12 easing curves, combo/streak/XP scoring, compact numbers, plus the real
pick/layer/relic/fish tables.
"""
import heapq
import math

MASK64 = (1 << 64) - 1


class SeededRNG:
    def __init__(self, seed):
        self.state = seed if seed != 0 else 0x9E3779B97F4A7C15

    def next(self):
        self.state = (self.state + 0x6D2B79F5) & MASK64
        z = self.state
        z = ((z ^ (z >> 15)) * (z | 1)) & MASK64
        z = (z ^ (z + ((z ^ (z >> 7)) * (z | 61) & MASK64) & MASK64)) & MASK64
        return (z ^ (z >> 14)) & MASK64

    def next_double(self):
        return float(self.next() >> 11) / float(1 << 53)

    def next_int(self, n):
        return int(self.next_double() * n) % n if n > 0 else 0

    def pick(self, arr):
        return arr[self.next_int(len(arr))]

    def shuffle(self, a):
        a = list(a)
        for i in range(len(a) - 1, 0, -1):
            j = self.next_int(i + 1)
            a[i], a[j] = a[j], a[i]
        return a


def carve_dfs(w, d, seed):
    rng = SeededRNG(seed)
    w = max(3, w | 1)
    d = max(3, d | 1)
    grid = [[False] * d for _ in range(w)]
    grid[1][1] = True
    stack = [(1, 1)]
    steps = 0
    while stack and steps < w * d * 4:
        steps += 1
        x, z = stack[-1]
        opts = []
        for dx, dz in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            nx, nz = x + dx, z + dz
            if 0 < nx < w - 1 and 0 < nz < d - 1 and not grid[nx][nz]:
                opts.append((dx, dz, nx, nz))
        if opts:
            dx, dz, nx, nz = rng.pick(opts)
            grid[x + dx // 2][z + dz // 2] = True
            grid[nx][nz] = True
            stack.append((nx, nz))
        else:
            stack.pop()
    return {(x, z) for x in range(w) for z in range(d) if grid[x][z]}, w, d


def connected(cells, start=(1, 1)):
    seen = {start}
    stack = [start]
    while stack:
        c = stack.pop()
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (c[0] + dx, c[1] + dz)
            if n in cells and n not in seen:
                seen.add(n)
                stack.append(n)
    return seen == cells


def astar(start, goal, walkable, max_iter=600):
    if start == goal:
        return [start]

    def h(a, b):
        dx, dz = abs(a[0] - b[0]), abs(a[1] - b[1])
        return max(dx, dz) + 0.4142 * min(dx, dz)

    openh = [(h(start, goal), 0, start)]
    came, g = {}, {start: 0}
    closed = set()
    it = 0
    dirs = [(1, 0, 1.0), (-1, 0, 1.0), (0, 1, 1.0), (0, -1, 1.0),
            (1, 1, 1.4142), (1, -1, 1.4142), (-1, 1, 1.4142), (-1, -1, 1.4142)]
    while openh and it < max_iter:
        it += 1
        _, _, cur = heapq.heappop(openh)
        if cur == goal:
            path, c = [cur], cur
            while c in came:
                c = came[c]
                path.append(c)
            return path[::-1]
        if cur in closed:
            continue
        closed.add(cur)
        for dx, dz, cost in dirs:
            nxt = (cur[0] + dx, cur[1] + dz)
            if nxt in closed:
                continue
            if dx and dz and (not walkable((cur[0] + dx, cur[1])) and not walkable((cur[0], cur[1] + dz))):
                continue
            if not walkable(nxt) and nxt != goal:
                continue
            t = g[cur] + cost
            if t < g.get(nxt, float('inf')):
                came[nxt] = cur
                g[nxt] = t
                heapq.heappush(openh, (t + h(nxt, goal), it, nxt))
    return None


def ease(kind, x):
    x = min(1.0, max(0.0, x))
    if kind == 'linear':
        return x
    if kind == 'quadIn':
        return x * x
    if kind == 'quadOut':
        return 1 - (1 - x) * (1 - x)
    if kind == 'quadInOut':
        return 2 * x * x if x < 0.5 else 1 - ((-2 * x + 2) ** 2) / 2
    if kind == 'cubicIn':
        return x ** 3
    if kind == 'cubicOut':
        return 1 - (1 - x) ** 3
    if kind == 'cubicInOut':
        return 4 * x ** 3 if x < 0.5 else 1 - ((-2 * x + 2) ** 3) / 2
    if kind == 'quartOut':
        return 1 - (1 - x) ** 4
    if kind == 'sineInOut':
        return -(math.cos(math.pi * x) - 1) / 2
    if kind == 'backOut':
        c1, c3 = 1.70158, 2.70158
        return 1 + c3 * ((x - 1) ** 3) + c1 * ((x - 1) ** 2)
    if kind == 'elasticOut':
        if x == 0:
            return 0
        if x == 1:
            return 1
        return (2 ** (-10 * x)) * math.sin((x * 10 - 0.75) * (2 * math.pi / 3)) + 1
    if kind == 'bounceOut':
        n1, d1 = 7.5625, 2.75
        if x < 1 / d1:
            return n1 * x * x
        if x < 2 / d1:
            t = x - 1.5 / d1
            return n1 * t * t + 0.75
        if x < 2.5 / d1:
            t = x - 2.25 / d1
            return n1 * t * t + 0.9375
        t = x - 2.625 / d1
        return n1 * t * t + 0.984375
    raise ValueError(kind)


def combo_mult(c):
    return 1.0 if c <= 0 else min(3.0, 1.0 + c * 0.05)


def streak_bonus(s):
    if s <= 0:
        return 0
    if s >= 20:
        return 100 + (s - 20) * 5
    if s >= 10:
        return 40 + (s - 10) * 6
    return s * 2


def xp_next(lv):
    return max(50, round(80.0 * (1.28 ** (max(1, lv) - 1))))


def apply_xp(level, xp, earned):
    level, xp = max(1, level), max(0, xp) + max(0, earned)
    leveled = False
    while xp >= xp_next(level):
        xp -= xp_next(level)
        level += 1
        leveled = True
    return leveled, level, xp


def compact(n):
    v = float(n)
    if v < 1000:
        return str(n)
    if v < 1_000_000:
        k = v / 1000
        return (str(int(k)) + 'K') if k == int(k) else ('%.1fK' % k)
    m = v / 1_000_000
    return (str(int(m)) + 'M') if m == int(m) else ('%.1fM' % m)


# Real tables (AbandonedMine.swift / MineRelics.swift / MineFishing.swift)
PICKS = [
    {'name': 'Wooden Pick', 'speed': 1.5, 'cost': 0},
    {'name': 'Stone Pick', 'speed': 2.0, 'cost': 8},
    {'name': 'Iron Pick', 'speed': 2.5, 'cost': 20},
    {'name': 'Golden Pick', 'speed': 3.0, 'cost': 35},
    {'name': 'Diamond Pick', 'speed': 4.5, 'cost': 60},
    {'name': 'Crystal Pick', 'speed': 6.0, 'cost': 100},
    {'name': 'Void Drill', 'speed': 8.5, 'cost': 160},
]
LAYERS = ['Dirt Tunnels', 'Crystal Hollows', 'Magma Core']
DEPTHS = [
    {'layer': 'Dirt Tunnels', 'size': 15, 'candies': 8, 'crystals': 2, 'ghost_speed': 3.4, 'think': 0.55,
     'wall': (0.23, 0.11, 0.37), 'fog': (0.04, 0.02, 0.10)},
    {'layer': 'Crystal Hollows', 'size': 19, 'candies': 12, 'crystals': 3, 'ghost_speed': 3.8, 'think': 0.45,
     'wall': (0.05, 0.29, 0.37), 'fog': (0.02, 0.06, 0.12)},
    {'layer': 'Magma Core', 'size': 23, 'candies': 16, 'crystals': 4, 'ghost_speed': 4.2, 'think': 0.35,
     'wall': (0.37, 0.11, 0.11), 'fog': (0.10, 0.03, 0.03)},
]
RELICS = [
    ("Mole's Knuckle", 'Damage', 0.15), ("Sledge of Echoes", 'Damage', 0.25),
    ('Core Drill Bit', 'Damage', 0.4), ("Rabbit's Foot", 'Luck', 0.08),
    ('Four-Leaf Pick', 'Luck', 0.12), ('Wisp in a Jar', 'Luck', 0.2),
    ('Gilded Scale', 'Gold', 0.15), ("Merchant's Smile", 'Gold', 0.25),
    ('Crown Fragment', 'Gold', 0.4), ('Swift Boots', 'Speed', 0.15),
    ('Hummingbird Charm', 'Speed', 0.25), ('Bottomless Pocket', 'Pack', 25),
]
FISH = [
    ('Cave Minnow', 'Common', 6), ('Lantern Guppy', 'Common', 8),
    ('Blind Barb', 'Common', 7), ('Moss Carp', 'Common', 9),
    ('Echo Trout', 'Rare', 22), ('Mirror Koi', 'Rare', 28),
    ('Axolotl Pal', 'Epic', 60), ('Ember Eel', 'Common', 14),
    ('Cinder Carp', 'Common', 16), ('Magma Jelly', 'Rare', 34),
    ('Obsidian Bass', 'Rare', 40), ('Phoenix Fry', 'Epic', 85),
    ('Core Serpent', 'Legendary', 220), ('Golden Walleye', 'Legendary', 180),
]
FISH_WEIGHT = {'Common': 60, 'Rare': 28, 'Epic': 10, 'Legendary': 2}
