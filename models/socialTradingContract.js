const HDWalletProvider = require('truffle-hdwallet-provider');
const SocialTradingABI = require('../abi/socialtrading/SocialTrading');
const Web3 = require('web3');
const network = config.getNetwork();
const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint);
const infuraProvider = network => providerWithMnemonic(
  process.env.MNEMONIC || '',
  `https://${network}.infura.io/${process.env.INFURA_API_KEY}`,
);

const contractAddress = network.socialtrading;
const socialTrading = {};
const provider = infuraProvider(process.env.NETWORK || 'rinkeby');

let w3 = new Web3(provider);
let socialTradingContract = new w3.eth.Contract(
  SocialTradingABI,
  contractAddress,
);

socialTrading.distributeReward = async function distributeReward (
  leader,
  follower,
  reward,
  relayFee,
  orderHashes,
) {
  return await socialTradingContract.methods.distributeReward(
    leader,
    follower,
    reward,
    relayFee,
    orderHashes,
  ).send({
    from: provider.addresses[0],
    value: 0,
    gasLimit: 310000,
    gasPrice: w3.eth.gasPrice,
  });
};

module.exports = socialTrading;
