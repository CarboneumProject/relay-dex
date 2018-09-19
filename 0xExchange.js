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
const c8Contract = new web3.eth.Contract(
  abi,
  config.zxExchangeContractKovan.address,
);

const logfill = c8Contract.events
  .LogFill(async function (error, event) {
    if (error) return console.error(error);
    console.log('Successfully logfill!');


    let followingAddress = config.followingAddress;
    let isMaker = false;
    let contractAddress = '';
    let tokenTradeAmount = 0;

    if (event.returnValues.maker === followingAddress) {
      isMaker = true;
      contractAddress = event.returnValues.makerToken;
      tokenTradeAmount = event.returnValues.filledMakerTokenAmount;
    } else if (event.returnValues.taker === followingAddress) {
      isMaker = false;
      contractAddress = event.returnValues.takerToken;
      tokenTradeAmount = event.returnValues.filledTakerTokenAmount;
    }

    // Order will be valid 1 hour.
    let duration = 3600;


    let order = {
      // The default web3 account address
      maker: '0xa4f0e5b6c0bbc0e9b26fd011f95e509e5334d2c4',
      // Anyone may fill the order
      taker: '0x0000000000000000000000000000000000000000',
      makerTokenAddress: event.returnValues.makerToken.toLowerCase(),
      takerTokenAddress: event.returnValues.takerToken.toLowerCase(),
      makerTokenAmount: event.returnValues.filledMakerTokenAmount,
      takerTokenAmount: event.returnValues.filledTakerTokenAmount,
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
    let feeResponse = await rp({
      method: 'POST',
      uri: relayBaseURL + '/v0/fees',
      body: order,
      json: true,
    });

    order.feeRecipient = feeResponse.feeRecipient;
    order.makerFee = feeResponse.makerFee;
    order.takerFee = feeResponse.takerFee;

    let orderHash = ZeroEx.ZeroEx.getOrderHashHex(order);
    let zeroEx = new ZeroEx.ZeroEx(provider, {networkId:42});
    order.ecSignature = await zeroEx.signOrderHashAsync(orderHash, order.maker, false);

    console.dir(order);
    let orderPromise = await rp({
        method: 'POST',
        uri: relayBaseURL + '/v0/order',
        body: order,
        json: true,
      })
  })
  .on('error', console.error);

