const express = require('express');
const relayWallet = require('../models/relayWallet');
const validateSignature = require('../models/validate-signature');
const router = express.Router();

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
    const nonce = req.body.nonce;
    const signature = req.body.signature;
    const addressSigner = validateSignature(signature);
    if (addressSigner !== walletAddress.toLowerCase()) {
      res.status(400);
      return res.send({'status': 'no'});
    }

    const provider = relayWallet.getUserWalletProvider(walletAddress);
    // TODO Withdraw from IDEX
    // TODO Transfer to user address.
    return res.send({'status': 'ok'});
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

router.post('/deposit_idex', async (req, res, next) => {
  try {
    const walletAddress =  req.body.walletAddress;
    const tokenAddress = req.body.tokenAddress;
    const txHash = req.body.txHash;
    const signature = req.body.signature;
    const addressSigner = validateSignature(signature);
    if (addressSigner !== walletAddress.toLowerCase()) {
      res.status(400);
      return res.send({'status': 'no'});
    }

    const provider = relayWallet.getUserWalletProvider(walletAddress);
    // TODO wait for transaction complete.
    // TODO deposit to idex.
    return res.send({'status': 'ok'});
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

module.exports = router;
