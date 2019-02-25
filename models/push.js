const admin = require('firebase-admin');
const serviceAccount = require('../firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const push = {};

push.sendTradeNotification = function sendTradeNotification (tokenBuy, tokenSell, amountBuy, amountSell, leader, follower, msg) {
  let message = {
    data: {
      destination: 'menuportfolio',
      id: leader,
      _tokenBuy: tokenBuy,
      _tokenSell: tokenSell,
      _amountBuy: amountBuy,
      _amountSell: amountSell,
      _leader: leader,
      _follower: follower,
      _msg: msg,
    },
    notification: {
      title: `Copy Traded`,
      body: msg,
    },
    android: {
      ttl: 3600 * 1000, // 1 hour in milliseconds
      priority: 'high',
      notification: {
        title: `Copy Traded`,
        body: msg,
      },
    },
    apns: {
      headers: {
        'apns-priority': '5',
      },
      payload: {
        aps: {
          alert: {
            title: `Copy Traded`,
            body: msg,
          },
        },
      },
    },
    topic: 'copytrade_' + follower,
  };

  // Transfer out
  admin.messaging().send(message).then((response) => {
    // Response is a message ID string.
  }).catch((error) => {
    console.log('Error sending message:', error);
  });
};

module.exports = push;
