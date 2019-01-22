const useRedis = {};

let redis = require("redis"), client = redis.createClient();

useRedis.saveHash = function saveHash(txHash, walletAddress) {
  client.hset('txHash:' + txHash, walletAddress.toLowerCase(), 0);
  client.expire('txHash:' + txHash, 60 * 60 * 24);  //Expire in 24 hrs.
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
