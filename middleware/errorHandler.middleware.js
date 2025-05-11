const {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
} = require("sequelize");

/**
 * 集中错误处理中间件
 * 处理各种类型的错误并返回一致的响应格式
 */
exports.errorHandler = (err, req, res, next) => {
  // 请求标识符，用于日志追踪
  const requestId = req.requestId || `req-${Date.now()}`;

  // 记录错误详情
  console.error(`[ERROR] ${requestId}:`, err);

  // 处理 Sequelize 验证错误
  if (err instanceof ValidationError) {
    return res.status(400).json({
      status: "error",
      message: "数据验证失败",
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
      requestId,
    });
  }

  // 处理 Sequelize 唯一约束错误
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      status: "error",
      message: "数据已存在，违反唯一约束",
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
      requestId,
    });
  }

  // 处理其他数据库错误
  if (err instanceof DatabaseError) {
    return res.status(500).json({
      status: "error",
      message: "数据库操作失败",
      error: process.env.NODE_ENV === "production" ? "数据库错误" : err.message,
      requestId,
    });
  }

  // 处理自定义状态码错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message || "请求处理失败",
      requestId,
    });
  }

  // 处理其他所有错误
  return res.status(500).json({
    status: "error",
    message: "服务器内部错误",
    error: process.env.NODE_ENV === "production" ? "内部错误" : err.message,
    requestId,
  });
};

/**
 * 创建一个自定义错误并设置状态码
 * @param {string} message 错误消息
 * @param {number} statusCode HTTP状态码
 */
exports.createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * 异步处理包装器
 * 捕获异步路由处理程序中的错误并传递给错误处理中间件
 */
exports.asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
