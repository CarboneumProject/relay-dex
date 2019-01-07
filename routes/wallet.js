const express = require('express');
const relayWallet = require('../models/relayWallet');
const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const walletAddress = req.body.walletAddress;
    const signature = req.body.signature;
    // TODO check signature.
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
    // TODO check signature.
    const provider = relayWallet.getUserWalletProvider(walletAddress);
    // TODO Withdraw from IDEX
    // TODO Transfer to user address.
    return res.send({'status': 'ok'});
  } catch (e) {
    console.error(e);
    return next(e);
  }
});

module.exports = router;
