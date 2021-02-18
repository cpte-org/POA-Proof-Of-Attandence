pragma solidity >=0.4.11 <0.7.0;

contract CrowdFunding {
    // Defines a new type with two fields.
    struct Funder {
        address addr;
        uint amount;
    }

    struct Campaign {
        address payable beneficiary;
        uint fundingGoal;
        uint numFunders;
        uint amount;
        mapping (uint => Funder) funders;
    }

    uint numCampaigns;
    mapping (uint => Campaign) campaigns;

    function newCampaign(address payable beneficiary, uint goal) public returns (uint campaignID) {
        campaignID = numCampaigns++; // campaignID is return variable
        campaigns[campaignID] = Campaign(beneficiary, goal, 0, 0);
    }
    
    //function getCampaign()
    
    function contribute(uint campaignID) public payable {
        Campaign storage c = campaigns[campaignID];

        c.funders[c.numFunders++] = Funder({addr: msg.sender, amount: msg.value});
        c.amount += msg.value;
    }
    
    function checkCampaignFunders(uint campaignID, uint funderId) public returns (address funderAdd/*, uint amountFunded*/) {
        //Campaign storage c = campaigns[campaignID];
        address temp = 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4;
        return campaigns[campaignID].funders[funderId].addr;
    }
    
} 
