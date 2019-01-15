const useRedis = {};

let redis = require("redis"), client = redis.createClient();

useRedis.saveHash = function saveHash(txHash, walletAddress) {
  client.hset('txHash:' + txHash, walletAddress.toLowerCase(), 0);
};

useRedis.markDeposited = function markDeposited(txHash, walletAddress) {
  client.hset('txHash:' + txHash, walletAddress.toLowerCase(), 1);
};

useRedis.isValidHash = async function isValidHash(txHash, walletAddress) {
  function getHashValue(txHash, walletAddress) {
    return new Promise(function (resolve, reject) {
      client.hget('txHash:' + txHash, walletAddress,function (err, values) {
        resolve(values)
      });
    });
  }
  return await getHashValue(txHash, walletAddress);
};

module.exports = useRedis;
