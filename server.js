const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./models");
const setupSwagger = require("./swagger-api.js"); // 引入 Swagger 设置函数

const app = express();

// 配置 CORS
var corsOptions = {
  origin: "http://localhost:8081"
};
app.use(cors(corsOptions));

// 解析 Content-Type 为 application/json 的请求
app.use(bodyParser.json());

// 解析 Content-Type 为 application/x-www-form-urlencoded 的请求
app.use(bodyParser.urlencoded({ extended: true }));

// 同步数据库模型
db.sequelize.sync({ force: true }).then(() => {
  console.log("已同步数据库模型");
  // 开发环境可以添加初始数据 (种子数据)
  // seedData();
}).catch((err) => {
  console.error("无法同步数据库模型:", err);
});

// 简单路由
app.get("/", (req, res) => {
  res.json({ message: "欢迎使用医疗知识学习平台 API" });
});

// 加载路由
require("./routes/auth.routes")(app);
require("./routes/user.routes")(app);
require("./routes/staff.routes")(app);
require("./routes/medicalCategory.routes")(app);
require("./routes/knowledgeArticle.routes")(app);
require("./routes/learningExperience.routes")(app);
require("./routes/tag.routes")(app);
require("./routes/notification.routes")(app);
require("./routes/admin.routes")(app);

// 在所有业务路由之后，但在 app.listen() 之前，设置 Swagger
setupSwagger(app);

// 设置监听端口
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

// 处理未捕获的异常，防止应用崩溃
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  // 在生产环境中，可能需要将错误记录到日志并通知管理员
});

// 处理未处理的 Promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise rejection:', reason);
  // 在生产环境中，可能需要将错误记录到日志并通知管理员
}); 