const express = require('express');
const relayWallet = require('../models/relayWallet');
const validateSignature = require('../models/validate-signature');
const router = express.Router();
const idex = require("../models/idex");
const erc20 = require("../models/erc20");
const transfer = require("../models/transfer");
const logToFile = require("../models/logToFile");

const IDEX_FEE = 0.95;  // MAX IDEX WITHDRAW FEE = 5%

Number.prototype.noExponents = function () {
  var data = String(this).split(/[eE]/);
  if (data.length === 1) return data[0];

  var z = '', sign = this < 0 ? '-' : '',
    str = data[0].replace('.', ''),
    mag = Number(data[1]) + 1;

  if (mag < 0) {
    z = sign + '0.';
    while (mag++) z += '0';
    return z + str.replace(/^\-/, '');
  }
  mag -= str.length;
  while (mag--) z += '0';
  return str + z;
};

router.post('/register', async (req, res, next) => {
  try {
    const walletAddress = req.body.walletAddress;
    const signature = req.body.signature;
    const addressSigner = validateSignature(signature);
    if (addressSigner !== walletAddress.toLowerCase()) {
      res.status(400);
      return res.send({'status': 'no','message': 'Invalid signature.'});
    }

    const linkedWallet = relayWallet.getUserWalletProvider(walletAddress).addresses[0];
    return res.send({'walletAddress': walletAddress, 'linkedAddress': linkedWallet});
  } catch (e) {
    console.error(e);
    res.status(500);
    return res.send({'status': 'no','message': e.message});
  }
});

router.post('/withdraw', async (req, res, next) => {
  try {
    const walletAddress =  req.body.walletAddress;
    const tokenAddress = req.body.tokenAddress;
    const amount = req.body.amount;
    const signature = req.body.signature;
    const addressSigner = validateSignature(signature);
    if (addressSigner !== walletAddress.toLowerCase()) {
      res.status(400);
      logToFile.writeLog('withdraw', signature + ' ' + walletAddress + ' ' + 'Invalid signature.');
      return res.send({'status': 'no', 'message': 'Invalid signature.'});
    }

    const mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);
    idex.withdraw(mappedAddressProvider, tokenAddress, amount).then((respond) => {
      if (respond){
        if (respond.status === 'yes'){
          res.status(200);
          res.send({'status': respond.status, 'message': respond.message});
          if (tokenAddress === '0x0000000000000000000000000000000000000000') {
            transfer.sendEth(
              mappedAddressProvider,
              mappedAddressProvider.addresses[0],
              walletAddress,
              Number(Math.floor(amount * IDEX_FEE)).noExponents()
            );
          } else {
            erc20.transfer(
              mappedAddressProvider,
              tokenAddress,
              walletAddress,
              Number(Math.floor(amount * IDEX_FEE)).noExponents()
            );
          }
          logToFile.writeLog('withdraw', tokenAddress + ' ' + walletAddress + ' ' + amount + ' Success.');
        } else {
          res.status(400);
          res.send({'status': respond.status, 'message': respond.message});
          logToFile.writeLog('withdraw', tokenAddress + ' ' + walletAddress + ' ' + amount + ' Failed.');
        }

      } else {
        logToFile.writeLog('withdraw', tokenAddress + ' ' + walletAddress + ' ' + amount + ' Please contact admin.');
        res.status(400);
        return res.send({'status': 'no', 'message': 'Please contact admin.'});
      }
      });
  } catch (e) {
    logToFile.writeLog('withdraw', 'Failed.' + ' ' + e.message);
    res.status(500);
    console.error(e);
    return res.send({'status': 'no', 'message': e.message});
  }
});

router.post('/deposit_idex', async (req, res, next) => {
  try {
    const walletAddress =  req.body.walletAddress.toLowerCase();
    const tokenAddress = req.body.tokenAddress.toLowerCase();
    const txHash = req.body.txHash;
    const signature = req.body.signature;
    const addressSigner = validateSignature(signature);
    if (addressSigner !== walletAddress) {
      res.status(400);
      logToFile.writeLog('deposit', signature + ' ' + walletAddress + ' ' + 'Invalid signature.');
      return res.send({'status': 'no', 'message': 'Invalid signature.'});
    }

    idex.getDepositAmount(walletAddress, txHash).then((response) => {
      let [status, errorMsg] = response;
      if (status) {
        logToFile.writeLog('deposit', txHash + ' ' + walletAddress + ' ' + 'Success.');
        return res.send({'status': 'yes', 'message': 'success'});
      } else {
        logToFile.writeLog('deposit', txHash + ' ' + walletAddress + ' ' + 'Fail.' + errorMsg);
        res.status(400);
        return res.send({'status': 'no', 'message': errorMsg});
      }
    });
  } catch (e) {
    console.error(e);
    logToFile.writeLog('deposit', 'Failed.' + ' ' + e.message);
    res.status(500);
    return res.send({'status': 'no', 'message': e.message});
  }
});

router.post('/deposit_idex_amount', async (req, res, next) => {
  try {
    const walletAddress =  req.body.walletAddress.toLowerCase();
    const tokenAddress = req.body.tokenAddress.toLowerCase();
    const amount = req.body.amount;
    const txHash = req.body.txHash;
    const signature = req.body.signature;
    const addressSigner = validateSignature(signature);
    if (addressSigner !== walletAddress) {
      res.status(400);
      logToFile.writeLog('deposit_amount', signature + ' ' + walletAddress + ' ' + amount + ' Invalid signature.');
      return res.send({'status': 'no', 'message': 'Invalid signature.'});
    }

    idex.getDepositAmount(walletAddress, txHash, amount).then((response) => {
      let [status, errorMsg] = response;
      if (status) {
        logToFile.writeLog('deposit_amount', txHash + ' ' + walletAddress + ' ' + amount + ' Success.');
        return res.send({'status': 'yes', 'message': 'success'});
      } else {
        logToFile.writeLog('deposit_amount', txHash + ' ' + walletAddress + ' ' + amount + ' Fail.' + errorMsg);
        res.status(400);
        return res.send({'status': 'no', 'message': errorMsg});
      }
    });
  } catch (e) {
    console.error(e);
    logToFile.writeLog('deposit_amount', 'Failed.' + ' ' + e.message);
    res.status(500);
    return res.send({'status': 'no', 'message': e.message});
  }
});

module.exports = router;
