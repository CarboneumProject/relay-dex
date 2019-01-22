const logToFile = {};

const {transports, createLogger, format} = require('winston');

logToFile.writeLog = function writeLog(data) {
  const logger = createLogger({
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: [
      new transports.Console(),
      new transports.File({filename: 'logs/error.log', level: 'error'}),
      new transports.File({filename: 'logs/activity.log', level: 'info'})
    ]
  });
  logger.info(data);
};

module.exports = logToFile;
