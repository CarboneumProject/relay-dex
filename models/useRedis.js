const useRedis = {};

const config = require('../config');
const network = config.getNetwork();
let redis = require("redis");

useRedis.saveWithdraw = function saveWithdraw(withdrawHash, walletAddress) {
  let client = redis.createClient();
  client.select(network.redis_db);
  client.del("withdrawHash:done:" + withdrawHash);
  client.set("withdrawHash:new:" + withdrawHash, walletAddress.toLowerCase());
  client.expire("withdrawHash:new:" + withdrawHash, 60 * 60 * 24);  //Expire in 24 hrs.
  client.quit();
};

useRedis.markWithdrawed = function markWithdrawed(withdrawHash, walletAddress, txHash, txTarget) {
  let client = redis.createClient();
  client.select(network.redis_db);
  client.del("withdrawHash:new:" + withdrawHash);
  client.set("withdrawHash:done:" + withdrawHash, walletAddress.toLowerCase());

  client.del("withdrawEvent:new:" + txHash);
  client.set("withdrawEvent:done:" + txHash, txTarget);

  client.quit();
};

useRedis.saveEventWithdraw = function saveEventWithdraw(txHash, amountNet){
  let client = redis.createClient();
  client.select(network.redis_db);
  client.set("withdrawEvent:new:" + txHash, amountNet);
  client.expire("withdrawEvent:new:" + txHash, 60 * 60 * 2);  //Expire in 2 hrs.
  client.quit();
};

useRedis.findWalletTarget = async function findWalletTarget(withdrawHash) {
  function findWalletTarget(withdrawHash) {
    let client = redis.createClient();
    client.select(network.redis_db);
    return new Promise(function (resolve, reject) {
      client.get("withdrawHash:new:" + withdrawHash, function (err, values) {
        resolve(values);
      });
      client.quit();
    });
  }
  return await findWalletTarget(withdrawHash);
};

useRedis.saveHash = function saveHash(txHash, walletAddress, amount="0") {
  let client = redis.createClient();
  client.select(network.redis_db);
  client.del("txHash:done:" + txHash);
  client.hset("txHash:new:" + txHash, walletAddress.toLowerCase(), amount);
  client.expire("txHash:new:" + txHash, 60 * 60 * 24);  //Expire in 24 hrs.
  client.quit();
};

useRedis.markDeposited = function markDeposited(txHash, walletAddress) {
  let client = redis.createClient();
  client.select(network.redis_db);
  client.del("txHash:new:" + txHash);
  client.hset("txHash:done:" + txHash, walletAddress.toLowerCase(), 1);
  client.quit();
};

useRedis.removeFailed = function removeFailed(txHash) {
  let client = redis.createClient();
  client.select(network.redis_db);
  client.del("txHash:new:" + txHash);
  client.quit();
};

useRedis.getAmount = async function getAmount(txHash, walletAddress) {
  function getAmountValue(txHash, walletAddress) {
    let client = redis.createClient();
    client.select(network.redis_db);
    return new Promise(function (resolve, reject) {
      client.hget("txHash:new:" + txHash, walletAddress,function (err, values) {
        resolve(values);
      });
      client.quit();
    });
  }
  return await getAmountValue(txHash, walletAddress);
};

useRedis.isValidHash = async function isValidHash(txHash, walletAddress) {
  function getHashValue(txHash, walletAddress) {
    let client = redis.createClient();
    client.select(network.redis_db);
    return new Promise(function (resolve, reject) {
      client.hget("txHash:done:" + txHash, walletAddress,function (err, values) {
        resolve(values);
      });
      client.quit();
    });
  }
  return await getHashValue(txHash, walletAddress);
};

useRedis.getAmountWithdrawNet = async function getAmountWithdrawNet(txHash) {
  function getAmountWithdrawNet(txHash) {
    let client = redis.createClient();
    client.select(network.redis_db);
    return new Promise(function (resolve, reject) {
      client.get("withdrawEvent:new:" + txHash,function (err, values) {
        resolve(values);
      });
      client.quit();
    });
  }
  return await getAmountWithdrawNet(txHash);
};

module.exports = useRedis;
