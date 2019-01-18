require("babel-core/register");
require("babel-polyfill");
const Web3 = require('web3');
const idex = require("./models/idex");
const utils = require("./models/utils");
const erc20 = require("./models/erc20");
const config = require('./config');
const IDEX_abi = require('./abi/IDEX/exchange.json');
const relayWallet = require('./models/relayWallet');
const redis = require("redis"), client = redis.createClient();

const abiDecoder = require('abi-decoder');
abiDecoder.addABI(IDEX_abi);

const network = config.getNetwork();
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(network.ws_url),
);

let contractAddress_IDEX_1 = network.IDEX_exchange;

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
            if (trx.to.toLowerCase() === contractAddress_IDEX_1) {
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
                  client.hgetall("leader:" + maker, async function (err, follow_dict) {   // maker is sell __, buy ETH
                    if (follow_dict !== null) {
                      await Object.keys(follow_dict).forEach(async function (follower) {
                        let mappedAddressProvider = relayWallet.getUserWalletProvider(follower);
                        let followerWallet = mappedAddressProvider.addresses[0];
                        let volAbleTrade = await idex.balance(tokenSell, followerWallet);
                        if (volAbleTrade >= parseInt(amountNetSell)) {
                          await idex.sendOrder(mappedAddressProvider, tokenBuy, tokenSell, amountNetBuy, amountNetSell);
                        }
                      });
                    }
                  });

                  client.hgetall("leader:" + taker, async function (err, follow_dict) {   // taker is buy __, sell ETH
                    if (follow_dict !== null) {
                      await Object.keys(follow_dict).forEach(async function (follower) {
                        let mappedAddressProvider = relayWallet.getUserWalletProvider(follower);
                        let followerWallet = mappedAddressProvider.addresses[0];
                        let volAbleTrade = await idex.balance(tokenBuy, followerWallet);
                        if (volAbleTrade >= parseInt(amountNetBuy)) {
                          await idex.sendOrder(mappedAddressProvider, tokenSell, tokenBuy, amountNetSell, amountNetBuy);
                        }
                      });
                    }
                  });
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
