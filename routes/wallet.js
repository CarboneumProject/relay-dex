const express = require('express');
const relayWallet = require('../models/relayWallet');
const validateSignature = require('../models/validate-signature');
const router = express.Router();
const idex = require("../models/idex");

router.post('/register', async (req, res, next) => {
  try {
    const walletAddress = req.body.walletAddress;
    const signature = req.body.signature;
    const addressSigner = validateSignature(signature);
    if (addressSigner !== walletAddress.toLowerCase()) {
      res.status(400);
      return res.send({'status': 'no'});
    }

    const linkedWallet = relayWallet.getUserWalletProvider(walletAddress).addresses[0];
    return res.send({'walletAddress': walletAddress, 'linkedAddress': linkedWallet});
  } catch (e) {
    console.error(e);
    return next(e);
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
      return res.send({'status': 'no', 'message': 'Invalid withdrawal signature.'});
    }

    const mappedAddressProvider = relayWallet.getUserWalletProvider(walletAddress);
    idex.withdraw(mappedAddressProvider, tokenAddress, amount).then((respond) => {
      if (respond){
        console.log(respond);
        return res.send({'status': respond.status, 'message': respond.message});
      } else {
        return res.send({'status': 'failed', 'message': 'Please contact admin.'});
      }
      });
    // TODO Transfer to user address.

  } catch (e) {
    console.error(e);
    return next(e);
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
      return res.send({'status': 'no', 'message': 'Invalid withdrawal signature.'});
    }

    idex.getDepositAmount(walletAddress, txHash).then((response) => {
      if (response) {
        return res.send({'status': 'ok', 'message': 'success'});
      } else {
        res.status(400);
        return res.send({'status': 'no', 'message': 'failed.'});
      }
    });
  } catch (e) {
    console.error(e);
    return res.send({'status': 'failed', 'message': 'Please contact admin.'});
  }
});

module.exports = router;
