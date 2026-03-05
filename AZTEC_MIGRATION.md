# POA v2: Aztec Network Migration

> **Status**: Development Phase  
> **Created**: 2026-03-05  
> **Branch**: `v2-aztec`  
> **Previous**: Ethereum/Solidity implementation (archived)

---

## Executive Summary

This document describes the migration of the Proof of Attendance (POA) system from Ethereum to the Aztec Network, enabling **privacy-preserving attendance tracking** without compromising the core verification requirements of employers.

### Why Aztec?

The original Ethereum implementation was abandoned because **all data was public**:
- Wallet addresses exposed
- Check-in/check-out timestamps visible to anyone
- Employer-employee relationships traceable
- Location history publicly analyzable

Aztec Network solves this through **private state** and **zero-knowledge proofs**, allowing us to prove "attendance occurred" without revealing who, where, or when to unauthorized parties.

---

## Architecture Overview

### Core Use Case: Office Building Access Control

**Scenario**: A manager assigns cleaning staff to specific units. Each staff member receives access credentials for their assigned units only. Smart locks verify ZK proofs to grant access without learning the cleaner's identity.

```
┌─────────────────────────────────────────────────────────────┐
│                    MANAGER DASHBOARD                        │
│  (Encrypted viewing key - can see full audit trail)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Issues credentials
┌─────────────────────────────────────────────────────────────┐
│                 CLEANING STAFF DEVICE                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Private Identity Note                                │   │
│  │ ├─ Unit #205 Access Note                             │   │
│  │ └─ Unit #207 Access Note                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Generates ZK Proof
┌─────────────────────────────────────────────────────────────┐
│                    SMART LOCK (Unit #205)                   │
│  Receives: ZK Proof + Nullifier                             │
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
| **Proof Generation** | None (transparent execution) | Client-side ZK proofs |
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

**Aztec (v2)**:
```rust
#[private]
fn check_in(
    unit_id: Field, 
    access_note: Note,  // Private input
    context: PrivateContext
) -> Field {
    // Generates ZK proof: "I have valid access note for this unit"
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

### Directory Structure

```
poa-attendance/
├── contracts/                 # Noir smart contracts
│   ├── main.nr               # Entry point, orchestration
│   ├── identity.nr           # Identity derivation & management
│   ├── access_control.nr     # Unit access validation
│   ├── session.nr            # Nullifier & session management
│   └── disclosure.nr         # Manager viewing key logic
├── circuits/                 # Custom ZK circuits (if needed)
├── aztec-js/                 # TypeScript client code
│   ├── src/
│   │   ├── pxeservice.ts     # PXE (Private Execution Environment) client
│   │   ├── prover.ts         # Proof generation
│   │   └── account.ts        # Account management
│   └── package.json
├── smart-lock/               # Smart lock verifier
│   ├── verifier.ts           # Proof verification logic
│   └── hardware/             # Embedded lock interface
├── manager-dashboard/        # Web dashboard
│   ├── src/
│   └── package.json
└── tests/                    # Test suite
    ├── unit/
    └── e2e/
```

### Core Components

#### 1. Identity Management (`identity.nr`)

```rust
// Master identity derivation
// Each employee has a master secret
// Access notes are deterministically derived per unit

struct Identity {
    master_secret: Field,
    public_key: Field,
}

impl Identity {
    fn derive_unit_access_note(&self, unit_id: Field) -> Note {
        // Deterministic derivation: hash(master_secret, unit_id)
        // Same master secret + unit_id always produces same note
        // Different units produce different notes (privacy)
    }
}
```

#### 2. Access Control (`access_control.nr`)

```rust
// Validates unit access
// Generates ZK proof of membership

#[private]
fn prove_unit_access(
    unit_id: Field,
    access_note: Note,
    identity: Identity,
) -> bool {
    // Verify note was derived from identity
    // Verify note is in unit's authorized set
    // Return proof without revealing identity
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
fn check_in(
    unit_id: Field,
    access_note: Note,
) -> Field {
    // Verify access_note is valid for unit_id
    // Compute nullifier from access_note
    // Assert nullifier not already spent
    // Return nullifier (public)
}

#[private]
fn check_out(
    nullifier: Field,
    session_proof: SessionProof,
) {
    // Verify session exists
    // Nullify the session
    // Allow new check-in
}
```

#### 4. Selective Disclosure (`disclosure.nr`)

```rust
// Manager viewing keys
// Employee notes encrypted to manager's public key

#[private]
fn create_auditable_note(
    event: AttendanceEvent,
    manager_public_key: Field,
) -> EncryptedNote {
    // Encrypt event data with manager's key
    // Store on-chain (only manager can decrypt)
}
```

---

## Zero-Knowledge Proof Flow

### Check-In Process

```
Employee Device                          Smart Lock
     │                                        │
     │  1. Generate ZK Proof                  │
     │     - "I have valid Unit #205 note"    │
     │     - "Note derived from master ID"    │
     │     - "Nullifier not spent"            │
     │                                        │
     │  2. Send Proof + Nullifier ──────────> │
     │                                        │
     │     3. Verify proof                    │
     │     4. Check nullifier not in set      │
     │     5. Store nullifier                 │
     │     6. Open door                       │
     │                                        │
```

### Proof Composition

```rust
// Combined proof for check-in
fn check_in_proof(
    // Private inputs (hidden)
    master_secret: Field,
    unit_id: Field,
    
    // Public inputs (visible)
    nullifier: Field,
    unit_public_key: Field,
) -> bool {
    // 1. Derive access note
    let access_note = hash(master_secret, unit_id);
    
    // 2. Verify note in unit's Merkle tree
    let valid = merkle_membership_proof(access_note, unit_merkle_root);
    
    // 3. Compute nullifier matches
    let computed_nullifier = compute_nullifier(access_note);
    assert(computed_nullifier == nullifier);
    
    // 4. Verify nullifier not spent (checked in public function)
    valid
}
```

---

## Data Flow

### Employee Onboarding

1. **Manager creates employee identity**:
   - Generate master secret
   - Derive public key
   - Issue unit access notes for assigned units

2. **Employee receives credentials**:
   - Master secret (stored securely on device)
   - Access notes for each assigned unit

### Daily Usage

1. **Check-In**:
   - Employee approaches Unit #205
   - Device generates ZK proof + nullifier
   - Smart lock verifies, stores nullifier, opens door
   - Encrypted note stored for manager audit

2. **Check-Out**:
   - Employee approaches Unit #205 again (or different exit method)
   - Device generates check-out proof
   - Smart lock nullifies session
   - Encrypted note stored for manager audit

3. **Manager Review**:
   - Manager queries encrypted notes with viewing key
   - Sees: "Employee X checked in/out Unit Y at time Z"
   - Processes payroll based on decrypted data

---

## Development Phases

### Phase 1: Foundation (Current)
- [ ] Set up Aztec development environment
- [ ] Implement core identity management
- [ ] Build unit access control
- [ ] Create session/nullifier logic

### Phase 2: Integration
- [ ] Develop aztec-js client
- [ ] Build smart lock verifier
- [ ] Create manager dashboard
- [ ] End-to-end testing

### Phase 3: Production
- [ ] Security audit
- [ ] Testnet deployment
- [ ] Hardware integration
- [ ] Documentation

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
**Risk**: Employee loses device → loses access credentials

**Mitigation**: Social recovery (manager can re-issue notes with new master secret)

### 3. Proof Generation Time
**Consideration**: Client-side ZK proof generation takes 1-3 seconds

**Mitigation**: Acceptable for access control use case (user taps, waits briefly)

---

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Stolen device | Credentials bound to master secret (biometric/PIN protected) |
| Replay attack | Nullifier prevents double-spending |
| Fake unit | Units have registered public keys in contract |
| Manager collusion | Smart lock doesn't know identity (can't be coerced) |
| Blockchain analysis | Only nullifiers public, no linkable data |

### Key Management

- **Master secrets**: Stored in secure enclave on employee device
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
- `eth/attendance.sol` → Replaced by Noir contracts
- `client/index.js` → Replaced by aztec-js client
- `server/index.js` → Simplified (no blockchain node needed, uses PXE)

### Preserved Concepts
- Hierarchical roles (Owner → Admin → Manager → Staff)
- Organization/Unit structure
- Event emission pattern (now encrypted)

### Breaking Changes
- All wallet interactions change (Web3 → Aztec.js)
- No more MetaMask (Aztec uses own account abstraction)
- Deployment process completely different

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

For questions about this migration, open an issue in this repository.

---

*Last updated: 2026-03-05*
*Next review: After Phase 1 completion*
