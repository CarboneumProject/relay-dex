const utils = {};

const config = require('../config');
const HDWalletProvider = require('truffle-hdwallet-provider');
const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint);
const infuraProvider = network => providerWithMnemonic(
  process.env.MNEMONIC || config.mnemonic,
  `https://${network}.infura.io/${process.env.INFURA_API_KEY}`,
);
const provider = infuraProvider('mainnet');

utils.provider = provider;

module.exports = utils;
