const rateLimit = require("express-rate-limit");

/**
 * 通用API限速配置
 * 限制请求频率，防止API滥用
 */
exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 100, // 每个IP在时间窗口内最多100个请求
  standardHeaders: true, // 返回标准的RateLimit头部
  legacyHeaders: false, // 禁用旧版本的X-RateLimit头部
  message: {
    status: "error",
    message: "请求过于频繁，请稍后再试",
    retryAfter: "15分钟",
  },
});

/**
 * 登录API限速配置
 * 防止暴力破解登录凭证
 */
exports.loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时时间窗口
  max: 10, // 每个IP在时间窗口内最多10次登录尝试
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "登录尝试次数过多，账户暂时锁定",
    retryAfter: "1小时",
  },
});

/**
 * 注册API限速配置
 * 防止批量注册账号
 */
exports.registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24小时时间窗口
  max: 5, // 每个IP在时间窗口内最多5次注册尝试
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "注册请求过多，请稍后再试",
    retryAfter: "24小时",
  },
});

/**
 * 密码重置API限速配置
 * 防止滥用密码重置功能
 */
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时时间窗口
  max: 3, // 每个IP在时间窗口内最多3次密码重置请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "密码重置请求过多，请稍后再试",
    retryAfter: "1小时",
  },
});

/**
 * 标签创建API限速配置
 * 防止过多的标签创建请求
 */
exports.tagCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 20, // 每个IP在时间窗口内最多20次标签创建请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "标签创建请求过多，请稍后再试",
    retryAfter: "15分钟",
  },
});
