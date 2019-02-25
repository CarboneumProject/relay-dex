require('babel-core/register');
require('babel-polyfill');
const Web3 = require('web3');
const idex = require('./models/idex');
const config = require('./config');
const IDEX_abi = require('./abi/IDEX/exchange.json');
const relayWallet = require('./models/relayWallet');
const socialTrading = require('./models/socialTradingContract');
const redis = require('redis'), client = redis.createClient();
const {promisify} = require('util');
const getAsync = promisify(client.get).bind(client);
const hgetAsync = promisify(client.hget).bind(client);
const BigNumber = require('bignumber.js');
const numeral = require('numeral');
const push = require('./models/push');
const trade = require('./models/trade');
const erc20 = require('./models/erc20');
const abiDecoder = require('abi-decoder');
abiDecoder.addABI(IDEX_abi);

const network = config.getNetwork();
const PROFIT_PERCENTAGE = 0.1;
const BENCHMARK_ALLOWANCE_C8 = new BigNumber(10 ** 18).mul(10000);

let contractAddress_IDEX_1 = network.IDEX_exchange;

async function processCopyTrade(leader, follower, tokenMaker, tokenTaker, amountNetMaker, amountNetTaker, amountNet, txHash) {
  let mappedAddressProvider = relayWallet.getUserWalletProvider(follower);
  let followerWallet = mappedAddressProvider.addresses[0];
  let volAbleTrade = await idex.balance(tokenMaker, followerWallet);
  if (volAbleTrade >= parseInt(amountNet)) {
    let followerOrderHash = await idex.sendOrder(mappedAddressProvider, tokenMaker, tokenTaker, amountNetMaker, amountNetTaker);
    let order = {
      leader: leader,
      follower: follower,
      leaderTxHash: txHash,
    };
    client.set('order:' + followerOrderHash, JSON.stringify(order));
    // TODO save copy trade (order) to MySql

  }
}

async function getPercentageFee(data, sub_amountLeft, tokenSellLastPrice) {
  let FEE = new BigNumber(0);
  for (let i = 0; i < data.length && sub_amountLeft > 0; i++) {
    let lastAmount = new BigNumber(data[i].amount_left);
    sub_amountLeft = sub_amountLeft.sub(lastAmount);
    let avg = new BigNumber(data[i].amount_maker).div(data[i].amount_taker);

    if (sub_amountLeft >= 0) {
      await trade.updateAmountLeft('0', data[i].id);
      if (avg <= tokenSellLastPrice) {
        let profit = (tokenSellLastPrice.sub(avg)).mul(PROFIT_PERCENTAGE).mul(lastAmount);
        FEE.add(profit);
      }
    } else {
      await trade.updateAmountLeft(sub_amountLeft.abs().toFixed(0), data[i].id);
      if (avg <= tokenSellLastPrice) {
        let profit = (tokenSellLastPrice.sub(avg)).mul(PROFIT_PERCENTAGE).mul(lastAmount.add(sub_amountLeft));
        FEE.add(profit);
      }
    }
  }
  return FEE
}

async function watchIDEXTransfers(blockNumber) {
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

                  if (amountBuy !== amountNetBuy) {
                    amountNetSell = new BigNumber(amountSell).mul(new BigNumber(amountNetBuy)).div(new BigNumber(amountBuy)).toFixed(0);
                  }

                  let orderHash = idex.orderHash(tokenBuy, amountBuy, tokenSell, amountSell, expires, nonce, maker);
                  const copyOrder = await getAsync('order:' + orderHash);
                  if (copyOrder != null) {
                    let order = JSON.parse(copyOrder);

                    let order_time = new Date((await web3.eth.getBlock(receipt.blockNumber)).timestamp * 1000);
                    let leader = order.leader;
                    let follower = order.follower;
                    let maker_token = tokenBuy;
                    let taker_token = tokenSell;
                    let amount_maker = amountNetBuy;
                    let amount_taker = amountNetSell;
                    let amount_left = amountNetBuy;
                    let order_hash = orderHash;
                    let tx_hash = txHash;

                    if (order.follower === taker) {
                      maker_token = tokenSell;
                      taker_token = tokenBuy;
                      amount_maker = amountNetSell;
                      amount_taker = amountNetBuy;
                      amount_left = amountNetSell;
                    }

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

                    let tokenBuyInMsg = await hgetAsync('tokenMap:' + maker_token, 'token');
                    let tokenSellInMsg = await hgetAsync('tokenMap:' + taker_token, 'token');
                    let tokenBuyDecimals = await hgetAsync('tokenMap:' + maker_token, 'decimals');
                    let tokenSellDecimals = await hgetAsync('tokenMap:' + taker_token, 'decimals');

                    let repeatDecimalBuy = '0'.repeat(tokenBuyDecimals);
                    let repeatDecimalSell = '0'.repeat(tokenSellDecimals);
                    let amountNetBuyInMsg = numeral(amountNetBuy / Math.pow(10, tokenBuyDecimals)).format(`0,0.[${repeatDecimalBuy}]`);
                    let amountNetSellInMsg = numeral(amountNetSell / Math.pow(10, tokenSellDecimals)).format(`0,0.[${repeatDecimalSell}]`);

                    if (taker_token === '0x0000000000000000000000000000000000000000') {
                      await trade.insertNewTrade(args);

                    } else if (maker_token === '0x0000000000000000000000000000000000000000') {
                      ext = true;

                      let tokenDecimal = new BigNumber(10 ** tokenBuyDecimals - tokenSellDecimals);
                      let tokenSellLastPrice = new BigNumber(amount_maker).div(amount_taker).mul(tokenDecimal);
                      let data = await trade.getAvailableTrade(taker_token, follower);
                      let sub_amountLeft = new BigNumber(amountNetSell);
                      let FEE = await getPercentageFee(data, sub_amountLeft, tokenSellLastPrice);

                      let C8LastPrice = await idex.getC8LastPrice("ETH_C8");  // 1 C8 = x ETH
                      C8LastPrice = new BigNumber(C8LastPrice);
                      let c8Decimals = await hgetAsync('tokenMap:' + network.carboneum, 'decimals');
                      let C8FEEInMsg = FEE.div(C8LastPrice.mul(10 ** tokenSellDecimals)).mul(10 ** c8Decimals);
                      let repeatDecimalC8 = '0'.repeat(c8Decimals);
                      let totalFee = new BigNumber(network.FEE).add(new BigNumber(network.REWARD)).div(10 ** c8Decimals);
                      totalFee = numeral(totalFee).format(`0,0.[${repeatDecimalC8}]`);

                      let reward = network.REWARD;
                      let fee = network.FEE;

                      if (FEE > 0) {
                        reward = FEE.div(2).toFixed(0);
                        fee = FEE.div(2).toFixed(0);
                        totalFee = numeral(C8FEEInMsg).format(`0,0.[${repeatDecimalC8}]`);
                      }

                      if (ext) {
                        ext = `\nReward + Fee ${totalFee} C8`;
                        await socialTrading.distributeReward(
                          order.leader,
                          order.follower,
                          reward,
                          fee,
                          [order.leaderTxHash, '0x0', txHash, '0x0'],
                        );
                      }

                      let msg = `Trade ${amountNetBuyInMsg} ${tokenBuyInMsg} For ${amountNetSellInMsg} ${tokenSellInMsg} ${ext}`;

                      push.sendTransferNotification(maker_token, taker_token, amount_maker, amount_taker, order.leader, order.follower, msg);
                    }

                  } else {
                    client.hgetall('leader:' + maker, async function (err, follow_dict) {   // maker is sell __, buy ETH
                      if (follow_dict !== null) {
                        await Object.keys(follow_dict).forEach(async function (follower) {
                          let allowance = await erc20.allowance(
                            web3,
                            network.carboneum,
                            follower,
                            network.socialtrading //spender address
                          );
                          if (allowance > BENCHMARK_ALLOWANCE_C8) {
                            await processCopyTrade(
                              maker,
                              follower,
                              tokenBuy,
                              tokenSell,
                              amountNetBuy,
                              amountNetSell,
                              amountNetSell,
                              txHash);
                          }
                        });
                      }
                    });

                    client.hgetall('leader:' + taker, async function (err, follow_dict) {   // taker is buy __, sell ETH
                      if (follow_dict !== null) {
                        await Object.keys(follow_dict).forEach(async function (follower) {
                          let allowance = await erc20.allowance(
                            web3,
                            network.carboneum,
                            follower,
                            network.socialtrading //spender address
                          );
                          if (allowance > BENCHMARK_ALLOWANCE_C8) {
                            await processCopyTrade(
                              taker,
                              follower,
                              tokenSell,
                              tokenBuy,
                              amountNetSell,
                              amountNetBuy,
                              amountNetBuy,
                              txHash);
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
    process.exit();
  }
}

_ = watchIDEXTransfers(0);
