# 🔐 Aegis Protocol
**The Control Plane for Private AI & Autonomous Systems**

Aegis turns private facts into on-chain permissions — without exposing the facts. It enables confidential AI, agents, and enterprises to act on-chain safely.

---

## The Problem (30 seconds max)

AI models and agents need access to private datasets (training, evaluation, inference).

But today:
- **Sharing raw data** → privacy & compliance violations
- **Using APIs / OAuth** → centralized trust, no cryptographic enforcement
- **Public blockchains** → intent leaks by default

**Result:** Confidential AI on-chain is effectively impossible.

---

## The Insight

**AI doesn't need data. It needs proof that data satisfies a policy.**

Examples:
- "This dataset meets quality threshold X"
- "This model is authorized"
- "This action is compliant"

**Aegis makes private facts verifiable — without revealing them.**

---

## What Aegis Is

Aegis is a **privacy-preserving policy engine** for autonomous systems.

It allows AI models, agents, and smart contracts to:
- **Prove** private conditions using real zero-knowledge proofs
- **Enforce** policies on-chain
- **Execute** decisions via confidential computation
- **Remain** fully auditable

**Aegis protects intent, not data.**

---

## How It Works
```
Private Data
   ↓
ZK Proof (Noir)
   ↓
Aegis Policy (Solana)
   ↓
Capability Certificate
   ↓
Confidential Compute (Arcium MXE)
```

- **ZK proves** policy compliance without revealing data
- **Aegis enforces** rules on-chain
- **Certificates grant** permission, not data
- **Arcium MXE computes** the final decision confidentially

---

## What This Demo Proves

This is where judges decide if it's real.

### ✅ Built in this hackathon
- Real ZK proofs (Noir + Barretenberg)
- On-chain policy enforcement (Anchor / Solana)
- Deterministic denial proofs
- Real Arcium MXE confidential computation
- End-to-end working demo

### ❌ Not yet (honest roadmap)
- On-chain ZK verifier
- Production key management
- Full Manticore training pipelines

**This is a real MVP — not a mock or slideware.**

---

## Concrete Use Case

### Confidential AI Training Access

A company allows an AI model to train on its internal dataset **only if**:
- Dataset meets quality threshold
- Model identity is approved
- Usage is auditable

They **must not reveal**:
- Dataset contents
- Metrics
- Internal logic

**Aegis enables this:**
- **ZK proves** dataset quality
- **Aegis enforces** policy
- **Arcium executes** training confidentially
- **Everything is auditable, nothing is leaked**

---

## Why Arcium Is Essential

| Without Arcium | With Arcium |
|----------------|-------------|
| Client-side computation | Encrypted shared state |
| Results forgeable | Confidential execution |
| Trust required | Cryptographic enforcement |

**The final decision cannot be computed outside Arcium MXE.**

---

## Why This Matters

**Autonomous AI cannot legally or safely operate on private data without infrastructure like Aegis.**

**Privacy is no longer a feature. It is the control plane.**

**Aegis makes confidential AI on-chain possible.**

---

## 🚀 Quick Start

### Interactive Demo (Recommended)
```bash
# Start local validator
solana-test-validator

# In another terminal
npx ts-node --transpile-only demos/interactive-demo-visual.ts
```

### Run Test Suite
```bash
anchor test
```

### Arcium MXE Demo
```bash
cd aegis_mxe
ulimit -n 1048576
arcium test
```

---

## Network

**Deployed on Solana Devnet**
- Program ID: `J4qkfpNjTBHwW5eNSeAEKTB6wYVPSjAo3fVZcC93bSCE`
- RPC: `https://api.devnet.solana.com`
- Explorer: [View on Solscan](https://solscan.io/account/J4qkfpNjTBHwW5eNSeAEKTB6wYVPSjAo3fVZcC93bSCE?cluster=devnet)

**Note:** Interactive demo uses local validator for reliable airdrops during testing. The program is also deployed on devnet for inspection.

---

## Integrations

- **Arcium** — Required confidential computation (MXE)
- **Aztec / Noir** — Real zero-knowledge policy proofs
- **Solana** — Deterministic, auditable enforcement

---

**Aegis protects intent, not data.**
