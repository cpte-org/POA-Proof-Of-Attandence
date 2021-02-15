var Web3 = require('web3');
const path = require('path');
const fs = require('fs');
require('dotenv').config()

//  Declarations
// Json Interfaces
const testnet = process.env.TESTNETADDR;
const mainnet = process.env.MAINNETADDR;
// Contract Address
const contract_address = process.env.CONTRACTADDR;
// Events' Identifications
const checkInEvent_Id = process.env.CHECKINEVENTID;
const checkOutEvent_Id = process.env.CHECKOUTEVENTID;
//  End of Declarations

//  Web3 and Contract Setup
var web3 = new Web3(new Web3.providers.HttpProvider(testnet));
const contract_abi = JSON.parse(fs.readFileSync('./contracts/attendance.json', 'utf8'));
const attendanceContract = new web3.eth.Contract(contract_abi, contract_address);
//  End Setup

// START
//query and store in database the on-chain data every $duration (cron job)
let START_BLOCK = 23483913;
let END_BLOCK = "latest";

let registred_users =["0xEDcA1016E61811E7FBEb0474B2cB374cE433C374"]; //array of registred users' accounts 

//experiment vars
let events;


async function eventQuery(){
    const contract_abi = JSON.parse(fs.readFileSync('./contracts/attendance.json', 'utf8'));
    const attendanceContract = new web3.eth.Contract(contract_abi, contract_address);
    let events;
    attendanceContract.getPastEvents(checkInEvent_Id,
    {
        filter: {_from: registred_users},                    
        fromBlock: START_BLOCK,     
        toBlock: END_BLOCK        
    })                       
    .then(events => 
        {
            events.forEach((event)=>{console.log(event.returnValues);})
        })
    .catch((err) => console.error(err));
}


eventQuery();