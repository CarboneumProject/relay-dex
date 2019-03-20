require('babel-core/register');
require('babel-polyfill');
const Web3 = require('web3');
const idex = require('./models/idex');
const Trade = require('./models/trade');
const Order = require('./models/order');
const config = require('./config');
const network = config.getNetwork();
const IDEX_abi = require('./abi/IDEX/exchange.json');
const relayWallet = require('./models/relayWallet');
const socialTrading = require('./models/socialTradingContract');
const redis = require('redis'), client = redis.createClient();
client.select(network.redis_db);

const {promisify} = require('util');
const hgetAsync = promisify(client.hget).bind(client);
const BigNumber = require('bignumber.js');
const numeral = require('numeral');
const push = require('./models/push');
const erc20 = require('./models/erc20');
const feeProcessor = require('./models/feeProcessor');
const abiDecoder = require('abi-decoder');
abiDecoder.addABI(IDEX_abi);

const HDWalletProvider = require('truffle-hdwallet-provider');
const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint);
const infuraProvider = network => providerWithMnemonic(
  process.env.MNEMONIC || config.mnemonic,
  process.env.RPC_URL || `https://${network.name}.infura.io/${process.env.INFURA_API_KEY}`,
);

const BENCHMARK_ALLOWANCE_C8 = new BigNumber(10 ** 18).mul(10000);

let contractAddress_IDEX_1 = network.IDEX_exchange;

async function processCopyTrade(leader, follower, tokenMaker, tokenTaker, amountNetMaker, amountNetTaker, amountNet, txHash) {
  let mappedAddressProvider = relayWallet.getUserWalletProvider(follower);
  let followerWallet = mappedAddressProvider.addresses[0];
  let volAbleTrade = await idex.balance(tokenTaker, followerWallet);
  if (volAbleTrade >= parseInt(amountNet)) {
    let followerOrderHash = await idex.sendOrder(mappedAddressProvider, tokenMaker, tokenTaker, amountNetMaker, amountNetTaker);
    let order = {
      leader: leader,
      follower: follower,
      leader_tx_hash: txHash,
      order_hash: followerOrderHash,
    };
    await Order.insertNewOrder(order);
  } else { // push warn user sufficient fund.
    let tokenTakerInMsg = await hgetAsync('tokenMap:' + tokenTaker, 'token');
    let msg = `Transaction by ${leader} will not be Copy Traded,\nYour balance of ${tokenTakerInMsg} in Copytrade Wallet is not enough.`;
    push.sendInsufficientFund(tokenMaker, tokenTaker, leader, follower, txHash, msg);
  }
  mappedAddressProvider.engine.stop();
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
              await web3.eth.getTransactionReceipt(txHash).then(async (receipt) => {
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
                    const copyOrder = await Order.find(orderHash);
                    if (copyOrder != null) { // Send from IDEXCopyTrading
                      let order_time = new Date((await web3.eth.getBlock(receipt.blockNumber)).timestamp * 1000);
                      let leader = copyOrder.leader;
                      let follower = copyOrder.follower;
                      let maker_token = tokenBuy;
                      let taker_token = tokenSell;
                      let amount_maker = amountNetBuy;
                      let amount_taker = amountNetSell;
                      let amount_left = amountNetBuy;
                      let order_hash = orderHash;
                      let tx_hash = txHash;
                      let leader_tx_hash = copyOrder.leader_tx_hash;

                      if (copyOrder.follower === taker) {
                        maker_token = tokenSell;
                        taker_token = tokenBuy;
                        amount_maker = amountNetSell;
                        amount_taker = amountNetBuy;
                        amount_left = amountNetSell;
                      }

                      const trade = {
                        order_time,
                        leader,
                        follower,
                        maker_token,
                        taker_token,
                        amount_maker,
                        amount_taker,
                        amount_left,
                        order_hash,
                        tx_hash,
                        leader_tx_hash,
                      };

                      let tokenBuyInMsg = await hgetAsync('tokenMap:' + maker_token, 'token');
                      let tokenSellInMsg = await hgetAsync('tokenMap:' + taker_token, 'token');
                      let tokenBuyDecimals = await hgetAsync('tokenMap:' + maker_token, 'decimals');
                      let tokenSellDecimals = await hgetAsync('tokenMap:' + taker_token, 'decimals');
                      let repeatDecimalBuy = '0'.repeat(tokenBuyDecimals);
                      let repeatDecimalSell = '0'.repeat(tokenSellDecimals);
                      let amountNetBuyInMsg = numeral(amountNetBuy / Math.pow(10, tokenBuyDecimals)).format(`0,0.[${repeatDecimalBuy}]`);
                      let amountNetSellInMsg = numeral(amountNetSell / Math.pow(10, tokenSellDecimals)).format(`0,0.[${repeatDecimalSell}]`);

                      if (taker_token === '0x0000000000000000000000000000000000000000') {
                        await Trade.insertNewTrade(trade);

                        socialTrading.distributeRewardOne(
                          leader,
                          follower,
                          network.REWARD,
                          network.FEE,
                          [leader_tx_hash, '0x', tx_hash, '0x'],
                        );

                        //push msg to user
                        let c8Decimals = await hgetAsync('tokenMap:' + network.carboneum, 'decimals');
                        let repeatDecimalC8 = '0'.repeat(c8Decimals);

                        let sumFee = new BigNumber(network.FEE).add(new BigNumber(network.REWARD));
                        let ext = ``;
                        if (sumFee > new BigNumber(0)) {
                          sumFee = sumFee.div(10 ** c8Decimals);
                          let totalFee = numeral(sumFee).format(`0,0.[${repeatDecimalC8}]`);
                          ext = `\nFee ${totalFee} C8`;
                        }

                        let msg = `[BUY] ${amountNetBuyInMsg} ${tokenBuyInMsg} by ${amountNetSellInMsg} ${tokenSellInMsg}  ${ext}`;
                        push.sendTradeNotification(maker_token, taker_token, amount_maker, amount_taker, copyOrder.leader, copyOrder.follower, msg);
                      } else if (maker_token === '0x0000000000000000000000000000000000000000') {

                        let tokenSellLastPrice = new BigNumber(amount_maker).div(amount_taker);
                        let openTrades = await Trade.getAvailableTrade(taker_token, follower);

                        const closeTrade = {
                          tokenBuyDecimals,
                          tokenSellDecimals,
                          amount_taker,
                          amount_maker,
                          txHash,
                          tokenSellLastPrice,
                          leader,
                        };
                        let c8LastPrice = await idex.getC8LastPrice('ETH_C8');  // 1 C8 = x ETH
                        c8LastPrice = new BigNumber(c8LastPrice);
                        let c8Decimals = await hgetAsync('tokenMap:' + network.carboneum, 'decimals');
                        let repeatDecimalC8 = '0'.repeat(c8Decimals);
                        let returnObj = await feeProcessor.percentageFee(openTrades, copyOrder, closeTrade, c8LastPrice);

                        //update db
                        let updateAmounts = returnObj.updateAmounts;
                        updateAmounts.forEach(async function (order) {
                          await Trade.updateAmountLeft(order.amountLeft, order.orderId);
                        });

                        //call social contract's distribute reward
                        socialTrading.distributeRewardOne(
                          leader,
                          follower,
                          network.REWARD,
                          network.FEE,
                          [leader_tx_hash, '0x', tx_hash, '0x'],
                        );

                        //push msg to user
                        let sumFee = new BigNumber(network.FEE).add(new BigNumber(network.REWARD));
                        let ext = ``;
                        if (sumFee > new BigNumber(0)) {
                          sumFee = sumFee.div(10 ** c8Decimals);
                          let totalFee = numeral(sumFee).format(`0,0.[${repeatDecimalC8}]`);
                          ext = `\nFee ${totalFee} C8`;
                        }

                        let msg = `[SELL] ${amountNetSellInMsg} ${tokenSellInMsg} for ${amountNetBuyInMsg} ${tokenBuyInMsg} ${ext}`;
                        push.sendTradeNotification(maker_token, taker_token, amount_maker, amount_taker, copyOrder.leader, copyOrder.follower, msg);
                      }
                    } else {
                      client.hgetall('leader:' + maker, async function (err, follow_dict) {   // maker is sell __, buy ETH
                        if (follow_dict !== null) {
                          await Object.keys(follow_dict).forEach(async function (follower) {
                            let provider = infuraProvider(process.env.NETWORK || network.name);
                            let allowance = await erc20.allowance(
                              provider,
                              network.carboneum,
                              follower,
                              network.socialtrading, //spender address
                            );
                            provider.engine.stop();

                            if (new BigNumber(allowance) > BENCHMARK_ALLOWANCE_C8) {
                              await processCopyTrade(
                                maker,
                                follower,
                                tokenBuy,
                                tokenSell,
                                amountNetBuy,
                                amountNetSell,
                                amountNetSell,
                                txHash);
                            } else {
                              //Inform user to Adjust allowance
                              let msg = `Please adjust allowance of C8 for be able to transfer a token.`;
                              push.sendAdjustC8Allowance(copyOrder.follower, msg);
                            }
                          });
                        }
                      });

                      client.hgetall('leader:' + taker, async function (err, follow_dict) {   // taker is buy __, sell ETH
                        if (follow_dict !== null) {
                          await Object.keys(follow_dict).forEach(async function (follower) {
                            let provider = infuraProvider(process.env.NETWORK || network.name);
                            let allowance = await erc20.allowance(
                              provider,
                              network.carboneum,
                              follower,
                              network.socialtrading, //spender address
                            );
                            provider.engine.stop();
                            if (new BigNumber(allowance) > BENCHMARK_ALLOWANCE_C8) {
                              await processCopyTrade(
                                taker,
                                follower,
                                tokenSell,
                                tokenBuy,
                                amountNetSell,
                                amountNetBuy,
                                amountNetBuy,
                                txHash);
                            } else {
                              //Inform user to Adjust allowance
                              let msg = `Please adjust allowance of C8 for be able to transfer a token.`;
                              push.sendAdjustC8Allowance(copyOrder.follower, msg);
                            }
                          });
                        }
                      });
                    }
                  }
                }
              }).catch((e) => {
                console.log(e, ' error');
                process.exit();
              });

            }
          }
        });
        console.log(blockNumber);
        blockNumber++;
        client.hset('lastBlock', 'IDEXCopyTrading', blockNumber);
      }
    }, 15 * 1000);
  } catch (e) {
    console.log(e, ' error');
    process.exit();
  }
}

_ = watchIDEXTransfers(0);
