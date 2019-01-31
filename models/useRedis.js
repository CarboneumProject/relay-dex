const useRedis = {};

let redis = require("redis");

useRedis.saveHash = function saveHash(txHash, walletAddress) {
  let client = redis.createClient();
  client.del("txHash:done:" + txHash);
  client.hset('txHash:new:' + txHash, walletAddress.toLowerCase(), 0);
  client.expire('txHash:new:' + txHash, 60 * 60 * 24);  //Expire in 24 hrs.
  client.quit();
};

useRedis.markDeposited = function markDeposited(txHash, walletAddress) {
  let client = redis.createClient();
  client.del("txHash:new:" + txHash);
  client.hset('txHash:done:' + txHash, walletAddress.toLowerCase(), 1);
  client.quit();
};

useRedis.isValidHash = async function isValidHash(txHash, walletAddress) {
  function getHashValue(txHash, walletAddress) {
    let client = redis.createClient();
    return new Promise(function (resolve, reject) {
      client.hget('txHash:done:' + txHash, walletAddress,function (err, values) {
        resolve(values)
      });
      client.quit();
    });
  }
  return await getHashValue(txHash, walletAddress);
};

module.exports = useRedis;
