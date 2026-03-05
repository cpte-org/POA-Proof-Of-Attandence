/**
 * POA Attendance System v2
 * Proof of Attendance using ZKLP Protocol
 */

// Re-export ZKLP types and functions
export {
  Identity,
  Credential,
  ZKLP,
  ZKLPType,
  Session,
  EncryptedZKLPRecord,
  MerkleProof,
  createIdentity,
  deriveCredential,
  generateZKLP,
  verifyZKLP,
  createSession,
  endSession,
  ZKLPProver,
} from '@poa/zklp-protocol';

// Export POA types
export {
  Role,
  Organization,
  Unit,
  Employee,
  AttendanceRecord,
  PayrollRecord,
  CreateOrganizationInput,
  RegisterUnitInput,
  RegisterEmployeeInput,
  CheckInInput,
  CheckOutInput,
  OrganizationCreatedEvent,
  UnitRegisteredEvent,
  EmployeeRegisteredEvent,
  CheckInEvent,
  CheckOutEvent,
  POAError,
  POAErrorCode,
} from './types';

// Export POA clients
export {
  POAClient,
  EmployeeClient,
  ManagerClient,
} from './poa';

// Version
export const POA_VERSION = '2.0.0';
