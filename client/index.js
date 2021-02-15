var Web3 = require('web3');
const path = require('path');
const fs = require('fs');
require('dotenv').config()

const testnet = process.env.TESTNETADDR;
const mainnet = process.env.MAINNETADDR;
const contract_address = process.env.CONTRACTADDR;
const walletAddress = process.env.WALLETADDR;
const privateKey = process.env.PRIVATEKEY;

// Contract parameters
let organizationId = "1"; // Set durring setup, can be changer in settings
let locationId = "31605"; // Retreived from scanned QR code

let gasPrice= "20000000000";

var web3 = new Web3(new 
Web3.providers.HttpProvider(testnet));

let contract_abi = JSON.parse(fs.readFileSync('./contracts/attendance.json', 'utf8'));

web3.eth.getBalance(walletAddress).then(bal => { console.log(" [Notice!] Wallet balance: ",bal); });


var attendanceContract = new web3.eth.Contract(contract_abi, contract_address);

async function send(web3, privateKey, gasPrice, contract) {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey).address;
    const transaction = contract.methods.signCheckIn(organizationId,locationId);
    const options = {
        to      : transaction._parent._address,
        data    : transaction.encodeABI(),
        gas     : await transaction.estimateGas({from: account}),
        gasPrice: gasPrice
    };
    const signed  = await web3.eth.accounts.signTransaction(options, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
    return receipt;
}

send(web3, privateKey, gasPrice, attendanceContract).then((receipt)=>{console.log(receipt);});
