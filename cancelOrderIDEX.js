const order = require('./models/order');
const idex = require('./models/idex');
const relayWallet = require('./models/relayWallet');
const push = require('./models/push');
const numeral = require('numeral');

const RANGETIMESTAMP = 8 * 60 * 60; // 8 hour (28,800 sec)
async function getOrder() {
  const delay = ms => new Promise(res => setTimeout(res, ms));
  let orderHash = await order.getOrderhashForCancel();

  for (let i = 0; i < orderHash.length; i++) {
      await main(orderHash[i].order_hash, orderHash[i].id, orderHash[i].follower);
    }
    await delay(5000).then(()=>{process.exit()});
}

async function main(orderHash, id, walletAddress) {
  let mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);

  let respond = await idex.getOrderStatus(orderHash);
  if(respond.status === 'no'){
    console.log('error: ', respond.message);
    await order.updateCancelOrder('x', id);
  } else {
    let ordered = respond.message;
    let status = ordered.status;
    let timestampOrder = ordered.timestamp;
    let nonce = ordered.params.nonce;

    let tokenBuy = ordered.params.buySymbol;
    let tokenSell = ordered.params.sellSymbol;
    let amountNetBuy = ordered.params.amountBuy;
    let amountNetSell = ordered.params.amountSell;
    let tokenBuyDecimals = ordered.params.buyPrecision;
    let tokenSellDecimals = ordered.params.sellPrecision;
    let repeatDecimalBuy = '0'.repeat(tokenBuyDecimals);
    let repeatDecimalSell = '0'.repeat(tokenSellDecimals);
    let amountNetBuyInMsg = numeral(amountNetBuy / Math.pow(10, tokenBuyDecimals)).format(`0,0.[${repeatDecimalBuy}]`);
    let amountNetSellInMsg = numeral(amountNetSell / Math.pow(10, tokenSellDecimals)).format(`0,0.[${repeatDecimalSell}]`);



    let msg = `Order: Buy ${tokenBuy} ${amountNetBuyInMsg} by ${amountNetSellInMsg} ${tokenSell} ${ext}`;
    if (tokenSell !== 'ETH') {
      msg = `Order: Sell ${amountNetSellInMsg} ${tokenSell} for ${amountNetBuyInMsg} ${tokenBuy} ${ext}`;
    }

    let timestampNow = Math.round(new Date().getTime()/1000);
    if (status === 'open') {
      if (timestampNow - timestampOrder > RANGETIMESTAMP) {
        idex.cancelOrder(mappedAddressProvider, orderHash, nonce, id, walletAddress, msg);
        mappedAddressProvider.engine.stop()
      }
    } else if (status === 'cancelled'){
      await order.updateCancelOrder('1', id);
    }
    else if (status === 'complete'){
      await order.updateCancelOrder('0', id);
    }
    else {
      console.log('not handle')
    }
    mappedAddressProvider.engine.stop();
  }
}

getOrder();


