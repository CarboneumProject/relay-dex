const idex = {};
const config = require('../config');
const IDEX_abi = require('../abi/IDEX/exchange.json');
const ERC20_abi = require('../abi/ERC20/token.json');
const Web3 = require('web3');
const {soliditySha3} = require('web3-utils');
const {
  hashPersonalMessage,
  bufferToHex,
  toBuffer,
  ecsign
} = require('ethereumjs-util');

const {mapValues} = require('lodash');
const request = require('request');
const rp = require('request-promise');

const useRedis = require('../models/useRedis');
const relayWallet = require('../models/relayWallet');
const logToFile = require("../models/logToFile");

const network = config.getNetwork();

const abiDecoder = require('abi-decoder');
abiDecoder.addABI(ERC20_abi);

const BigNumber = require('bignumber.js');

idex.withdrawHash = function withdrawHash(token, amount, user, nonce, v, r, s) {
  const raw = soliditySha3({
    t: 'address',
    v: token
  }, {
    t: 'uint256',
    v: amount
  }, {
    t: 'address',
    v: user
  }, {
    t: 'uint256',
    v: nonce
  }, {
    t: 'uint8',
    v: v
  }, {
    t: 'bytes32',
    v: r
  }, {
    t: 'bytes32',
    v: s
  });
  return bufferToHex(toBuffer(raw));
};

idex.orderHash = function orderHash(tokenBuy, amountBuy, tokenSell, amountSell, expires, nonce, address) {
  const raw = soliditySha3({
    t: 'address',
    v: network.IDEX_exchange
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
  return bufferToHex(toBuffer(raw));
};

idex.balance = async function balance(token, user) {
  let web3 = new Web3(new Web3.providers.WebsocketProvider(network.ws_url));
  let idexContract = new web3.eth.Contract(
    IDEX_abi,
    network.IDEX_exchange,
  );
  let result = await idexContract.methods.balanceOf(token, user).call();
  web3.currentProvider.connection.close();
  return result;
};

idex.isOrderMatched = async function isOrderMatched(orderHash) {  //orderHash: bytes32 (66 chars)['0x+64']
  let web3 = new Web3(new Web3.providers.WebsocketProvider(network.ws_url));
  let idexContract = new web3.eth.Contract(
    IDEX_abi,
    network.IDEX_exchange,
  );
  let result = await idexContract.methods.orderFills(orderHash).call();
  web3.currentProvider.connection.close();
  return result;
};

idex.depositEth = async function depositEth(provider, wei) {
  try {
    let web3Sign = new Web3(provider);
    let idexContractSign = new web3Sign.eth.Contract(
      IDEX_abi,
      network.IDEX_exchange,
    );
    return await idexContractSign.methods.deposit().send({
      from: provider.addresses[0],
      value: wei,
      gasLimit: 90000,
      gasPrice: await web3Sign.eth.getGasPrice()
    });
  } catch (error) {
    console.log(error, ' error');
    return error.message;
  }
};

idex.getDepositAmount = async function getDepositAmount(walletAddress, txHash, amount = "0") {
  return new Promise(async function (resolve, reject) {
    try {
      useRedis.isValidHash(txHash, walletAddress).then((response) => {
        if (response === '1') {
          resolve([false, 'Already deposited.']);
        } else {
          useRedis.saveHash(txHash, walletAddress, amount);
          resolve([true, true]);
        }
      });
    } catch (e) {
      resolve([false, e.message]);
    }
  });
};

idex.verifyTxHash = async function verifyTxHash(txHash) {
  return new Promise(async function (resolve, reject) {
    let web3 = new Web3(new Web3.providers.WebsocketProvider(network.ws_url));
    try {
      let trx = await web3.eth.getTransaction(txHash);
      if (trx != null && trx.to != null) {
        let receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt.status) {
          if (trx.input === '0x') {
            let tokenAddress = '0x0000000000000000000000000000000000000000';
            let fromAddress = trx.from.toLowerCase();
            let toAddress = trx.to.toLowerCase();
            let wei = trx.value;
            const linkedWallet = relayWallet.getUserWalletProvider(fromAddress).addresses[0];
            if (linkedWallet === toAddress) {
              resolve([fromAddress, wei, tokenAddress]);
            }
          } else {
            let transaction = abiDecoder.decodeMethod(trx.input);

            if (transaction.name === 'transfer') {
              let tokenAddress = trx.to.toLowerCase();
              let fromAddress = trx.from.toLowerCase();
              let toAddress = transaction.params[0].value.toLowerCase();
              let wei = transaction.params[1].value;
              const linkedWallet = relayWallet.getUserWalletProvider(fromAddress).addresses[0];
              if (linkedWallet === toAddress) {
                resolve([fromAddress, wei, tokenAddress]);
              }
            }
          }
        } else {
          useRedis.removeFailed(txHash);
          logToFile.writeLog('loopDeposit', txHash + ' Remove failed transaction.');
        }
      }
      web3.currentProvider.connection.close();
      resolve(0);
    } catch (e) {
      web3.currentProvider.connection.close();
      resolve(0);
    }
  });
};

idex.withdrawTxHash = async function withdrawTxHash(txHash) {
  return new Promise(async function (resolve, reject) {
    let web3 = new Web3(new Web3.providers.WebsocketProvider(network.ws_url));
    try {
      let trx = await web3.eth.getTransaction(txHash);
      if (trx != null && trx.to != null) {
        let receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt.status) {
          if (trx.input === '0x') {} else {
            let transaction = abiDecoder.decodeMethod(trx.input);
            if (transaction.name === 'adminWithdraw') {
              let params = transaction.params;
              let tokenAddress = params[0].value;
              let amount = new BigNumber(params[1].value).toFixed(0);
              let linkedWalletAddress = (params[2].value).toLowerCase();
              let nonce = new BigNumber(params[3].value).toFixed(0);
              let v = params[4].value;
              let r = params[5].value;
              let s = params[6].value;
              let withdrawHash = idex.withdrawHash(tokenAddress, amount, linkedWalletAddress, nonce, v, r, s);
              resolve([withdrawHash, tokenAddress]);
            }
          }
        }
      }
      web3.currentProvider.connection.close();
      resolve(0);
    } catch (e) {
      web3.currentProvider.connection.close();
      resolve(0);
    }
  });
};

idex.depositToken = async function depositToken(provider, token, amount) {
  try {
    let web3Sign = new Web3(provider);
    let idexContractSign = new web3Sign.eth.Contract(
      IDEX_abi,
      network.IDEX_exchange,
    );
    return await idexContractSign.methods.depositToken(token, amount).send({
      from: provider.addresses[0],
      value: 0,
      gasLimit: 210000,
      gasPrice: await web3Sign.eth.getGasPrice()
    });
  } catch (error) {
    return error.message;
  }
};

idex.getNextNonce = async function getNextNonce(address) {
  const nextNonce = await {
    method: 'POST',
    url: network.IDEX_API_BASE_URL + '/returnNextNonce',
    json:
      {
        address: address,
      },
  };
  return await rp(nextNonce);
};

idex.getC8LastPrice = async function getC8LastPrice(tokenPair) {
  const lastPrice = await {
    method: 'POST',
    url: network.IDEX_API_BASE_URL + '/returnTicker',
    json:
      {
        "market": tokenPair,
      },
  };
  return (await rp(lastPrice)).last;
};

idex.sendOrder = async function sendOrder(provider, tokenBuy, tokenSell, amountBuy, amountSell, txHashLeader) {
  let contractAddress = network.IDEX_exchange;
  let expires = 0;
  let address = provider.addresses[0];
  let privateKeyBuffer = provider.wallets[address]['_privKey'];
  let nonce = (await idex.getNextNonce(provider.addresses[0])).nonce;

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

  request({
    method: 'POST',
    url: network.IDEX_API_BASE_URL + '/order',
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
    if (body.hasOwnProperty('error')) {
      logToFile.writeLog('trade',
        address + ' ' + tokenBuy + ' ' + tokenSell + ' ' + amountBuy + ' ' + amountSell + ' Error ' + body.error);
    } else {
      logToFile.writeLog('trade',
        address + ' ' + tokenBuy + ' ' + tokenSell + ' ' + amountBuy + ' ' + amountSell + ' Success.');
      console.log('Success sending order', {
        tokenBuy: tokenBuy,
        amountBuy: amountBuy,
        tokenSell: tokenSell,
        amountSell: amountSell,
        address: address,
        nonce: nonce,
        expires: expires,
        txLeader: txHashLeader,
      })
    }
  });
  return bufferToHex(toBuffer(raw));
};

idex.withdraw = async function withdraw(provider, token, amount) {
  try {
    let contractAddress = network.IDEX_exchange;
    let address = provider.addresses[0];
    let privateKeyBuffer = provider.wallets[address]['_privKey'];
    let nonce = (await idex.getNextNonce(provider.addresses[0])).nonce;

    const raw = soliditySha3({
      t: 'address',
      v: contractAddress
    }, {
      t: 'address',
      v: token
    }, {
      t: 'uint256',
      v: amount
    }, {
      t: 'address',
      v: address
    }, {
      t: 'uint256',
      v: nonce
    });
    const salted = hashPersonalMessage(toBuffer(raw));
    const {
      v,
      r,
      s
    } = mapValues(ecsign(salted, privateKeyBuffer), (value, key) => key === 'v' ? value : bufferToHex(value));

    const args = {
      address,
      token,
      amount,
      nonce,
      v,
      r,
      s,
    };

    function connect(args) {
      return new Promise(function (resolve, reject) {
        request({
          method: 'POST',
          url: network.IDEX_API_BASE_URL + '/withdraw',
          json: {
            address: args.address,
            amount: args.amount,
            token: args.token,
            nonce: args.nonce,
            v: args.v,
            r: args.r,
            s: args.s
          }
        }, async function (err, resp, body) {
          if (body.hasOwnProperty('error')) {
            resolve({status: 'no', message: body.error});
          } else {
            let withdrawHash = await idex.withdrawHash(token, amount, address, nonce, v, r, s);
            resolve({status: 'yes', message: 'success', withdrawHash: withdrawHash});
          }
        });
      });
    }
    return await connect(args);

  } catch (error) {
    console.log("Unknown error: ", error);
    return {status: 'no', message: error.message};
  }


};

module.exports = idex;
