//
//  MineBank.swift
//  Halloween Spooktacular - Ultimate Edition
//
//  Mole Bank: deposit gold, earn 5% per login day, withdraw anytime.
//  Balances live in SpookyStore (namespaced) so the vault survives
//  rebirths, resets and regret. Pure manager extension + vault view.
//

import SwiftUI
import Combine

// ============================================================
// MARK: - 1. Bank engine (manager extension)
// ============================================================

extension MineManager {
    private static var bankBalanceKey: String { "moleBank.balance" }
    private static var bankDayKey: String { "moleBank.day" }

    /// Vaulted gold.
    var bankBalance: Int {
        get { SpookyStore.int(Self.bankBalanceKey) }
        set { SpookyStore.set(newValue, Self.bankBalanceKey) }
    }

    /// Daily rate: 5%, doubled on Sundays (mole sabbath).
    var bankRate: Double {
        let weekday = Calendar.current.component(.weekday, from: Date())
        return weekday == 1 ? 0.10 : 0.05
    }

    /// Apply pending interest since the last visit. Returns interest paid.
    @discardableResult
    func bankAccrue() -> Int {
        let today = SpookyStore.todayString()
        let last = SpookyStore.string(Self.bankDayKey, default: "")
        guard !last.isEmpty, last != today else {
            if last.isEmpty {
                SpookyStore.set(today, Self.bankDayKey)
            }
            return 0
        }
        guard let gap = SpookyStore.daysBetween(last, today), gap > 0 else {
            return 0
        }
        // Compound per missed day, capped at 7 days of grace.
        var balance = Double(bankBalance)
        for _ in 0..<min(gap, 7) {
            balance *= 1.0 + bankRate
        }
        let interest = Int(balance) - bankBalance
        bankBalance = Int(balance)
        SpookyStore.set(today, Self.bankDayKey)
        if interest > 0 {
            notify("🏦 Mole Bank paid +\(interest)🪙 interest! (\(gap) day\(gap == 1 ? "" : "s") @ \(Int(bankRate * 100))%)")
        }
        return max(0, interest)
    }

    /// Deposit wallet gold into the vault.
    @discardableResult
    func bankDeposit(_ amount: Int) -> Bool {
        let n = min(amount, player.gold)
        guard n > 0 else {
            notify("🏦 Nothing to deposit — the wallet echoes.")
            return false
        }
        player.gold -= n
        bankBalance += n
        bankAccrue()
        notify("🏦 Deposited \(n)🪙. Vault: \(bankBalance)🪙 earning \(Int(bankRate * 100))%/day.")
        return true
    }

    /// Withdraw vault gold into the wallet.
    @discardableResult
    func bankWithdraw(_ amount: Int) -> Bool {
        let n = min(amount, bankBalance)
        guard n > 0 else {
            notify("🏦 Vault's empty. The mole looks embarrassed.")
            return false
        }
        bankBalance -= n
        player.gold += n
        notify("🏦 Withdrew \(n)🪙. Vault: \(bankBalance)🪙.")
        return true
    }
}

// ============================================================
// MARK: - 2. Bank vault view
// ============================================================

/// Mole Bank vault: balance, rate, deposit/withdraw, interest log.
struct MineBankView: View {
    @ObservedObject var manager: MineManager
    @State private var amountText = "100"
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("🏦 Mole Bank (rewards patience)")) {
                    HStack {
                        Text("🦔").font(.system(size: 48))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Vault: \(manager.bankBalance)🪙")
                                .font(.title3.bold())
                                .monospacedDigit()
                            Text("Earning \(Int(manager.bankRate * 100))%/login-day • Wallet: \(manager.player.gold)🪙")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Text("Interest compounds per missed day (7-day grace). Sundays pay double — mole sabbath. Survives rebirths, resets and regret.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                Section(header: Text("💱 Teller")) {
                    HStack {
                        TextField("Amount", text: $amountText)
                            .keyboardType(.numberPad)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 110)
                        Spacer()
                        Button("Deposit") {
                            _ = manager.bankDeposit(Int(amountText) ?? 0)
                            SpookyHaptics.play(.medium)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                        Button("Withdraw") {
                            _ = manager.bankWithdraw(Int(amountText) ?? 0)
                            SpookyHaptics.play(.medium)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                    HStack(spacing: 10) {
                        ForEach([100, 1000, 10000], id: \.self) { n in
                            Button("+\(n)") { amountText = "\(n)" }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                        }
                        Spacer()
                        Button("Max") {
                            amountText = "\(max(manager.player.gold, manager.bankBalance))"
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                    .font(.caption)
                }
                Section(header: Text("📜 Banker's wisdom")) {
                    Text("Deposit before rebirth — the vault is rebirth-proof. Withdraw before big forge days. Never lend to bats.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Mole Bank")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear {
                _ = manager.bankAccrue()
            }
        }
    }
}
