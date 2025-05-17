const {
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
} = require("sequelize");
const errorLogger = require("../utils/errorLogger.utils");

// 定义错误类型常量
const ERROR_TYPES = {
  VALIDATION: "validation_error",
  AUTHENTICATION: "authentication_error",
  AUTHORIZATION: "authorization_error",
  NOT_FOUND: "not_found_error",
  CONFLICT: "conflict_error",
  RATE_LIMIT: "rate_limit_error",
  SERVER: "server_error",
  DATABASE: "database_error",
  BAD_REQUEST: "bad_request_error",
};

/**
 * 自定义API错误类
 */
class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    type = ERROR_TYPES.SERVER,
    details = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = true; // 标记为已知操作错误，便于区分处理
    this.details = details; // 添加详细错误信息字段

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 集中错误处理中间件
 * 处理各种类型的错误并返回一致的响应格式
 */
exports.errorHandler = (err, req, res, next) => {
  // 请求标识符，用于日志追踪
  const requestId = req.requestId || `req-${Date.now()}`;

  // 构建日志上下文
  const logContext = {
    requestId,
    url: req.originalUrl,
    method: req.method,
    userId: req.userId || "anonymous",
    userRole: req.userRole || "unknown",
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    errorType: err.type || "unknown_error",
    errorName: err.name,
    statusCode: err.statusCode || 500,
    errorStack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  };

  // 使用高级错误记录器记录错误
  errorLogger.logError(err, logContext).catch((logErr) => {
    console.error("记录错误日志时发生错误:", logErr);
  });

  // 简化控制台日志，不重复完整的日志内容，因为已经由errorLogger记录
  if (err.isOperational) {
    // 操作性错误 - 已知且可预期的错误
    console.warn(`[WARN] ${requestId}: ${err.message}`);
  } else {
    // 程序性错误 - 未知或意外错误
    console.error(`[ERROR] ${requestId}: ${err.message}`);
  }

  // 处理 Sequelize 验证错误
  if (err instanceof ValidationError) {
    return res.status(400).json({
      status: "error",
      type: ERROR_TYPES.VALIDATION,
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
      type: ERROR_TYPES.CONFLICT,
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
      type: ERROR_TYPES.DATABASE,
      message: "数据库操作失败",
      error: process.env.NODE_ENV === "production" ? "数据库错误" : err.message,
      requestId,
    });
  }

  // 处理自定义AppError错误
  if (err instanceof AppError) {
    const response = {
      status: "error",
      type: err.type,
      message: err.message,
      requestId,
    };

    // 仅在非生产环境或特定错误类型中包含详细信息
    if (
      err.details &&
      (process.env.NODE_ENV !== "production" ||
        err.type === ERROR_TYPES.VALIDATION)
    ) {
      response.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // 处理旧版自定义状态码错误 (兼容性支持)
  if (err.statusCode) {
    const errorType = getErrorTypeFromStatusCode(err.statusCode);
    return res.status(err.statusCode).json({
      status: "error",
      type: errorType,
      message: err.message || "请求处理失败",
      requestId,
    });
  }

  // 处理其他所有错误
  return res.status(500).json({
    status: "error",
    type: ERROR_TYPES.SERVER,
    message: "服务器内部错误",
    error: process.env.NODE_ENV === "production" ? "内部错误" : err.message,
    requestId,
  });
};

/**
 * 根据HTTP状态码确定错误类型
 */
function getErrorTypeFromStatusCode(statusCode) {
  switch (statusCode) {
    case 400:
      return ERROR_TYPES.BAD_REQUEST;
    case 401:
      return ERROR_TYPES.AUTHENTICATION;
    case 403:
      return ERROR_TYPES.AUTHORIZATION;
    case 404:
      return ERROR_TYPES.NOT_FOUND;
    case 409:
      return ERROR_TYPES.CONFLICT;
    case 429:
      return ERROR_TYPES.RATE_LIMIT;
    default:
      return statusCode >= 500 ? ERROR_TYPES.SERVER : ERROR_TYPES.BAD_REQUEST;
  }
}

/**
 * 创建一个自定义错误并设置状态码
 * @param {string} message 错误消息
 * @param {number} statusCode HTTP状态码
 * @param {string} type 错误类型 (可选)
 * @param {object} details 错误详情 (可选)
 */
exports.createError = (message, statusCode = 500, type, details) => {
  // 如果未指定type，根据状态码推断
  if (!type) {
    type = getErrorTypeFromStatusCode(statusCode);
  }

  return new AppError(message, statusCode, type, details);
};

// 便捷方法：创建特定类型的错误
exports.createValidationError = (message, details) =>
  new AppError(message, 400, ERROR_TYPES.VALIDATION, details);
exports.createAuthenticationError = (message) =>
  new AppError(message, 401, ERROR_TYPES.AUTHENTICATION);
exports.createAuthorizationError = (message) =>
  new AppError(message, 403, ERROR_TYPES.AUTHORIZATION);
exports.createNotFoundError = (message) =>
  new AppError(message, 404, ERROR_TYPES.NOT_FOUND);
exports.createConflictError = (message) =>
  new AppError(message, 409, ERROR_TYPES.CONFLICT);
exports.createRateLimitError = (message) =>
  new AppError(message, 429, ERROR_TYPES.RATE_LIMIT);

/**
 * 异步处理包装器
 * 捕获异步路由处理程序中的错误并传递给错误处理中间件
 */
exports.asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 请求验证中间件
 * 用于统一处理请求参数验证
 * @param {Object} schema - Joi或其他验证库的schema对象
 * @param {String} source - 验证来源 ('body', 'query', 'params')
 */
exports.validateRequest = (schema, source = "body") => {
  return (req, res, next) => {
    // 确保schema有validate方法
    if (!schema || typeof schema.validate !== "function") {
      return next(new AppError("无效的验证schema", 500, ERROR_TYPES.SERVER));
    }

    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // 返回所有错误，而不是遇到第一个就停止
      stripUnknown: true, // 移除不在schema中定义的字段
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return next(
        new AppError(
          "请求参数验证失败",
          400,
          ERROR_TYPES.VALIDATION,
          validationErrors
        )
      );
    }

    // 使用经过验证且清理过的数据替换原始数据
    req[source] = value;
    next();
  };
};

/**
 * 通用审计日志记录中间件
 * @param {String} action - 操作描述
 */
exports.auditLog = (action) => {
  return (req, res, next) => {
    // 确保req.userId存在（通常在认证中间件中设置）
    if (!req.userId) {
      next();
      return;
    }

    // 异步记录审计事件
    const auditEvent = {
      userId: req.userId,
      userType: req.userRole || "unknown",
      action,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date(),
      details: {
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        // 不记录完整body，可能包含敏感信息
        bodyKeys: req.body ? Object.keys(req.body) : [],
      },
    };

    // 这里可以调用记录审计日志的函数
    // 比如 logAudit(auditEvent)
    // 为了不阻塞请求，应该异步处理

    console.log(`[AUDIT] ${action}`, {
      userId: auditEvent.userId,
      userType: auditEvent.userType,
      timestamp: auditEvent.timestamp,
      method: req.method,
      path: req.path,
    });

    next();
  };
};

/**
 * 性能监控中间件
 * 记录请求处理时间并记录慢请求
 * @param {number} threshold - 慢请求阈值(毫秒)
 */
exports.performanceMonitor = (threshold = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now();

    // 在响应发送后执行
    res.on("finish", () => {
      const duration = Date.now() - startTime;

      // 添加处理时间到响应头(仅在非生产环境)
      if (process.env.NODE_ENV !== "production") {
        res.set("X-Response-Time", `${duration}ms`);
      }

      // 记录慢请求
      if (duration > threshold) {
        console.warn(
          `[SLOW REQUEST] ${req.method} ${req.originalUrl} took ${duration}ms`,
          {
            duration,
            statusCode: res.statusCode,
            userId: req.userId || "anonymous",
            method: req.method,
            path: req.originalUrl,
            query: req.query,
            userAgent: req.headers["user-agent"],
            ip: req.ip,
          }
        );
      }
    });

    next();
  };
};

/**
 * 生成一个唯一的请求ID
 * 格式: req-timestamp-randomString
 */
function generateRequestId() {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 11);
  return `req-${timestamp}-${randomStr}`;
}

/**
 * 请求ID中间件
 * 为每个请求添加唯一ID，用于日志跟踪和错误关联
 */
exports.requestIdMiddleware = (req, res, next) => {
  // 生成请求ID
  req.requestId = generateRequestId();

  // 添加到响应头，便于前端调试
  res.setHeader("X-Request-ID", req.requestId);

  next();
};

// 修改requestContext中间件使用新的ID生成方法
exports.requestContext = (req, res, next) => {
  // 使用已生成的请求ID，或者生成一个新的
  req.requestId = req.requestId || generateRequestId();

  // 记录请求开始
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    userAgent: req.headers["user-agent"],
    ip: req.ip,
    userId: req.userId || "anonymous",
    timestamp: new Date().toISOString(),
  });

  next();
};

// 导出错误类型供外部使用
exports.ERROR_TYPES = ERROR_TYPES;
exports.AppError = AppError;
