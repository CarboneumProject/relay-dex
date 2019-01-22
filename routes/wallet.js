const express = require('express');
const relayWallet = require('../models/relayWallet');
const validateSignature = require('../models/validate-signature');
const router = express.Router();
const idex = require("../models/idex");
const erc20 = require("../models/erc20");
const transfer = require("../models/transfer");
const BN = require('bignumber.js');
const MAX_ALLOWANCE = new BN(10).pow(55).toPrecision();

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
      return res.send({'status': 'no', 'message': 'Invalid signature.'});
    }

    const mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);
    idex.withdraw(mappedAddressProvider, tokenAddress, amount).then((respond) => {
      if (respond){
        console.log(respond);
        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
          transfer.sendEth(mappedAddressProvider, mappedAddressProvider.addresses[0], walletAddress, amount);
        } else {
          erc20.transfer(mappedAddressProvider, tokenAddress, walletAddress, amount);
          //TODO check error.
          return res.send({'status': respond.status, 'message': respond.message});
        }
      } else {
        return res.send({'status': 'no', 'message': 'Please contact admin.'});
      }
      });
  } catch (e) {
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
      return res.send({'status': 'no', 'message': 'Invalid signature.'});
    }

    idex.getDepositAmount(walletAddress, txHash).then((response) => {
      let [status, errorMsg] = response;
      if (status) {
        return res.send({'status': 'yes', 'message': 'success'});
      } else {
        return res.send({'status': 'no', 'message': errorMsg});
      }
    });
  } catch (e) {
    console.error(e);
    return res.send({'status': 'no', 'message': e.message});
  }
});

module.exports = router;
