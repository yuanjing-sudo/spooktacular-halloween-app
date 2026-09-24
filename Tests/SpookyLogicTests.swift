//
//  SpookyLogicTests.swift
//  HalloweenSpooktacularUltimateTests
//
//  Advanced smooth-logic tests: easing math, oscillators, scoring,
//  curves, seeded RNG, Perlin fields, maze carvers, A* hunting,
//  raycast picking, quest/expedition routing, world-data consistency,
//  economy tiers and the net-loop authority. Run on Mac via
//  `xcodegen generate` + `xcodebuild test` (see Tests/README).
//

import XCTest
@testable import HalloweenSpooktacularUltimate

/// File-scope helper: local types can't reliably synthesize Codable.
private struct SpookyCorruptBox: Codable, Equatable {
    var n: Int
}

// ============================================================
// MARK: - 1. Easing math (MineEasing)
// ============================================================

final class EasingTests: XCTestCase {
    func testEndpoints() {
        for kind in [MineEasing.linear, .quadIn, .quadOut, .quadInOut,
                     .cubicIn, .cubicOut, .cubicInOut, .quartOut,
                     .sineInOut, .elasticOut, .bounceOut] {
            XCTAssertEqual(kind.value(0), 0, accuracy: 1e-9, "\(kind)@0")
            XCTAssertEqual(kind.value(1), 1, accuracy: 1e-3, "\(kind)@1")
        }
        // backOut intentionally lands exactly too.
        XCTAssertEqual(MineEasing.backOut.value(0), 0, accuracy: 1e-9)
        XCTAssertEqual(MineEasing.backOut.value(1), 1, accuracy: 1e-3)
    }

    func testCharacter() {
        XCTAssertGreaterThan(MineEasing.quadOut.value(0.25), 0.4, "fast start")
        XCTAssertLessThan(MineEasing.quadIn.value(0.25), 0.1, "slow start")
        XCTAssertEqual(MineEasing.linear.value(0.5), 0.5, accuracy: 1e-9)
        XCTAssertGreaterThan(MineEasing.backOut.value(0.7), 1.0, "overshoot")
    }

    func testMap() {
        XCTAssertEqual(MineEasing.linear.map(from: 10, to: 20, t: 0.5), 15, accuracy: 1e-9)
        XCTAssertEqual(MineEasing.quadOut.map(from: 0, to: 100, t: 1), 100, accuracy: 1e-3)
    }

    func testCatalogComplete() {
        XCTAssertEqual(MineEasing.all.count, 12)
        XCTAssertFalse(MineEasing.all.map(\.title).contains(""))
    }
}

// ============================================================
// MARK: - 2. Oscillators + smoother
// ============================================================

final class LoopMathTests: XCTestCase {
    func testPingPongBounds() {
        for i in 0..<200 {
            let v = MineOscillator.pingPong(now: Double(i) * 0.37, period: 2.0)
            XCTAssertGreaterThanOrEqual(v, 0)
            XCTAssertLessThanOrEqual(v, 1)
        }
    }

    func testPingPongEndpoints() {
        XCTAssertEqual(MineOscillator.pingPong(now: 0, period: 2.0), 0, accuracy: 1e-9)
        XCTAssertEqual(MineOscillator.pingPong(now: 1.0, period: 2.0), 1.0, accuracy: 0.05)
    }

    func testSmootherConverges() {
        var s = MineSmoother(current: 0, lambda: 8.0)
        for _ in 0..<600 {
            s.step(target: 100, dt: 1.0 / 60.0)
        }
        XCTAssertEqual(s.current, 100, accuracy: 0.01)
    }

    func testSmootherFrameRateIndependent() {
        var fast = MineSmoother(current: 0, lambda: 8.0)
        var slow = MineSmoother(current: 0, lambda: 8.0)
        for _ in 0..<600 { fast.step(target: 50, dt: 1.0 / 60.0) }
        for _ in 0..<150 { slow.step(target: 50, dt: 1.0 / 15.0) }
        XCTAssertEqual(fast.current, slow.current, accuracy: 2.0)
    }
}

// ============================================================
// MARK: - 3. Scoring + curves + numbers
// ============================================================

final class ScoringTests: XCTestCase {
    func testComboCap() {
        XCTAssertEqual(ProScoringEngine.comboMultiplier(combo: 0), 1.0, accuracy: 1e-9)
        XCTAssertEqual(ProScoringEngine.comboMultiplier(combo: 10), 1.5, accuracy: 1e-9)
        XCTAssertEqual(ProScoringEngine.comboMultiplier(combo: 1000), 3.0, accuracy: 1e-9)
    }

    func testStreakTiers() {
        XCTAssertEqual(ProScoringEngine.streakBonus(streak: 0), 0)
        XCTAssertEqual(ProScoringEngine.streakBonus(streak: 5), 10)
        XCTAssertEqual(ProScoringEngine.streakBonus(streak: 15), 70)
        XCTAssertEqual(ProScoringEngine.streakBonus(streak: 25), 125)
    }

    func testCaptureScore() {
        let common = ProScoringEngine.captureScore(basePoints: 20, combo: 0, isBoss: false, isShiny: false, rarity: .common)
        XCTAssertEqual(common, 20)
        let boss = ProScoringEngine.captureScore(basePoints: 20, combo: 0, isBoss: true, isShiny: false, rarity: .common)
        XCTAssertEqual(boss, 200)
        let shinyLegend = ProScoringEngine.captureScore(basePoints: 100, combo: 10, isBoss: true, isShiny: true, rarity: .legendary)
        XCTAssertEqual(shinyLegend, 37500)
    }

    func testApplyXP() {
        let r1 = ProScoringEngine.applyXP(currentLevel: 1, currentXP: 0, earned: 80)
        XCTAssertTrue(r1.leveledUp)
        XCTAssertEqual(r1.level, 2)
        XCTAssertEqual(r1.xp, 0)
        let r2 = ProScoringEngine.applyXP(currentLevel: 1, currentXP: 0, earned: 79)
        XCTAssertFalse(r2.leveledUp)
        XCTAssertEqual(r2.xp, 79)
    }

    func testCurves() {
        XCTAssertEqual(SpookyCurves.xpForLevel(1), 80)
        XCTAssertLessThan(SpookyCurves.xpForLevel(1), SpookyCurves.xpForLevel(10))
        XCTAssertEqual(SpookyCurves.rebirthPower(rebirths: 0), 1.0, accuracy: 1e-9)
        XCTAssertEqual(SpookyCurves.rebirthPower(rebirths: 2), 1.3, accuracy: 1e-9)
        XCTAssertEqual(SpookyCurves.comboMultiplier(combo: 500), 3.0, accuracy: 1e-9)
    }

    func testCompactNumbers() {
        XCTAssertEqual(SpookyNumbers.compact(999), "999")
        XCTAssertEqual(SpookyNumbers.compact(1500), "1.5K")
        XCTAssertEqual(SpookyNumbers.compact(2000), "2K")
        XCTAssertEqual(SpookyNumbers.compact(2300000), "2.3M")
    }
}

// ============================================================
// MARK: - 4. Seeded RNG + Perlin fields
// ============================================================

final class NoiseTests: XCTestCase {
    func testRNGDeterministic() {
        var a = SeededRNG(seed: 7)
        var b = SeededRNG(seed: 7)
        for _ in 0..<50 {
            XCTAssertEqual(a.next(), b.next())
        }
    }

    func testRNGSeedSensitive() {
        var a = SeededRNG(seed: 7)
        var b = SeededRNG(seed: 8)
        XCTAssertNotEqual(a.next(), b.next())
    }

    func testRNGShuffleIsPermutation() {
        var rng = SeededRNG(seed: 42)
        let shuffled = rng.shuffle(Array(0..<52))
        XCTAssertEqual(shuffled.sorted(), Array(0..<52))
        var rng2 = SeededRNG(seed: 42)
        XCTAssertEqual(shuffled, rng2.shuffle(Array(0..<52)))
    }

    func testPerlinBounds() {
        let noise = PerlinNoise(seed: 777)
        for x in 0..<20 {
            for y in 0..<20 {
                let v = noise.noise(x: Double(x) * 0.31, y: Double(y) * 0.47)
                XCTAssertGreaterThan(v, -1.6)
                XCTAssertLessThan(v, 1.6)
            }
        }
    }

    func testPerlinDeterministic() {
        let a = PerlinNoise(seed: 777)
        let b = PerlinNoise(seed: 777)
        XCTAssertEqual(a.noise(x: 3.7, y: 9.1), b.noise(x: 3.7, y: 9.1), accuracy: 1e-12)
        let c = PerlinNoise(seed: 778)
        XCTAssertNotEqual(a.noise(x: 3.7, y: 9.1), c.noise(x: 3.7, y: 9.1))
    }

    func testFbmNormalized() {
        let noise = PerlinNoise(seed: 777)
        for x in 0..<12 {
            for y in 0..<12 {
                let v = noise.fbm(x: Double(x) * 0.2, y: Double(y) * 0.2)
                XCTAssertGreaterThan(v, -1.01)
                XCTAssertLessThan(v, 1.01)
            }
        }
    }
}

// ============================================================
// MARK: - 5. Maze carvers (connectivity + stats)
// ============================================================

final class CarverTests: XCTestCase {
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

    func testBacktrackerConnected() {
        let r = MazeCarver.backtracker(width: 21, depth: 21, seed: 4242)
        XCTAssertTrue(connected(r.open))
        XCTAssertGreaterThan(r.deadEnds, 0)
    }

    func testPrimsConnected() {
        let r = MazeCarver.prims(width: 21, depth: 21, seed: 4242)
        XCTAssertTrue(connected(r.open))
        XCTAssertGreaterThan(r.deadEnds, 0)
    }

    func testSeedSensitive() {
        let a = MazeCarver.backtracker(width: 21, depth: 21, seed: 1)
        let b = MazeCarver.backtracker(width: 21, depth: 21, seed: 2)
        XCTAssertNotEqual(a.open, b.open)
    }

    func testBraidReducesDeadEnds() {
        let base = MazeCarver.backtracker(width: 21, depth: 21, seed: 7)
        let braided = MazeCarver.braid(base, width: 21, depth: 21, removeFraction: 0.25, seed: 7)
        XCTAssertLessThan(braided.deadEnds, base.deadEnds)
        XCTAssertTrue(connected(braided.open))
    }
}

// ============================================================
// MARK: - 6. A* hunting + smoothing
// ============================================================

final class AStarTests: XCTestCase {
    typealias Node = AStarPathfinder.Node

    func testOpenDiagonal() {
        let path = AStarPathfinder.findPath(
            start: Node(x: 0, z: 0), goal: Node(x: 5, z: 5),
            walkable: { _ in true }
        )
        XCTAssertNotNil(path)
        XCTAssertEqual(path?.count, 6)
    }

    func testRoutesAroundWall() {
        let walls: Set<Node> = Set((0..<7).map({ Node(x: 2, z: $0) }).filter({ $0.z != 6 }))
        let path = AStarPathfinder.findPath(
            start: Node(x: 0, z: 3), goal: Node(x: 5, z: 3),
            walkable: { n in !walls.contains(n) }
        )
        XCTAssertNotNil(path)
        XCTAssertTrue(path!.allSatisfy({ !walls.contains($0) }))
    }

    func testBudgetRespected() {
        let path = AStarPathfinder.findPath(
            start: Node(x: 0, z: 0), goal: Node(x: 50, z: 50),
            walkable: { _ in false }, maxIter: 10
        )
        XCTAssertNil(path)
    }

    func testSmoothingShortens() {
        let walls: Set<Node> = Set((0..<7).map({ Node(x: 2, z: $0) }).filter({ $0.z != 6 }))
        let walkable = { (n: Node) -> Bool in !walls.contains(n) }
        guard let path = AStarPathfinder.findPath(
            start: Node(x: 0, z: 3), goal: Node(x: 5, z: 3), walkable: walkable
        ) else {
            XCTFail("expected a path")
            return
        }
        let smooth = AStarPathfinder.smooth(path, walkable: walkable)
        XCTAssertLessThanOrEqual(smooth.count, path.count)
        XCTAssertEqual(smooth.first, path.first)
        XCTAssertEqual(smooth.last, path.last)
    }
}

// ============================================================
// MARK: - 7. Raycast picking
// ============================================================

final class RaycastTests: XCTestCase {
    func testAxisHit() {
        let hit = MineRaycaster.castVoxel(
            origin: SIMD3<Float>(0.5, 0.5, 0.5),
            direction: SIMD3<Float>(1, 0, 0),
            maxDistance: 10,
            solid: { x, _, _ in x == 3 }
        )
        XCTAssertNotNil(hit)
        XCTAssertEqual(hit?.x, 3)
        XCTAssertEqual(hit?.distance ?? -1, 2.5, accuracy: 1e-5)
    }

    func testMiss() {
        let hit = MineRaycaster.castVoxel(
            origin: SIMD3<Float>(0.5, 0.5, 0.5),
            direction: SIMD3<Float>(0, 1, 0),
            maxDistance: 10,
            solid: { _, _, _ in false }
        )
        XCTAssertNil(hit)
    }

    func testRayDistance() {
        XCTAssertEqual(
            MineRaycaster.rayDistance(
                origin: SIMD3<Float>(0, 0, 0), direction: SIMD3<Float>(1, 0, 0),
                point: SIMD3<Float>(5, 0, 0)
            ), 0, accuracy: 1e-5
        )
        XCTAssertEqual(
            MineRaycaster.rayDistance(
                origin: SIMD3<Float>(0, 0, 0), direction: SIMD3<Float>(1, 0, 0),
                point: SIMD3<Float>(5, 3, 0)
            ), 3, accuracy: 1e-5
        )
    }
}

// ============================================================
// MARK: - 8. Quest + expedition routing consistency
// ============================================================

final class RoutingTests: XCTestCase {
    func testQuestCatalogSane() {
        XCTAssertGreaterThanOrEqual(MineQuestCatalog.all.count, 60)
        for quest in MineQuestCatalog.all {
            XCTAssertFalse(quest.id.isEmpty)
            XCTAssertFalse(quest.trigger.hint.isEmpty)
            XCTAssertGreaterThan(MineQuestBoard().targetOf(quest), 0)
            XCTAssertGreaterThanOrEqual(quest.rewardGold, 0)
            XCTAssertGreaterThanOrEqual(quest.rewardXP, 0)
        }
        // IDs unique.
        let ids = MineQuestCatalog.all.map(\.id)
        XCTAssertEqual(Set(ids).count, ids.count)
    }

    func testQuestBoardAdvances() {
        let board = MineQuestBoard()
        board.resetAll()
        board.record(.blockBroken)
        XCTAssertGreaterThanOrEqual(board.progressOf(MineQuestCatalog.all[0]), 0)
        // Lifetime ledgers accumulate.
        board.record(.goldSold(amount: 500))
        XCTAssertEqual(board.lifetimeSold, 500)
        board.record(.xpEarned(amount: 250))
        XCTAssertEqual(board.lifetimeXP, 250)
    }

    func testExpeditionCatalogSane() {
        XCTAssertGreaterThanOrEqual(MazeExpeditionCatalog.all.count, 29)
        let board = MazeExpeditionBoard()
        for exp in MazeExpeditionCatalog.all {
            XCTAssertGreaterThan(exp.target, 0)
            XCTAssertFalse(exp.unit.isEmpty)
            _ = board.fractionOf(exp)
        }
        let ids = MazeExpeditionCatalog.all.map(\.id)
        XCTAssertEqual(Set(ids).count, ids.count)
    }

    func testExpeditionBoardEvents() {
        let board = MazeExpeditionBoard()
        board.resetAll()
        board.record(.closetOpened)
        board.record(.scoreEarned(points: 100))
        XCTAssertEqual(board.lifetimeScore, 100)
        board.record(.distanceBanked(meters: 40))
        XCTAssertEqual(board.lifetimeDistance, 40)
    }

    func testLoreCatalogSane() {
        XCTAssertGreaterThanOrEqual(MineLoreCatalog.all.count, 60)
        let ids = MineLoreCatalog.all.map(\.id)
        XCTAssertEqual(Set(ids).count, ids.count)
    }
}

// ============================================================
// MARK: - 9. World data: regions, layers, economy tiers
// ============================================================

final class WorldDataTests: XCTestCase {
    func testRegionAtlasComplete() {
        XCTAssertEqual(MazeRegionAtlas.all.count, 10)
        // Every quadrant maps somewhere sensible.
        XCTAssertEqual(MazeRegionAtlas.at(x: -10, z: -200).id, "northgate-west")
        XCTAssertEqual(MazeRegionAtlas.at(x: 10, z: -200).id, "northgate-east")
        XCTAssertEqual(MazeRegionAtlas.at(x: -10, z: 0).id, "heart-west")
        XCTAssertEqual(MazeRegionAtlas.at(x: 10, z: 0).id, "heart-east")
        XCTAssertEqual(MazeRegionAtlas.at(x: -10, z: 200).id, "far-west")
        XCTAssertEqual(MazeRegionAtlas.at(x: 10, z: 200).id, "far-east")
    }

    func testDepthLayers() {
        XCTAssertEqual(MNDepthLayer.at(y: 4).title, "Sunlit Tops")
        XCTAssertEqual(MNDepthLayer.at(y: 2).title, "Dirt Tunnels")
        XCTAssertEqual(MNDepthLayer.at(y: 0).title, "Stone Depths")
        XCTAssertEqual(MNDepthLayer.at(y: -2).title, "Deepstone")
        XCTAssertEqual(MNDepthLayer.at(y: -4).title, "Crystal Hollows")
        XCTAssertEqual(MNDepthLayer.at(y: -5).title, "Magma Core")
        // Rewards strictly increase with depth.
        let mults = MNDepthLayer.allCases.map(\.rewardMultiplier)
        XCTAssertEqual(mults, mults.sorted())
    }

    func testPickProgression() {
        let tiers = MNPickTier.allCases
        XCTAssertGreaterThanOrEqual(tiers.count, 5)
        let damages = tiers.map(\.damage)
        XCTAssertEqual(damages, damages.sorted())
    }

    func testSealCostsScaleWithDepth() {
        let shallow = MineManager.sealCost(centerY: 2)
        let deep = MineManager.sealCost(centerY: -5)
        XCTAssertFalse(shallow.isEmpty)
        XCTAssertFalse(deep.isEmpty)
        XCTAssertNotEqual(shallow, deep)
    }

    func testSpinWeights() {
        let total = MineSpinTable.prizes.reduce(0, { $0 + $1.weight })
        XCTAssertEqual(total, 100)
        // Every roll lands on a real prize.
        for _ in 0..<50 {
            let prize = MineSpinTable.roll()
            XCTAssertTrue(MineSpinTable.prizes.map(\.label).contains(prize.label))
        }
    }

    func testRelicCatalog() {
        XCTAssertEqual(MNRelicCatalog.all.count, 12)
        XCTAssertTrue(MNRelicCatalog.all.allSatisfy({ $0.value > 0 }))
    }

    func testFishCatalog() {
        XCTAssertGreaterThanOrEqual(MNFishGuide.all.count, 14)
        XCTAssertTrue(MNFishGuide.all.allSatisfy({ $0.value > 0 }))
    }

    func testGhostKinds() {
        XCTAssertEqual(MineGhostKind.allCases.count, 9)
        XCTAssertFalse(MineGhostKind.allCases.map(\.title).contains(""))
    }
}

// ============================================================
// MARK: - 10. Net-loop authority
// ============================================================

final class NetLoopTests: XCTestCase {
    private func command(_ seq: Int, power: Float = 2) -> MineNetCommand {
        MineNetCommand(seq: seq, client: "test", kind: .hitBlock, x: 1, y: 2, z: 3, power: power)
    }

    func testHitThenBreak() {
        let auth = MineAuthority()
        auth.maxHealth = 6
        let e1 = auth.apply(command(1))
        XCTAssertEqual(e1.first?.kind, .blockBroken)
        _ = e1
        let auth2 = MineAuthority()
        auth2.maxHealth = 6
        let r1 = auth2.apply(command(1, power: 2))
        XCTAssertEqual(r1.first?.kind, .blockDamaged)
        XCTAssertEqual(r1.first?.value ?? -1, 4, accuracy: 1e-5)
        let r2 = auth2.apply(command(2, power: 2))
        XCTAssertEqual(r2.first?.kind, .blockDamaged)
        let r3 = auth2.apply(command(3, power: 2))
        XCTAssertEqual(r3.first?.kind, .blockBroken)
        XCTAssertEqual(auth2.commandsSeen, 3)
    }

    func testBlastClearsCube() {
        let auth = MineAuthority()
        auth.maxHealth = 6
        let blast = MineNetCommand(seq: 1, client: "test", kind: .throwBomb, x: 0, y: 0, z: 0, power: 99)
        let events = auth.apply(blast)
        XCTAssertEqual(events.filter({ $0.kind == .blockBroken }).count, 27)
        XCTAssertTrue(events.contains(where: { $0.kind == .bombLanded }))
    }

    func testSnapshotRoundTrip() {
        let auth = MineAuthority()
        _ = auth.apply(command(1, power: 2))
        guard let data = auth.snapshot() else {
            XCTFail("snapshot failed")
            return
        }
        XCTAssertGreaterThan(data.count, 0)
        let auth2 = MineAuthority()
        XCTAssertTrue(auth2.restore(data))
        XCTAssertEqual(auth2.lastSeq, auth.lastSeq)
        XCTAssertEqual(auth2.health, auth.health)
    }

    func testCorruptSnapshotRejected() {
        let auth = MineAuthority()
        XCTAssertFalse(auth.restore(Data([0, 1, 2, 3])))
    }
}

// ============================================================
// MARK: - 11. Bonds, streaks, store math
// ============================================================

final class ProgressionTests: XCTestCase {
    func testBondRanks() {
        XCTAssertEqual(BoxyBondRank.level(xp: 0), 1)
        XCTAssertEqual(BoxyBondRank.level(xp: 3), 2)
        XCTAssertEqual(BoxyBondRank.level(xp: 8), 3)
        XCTAssertEqual(BoxyBondRank.level(xp: 15), 4)
        XCTAssertEqual(BoxyBondRank.level(xp: 25), 5)
        XCTAssertEqual(BoxyBondRank.title(level: 5), "Soulcube")
        XCTAssertNil(BoxyBondRank.nextThreshold(level: 5))
    }

    func testStreakRewardsGrow() {
        XCTAssertLessThan(MineStreakRules.reward(streak: 1), MineStreakRules.reward(streak: 7))
        XCTAssertLessThan(MineStreakRules.reward(streak: 7), MineStreakRules.reward(streak: 30))
        XCTAssertEqual(MineStreakRules.reward(streak: 1000), 5000)
    }

    func testStoreDayMath() {
        XCTAssertEqual(SpookyStore.todayString(), SpookyStore.todayString(date: Date()))
        XCTAssertEqual(SpookyStore.daysBetween("2026-01-01", "2026-01-02"), 1)
        XCTAssertEqual(SpookyStore.daysBetween("2026-01-01", "2026-01-01"), 0)
        XCTAssertNil(SpookyStore.daysBetween("nope", "2026-01-01"))
    }

    func testStoreCorruptionRecovery() {
        UserDefaults.standard.set(Data([9, 9, 9]), forKey: "spooky.v1.testCorrupt")
        let got: SpookyCorruptBox = SpookyStore.load(SpookyCorruptBox.self, "testCorrupt", fallback: SpookyCorruptBox(n: 42))
        XCTAssertEqual(got, SpookyCorruptBox(n: 42))
        SpookyStore.remove("testCorrupt")
    }

    func testPetHatchBounds() {
        for i in 0..<60 {
            let pet = MNPet.hatch(number: i)
            XCTAssertTrue(["Common", "Rare", "Epic", "Legendary"].contains(pet.rarity))
            XCTAssertTrue(["Speed", "Luck", "Gold"].contains(pet.boostKind))
            XCTAssertGreaterThan(pet.boostValue, 0)
        }
    }
}
