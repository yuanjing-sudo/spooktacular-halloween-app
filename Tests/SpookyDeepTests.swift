//
//  SpookyDeepTests.swift
//  HalloweenSpooktacularUltimateTests
//
//  Deep smooth-logic tests, part 2: property fuzz, state-machine
//  lifecycles, upgrade chains, catalog coverage, streak scenarios and
//  exhaustive sweeps. Complements SpookyLogicTests (mirrors).
//

import XCTest
@testable import HalloweenSpooktacularUltimate

// ============================================================
// MARK: - 1. Easing properties
// ============================================================

final class EasingPropertyTests: XCTestCase {
    func testMonotonicWhereExpected() {
        for kind in [MineEasing.linear, .quadOut, .cubicOut, .sineInOut] as [MineEasing] {
            var prev = -Double.infinity
            for i in 0...100 {
                let v = kind.value(Double(i) / 100)
                XCTAssertGreaterThanOrEqual(v, prev - 1e-9, "\(kind)")
                prev = v
            }
        }
    }

    func testMapEndpoints() {
        XCTAssertEqual(MineEasing.quadOut.map(from: 10, to: 20, t: 0), 10, accuracy: 1e-9)
        XCTAssertEqual(MineEasing.quadOut.map(from: 10, to: 20, t: 1), 20, accuracy: 1e-9)
    }

    func testDeterministic() {
        XCTAssertEqual(MineEasing.sineInOut.value(0.37), MineEasing.sineInOut.value(0.37))
    }
}

// ============================================================
// MARK: - 2. RNG + noise properties
// ============================================================

final class NoisePropertyTests: XCTestCase {
    func testDrawUniqueness() {
        var rng = SeededRNG(seed: 1234)
        var seen = Set<UInt64>()
        for _ in 0..<1000 {
            seen.insert(rng.next())
        }
        XCTAssertEqual(seen.count, 1000)
    }

    func testPerlinMeanNearZero() {
        let noise = PerlinNoise(seed: 20240)
        var total = 0.0
        var n = 0
        for x in stride(from: 0, to: 40, by: 2) {
            for y in stride(from: 0, to: 40, by: 2) {
                total += noise.noise(x: Double(x) * 0.2, y: Double(y) * 0.2)
                n += 1
            }
        }
        XCTAssertLessThan(abs(total / Double(n)), 0.12)
    }

    func testPerlinContinuity() {
        let noise = PerlinNoise(seed: 20240)
        var adj = 0.0
        var far = 0.0
        for i in 0..<60 {
            let x = Double(i % 10) * 0.7
            let y = Double(i / 10) * 0.9
            let base = noise.noise(x: x, y: y)
            adj += abs(base - noise.noise(x: x + 0.2, y: y))
            far += abs(base - noise.noise(x: x + 3.0, y: y + 3.0))
        }
        XCTAssertLessThan(adj / 60, far / 60)
    }
}

// ============================================================
// MARK: - 3. Carver fuzz (connectivity across seeds/sizes)
// ============================================================

final class CarverFuzzTests: XCTestCase {
    private func connected(_ cells: Set<CarveCell>) -> Bool {
        guard let start = cells.first(where: { $0.x == 1 && $0.z == 1 }) else { return false }
        var seen: Set<CarveCell> = [start]
        var stack = [start]
        let dirs = [(2, 0), (-2, 0), (0, 2), (0, -2), (1, 0), (-1, 0), (0, 1), (0, -1)]
        while let c = stack.popLast() {
            for (dx, dz) in dirs {
                let n = CarveCell(x: c.x + dx, z: c.z + dz)
                if cells.contains(n) && !seen.contains(n) {
                    seen.insert(n)
                    stack.append(n)
                }
            }
        }
        return seen == cells
    }

    func testConnectivityFuzz() {
        for seed in [1, 7, 99, 4242, 77777] as [UInt64] {
            for size in [9, 15] {
                XCTAssertTrue(
                    connected(MazeCarver.backtracker(width: size, depth: size, seed: seed).open),
                    "dfs seed \(seed) size \(size)"
                )
                XCTAssertTrue(
                    connected(MazeCarver.prims(width: size, depth: size, seed: seed).open),
                    "prim seed \(seed) size \(size)"
                )
            }
        }
    }

    func testBraidKeepsConnectivity() {
        for seed in [3, 11, 90210] as [UInt64] {
            let base = MazeCarver.backtracker(width: 15, depth: 15, seed: seed)
            let braided = MazeCarver.braid(base, width: 15, depth: 15, removeFraction: 0.25, seed: seed)
            XCTAssertLessThanOrEqual(braided.deadEnds, base.deadEnds)
            XCTAssertTrue(connected(braided.open))
        }
    }
}

// ============================================================
// MARK: - 4. A* optimality vs independent Dijkstra
// ============================================================

final class AStarOptimalityTests: XCTestCase {
    typealias Node = AStarPathfinder.Node

    private func dijkstra(start: Node, goal: Node, walkable: (Node) -> Bool) -> Double? {
        var dist: [Node: Double] = [start: 0]
        var pq: [(Double, Node)] = [(0, start)]
        var seen = Set<Node>()
        let dirs = [(1, 0, 1.0), (-1, 0, 1.0), (0, 1, 1.0), (0, -1, 1.0),
                    (1, 1, 1.4142), (1, -1, 1.4142), (-1, 1, 1.4142), (-1, -1, 1.4142)]
        while !pq.isEmpty {
            pq.sort(by: { $0.0 < $1.0 })
            let (d, cur) = pq.removeFirst()
            if cur == goal { return d }
            if seen.contains(cur) { continue }
            seen.insert(cur)
            for (dx, dz, cost) in dirs {
                let nxt = Node(x: cur.x + dx, z: cur.z + dz)
                if abs(nxt.x) > 12 || abs(nxt.z) > 12 { continue }
                if dx != 0 && dz != 0 {
                    let a = Node(x: cur.x + dx, z: cur.z)
                    let b = Node(x: cur.x, z: cur.z + dz)
                    if !walkable(a) && !walkable(b) { continue }
                }
                if !walkable(nxt) && nxt != goal { continue }
                let nd = d + cost
                if nd < dist[nxt, default: .infinity] {
                    dist[nxt] = nd
                    pq.append((nd, nxt))
                }
            }
        }
        return nil
    }

    private func cost(_ path: [Node]) -> Double {
        zip(path, path.dropFirst()).reduce(0.0) { acc, pair in
            acc + hypot(Double(pair.1.x - pair.0.x), Double(pair.1.z - pair.0.z))
        }
    }

    func testOptimalOnFixedFields() {
        // Hand-built fields (deterministic, no RNG in tests).
        let fields: [(walls: Set<Node>, s: Node, g: Node)] = [
            ([Node(x: 2, z: 0), Node(x: 2, z: 1), Node(x: 2, z: 2)], Node(x: 0, z: 1), Node(x: 4, z: 1)),
            ([Node(x: 1, z: 1), Node(x: 2, z: 1), Node(x: 3, z: 1)], Node(x: 0, z: 0), Node(x: 4, z: 2)),
            ([Node(x: 3, z: 3), Node(x: 3, z: 4), Node(x: 4, z: 3)], Node(x: 0, z: 0), Node(x: 6, z: 6)),
        ]
        for (walls, s, g) in fields {
            let walkable = { (n: Node) -> Bool in !walls.contains(n) }
            let path = AStarPathfinder.findPath(start: s, goal: g, walkable: walkable, maxIter: 2000)
            let opt = dijkstra(start: s, goal: g, walkable: walkable)
            XCTAssertEqual(path == nil, opt == nil)
            if let path = path, let opt = opt {
                XCTAssertEqual(cost(path), opt, accuracy: 1e-3)
            }
        }
    }

    func testValidityOnCarvedMazes() {
        for seed in [5001, 5002] as [UInt64] {
            let cells = MazeCarver.backtracker(width: 15, depth: 15, seed: seed).open
            let coarse = Set(cells.map({ Node(x: $0.x / 2, z: $0.z / 2) }))
            guard let s = coarse.min(by: { $0.x + $0.z < $1.x + $1.z }),
                  let g = coarse.max(by: { $0.x + $0.z < $1.x + $1.z }),
                  s != g else { continue }
            guard let path = AStarPathfinder.findPath(
                start: s, goal: g,
                walkable: { coarse.contains($0) }, maxIter: 1500
            ) else { continue }
            XCTAssertEqual(path.first, s)
            XCTAssertEqual(path.last, g)
            for node in path {
                XCTAssertTrue(coarse.contains(node))
            }
        }
    }
}

// ============================================================
// MARK: - 5. XP conservation + backpack invariants (sims)
// ============================================================

final class EconomyInvariantTests: XCTestCase {
    func testXPConservation() {
        let gains = [80, 5, 200, 17, 99, 250, 3, 130]
        var level = 1
        var xp = 0
        var banked = 0
        for earned in gains {
            xp += earned
            while xp >= SpookyCurves.xpForLevel(level) {
                let cost = SpookyCurves.xpForLevel(level)
                xp -= cost
                banked += cost
                level += 1
            }
        }
        XCTAssertEqual(banked + xp, gains.reduce(0, +))
        XCTAssertGreaterThanOrEqual(level, 1)
    }

    func testBackpackSimInvariants() {
        // Mirror of the pack loop: mine (cap-gated), sell (coal kept).
        var ores: [String: Int] = [:]
        var sell = 0
        var gold = 0
        let cap = 50
        let script: [(String, String, Int)] = [
            ("mine", "Iron Ore", 4), ("mine", "Coal Ore", 10), ("mine", "Gold Ore", 60),
            ("sell", "", 0), ("mine", "Diamond Ore", 25), ("mine", "Coal Ore", 5),
            ("sell", "", 0),
        ]
        for (op, name, value) in script {
            if op == "mine" {
                if ores.values.reduce(0, +) + 1 > cap { continue }
                ores[name, default: 0] += 1
                if name != "Coal Ore" { sell += value }
            } else {
                let coal = ores.removeValue(forKey: "Coal Ore") ?? 0
                gold += sell
                sell = 0
                ores = coal > 0 ? ["Coal Ore": coal] : [:]
            }
        }
        XCTAssertTrue(ores.values.allSatisfy({ $0 >= 0 }))
        XCTAssertGreaterThanOrEqual(sell, 0)
        XCTAssertGreaterThanOrEqual(gold, 0)
        XCTAssertLessThanOrEqual(ores.values.reduce(0, +), cap)
    }

    func testRebirthMonotonic() {
        let powers = (0...10).map({ SpookyCurves.rebirthPower(rebirths: $0) })
        XCTAssertEqual(powers, powers.sorted())
    }

    func testStreakMonotonic() {
        let rewards = [1, 3, 7, 14, 30, 60].map({ MineStreakRules.reward(streak: $0) })
        XCTAssertEqual(rewards, rewards.sorted())
    }
}

// ============================================================
// MARK: - 6. Board lifecycles (quest + expedition)
// ============================================================

final class BoardLifecycleTests: XCTestCase {
    func testQuestLifecycle() {
        let board = MineQuestBoard()
        board.resetAll()
        // First active quest is the first catalog entry.
        guard let first = MineQuestCatalog.all.first else {
            XCTFail("empty catalog")
            return
        }
        XCTAssertFalse(board.isDone(first))
        // Drive its trigger generically: break blocks for break quests.
        for _ in 0..<200 {
            board.record(.blockBroken)
        }
        // Progress advanced somewhere sensible; lifetime untouched by blocks.
        XCTAssertEqual(board.lifetimeSold, 0)
        board.record(.goldSold(amount: 500))
        XCTAssertEqual(board.lifetimeSold, 500)
        // Claim-once semantics on a completable quest.
        if let done = MineQuestCatalog.all.first(where: { board.isDone($0) }) {
            XCTAssertTrue(board.claim(done))
            XCTAssertFalse(board.claim(done))
        }
    }

    func testQuestCapsAtTarget() {
        let board = MineQuestBoard()
        board.resetAll()
        for _ in 0..<5000 {
            board.record(.blockBroken)
        }
        for quest in MineQuestCatalog.all {
            XCTAssertLessThanOrEqual(board.progressOf(quest), board.targetOf(quest))
        }
    }

    func testExpeditionLifecycle() {
        let board = MazeExpeditionBoard()
        board.resetAll()
        board.record(.closetOpened)
        board.record(.scoreEarned(points: 100))
        XCTAssertEqual(board.lifetimeScore, 100)
        board.record(.distanceBanked(meters: 40))
        XCTAssertEqual(board.lifetimeDistance, 40)
        for exp in MazeExpeditionCatalog.all {
            XCTAssertLessThanOrEqual(board.progressOf(exp), exp.target)
        }
    }
}

// ============================================================
// MARK: - 7. Upgrade chains + catalog coverage
// ============================================================

final class CoverageTests: XCTestCase {
    func testPickChainStrict() {
        let tiers = MNPickTier.allCases
        XCTAssertGreaterThanOrEqual(tiers.count, 5)
        XCTAssertEqual(tiers.map(\.rawValue), Array(0..<tiers.count))
        let damages = tiers.map(\.damage)
        XCTAssertEqual(damages, damages.sorted())
        XCTAssertEqual(Set(damages).count, damages.count, "damage strictly increasing")
        let costs = tiers.map(\.coalCost)
        XCTAssertEqual(costs, costs.sorted())
    }

    func testEveryTriggerFamilyHasQuests() {
        var counts: [String: Int] = [:]
        for quest in MineQuestCatalog.all {
            let key: String
            switch quest.trigger {
            case .breakBlocks: key = "break"
            case .mineOre: key = "ore"
            case .sellGold: key = "sell"
            case .earnXP: key = "xp"
            case .reachLayer: key = "layer"
            case .mapSectors: key = "sectors"
            case .openClosets: key = "closets"
            case .harvestCaves: key = "caves"
            case .unlockCaves: key = "unlock"
            case .hatchPets: key = "pets"
            case .forgePicks: key = "forge"
            case .upgradePacks: key = "packs"
            case .rebirth: key = "rebirth"
            case .greetCritters: key = "critters"
            case .slayMonsters: key = "slay"
            case .throwBombs: key = "bombs"
            case .reachDepth: key = "depth"
            }
            counts[key, default: 0] += 1
        }
        // Exhaustive switch above is itself a compile-time check that the
        // trigger enum didn't grow a case this test ignores.
        XCTAssertGreaterThanOrEqual(counts.count, 17)
        for (family, count) in counts {
            XCTAssertGreaterThanOrEqual(count, 1, family)
        }
    }

    func testLoreRulesAllUsed() {
        var seen = Set<String>()
        for echo in MineLoreCatalog.all {
            switch echo.rule {
            case .always: seen.insert("always")
            case .sectors: seen.insert("sectors")
            case .depth: seen.insert("depth")
            case .ore: seen.insert("ore")
            case .closets: seen.insert("closets")
            case .caves: seen.insert("caves")
            case .pets: seen.insert("pets")
            case .rebirths: seen.insert("rebirths")
            case .level: seen.insert("level")
            case .gold: seen.insert("gold")
            case .critters: seen.insert("critters")
            case .seals: seen.insert("seals")
            case .fish: seen.insert("fish")
            case .events: seen.insert("events")
            case .trader: seen.insert("trader")
            }
        }
        XCTAssertEqual(seen.count, 15)
    }

    func testIDUniquenessEverywhere() {
        let questIDs = MineQuestCatalog.all.map(\.id)
        XCTAssertEqual(Set(questIDs).count, questIDs.count)
        let expIDs = MazeExpeditionCatalog.all.map(\.id)
        XCTAssertEqual(Set(expIDs).count, expIDs.count)
        let loreIDs = MineLoreCatalog.all.map(\.id)
        XCTAssertEqual(Set(loreIDs).count, loreIDs.count)
    }
}

// ============================================================
// MARK: - 8. Streak scenarios + region/layer sweeps
// ============================================================

final class ScenarioTests: XCTestCase {
    func testStoreStreakScenarios() {
        // daysBetween is the pure core of streak math.
        XCTAssertEqual(SpookyStore.daysBetween("2026-03-01", "2026-03-01"), 0)
        XCTAssertEqual(SpookyStore.daysBetween("2026-03-01", "2026-03-03"), 2)
        XCTAssertEqual(SpookyStore.daysBetween("2026-01-31", "2026-02-01"), 1)
        XCTAssertEqual(SpookyStore.daysBetween("2024-02-28", "2024-02-29"), 1)
        XCTAssertEqual(SpookyStore.daysBetween("2025-12-31", "2026-01-01"), 1)
        XCTAssertEqual(SpookyStore.daysBetween("2026-03-05", "2026-03-01"), -4)
        XCTAssertNil(SpookyStore.daysBetween("nope", "2026-01-01"))
    }

    func testRegionSweep() {
        let valid: Set<String> = ["northgate-west", "northgate-east", "deeps-west", "deeps-east",
                                  "heart-west", "heart-east", "warrens-west", "warrens-east",
                                  "far-west", "far-east"]
        var seen = Set<String>()
        var x = -300.0
        while x <= 300 {
            var z = -300.0
            while z <= 300 {
                let id = MazeRegionAtlas.at(x: Float(x), z: Float(z)).id
                XCTAssertTrue(valid.contains(id))
                seen.insert(id)
                z += 30
            }
            x += 30
        }
        XCTAssertEqual(seen, valid)
    }

    func testRegionBoundaries() {
        XCTAssertEqual(MazeRegionAtlas.at(x: 0, z: -120).id, "deeps-east")
        XCTAssertEqual(MazeRegionAtlas.at(x: 0, z: -40).id, "heart-east")
        XCTAssertEqual(MazeRegionAtlas.at(x: 0, z: 40).id, "warrens-east")
        XCTAssertEqual(MazeRegionAtlas.at(x: 0, z: 120).id, "far-east")
        XCTAssertEqual(MazeRegionAtlas.at(x: -1, z: 0).id, "heart-west")
    }

    func testLayerSweep() {
        let valid: Set<String> = ["Sunlit Tops", "Dirt Tunnels", "Stone Depths",
                                  "Deepstone", "Crystal Hollows", "Magma Core"]
        var seen = Set<String>()
        var y = -8.0
        while y <= 6.0 {
            seen.insert(MNDepthLayer.at(y: Float(y)).title)
            y += 0.5
        }
        XCTAssertEqual(seen, valid)
        XCTAssertEqual(MNDepthLayer.at(y: -4.51).title, "Magma Core")
    }

    func testSpinDistributionSanity() {
        var counts: [String: Int] = [:]
        for _ in 0..<2000 {
            let prize = MineSpinTable.roll()
            counts[prize.label, default: 0] += 1
        }
        // Common outcomes dominate; jackpot stays mythic.
        let common = counts.values.max() ?? 0
        let jackpot = counts["JACKPOT +1500"] ?? 0
        XCTAssertGreaterThan(common, 200)
        XCTAssertLessThan(jackpot, 150)
        XCTAssertGreaterThan(counts.values.reduce(0, +), 1900)
    }
}
