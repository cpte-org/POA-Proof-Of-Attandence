# POA/ZKLP Project Memory - Session Continuity

> Created: 2026-03-05  
> Last Updated: Session with Kimi Code CLI  
> Next Action: Start new Kimi session with Aztec/Noir MCP servers enabled

---

## 🎯 Project Overview

**POA (Proof of Attendance) v2** - Privacy-preserving attendance tracking system using **ZKLP (Zero-Knowledge Location Proofs)** protocol on Aztec Network.

### Why This Project?
- Original Ethereum implementation abandoned due to privacy issues (all data public)
- Aztec Network provides private state + zero-knowledge proofs
- ZKLP enables proving attendance without revealing identity/location history

---

## ✅ Completed So Far

### Phase 0: Foundation ✅ DONE

#### 1. ZKLP Protocol Repository
**Location**: `~/Git/aztec-zklp-protocol/`  
**GitHub**: https://github.com/cpte-org/aztec-zklp-protocol

**Noir Contracts** (`contracts/`):
- `types.nr` - Core types (Identity, Credential, ZKLP, Session)
- `identity.nr` - Identity management, credential derivation
- `zklp_core.nr` - `generate_zklp()`, `verify_zklp()` functions
- `nullifiers.nr` - Replay protection, session management
- `disclosure.nr` - Manager viewing keys, encrypted audit records
- `lib.nr` - Main exports

**TypeScript SDK** (`aztec-js/src/`):
- `types.ts` - TypeScript type definitions
- `identity.ts` - Identity operations
- `zklp.ts` - ZKLP generation/verification
- `nullifier.ts` - Session management
- `index.ts` - Main exports

**Status**: ✅ Committed and pushed to GitHub

#### 2. POA Attendance v2 Repository
**Location**: `~/Git/POA-Proof-Of-Attandence/` (branch: `v2-aztec`)  
**GitHub**: https://github.com/cpte-org/POA-Proof-Of-Attandence/tree/v2-aztec

**What was removed** (old Ethereum codebase):
- ❌ `eth/attendance.sol` - Solidity contract
- ❌ `client/` - Web3 Node.js client
- ❌ `server/` - Express server with MetaMask
- ❌ `website/`, `db/`, `scripts/` - Empty placeholders

**What was added**:
- ✅ `contracts/` - Noir smart contracts using ZKLP
  - `Nargo.toml` - Uses `zklp_protocol` dependency
  - `main.nr` - `POAAttendance` contract
- ✅ `aztec-js/src/` - TypeScript SDK
  - `types.ts` - POA types (Organization, Unit, Employee, Role)
  - `poa.ts` - `POAClient`, `EmployeeClient`, `ManagerClient`
  - `index.ts` - Exports
- ✅ `smart-lock/` - Placeholder for lock integration
- ✅ `manager-dashboard/` - Placeholder for web dashboard
- ✅ `tests/` - Test structure

**POA Contract Features** (`contracts/main.nr`):
- Organization management (create, get)
- Unit/location management (register, update credentials)
- Employee management (register, update units, role hierarchy)
- Attendance operations (check_in, check_out, verify)
- Audit & payroll helpers

**Client Classes** (`aztec-js/src/poa.ts`):
- `POAClient` - Full contract interface
- `EmployeeClient` - Simplified employee operations
- `ManagerClient` - Admin/manager operations

**Status**: ✅ Committed and pushed to GitHub

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    POA v2 SYSTEM                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ZKLP Protocol (aztec-zklp-protocol)                │   │
│  │  ├── generate_zklp() / verify_zklp()                │   │
│  │  ├── Identity management                            │   │
│  │  └── Nullifier-based sessions                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ▲                                  │
│                          │ Uses                              │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  POA Attendance (poa-attendance)                    │   │
│  │  ├── Organization management                        │   │
│  │  ├── Unit (location) registry                       │   │
│  │  ├── Employee management                            │   │
│  │  ├── Check-in/out operations                        │   │
│  │  └── Manager dashboard (placeholder)                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **ZKLP Terminology**: Zero-Knowledge Location Proofs
   - `generate_zklp()` - Create proof
   - `verify_zklp()` - Verify proof

2. **Privacy Model**:
   - Smart lock: Sees only "authorized" (no identity)
   - Blockchain: Sees only nullifiers (no linkable data)
   - Manager: Can see full audit trail (employment contract = consent)

3. **Role Hierarchy**:
   - Owner → Admin → Manager → Staff

4. **Two Repos**:
   - `aztec-zklp-protocol` - Reusable foundation
   - `poa-attendance` - Application using foundation

---

## 📋 Next Steps (Phase 1-3)

### Phase 1: Core Implementation ⬅️ CURRENT
- [ ] Set up Aztec development environment
- [ ] Compile Noir contracts (both repos)
- [ ] Test contracts with Aztec sandbox
- [ ] Build out smart lock verifier
- [ ] Build manager dashboard

### Phase 2: Integration
- [ ] End-to-end testing
- [ ] Smart lock hardware integration
- [ ] Mobile app for employees

### Phase 3: Production
- [ ] Security audit
- [ ] Testnet deployment
- [ ] Documentation

---

## 🔧 MCP Servers Configuration

**Status**: ✅ Added Aztec and Noir MCP servers

**Config Location**: `/home/besudo/.kimi/mcp.json`

```json
{
  "mcpServers": {
    "aztec": {
      "command": "npx",
      "args": ["-y", "aztec-mcp-server@latest"]
    },
    "noir": {
      "command": "npx",
      "args": ["-y", "noir-mcp-server@latest"]
    }
  }
}
```

**To use in new session**: Just start `kimi` - MCP servers will auto-load.

---

## 📁 Key File Locations

### ZKLP Protocol
```
~/Git/aztec-zklp-protocol/
├── contracts/
│   ├── lib.nr
│   ├── types.nr
│   ├── identity.nr
│   ├── zklp_core.nr
│   ├── nullifiers.nr
│   └── disclosure.nr
├── aztec-js/src/
│   ├── index.ts
│   ├── types.ts
│   ├── identity.ts
│   ├── zklp.ts
│   └── nullifier.ts
├── Nargo.toml
└── README.md
```

### POA Attendance
```
~/Git/POA-Proof-Of-Attandence/ (branch: v2-aztec)
├── contracts/
│   ├── Nargo.toml
│   └── main.nr
├── aztec-js/src/
│   ├── index.ts
│   ├── types.ts
│   └── poa.ts
├── AZTEC_MIGRATION.md
└── Readme
```

---

## 🔗 Important URLs

- **ZKLP Protocol**: https://github.com/cpte-org/aztec-zklp-protocol
- **POA Attendance**: https://github.com/cpte-org/POA-Proof-Of-Attandence/tree/v2-aztec
- **Aztec Docs**: https://docs.aztec.network/developers/docs/aztec-nr
- **Noir Docs**: https://noir-lang.org/

---

## ⚠️ Known Issues / Notes

1. **Contract compilation**: Not yet tested - may need adjustments
2. **TypeScript SDK**: Uses placeholder implementations for some crypto functions
3. **Merkle proofs**: Simplified in current implementation
4. **Dependencies**: `zklp_protocol` in POA uses local path - may need to change to git dependency later

---

## 🚀 Immediate Next Actions

1. **Start new Kimi session** with MCP servers
2. **Compile ZKLP contracts**: `cd ~/Git/aztec-zklp-protocol && nargo build`
3. **Fix any compilation errors** using MCP server guidance
4. **Compile POA contracts**: `cd ~/Git/POA-Proof-Of-Attandence/contracts && nargo build`
5. **Set up Aztec sandbox** for testing

---

## 💡 Context for New Session

> "We are working on POA (Proof of Attendance) v2, a privacy-preserving attendance tracking system on Aztec Network. We've implemented the ZKLP (Zero-Knowledge Location Proofs) protocol foundation and the POA application contracts. Both are pushed to GitHub. We just added Aztec and Noir MCP servers to Kimi. Our next step is to compile and test the contracts using the MCP servers for guidance."

---

*End of Memory File*
