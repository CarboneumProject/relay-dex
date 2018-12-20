require("babel-core/register");
require("babel-polyfill");

const idex = require("./models/idex");
const utils = require("./models/utils");
const relayWallet = require("./models/relayWallet");
const Web3 = require('web3');
const IDEX_abi = require('./abi/IDEX/exchange.json');
const relayWallet_abi = require('./abi/relaywallet/RelayWalletIDEX.json');
const IDEXTrade = require("./IDEXTrade");
var redis = require("redis"), client = redis.createClient();

const abiDecoder = require('abi-decoder');
abiDecoder.addABI(IDEX_abi);

const web3 = new Web3(
  new Web3.providers.WebsocketProvider("ws://x.stockradars.co:8546"),
);
let contractAddress = "0x2a0c0DBEcC7E4D658f48E01e3fA353F44050c208";
const web3_signed = new Web3(
  provider,
);
const IDEXContract = new web3_signed.eth.Contract(
  IDEX_abi,
  Provider.IDEX_exchange,
);

const relayWalletContract = new web3.eth.Contract(
  relayWallet_abi,
  Provider.relayWallet,
);

Number.prototype.noExponents = function () {
  var data = String(this).split(/[eE]/);
  if (data.length === 1) return data[0];

  var z = '', sign = this < 0 ? '-' : '',
    str = data[0].replace('.', ''),
    mag = Number(data[1]) + 1;

  if (mag < 0) {
    z = sign + '0.';
    while (mag++) z += '0';
    return z + str.replace(/^\-/, '');
  }
  mag -= str.length;
  while (mag--) z += '0';
  return str + z;
};

async function parseTrade() {
  try {
    let startBlock = await IDEXTrade.getMaxLogBlock();
    console.log(startBlock);
    let endBlock = (await web3.eth.getBlock('latest')).number;
    startBlock = startBlock[0]['latest'];

    for (let blockNumber = startBlock; blockNumber < endBlock; blockNumber++) {
      console.log(blockNumber);
      let block = await web3.eth.getBlock(blockNumber);
      block.transactions.forEach(async function (txHash) {
        let trx = await web3.eth.getTransaction(txHash);
        if (trx != null && trx.to != null) {
          if (trx.to === contractAddress) {
            let receipt = await web3.eth.getTransactionReceipt(txHash);
            if (receipt.status) {
              let transaction = abiDecoder.decodeMethod(trx.input);
              if (transaction.name === 'trade') {
                let params = transaction.params;

                let amountBuy = Number(params[0].value[0]).noExponents();
                let amountSell = Number(params[0].value[1]).noExponents();
                let amountNetBuy = Number(params[0].value[4]).noExponents();
                let tokenBuy = params[1].value[0];
                let tokenSell = params[1].value[1];
                let maker = params[1].value[2];
                let taker = params[1].value[3];
                let txHash = trx.hash;
                let amountNetSell = amountSell;

                if (amountBuy !== amountNetBuy) {
                  amountNetSell = Number(Number(amountSell * amountNetBuy / amountBuy).toFixed(0)).noExponents();
                }

                if (tokenBuy === '0x0000000000000000000000000000000000000000') {  //Sell __/ETH
                  client.hgetall("leader:" + maker, function (err, follow_dict) {   // maker is sell __, buy ETH
                    if (follow_dict !== null) {
                      idex.IDEX_balance(IDEXContract, tokenBuy, maker);
                      Object.keys(follow_dict).forEach(function (follower) {
                        let volAbleTrade = relayWallet.wallet_balance(relayWalletContract, tokenSell, follower);
                        if (volAbleTrade >= parseInt(amountNetSell)) {
                          idex.send_order(utils.provider, tokenBuy, tokenSell, amountNetBuy, amountNetSell);
                        }
                      });
                    }
                  });

                   client.hgetall("leader:" + taker, function (err, follow_dict) {   // taker is buy __, sell ETH
                    if (follow_dict !== null) {
                      Object.keys(follow_dict).forEach(function (follower) {
                        let volAbleTrade = relayWallet.wallet_balance(relayWalletContract, tokenBuy, follower);
                        if (volAbleTrade >= parseInt(amountNetBuy)) {
                          idex.send_order(utils.provider, tokenSell, tokenBuy, amountNetSell, amountNetBuy);
                        }
                      });
                    }
                  });

                } else if (tokenSell === '0x0000000000000000000000000000000000000000') {  //Buy __/ETH
                   client.hgetall("leader:" + maker, function (err, follow_dict) {
                    if (follow_dict !== null) {
                      idex.IDEX_balance(IDEXContract, tokenBuy, maker);
                      Object.keys(follow_dict).forEach(function (follower) {
                        let volAbleTrade = relayWallet.wallet_balance(relayWalletContract, tokenSell, follower);
                        if (volAbleTrade >= parseInt(amountNetSell)) {
                          idex.send_order(utils.provider, tokenBuy, tokenSell, amountNetBuy, amountNetSell);
                        }
                      });
                    }
                  });

                   client.hgetall("leader:" + taker, function (err, follow_dict) {
                    if (follow_dict !== null) {
                      Object.keys(follow_dict).forEach(function (follower) {
                        let volAbleTrade = relayWallet.wallet_balance(relayWalletContract, tokenBuy, follower);
                        if (volAbleTrade >= parseInt(amountNetBuy)) {
                          idex.send_order(utils.provider, tokenSell, tokenBuy, amountNetSell, amountNetBuy);
                        }
                      });
                    }
                  });
                }
              }
            }
          }
        }
      });
    }
  } catch (e) {
    console.log(e);
  }
}


_ = parseTrade();
