require("dotenv").config();

module.exports = {
  HOST: process.env.DB_HOST || "localhost",
  PORT: process.env.DB_PORT || 3308,
  USER: process.env.DB_USER || "root",
  PASSWORD: process.env.DB_PASSWORD || "byfcjx",
  DB: process.env.DB_NAME || "express-server-db",
  dialect: process.env.DB_DIALECT || "mysql",
  dialectOptions: {
    charset: "utf8mb4",
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 5,
    min: parseInt(process.env.DB_POOL_MIN) || 0,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
  },
};
