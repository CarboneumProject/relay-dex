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
      salt: ZeroEx.generatePseudoRandomSalt().toString()
    };

    order.exchangeContractAddress = config.zxExchangeContractKovan.address;
    let relayBaseURL = config.relayBaseURL;
    let feeResponse = await rp({
      method: 'POST',
      uri: relayBaseURL + '/v0/fees',
      body: order,
      json: true,
    });

    let tokenAllowance =  await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
        order.makerTokenAddress.toLowerCase(),
        order.maker,
      );
    // let feeAllowance =  await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
    //     '0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa',
    //     order.maker,
    //   );


    order.makerAddress = '0xa4f0e5b6c0bbc0e9b26fd011f95e509e5334d2c4';
    order.takerAddress = '0x0000000000000000000000000000000000000000';
    order.feeRecipientAddress = feeResponse.feeRecipient;
    order.senderAddress = '0x0000000000000000000000000000000000000000';
    order.makerAssetAmount =order.makerTokenAmount;
    order.takerAssetAmount =order.takerTokenAmount;
    order.makerFee = new BigNumber(feeResponse.makerFee);
    order.takerFee = new BigNumber(feeResponse.takerFee);

    order.makerAssetData = ZeroEx.assetDataUtils.encodeERC20AssetData(event.returnValues.makerToken.toLowerCase());
    order.takerAssetData = ZeroEx.assetDataUtils.encodeERC20AssetData(event.returnValues.takerToken.toLowerCase());
    order.exchangeAddress =order.exchangeContractAddress;
    order.expirationTimeSeconds =order.expirationUnixTimestampSec;

    let orderHash = ZeroEx.orderHashUtils.getOrderHashHex(order);
    order.signature = await ZeroEx.signatureUtils.ecSignOrderHashAsync(
      provider,
      orderHash,
      order.maker,
      ZeroEx.SignerType.Ledger);

    let orderPromise = await rp({
        method: 'POST',
        uri: relayBaseURL + '/v2/order',
        body: order,
        json: true,
      })
  })
  .on('error', console.error);


