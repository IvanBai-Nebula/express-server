module.exports = {
  HOST: "ivan.black",
  USER: "root",
  PASSWORD: "carediary",
  DB: "express-server-db",
  dialect: "mysql",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
}; 