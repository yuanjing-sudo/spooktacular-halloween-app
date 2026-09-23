//
//  MineNetLoop.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Client-server replication loop, Roblox-genre spec: an authoritative
//  simulation core (commands in, events out), sequence-numbered RemoteEvent
//  style messaging, client prediction with reconciliation, Codable
//  snapshots for late joiners, and a relay demo with a latency slider.
//  Single-player today; the wire format is multiplayer-ready.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Commands + events (the wire format)
// ============================================================

/// Client → server: "I am hitting block at (x, y, z)".
struct MineNetCommand: Codable, Identifiable {
    var id = UUID()
    var seq: Int
    var client: String
    var kind: Kind
    var x: Int
    var y: Int
    var z: Int
    var power: Float

    enum Kind: String, Codable {
        case hitBlock, moveTo, throwBomb, openCloset
    }
}

/// Server → clients: what actually happened (authority speaks last).
struct MineNetEvent: Codable, Identifiable {
    var id = UUID()
    var seq: Int
    var kind: Kind
    var x: Int
    var y: Int
    var z: Int
    var value: Float
    var note: String

    enum Kind: String, Codable {
        case blockDamaged, blockBroken, moved, bombLanded, closetOpened, ack
    }
}

// ============================================================
// MARK: - 2. Authority (the server that is always right)
// ============================================================

/// Authoritative block-health simulation. One instance owns the truth;
/// every client (including local play) talks to it through commands.
final class MineAuthority: ObservableObject {
    /// Block health by "x,y,z". Missing = full health (see maxHealth).
    @Published private(set) var health: [String: Float] = [:]
    @Published private(set) var log: [MineNetEvent] = []
    @Published private(set) var commandsSeen: Int = 0
    var maxHealth: Float = 6
    var lastSeq: Int = 0

    static func key(_ x: Int, _ y: Int, _ z: Int) -> String {
        "\(x),\(y),\(z)"
    }

    /// Apply one command, return the events it caused.
    @discardableResult
    func apply(_ command: MineNetCommand) -> [MineNetEvent] {
        commandsSeen += 1
        lastSeq = max(lastSeq, command.seq)
        switch command.kind {
        case .hitBlock:
            let k = Self.key(command.x, command.y, command.z)
            let hp = (health[k] ?? maxHealth) - command.power
            if hp <= 0 {
                health.removeValue(forKey: k)
                return [emit(.blockBroken, command, value: 0, note: "destroyed")]
            }
            health[k] = hp
            return [emit(.blockDamaged, command, value: hp, note: "hp=\(hp)")]
        case .moveTo:
            return [emit(.moved, command, value: 0, note: "relayed")]
        case .throwBomb:
            // Blast: damage the 3×3×3 cube around the target.
            var events: [MineNetEvent] = []
            for dx in -1...1 {
                for dy in -1...1 {
                    for dz in -1...1 {
                        let k = Self.key(command.x + dx, command.y + dy, command.z + dz)
                        let hp = (health[k] ?? maxHealth) - command.power
                        if hp <= 0 {
                            health.removeValue(forKey: k)
                            events.append(emit(
                                .blockBroken, command,
                                value: 0, note: "blast @\(command.x + dx),\(command.y + dy),\(command.z + dz)"
                            ))
                        } else {
                            health[k] = hp
                        }
                    }
                }
            }
            events.append(emit(.bombLanded, command, value: Float(events.count), note: "cleared"))
            return events
        case .openCloset:
            return [emit(.closetOpened, command, value: 1, note: "opened")]
        }
    }

    private func emit(_ kind: MineNetEvent.Kind, _ command: MineNetCommand, value: Float, note: String) -> MineNetEvent {
        let event = MineNetEvent(
            seq: command.seq, kind: kind,
            x: command.x, y: command.y, z: command.z,
            value: value, note: note
        )
        log.append(event)
        if log.count > 60 {
            log.removeFirst(log.count - 60)
        }
        return event
    }

    // MARK: Snapshots (late joiners + saves)

    struct Snapshot: Codable {
        var health: [String: Float]
        var lastSeq: Int
        var maxHealth: Float
    }

    func snapshot() -> Data? {
        try? JSONEncoder().encode(Snapshot(health: health, lastSeq: lastSeq, maxHealth: maxHealth))
    }

    var snapshotBytes: Int { snapshot()?.count ?? 0 }

    func restore(_ data: Data) -> Bool {
        guard let snap = try? JSONDecoder().decode(Snapshot.self, from: data) else {
            return false
        }
        health = snap.health
        lastSeq = snap.lastSeq
        maxHealth = snap.maxHealth
        return true
    }

    func reset() {
        health = [:]
        log = []
        commandsSeen = 0
        lastSeq = 0
    }
}

// ============================================================
// MARK: - 3. Relay demo (client prediction + reconciliation)
// ============================================================

/// Simulated client with prediction: applies hits instantly to a local
/// shadow map, then reconciles when the authority answers after latency.
/// Mispredicts (server disagreed) flash and correct.
final class MineRelayDemo: ObservableObject {
    @Published var authority = MineAuthority()
    @Published private(set) var predicted: [String: Float] = [:]
    @Published private(set) var mispredicts: Int = 0
    @Published private(set) var roundTrips: Int = 0
    @Published private(set) var lastRTT: Double = 0
    @Published var latency: Double = 0.25
    @Published var selected: String?

    private var seq = 0
    private let clientID = "demo-client"
    private let demoMax: Float = 6

    /// Client sends RemoteEvent: "hitting block (x, y, z)".
    func hit(x: Int, y: Int, z: Int, power: Float = 2) {
        seq += 1
        let command = MineNetCommand(
            seq: seq, client: clientID, kind: .hitBlock,
            x: x, y: y, z: z, power: power
        )
        // Predict instantly (client-side shadow).
        let k = MineAuthority.key(x, y, z)
        let predictedHP = (predicted[k] ?? authority.health[k] ?? demoMax) - power
        if predictedHP <= 0 {
            predicted.removeValue(forKey: k)
        } else {
            predicted[k] = predictedHP
        }
        // Authority answers after latency; reconcile on arrival.
        let sentAt = Date()
        DispatchQueue.main.asyncAfter(deadline: .now() + latency) { [weak self] in
            guard let self = self else { return }
            let events = self.authority.apply(command)
            self.roundTrips += 1
            self.lastRTT = Date().timeIntervalSince(sentAt) * 1000
            self.reconcile(events: events)
        }
    }

    /// Reconcile: server truth overwrites prediction; count disagreements.
    private func reconcile(events: [MineNetEvent]) {
        for event in events {
            let k = MineAuthority.key(event.x, event.y, event.z)
            switch event.kind {
            case .blockBroken:
                if predicted[k] != nil {
                    mispredicts += 1
                }
                predicted.removeValue(forKey: k)
            case .blockDamaged:
                if let guess = predicted[k], abs(guess - event.value) > 0.01 {
                    mispredicts += 1
                }
                predicted[k] = event.value
            default:
                break
            }
        }
    }

    func reset() {
        authority.reset()
        predicted = [:]
        mispredicts = 0
        roundTrips = 0
        lastRTT = 0
        selected = nil
        seq = 0
    }

    var agreement: Double {
        guard roundTrips > 0 else { return 1 }
        return max(0, 1 - Double(mispredicts) / Double(max(1, roundTrips * 2)))
    }
}

// ============================================================
// MARK: - 4. Relay showcase
// ============================================================

/// Net-loop lab: tap blocks to hit them, watch prediction vs authority
/// converge across simulated latency. Latency slider included.
struct MineNetShowcaseView: View {
    @StateObject private var relay = MineRelayDemo()
    @Environment(\.dismiss) private var dismiss
    private let grid = 9

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 14) {
                    // Stats row.
                    HStack(spacing: 12) {
                        netStat("📨", "\(relay.authority.commandsSeen)", "commands")
                        netStat("🔁", String(format: "%.0fms", relay.lastRTT), "last RTT")
                        netStat("🎯", "\(relay.mispredicts)", "mispredicts")
                        netStat("🤝", "\(Int(relay.agreement * 100))%", "agreement")
                    }
                    // Block grid: authority truth, predicted overlay.
                    VStack(spacing: 2) {
                        ForEach(0..<grid, id: \.self) { y in
                            HStack(spacing: 2) {
                                ForEach(0..<grid, id: \.self) { x in
                                    blockCell(x: x, y: y)
                                }
                            }
                        }
                    }
                    .padding(10)
                    .background(Color.black)
                    .cornerRadius(14)
                    .padding(.horizontal)
                    Text("Tap blocks to fire RemoteEvents. Gold = predicted, green = confirmed. Crank latency and watch reconciliation work.")
                        .font(.caption).foregroundStyle(.secondary)
                        .padding(.horizontal)
                    // Latency slider.
                    VStack(spacing: 4) {
                        HStack {
                            Text("🌐 Simulated latency").font(.subheadline.bold())
                            Spacer()
                            Text("\(Int(relay.latency * 1000))ms")
                                .font(.subheadline.bold()).monospacedDigit()
                        }
                        Slider(value: $relay.latency, in: 0...1.5)
                    }
                    .padding(.horizontal, 40)
                    // Event log.
                    VStack(alignment: .leading, spacing: 4) {
                        Text("📡 Server log").font(.headline).padding(.horizontal)
                        ForEach(relay.authority.log.suffix(6).reversed()) { event in
                            HStack {
                                Text(eventIcon(event.kind)).font(.caption)
                                Text("#\(event.seq) \(event.kind.rawValue) @\(event.x),\(event.y) — \(event.note)")
                                    .font(.caption2).foregroundStyle(.secondary)
                            }
                            .padding(.horizontal)
                        }
                    }
                    HStack(spacing: 16) {
                        Button("Reset sim") { relay.reset() }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        Text("Snapshot: \(relay.authority.snapshotBytes) bytes")
                            .font(.caption).foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Net Loop Lab")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func blockCell(x: Int, y: Int) -> some View {
        let k = MineAuthority.key(x, y, 0)
        let confirmed = relay.authority.health[k]
        let guess = relay.predicted[k]
        return ZStack {
            RoundedRectangle(cornerRadius: 4)
                .fill(cellColor(confirmed: confirmed != nil))
                .frame(width: 30, height: 30)
            if guess != nil && confirmed == nil {
                RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.yellow, lineWidth: 2)
                    .frame(width: 30, height: 30)
            }
            if let hp = confirmed ?? guess {
                Text("\(Int(hp))")
                    .font(.caption2.bold())
                    .foregroundColor(.white)
                    .monospacedDigit()
            }
            if relay.selected == k {
                RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.white, lineWidth: 2)
                    .frame(width: 30, height: 30)
            }
        }
        .onTapGesture {
            relay.selected = k
            relay.hit(x: x, y: y, z: 0)
            SpookyHaptics.play(.light)
        }
    }

    private func cellColor(confirmed: Bool) -> Color {
        confirmed ? Color.green.opacity(0.75) : Color(white: 0.22)
    }

    private func netStat(_ emoji: String, _ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(emoji).font(.title3)
            Text(value).font(.headline).monospacedDigit()
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(10)
    }

    private func eventIcon(_ kind: MineNetEvent.Kind) -> String {
        switch kind {
        case .blockDamaged: return "🔨"
        case .blockBroken: return "💥"
        case .moved: return "🚶"
        case .bombLanded: return "🧨"
        case .closetOpened: return "🚪"
        case .ack: return "✅"
        }
    }
}
