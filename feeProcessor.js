const BigNumber = require('bignumber.js');
const Trade = require('./models/trade');
const idex = require('./models/idex');
const config = require('./config');

const redis = require('redis'), client = redis.createClient();
const { promisify } = require('util');
const hgetAsync = promisify(client.hget).bind(client);
const network = config.getNetwork();
const feeProcessor = {};
const PROFIT_PERCENTAGE = 0.1;
feeProcessor.processPercentageFee = async function processPercentageFee (openTrades, copyOrder, closeTrade) {

  let sub_amountLeft = new BigNumber(closeTrade.amount_taker);// sell token, buy ether back
  let tokenSellLastPrice = closeTrade.tokenSellLastPrice;

  let C8LastPrice = await idex.getC8LastPrice('ETH_C8');  // 1 C8 = x ETH
  C8LastPrice = new BigNumber(C8LastPrice);
  let c8Decimals = await hgetAsync('tokenMap:' + network.carboneum, 'decimals');
  let sumC8FEE = new BigNumber(0);
  let returnArray = [];

  for (let i = 0; i < openTrades.length && sub_amountLeft > 0; i++) {
    let openOrder = openTrades[i];
    let lastAmount = new BigNumber(openOrder.amount_left);
    sub_amountLeft = sub_amountLeft.sub(lastAmount);
    let avg = new BigNumber(openOrder.amount_taker).div(openOrder.amount_maker);

    let profit = new BigNumber(0);
    if (sub_amountLeft >= 0) {
      await Trade.updateAmountLeft('0', openOrder.id);
      profit = (tokenSellLastPrice.sub(avg)).mul(PROFIT_PERCENTAGE).mul(lastAmount);
    } else {
      await Trade.updateAmountLeft(sub_amountLeft.abs().toFixed(0), openOrder.id);
      profit = (tokenSellLastPrice.sub(avg)).mul(PROFIT_PERCENTAGE).mul(lastAmount.add(sub_amountLeft));
    }

    if (avg < tokenSellLastPrice) {
      let reward = profit.mul(0.9).toFixed(0);
      let fee = profit.mul(0.1).toFixed(0);
      let C8FEE = profit.div(C8LastPrice.mul(10 ** c8Decimals));
      sumC8FEE.add(C8FEE);

      returnArray.push([{
        'C8FEE': C8FEE,
        'leader': copyOrder.leader,
        'follower': copyOrder.follower,
        'reward': reward,
        'relayFee': fee,
        'orderHashes': [openOrder.leader_tx_hash,
          copyOrder.leader_tx_hash,
          openOrder.tx_hash,
          closeTrade.txHash],
      }]);
    } else {
      returnArray.push([{
        'C8FEE': new BigNumber(0),
        'leader': copyOrder.leader,
        'follower': copyOrder.follower,
        'reward': 0,
        'relayFee': 0,
        'orderHashes': [openOrder.leader_tx_hash,
          copyOrder.leader_tx_hash,
          openOrder.tx_hash,
          closeTrade.txHash],
      }]);
    }
  }
  return { 'returnArray': returnArray, 'sumC8FEE': sumC8FEE };
};

module.exports = feeProcessor;
