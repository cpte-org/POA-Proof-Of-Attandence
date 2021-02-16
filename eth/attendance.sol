 pragma solidity ^0.6.0;


contract organization {
    
    // START EVENTS
    event createOrgEvent(bytes32 indexed _organizationId, bytes32 _organizationName, address _owner);
    
    
    // END EVENTS
    
    struct Member {
        //roles
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
        bytes32 O_UID = randomIdGenerator(); // organization unique id
        organizations.push(Organization({
                id: O_UID,
                name: _name,
                owner: msg.sender
            }));
        
        members[msg.sender].owner = true;
        
        emit createOrgEvent(O_UID, _name, msg.sender);
    }
    
    //roleId
    // [0]: staff  [1]: manager  [2]: admin  [3]: owner 
    //remove=!add
    //[TO-DO] add OrganizationId and divisionId
    function manageMember(bool add, uint roleId, address newMember) public {

        if (roleId==0){
            require(
            members[msg.sender].manager,
            "Only manager can add staff."
            );
            members[newMember].staff = add;
        
        } else if (roleId==1){
            require(
            members[msg.sender].admin,
            "Only admin can add manager."
            );
            members[newMember].manager = add;
        } else if (roleId==2){
            require(
            members[msg.sender].owner,
            "Only owner can add admin."
            );
            members[newMember].admin = add;
        }
    }
    
    
}


