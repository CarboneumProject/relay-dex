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
const WebSocket = require('ws');
const ws = new WebSocket('wss://v1.idex.market');

const useRedis = require('../models/useRedis');
const relayWallet = require('../models/relayWallet');

const network = config.getNetwork();
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(network.ws_url),
);

const abiDecoder = require('abi-decoder');
abiDecoder.addABI(ERC20_abi);

const idexContract = new web3.eth.Contract(
  IDEX_abi,
  network.IDEX_exchange,
);


idex.balance = async function balance(token, user) {
  return await idexContract.methods.balanceOf(token, user).call();
};

idex.isOrderMatched = async function isOrderMatched(orderHash) {  //orderHash: bytes32 (66 chars)['0x+64']
  return await idexContract.methods.orderFills(orderHash).call();
};

idex.depositEth = async function depositEth(provider, wei) {
  let web3Sign = new Web3(provider);
  let idexContractSign = new web3Sign.eth.Contract(
    IDEX_abi,
    network.IDEX_exchange,
  );
  return await idexContractSign.methods.deposit().send({
    from: provider.addresses[0],
    value: wei,
    gasLimit: 100000,
    gasPrice: web3Sign.eth.gasPrice
  });
};

idex.getDepositAmount = async function getDepositAmount(walletAddress, txHash) {
  return new Promise(async function (resolve, reject) {
    try {
      let trx = await web3.eth.getTransaction(txHash);
      if (trx != null && trx.to != null) {

        if (trx.from.toLowerCase() === walletAddress) {
          //TODO check in redis if status:1 must not saveHash()
          const linkedWallet = relayWallet.getUserWalletProvider(walletAddress).addresses[0];

          if (trx.input === '0x') {
            let fromAddress = trx.from.toLowerCase();
            let toAddress = trx.to.toLowerCase();
            if (linkedWallet === toAddress) {
              useRedis.saveHash(txHash, fromAddress);
              resolve(true);
            }
          } else {
            let transaction = abiDecoder.decodeMethod(trx.input);
            if (transaction.name === 'transfer') {
              let fromAddress = trx.from.toLowerCase();
              let toAddress = transaction.params[0].value.toLowerCase();
              if (linkedWallet === toAddress) {
                useRedis.saveHash(txHash, fromAddress);
                resolve(true);
              }
            }
          }
        }
      }
      resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
};

idex.verifyTxHash = async function verifyTxHash(txHash) {
  return new Promise(async function (resolve, reject) {
    try {
      let trx = await web3.eth.getTransaction(txHash);
      if (trx != null && trx.to != null) {
        let receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt.status) {
          if (trx.input === '0x') {
            let tokenAddress = '0x0000000000000000000000000000000000000000';
            let fromAddress = trx.from.toLowerCase();
            let wei = trx.value;
            resolve([fromAddress, wei, tokenAddress]);
          } else {
            let transaction = abiDecoder.decodeMethod(trx.input);

            if (transaction.name === 'transfer') {
              let tokenAddress = trx.to.toLowerCase();
              let fromAddress = trx.from.toLowerCase();
              let wei = transaction.params[1].value;
              resolve([fromAddress, wei, tokenAddress]);
            }
          }
        }
      }
      resolve(0);
    } catch (e) {
      resolve(0);
    }
  });
};

idex.depositToken = async function depositToken(provider, token, amount) {
  let web3Sign = new Web3(provider);
  let idexContractSign = new web3Sign.eth.Contract(
    IDEX_abi,
    network.IDEX_exchange,
  );
  return await idexContractSign.methods.depositToken(token, amount).send({
    from: provider.addresses[0],
    value: 0,
    gasLimit: 210000,
    gasPrice: web3Sign.eth.gasPrice
  });
};

idex.getNextNonce = async function getNextNonce(address) {
  const nextNonce = await {
    method: 'POST',
    url: 'https://api.idex.market/returnNextNonce',
    json:
      {
        address: address,
      },
  };
  return await rp(nextNonce);
};

idex.sendOrder = async function sendOrder(provider, tokenBuy, tokenSell, amountBuy, amountSell) {
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
      console.log('Success sending order', {
        tokenBuy: tokenBuy,
        amountBuy: amountBuy,
        tokenSell: tokenSell,
        amountSell: amountSell,
        address: address,
        nonce: nonce,
        expires: expires
      })
    }
  })
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
        const ws = new WebSocket('wss://v1.idex.market');
        ws.on('open', function open() {
          ws.send(` {
          "method": "handshake",
          "payload": {
            "type": "client",
            "version": "2.0",
            "key": "7iiqNoCi6Q54Qn2lIq9Bl4mVdBv5ga4n94OaI5QF"
          }
        }`);    //Note that the key property is currently a static string  is likely to change in the future.

        });

        ws.on('message', function incoming(data) {
          let output = JSON.parse(data);
          if (output.result === 'success' && output.method === 'handshake') {

            ws.send(`{
          "method":"makeWithdrawal",
          "payload":{
            "user":"${args.address}",
            "token":"${args.token}",
            "amount":"${args.amount}",
            "nonce":${args.nonce},
            "v":${args.v},
            "r":"${args.r}",
            "s":"${args.s}"
          },
          "sid":"${output.sid}"
          }`);
          }

          if (output.method === 'returnValue') {
            if (Object.keys(output.payload).length === 0) {
              console.log('success');
              resolve({status: 'yes', message: 'withdraw success'});
            } else {
              resolve({status: 'no', message: output.payload.message});
            }
            ws.close();

          }
        });
      });
    }
    return await connect(args);

  } catch (error) {
    console.log("Unknown error: ", error)
  }


};

module.exports = idex;
