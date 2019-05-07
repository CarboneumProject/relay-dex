const unrealized = {};

const idex = require("../models/idex");
const trade = require('../models/trade');
const rp = require('request-promise');
const redis = require('redis');
const config = require('../config');
const network = config.getNetwork();
const {promisify} = require('util');
const BigNumber = require('bignumber.js');


async function getAvgPrice(obj) {
  let symbol = obj[0];
  let token = obj[1];
  let owner = obj[2];
  let tokenDecimal = obj[3];

  let position = await trade.getAvailableTrade(token, owner);
  let openedPosition = position.length;
  if (openedPosition > 0) {
    let divider = new BigNumber(0);
    let divisor = new BigNumber(0);

    for (let i = 0; i < openedPosition; i++) {
      let openOrder = position[i];
      let lastAmount = new BigNumber(openOrder.amount_left);
      let avg = new BigNumber(openOrder.amount_taker).div(openOrder.amount_maker).mul(new BigNumber(10 ** (tokenDecimal-18)));
      divider = divider.add(avg.mul(lastAmount));
      divisor = divisor.add(lastAmount);
    }
    return [symbol, divider.div(divisor).toFixed(18)];
  } else {
    return [symbol, null];
  }

}

async function getLastPrice(tokenList) {
  const nextNonce = await {
    method: 'GET',
    url: 'https://api.carbonradars.io/radars/v1.0/Favorite/get_favorite_coin_list',
    qs:
      {
        exchange: 'idex',
        list: tokenList,
      },
  };
  return await rp(nextNonce);
}


async function getLinkedWalletBalance(linkedWallet) {
  let a = await idex.getCompleteBalance(linkedWallet);  // Linked-Wallet
  let tokenList = [];

  await Object.keys(a).forEach(function (token) {
    tokenList.push(token + '/ETH');
    a[token].avg = null;
    a[token].last = null;
    a[token].percent = null;
  });

  let qs = "[\"" + tokenList.join(("\",\"")) + "\"]";
  return [qs, a]
}


unrealized.returnCompleteBalances = async function returnCompleteBalances(myWallet, linkedWallet) {
  let client = redis.createClient();
  client.select(network.redis_db);
  const hgetAsync = promisify(client.hget).bind(client);

  let [appendList, balance] =  await getLinkedWalletBalance(linkedWallet);

  let lastPriceTokens = JSON.parse(await getLastPrice(appendList));
  Object.keys(lastPriceTokens).forEach(function (token) {
    let tokenSymbol = lastPriceTokens[token].symbol;
    let tokenName = tokenSymbol.replace('/ETH', '');
    balance[tokenName].last = lastPriceTokens[token].price;
  });

  let obj = await trade.allToken(myWallet);

  let pending = [];

  for (let i = 0; i < obj.length; i++) {
    let tokenAddress = obj[i].maker_token;
    let symbol = await hgetAsync('tokenMap:' + tokenAddress, 'token');
    if (isNaN(symbol)) {
      let tokenSellDecimal = await hgetAsync('tokenMap:' + tokenAddress, 'decimals');
      pending.push([symbol, tokenAddress, myWallet, tokenSellDecimal]);
    }
  }

  const promises = await pending.map(getAvgPrice);
  let res = await Promise.all(promises);
  for (let i = 0; i < res.length; i++) {
    let symbol = res[i][0];
    let avgPrice = res[i][1];
    try {
      let lastPrice = balance[symbol].last;
      balance[res[i][0]].avg = avgPrice;
      balance[res[i][0]].percent = ((lastPrice - avgPrice) / avgPrice * 100).toFixed(2)
    } catch (e) {

    }

  }
  client.quit();
  return balance;
};


module.exports = unrealized;
