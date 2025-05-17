const rateLimit = require("express-rate-limit");
const { ERROR_TYPES } = require("./errorHandler.middleware");

/**
 * 创建一致的错误响应格式
 */
const createRateLimitResponse = (message, retryAfter) => {
  return {
    status: "error",
    type: ERROR_TYPES.RATE_LIMIT,
    message,
    retryAfter,
    requestId: `req-${Date.now()}`, // 保持与errorHandler一致的请求ID格式
  };
};

/**
 * 通用API限速配置
 * 限制请求频率，防止API滥用
 */
exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 100, // 每个IP在时间窗口内最多100个请求
  standardHeaders: true, // 返回标准的RateLimit头部
  legacyHeaders: false, // 禁用旧版本的X-RateLimit头部
  message: createRateLimitResponse("请求过于频繁，请稍后再试", "15分钟"),
  statusCode: 429, // 确保使用正确的状态码
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
  message: createRateLimitResponse("登录尝试次数过多，账户暂时锁定", "1小时"),
  statusCode: 429,
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
  message: createRateLimitResponse("注册请求过多，请稍后再试", "24小时"),
  statusCode: 429,
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
  message: createRateLimitResponse("密码重置请求过多，请稍后再试", "1小时"),
  statusCode: 429,
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
  message: createRateLimitResponse("标签创建请求过多，请稍后再试", "15分钟"),
  statusCode: 429,
});

/**
 * 用户相关API限速配置
 */
exports.userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 60, // 每个IP在时间窗口内最多60次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse("用户请求过于频繁，请稍后再试", "15分钟"),
  statusCode: 429,
});

/**
 * 工作人员API限速配置
 */
exports.staffLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 50, // 每个IP在时间窗口内最多50次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse(
    "工作人员请求过于频繁，请稍后再试",
    "15分钟"
  ),
  statusCode: 429,
});

/**
 * 医疗类别API限速配置
 */
exports.medicalCategoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 40, // 每个IP在时间窗口内最多40次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse(
    "医疗类别请求过于频繁，请稍后再试",
    "15分钟"
  ),
  statusCode: 429,
});

/**
 * 知识文章API限速配置
 */
exports.knowledgeArticleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 80, // 每个IP在时间窗口内最多80次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse(
    "知识文章请求过于频繁，请稍后再试",
    "15分钟"
  ),
  statusCode: 429,
});

/**
 * 学习体验API限速配置
 */
exports.learningExperienceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 70, // 每个IP在时间窗口内最多70次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse(
    "学习体验请求过于频繁，请稍后再试",
    "15分钟"
  ),
  statusCode: 429,
});

/**
 * 通知API限速配置
 */
exports.notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 50, // 每个IP在时间窗口内最多50次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse("通知请求过于频繁，请稍后再试", "15分钟"),
  statusCode: 429,
});

/**
 * 管理员API限速配置
 */
exports.adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 30, // 每个IP在时间窗口内最多30次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: createRateLimitResponse("管理员请求过于频繁，请稍后再试", "15分钟"),
  statusCode: 429,
});
