# 🔐 Aegis Protocol

**The missing access-control layer for autonomous finance on Solana**

> Aegis is the access-control layer that lets smart contracts verify private facts without ever seeing private data.

---

## 🚨 The Problem That Cannot Be Avoided

By 2026, smart contracts will need to verify private facts they are not allowed to see.

This is already breaking real systems:

- **DeFi protocols** verifying real-world assets
- **Autonomous agents** approving loans or payments  
- **Institutions** proving compliance without leaking data

Today, there is **no on-chain way** to:
- Ask a private system a yes/no question
- Enforce access rules cryptographically
- Prove who accessed what, and why

**Without this, automation stalls or re-centralizes.**

---

## 💡 Invoice Factoring: Where This Breaks Today

Invoice factoring is not the product—**it's the simplest place where this problem already exists today.**

**The Scenario:**
- SME needs $150k against an invoice
- Lender needs proof: amount ≥ $100k, buyer is creditworthy
- **Current reality:** Share entire invoice (privacy lost) OR trust intermediary (centralization)

**Both options break automation:**
- Sharing invoices leaks competitive intelligence
- Intermediaries add cost and single points of failure

**What's needed:**
- Lender verifies: "Does this invoice meet my criteria?"
- SME proves: "Yes" or "No"
- **Neither party sees the other's private data**
- All enforcement happens on-chain

**This is impossible without Aegis.**

---

## 🏗️ How Aegis Solves This

```
┌─────────────────────────────────────┐
│  Data Owner (SME)                   │
│  "Invoice ≥ $100k, buyer approved"  │
│  Creates rule, commits secret       │
└──────────────┬──────────────────────┘
               │
               ▼
      ┌────────────────────┐
      │  Aegis Protocol    │
      │  (Solana Program)  │
      │                    │
      │  • Rule stored     │
      │  • Verification    │
      │  • Certificate     │
      │  • Governance      │
      └────────┬───────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Requester (Lender)                 │
│  Provides secret, proves compliance │
│  Receives certificate if verified   │
└─────────────────────────────────────┘
```

**Key Properties:**
- ✅ Secret never exposed on-chain
- ✅ Rules public, data private
- ✅ Cryptographic enforcement (no trust)
- ✅ Institutional governance (pause/resume/revoke)
- ✅ Complete audit trail

---

## 🚀 See It Working

### Prerequisites
```bash
# Install Rust & Solana
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.32.1
avm use 0.32.1
```

### Run the Demo
```bash
# Clone & setup
git clone https://github.com/nagavaishak/Aegis-Protocol.git
cd Aegis-Protocol/aegis_protocol
npm install

# Start validator (separate terminal)
solana-test-validator

# Build & deploy
anchor build
anchor deploy

# Run interactive demo (invoice factoring)
npx ts-node --transpile-only interactive-demo.ts
```

**What you'll see:**
1. SME creates access rule (min amount, approved buyers)
2. Lender requests verification (provides secret, amount, buyer)
3. **Denial scenarios** - wrong secret, low amount, unapproved buyer
4. Certificate issued on success
5. **Privacy preserved** - secret never revealed

---

## 🛡️ Production-Grade Features

### 1. Institutional Governance ✅

**Emergency Controls:**
```rust
pause_rule()   // Immediate shutdown (reversible)
resume_rule()  // Controlled reactivation  
revoke_rule()  // Permanent deactivation
```

**Why this matters:** Real institutions need circuit breakers.

**Demo:** `npx ts-node --transpile-only lifecycle-demo.ts`

---

### 2. Security-First Design ✅

**Explicit Denial Proofs:**
- Wrong secret detection
- Amount threshold enforcement
- Party approval validation
- **Every failure tracked with reason**

**Why this matters:** Security through visibility, not obscurity.

---

### 3. Event-Based Observability ✅

**Zero state bloat, full audit trail:**
```bash
npx ts-node --transpile-only access-metrics.ts
```

**Tracks:**
- Access attempts (granted/denied)
- Success rates
- Policy actions (pause/resume/revoke)

**Why this matters:** Compliance without overhead.

---

## 🚨 Why This Cannot Be Replaced

| Approach | Why It Fails |
|----------|--------------|
| **APIs** | Keys leak, no on-chain enforcement |
| **Oracles** | Too much data exposure |
| **Manual audits** | Not automatable |
| **Centralized IAM** | Breaks DeFi trust model |

**Aegis is the only model that allows:**
- ✅ Automation without data exposure
- ✅ Enforcement without trust
- ✅ Audits without central control

---

## 🔧 Core Protocol API

```rust
// Create access rule with conditions
create_rule(
    dataset_id: [u8; 32],
    secret_commitment: [u8; 32],
    min_amount: u64,
    approved_parties: Vec<[u8; 32]>,
    valid_from: i64,
    valid_until: i64
)

// Request verification
request_access(
    secret: [u8; 32],
    amount: u64,
    party_hash: [u8; 32]
)

// Governance (owner-only)
pause_rule()    
resume_rule()   
revoke_rule()   

// Audit trail
use_certificate(computation_result: bool)
```

**Program ID:** `7UDghojWtnQUddeuAmA5q3oqiPfoQCAQySsxTHzyrkAj`

---

## 🌍 Policy-Defined Access (Works Across Domains)

**Invoice factoring is the reference implementation.**

AI data, carbon credits, and supply chains are natural extensions—not demos.

**Same protocol, different semantics:**

| Domain | "Amount" | "Party" | Current Status |
|--------|----------|---------|----------------|
| **Invoice Factoring** | Invoice value | Buyer ID | ✅ Implemented |
| **AI Training Data** | Dataset samples | Data source | ✅ Implemented |
| **Carbon Credits** | Credit tons | Issuer | 🏗️ Natural extension |
| **RWA Collateral** | Asset value | Custodian | 🏗️ Natural extension |

**AI Data Demo:** `npx ts-node --transpile-only ai-data-demo.ts`

**Proves:** Aegis is infrastructure, not application-specific tooling.

---

## 📊 Sponsor Integrations

### Helius (Production RPC) ✅
**Status:** Integrated and operational

**What we use:**
- Enhanced RPC for reliable event indexing
- Production-grade transaction confirmation
- Webhook-ready architecture

**Benefits:**
- 📈 Higher reliability than standard RPC
- ⚡ Faster confirmations
- 🔔 Real-time event capture

**Code:** `audit-compressor-helius.ts`

---

### Light Protocol (ZK Compression) 🏗️
**Status:** Architecture-ready

**What we built:**
- Event structure optimized for compression
- Audit trail designed for off-chain indexing
- Metadata prepared for merkle trees

**Next steps:**
- Full SDK integration
- Live compression demonstration
- Storage cost reduction (~1000x)

---

## 🎯 What Makes This Different

**Not just another hackathon project:**

1. **Production-Grade Governance** - Circuit breakers (rare in DeFi)
2. **Security-First** - Explicit denials with reasons (not just happy path)
3. **Event-Based Analytics** - Metrics without state bloat
4. **Proven Cross-Domain** - Invoice factoring + AI data working
5. **Institutional Ready** - Pause/resume/revoke controls

---

## 📚 Technical Resources

- **Network:** Solana Devnet (tested) / Localnet
- **Framework:** Anchor 0.32.1
- **Language:** Rust (program) + TypeScript (demos)
- **GitHub:** [Aegis-Protocol](https://github.com/nagavaishak/Aegis-Protocol)

---

## 🚀 Future Roadmap

**Completed:** ✅ Core protocol + governance + observability

**Next:**
- Complete Light Protocol compression integration
- Helius webhook implementation  
- Multi-condition policy composition
- Cross-program invocation support
- Anonymous credential system
- Developer SDK for rapid integration

---

**If Aegis didn't exist, every serious protocol would have to rebuild it privately—badly.**

---

## 📄 License

MIT License - Built with ❤️ on Solana

---

**This is the missing layer. The use cases are inevitable.**