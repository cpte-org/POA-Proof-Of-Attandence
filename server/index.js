"use strict";
// 
// [To-Do] Check networkId, if (!infuraProvidedNetwork): throw error


 // Unpkg imports
const Web3Modal = window.Web3Modal.default;
const evmChains = window.evmChains;

// Web3modal instance
let web3Modal

// Chosen wallet provider given by the dialog window
let provider;

// Address of the selected account
let selectedAccount;

/**
 * Setup the orchestra
 */
function init() {

  console.log("Initializing app");
  //console.log("window.web3 is", window.web3, "window.ethereum is", window.ethereum);
  //console.log("provide is", provider);
  // Check that the web page is run in a secure context,
  // as otherwise MetaMask won't be available
  /*
  if(location.protocol !== 'https:') {
    const alert = document.querySelector("#alert-error-https");
    alert.style.display = "block";
    document.querySelector("#btn-connect").setAttribute("disabled", "disabled")
    return;
  }
  */
 
  web3Modal = new Web3Modal({
    cacheProvider: false, // optional
    disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
  });

  //console.log("Web3Modal instance is", web3Modal);
}


/**
 * Kick in the UI action after Web3modal dialog has chosen a provider
 */
async function fetchAccountData() {

  // Get a Web3 instance for the wallet
  let web3 = new Web3(provider);

  //console.log("Web3 instance is", web3);

  // Get connected chain id from Ethereum node
  const chainId = await web3.eth.getChainId();
  // Load chain information over an HTTP API
  const chainData = evmChains.getChain(chainId);
  document.querySelector("#network-name").textContent = chainData.name;

  // Get list of accounts of the connected wallet
  const accounts = await web3.eth.getAccounts();

  // MetaMask does not give you all accounts, only the selected account
  console.log("Got accounts", accounts);
  selectedAccount = accounts[0];

  document.querySelector("#selected-account").textContent = selectedAccount;

  // Get a handl
  const template = document.querySelector("#template-balance");
  const accountContainer = document.querySelector("#accounts");

  // Purge UI elements any previously loaded accounts
  accountContainer.innerHTML = '';

  // Go through all accounts and get their ETH balance
  const rowResolvers = accounts.map(async (address) => {
    const balance = await web3.eth.getBalance(address);
    // ethBalance is a BigNumber instance
    // https://github.com/indutny/bn.js/
    const ethBalance = web3.utils.fromWei(balance, "ether");
    const humanFriendlyBalance = parseFloat(ethBalance).toFixed(4);
    // Fill in the templated row and put in the document
    const clone = template.content.cloneNode(true);
    clone.querySelector(".address").textContent = address;
    clone.querySelector(".balance").textContent = humanFriendlyBalance;
    accountContainer.appendChild(clone);
  });

  // Because rendering account does its own RPC commucation
  // with Ethereum node, we do not want to display any results
  // until data for all accounts is loaded
  await Promise.all(rowResolvers);

  // Display fully loaded UI for wallet data
  document.querySelector("#prepare").style.display = "none";
  document.querySelector("#connected").style.display = "block";
}



/**
 * Fetch account data for UI when
 * - User switches accounts in wallet
 * - User switches networks in wallet
 * - User connects wallet initially
 */
async function refreshAccountData() {

  // If any current data is displayed when
  // the user is switching acounts in the wallet
  // immediate hide this data
  document.querySelector("#connected").style.display = "none";
  document.querySelector("#prepare").style.display = "block";

  // Disable button while UI is loading.
  // fetchAccountData() will take a while as it communicates
  // with Ethereum node via JSON-RPC and loads chain data
  // over an API call.
  document.querySelector("#btn-connect").setAttribute("disabled", "disabled")
  await fetchAccountData(provider);
  document.querySelector("#btn-connect").removeAttribute("disabled")
}


/**
 * Connect wallet button pressed.
 */
async function onConnect() {

  console.log("Opening a dialog", web3Modal);
  try {
    provider = await web3Modal.connect();
  } catch(e) {
    console.log("Could not get a wallet connection", e);
    return;
  }

  // Subscribe to accounts change
  provider.on("accountsChanged", (accounts) => {
    fetchAccountData();
  });

  // Subscribe to chainId change
  provider.on("chainChanged", (chainId) => {
    fetchAccountData();
  });

  // Subscribe to networkId change
  provider.on("networkChanged", (networkId) => {
    fetchAccountData();
  });

  await refreshAccountData();
}

/**
 * Disconnect wallet button pressed.
 */
async function onDisconnect() {

  console.log("Killing the wallet connection", provider);

  // TODO: Which providers have close method?
  if(provider.close) {
    await provider.close();

    // If the cached provider is not cleared,
    // WalletConnect will default to the existing session
    // and does not allow to re-scan the QR code with a new wallet.
    // Depending on your use case you may want or want not his behavir.
    await web3Modal.clearCachedProvider();
    provider = null;
  }

  selectedAccount = null;

  // Set the UI back to the initial state
  document.querySelector("#prepare").style.display = "block";
  document.querySelector("#connected").style.display = "none";
}

// TESTING ZONE !


async function getAllEvents () {
  const contractAddress = "0x0bd8200f8e0e5ed90d2d683bfe724c25c9b52385";
  const abi = [
		{
			"inputs": [],
			"stateMutability": "nonpayable",
			"type": "constructor"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"internalType": "address",
					"name": "sender",
					"type": "address"
				},
				{
					"indexed": false,
					"internalType": "bytes32",
					"name": "_organizationId",
					"type": "bytes32"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "locationId",
					"type": "uint256"
				}
			],
			"name": "checkedInEvent",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"internalType": "address",
					"name": "sender",
					"type": "address"
				},
				{
					"indexed": false,
					"internalType": "bytes32",
					"name": "_organizationId",
					"type": "bytes32"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "locationId",
					"type": "uint256"
				}
			],
			"name": "checkedOutEvent",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"internalType": "address",
					"name": "sender",
					"type": "address"
				},
				{
					"indexed": false,
					"internalType": "bool",
					"name": "added",
					"type": "bool"
				},
				{
					"indexed": true,
					"internalType": "uint256",
					"name": "locationId",
					"type": "uint256"
				},
				{
					"indexed": false,
					"internalType": "bytes32",
					"name": "locationName",
					"type": "bytes32"
				},
				{
					"indexed": false,
					"internalType": "bytes32",
					"name": "_organizationId",
					"type": "bytes32"
				}
			],
			"name": "locationManagedEvent",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"internalType": "address",
					"name": "sender",
					"type": "address"
				},
				{
					"indexed": true,
					"internalType": "bytes32",
					"name": "_organizationId",
					"type": "bytes32"
				},
				{
					"indexed": false,
					"internalType": "bytes32",
					"name": "_organizationName",
					"type": "bytes32"
				},
				{
					"indexed": false,
					"internalType": "address",
					"name": "_owner",
					"type": "address"
				}
			],
			"name": "orgCreatedEvent",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"internalType": "address",
					"name": "sender",
					"type": "address"
				},
				{
					"indexed": false,
					"internalType": "bool",
					"name": "added",
					"type": "bool"
				},
				{
					"indexed": false,
					"internalType": "bytes32",
					"name": "_organizationId",
					"type": "bytes32"
				},
				{
					"indexed": false,
					"internalType": "uint8",
					"name": "_roleId",
					"type": "uint8"
				},
				{
					"indexed": false,
					"internalType": "address",
					"name": "_newMember",
					"type": "address"
				}
			],
			"name": "userManagedEvent",
			"type": "event"
		},
		{
			"inputs": [],
			"name": "chairperson",
			"outputs": [
				{
					"internalType": "address",
					"name": "",
					"type": "address"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "bytes32",
					"name": "_orgId",
					"type": "bytes32"
				},
				{
					"internalType": "uint256",
					"name": "_locId",
					"type": "uint256"
				}
			],
			"name": "checkIn",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "bytes32",
					"name": "_orgId",
					"type": "bytes32"
				},
				{
					"internalType": "uint256",
					"name": "_locId",
					"type": "uint256"
				}
			],
			"name": "checkOut",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "bool",
					"name": "_add",
					"type": "bool"
				},
				{
					"internalType": "bytes32",
					"name": "_locName",
					"type": "bytes32"
				},
				{
					"internalType": "uint256",
					"name": "_organizationArrayIndex",
					"type": "uint256"
				},
				{
					"internalType": "bytes32",
					"name": "_orgId",
					"type": "bytes32"
				}
			],
			"name": "manageLocation",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "bool",
					"name": "_add",
					"type": "bool"
				},
				{
					"internalType": "bytes32",
					"name": "_orgId",
					"type": "bytes32"
				},
				{
					"internalType": "uint8",
					"name": "_roleId",
					"type": "uint8"
				},
				{
					"internalType": "address",
					"name": "_newMember",
					"type": "address"
				}
			],
			"name": "manageMember",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "bytes32",
					"name": "_orgName",
					"type": "bytes32"
				},
				{
					"internalType": "uint256",
					"name": "_numLocations",
					"type": "uint256"
				}
			],
			"name": "manageOrganization",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "",
					"type": "address"
				}
			],
			"name": "members",
			"outputs": [
				{
					"internalType": "bytes32",
					"name": "memberOfOrg",
					"type": "bytes32"
				},
				{
					"internalType": "bool",
					"name": "isRegistred",
					"type": "bool"
				},
				{
					"internalType": "bool",
					"name": "owner",
					"type": "bool"
				},
				{
					"internalType": "bool",
					"name": "admin",
					"type": "bool"
				},
				{
					"internalType": "bool",
					"name": "manager",
					"type": "bool"
				},
				{
					"internalType": "bool",
					"name": "staff",
					"type": "bool"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "uint256",
					"name": "",
					"type": "uint256"
				}
			],
			"name": "organizations",
			"outputs": [
				{
					"internalType": "bytes32",
					"name": "id",
					"type": "bytes32"
				},
				{
					"internalType": "bytes32",
					"name": "name",
					"type": "bytes32"
				},
				{
					"internalType": "address",
					"name": "owner",
					"type": "address"
				},
				{
					"internalType": "uint256",
					"name": "numLocations",
					"type": "uint256"
				}
			],
			"stateMutability": "view",
			"type": "function"
		}
	];
  //fix #1
  web3 = new Web3(new Web3.providers.HttpProvider("https://kovan.infura.io/v3/a754957fbda44262a7d474e90c883203"));

  var attendanceContract = new web3.eth.Contract(abi, contractAddress);
  
  attendanceContract.getPastEvents("checkedInEvent", {
    fromBlock: 23543520,
    toBlock: 'latest'
  }, function(error, events){ 
    events.forEach(event => {
      pushToTable(web3.eth.abi.decodeParameters(['address', 'bytes32', 'uint'], event.data)); 
    });
  }
  );

}

async function pushToTable(cellContent){
  var table = document.getElementById("events");
  var row = table.insertRow(0);
  var cell = row.insertCell(0);
  cell.innerHTML = cellContent;
}



// END TESTING ZONE

/**
 * Main entry point.
 */
window.addEventListener('load', async () => {
  init();
  document.querySelector("#btn-connect").addEventListener("click", onConnect);
  document.querySelector("#btn-disconnect").addEventListener("click", onDisconnect);
  //features testing bellow
  document.querySelector("#getAllEvents").addEventListener("click", getAllEvents);
});
