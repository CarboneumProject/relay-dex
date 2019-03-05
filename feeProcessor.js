const BigNumber = require('bignumber.js');
const Trade = require('./models/trade');
const PROFIT_PERCENTAGE = 0.1;

const feeProcessor = {};
feeProcessor.processPercentageFee = async function (openTrades, copyOrder, closeTrade, c8LastPrice, c8Decimals) {
  let sub_amountLeft = new BigNumber(closeTrade.amount_taker);// sell token, buy ether back
  let tokenSellLastPrice = closeTrade.tokenSellLastPrice;
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
      // TODO get percentage from config.
      let reward = profit.mul(0.9).toFixed(0);
      let fee = profit.mul(0.1).toFixed(0);
      let C8FEE = profit.div(c8LastPrice.mul(10 ** c8Decimals));
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
  return { 'returnArray': [], 'sumC8FEE': new BigNumber(0) };
};

module.exports = feeProcessor;
