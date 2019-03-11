const BigNumber = require('bignumber.js');
const config = require('../config');
const network = config.getNetwork();
const PROFIT_PERCENTAGE = network.PROFIT_PERCENTAGE;

const feeProcessor = {};
feeProcessor.percentageFee = async function (openTrades, copyOrder, closeTrade, c8LastPrice) {
  let sub_amountLeft = new BigNumber(closeTrade.amount_taker);// sell token, buy ether back
  let tokenSellLastPrice = closeTrade.tokenSellLastPrice;
  let sumC8FEE = new BigNumber(0);
  let processedFees = [];
  let updateAmounts = [];

  // If openTrades.length === 0 (Start with short-sales token)
  let openedPosition = openTrades.length;
  if (openedPosition > 0) {
    for (let i = 0; i < openedPosition && sub_amountLeft > 0; i++) {
      let openOrder = openTrades[i];
      let lastAmount = new BigNumber(openOrder.amount_left);
      sub_amountLeft = sub_amountLeft.sub(lastAmount);
      let avg = new BigNumber(openOrder.amount_taker).div(openOrder.amount_maker);

      let profit = new BigNumber(0);
      if (sub_amountLeft >= 0) {
        updateAmounts.push({'amountLeft': '0', 'orderId': openOrder.id});
        profit = (tokenSellLastPrice.sub(avg)).mul(PROFIT_PERCENTAGE).mul(lastAmount);
      } else {
        updateAmounts.push({'amountLeft': sub_amountLeft.abs().toFixed(0), 'orderId': openOrder.id});
        profit = (tokenSellLastPrice.sub(avg)).mul(PROFIT_PERCENTAGE).mul(lastAmount.add(sub_amountLeft));
      }

      if (avg < tokenSellLastPrice) {
        let reward = profit.div(c8LastPrice).mul(network.LEADER_REWARD_PERCENT).toFixed(0);
        let fee = profit.div(c8LastPrice).mul(network.SYSTEM_FEE_PERCENT).toFixed(0);
        let C8FEE = profit.div(c8LastPrice);
        sumC8FEE = sumC8FEE.add(C8FEE);

        processedFees.push({
          'C8FEE': C8FEE,
          'leader': copyOrder.leader,
          'follower': copyOrder.follower,
          'reward': reward,
          'relayFee': fee,
          'orderHashes': [openOrder.leader_tx_hash,
            copyOrder.leader_tx_hash,
            openOrder.tx_hash,
            closeTrade.txHash],
          'orderID': openOrder.id,
        });
      } else {
        processedFees.push({
          'C8FEE': new BigNumber(0),
          'leader': copyOrder.leader,
          'follower': copyOrder.follower,
          'reward': 0,
          'relayFee': 0,
          'orderHashes': [openOrder.leader_tx_hash,
            copyOrder.leader_tx_hash,
            openOrder.tx_hash,
            closeTrade.txHash],
          'orderID': openOrder.id,
        });
      }
    }
  } else {
    let reward = new BigNumber(network.REWARD);
    let fee = new BigNumber(network.FEE);
    let C8FEE = reward.add(fee);
    sumC8FEE = sumC8FEE.add(C8FEE);
    processedFees.push({
      'C8FEE': C8FEE,
      'leader': copyOrder.leader,
      'follower': copyOrder.follower,
      'reward': network.REWARD,
      'relayFee': network.FEE,
      'orderHashes': ['0x',
        copyOrder.leader_tx_hash,
        '0x',
        closeTrade.txHash],
    });
  }
  return {'processedFees': processedFees, 'updateAmounts': updateAmounts, 'sumFee': sumC8FEE};

};

module.exports = feeProcessor;