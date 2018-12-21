const idex = {};
const config = require('../config');
const Web3 = require('web3');
const { soliditySha3 } = require('web3-utils');
const {
  hashPersonalMessage,
  bufferToHex,
  toBuffer,
  ecsign
} = require('ethereumjs-util');

const { mapValues } = require('lodash');

idex.IDEX_balance = async function IDEX_balance(_IDEXContract, _token, _user) {
  return await _IDEXContract.methods.balanceOf(_token, _user).call();
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

idex.send_order = async function send_order(_provider, _tokenBuy, _tokenSell, _amountBuy, _amountSell) {
  let contractAddress = config.idex_1;
  let tokenBuy = _tokenBuy;
  let amountBuy = _amountBuy;
  let tokenSell = _tokenSell;
  let amountSell = _amountSell;
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
  }, function (err, resp, body) {
    console.log(body);
    if (body.hasOwnProperty('error')) {
      console.log('error' + body);
    } else {
      //TODO updated lock balance
      // { orderNumber: 273185968,
      //   orderHash: '0xc05a9e4178a5c3731b2683b1fb879459ffdb2e28357177834c128879a9eeb996',
      //   timestamp: 1545298940,
      //   price: '0.0162',
      //   amount: '10',
      //   total: '0.162',
      //   type: 'sell',
      //   params:
      //   { tokenBuy: '0x0000000000000000000000000000000000000000',
      //     buyPrecision: 18,
      //     amountBuy: '162000000000000000',
      //     tokenSell: '0xd42debe4edc92bd5a3fbb4243e1eccf6d63a4a5d',
      //     sellPrecision: 18,
      //     amountSell: '10000000000000000000',
      //     nonce: 2000000000010101,
      //     user: '0xa250a55a282af49809b7be653631f12603c3797b' } }

      console.log(body)
    }
  })
};

module.exports = idex;
