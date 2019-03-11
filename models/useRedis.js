const useRedis = {};

let redis = require("redis");

useRedis.saveWithdraw = function saveWithdraw(withdrawHash, walletAddress) {
  let client = redis.createClient();
  client.del("withdrawHash:done:" + withdrawHash);
  client.set("withdrawHash:new:" + withdrawHash, walletAddress.toLowerCase());
  client.expire("withdrawHash:new:" + withdrawHash, 60 * 60 * 24);  //Expire in 24 hrs.
  client.quit();
};

useRedis.markWithdrawed = function markWithdrawed(withdrawHash, walletAddress, txHash, txTarget) {
  let client = redis.createClient();
  client.del("withdrawHash:new:" + withdrawHash);
  client.set("withdrawHash:done:" + withdrawHash, walletAddress.toLowerCase());

  client.del("withdrawEvent:new:" + txHash);
  client.set("withdrawEvent:done:" + txHash, txTarget);

  client.quit();
};

useRedis.saveEventWithdraw = function saveEventWithdraw(txHash, amountNet){
  let client = redis.createClient();
  client.set("withdrawEvent:new:" + txHash, amountNet);
  client.expire("withdrawEvent:new:" + txHash, 60 * 60 * 2);  //Expire in 2 hrs.
  client.quit();
};

useRedis.saveHash = function saveHash(txHash, walletAddress, amount="0") {
  let client = redis.createClient();
  client.del("txHash:done:" + txHash);
  client.hset("txHash:new:" + txHash, walletAddress.toLowerCase(), amount);
  client.expire("txHash:new:" + txHash, 60 * 60 * 24);  //Expire in 24 hrs.
  client.quit();
};

useRedis.markDeposited = function markDeposited(txHash, walletAddress) {
  let client = redis.createClient();
  client.del("txHash:new:" + txHash);
  client.hset("txHash:done:" + txHash, walletAddress.toLowerCase(), 1);
  client.quit();
};

useRedis.removeFailed = function removeFailed(txHash) {
  let client = redis.createClient();
  client.del("txHash:new:" + txHash);
  client.quit();
};

module.exports = useRedis;
