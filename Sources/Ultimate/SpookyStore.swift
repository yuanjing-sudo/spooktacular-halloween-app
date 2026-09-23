//
//  SpookyStore.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Crash-safe persisted store: versioned keys, Codable load/save with
//  corruption recovery (bad payloads reset to defaults instead of
//  crashing), day-string helpers for streaks, and a danger-zone reset.
//  Standalone — adopt gradually, break nothing.
//

import Foundation

// ============================================================
// MARK: - 1. Store
// ============================================================

/// Namespaced, versioned UserDefaults wrapper with corruption recovery.
enum SpookyStore {
    private static var prefix: String { "spooky.v1." }

    private static func key(_ name: String) -> String {
        prefix + name
    }

    // MARK: Raw primitives

    static func bool(_ name: String, default value: Bool = false) -> Bool {
        guard UserDefaults.standard.object(forKey: key(name)) != nil else { return value }
        return UserDefaults.standard.bool(forKey: key(name))
    }

    static func set(_ value: Bool, _ name: String) {
        UserDefaults.standard.set(value, forKey: key(name))
    }

    static func int(_ name: String, default value: Int = 0) -> Int {
        guard UserDefaults.standard.object(forKey: key(name)) != nil else { return value }
        return UserDefaults.standard.integer(forKey: key(name))
    }

    static func set(_ value: Int, _ name: String) {
        UserDefaults.standard.set(value, forKey: key(name))
    }

    static func double(_ name: String, default value: Double = 0) -> Double {
        guard UserDefaults.standard.object(forKey: key(name)) != nil else { return value }
        return UserDefaults.standard.double(forKey: key(name))
    }

    static func set(_ value: Double, _ name: String) {
        UserDefaults.standard.set(value, forKey: key(name))
    }

    static func string(_ name: String, default value: String = "") -> String {
        UserDefaults.standard.string(forKey: key(name)) ?? value
    }

    static func set(_ value: String, _ name: String) {
        UserDefaults.standard.set(value, forKey: key(name))
    }

    static func stringArray(_ name: String) -> [String] {
        UserDefaults.standard.stringArray(forKey: key(name)) ?? []
    }

    static func set(_ value: [String], _ name: String) {
        UserDefaults.standard.set(value, forKey: key(name))
    }

    // MARK: Codable boxes (corruption-proof)

    /// Load a Codable value; a corrupt payload resets to `fallback`.
    static func load<T: Decodable>(_ type: T.Type, _ name: String, fallback: T) -> T {
        guard let data = UserDefaults.standard.data(forKey: key(name)) else {
            return fallback
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            // Corrupt payload: quarantine it, return safe defaults.
            UserDefaults.standard.removeObject(forKey: key(name))
            UserDefaults.standard.set(
                ISO8601DateFormatter().string(from: Date()),
                forKey: key(name) + ".quarantinedAt"
            )
            return fallback
        }
    }

    /// Save a Codable value. Failures are logged, never thrown.
    static func save<T: Encodable>(_ value: T, _ name: String) {
        do {
            let data = try JSONEncoder().encode(value)
            UserDefaults.standard.set(data, forKey: key(name))
        } catch {
            print("SpookyStore save failed for \(name): \(error)")
        }
    }

    static func remove(_ name: String) {
        UserDefaults.standard.removeObject(forKey: key(name))
    }

    // MARK: Day strings (streaks, dailies)

    /// "yyyy-MM-dd" in the current calendar.
    static func todayString(date: Date = Date()) -> String {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: date)
    }

    /// Whole days between two day-strings (nil if unparseable).
    static func daysBetween(_ older: String, _ newer: String) -> Int? {
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.dateFormat = "yyyy-MM-dd"
        guard let a = fmt.date(from: older), let b = fmt.date(from: newer) else {
            return nil
        }
        let days = Calendar.current.dateComponents([.day], from: a, to: b).day
        return days
    }

    // MARK: Login streaks

    private static var streakCountKey: String { "loginStreak.count" }
    private static var streakDayKey: String { "loginStreak.day" }

    /// Record today's visit. Returns (streak, isNewDay).
    @discardableResult
    static func touchLoginStreak(today: String = todayString()) -> (streak: Int, isNewDay: Bool) {
        let last = string(streakDayKey, default: "")
        if last == today {
            return (int(streakCountKey, default: 1), false)
        }
        var streak = 1
        if !last.isEmpty, let gap = daysBetween(last, today), gap == 1 {
            streak = int(streakCountKey, default: 0) + 1
        }
        set(streak, streakCountKey)
        set(today, streakDayKey)
        return (streak, true)
    }

    static func loginStreak() -> Int {
        int(streakCountKey, default: 0)
    }

    // MARK: First-launch + profile flags

    static var hasLaunchedBefore: Bool {
        bool("hasLaunchedBefore")
    }

    static func markLaunched() {
        set(true, "hasLaunchedBefore")
    }

    static var onboardingDone: Bool {
        bool("onboardingDone")
    }

    static func markOnboardingDone() {
        set(true, "onboardingDone")
    }

    // MARK: Danger zone

    /// All keys owned by this store prefix (for settings display).
    static func ownedKeys() -> [String] {
        Array(UserDefaults.standard.dictionaryRepresentation().keys)
            .filter({ $0.hasPrefix(prefix) })
            .sorted()
    }

    /// Wipe every namespaced key. Legacy (unprefixed) game keys are left
    /// alone on purpose — this store only cleans up after itself.
    static func resetAll(keepLoginStreak: Bool = true) {
        let streakCount = int(streakCountKey, default: 0)
        let streakDay = string(streakDayKey, default: "")
        for k in ownedKeys() {
            UserDefaults.standard.removeObject(forKey: k)
        }
        if keepLoginStreak {
            set(streakCount, streakCountKey)
            set(streakDay, streakDayKey)
        }
    }
}

// ============================================================
// MARK: - 2. Boot checklist model
// ============================================================

/// One boot phase: id, label, weight for the progress bar.
struct SpookyBootPhase: Identifiable {
    let id = UUID()
    var label: String
    var emoji: String
    var weight: Double
}

/// The commercial boot script: fast, honest phases with yields so the
/// main thread never chokes during launch.
enum SpookyBootScript {
    static var phases: [SpookyBootPhase] = [
        SpookyBootPhase(label: "Waking the ghosts", emoji: "👻", weight: 1),
        SpookyBootPhase(label: "Tuning the audio crypt", emoji: "🎃", weight: 1),
        SpookyBootPhase(label: "Reading saved progress", emoji: "💾", weight: 2),
        SpookyBootPhase(label: "Warming the mine", emoji: "⛏️", weight: 2),
        SpookyBootPhase(label: "Polishing crystals", emoji: "🔮", weight: 1),
        SpookyBootPhase(label: "Lighting lanterns", emoji: "🏮", weight: 1),
    ]

    static var totalWeight: Double {
        phases.reduce(0, { $0 + $1.weight })
    }
}
