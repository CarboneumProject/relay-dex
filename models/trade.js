const mysql = require("./mysql");
const trade = {};

trade.getAvailableTrade = async function getAvailableTrade(token, owner) {
  return await mysql.query(`
    SELECT *
    FROM carboneum.trade
    WHERE  maker_token = ? AND follower = ? AND amount_left != '0'
    ORDER BY order_time ASC
  `, [token, owner]);
};

trade.updateAmountLeft = async function updateAmountLeft(amount_left, id) {
  return await mysql.query(`
    UPDATE carboneum.trade SET amount_left = ? WHERE id = ?
  `, [amount_left, id]);
};

trade.insertNewTrade = async function insertNewTrade(args) {
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
  `, [args.order_time,
      args.leader,
      args.follower,
      args.maker_token,
      args.taker_token,
      args.amount_maker,
      args.amount_taker,
      args.amount_left,
      args.order_hash,
      args.tx_hash,
  ]);
};


trade.save = async function save(values) {
  return await mysql.query(`
    INSERT INTO carboneum.orderHash VALUES ?;
  `, values);
};

trade.find = async function find(orderHash) {
  return await mysql.query(`
    SELECT * FROM carboneum.orderHash WHERE orderHash = ?
  `, [txHash]);
};

module.exports = trade;
