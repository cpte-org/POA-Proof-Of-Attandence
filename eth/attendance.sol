 pragma solidity ^0.6.0;

// Temporary fix #1
// Solution: One account memberOf multiple organizations


contract organization {
    
    // START EVENTS
    event createOrgEvent(bytes32 indexed _organizationId, bytes32 _organizationName, address _owner);
    
    
    // END EVENTS
    
    struct Member {
        //roles
        bytes32 memberOf;
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
    
    function randomIdGenerator () internal view returns (bytes32 hash){
        //organization.name = owner.address + blockstamp
        return keccak256(abi.encodePacked(block.timestamp));
    }
    
    function createOrganization(bytes32 _name) public {
        // Temporary fix #1
        require(
            !members[msg.sender].owner && !members[msg.sender].admin && !members[msg.sender].manager && !members[msg.sender].staff,
            "Account role's already assigned!"
            );
        // End fix
        
        bytes32 O_UID = randomIdGenerator(); // organization unique id
        organizations.push(Organization({
                id: O_UID,
                name: _name,
                owner: msg.sender
            }));
        
        members[msg.sender].memberOf = O_UID;
        members[msg.sender].owner = true;
        
        emit createOrgEvent(O_UID, _name, msg.sender);
    }
    
    //roleId
    // [0]: staff  [1]: manager  [2]: admin  [3]: owner 
    //remove=!add
    //[TO-DO] add OrganizationId and divisionId
    function manageMember(bool _add, bytes32 _OrganizationId, uint _roleId, address _newMember) public {
        
        // Temporary fix #1
        require(
            !members[_newMember].owner && !members[_newMember].admin && !members[_newMember].manager && !members[_newMember].staff,
            "Account role's already assigned!"
            );
        // End fix
        
        require(
            members[msg.sender].memberOf == _OrganizationId,
            "Only members allowed."
            );
        if (_roleId==0){
            require(
            members[msg.sender].manager,
            "Only manager can add staff."
            );
            members[_newMember].staff = _add;
        
        } else if (_roleId==1){
            require(
            members[msg.sender].admin,
            "Only admin can add manager."
            );
            members[_newMember].manager = _add;
        } else if (_roleId==2){
            require(
            members[msg.sender].owner,
            "Only owner can add admin."
            );
            members[_newMember].admin = _add;
        }
    }
    
    
}


