const idex = {};
const config = require('../config');
const custodian_address = config.custodian;   //custodian

const Web3 = require('web3');
const { soliditySha3 } = require('web3-utils');
const {
  hashPersonalMessage,
  bufferToHex,
  toBuffer,
  ecsign
} = require('ethereumjs-util');

const { mapValues } = require('lodash');
const request = require('request');

var redis = require("redis"), client = redis.createClient();
const relayWallet = require("./models/relayWallet");

idex.IDEX_balance = async function IDEX_balance(_IDEXContract, _token, _user) {
  return await _IDEXContract.methods.balanceOf(_token, _user).call();
};

idex.is_order_matched = async function is_order_matched(_IDEXContract, _orderHash) {  //_orderHash: bytes32 (66 chars)['0x+64']
  return await _IDEXContract.methods.orderFills(_orderHash).call();
};

idex.target_orderHash = async function target_orderHash(_relayWalletContract, txHash){
  request({
    method: 'POST',
    url: 'https://api.idex.market/returnTradeHistory',
    json: {
      address: custodian_address
    }
  }, async function (err, resp, body) {
    for (let key in body){
      for (let i = 0; i < body[key].length; i++) {
        if(body[key][i].transactionHash === txHash){
          let orderHash = await body[key][i].orderHash;

          client.get(orderHash, async function (err, reservedData) {
            if (reservedData !== null) {
              let data = reservedData.split(",");
              let user = data[0];
              let tokenBuy = data[1];
              let tokenSell = data[2];
              let amountBuy = data[3];
              let amountSell = data[4];

              await relayWallet.adjust_balance(_relayWalletContract, user, tokenBuy, tokenSell, amountBuy, amountSell);
            }
          });
        }
      }
    }
  });
};

idex.deposit_eth_idex = async function deposit_eth(_IDEXContract, _ether) {
  return await _IDEXContract.methods.deposit().send({
    from: config.owner,
    value: _ether,
    gasLimit: 42000,
    gasPrice: Web3.utils.toWei('2', 'gwei')
  });
};

idex.deposit_token_idex = async function deposit_token(_IDEXContract, _token, _amount) {
  return await _IDEXContract.methods.depositToken('0xd36255cee98d10068d0bc1a394480bf09b3db4d7', '1').send({
    from: config.owner,
    value: 0,
    gasLimit: 210000,
    gasPrice: Web3.utils.toWei('2', 'gwei')
  });
};

idex.send_order = async function send_order(_provider, _relayWalletContract, _tokenBuy, _tokenSell, _amountBuy, _amountSell, _follower) {
  let contractAddress = config.idex_1;
  let tokenBuy = _tokenBuy;
  let amountBuy = _amountBuy;
  let tokenSell = _tokenSell;
  let amountSell = _amountSell;
  let follower = _follower;
  let expires = 0;
  let nonce = new Date().getTime() * 2000;
  let address = config.owner;
  let privateKeyBuffer = _provider.wallets[config.owner]['_privKey'];

  const raw = soliditySha3({
    t: 'address',
    v: contractAddress
  }, {
    t: 'address',
    v: tokenBuy
  }, {
    t: 'uint256',
    v: amountBuy
  }, {
    t: 'address',
    v: tokenSell
  }, {
    t: 'uint256',
    v: amountSell
  }, {
    t: 'uint256',
    v: expires
  }, {
    t: 'uint256',
    v: nonce
  }, {
    t: 'address',
    v: address
  });
  const salted = hashPersonalMessage(toBuffer(raw));
  const {
    v,
    r,
    s
  } = mapValues(ecsign(salted, privateKeyBuffer), (value, key) => key === 'v' ? value : bufferToHex(value));


  const request = require('request');
  request({
    method: 'POST',
    url: 'https://api.idex.market/order',
    json: {
      tokenBuy: tokenBuy,
      amountBuy: amountBuy,
      tokenSell: tokenSell,
      amountSell: amountSell,
      address: address,
      nonce: nonce,
      expires: expires,
      v: v,
      r: r,
      s: s
    }
  }, async function (err, resp, body) {
    console.log(body);
    if (body.hasOwnProperty('error')) {
      console.log('error' + body);
    } else {
      client.set(body.orderHash, follower + ',' + tokenBuy + ',' + tokenSell + ',' + amountBuy + ',' + amountSell);
      await relayWallet.lock_balance(_relayWalletContract, follower, tokenSell, amountSell);
    }
  })
};

module.exports = idex;
