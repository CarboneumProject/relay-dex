const useRedis = {};

let redis = require("redis"), client = redis.createClient();

useRedis.saveHash = function saveHash(txHash, walletAddress) {
  client.hset('txHash:' + txHash, walletAddress, 0);
};

useRedis.markDeposited = function markDeposited(txHash, walletAddress) {
  client.hset('txHash:' + txHash, walletAddress, 1);
};

module.exports = useRedis;
