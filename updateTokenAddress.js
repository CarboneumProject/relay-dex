const config = require('./config');
const network = config.getNetwork();

const rp = require('request-promise');
let redis = require("redis");
let client = redis.createClient();
client.select(network.redis_db);

async function getMapFromIDEX() {
  return await
    rp({
      method: 'POST',
      url: network.IDEX_API_BASE_URL + '/returnCurrencies',
      json: true,
    });
}

getMapFromIDEX().then((data) => {
  Object.keys(data).forEach(function (token) {
    console.log(token, data[token]['name'], data[token]['decimals'], data[token]['address']);
    client.hset("tokenMap:" + data[token]['address'], "name", data[token]['name']);
    client.hset("tokenMap:" + data[token]['address'], "token", token);
    client.hset("tokenMap:" + data[token]['address'], "decimals", data[token]['decimals']);
  });
  client.quit();
});

