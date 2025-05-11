// 加载环境变量
const NODE_ENV = process.env.NODE_ENV || "production";
const envFile = `.env.${NODE_ENV}`;
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./models");
const setupSwagger = require("./swagger-api.js");
const authUtils = require("./utils/auth.utils");
const path = require("path");
const { errorHandler } = require("./middleware/errorHandler.middleware");
const {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
} = require("./middleware/rateLimit.middleware");

// 首先尝试加载特定环境的配置文件
if (fs.existsSync(envFile)) {
  console.log(`加载${envFile}环境配置文件`);
  require("dotenv").config({ path: envFile });
} else {
  // 如果特定环境的配置文件不存在，则加载默认配置
  console.log("未找到特定环境配置文件，加载默认.env配置");
  require("dotenv").config();
}

// 在开发环境下输出配置信息
if (NODE_ENV === "development") {
  const dbConfig = require("./config/db.config.js");
  console.log("======= 当前环境变量配置 =======");
  console.log("数据库配置:");
  console.log(` - 主机: ${dbConfig.HOST}`);
  console.log(` - 端口: ${dbConfig.PORT}`);
  console.log(` - 用户名: ${dbConfig.USER}`);
  console.log(` - 数据库名: ${dbConfig.DB}`);
  console.log(` - 数据库类型: ${dbConfig.dialect}`);
  console.log("邮件配置:");
  console.log(` - 主机: ${process.env.MAIL_HOST || "未设置"}`);
  console.log(` - 端口: ${process.env.MAIL_PORT || "未设置"}`);
  console.log(` - 用户名: ${process.env.MAIL_USER || "未设置"}`);
  console.log(` - 发件人: ${process.env.MAIL_FROM || "未设置"}`);
  console.log("其他配置:");
  console.log(` - 前端URL: ${process.env.FRONTEND_URL || "未设置"}`);
  console.log(` - CORS源: ${process.env.CORS_ORIGIN || "未设置"}`);
  console.log("===============================");
}

const app = express();

// 创建日志目录
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 生产环境安全设置
app.disable("x-powered-by"); // 隐藏Express标识
app.set("trust proxy", 1); // 信任反向代理

// 配置 CORS - 生产环境严格限制来源
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "https://example.com",
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// 请求体解析和限制
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "5mb" }));

// 添加基本安全头
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// 请求ID中间件 - 用于日志跟踪
app.use((req, res, next) => {
  req.requestId =
    Date.now() + "-" + Math.random().toString(36).substring(2, 15);
  next();
});

// 应用全局API速率限制
app.use(globalLimiter);

// 同步数据库模型 - 生产环境不强制重建表
db.sequelize
  .sync({ force: false })
  .then(() => {
    console.log("已同步数据库模型");
  })
  .catch((err) => {
    console.error("无法同步数据库模型:", err);
  });

// 简单路由
app.get("/", (req, res) => {
  res.json({ message: "欢迎使用医疗知识学习平台 API" });
});

// 健康检查端点
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});

// 为特定API路径应用特定的速率限制
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);
app.use("/api/auth/request-password-reset", passwordResetLimiter);

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

// 应用错误处理中间件 - 放在所有路由之后
app.use(errorHandler);

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: "未找到请求的资源" });
});

// 在所有路由之后设置 Swagger（仅当环境变量允许时）
if (process.env.ENABLE_SWAGGER === "true") {
  setupSwagger(app);
}

const PORT = process.env.PORT || 8080;

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(
    `服务器运行在端口 ${PORT}，环境: ${process.env.NODE_ENV || "production"}`
  );
});

// 优雅关闭逻辑
async function shutdownApp(signal) {
  console.log(`收到 ${signal} 信号，正在优雅关闭服务...`);
  try {
    // 首先关闭HTTP服务器，不再接受新连接
    await new Promise((resolve) => {
      server.close(resolve);
      console.log("HTTP服务器已关闭");
    });

    // 关闭Redis连接
    await authUtils.closeRedisConnection();
    console.log("Redis连接已关闭");

    // 最后关闭数据库连接
    await db.sequelize.close();
    console.log("数据库连接已关闭");

    console.log("应用已优雅关闭");
    process.exit(0);
  } catch (error) {
    console.error("关闭应用时出错:", error);
    process.exit(1);
  }
}

// 注册信号处理程序
process.on("SIGTERM", () => shutdownApp("SIGTERM"));
process.on("SIGINT", () => shutdownApp("SIGINT"));

// 全局错误处理
process.on("uncaughtException", (error) => {
  console.error("未捕获的异常:", error);
  // 在生产环境中记录严重错误但保持服务运行
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的 Promise rejection:", reason);
  // 在生产环境中记录未处理的Promise拒绝但保持服务运行
});

module.exports = app; // 导出 app 实例供测试使用
