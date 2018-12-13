const config = require('../config');
const ZeroEx = require('0x.js');
const rp = require('request-promise');
const bigNumber = require('bignumber.js');
const HDWalletProvider = require('truffle-hdwallet-provider');
const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint);
const infuraProvider = network => providerWithMnemonic(
  process.env.MNEMONIC || config.mnemonic,
  `https://${network}.infura.io/${process.env.INFURA_API_KEY}`,
);
const provider = infuraProvider('kovan');

async function sendOrder(){

  let duration = 3600;
  let order = {
    senderAddress: "0xfa2de623035c7e068d4346857bb62ce98aa7b728",
    makerAddress: config.IExchangeContractKovan.address.toLowerCase(),
    takerAddress: "0x0000000000000000000000000000000000000000",
    makerFee: new bigNumber.BigNumber("0"),
    takerFee: new bigNumber.BigNumber(200000000000000000),
    makerAssetAmount: new bigNumber.BigNumber(9000000000000000),
    takerAssetAmount: new bigNumber.BigNumber(100000000000000000),
    takerAssetData:'0xf47261b00000000000000000000000006ff6c0ff1d68b964901f986d4c9fa3ac68346570',
    makerAssetData:'0xf47261b0000000000000000000000000d0a1e359811322d97991e03f863a0c30c2cf029c',
    // salt: Date.now().toString(),
    salt: new bigNumber.BigNumber(Date.now().toString()),
    exchangeAddress: "0x35dd2932454449b14cee11a94d3674a936d5d7b2",
    feeRecipientAddress: "0xfaec02c3474b1a1c553eddf3df27946643cc7122",
    expirationTimeSeconds: new bigNumber.BigNumber(parseInt(
      (new Date().getTime() / 1000) + duration
    ).toString()),
  };

  let orderHashHex = ZeroEx.orderHashUtils.getOrderHashHex(order);

  const contractWrappers = new ZeroEx.ContractWrappers(provider, { networkId: 42});
  order.signature = await
    ZeroEx.signatureUtils.ecSignHashAsync(provider, orderHashHex, config.IExchangeContractKovan.sender.toLowerCase());
  console.log(orderHashHex);
  console.log(order);

  await
    rp({
      method: 'POST',
      uri: config.relayBaseURL + '/v2/order?networkId=42',
      body: order,
      json: true,
    });

  console.log('trade confirm!');
  console.log('https://api.openrelay.xyz/v2/orders?networkId=42&senderAddress=0xfa2de623035c7e068d4346857bb62ce98aa7b728');
}


module.exports = {
  sendOrder: sendOrder
};
