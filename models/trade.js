const mysql = require('./mysql');
const trade = {};

trade.getAvailableTrade = async function getAvailableTrade (token, owner) {
  return await mysql.query(`
    SELECT *
    FROM carboneum.trade
    WHERE  maker_token = ? AND follower = ? AND amount_left != '0'
    ORDER BY order_time ASC
  `, [token, owner]);
};

trade.updateAmountLeft = async function updateAmountLeft (amount_left, id) {
  return await mysql.query(`
    UPDATE carboneum.trade SET amount_left = ? WHERE id = ?
  `, [amount_left, id]);
};

trade.insertNewTrade = async function insertNewTrade (trade) {
  return await mysql.query(`
    INSERT INTO carboneum.trade (order_time,
                                 leader,
                                 follower,
                                 maker_token,
                                 taker_token,
                                 amount_maker,
                                 amount_taker,
                                 amount_left,
                                 order_hash,
                                 tx_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [trade.order_time,
    trade.leader,
    trade.follower,
    trade.maker_token,
    trade.taker_token,
    trade.amount_maker,
    trade.amount_taker,
    trade.amount_left,
    trade.order_hash,
    trade.tx_hash,
  ]);
};

trade.find = async function find (orderHash) {
  return (await mysql.query(`
    SELECT * FROM carboneum.orderHash WHERE orderHash = ?
  `, [orderHash]))[0];
};

module.exports = trade;
