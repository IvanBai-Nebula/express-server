// 加载环境变量 - 强制使用开发环境配置
process.env.NODE_ENV = "development";
const envFile = `.env.development`;
const fs = require("fs");
const morgan = require("morgan"); // 请确保已安装此依赖: npm install morgan
const path = require("path");

// 加载开发环境配置文件
if (fs.existsSync(envFile)) {
  console.log(`加载${envFile}环境配置文件`);
  require("dotenv").config({ path: envFile });
} else {
  console.log("未找到开发环境配置文件，加载默认.env配置");
  require("dotenv").config();
}

// 输出开发环境配置信息
const dbConfig = require("./config/db.config.js");
console.log("======= 开发环境配置 =======");
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

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./models");
const setupSwagger = require("./swagger-api.js");
const seedData = require("./utils/seedData"); // 在开发环境中启用种子数据
const authUtils = require("./utils/auth.utils");

// 尝试加载开发环境专用工具
let devTools = { enabled: false };
try {
  devTools = require("./dev-tools/index.js");
  devTools.enabled = true;
  console.log("已加载开发环境工具");
} catch (err) {
  console.log("开发环境工具未找到，将使用标准设置");
}

const app = express();

// 创建日志目录
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 配置开发环境日志
// 控制台彩色日志
app.use(morgan("dev"));
// 文件日志
const accessLogStream = fs.createWriteStream(path.join(logsDir, "access.log"), {
  flags: "a",
});
app.use(morgan("combined", { stream: accessLogStream }));

// 配置 CORS - 开发环境允许所有来源
var corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ["X-Response-Time", "X-Request-ID"], // 允许前端访问自定义头
};
app.use(cors(corsOptions));

// 解析请求
app.use(bodyParser.json({ limit: "10mb" })); // 增加限制以支持更大的请求
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// 为每个请求添加唯一ID和时间戳
app.use((req, res, next) => {
  req.requestId =
    Date.now() + "-" + Math.random().toString(36).substring(2, 15);
  req.requestTime = new Date();
  res.setHeader("X-Request-ID", req.requestId);
  next();
});

// 为所有请求添加响应时间头和日志记录
app.use((req, res, next) => {
  const start = Date.now();
  // 修改响应的end方法以添加响应时间
  const originalEnd = res.end;

  res.end = function () {
    const duration = Date.now() - start;
    res.setHeader("X-Response-Time", `${duration}ms`);

    // 记录请求完成情况，带颜色区分状态码
    let statusColor = "\x1b[32m"; // 绿色 - 200系列
    if (res.statusCode >= 400) statusColor = "\x1b[31m"; // 红色 - 400/500系列
    else if (res.statusCode >= 300) statusColor = "\x1b[33m"; // 黄色 - 300系列

    console.log(
      `${req.method} ${req.originalUrl} - ${statusColor}${res.statusCode}\x1b[0m - ${duration}ms [${req.requestId}]`
    );

    // 调用原始end方法
    return originalEnd.apply(this, arguments);
  };

  next();
});

// 打印所有进入的请求体，但不包括敏感数据
app.use((req, res, next) => {
  if (req.method !== "GET" && process.env.LOG_REQUESTS === "true") {
    // 创建请求体的副本，移除敏感字段
    const sanitizedBody = { ...req.body };
    ["password", "passwordHash", "token", "secret", "apiKey"].forEach(
      (field) => {
        if (sanitizedBody[field]) sanitizedBody[field] = "[REDACTED]";
      }
    );
    console.log(`请求体 (${req.method} ${req.path}):`, sanitizedBody);
  }
  next();
});

// 性能跟踪中间件
app.use((req, res, next) => {
  if (process.env.PERFORMANCE_DEBUG === "true") {
    console.time(`性能 - ${req.method} ${req.path} [${req.requestId}]`);
    res.on("finish", () => {
      console.timeEnd(`性能 - ${req.method} ${req.path} [${req.requestId}]`);
    });
  }
  next();
});

// 开发环境允许模拟慢速网络
if (process.env.SIMULATE_LATENCY === "true") {
  const minLatency = parseInt(process.env.MIN_LATENCY || 100);
  const maxLatency = parseInt(process.env.MAX_LATENCY || 1000);

  app.use((req, res, next) => {
    const delay =
      Math.floor(Math.random() * (maxLatency - minLatency + 1)) + minLatency;
    console.log(`模拟网络延迟: ${delay}ms`);
    setTimeout(next, delay);
  });
}

// 同步数据库模型 - 开发环境可选择重新创建表
const forceSync = process.env.FORCE_SYNC === "true";
db.sequelize
  .sync({ force: forceSync })
  .then(() => {
    console.log(`已同步数据库模型${forceSync ? " (强制重建表)" : ""}`);
    // 如果强制同步或指定需要种子数据，则播种数据
    if (forceSync || process.env.SEED_DATA === "true") {
      console.log("正在播种开发数据...");
      seedData();
    }
  })
  .catch((err) => {
    console.error("无法同步数据库模型:", err);
  });

// API 状态检查端点
app.get("/api/status", (req, res) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    status: "online",
    environment: process.env.NODE_ENV,
    version:
      process.env.npm_package_version || require("./package.json").version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime() + " seconds",
    memory: {
      rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + " MB",
      heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + " MB",
      heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + " MB",
    },
    database: {
      connected: db.sequelize.connectionManager.hasOwnProperty("getConnection"),
    },
  });
});

// 开发环境实用接口
app.get("/dev/routes", (req, res) => {
  // 只在开发环境提供路由列表
  const routes = [];

  // 获取Express应用中的路由
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // 直接路由
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).filter(
          (m) => middleware.route.methods[m]
        ),
      });
    } else if (middleware.name === "router") {
      // 路由组
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods).filter(
              (m) => handler.route.methods[m]
            ),
          });
        }
      });
    }
  });

  res.json({ routes });
});

// 简单路由
app.get("/", (req, res) => {
  res.json({
    message: "欢迎使用医疗知识学习平台 API - 开发环境",
    documentation: "/api-docs", // Swagger文档路径
    status: "/api/status",
    devTools: {
      routes: "/dev/routes",
      enabled: devTools.enabled,
    },
  });
});

// 加载自定义开发工具路由(如果有)
if (devTools.enabled && typeof devTools.setupRoutes === "function") {
  devTools.setupRoutes(app);
}

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

// 设置 Swagger
setupSwagger(app);

// 错误处理中间件 - 确保在所有路由之后添加
app.use((err, req, res, next) => {
  console.error("错误:", err.stack);

  // 记录到错误日志
  fs.appendFileSync(
    path.join(logsDir, "errors.log"),
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} [${
      req.requestId
    }]\n${err.stack}\n\n`
  );

  // 返回友好的错误信息
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      requestId: req.requestId,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
  });
});

// 处理 404 - 确保这是最后一个路由
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: {
      message: `找不到路由: ${req.method} ${req.originalUrl}`,
      requestId: req.requestId,
    },
  });
});

const PORT = process.env.PORT || 8080;
let serverInstance = null;

// 启动服务器
if (require.main === module) {
  serverInstance = app.listen(PORT, () => {
    const serverAddress = `http://localhost:${PORT}`;
    console.log(`\n🚀 开发服务器运行在端口 ${PORT}`);
    console.log(`📑 Swagger文档地址: ${serverAddress}/api-docs`);
    console.log(`ℹ️  状态页面: ${serverAddress}/api/status`);
    if (devTools.enabled) {
      console.log(`🛠️  开发工具: ${serverAddress}/dev`);
    }
    console.log(`\n开发服务器准备就绪 - ${new Date().toLocaleString()}\n`);
  });
}

// 优雅关闭逻辑
async function shutdownApp(signal) {
  console.log(`\n收到 ${signal} 信号，正在优雅关闭服务...`);
  try {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
      console.log("✓ HTTP服务器已关闭");
    }
    await authUtils.closeRedisConnection();
    console.log("✓ Redis连接已关闭");
    await db.sequelize.close();
    console.log("✓ 数据库连接已关闭");
    console.log("✓ 应用已优雅关闭");
    process.exit(0);
  } catch (error) {
    console.error("关闭应用时出错:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdownApp("SIGTERM"));
process.on("SIGINT", () => shutdownApp("SIGINT"));

process.on("uncaughtException", (error) => {
  console.error("未捕获的异常:", error);
  // 开发环境下更详细的错误日志
  fs.appendFileSync(
    path.join(logsDir, "exceptions.log"),
    `[${new Date().toISOString()}] 未捕获的异常: ${error.stack}\n`
  );
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的 Promise rejection:", reason);
  // 开发环境下更详细的错误日志
  fs.appendFileSync(
    path.join(logsDir, "rejections.log"),
    `[${new Date().toISOString()}] 未处理的 Promise rejection: ${reason}\n`
  );
});

// 配置实时监控
const DEV_RELOAD_PORT = parseInt(process.env.DEV_RELOAD_PORT || 9000);
const net = require("net");
const devReloadServer = net.createServer();

devReloadServer.on("error", (err) => {
  console.log(`开发重载服务器错误: ${err.message}`);
});

devReloadServer.listen(DEV_RELOAD_PORT, () => {
  console.log(`开发重载服务器运行在端口 ${DEV_RELOAD_PORT}`);
});

// 监听文件变化（需要安装chokidar: npm install chokidar）
try {
  const chokidar = require("chokidar");
  const watcher = chokidar.watch(
    [
      "./routes",
      "./controllers",
      "./models",
      "./middlewares",
      "./utils",
      "./config",
    ],
    {
      ignored: /(^|[\/\\])\../, // 忽略 . 开头的文件
      persistent: true,
    }
  );

  watcher.on("change", (filePath) => {
    console.log(`\n📄 文件更改: ${filePath}`);

    // 监听配置文件变更
    if (filePath.includes(".env")) {
      console.log("🔄 检测到环境配置文件变化，重新加载配置...");
      try {
        delete require.cache[require.resolve("dotenv")];
        require("dotenv").config({ path: ".env.development" });
        console.log("✅ 配置已更新");
      } catch (err) {
        console.error("❌ 配置更新失败:", err);
      }
    }

    // 如果需要热重载功能，可以在这里实现
    // 例如: 使用nodemon或手动实现
  });

  console.log(
    "📡 文件监控已启用，监控路径: routes, controllers, models, middlewares, utils, config"
  );
} catch (err) {
  console.log("⚠️ 文件监控未启用，请安装chokidar: npm install chokidar");
}

// 创建开发工具目录结构
if (!fs.existsSync("./dev-tools")) {
  try {
    fs.mkdirSync("./dev-tools");
    const indexContent = `// 开发工具入口文件
module.exports = {
  // 在这里添加开发工具功能
  setupRoutes: (app) => {
    // 示例: 添加开发工具路由
    app.get('/dev', (req, res) => {
      res.json({
        message: '开发工具面板',
        tools: [
          { name: '路由列表', path: '/dev/routes' },
          { name: '数据库浏览', path: '/dev/db' }
        ]
      });
    });
  }
};`;
    fs.writeFileSync("./dev-tools/index.js", indexContent);
    console.log("✅ 已创建开发工具目录和基本文件");
  } catch (err) {
    console.error("❌ 无法创建开发工具目录:", err);
  }
}

module.exports = app;
