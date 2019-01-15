const relayWallet = require('./models/relayWallet');
const idex = require("./models/idex");
const useRedis = require('./models/useRedis');

let redis = require("redis"), client = redis.createClient();

client.keys("txHash:*", function (err, txHash_dict) {
  if (txHash_dict !== null) {
    Object.keys(txHash_dict).forEach(function (row) {
      let txHash = txHash_dict[row].split("txHash:")[1];
      idex.verifyTxHash(txHash).then((res) => {
        if (res) {
          let [walletAddress, wei] = res;
          console.log(res, walletAddress, wei);
          useRedis.isValidHash(txHash, walletAddress.toLowerCase()).then((response) => {
            if (response === '0'){
              console.log(txHash, ': is depositing.');
              useRedis.markDeposited(txHash, walletAddress);
              const mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);

              idex.depositEth(mappedAddressProvider, wei).then((respond) => {
                if (respond) {
                  console.log({'status': 'ok', 'message': 'success'});
                } else {
                  console.log({'status': 'no', 'message': 'Please contact admin.'});
                }
              });
              //TODO Deposit tokens


            }else if (response === '1'){
              console.log(txHash, ': have been deposited.');
            } else {
              console.log('Not found.');
            }
          });

        } else {
          console.log(res, 'Invalid signature');
        }
      });
    });
  }
});




