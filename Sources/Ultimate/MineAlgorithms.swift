//
//  MineAlgorithms.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Systems engineering kit, Roblox-genre spec: seeded RNG, Perlin noise
//  (organic caves + ore veins), DFS + Prim's maze carvers, A* pathfinding
//  for wall-aware monster hunting, and voxel raycasting for pixel-exact
//  block picking. Pure value logic + showcases; managers adopt piecemeal.
//

import SwiftUI
import simd

// ============================================================
// MARK: - 1. Seeded RNG (deterministic layouts)
// ============================================================

/// Mulberry32: tiny, fast, stable across launches (unlike Hasher).
struct SeededRNG {
    private var state: UInt64

    init(seed: UInt64) {
        self.state = seed == 0 ? 0x9E3779B97F4A7C15 : seed
    }

    mutating func next() -> UInt64 {
        state &+= 0x6D2B79F5
        var z = state
        z = (z ^ (z >> 15)) &* (z | 1)
        z ^= z &+ (z ^ (z >> 7)) &* (z | 61)
        return z ^ (z >> 14)
    }

    mutating func nextDouble() -> Double {
        Double(next() >> 11) / Double(1 << 53)
    }

    mutating func nextInt(in range: Range<Int>) -> Int {
        let span = range.upperBound - range.lowerBound
        guard span > 0 else { return range.lowerBound }
        return range.lowerBound + Int(nextDouble() * Double(span))
    }

    mutating func nextFloat(in range: ClosedRange<Float>) -> Float {
        let t = Float(nextDouble())
        return range.lowerBound + t * (range.upperBound - range.lowerBound)
    }

    mutating func pick<T>(_ array: [T]) -> T? {
        guard !array.isEmpty else { return nil }
        return array[nextInt(in: 0..<array.count)]
    }

    mutating func shuffle<T>(_ array: [T]) -> [T] {
        var a = array
        for i in stride(from: a.count - 1, through: 1, by: -1) {
            let j = nextInt(in: 0..<(i + 1))
            a.swapAt(i, j)
        }
        return a
    }
}

// ============================================================
// MARK: - 2. Perlin noise (organic caves + veins)
// ============================================================

/// Classic improved Perlin noise (2D), permutation shuffled by seed.
/// Output roughly in [-1, 1]. Deterministic per seed.
struct PerlinNoise {
    private var p: [Int] = Array(repeating: 0, count: 512)

    init(seed: UInt64 = 1337) {
        var rng = SeededRNG(seed: seed)
        var perm = Array(0..<256)
        perm = rng.shuffle(perm)
        for i in 0..<512 {
            p[i] = perm[i & 255]
        }
    }

    private func fade(_ t: Double) -> Double {
        t * t * t * (t * (t * 6 - 15) + 10)
    }

    private func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double {
        a + t * (b - a)
    }

    private func grad(_ hash: Int, _ x: Double, _ y: Double) -> Double {
        switch hash & 7 {
        case 0: return x + y
        case 1: return x - y
        case 2: return -x + y
        case 3: return -x - y
        case 4: return x
        case 5: return -x
        case 6: return y
        default: return -y
        }
    }

    /// Raw Perlin value at (x, y).
    func noise(x: Double, y: Double) -> Double {
        let xi = Int(floor(x)) & 255
        let yi = Int(floor(y)) & 255
        let xf = x - floor(x)
        let yf = y - floor(y)
        let u = fade(xf)
        let v = fade(yf)
        let aa = p[p[xi] + yi]
        let ab = p[p[xi] + yi + 1]
        let ba = p[p[xi + 1] + yi]
        let bb = p[p[xi + 1] + yi + 1]
        return lerp(
            lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
            lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
            v
        ) * 1.42 // normalize-ish to [-1, 1]
    }

    /// Fractal Brownian motion: layered octaves of smooth randomness.
    func fbm(x: Double, y: Double, octaves: Int = 4, lacunarity: Double = 2.0, gain: Double = 0.5) -> Double {
        var total = 0.0
        var amplitude = 0.5
        var frequency = 1.0
        var norm = 0.0
        for _ in 0..<max(1, octaves) {
            total += noise(x: x * frequency, y: y * frequency) * amplitude
            norm += amplitude
            amplitude *= gain
            frequency *= lacunarity
        }
        return norm > 0 ? total / norm : 0
    }

    /// Ridged variant (sharp crests): good for quartz-like veins.
    func ridged(x: Double, y: Double, octaves: Int = 3) -> Double {
        var total = 0.0
        var amplitude = 0.5
        var frequency = 1.0
        var norm = 0.0
        for _ in 0..<max(1, octaves) {
            let n = 1.0 - abs(noise(x: x * frequency, y: y * frequency))
            total += n * n * amplitude
            norm += amplitude
            amplitude *= 0.5
            frequency *= 2.1
        }
        return norm > 0 ? total / norm : 0
    }
}

// ============================================================
// MARK: - 3. Maze carvers (DFS backtracker + Prim's)
// ============================================================

/// Integer cell for carving grids.
struct CarveCell: Hashable {
    var x: Int
    var z: Int
}

/// Carve result: open cells + build stats.
struct MazeCarveResult {
    var open: Set<CarveCell>
    var steps: Int
    var deadEnds: Int
    var algorithm: String

    /// Dead-end cells (exactly one open orthogonal neighbor).
    static func countDeadEnds(_ open: Set<CarveCell>) -> Int {
        var count = 0
        for c in open {
            var neighbors = 0
            for (dx, dz) in [(2, 0), (-2, 0), (0, 2), (0, -2)] {
                if open.contains(CarveCell(x: c.x + dx, z: c.z + dz)) {
                    neighbors += 1
                }
            }
            if neighbors == 1 {
                count += 1
            }
        }
        return count
    }
}

/// Maze carvers over an odd-sized cell grid (walls between cells).
enum MazeCarver {
    /// Iterative depth-first search (recursive backtracker without the
    /// recursion): long winding passages, many dead ends. This is what
    /// the TunnelMaze uses today.
    static func backtracker(width: Int, depth: Int, seed: UInt64) -> MazeCarveResult {
        var rng = SeededRNG(seed: seed)
        let w = max(3, width | 1)
        let d = max(3, depth | 1)
        var open = Set<CarveCell>()
        var stack: [CarveCell] = []
        let start = CarveCell(x: 1, z: 1)
        open.insert(start)
        stack.append(start)
        var steps = 0
        let dirs = [(2, 0), (-2, 0), (0, 2), (0, -2)]
        while !stack.isEmpty && steps < w * d * 4 {
            steps += 1
            let cur = stack.last!
            var options: [(dx: Int, dz: Int, nx: Int, nz: Int)] = []
            for (dx, dz) in dirs {
                let nx = cur.x + dx, nz = cur.z + dz
                if nx > 0 && nx < w - 1 && nz > 0 && nz < d - 1
                    && !open.contains(CarveCell(x: nx, z: nz)) {
                    options.append((dx, dz, nx, nz))
                }
            }
            if let pick = rng.pick(options) {
                open.insert(CarveCell(x: cur.x + pick.dx / 2, z: cur.z + pick.dz / 2))
                open.insert(CarveCell(x: pick.nx, z: pick.nz))
                stack.append(CarveCell(x: pick.nx, z: pick.nz))
            } else {
                stack.removeLast()
            }
        }
        return MazeCarveResult(
            open: open, steps: steps,
            deadEnds: MazeCarveResult.countDeadEnds(open),
            algorithm: "DFS backtracker"
        )
    }

    /// Prim's algorithm (randomized): bushier maze, shorter dead ends,
    /// more junctions — the Roblox fork-heavy feel.
    static func prims(width: Int, depth: Int, seed: UInt64) -> MazeCarveResult {
        var rng = SeededRNG(seed: seed)
        let w = max(3, width | 1)
        let d = max(3, depth | 1)
        var open = Set<CarveCell>()
        var frontier: [CarveCell] = []
        var inFrontier = Set<CarveCell>()
        let start = CarveCell(x: 1, z: 1)
        open.insert(start)
        var steps = 0
        func pushFrontier(_ c: CarveCell) {
            for (dx, dz) in [(2, 0), (-2, 0), (0, 2), (0, -2)] {
                let n = CarveCell(x: c.x + dx, z: c.z + dz)
                if n.x > 0 && n.x < w - 1 && n.z > 0 && n.z < d - 1
                    && !open.contains(n) && !inFrontier.contains(n) {
                    frontier.append(n)
                    inFrontier.insert(n)
                }
            }
        }
        pushFrontier(start)
        while !frontier.isEmpty && steps < w * d * 4 {
            steps += 1
            let pickIndex = rng.nextInt(in: 0..<frontier.count)
            let cell = frontier.remove(at: pickIndex)
            inFrontier.remove(cell)
            // Connect to a random open neighbor (two away).
            var links: [(Int, Int)] = []
            for (dx, dz) in [(2, 0), (-2, 0), (0, 2), (0, -2)] {
                let n = CarveCell(x: cell.x + dx, z: cell.z + dz)
                if open.contains(n) {
                    links.append((dx, dz))
                }
            }
            guard let link = rng.pick(links) else { continue }
            open.insert(CarveCell(x: cell.x + link.0 / 2, z: cell.z + link.1 / 2))
            open.insert(cell)
            pushFrontier(cell)
        }
        return MazeCarveResult(
            open: open, steps: steps,
            deadEnds: MazeCarveResult.countDeadEnds(open),
            algorithm: "Prim's"
        )
    }

    /// Braid: knock a fraction of dead-end walls for loops (less
    /// frustrating hunts, more escape routes).
    static func braid(_ result: MazeCarveResult, width: Int, depth: Int, removeFraction: Double, seed: UInt64) -> MazeCarveResult {
        var rng = SeededRNG(seed: seed)
        var open = result.open
        let dirs = [(2, 0), (-2, 0), (0, 2), (0, -2)]
        var deadEnds: [CarveCell] = []
        for c in open {
            var neighbors = 0
            for (dx, dz) in dirs where open.contains(CarveCell(x: c.x + dx, z: c.z + dz)) {
                neighbors += 1
            }
            if neighbors == 1 {
                deadEnds.append(c)
            }
        }
        deadEnds = rng.shuffle(deadEnds)
        let kill = Int(Double(deadEnds.count) * min(1, max(0, removeFraction)))
        for c in deadEnds.prefix(kill) {
            var walls: [(Int, Int)] = []
            for (dx, dz) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
                let n = CarveCell(x: c.x + dx, z: c.z + dz)
                if !open.contains(n) && n.x >= 0 && n.x < width && n.z >= 0 && n.z < depth {
                    walls.append((dx, dz))
                }
            }
            if let w = rng.pick(walls) {
                open.insert(CarveCell(x: c.x + w.0, z: c.z + w.1))
            }
        }
        return MazeCarveResult(
            open: open, steps: result.steps,
            deadEnds: MazeCarveResult.countDeadEnds(open),
            algorithm: result.algorithm + " + braid"
        )
    }
}

// ============================================================
// MARK: - 4. A* pathfinding (wall-aware hunting)
// ============================================================

/// Grid A*: shortest path around walls for monster hunting.
/// Nodes are integer pairs; the caller supplies walkability, so the same
/// code drives maze grids, mine floors or UI graphs.
enum AStarPathfinder {
    struct Node: Hashable {
        var x: Int
        var z: Int

        /// Grid-style alias: y is the row axis (same as z). Lets 2D demo
        /// code read naturally while the hunter uses x/z world axes.
        init(x: Int, z: Int) {
            self.x = x
            self.z = z
        }

        init(x: Int, y: Int) {
            self.x = x
            self.z = y
        }

        var y: Int { z }
    }

    /// Binary-heap priority queue (min-heap on f-score).
    private struct Heap {
        var items: [(node: Node, f: Double)] = []

        var isEmpty: Bool { items.isEmpty }

        mutating func push(_ node: Node, f: Double) {
            items.append((node, f))
            var i = items.count - 1
            while i > 0 {
                let parent = (i - 1) / 2
                if items[i].f >= items[parent].f { break }
                items.swapAt(i, parent)
                i = parent
            }
        }

        mutating func pop() -> Node? {
            guard !items.isEmpty else { return nil }
            let top = items[0].node
            items[0] = items[items.count - 1]
            items.removeLast()
            var i = 0
            while true {
                let left = i * 2 + 1
                let right = left + 1
                var smallest = i
                if left < items.count && items[left].f < items[smallest].f {
                    smallest = left
                }
                if right < items.count && items[right].f < items[smallest].f {
                    smallest = right
                }
                if smallest == i { break }
                items.swapAt(i, smallest)
                i = smallest
            }
            return top
        }
    }

    private static func heuristic(_ a: Node, _ b: Node) -> Double {
        // Octile distance (8-directional movement).
        let dx = abs(Double(a.x - b.x))
        let dz = abs(Double(a.z - b.z))
        return max(dx, dz) + 0.4142 * min(dx, dz)
    }

    /// Find a path. Returns waypoint nodes start→goal, or nil.
/// - Parameters:
    ///   - start: hunter cell. Goal: prey cell.
    ///   - walkable: test per cell (walls return false).
    ///   - maxIter: node budget (keeps hunts cheap on huge maps).
    static func findPath(
        start: Node,
        goal: Node,
        walkable: (Node) -> Bool,
        maxIter: Int = 600
    ) -> [Node]? {
        if start == goal { return [start] }
        var open = Heap()
        var cameFrom: [Node: Node] = [:]
        var gScore: [Node: Double] = [start: 0]
        open.push(start, f: heuristic(start, goal))
        var closed = Set<Node>()
        var iter = 0
        let dirs = [
            (1, 0, 1.0), (-1, 0, 1.0), (0, 1, 1.0), (0, -1, 1.0),
            (1, 1, 1.4142), (1, -1, 1.4142), (-1, 1, 1.4142), (-1, -1, 1.4142),
        ]
        while !open.isEmpty && iter < maxIter {
            iter += 1
            guard let current = open.pop() else { break }
            if current == goal {
                // Reconstruct.
                var path = [current]
                var c = current
                while let prev = cameFrom[c] {
                    path.append(prev)
                    c = prev
                }
                return path.reversed()
            }
            if closed.contains(current) { continue }
            closed.insert(current)
            let currentG = gScore[current, default: .infinity]
            for (dx, dz, cost) in dirs {
                let next = Node(x: current.x + dx, z: current.z + dz)
                if closed.contains(next) { continue }
                // No corner cutting through diagonal walls.
                if dx != 0 && dz != 0 {
                    let sideA = Node(x: current.x + dx, z: current.z)
                    let sideB = Node(x: current.x, z: current.z + dz)
                    if !walkable(sideA) && !walkable(sideB) { continue }
                }
                if !walkable(next) && next != goal { continue }
                let tentative = currentG + cost
                if tentative < gScore[next, default: .infinity] {
                    cameFrom[next] = current
                    gScore[next] = tentative
                    open.push(next, f: tentative + heuristic(next, goal))
                }
            }
        }
        return nil
    }

    /// Shortcut smoothing: drop waypoints with clear line-of-sight.
    static func smooth(_ path: [Node], walkable: (Node) -> Bool) -> [Node] {
        guard path.count > 2 else { return path }
        var out = [path[0]]
        var anchor = 0
        var i = 2
        while i < path.count {
            if hasLineOfSight(path[anchor], path[i], walkable: walkable) {
                i += 1
            } else {
                out.append(path[i - 1])
                anchor = i - 1
                i = anchor + 2
            }
        }
        out.append(path.last!)
        return out
    }

    private static func hasLineOfSight(_ a: Node, _ b: Node, walkable: (Node) -> Bool) -> Bool {
        // Supercover line walk between cells.
        let steps = max(abs(b.x - a.x), abs(b.z - a.z)) * 2
        guard steps > 0 else { return true }
        for s in 0...steps {
            let t = Double(s) / Double(steps)
            let n = Node(
                x: Int((Double(a.x) * (1 - t) + Double(b.x) * t).rounded()),
                z: Int((Double(a.z) * (1 - t) + Double(b.z) * t).rounded())
            )
            if !walkable(n) { return false }
        }
        return true
    }
}

// ============================================================
// MARK: - 5. Voxel raycaster (pixel-exact picking)
// ============================================================

/// Amanatides & Woo voxel traversal: fire a ray through a voxel field
/// and report the first solid cell, distance and face normal.
enum MineRaycaster {
    struct Hit: Equatable {
        var x: Int
        var y: Int
        var z: Int
        var distance: Float
        var nx: Float
        var ny: Float
        var nz: Float
    }

    /// March a ray. `solid` answers per integer cell. Positions and
    /// direction are in the same units as the field (world units here).
    static func castVoxel(
        origin: SIMD3<Float>,
        direction: SIMD3<Float>,
        maxDistance: Float,
        solid: (Int, Int, Int) -> Bool
    ) -> Hit? {
        var x = Int(floor(origin.x))
        var y = Int(floor(origin.y))
        var z = Int(floor(origin.z))
        let len = simd_length(direction)
        guard len > 0 else { return nil }
        let dir = direction / len
        let stepX = dir.x > 0 ? 1 : -1
        let stepY = dir.y > 0 ? 1 : -1
        let stepZ = dir.z > 0 ? 1 : -1
        let tDeltaX: Float = dir.x != 0 ? abs(1 / dir.x) : .infinity
        let tDeltaY: Float = dir.y != 0 ? abs(1 / dir.y) : .infinity
        let tDeltaZ: Float = dir.z != 0 ? abs(1 / dir.z) : .infinity
        var tMaxX: Float = dir.x != 0
            ? (dir.x > 0 ? Float(x + 1) - origin.x : origin.x - Float(x)) * tDeltaX
            : .infinity
        var tMaxY: Float = dir.y != 0
            ? (dir.y > 0 ? Float(y + 1) - origin.y : origin.y - Float(y)) * tDeltaY
            : .infinity
        var tMaxZ: Float = dir.z != 0
            ? (dir.z > 0 ? Float(z + 1) - origin.z : origin.z - Float(z)) * tDeltaZ
            : .infinity
        var nx: Float = 0
        var ny: Float = 0
        var nz: Float = 0
        var t: Float = 0
        // Skip the starting cell (the eye is in air).
        var guardCount = 0
        while t <= maxDistance && guardCount < 512 {
            guardCount += 1
            if tMaxX < tMaxY && tMaxX < tMaxZ {
                x += stepX
                t = tMaxX
                tMaxX += tDeltaX
                nx = Float(-stepX)
                ny = 0
                nz = 0
            } else if tMaxY < tMaxZ {
                y += stepY
                t = tMaxY
                tMaxY += tDeltaY
                nx = 0
                ny = Float(-stepY)
                nz = 0
            } else {
                z += stepZ
                t = tMaxZ
                tMaxZ += tDeltaZ
                nx = 0
                ny = 0
                nz = Float(-stepZ)
            }
            if t > maxDistance { return nil }
            if solid(x, y, z) {
                return Hit(x: x, y: y, z: z, distance: t, nx: nx, ny: ny, nz: nz)
            }
        }
        return nil
    }

    /// Nearest point on a ray to a target (for proximity picking).
    static func rayDistance(origin: SIMD3<Float>, direction: SIMD3<Float>, point: SIMD3<Float>) -> Float {
        let len = simd_length(direction)
        guard len > 0 else { return simd_length(point - origin) }
        let d = direction / len
        let toPoint = point - origin
        let along = simd_dot(toPoint, d)
        if along < 0 { return simd_length(toPoint) }
        let closest = origin + d * along
        return simd_length(point - closest)
    }
}

// ============================================================
// MARK: - 6. Algorithm showcase
// ============================================================

/// Noise field visualizer: Perlin vs fBm vs ridged + vein overlay.
struct MineNoiseShowcase: View {
    @State private var seed: UInt64 = 7
    @State private var mode = 0
    private let modes = ["Perlin", "fBm ×4", "Ridged", "Veins"]

    var body: some View {
        VStack(spacing: 10) {
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    let noise = PerlinNoise(seed: seed)
                    let res = 46.0
                    let cw = Double(size.width) / res
                    let ch = Double(size.height) / res
                    for ix in 0..<Int(res) {
                        for iy in 0..<Int(res) {
                            let nx = Double(ix) / res * 4 + t * 0.05
                            let ny = Double(iy) / res * 4
                            let v: Double
                            switch mode {
                            case 0: v = noise.noise(x: nx, y: ny)
                            case 1: v = noise.fbm(x: nx, y: ny)
                            case 2: v = noise.ridged(x: nx, y: ny)
                            default: v = noise.fbm(x: nx, y: ny)
                            }
                            var color: Color
                            if mode == 3 {
                                // Vein overlay: hot where fBm peaks.
                                if v > 0.42 {
                                    color = Color(red: 1.0, green: 0.8, blue: 0.2)
                                } else if v > 0.2 {
                                    color = Color(red: 0.5, green: 0.35, blue: 0.2)
                                } else {
                                    color = Color(white: 0.12)
                                }
                            } else {
                                let k = max(0, min(1, (v + 1) / 2))
                                color = Color(red: k * 0.9 + 0.1, green: k * 0.6 + 0.08, blue: k * 0.9 + 0.15)
                            }
                            context.fill(
                                Path(CGRect(x: Double(ix) * cw, y: Double(iy) * ch, width: cw + 0.5, height: ch + 0.5)),
                                with: .color(color)
                            )
                        }
                    }
                }
            }
            .frame(height: 240)
            .cornerRadius(14)
            Picker("Field", selection: $mode) {
                ForEach(modes.indices, id: \.self) { i in
                    Text(modes[i]).tag(i)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            Button("Reseed (🎲 \(seed))") {
                seed = UInt64.random(in: 1...9999)
                SpookyHaptics.play(.light)
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            Text("Perlin noise drives organic caves; thresholded fBm places ore veins. Same seed, same mountain — every time.")
                .font(.caption).foregroundStyle(.secondary)
                .padding(.horizontal)
        }
    }
}

/// Carver comparison: DFS vs Prim's on twin grids with live stats.
struct MineCarverShowcase: View {
    @State private var seed: UInt64 = 42
    @State private var braid = true

    private func carveDFS() -> MazeCarveResult {
        let r = MazeCarver.backtracker(width: 21, depth: 21, seed: seed)
        return braid ? MazeCarver.braid(r, width: 21, depth: 21, removeFraction: 0.25, seed: seed) : r
    }

    private func carvePrim() -> MazeCarveResult {
        let r = MazeCarver.prims(width: 21, depth: 21, seed: seed)
        return braid ? MazeCarver.braid(r, width: 21, depth: 21, removeFraction: 0.25, seed: seed) : r
    }

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                carveCard(title: "DFS backtracker", result: carveDFS(), tint: .orange)
                carveCard(title: "Prim's", result: carvePrim(), tint: .cyan)
            }
            .padding(.horizontal)
            Toggle("Braid loops (25% dead ends opened)", isOn: $braid)
                .padding(.horizontal, 40)
            Button("Reseed (🎲 \(seed))") {
                seed = UInt64.random(in: 1...9999)
                SpookyHaptics.play(.light)
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            Text("DFS winds long and lonely; Prim's branches bushy with junctions. The maze ships DFS; frontier forks echo Prim's spirit.")
                .font(.caption).foregroundStyle(.secondary)
                .padding(.horizontal)
        }
    }

    private func carveCard(title: String, result: MazeCarveResult, tint: Color) -> some View {
        VStack(spacing: 6) {
            Text(title).font(.subheadline.bold())
            MineCarveGrid(open: result.open, width: 21, depth: 21, tint: tint)
                .frame(height: 150)
            Text("\(result.open.count) cells • \(result.deadEnds) dead ends • \(result.steps) steps")
                .font(.caption2).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(8)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

/// Mini maze grid renderer.
struct MineCarveGrid: View {
    var open: Set<CarveCell>
    var width: Int
    var depth: Int
    var tint: Color

    var body: some View {
        GeometryReader { geo in
            let cw = geo.size.width / CGFloat(width)
            let ch = geo.size.height / CGFloat(depth)
            Path { p in
                for c in open {
                    p.addRect(CGRect(
                        x: CGFloat(c.x) * cw, y: CGFloat(c.z) * ch,
                        width: cw + 0.5, height: ch + 0.5
                    ))
                }
            }
            .fill(tint.opacity(0.85))
        }
    }
}

/// A* demo: tap to set walls, watch the agent path around them.
struct MineAStarShowcase: View {
    @State private var walls: Set<AStarPathfinder.Node> = [
        .init(x: 4, y: 2), .init(x: 4, y: 3), .init(x: 4, y: 4),
        .init(x: 4, y: 5), .init(x: 7, y: 5), .init(x: 7, y: 6),
        .init(x: 7, y: 7), .init(x: 5, y: 7),
    ]
    @State private var agent = AStarPathfinder.Node(x: 1, y: 1)
    @State private var hunting = false
    private let goal = AStarPathfinder.Node(x: 10, y: 8)
    private let grid = 12

    private func path() -> [AStarPathfinder.Node] {
        AStarPathfinder.smooth(
            AStarPathfinder.findPath(
                start: agent, goal: goal,
                walkable: { n in
                    n.x >= 0 && n.x < grid && n.y >= 0 && n.y < grid && !walls.contains(n)
                }
            ) ?? [],
            walkable: { n in
                n.x >= 0 && n.x < grid && n.y >= 0 && n.y < grid && !walls.contains(n)
            }
        )
    }

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                // Grid.
                VStack(spacing: 1) {
                    ForEach(0..<grid, id: \.self) { y in
                        HStack(spacing: 1) {
                            ForEach(0..<grid, id: \.self) { x in
                                let n = AStarPathfinder.Node(x: x, y: y)
                                Rectangle()
                                    .fill(
                                        walls.contains(n) ? Color(white: 0.25)
                                            : (path().contains(n) ? Color.green.opacity(0.5) : Color.white.opacity(0.07))
                                    )
                                    .frame(width: 22, height: 22)
                                    .onTapGesture {
                                        if n != agent && n != goal {
                                            if walls.contains(n) {
                                                walls.remove(n)
                                            } else {
                                                walls.insert(n)
                                            }
                                            SpookyHaptics.play(.light)
                                        }
                                    }
                            }
                        }
                    }
                }
                // Agent + goal pins (overlay, aligned by grid math).
                Text("👾").font(.title3)
                    .offset(x: CGFloat(agent.x - 5) * 23 - 11, y: CGFloat(agent.y - 5) * 23 - 11)
                    .animation(.spring(response: 0.4, dampingFraction: 0.6), value: agent)
                Text("🏆").font(.title3)
                    .offset(x: CGFloat(goal.x - 5) * 23 - 11, y: CGFloat(goal.y - 5) * 23 - 11)
            }
            .frame(height: 280)
            HStack(spacing: 12) {
                Button(hunting ? "Stop hunt" : "Hunt!") {
                    hunting.toggle()
                    if hunting { step() }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                Button("Reset walls") {
                    walls = [
                        .init(x: 4, y: 2), .init(x: 4, y: 3), .init(x: 4, y: 4),
                        .init(x: 4, y: 5), .init(x: 7, y: 5), .init(x: 7, y: 6),
                        .init(x: 7, y: 7), .init(x: 5, y: 7),
                    ]
                    agent = AStarPathfinder.Node(x: 1, y: 1)
                    hunting = false
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
            Text("Tap walls to build / remove. Hunt walks the green A* path. In-game, maze monsters use this to corner you fairly.")
                .font(.caption).foregroundStyle(.secondary)
                .padding(.horizontal)
        }
    }

    private func step() {
        guard hunting else { return }
        let p = path()
        if p.count > 1 {
            agent = p[1]
        }
        if agent == goal {
            hunting = false
            SpookyHaptics.play(.reward)
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            step()
        }
    }
}

/// Raycast demo: spinning ray through a voxel slice, hit marker + readout.
struct MineRaycastShowcase: View {
    @State private var angle = 0.0
    private let blocks: Set<String> = ["3,3", "5,4", "7,2", "8,6", "2,7", "6,8"]

    var body: some View {
        VStack(spacing: 8) {
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    let w = Double(size.width), h = Double(size.height)
                    let cell = w / 11
                    // Voxel slice.
                    for key in blocks {
                        let parts = key.split(separator: ",")
                        guard parts.count == 2,
                              let bx = Int(parts[0]), let bz = Int(parts[1]) else { continue }
                        context.fill(
                            Path(CGRect(x: Double(bx) * cell, y: Double(bz) * cell, width: cell, height: cell)),
                            with: .color(.orange)
                        )
                    }
                    // Eye + spinning ray.
                    let eye = SIMD3<Float>(0.5, 0.5, 0)
                    let dir = SIMD3<Float>(Float(cos(t * 0.7)), Float(sin(t * 0.7)), 0)
                    let hit = MineRaycaster.castVoxel(
                        origin: eye, direction: dir, maxDistance: 20,
                        solid: { x, y, _ in blocks.contains("\(x),\(y)") }
                    )
                    let end: CGPoint
                    if let hit = hit {
                        end = CGPoint(x: Double(hit.x) * cell + cell / 2, y: Double(hit.y) * cell + cell / 2)
                        // Hit marker.
                        context.stroke(
                            Circle().path(in: CGRect(x: end.x - 10, y: end.y - 10, width: 20, height: 20)),
                            with: .color(.green),
                            lineWidth: 2.5
                        )
                    } else {
                        end = CGPoint(x: Double(eye.x) + Double(dir.x) * 300, y: Double(eye.y) + Double(dir.y) * 300)
                    }
                    var ray = Path()
                    ray.move(to: CGPoint(x: Double(eye.x) * cell, y: Double(eye.y) * cell))
                    ray.addLine(to: end)
                    context.stroke(ray, with: .color(.yellow), lineWidth: 2)
                    context.fill(
                        Circle().path(in: CGRect(x: Double(eye.x) * cell - 5, y: Double(eye.y) * cell - 5, width: 10, height: 10)),
                        with: .color(.white)
                    )
                }
            }
            .frame(height: 240)
            .background(Color.black)
            .cornerRadius(14)
            .padding(.horizontal)
            Text("Amanatides & Woo voxel traversal: the ray reports the first solid cell, distance and face. The mine's tap-to-mine uses this math.")
                .font(.caption).foregroundStyle(.secondary)
                .padding(.horizontal)
        }
    }
}

// ============================================================
// MARK: - 7. Algorithms showcase hub
// ============================================================

/// Systems lab: noise, carvers, A*, raycast — the genre engine room.
struct MineAlgorithmsShowcaseView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 22) {
                    VStack(spacing: 8) {
                        Text("🌊 Perlin noise fields").font(.headline)
                        MineNoiseShowcase()
                    }
                    VStack(spacing: 8) {
                        Text("🌀 DFS vs Prim's").font(.headline)
                        MineCarverShowcase()
                    }
                    VStack(spacing: 8) {
                        Text("🎯 A* hunting demo (tap walls!)").font(.headline)
                        MineAStarShowcase()
                    }
                    VStack(spacing: 8) {
                        Text("🔫 Voxel raycast").font(.headline)
                        MineRaycastShowcase()
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Systems Lab")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
