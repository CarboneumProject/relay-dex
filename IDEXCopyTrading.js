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
const getAsync = promisify(client.get).bind(client);
const hgetAsync = promisify(client.hget).bind(client);
const BigNumber = require('bignumber.js');
const numeral = require('numeral');
const push = require('./models/push');
const trade = require('./models/trade');
const abiDecoder = require('abi-decoder');
abiDecoder.addABI(IDEX_abi);

const network = config.getNetwork();

let contractAddress_IDEX_1 = network.IDEX_exchange;

async function processCopyTrade (leader, follower, tokenMaker, tokenTaker, amountNetMaker, amountNetTaker, amountNet, txHash) {
  let mappedAddressProvider = relayWallet.getUserWalletProvider(follower);
  let followerWallet = mappedAddressProvider.addresses[0];
  let volAbleTrade = await idex.balance(tokenMaker, followerWallet);
  if (volAbleTrade >= parseInt(amountNet)) {
    let followerOrderHash = await idex.sendOrder(mappedAddressProvider, tokenTaker, tokenMaker, amountNetMaker, amountNetTaker);
    let order = {
      leader: leader,
      follower: follower,
      leaderTxHash: txHash,
    };
    client.set('order:' + followerOrderHash, JSON.stringify(order));
    // TODO save copy trade (order) to MySql

  }
}

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

                  if (amountBuy !== amountNetBuy) {
                    amountNetSell = new BigNumber(amountSell).mul(new BigNumber(amountNetBuy)).div(new BigNumber(amountBuy)).toFixed(0);
                  }

                  let orderHash = idex.orderHash(tokenBuy, amountBuy, tokenSell, amountSell, expires, nonce, maker);
                  const copyOrder = await getAsync('order:' + orderHash);
                  if (copyOrder != null) {
                    let order = JSON.parse(copyOrder);

                    let order_time = (await web3.eth.getBlock(receipt.blockNumber)).timestamp;
                    let leader = order.leader;
                    let follower = order.follower;
                    let maker_token = tokenBuy;
                    let taker_token = tokenSell;
                    let amount_maker = amountNetBuy;
                    let amount_taker = amountNetSell;
                    let amount_left = amountNetBuy;
                    let order_hash = orderHash;
                    let tx_hash = txHash;

                    const args = {
                      order_time,
                      leader,
                      follower,
                      maker_token,
                      taker_token,
                      amount_maker,
                      amount_taker,
                      amount_left,
                      order_hash,
                      tx_hash
                    };

                    let ext = ``;

                    if (tokenSell === '0x0000000000000000000000000000000000000000') {
                      await trade.insertNewTrade(args);

                    }
                    else if (tokenBuy === '0x0000000000000000000000000000000000000000') {
                      ext = true;
                      let data = await trade.getAvailableTrade(tokenSell, follower);

                      let sub_amountLeft = new BigNumber(amountNetSell);
                      for (let i = 0; i < data.length && sub_amountLeft>0; i++) {
                        let lastAmount = new BigNumber(data[i].amount_left);
                        sub_amountLeft = sub_amountLeft.sub(lastAmount);

                        if(sub_amountLeft >= 0){
                          await trade.updateAmountLeft('0', data[i].id);
                        } else {
                          await trade.updateAmountLeft(sub_amountLeft.abs().toFixed(0), data[i].id);
                        }
                      }
                    }

                    // TODO If sell for Ether, calc reward and fee by percentage.
                    // Get price of token on IDEX API for C8, Token to Ether
                    let C8LastPrice = await idex.getC8LastPrice("ETH_C8");  // 1 C8 = x ETH

                    let tokenBuyInMsg = await hgetAsync('tokenMap:' + tokenBuy, 'token');
                    let tokenSellInMsg = await hgetAsync('tokenMap:' + tokenSell, 'token');
                    let tokenBuyDecimals = await hgetAsync('tokenMap:' + tokenBuy, 'decimals');
                    let tokenSellDecimals = await hgetAsync('tokenMap:' + tokenSell, 'decimals');
                    let repeatDecimalBuy = '0'.repeat(tokenBuyDecimals);
                    let repeatDecimalSell = '0'.repeat(tokenSellDecimals);
                    let amountNetBuyInMsg = numeral(amountNetBuy / Math.pow(10, tokenBuyDecimals)).format(`0,0.[${repeatDecimalBuy}]`);
                    let amountNetSellInMsg = numeral(amountNetSell / Math.pow(10, tokenSellDecimals)).format(`0,0.[${repeatDecimalSell}]`);

                    let c8Decimals = await hgetAsync('tokenMap:' + network.carboneum, 'decimals');
                    let totalFee = new BigNumber(network.FEE).add(new BigNumber(network.REWARD)).div(10 ** c8Decimals);

                    if(ext) {
                      ext = `\nReward + Fee ${totalFee} C8`;
                      await socialTrading.distributeReward(
                        order.leader,
                        order.follower,
                        network.REWARD,
                        network.FEE,
                        [order.leaderTxHash, '0x', txHash, '0x'],
                      );
                    }

                    let msg = `Trade ${amountNetBuyInMsg} ${tokenBuyInMsg} For ${amountNetSellInMsg} ${tokenSellInMsg} ${ext}`;


                    push.sendTransferNotification(tokenBuy, tokenSell, amountNetBuy, amountNetSell, order.leader, order.follower, msg);

                  } else {
                    client.hgetall('leader:' + maker, async function (err, follow_dict) {   // maker is sell __, buy ETH
                      if (follow_dict !== null) {
                        await Object.keys(follow_dict).forEach(async function (follower) {
                          // TODO Check allowance of C8, and C8 Balance then able to copytrade
                          await processCopyTrade(
                            maker,
                            follower,
                            tokenBuy,
                            tokenSell,
                            amountNetBuy,
                            amountNetSell,
                            amountNetSell,
                            txHash);
                        });
                      }
                    });

                    client.hgetall('leader:' + taker, async function (err, follow_dict) {   // taker is buy __, sell ETH
                      if (follow_dict !== null) {
                        await Object.keys(follow_dict).forEach(async function (follower) {
                          // TODO Check allowance of C8, and C8 Balance then able to copytrade
                          await processCopyTrade(
                            taker,
                            follower,
                            tokenSell,
                            tokenBuy,
                            amountNetSell,
                            amountNetBuy,
                            amountNetBuy,
                            txHash);
                        });
                      }
                    });
                  }
                }
              }
            }
          }
        });
        blockNumber++;
        client.hset('lastBlock', 'IDEXCopyTrading', blockNumber);
      }
    }, 3 * 1000);
  } catch (e) {
    console.log(e, ' error');
    process.exit();
  }
}

_ = watchIDEXTransfers(0);
