// POA Attendance - Types

use ::aztec::protocol::traits::{Serialize, Deserialize, Packable};

// ZKLP Type constants
pub global ZKLP_TYPE_ENTRY: Field = 1;
pub global ZKLP_TYPE_EXIT: Field = 2;

// Organization structure
#[derive(Serialize, Deserialize, Packable)]
pub struct Organization {
    pub org_id: Field,
    pub name: Field,
    pub owner: Field,
    pub active: bool,
    pub metadata_hash: Field,
}

// Unit (location) structure
#[derive(Serialize, Deserialize, Packable)]
pub struct Unit {
    pub unit_id: Field,
    pub org_id: Field,
    pub name: Field,
    pub location_hash: Field,
    pub credential_root: Field,
    pub active: bool,
}

// Employee structure
#[derive(Serialize, Deserialize, Packable)]
pub struct Employee {
    pub identity_hash: Field,
    pub org_id: Field,
    pub role: Field,
    pub active: bool,
    pub assigned_units: [Field; 10],
}

// ZKLP - Zero-Knowledge Location Proof
#[derive(Serialize, Deserialize, Packable)]
pub struct ZKLP {
    pub version: Field,
    pub nullifier: Field,
    pub commitment: Field,
    pub unit_id: Field,
    pub timestamp: Field,
    pub zklp_type: Field,
}

// Session - tracks active ZKLP sessions
#[derive(Serialize, Deserialize, Packable)]
pub struct Session {
    pub session_id: Field,
    pub nullifier: Field,
    pub unit_id: Field,
    pub entry_timestamp: Field,
    pub active: bool,
}
