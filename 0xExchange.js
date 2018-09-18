const Web3 = require('web3');
const abi = require('./0x-abi-v1.json');
const config = require('./config');

const ZeroEx = require('0x.js');
const rp = require('request-promise');
const BigNumber = require('@0xproject/utils').BigNumber;

const HDWalletProvider = require('truffle-hdwallet-provider');
const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint);
const infuraProvider = network => providerWithMnemonic(
  process.env.MNEMONIC || config.mnemonic,
  `https://${network}.infura.io/${process.env.INFURA_API_KEY}`,
);

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.zxExchangeContractKovan.provider),
);

const provider = infuraProvider('kovan');
const contractWrappers = new ZeroEx.ContractWrappers(provider, { networkId: 42, gasPrice: new BigNumber(4000000000)});
const c8Contract = new web3.eth.Contract(
  abi,
  config.zxExchangeContractKovan.address,
);

const logfill = c8Contract.events
  .LogFill(async function (error, event) {
    if (error) return console.error(error);
    console.log('Successfully logfill!');
    
  })
  .on('error', console.error);


const logCancel = c8Contract.events
  .LogCancel((error, event) => {
    if (error) return console.error(error);
    console.log('Successfully logcancel!', event);
  })
  .on('error', console.error);

