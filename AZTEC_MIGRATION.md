# POA v2: Aztec Network Migration with ZKLP

> **Status**: Development Phase  
> **Created**: 2026-03-05  
> **Branch**: `v2-aztec`  
> **Previous**: Ethereum/Solidity implementation (archived)

---

## Executive Summary

This document describes the migration of the Proof of Attendance (POA) system from Ethereum to the Aztec Network, leveraging **ZKLP (Zero-Knowledge Location Proofs)** to enable privacy-preserving attendance tracking without compromising verification requirements.

### What is ZKLP?

**ZKLP** is a protocol for proving physical presence at a location without revealing:
- **Who** is requesting access (identity hidden)
- **Where** else they have accessed (location correlation hidden)
- **When** they accessed previously (temporal patterns hidden)

Only the specific authorization is proven: *"An authorized person is at this location now."*

### Why Aztec?

The original Ethereum implementation was abandoned because **all data was public**:
- Wallet addresses exposed
- Check-in/check-out timestamps visible to anyone
- Employer-employee relationships traceable
- Location history publicly analyzable

Aztec Network solves this through **private state** and **zero-knowledge proofs**, enabling ZKLP generation where attendance is proven without revealing sensitive metadata.

---

## Architecture Overview

### Core Use Case: Office Building Access Control

**Scenario**: A manager assigns cleaning staff to specific units. Each staff member receives ZKLP credentials for their assigned units only. Smart locks verify ZKLPs to grant access without learning the cleaner's identity.

```
┌─────────────────────────────────────────────────────────────┐
│                    MANAGER DASHBOARD                        │
│  (Encrypted viewing key - can see full audit trail)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Issues ZKLP credentials
┌─────────────────────────────────────────────────────────────┐
│                 CLEANING STAFF DEVICE                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Private Identity Note                                │   │
│  │ ├─ Unit #205 ZKLP Credential                         │   │
│  │ └─ Unit #207 ZKLP Credential                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Generates ZKLP
┌─────────────────────────────────────────────────────────────┐
│                    SMART LOCK (Unit #205)                   │
│  Receives: ZKLP + Nullifier                                 │
│  Verifies: "Authorized person requests access"              │
│  Learns:   NOTHING about identity                           │
│  Action:   Open door, store nullifier (prevent replay)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Ethereum vs Aztec: Key Differences

| Aspect | Ethereum (v1) | Aztec Network (v2) |
|--------|--------------|-------------------|
| **Smart Contract Language** | Solidity | Noir (Rust-like, ZK-native) |
| **State Model** | Account-based storage | UTXO-based private notes |
| **Data Visibility** | All data public by default | Private by default, selective disclosure |
| **Function Types** | Public only | Private (ZK circuits) + Public (AVM bytecode) |
| **Identity Model** | Wallet address = identity | Stealth addresses + nullifiers |
| **Transaction Privacy** | Transparent | Hidden sender, receiver, amount |
| **Proof Generation** | None (transparent execution) | Client-side ZK proofs (ZKLP) |
| **Access Pattern** | Direct storage reads | Requires private keys to decrypt notes |
| **Inter-Contract Calls** | Direct calls | Asynchronous message passing |

### Practical Implications

**Ethereum (v1)**:
```solidity
function checkIn(bytes32 _orgId, uint _locId) public {
    // Everyone can see: msg.sender, _orgId, _locId, block.timestamp
    emit checkedInEvent(msg.sender, _orgId, _locId);
}
```

**Aztec (v2) using ZKLP**:
```rust
#[private]
fn generate_zklp(
    unit_id: Field, 
    access_credential: Credential,  // Private input
    context: PrivateContext
) -> Field {
    // Generates ZKLP: "I have valid access credential for this unit"
    // Public output: Nullifier only (prevents double-spending)
    // Nothing about identity revealed
}
```

---

## Privacy Model

### Privacy Guarantees

| Data | Smart Lock | Public Blockchain | Manager |
|------|-----------|-------------------|---------|
| Employee Identity | ❌ Hidden | ❌ Hidden | ✅ Visible |
| Unit ID | ✅ Known | ❌ Hidden | ✅ Visible |
| Timestamp | ✅ Known | ❌ Hidden | ✅ Visible |
| Organization | ❌ Hidden | ❌ Hidden | ✅ Visible |

### Design Rationale

**Smart Lock**: Only needs to know "authorized person" → grants access. Does not need identity (prevents surveillance abuse).

**Public Blockchain**: Stores nullifiers and commitments only. No identifiable information.

**Manager**: Has employment contract = consent to view audit trail. Uses encrypted viewing keys to decrypt employee notes for payroll/verification.

---

## Technical Architecture

### Repository Structure

This project uses ZKLP as its core protocol:

```
poa-attendance/                 # This repository
├── contracts/                  # Noir smart contracts using ZKLP
│   ├── main.nr                # Entry point, orchestration
│   ├── identity.nr            # Identity derivation & management
│   ├── zklp.nr                # ZKLP generation & verification
│   ├── session.nr             # Nullifier & session management
│   └── disclosure.nr          # Manager viewing key logic
├── circuits/                  # Custom ZKLP circuits (if needed)
├── aztec-js/                  # TypeScript client code
│   ├── src/
│   │   ├── pxeservice.ts      # PXE (Private Execution Environment) client
│   │   ├── zklp_prover.ts     # ZKLP generation
│   │   └── account.ts         # Account management
│   └── package.json
├── smart-lock/                # Smart lock verifier
│   ├── verify_zklp.ts         # ZKLP verification logic
│   └── hardware/              # Embedded lock interface
├── manager-dashboard/         # Web dashboard
│   ├── src/
│   └── package.json
└── tests/                     # Test suite
    ├── unit/
    └── e2e/
```

### Future Foundation Repository

```
aztec-zklp-protocol/           # Future separate foundation repo
├── contracts/
│   ├── identity.nr            # Reusable identity primitives
│   ├── credential.nr          # Non-transferable credential issuance
│   ├── zklp_core.nr           # Core ZKLP protocol
│   └── nullifiers.nr          # Session/replay protection
├── tests/
├── docs/                      # Developer documentation
└── examples/
    └── simple_access/         # Minimal ZKLP example
```

**POA uses ZKLP**: The POA system will import and extend the `aztec-zklp-protocol` foundation once established.

### Core Components

#### 1. Identity Management (`identity.nr`)

```rust
// Master identity derivation
// Each employee has a master secret
// ZKLP credentials are deterministically derived per unit

struct Identity {
    master_secret: Field,
    public_key: Field,
}

impl Identity {
    fn derive_zklp_credential(&self, unit_id: Field) -> Credential {
        // Deterministic derivation: hash(master_secret, unit_id)
        // Same master secret + unit_id always produces same credential
        // Different units produce different credentials (privacy)
    }
}
```

#### 2. ZKLP Generation (`zklp.nr`)

```rust
// Validates unit access and generates ZKLP
// Proof of membership without identity revelation

#[private]
fn generate_zklp(
    unit_id: Field,
    credential: Credential,
    identity: Identity,
) -> ZKLP {
    // Verify credential was derived from identity
    // Verify credential is in unit's authorized set
    // Generate nullifier to prevent replay
    // Return ZKLP struct without revealing identity
}

#[public]
fn verify_zklp(
    zklp: ZKLP,
    unit_id: Field,
) -> bool {
    // Verify ZKLP cryptographic validity
    // Check nullifier not already spent
    // Store nullifier to prevent replay
    // Return verification result
}
```

#### 3. Session Management (`session.nr`)

```rust
// Nullifier-based session control
// Prevents: double-check-in, tailgating, replay attacks

struct Session {
    nullifier: Field,        // Public - prevents replay
    unit_id: Field,          // Public - which unit
    check_in_time: Field,    // Encrypted - manager can decrypt
}

#[private]
fn generate_zklp_checkin(
    unit_id: Field,
    credential: Credential,
) -> ZKLP {
    // Verify credential is valid for unit_id
    // Compute nullifier from credential
    // Assert nullifier not already spent
    // Return ZKLP (public nullifier)
}

#[private]
fn generate_zklp_checkout(
    nullifier: Field,
    session_proof: SessionProof,
) -> ZKLP {
    // Verify session exists
    // Generate checkout ZKLP
    // Nullify the session for reuse
}
```

#### 4. Selective Disclosure (`disclosure.nr`)

```rust
// Manager viewing keys
// Employee ZKLP events encrypted to manager's public key

#[private]
fn create_auditable_zklp_record(
    zklp_event: ZKLPEvent,
    manager_public_key: Field,
) -> EncryptedZKLPRecord {
    // Encrypt ZKLP event data with manager's key
    // Store on-chain (only manager can decrypt)
}
```

---

## ZKLP Flow

### Check-In Process

```
Employee Device                          Smart Lock
     │                                        │
     │  1. Generate ZKLP                      │
     │     - "I have valid Unit #205 cred"    │
     │     - "Cred derived from master ID"    │
     │     - "Nullifier not spent"            │
     │                                        │
     │  2. Send ZKLP + Nullifier ───────────> │
     │                                        │
     │     3. verify_zklp()                   │
     │     4. Check nullifier not in set      │
     │     5. Store nullifier                 │
     │     6. Open door                       │
     │                                        │
```

### ZKLP Composition

```rust
// Core ZKLP structure
struct ZKLP {
    nullifier: Field,           // Prevents replay
    commitment: Field,          // Commits to credential without revealing
    unit_id: Field,             // Which unit (public)
    timestamp: Field,           // When (encrypted to manager)
}

// ZKLP generation circuit
fn generate_zklp(
    // Private inputs (hidden)
    master_secret: Field,
    unit_id: Field,
    
    // Public inputs (visible)
    unit_public_key: Field,
) -> ZKLP {
    // 1. Derive credential
    let credential = hash(master_secret, unit_id);
    
    // 2. Verify credential in unit's Merkle tree
    let valid = merkle_membership_proof(credential, unit_merkle_root);
    assert(valid);
    
    // 3. Compute nullifier
    let nullifier = compute_nullifier(credential);
    
    // 4. Compute commitment (hides credential)
    let commitment = hash(credential, nullifier);
    
    ZKLP {
        nullifier,
        commitment,
        unit_id,
        timestamp: now(),
    }
}

// ZKLP verification
fn verify_zklp(
    zklp: ZKLP,
    spent_nullifiers: Set<Field>,
) -> bool {
    // Verify ZKLP is well-formed
    assert(zklp.nullifier != 0);
    
    // Verify nullifier not spent
    assert(!spent_nullifiers.contains(zklp.nullifier));
    
    // Verify commitment corresponds to valid credential
    // (Done via Merkle proof verification in circuit)
    
    true
}
```

---

## Data Flow

### Employee Onboarding

1. **Manager creates employee identity**:
   - Generate master secret
   - Derive public key
   - Issue ZKLP credentials for assigned units

2. **Employee receives credentials**:
   - Master secret (stored securely on device)
   - ZKLP credentials for each assigned unit

### Daily Usage

1. **Check-In**:
   - Employee approaches Unit #205
   - Device calls `generate_zklp()` with Unit #205 credential
   - Smart lock calls `verify_zklp()`, stores nullifier, opens door
   - Encrypted ZKLP record stored for manager audit

2. **Check-Out**:
   - Employee approaches Unit #205 again (or different exit method)
   - Device calls `generate_zklp_checkout()`
   - Smart lock verifies checkout ZKLP, nullifies session
   - Encrypted ZKLP record stored for manager audit

3. **Manager Review**:
   - Manager queries encrypted ZKLP records with viewing key
   - Sees: "Employee X generated ZKLP for Unit Y at time Z"
   - Processes payroll based on decrypted data

---

## Development Phases

### Phase 1: Foundation (Current)
- [ ] Set up Aztec development environment
- [ ] Implement core identity management
- [ ] Build ZKLP generation (`generate_zklp`)
- [ ] Build ZKLP verification (`verify_zklp`)
- [ ] Create session/nullifier logic

### Phase 2: Integration
- [ ] Develop aztec-js client with ZKLP prover
- [ ] Build smart lock verifier
- [ ] Create manager dashboard
- [ ] End-to-end testing

### Phase 3: Production
- [ ] Security audit
- [ ] Testnet deployment
- [ ] Hardware integration
- [ ] Documentation

### Future: Foundation Extraction
- [ ] Extract reusable ZKLP protocol to `aztec-zklp-protocol`
- [ ] Refactor POA to use foundation as dependency
- [ ] Document foundation for other developers

### Future Enhancements (v2.1+)
- [ ] Time-based restrictions (shift windows)
- [ ] Multi-signature requirements
- [ ] Emergency override mechanisms
- [ ] Integration with payroll systems

---

## Known Limitations & Trade-offs

### 1. Manager Visibility
**Trade-off**: Manager can see full audit trail (employment contract = consent)

**Alternative considered**: Pure anonymity (employee self-reports hours)
**Rejected because**: No verifiability, prone to fraud

### 2. Single Point of Failure
**Risk**: Employee loses device → loses ZKLP credentials

**Mitigation**: Social recovery (manager can re-issue credentials with new master secret)

### 3. ZKLP Generation Time
**Consideration**: Client-side ZK proof generation takes 1-3 seconds

**Mitigation**: Acceptable for access control use case (user taps, waits briefly)

---

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Stolen device | Credentials bound to master secret (biometric/PIN protected) |
| Replay attack | Nullifier prevents double-spending of ZKLPs |
| Fake unit | Units have registered public keys in contract |
| Manager collusion | Smart lock doesn't know identity (can't be coerced) |
| Blockchain analysis | Only nullifiers public, no linkable data |
| ZKLP forgery | Cryptographic soundness of ZK circuits |

### Key Management

- **Master secrets**: Stored in secure enclave on employee device
- **ZKLP credentials**: Derived on-demand, never stored plaintext
- **Manager viewing keys**: Hardware security module (HSM) recommended
- **Contract keys**: Multi-sig for contract upgrades

---

## References

### Aztec Documentation
- [Aztec.nr Framework](https://docs.aztec.network/developers/docs/aztec-nr)
- [Aztec.js SDK](https://docs.aztec.network/developers/docs/aztec-js)
- [Noir Language](https://noir-lang.org/)

### Related Work
- [Semaphore Protocol](https://semaphore.pse.dev/) - Anonymous membership proofs
- [ZCash](https://z.cash/) - Nullifier-based privacy
- [Aztec Connect](https://aztec.network/) - DeFi privacy (deprecated, but patterns relevant)

---

## Migration Notes from v1

### Deprecated Components
- `eth/attendance.sol` → Replaced by Noir contracts with ZKLP
- `client/index.js` → Replaced by aztec-js client with ZKLP prover
- `server/index.js` → Simplified (no blockchain node needed, uses PXE)

### Preserved Concepts
- Hierarchical roles (Owner → Admin → Manager → Staff)
- Organization/Unit structure
- Event emission pattern (now encrypted ZKLP records)

### Breaking Changes
- All wallet interactions change (Web3 → Aztec.js)
- No more MetaMask (Aztec uses own account abstraction)
- Deployment process completely different
- Core mechanism changes (transparent events → ZKLPs)

---

## Glossary

| Term | Definition |
|------|------------|
| **ZKLP** | Zero-Knowledge Location Proof - proves authorization to access a location without revealing identity |
| **Credential** | Cryptographic proof of authorization derived from master secret |
| **Nullifier** | Unique identifier that prevents replay of ZKLPs |
| **Commitment** | Cryptographic hash that binds a credential to a ZKLP without revealing it |
| **PXE** | Private Execution Environment - Aztec's client-side proving system |
| **Note** | Private state element in Aztec (encrypted UTXO) |

---

## Contributing

This branch (`v2-aztec`) is under active development. Do not merge to master until:
1. All Phase 1 components complete
2. Security review passed
3. Testnet deployment successful

---

## License

Same as original project (see LICENSE file)

---

## Contact

For questions about this migration or ZKLP protocol, open an issue in this repository.

---

*Last updated: 2026-03-05*  
*Next review: After Phase 1 completion*
