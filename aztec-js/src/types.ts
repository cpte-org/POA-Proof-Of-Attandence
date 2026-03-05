/**
 * POA Attendance System v2 - Types
 */

import { Fr, GrumpkinPoint } from '@aztec/aztec.js/fields';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { 
  Identity, 
  Credential, 
  ZKLP, 
  ZKLPType, 
  Session,
  EncryptedZKLPRecord,
  MerkleProof,
} from '@poa/zklp-protocol';

// Re-export ZKLP types
export {
  Identity,
  Credential,
  ZKLP,
  ZKLPType,
  Session,
  EncryptedZKLPRecord,
  MerkleProof,
};

// POA-specific types

export enum Role {
  Owner = 0,
  Admin = 1,
  Manager = 2,
  Staff = 3,
}

export interface Organization {
  orgId: Fr;
  name: Fr;
  owner: AztecAddress;
  active: boolean;
  metadataHash: Fr;
}

export interface Unit {
  unitId: Fr;
  orgId: Fr;
  name: Fr;
  locationHash: Fr;
  credentialRoot: Fr;
  active: boolean;
}

export interface Employee {
  identityHash: Fr;
  orgId: Fr;
  role: Role;
  active: boolean;
  assignedUnits: Fr[];
}

export interface AttendanceRecord {
  identityHash: Fr;
  unitId: Fr;
  entryZKLP: ZKLP;
  exitZKLP?: ZKLP;
  entryTime: Fr;
  exitTime?: Fr;
  duration?: Fr;
}

export interface PayrollRecord {
  identityHash: Fr;
  orgId: Fr;
  periodStart: Fr;
  periodEnd: Fr;
  totalHours: Fr;
  unitHours: Map<string, Fr>;
  records: AttendanceRecord[];
}

// API Inputs

export interface CreateOrganizationInput {
  name: Fr;
  owner: AztecAddress;
  metadataHash: Fr;
}

export interface RegisterUnitInput {
  orgId: Fr;
  name: Fr;
  locationHash: Fr;
  credentialRoot: Fr;
}

export interface RegisterEmployeeInput {
  identity: Identity;
  orgId: Fr;
  role: Role;
  assignedUnits: Fr[];
}

export interface CheckInInput {
  masterSecret: Fr;
  unitId: Fr;
  merkleProof: MerkleProof;
}

export interface CheckOutInput {
  masterSecret: Fr;
  unitId: Fr;
  entryNullifier: Fr;
  merkleProof: MerkleProof;
}

// Events

export interface OrganizationCreatedEvent {
  orgId: Fr;
  name: Fr;
  owner: AztecAddress;
}

export interface UnitRegisteredEvent {
  unitId: Fr;
  orgId: Fr;
  name: Fr;
}

export interface EmployeeRegisteredEvent {
  identityHash: Fr;
  orgId: Fr;
  role: Role;
}

export interface CheckInEvent {
  nullifier: Fr;
  unitId: Fr;
  timestamp: Fr;
}

export interface CheckOutEvent {
  nullifier: Fr;
  unitId: Fr;
  timestamp: Fr;
  duration: Fr;
}

// Error types

export enum POAErrorCode {
  ORG_NOT_FOUND = 2001,
  ORG_NOT_ACTIVE = 2002,
  UNIT_NOT_FOUND = 2003,
  UNIT_NOT_ACTIVE = 2004,
  EMPLOYEE_NOT_FOUND = 2005,
  EMPLOYEE_NOT_ACTIVE = 2006,
  NOT_AUTHORIZED = 2007,
  INVALID_ROLE = 2008,
  SESSION_ACTIVE = 2009,
  SESSION_NOT_ACTIVE = 2010,
}

export class POAError extends Error {
  constructor(
    public code: POAErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'POAError';
  }
}
