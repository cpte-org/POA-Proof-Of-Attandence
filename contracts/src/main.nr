// POA Attendance System v2 - Aztec Contract

use ::aztec::macros::aztec;

mod types;

#[aztec]
pub contract POAAttendance {
    use ::aztec::{
        macros::{functions::{external, initializer}, storage::storage},
        oracle::logging::debug_log_format,
    };
    use ::aztec::protocol::{address::AztecAddress, traits::{Serialize, Deserialize, Packable}};
    use ::aztec::state_vars::{Map, PublicMutable};

    use crate::types::{Organization, Unit, Employee, ZKLP, Session};

    // Role constants
    global ROLE_OWNER: Field = 0;
    global ROLE_ADMIN: Field = 1;
    global ROLE_MANAGER: Field = 2;
    global ROLE_STAFF: Field = 3;

    #[storage]
    struct Storage<Context> {
        admin: PublicMutable<AztecAddress, Context>,
        next_org_id: PublicMutable<Field, Context>,
        next_unit_id: PublicMutable<Field, Context>,
        organizations: Map<Field, PublicMutable<Organization, Context>, Context>,
        units: Map<Field, PublicMutable<Unit, Context>, Context>,
        employees: Map<Field, PublicMutable<Employee, Context>, Context>,
        active_sessions: Map<Field, PublicMutable<Session, Context>, Context>,
    }

    #[external("public")]
    #[initializer]
    fn constructor(admin: AztecAddress) {
        self.storage.admin.write(admin);
        self.storage.next_org_id.write(1);
        self.storage.next_unit_id.write(1);
    }

    #[external("public")]
    fn create_organization(name: Field, owner: Field) {
        let caller = self.context.maybe_msg_sender().unwrap();
        let admin = self.storage.admin.read();
        assert(caller.eq(admin), "Only admin");
        
        let org_id = self.storage.next_org_id.read();
        self.storage.next_org_id.write(org_id + 1);
        
        let org = Organization {
            org_id,
            name,
            owner,
            active: true,
            metadata_hash: 0,
        };
        
        self.storage.organizations.at(org_id).write(org);
    }

    #[external("public")]
    fn get_organization(org_id: Field) -> pub Organization {
        self.storage.organizations.at(org_id).read()
    }

    #[external("public")]
    fn register_unit(org_id: Field, name: Field, location_hash: Field, credential_root: Field) {
        let unit_id = self.storage.next_unit_id.read();
        self.storage.next_unit_id.write(unit_id + 1);
        
        let unit = Unit {
            unit_id,
            org_id,
            name,
            location_hash,
            credential_root,
            active: true,
        };
        
        self.storage.units.at(unit_id).write(unit);
    }

    #[external("public")]
    fn get_unit(unit_id: Field) -> pub Unit {
        self.storage.units.at(unit_id).read()
    }

    #[external("public")]
    fn register_employee(identity_hash: Field, org_id: Field, role: Field, assigned_units: [Field; 10]) {
        let employee = Employee {
            identity_hash,
            org_id,
            role,
            active: true,
            assigned_units,
        };
        
        self.storage.employees.at(identity_hash).write(employee);
    }

    #[external("public")]
    fn get_employee(identity_hash: Field) -> pub Employee {
        self.storage.employees.at(identity_hash).read()
    }
}
