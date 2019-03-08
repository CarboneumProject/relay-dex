const useRedis = {};

let redis = require("redis");

useRedis.saveWithdraw = function saveWithdraw(withdrawHash, walletAddress, amount="0") {
  let client = redis.createClient();
  client.del("withdrawHash:done:" + withdrawHash);
  client.hset("withdrawHash:new:" + withdrawHash, walletAddress.toLowerCase(), amount);
  client.expire("withdrawHash:new:" + withdrawHash, 60 * 60 * 24);  //Expire in 24 hrs.
  client.quit();
};

useRedis.markWithdrawed = function markWithdrawed(withdrawHash, walletAddress) {
  let client = redis.createClient();
  client.del("withdrawHash:new:" + withdrawHash);
  client.hset("withdrawHash:done:" + withdrawHash, walletAddress.toLowerCase(), 1);
  client.quit();
};

useRedis.findWithdraw = async function findWithdraw(withdrawHash, walletAddress) {
  function findWithdraw(withdrawHash, walletAddress) {
    let client = redis.createClient();
    return new Promise(function (resolve, reject) {
      client.hget("withdrawHash:new:" + withdrawHash, walletAddress,function (err, values) {
        resolve(values);
      });
      client.quit();
    });
  }
  return await findWithdraw(withdrawHash, walletAddress);
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

useRedis.getAmount = async function getAmount(txHash, walletAddress) {
  function getAmountValue(txHash, walletAddress) {
    let client = redis.createClient();
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
    return new Promise(function (resolve, reject) {
      client.hget("txHash:done:" + txHash, walletAddress,function (err, values) {
        resolve(values);
      });
      client.quit();
    });
  }
  return await getHashValue(txHash, walletAddress);
};

module.exports = useRedis;
