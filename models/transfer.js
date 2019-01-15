const transfer = {};
const Web3 = require('web3');

transfer.sendEth = async function sendEth(provider, from, to, value) {
  const web3 = new Web3(provider);
  await web3.eth.sendTransaction(
    {
      to: to,
      from: from,
      value: value
    }, function (err, transactionHash) {
      if (!err)
        console.log(transactionHash + " success");
    });
};

module.exports = transfer;
