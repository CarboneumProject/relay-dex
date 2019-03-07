const HDWalletProvider = require('truffle-hdwallet-provider');
const SocialTradingABI = require('../abi/socialtrading/SocialTrading');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const config = require('../config');
const network = config.getNetwork();
const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint);
const infuraProvider = network => providerWithMnemonic(
  process.env.MNEMONIC || config.mnemonic,
  process.env.RPC_URL || `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`,
);

const contractAddress = network.socialtrading;
const socialTrading = {};

socialTrading.distributeReward = async function distributeReward (
  leader,
  follower,
  reward,
  relayFee,
  orderHashes,
  orderId,
) {
  try {
    const provider = infuraProvider(process.env.NETWORK || network.name);
    let w3 = new Web3(provider);
    let socialTradingContract = new w3.eth.Contract(
      SocialTradingABI,
      contractAddress,
    );

    let data = socialTradingContract.methods.distributeReward(
      leader,
      follower,
      reward,
      relayFee,
      orderHashes,
    ).encodeABI();

    let nextNonce = await w3.eth.getTransactionCount(provider.addresses[0], 'pending') + orderId;
    console.log(nextNonce);
    await w3.eth.sendTransaction({
      nonce: nextNonce,
      gasLimit: 310000,
      gasPrice: await w3.eth.getGasPrice(),
      from: provider.addresses[0],
      to: network.socialtrading,
      value: 0,
      data: data,
      chainId: network.chainId,
    });
  } catch (error) {
    console.log(error.message, ' error!!');
  }
};

socialTrading.distributeRewardAll = async function (rewards) {
  const provider = infuraProvider(process.env.NETWORK || network.name);
  let w3 = new Web3(provider);
  let socialTradingContract = new w3.eth.Contract(
    SocialTradingABI,
    contractAddress,
  );
  let gasPrice = await w3.eth.getGasPrice();
  for (let i = 0; i < rewards.length; i++) {
    if (rewards[i].C8FEE === new BigNumber(0)) { // No fee to distribute
      continue;
    }
    try {
      await socialTradingContract.methods.distributeReward(
        rewards[i].leader,
        rewards[i].follower,
        rewards[i].reward,
        rewards[i].relayFee,
        rewards[i].orderHashes,
      ).send({
        from: provider.addresses[0],
        value: 0,
        gasLimit: 310000,
        gasPrice: gasPrice,
      });
    } catch (error) {
      console.log(error.message, ' error!!');
    }
  }

  w3.currentProvider.connection.close();
};

module.exports = socialTrading;
