 pragma solidity ^0.6.0;

// Note: 
// - uint overflow: matesafe https://ethereumdev.io/safemath-protect-overflows/
// - zkSnarks for zero knowledge orgId privacy
// 
// Temporary fix #1
// Solution: One account memberOf multiple organizations
// Temporary fix #2
// Solution:
// Temporary fix #3: _orgId replaced by the org's index in array [privacy and scalling limitation!]
// Solution: get org object by _orgId instead of index
// Location ids use a counter; organization ids include the array index.
// 
// 

contract attendance {
    
    // START EVENTS
    
    event orgCreatedEvent(address sender, bytes32 indexed _organizationId, bytes32 _organizationName, address _owner);
    
    //TO-DO?
    //event orgRemovedEvent(address sender, bytes32 indexed _organizationId, bytes32 _organizationName, address _owner);
    
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
        uint numLocations;
        mapping (uint => Location) locations;
    }
    
    struct Location {
        uint256 id;
        bytes32 name;   // short name (up to 32 bytes)
        bytes32 memberOfOrg;
    }
    
    address public chairperson;
    
    // This declares a state variable that
    // stores a `Member` struct for each possible address.
    mapping(address => Member) public members;
    
    // A dynamically-sized array of `Organization` structs.
    Organization[] public organizations;

    // Location ownership and current attendance (0 means checked-out).
    mapping(uint => bytes32) private locationOrganizations;
    mapping(address => uint) private checkedInLocations;
    uint256 private numLocations;
    
    /// Create a new ballot to choose one of `proposalNames`.
    constructor() public {
        chairperson = msg.sender;
    }
    
    // Unique Id Generators (not random)
    
    function randomnessGenerator () internal view returns (bytes32 hash){
        return keccak256(abi.encodePacked(address(this), organizations.length));
    }
    
    function uint256randomnessGenerator () internal returns (uint256 hash){
        require(numLocations < uint256(-1), "Location ids exhausted.");
        return ++numLocations;
    }
    
    ////////////////////////////////
    //                            //
    // #1 Organization Management //
    //                            //
    ////////////////////////////////
    
    
    function manageOrganization(bytes32 _orgName, uint256 _numLocations) public {
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
                owner: msg.sender,
                // _numLocations kept for compatibility; no locations exist yet.
                numLocations: 0
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

        require(_roleId < 3, "Invalid role.");
        require(_newMember != address(0), "Invalid member address.");
        
        // Temporary fix #1
        if (_add){
            require(
                !members[_newMember].isRegistred,
                "Account role's already assigned!"
                );
        } else {
            require(
                members[_newMember].isRegistred && members[_newMember].memberOfOrg == _orgId,
                "Member not in organization."
                );
            require(
                (_roleId==0 && members[_newMember].staff) ||
                (_roleId==1 && members[_newMember].manager) ||
                (_roleId==2 && members[_newMember].admin),
                "Member role does not match."
                );
        }
        // End fix
        
        require(
            members[msg.sender].isRegistred && members[msg.sender].memberOfOrg == _orgId,
            "Only members allowed."
            );
            
        // added to Organization
        members[_newMember].memberOfOrg = _orgId;
        
        if (_roleId==0){
            require(
            members[msg.sender].owner || members[msg.sender].admin || members[msg.sender].manager,
            "Only manager or above can manage staff."
            );
            members[_newMember].staff = _add;
        
        } else if (_roleId==1){
            require(
            members[msg.sender].owner || members[msg.sender].admin,
            "Only admin or above can manage manager."
            );
            members[_newMember].manager = _add;
        } else if (_roleId==2){
            require(
            members[msg.sender].owner,
            "Only owner can manage admin."
            );
            members[_newMember].admin = _add;
        }

        members[_newMember].isRegistred = _add;
        if (!_add){
            delete members[_newMember];
            delete checkedInLocations[_newMember];
        }
        
        emit userManagedEvent(msg.sender, _add, _orgId, _roleId, _newMember);
    }
    
    ////////////////////////////
    //                        //
    // #3 Location Management //
    //                        //
    ////////////////////////////
    
    // Add or remove locations
    
    // Temporary fix #3
    // Temporary fix #4
    // Currenty supports addLocation only
    function manageLocation(bool _add/*, uint256 _locId*/, bytes32 _locName, uint256 _organizationArrayIndex, bytes32 _orgId) public /* returns (uint256 _locationName)*/{

        require(_add, "Location removal not supported.");
        
        // Note: require owner is for testing purposes (maybe Temporary)
        // Reason: separate responsablities.. smt legal matter like this.. Cring bru
        require(
            members[msg.sender].owner || members[msg.sender].admin,
            "Only members allowed."
            );
        
        uint256 _locId = uint256randomnessGenerator();
        
        Organization storage o = organizations[_organizationArrayIndex];

        require(
            members[msg.sender].isRegistred && members[msg.sender].memberOfOrg == _orgId && o.id == _orgId,
            "Organization does not match."
            );

        o.locations[o.numLocations++] = Location({id: _locId, name: _locName, memberOfOrg: _orgId});
        locationOrganizations[_locId] = _orgId;
        
        //return organizations[_organizationArrayIndex].locations[--o.numLocations].id;

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
            members[msg.sender].isRegistred && members[msg.sender].memberOfOrg == _orgId,
            "Only members allowed."
            );
        
        
        require(_locId != 0 && locationOrganizations[_locId] == _orgId, "Location not in organization.");
        require(checkedInLocations[msg.sender] == 0, "Already checked-in.");
        checkedInLocations[msg.sender] = _locId;
        
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
            members[msg.sender].isRegistred && members[msg.sender].memberOfOrg == _orgId,
            "Only members allowed."
            );
        require(_locId != 0 && locationOrganizations[_locId] == _orgId, "Location not in organization.");
        require(checkedInLocations[msg.sender] == _locId, "Not checked-in at this location.");
        delete checkedInLocations[msg.sender];
        
        emit checkedOutEvent(msg.sender, _orgId, _locId);
    }
}


