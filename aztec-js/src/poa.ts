/**
 * POA Attendance System v2 - Main Client
 * Uses ZKLP Protocol for privacy-preserving attendance
 */

import { Fr, GrumpkinPoint } from '@aztec/aztec.js/fields';
import { PXE, AztecAddress, Contract, Wallet } from '@aztec/aztec.js';
import { 
  createIdentity,
  deriveCredential,
  generateZKLP,
  verifyZKLP,
  createSession,
  endSession,
  ZKLPProver,
  ZKLPType,
  Identity,
  Credential,
  ZKLP,
  Session,
} from '@poa/zklp-protocol';
import {
  Organization,
  Unit,
  Employee,
  Role,
  AttendanceRecord,
  CheckInInput,
  CheckOutInput,
  POAError,
  POAErrorCode,
} from './types';

/**
 * POA Contract ABI (simplified)
 * Full ABI would be generated from contract compilation
 */
const POA_ABI = [
  {
    name: 'create_organization',
    type: 'public',
    parameters: ['name', 'owner', 'metadata_hash'],
    returnType: 'Field',
  },
  {
    name: 'register_unit',
    type: 'public',
    parameters: ['org_id', 'name', 'location_hash', 'credential_root'],
    returnType: 'Field',
  },
  {
    name: 'register_employee',
    type: 'public',
    parameters: ['identity_hash', 'public_key', 'org_id', 'role', 'assigned_units'],
  },
  {
    name: 'check_in',
    type: 'private',
    parameters: ['master_secret', 'unit_id', 'merkle_proof', 'merkle_indices'],
    returnType: 'ZKLP',
  },
  {
    name: 'verify_check_in',
    type: 'public',
    parameters: ['zklp', 'viewing_key'],
    returnType: 'bool',
  },
  {
    name: 'check_out',
    type: 'private',
    parameters: ['master_secret', 'unit_id', 'entry_nullifier', 'merkle_proof', 'merkle_indices'],
    returnType: 'ZKLP',
  },
  {
    name: 'verify_check_out',
    type: 'public',
    parameters: ['zklp', 'entry_nullifier', 'viewing_key'],
    returnType: 'bool',
  },
  {
    name: 'get_active_session',
    type: 'public',
    parameters: ['nullifier'],
    returnType: 'Session',
  },
];

/**
 * POA Attendance Client
 * Main interface for employees and managers
 */
export class POAClient {
  private pxe: PXE;
  private wallet: Wallet;
  private contract: Contract;
  private zklpProver: ZKLPProver;
  
  // Local state
  private activeSessions: Map<string, Session> = new Map();
  
  constructor(pxe: PXE, wallet: Wallet, contractAddress: AztecAddress) {
    this.pxe = pxe;
    this.wallet = wallet;
    this.contract = new Contract(contractAddress, POA_ABI, wallet);
    this.zklpProver = new ZKLPProver(pxe);
  }
  
  ////////////////////////////////////////////////////////////////
  //                                                            //
  //              Organization Management (Admin)               //
  //                                                            //
  ////////////////////////////////////////////////////////////////
  
  /**
   * Create a new organization
   * Only callable by contract admin
   */
  async createOrganization(
    name: Fr,
    owner: AztecAddress,
    metadataHash: Fr
  ): Promise<Fr> {
    const tx = await this.contract.methods
      .create_organization(name, owner, metadataHash)
      .send()
      .wait();
    
    // Get org_id from event or return value
    const orgId = await this.contract.methods.next_org_id().view();
    return orgId.sub(new Fr(1)); // Return created org id
  }
  
  /**
   * Register a new unit (location)
   * Callable by org owner or admin
   */
  async registerUnit(
    orgId: Fr,
    name: Fr,
    locationHash: Fr,
    credentialRoot: Fr
  ): Promise<Fr> {
    const caller = this.wallet.getAddress();
    
    const tx = await this.contract.methods
      .register_unit(orgId, name, locationHash, credentialRoot, caller)
      .send()
      .wait();
    
    const unitId = await this.contract.methods.next_unit_id().view();
    return unitId.sub(new Fr(1));
  }
  
  /**
   * Update unit credentials when employees change
   */
  async updateUnitCredentials(
    unitId: Fr,
    newCredentialRoot: Fr
  ): Promise<void> {
    const caller = this.wallet.getAddress();
    
    await this.contract.methods
      .update_unit_credentials(unitId, newCredentialRoot, caller)
      .send()
      .wait();
  }
  
  /**
   * Get organization details
   */
  async getOrganization(orgId: Fr): Promise<Organization> {
    const org = await this.contract.methods.get_organization(orgId).view();
    return {
      orgId: org.org_id,
      name: org.name,
      owner: org.owner,
      active: org.active,
      metadataHash: org.metadata_hash,
    };
  }
  
  /**
   * Get unit details
   */
  async getUnit(unitId: Fr): Promise<Unit> {
    const unit = await this.contract.methods.get_unit(unitId).view();
    return {
      unitId: unit.unit_id,
      orgId: unit.org_id,
      name: unit.name,
      locationHash: unit.location_hash,
      credentialRoot: unit.credential_root,
      active: unit.active,
    };
  }
  
  ////////////////////////////////////////////////////////////////
  //                                                            //
  //              Employee Management                           //
  //                                                            //
  ////////////////////////////////////////////////////////////////
  
  /**
   * Register a new employee
   */
  async registerEmployee(
    identity: Identity,
    orgId: Fr,
    role: Role,
    assignedUnits: Fr[]
  ): Promise<void> {
    const caller = this.wallet.getAddress();
    const unitsArray = this.padArray(assignedUnits, 10, Fr.ZERO);
    
    await this.contract.methods
      .register_employee(
        identity.identityHash,
        identity.publicKey,
        orgId,
        role,
        unitsArray,
        caller
      )
      .send()
      .wait();
  }
  
  /**
   * Update employee unit assignments
   */
  async updateEmployeeUnits(
    identityHash: Fr,
    newAssignedUnits: Fr[]
  ): Promise<void> {
    const caller = this.wallet.getAddress();
    const unitsArray = this.padArray(newAssignedUnits, 10, Fr.ZERO);
    
    await this.contract.methods
      .update_employee_units(identityHash, unitsArray, caller)
      .send()
      .wait();
  }
  
  /**
   * Get employee details
   */
  async getEmployee(identityHash: Fr): Promise<Employee> {
    const emp = await this.contract.methods.get_employee(identityHash).view();
    return {
      identityHash: emp.identity_hash,
      orgId: emp.org_id,
      role: emp.role,
      active: emp.active,
      assignedUnits: emp.assigned_units.filter(u => !u.equals(Fr.ZERO)),
    };
  }
  
  ////////////////////////////////////////////////////////////////
  //                                                            //
  //              Attendance Operations                         //
  //                                                            //
  ////////////////////////////////////////////////////////////////
  
  /**
   * Check in to a unit
   * Employee operation - generates ZKLP
   */
  async checkIn(input: CheckInInput): Promise<{ zklp: ZKLP; session: Session }> {
    const { masterSecret, unitId, merkleProof } = input;
    
    // Get unit for credential root
    const unit = await this.getUnit(unitId);
    if (!unit.active) {
      throw new POAError(POAErrorCode.UNIT_NOT_ACTIVE, 'Unit not active');
    }
    
    // Generate entry ZKLP
    const { zklp, session } = await this.zklpProver.generateEntryZKLP(
      masterSecret,
      unitId,
      unit.credentialRoot,
      merkleProof
    );
    
    // Send private transaction
    await this.contract.methods
      .check_in(
        masterSecret,
        unitId,
        merkleProof.path,
        merkleProof.indices
      )
      .send()
      .wait();
    
    // Store locally
    this.activeSessions.set(zklp.nullifier.toString(), session);
    
    return { zklp, session };
  }
  
  /**
   * Verify check in (smart lock operation)
   */
  async verifyCheckIn(zklp: ZKLP, viewingKey: GrumpkinPoint): Promise<boolean> {
    const valid = await this.contract.methods
      .verify_check_in(zklp, viewingKey)
      .send()
      .wait();
    
    if (valid) {
      this.zklpProver.markSpent(zklp.nullifier);
    }
    
    return valid;
  }
  
  /**
   * Check out from a unit
   * Employee operation - generates exit ZKLP
   */
  async checkOut(input: CheckOutInput): Promise<{ zklp: ZKLP; session: Session }> {
    const { masterSecret, unitId, entryNullifier, merkleProof } = input;
    
    // Get active session
    const entrySession = this.activeSessions.get(entryNullifier.toString());
    if (!entrySession) {
      throw new POAError(POAErrorCode.SESSION_NOT_ACTIVE, 'No active session');
    }
    
    // Get unit
    const unit = await this.getUnit(unitId);
    
    // Generate exit ZKLP
    const { zklp, session } = await this.zklpProver.generateExitZKLP(
      masterSecret,
      unitId,
      unit.credentialRoot,
      merkleProof,
      entrySession
    );
    
    // Send private transaction
    await this.contract.methods
      .check_out(
        masterSecret,
        unitId,
        entryNullifier,
        merkleProof.path,
        merkleProof.indices
      )
      .send()
      .wait();
    
    // Update local state
    this.activeSessions.delete(entryNullifier.toString());
    
    return { zklp, session };
  }
  
  /**
   * Verify check out
   */
  async verifyCheckOut(
    zklp: ZKLP,
    entryNullifier: Fr,
    viewingKey: GrumpkinPoint
  ): Promise<boolean> {
    const valid = await this.contract.methods
      .verify_check_out(zklp, entryNullifier, viewingKey)
      .send()
      .wait();
    
    if (valid) {
      this.zklpProver.markSpent(zklp.nullifier);
    }
    
    return valid;
  }
  
  /**
   * Get active session for nullifier
   */
  async getActiveSession(nullifier: Fr): Promise<Session | null> {
    // Check local first
    const local = this.activeSessions.get(nullifier.toString());
    if (local) return local;
    
    // Check contract
    const session = await this.contract.methods.get_active_session(nullifier).view();
    if (session.active) {
      return session;
    }
    
    return null;
  }
  
  /**
   * Check if currently checked in
   */
  isCheckedIn(entryNullifier: Fr): boolean {
    return this.activeSessions.has(entryNullifier.toString());
  }
  
  /**
   * Get all active sessions
   */
  getAllActiveSessions(): Session[] {
    return Array.from(this.activeSessions.values());
  }
  
  ////////////////////////////////////////////////////////////////
  //                                                            //
  //              Audit & Payroll                               //
  //                                                            //
  ////////////////////////////////////////////////////////////////
  
  /**
   * Get audit count for employee
   */
  async getEmployeeAuditCount(identityHash: Fr): Promise<Fr> {
    return await this.contract.methods.get_employee_audit_count(identityHash).view();
  }
  
  /**
   * Get audit count for unit
   */
  async getUnitAuditCount(unitId: Fr): Promise<Fr> {
    return await this.contract.methods.get_unit_audit_count(unitId).view();
  }
  
  ////////////////////////////////////////////////////////////////
  //                                                            //
  //              Helper Functions                              //
  //                                                            //
  ////////////////////////////////////////////////////////////////
  
  private padArray<T>(arr: T[], length: number, fill: T): T[] {
    const result = [...arr];
    while (result.length < length) {
      result.push(fill);
    }
    return result.slice(0, length);
  }
}

/**
 * Employee Client
 * Simplified interface for employee operations
 */
export class EmployeeClient {
  private poaClient: POAClient;
  private identity: Identity;
  private credentials: Map<string, Credential> = new Map();
  
  constructor(poaClient: POAClient, masterSecret: Fr) {
    this.poaClient = poaClient;
    this.identity = createIdentity(masterSecret);
  }
  
  /**
   * Get identity hash
   */
  getIdentityHash(): Fr {
    return this.identity.identityHash;
  }
  
  /**
   * Derive credential for a unit
   */
  deriveCredential(unitId: Fr): Credential {
    const key = unitId.toString();
    let cred = this.credentials.get(key);
    if (!cred) {
      cred = deriveCredential(this.identity, unitId);
      this.credentials.set(key, cred);
    }
    return cred;
  }
  
  /**
   * Check in to a unit
   */
  async checkIn(unitId: Fr, merkleProof: any): Promise<{ zklp: ZKLP; session: Session }> {
    return this.poaClient.checkIn({
      masterSecret: this.identity.masterSecret,
      unitId,
      merkleProof,
    });
  }
  
  /**
   * Check out from a unit
   */
  async checkOut(
    unitId: Fr,
    entryNullifier: Fr,
    merkleProof: any
  ): Promise<{ zklp: ZKLP; session: Session }> {
    return this.poaClient.checkOut({
      masterSecret: this.identity.masterSecret,
      unitId,
      entryNullifier,
      merkleProof,
    });
  }
}

/**
 * Manager Client
 * Interface for manager/admin operations
 */
export class ManagerClient {
  private poaClient: POAClient;
  private viewingKey: GrumpkinPoint;
  
  constructor(poaClient: POAClient, viewingKey: GrumpkinPoint) {
    this.poaClient = poaClient;
    this.viewingKey = viewingKey;
  }
  
  /**
   * Create organization
   */
  async createOrganization(
    name: Fr,
    owner: AztecAddress,
    metadataHash: Fr
  ): Promise<Fr> {
    return this.poaClient.createOrganization(name, owner, metadataHash);
  }
  
  /**
   * Register unit
   */
  async registerUnit(
    orgId: Fr,
    name: Fr,
    locationHash: Fr,
    credentialRoot: Fr
  ): Promise<Fr> {
    return this.poaClient.registerUnit(orgId, name, locationHash, credentialRoot);
  }
  
  /**
   * Register employee
   */
  async registerEmployee(
    identity: Identity,
    orgId: Fr,
    role: Role,
    assignedUnits: Fr[]
  ): Promise<void> {
    return this.poaClient.registerEmployee(identity, orgId, role, assignedUnits);
  }
  
  /**
   * Verify check in (for smart lock integration)
   */
  async verifyCheckIn(zklp: ZKLP): Promise<boolean> {
    return this.poaClient.verifyCheckIn(zklp, this.viewingKey);
  }
  
  /**
   * Verify check out
   */
  async verifyCheckOut(zklp: ZKLP, entryNullifier: Fr): Promise<boolean> {
    return this.poaClient.verifyCheckOut(zklp, entryNullifier, this.viewingKey);
  }
  
  /**
   * Get audit counts
   */
  async getAuditCounts(identityHash: Fr, unitId: Fr): Promise<{ employee: Fr; unit: Fr }> {
    const [employee, unit] = await Promise.all([
      this.poaClient.getEmployeeAuditCount(identityHash),
      this.poaClient.getUnitAuditCount(unitId),
    ]);
    return { employee, unit };
  }
}
