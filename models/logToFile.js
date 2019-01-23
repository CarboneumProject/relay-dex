const logToFile = {};
const path = require('path');
const {transports, createLogger, format} = require('winston');

logToFile.writeLog = function writeLog(filename, data) {
  const logger = createLogger({
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: [
      new transports.Console(),
      new transports.File({filename: path.join(__dirname, '../logs/error.log'), level: 'error'}),
      new transports.File({filename: path.join(__dirname, '../logs/activity.log'), level: 'info'})
    ]
  });
  logger.info('[' + filename + '] ' + data);
};

module.exports = logToFile;