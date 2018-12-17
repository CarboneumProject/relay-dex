const Web3 = require('web3');
const IDEX_abi = require('./abi/IDEX/exchange.json');
const relayWallet_abi = require('./abi/relaywallet/RelayWalletIDEX.json');
const config = require('./config');
const Provider = config.getProvider();


const HDWalletProvider = require('truffle-hdwallet-provider');
const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint);
const infuraProvider = network => providerWithMnemonic(
  process.env.MNEMONIC || config.mnemonic,
  `https://${network}.infura.io/${process.env.INFURA_API_KEY}`,
);
const provider = infuraProvider('rinkeby');

const web3 = new Web3(
  provider,
);

const web3_readonly = new Web3(
  new Web3.providers.WebsocketProvider(Provider.ws_url),
);

const IDEXContract = new web3.eth.Contract(
  IDEX_abi,
  Provider.IDEX_exchange,
);


const relayWalletContract = new web3_readonly.eth.Contract(
  relayWallet_abi,
  Provider.relayWallet,
);

relayWalletContract.events
  .Deposit(async function (error, event) {
    if (error) return console.error(error);
    let amount = event.returnValues.amount;
    let address = event.returnValues.user;
    await IDEXContract.methods.deposit().send({
      from: config.owner,
      value: amount,
      gasLimit: 42000,
      gasPrice: web3.utils.toWei('2', 'gwei')});
  });


console.log('end');
