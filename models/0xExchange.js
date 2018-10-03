const config = require('../config');
const ZeroEx = require('0x.js');
const rp = require('request-promise');

const HDWalletProvider = require('truffle-hdwallet-provider');
const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint);
const infuraProvider = network => providerWithMnemonic(
  process.env.MNEMONIC || config.mnemonic,
  `https://${network}.infura.io/${process.env.INFURA_API_KEY}`,
);
const provider = infuraProvider('kovan');


async function makerTrade(event, followRatio) {
  try {
    let makerTradeAmount = event.returnValues.filledMakerTokenAmount * followRatio / 100;
    let takerTradeAmount = event.returnValues.filledTakerTokenAmount * followRatio / 100;

    // Order will be valid 1 hour.
    let duration = 3600;

    let order = {
      // The default web3 account address
      maker: '0xa4f0e5b6c0bbc0e9b26fd011f95e509e5334d2c4',
      // Anyone may fill the order
      taker: '0x0000000000000000000000000000000000000000',
      makerTokenAddress: event.returnValues.makerToken.toLowerCase(),
      takerTokenAddress: event.returnValues.takerToken.toLowerCase(),
      makerTokenAmount: makerTradeAmount.toString(),
      takerTokenAmount: takerTradeAmount.toString(),
      // Add the duration (above) to the current time to get the unix
      // timestamp
      expirationUnixTimestampSec: parseInt(
        (new Date().getTime() / 1000) + duration
      ).toString(),
      // We need a random salt to distinguish different orders made by
      // the same user for the same quantities of the same tokens.
      salt: ZeroEx.ZeroEx.generatePseudoRandomSalt().toString()
    };

    order.exchangeContractAddress = config.zxExchangeContractKovan.address;
    let relayBaseURL = config.relayBaseURL;
    let feeResponse = await
      rp({
        method: 'POST',
        uri: relayBaseURL + '/v0/fees',
        body: order,
        json: true,
      });

    order.feeRecipient = feeResponse.feeRecipient;
    order.makerFee = feeResponse.makerFee;
    order.takerFee = feeResponse.takerFee;

    let orderHash = ZeroEx.ZeroEx.getOrderHashHex(order);
    let zeroEx = new ZeroEx.ZeroEx(provider, {networkId: 42});
    order.ecSignature = await
      zeroEx.signOrderHashAsync(orderHash, order.maker, false);

    let orderPromise = await
      rp({
        method: 'POST',
        uri: relayBaseURL + '/v0/order',
        body: order,
        json: true,
      });
  }
  catch (e) {
    console.log(e);
  }
}
async function takerTrade(event, followRatio) {
  try {
    let takerTradeAmount = event.returnValues.filledMakerTokenAmount * followRatio / 100;
    let makerTradeAmount = event.returnValues.filledTakerTokenAmount * followRatio / 100;

    // Order will be valid 1 hour.
    let duration = 3600;

    let order = {
      // The default web3 account address
      maker: '0xa4f0e5b6c0bbc0e9b26fd011f95e509e5334d2c4',
      // Anyone may fill the order
      taker: '0x0000000000000000000000000000000000000000',
      makerTokenAddress: event.returnValues.takerToken.toLowerCase(),
      takerTokenAddress: event.returnValues.makerToken.toLowerCase(),
      makerTokenAmount: makerTradeAmount.toString(),
      takerTokenAmount: takerTradeAmount.toString(),
      // Add the duration (above) to the current time to get the unix
      // timestamp
      expirationUnixTimestampSec: parseInt(
        (new Date().getTime() / 1000) + duration
      ).toString(),
      // We need a random salt to distinguish different orders made by
      // the same user for the same quantities of the same tokens.
      salt: ZeroEx.ZeroEx.generatePseudoRandomSalt().toString()
    };

    order.exchangeContractAddress = config.zxExchangeContractKovan.address;
    let relayBaseURL = config.relayBaseURL;
    let feeResponse = await
      rp({
        method: 'POST',
        uri: relayBaseURL + '/v0/fees',
        body: order,
        json: true,
      });

    order.feeRecipient = feeResponse.feeRecipient;
    order.makerFee = feeResponse.makerFee;
    order.takerFee = feeResponse.takerFee;

    let orderHash = ZeroEx.ZeroEx.getOrderHashHex(order);
    let zeroEx = new ZeroEx.ZeroEx(provider, {networkId: 42});
    order.ecSignature = await
      zeroEx.signOrderHashAsync(orderHash, order.maker, false);

    let orderPromise = await
      rp({
        method: 'POST',
        uri: relayBaseURL + '/v0/order',
        body: order,
        json: true,
      });
  }
  catch (e) {
    console.log(e);
  }
}


module.exports = {
  makerTrade: makerTrade,
  takerTrade: takerTrade
};
