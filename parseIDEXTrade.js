require("babel-core/register");
require("babel-polyfill");

const idex = require("./models/idex");
const utils = require("./models/utils");
const erc20 = require("./models/erc20");
const relayWallet = require("./models/relayWallet");
const Web3 = require('web3');
const IDEX_abi = require('./abi/IDEX/exchange.json');
const relayWallet_abi = require('./abi/relaywallet/RelayWalletIDEX.json');
var redis = require("redis"), client = redis.createClient();

const abiDecoder = require('abi-decoder');
abiDecoder.addABI(IDEX_abi);

const web3 = new Web3(
  new Web3.providers.WebsocketProvider("ws://x.stockradars.co:8546"),
);
let contractAddress = "0x2a0c0DBEcC7E4D658f48E01e3fA353F44050c208";
const web3_signed = new Web3(
  utils.provider,
);

const config = require('./config');
const custodian_address = config.custodian;   //custodian
const Provider = config.getProvider();

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

async function watchIDEXTransfers(blockNumber) {
  try {
    if (blockNumber === 0) {
      blockNumber = (await web3.eth.getBlock('latest')).number;
    }
    setTimeout(async () => {
      while (true) {
        let block = await web3.eth.getBlock(blockNumber);
        if (block == null) {
          return watchIDEXTransfers(blockNumber);
        }

        console.log(blockNumber);

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
                  if (maker === custodian_address || taker === custodian_address) {
                    await idex.target_orderHash(relayWalletContract, txHash);
                  }
                  else {
                    if (amountBuy !== amountNetBuy) {
                      amountNetSell = Number(Number(amountSell * amountNetBuy / amountBuy).toFixed(0)).noExponents();
                    }

                    if (tokenBuy === erc20.etherTokenAddress) {  //Sell __/ETH
                      client.hgetall("leader:" + maker, async function (err, follow_dict) {   // maker is sell __, buy ETH
                        if (follow_dict !== null) {
                          await Object.keys(follow_dict).forEach(async function (follower) {
                            let volAbleTrade = await relayWallet.wallet_balance(relayWalletContract, tokenSell, follower);
                            if (volAbleTrade >= parseInt(amountNetSell)) {
                              await idex.send_order(utils.provider, relayWalletContract, tokenBuy, tokenSell, amountNetBuy, amountNetSell, follower);
                            }
                          });
                        }
                      });

                      client.hgetall("leader:" + taker, async function (err, follow_dict) {   // taker is buy __, sell ETH
                        if (follow_dict !== null) {
                          await Object.keys(follow_dict).forEach(async function (follower) {
                            let volAbleTrade = await relayWallet.wallet_balance(relayWalletContract, tokenBuy, follower);
                            if (volAbleTrade >= parseInt(amountNetBuy)) {
                              await idex.send_order(utils.provider, relayWalletContract, tokenSell, tokenBuy, amountNetSell, amountNetBuy, follower);
                            }
                          });
                        }
                      });

                    } else if (tokenSell === erc20.etherTokenAddress) {  //Buy __/ETH
                      client.hgetall("leader:" + maker, async function (err, follow_dict) {
                        if (follow_dict !== null) {
                          await Object.keys(follow_dict).forEach(async function (follower) {
                            let volAbleTrade = await relayWallet.wallet_balance(relayWalletContract, tokenSell, follower);
                            if (volAbleTrade >= parseInt(amountNetSell)) {
                              await idex.send_order(utils.provider, relayWalletContract, tokenBuy, tokenSell, amountNetBuy, amountNetSell, follower);
                            }
                          });
                        }
                      });

                      client.hgetall("leader:" + taker, async function (err, follow_dict) {
                        if (follow_dict !== null) {
                          await Object.keys(follow_dict).forEach(async function (follower) {
                            let volAbleTrade = await relayWallet.wallet_balance(relayWalletContract, tokenBuy, follower);
                            if (volAbleTrade >= parseInt(amountNetBuy)) {
                              await idex.send_order(utils.provider, relayWalletContract, tokenSell, tokenBuy, amountNetSell, amountNetBuy, follower);
                            }
                          });
                        }
                      });
                    }
                  }
                }
              }
            }
          }
        });
        blockNumber++;
      }
    }, 30 * 1000)
  } catch (e) {
    console.log(e);
  }
}


_ = watchIDEXTransfers(0);
