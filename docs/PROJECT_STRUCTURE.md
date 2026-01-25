# Aegis Protocol - Project Structure

## 📂 Directory Overview
```
Aegis-Protocol/
├── demos/              # Interactive demonstrations
├── integrations/       # Sponsor technology integrations
├── aegis_mxe/         # Arcium MXE confidential compute
├── zk/                # Zero-knowledge proof circuits
├── programs/          # Core Solana programs
├── tests/             # Test suites
└── archive/           # Development test files
```

---

## 🎯 Quick Start Demos

### Main Demo
```bash
npx ts-node demos/interactive-demo.ts
```
Interactive CLI showing full access control flow with success/denial scenarios.

### Other Demos
- `demos/demo.ts` - Basic access control demo
- `demos/lifecycle-demo.ts` - Policy lifecycle (pause/resume/revoke)
- `demos/ai-data-demo.ts` - AI agent use case
- `demos/access-metrics.ts` - Metrics tracking

---

## 🔐 Core Components

### 1. Solana Programs (`programs/`)
- `aegis_protocol/` - Main access control program
  - Policy creation & management
  - Certificate issuance
  - Audit event emission

### 2. Zero-Knowledge Proofs (`zk/`)
- `circuits/verify_access/` - Noir circuit
  - Proves amount ≥ threshold without revealing value
  - ~4 second proof generation
  - Full cryptographic verification

### 3. Arcium MXE (`aegis_mxe/`)
- `encrypted-ixs/` - Arcis circuit (confidential compute)
- `programs/aegis_mxe_deploy/` - Solana integration
- `tests/` - Working test suite (✅ 1 passing)
- Encrypts sensitive data for private on-chain verification

---

## 🏗️ Sponsor Integrations

### Light Protocol (`integrations/`)
**Audit Compression**
- `audit-compressor.ts` - Event compression architecture
- Reduces storage costs by ~1000x
- Preserves full audit trail off-chain

### Helius (`integrations/`)
**Enhanced RPC**
- `audit-compressor-helius.ts` - Production RPC integration
- Webhook-ready for real-time alerts
- Higher reliability than standard RPC

### Arcium (`aegis_mxe/`)
**Confidential Computing**
- Full MXE deployment with encrypted computation
- Private verification without revealing secrets
- See `aegis_mxe/README.md` for details

---

## 🧪 Testing

### Run All Tests
```bash
anchor test
```

### Run MXE Tests
```bash
cd aegis_mxe
arcium test
```

### Run ZK Proof Generation
```bash
cd zk/circuits/verify_access
nargo prove
```

---

## 🚀 Deployment

### Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Local
```bash
solana-test-validator  # Terminal 1
anchor test            # Terminal 2
```

---

## 📊 Architecture
```
┌─────────────────┐
│   Data Owner    │ Creates policy with secret commitment
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Aegis Protocol  │ Policy verification (3 paths available)
│  (Solana)       │
└────────┬────────┘
         │
    ┌────┴────┬──────────────┬────────────┐
    │         │              │            │
    ▼         ▼              ▼            ▼
┌────────┐ ┌─────┐    ┌──────────┐  ┌──────────┐
│ Simple │ │ ZK  │    │   MXE    │  │  Light   │
│ Hash   │ │Proof│    │(Arcium)  │  │ Protocol │
└────────┘ └─────┘    └──────────┘  └──────────┘
                      Confidential   Compression
                      Computation
```

---

## 📝 Key Files

- `README.md` - Main project documentation
- `Anchor.toml` - Anchor configuration
- `Cargo.toml` - Rust workspace
- `package.json` - Node dependencies
- `tsconfig.json` - TypeScript config

---

## 🎯 Use Cases

1. **Invoice Factoring** (Demo implementation)
2. **Carbon Credit Verification**
3. **RWA Collateral Checks**
4. **Supply Chain Attestation**

See main `README.md` for detailed use case descriptions.

---

## 🔧 Development

### Prerequisites
```bash
# Rust & Solana
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.32.1 && avm use 0.32.1

# Noir (for ZK)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Arcium (for MXE)
npm install -g @arcium-hq/cli
```

### Build
```bash
anchor build              # Solana programs
cd zk/circuits/verify_access && nargo compile  # ZK circuits
cd aegis_mxe && arcium build  # MXE circuits
```

---

## 📚 Additional Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Light Protocol Docs](https://docs.lightprotocol.com/)
- [Helius Docs](https://docs.helius.dev/)
- [Arcium Docs](https://docs.arcium.com/)
- [Noir Docs](https://noir-lang.org/)

---

**Built for Solana Privacy Hackathon 2025** 🚀
