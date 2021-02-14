 pragma solidity ^0.6.0;


contract attendance {
    string public name = "attendance protocol";
    address public owner;

    address public employee;
    uint256 public organizationId;
    uint256 public locationId;
    
    //uint sum;
    

    constructor() public {
        owner = msg.sender;
    }


    function admin() public onlyOwner {
        //admin area
    }


    function signCheckIn(uint _organizationId, uint _locationId) public returns (bool o_checkedIn){
        employee=msg.sender;

        if (_organizationId != 0 && _locationId != 0) {
            organizationId=_organizationId;
            locationId=_locationId;
            o_checkedIn=true;
        }
        else
            o_checkedIn=false;
        return o_checkedIn;
    }

    
    
    

    function signCheckOut() public pure returns (bool o_checkedOut) {
        //if already checked-in, then check-out. else return "not checked-in" error
        //employee=msg.sender;
        if (true)
            o_checkedOut=true;
        return o_checkedOut;
    }

    
    modifier onlyOwner(){
        require(msg.sender == owner);
        _;
    }
    
/*
    modifier onlyEmployee(){
        //only "employee" badge owner
        require(msg.sender == employee);
        _;
    }
*/
}