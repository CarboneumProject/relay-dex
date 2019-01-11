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

    const utils = require("../models/utils");
    idex.withdraw(utils.provider, tokenAddress, amount).then((respond) => {
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

module.exports = router;
