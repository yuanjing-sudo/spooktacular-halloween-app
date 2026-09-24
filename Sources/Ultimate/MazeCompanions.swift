//
//  MazeCompanions.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Boxy companions: adopt one greeted species as your follower. Followers
//  grant passives (treasure gold, expedition pay) and ride along in the
//  journal with animated portraits. One friend at a time — cubes get jealous.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Companion rules (manager extension)
// ============================================================

extension TunnelMazeManager {
    private static var followerKey: String { "mazeFollower.v1" }

    /// Adopted follower species (persisted).
    var followerSpecies: String? {
        get {
            let name = UserDefaults.standard.string(forKey: Self.followerKey)
            return (name?.isEmpty ?? true) ? nil : name
        }
        set {
            UserDefaults.standard.set(newValue ?? "", forKey: Self.followerKey)
        }
    }

    /// Species available for adoption (greeted via bonds).
    func adoptableSpecies() -> [String] {
        BoxyBondLedger.species.filter({ bondLedger.level(for: $0) >= 1 && bondLedger.bond(for: $0).encounters > 0 })
    }

    /// Adopt (or release with nil). Requires at least one encounter.
    @discardableResult
    func adoptFollower(_ species: String?) -> Bool {
        if let species = species {
            guard bondLedger.bond(for: species).encounters > 0 else {
                addNotification("📦 You haven't met a \(species) yet — befriend one first!")
                return false
            }
            followerSpecies = species
            addNotification("📦 \(species) joins you! Treasure +8%, expedition pay +8%.")
            triggerHaptic(.medium)
        } else {
            if let old = followerSpecies {
                addNotification("📦 \(old) waves goodbye (it will be back — they always come back).")
            }
            followerSpecies = nil
        }
        return true
    }

    /// Follower treasure bonus multiplier.
    var followerGoldMult: Double {
        followerSpecies == nil ? 1.0 : 1.08
    }

    /// Follower XP bonus multiplier.
    var followerXPMult: Double {
        followerSpecies == nil ? 1.0 : 1.08
    }
}

// ============================================================
// MARK: - 2. Companion view
// ============================================================

/// Companion den: adopt, view passives, release. Lives in the journal.
struct MazeCompanionView: View {
    @ObservedObject var manager: TunnelMazeManager

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("🐾 Companion")
                    .font(.headline).foregroundColor(.white)
                Spacer()
                if let follower = manager.followerSpecies {
                    Text("Following: \(follower)")
                        .font(.caption.bold()).foregroundColor(.green)
                } else {
                    Text("No follower")
                        .font(.caption).foregroundColor(.white.opacity(0.6))
                }
            }
            Text("One cube at a time (they get jealous). Followers grant +8% treasure gold and +8% expedition pay.")
                .font(.caption).foregroundColor(.white.opacity(0.6))
            let species = manager.adoptableSpecies()
            if species.isEmpty {
                Text("No boxy friends met yet — roam far tunnels and say hi.")
                    .font(.caption).foregroundColor(.white.opacity(0.6))
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(species, id: \.self) { name in
                            let following = manager.followerSpecies == name
                            Button(action: {
                                if following {
                                    _ = manager.adoptFollower(nil)
                                } else {
                                    _ = manager.adoptFollower(name)
                                }
                            }) {
                                VStack(spacing: 4) {
                                    Text(BoxyBondLedger.speciesEmoji[name] ?? "📦")
                                        .font(.largeTitle)
                                    Text(name)
                                        .font(.caption2.bold())
                                        .foregroundColor(.white)
                                    Text(following ? "FOLLOWING" : "Adopt")
                                        .font(.caption2.bold())
                                        .padding(.horizontal, 8).padding(.vertical, 3)
                                        .background(following ? Color.green : Color.orange.opacity(0.7))
                                        .foregroundColor(.white)
                                        .cornerRadius(6)
                                }
                                .padding(8)
                                .background(following ? Color.green.opacity(0.2) : Color.white.opacity(0.08))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(following ? Color.green : Color.clear, lineWidth: 2)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }
}
