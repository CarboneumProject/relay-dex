const mysql = require("./mysql");
const order = {};

order.insertNewOrder = async function insertNewOrder(order) {
  return await mysql.query(`
    INSERT INTO carboneum.sent_order (
        leader,
        follower,
        leader_tx_hash,
        order_hash
    )
    VALUES (?, ?, ?, ?)
  `, [order.leader,
    order.follower,
    order.leader_tx_hash,
    order.order_hash,
  ]);
};


order.find = async function find(orderHash) {
  return (await mysql.query(`
    SELECT * FROM carboneum.sent_order WHERE order_hash = ?
  `, [orderHash]))[0];
};

module.exports = order;