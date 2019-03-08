require('babel-core/register');
require('babel-polyfill');
const Web3 = require('web3');
const idex = require('./models/idex');
const config = require('./config');
const IDEX_abi = require('./abi/IDEX/exchange.json');
const relayWallet = require('./models/relayWallet');
const socialTrading = require('./models/socialTradingContract');
const redis = require('redis'), client = redis.createClient();
const { promisify } = require('util');
const hgetAsync = promisify(client.hget).bind(client);
const getAsync = promisify(client.get).bind(client);
const BigNumber = require('bignumber.js');

const abiDecoder = require('abi-decoder');
abiDecoder.addABI(IDEX_abi);

const network = config.getNetwork();

let contractAddress_IDEX_1 = network.IDEX_exchange;

async function watchIDEXTransfers (blockNumber) {
  try {
    const web3 = new Web3(
      new Web3.providers.WebsocketProvider(network.ws_url),
    );

    if (blockNumber === 0) {
      let lastBlock = await hgetAsync('lastBlock', 'IDEXCopyTrading');
      console.log('start @ #', lastBlock);
      if (lastBlock) {
        blockNumber = lastBlock;
      } else {
        blockNumber = (await web3.eth.getBlock('latest')).number;
      }
    }

    setTimeout(async () => {
      while (true) {
        let block = await web3.eth.getBlock(blockNumber);
        if (block == null) {
          return watchIDEXTransfers(blockNumber);
        }

        block.transactions.forEach(async function (txHash) {
          let trx = await web3.eth.getTransaction(txHash);
          if (trx != null && trx.to != null) {
            if (trx.to.toLowerCase() === contractAddress_IDEX_1) {
              let receipt = await web3.eth.getTransactionReceipt(txHash);
              if (receipt.status) {
                let transaction = abiDecoder.decodeMethod(trx.input);
                if (transaction.name === 'trade') {
                  let params = transaction.params;

                  let amountBuy = new BigNumber(params[0].value[0]).toFixed(0);
                  let amountSell = new BigNumber(params[0].value[1]).toFixed(0);
                  let expires = new BigNumber(params[0].value[2]).toFixed(0);
                  let nonce = new BigNumber(params[0].value[3]).toFixed(0);
                  let amountNetBuy = new BigNumber(params[0].value[4]).toFixed(0);

                  let tokenBuy = params[1].value[0];
                  let tokenSell = params[1].value[1];
                  let maker = params[1].value[2];
                  let taker = params[1].value[3];
                  let txHash = trx.hash;
                  let amountNetSell = amountSell;

                  let orderHash = idex.orderHash(tokenBuy, amountBuy, tokenSell, amountSell, expires, nonce, maker);
                  const copyOrder = await getAsync('order:' + orderHash);
                  if (copyOrder != null) {
                    let order = JSON.parse(copyOrder);
                    await socialTrading.distributeReward(
                      order.leader,
                      order.follower,
                      order.reward,
                      order.relayFee,
                      [order.leaderTxHash, '0x', txHash, '0x'],
                    );
                  } else {
                    if (amountBuy !== amountNetBuy) {
                      amountNetSell = new BigNumber(amountSell).mul(new BigNumber(amountNetBuy)).div(new BigNumber(amountBuy)).toFixed(0);
                    }
                    client.hgetall('leader:' + maker, async function (err, follow_dict) {   // maker is sell __, buy ETH
                      if (follow_dict !== null) {
                        await Object.keys(follow_dict).forEach(async function (follower) {
                          let mappedAddressProvider = relayWallet.getUserWalletProvider(follower);
                          let followerWallet = mappedAddressProvider.addresses[0];
                          let volAbleTrade = await idex.balance(tokenSell, followerWallet);
                          if (volAbleTrade >= parseInt(amountNetSell)) {
                            let followerOrderHash = await idex.sendOrder(mappedAddressProvider, tokenBuy, tokenSell, amountNetBuy, amountNetSell);
                            let order = {
                              leader: maker,
                              follower: follower,
                              reward: network.REWARD,
                              relayFee: network.FEE,
                              leaderTxHash: txHash,
                            };
                            client.set('order:' + followerOrderHash, JSON.stringify(order));
                          }
                        });
                      }
                    });

                    client.hgetall('leader:' + taker, async function (err, follow_dict) {   // taker is buy __, sell ETH
                      if (follow_dict !== null) {
                        await Object.keys(follow_dict).forEach(async function (follower) {
                          let mappedAddressProvider = relayWallet.getUserWalletProvider(follower);
                          let followerWallet = mappedAddressProvider.addresses[0];
                          let volAbleTrade = await idex.balance(tokenBuy, followerWallet);
                          if (volAbleTrade >= parseInt(amountNetBuy)) {
                            let followerOrderHash = await idex.sendOrder(mappedAddressProvider, tokenSell, tokenBuy, amountNetSell, amountNetBuy);
                            let order = {
                              leader: taker,
                              follower: follower,
                              reward: network.REWARD,
                              relayFee: network.FEE,
                              leaderTxHash: txHash,
                            };
                            client.set('order:' + followerOrderHash, JSON.stringify(order));
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
        console.log(blockNumber);
        client.hset('lastBlock', 'IDEXCopyTrading', blockNumber);
        blockNumber++;
      }
    }, 15 * 1000);
  } catch (e) {
    console.log(e, ' error');
    console.log(e);
  }
}

_ = watchIDEXTransfers(0);
