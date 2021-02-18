 pragma solidity ^0.6.0;

// Temporary fix #1
// Solution: One account memberOf multiple organizations
// Temporary fix #2
// Solution:

contract organization {
    
    // START EVENTS
    
    event orgCreatedEvent(address sender, bytes32 indexed _organizationId, bytes32 _organizationName, address _owner);
    event userManagedEvent(address sender, bool added, bytes32 _organizationId, uint8 _roleId, address _newMember);
    
    event locationManagedEvent(address sender, bool added, uint indexed locationId, bytes32 locationName, bytes32 _organizationId);
    
    event checkedInEvent(address sender, bytes32 _organizationId, uint locationId);
    event checkedOutEvent(address sender, bytes32 _organizationId, uint locationId);

    // END EVENTS
    
    struct Member {
        //roles
        bytes32 memberOfOrg;
        
        bool isRegistred;
        
        // to be replaced by hashing table?!
        bool owner;
        bool admin;
        bool manager; 
        bool staff; 
    }
    
    struct Organization {
        bytes32 id;
        bytes32 name;   // short name (up to 32 bytes)
        address owner;
    }
    
    struct Location {
        bytes32 id;
        bytes32 name;   // short name (up to 32 bytes)
        bytes32 memberOfOrg;
    }
    
    address public chairperson;
    
    // This declares a state variable that
    // stores a `Member` struct for each possible address.
    mapping(address => Member) public members;
    
    // A dynamically-sized array of `Organization` structs.
    Organization[] public organizations;
    
    /// Create a new ballot to choose one of `proposalNames`.
    constructor() public {
        chairperson = msg.sender;
    }
    
    // Randomness Generator
    
    function randomnessGenerator () internal view returns (bytes32 hash){
        //organization.name = owner.address + blockstamp
        return keccak256(abi.encodePacked(block.timestamp));
    }
    
    
    ////////////////////////////////
    //                            //
    // #1 Organization Management //
    //                            //
    ////////////////////////////////
    
    
    function createOrganization(bytes32 _orgName) public {
        // Temporary fix #1
        require(
            !members[msg.sender].owner && !members[msg.sender].admin && !members[msg.sender].manager && !members[msg.sender].staff,
            "Account role's already assigned!"
            );
        // End fix
        
        bytes32 O_UID = randomnessGenerator(); // organization unique id
        organizations.push(Organization({
                id: O_UID,
                name: _orgName,
                owner: msg.sender
            }));
        
        members[msg.sender].memberOfOrg = O_UID;
        members[msg.sender].isRegistred = true;
        members[msg.sender].owner = true;
        
        // Temporary fix #2
        emit orgCreatedEvent(msg.sender, O_UID, _orgName, msg.sender);
        // End fix
        
        //emit orgCreatedEvent(msg.sender, organizations[0].id, organizations[0].name, organizations[0].owner);
    }
    
    
    
    ///////////////////////////
    //                       //
    // #2 Members Management //
    //                       //
    ///////////////////////////

    //roleId
    // [0]: staff  [1]: manager  [2]: admin  [3]: owner 
    //remove=!add
    //[TO-DO] add OrganizationId and divisionId
    function manageMember(bool _add, bytes32 _orgId, uint8 _roleId, address _newMember) public {
        
        // Temporary fix #1
        require(
            !members[_newMember].owner && !members[_newMember].admin && !members[_newMember].manager && !members[_newMember].staff,
            "Account role's already assigned!"
            );
        // End fix
        
        require(
            members[msg.sender].memberOfOrg == _orgId,
            "Only members allowed."
            );
        if (_roleId==0){
            require(
            members[msg.sender].manager,
            "Only manager can add staff."
            );
            members[_newMember].staff = _add;
            members[_newMember].isRegistred = true;
        
        } else if (_roleId==1){
            require(
            members[msg.sender].admin,
            "Only admin can add manager."
            );
            members[_newMember].manager = _add;
            members[_newMember].isRegistred = true;
        } else if (_roleId==2){
            require(
            members[msg.sender].owner,
            "Only owner can add admin."
            );
            members[_newMember].admin = _add;
            members[_newMember].isRegistred = true;
        }
        
        emit userManagedEvent(msg.sender, _add, _orgId, _roleId, _newMember);
    }
    
    ////////////////////////////
    //                        //
    // #3 Location Management //
    //                        //
    ////////////////////////////
    
    // Add or remove locations
    
    function manageLocation(bool _add, uint _locId, bytes32 _locName, bytes32 _orgId) public {

        require(
            members[msg.sender].owner || members[msg.sender].admin,
            "Only members allowed."
            );
            
        //locId mapped to orgId?
        
        emit locationManagedEvent(msg.sender, _add, _locId, _locName, _orgId);
    }
    
    /////////////////
    //             //
    // #4 Check-In //
    //             //
    /////////////////
    
    // 
    
    function checkIn(bytes32 _orgId, uint _locId) public {

        require(
            members[msg.sender].isRegistred,
            "Only members allowed."
            );
            
        // orgId.locId exists?
        
        emit checkedInEvent(msg.sender, _orgId, _locId);
    }
    
    //////////////////
    //              //
    // #5 Check-Out //
    //              //
    //////////////////
    
    // 
    
    function checkOut(bytes32 _orgId, uint _locId) public {

        require(
            members[msg.sender].isRegistred,
            "Only members allowed."
            );
            
        // orgId.locId exists?
        // member is/already checked In?
        // 
        
        emit checkedOutEvent(msg.sender, _orgId, _locId);
    }
}


