/**
 * 安全相关错误处理中间件
 */
const { createError, ERROR_TYPES } = require("./errorHandler.middleware");
const errorLogger = require("../utils/errorLogger.utils");

// 可疑请求计数器
const suspiciousIpMap = new Map();
const MAX_SUSPICIOUS_REQUESTS = 5;
const SUSPICIOUS_TRACKING_WINDOW = 60 * 60 * 1000; // 1小时

/**
 * 记录可疑IP地址
 * @param {string} ip - IP地址
 */
function trackSuspiciousIP(ip) {
  if (!suspiciousIpMap.has(ip)) {
    suspiciousIpMap.set(ip, {
      count: 1,
      firstSeen: Date.now(),
    });
    return;
  }

  const record = suspiciousIpMap.get(ip);

  // 如果超过了追踪窗口时间，重置计数
  if (Date.now() - record.firstSeen > SUSPICIOUS_TRACKING_WINDOW) {
    record.count = 1;
    record.firstSeen = Date.now();
  } else {
    record.count += 1;
  }

  suspiciousIpMap.set(ip, record);
}

/**
 * 检查IP是否超过可疑阈值
 * @param {string} ip - IP地址
 * @returns {boolean} 是否超过阈值
 */
function isSuspiciousIP(ip) {
  if (!suspiciousIpMap.has(ip)) return false;

  const record = suspiciousIpMap.get(ip);

  // 如果超过了追踪窗口，不再认为是可疑的
  if (Date.now() - record.firstSeen > SUSPICIOUS_TRACKING_WINDOW) {
    return false;
  }

  return record.count >= MAX_SUSPICIOUS_REQUESTS;
}

/**
 * 处理验证错误安全日志
 */
exports.handleAuthError = (req, res, next) => {
  // 附加到请求对象，供错误处理使用
  req.handleAuthFailure = () => {
    const ip = req.ip || req.connection.remoteAddress;
    trackSuspiciousIP(ip);

    // 记录可疑的登录尝试
    const suspiciousLevel = isSuspiciousIP(ip) ? "HIGH" : "LOW";
    const context = {
      requestId: req.requestId,
      url: req.originalUrl,
      method: req.method,
      ip: ip,
      securityThreat: `AUTH_FAILURE:${suspiciousLevel}`,
      userAgent: req.headers["user-agent"],
    };

    const error = new Error("Authentication failure");
    error.name = "SecurityThreatAuthFailure";
    errorLogger.logError(error, context).catch(console.error);
  };

  next();
};

/**
 * 处理跨站点请求伪造 (CSRF) 错误
 */
exports.handleCSRFError = (err, req, res, next) => {
  if (err && err.code === "EBADCSRFTOKEN") {
    // 记录CSRF攻击尝试
    const ip = req.ip || req.connection.remoteAddress;
    trackSuspiciousIP(ip);

    const context = {
      requestId: req.requestId,
      url: req.originalUrl,
      method: req.method,
      ip: ip,
      securityThreat: "CSRF_ATTACK",
      userAgent: req.headers["user-agent"],
    };

    const error = new Error("CSRF token validation failed");
    error.name = "SecurityThreatCSRF";
    errorLogger.logError(error, context).catch(console.error);

    return res.status(403).json({
      status: "error",
      type: ERROR_TYPES.AUTHORIZATION,
      message: "请求验证失败，请刷新页面后重试",
      requestId: req.requestId,
    });
  }

  return next(err);
};

/**
 * 处理XSS尝试
 */
exports.handleXSSAttempt = (req, res, next) => {
  // 一些简单的XSS检测模式
  const xssPatterns = [
    /<script\b[^>]*>(.*?)<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /onclick|onload|onerror/gi,
  ];

  // 检查请求参数中是否有疑似XSS的内容
  const checkForXSS = (obj) => {
    if (!obj) return false;

    return Object.values(obj).some((value) => {
      if (typeof value !== "string") return false;

      return xssPatterns.some((pattern) => pattern.test(value));
    });
  };

  const hasXSS =
    checkForXSS(req.query) || checkForXSS(req.body) || checkForXSS(req.params);

  if (hasXSS) {
    const ip = req.ip || req.connection.remoteAddress;
    trackSuspiciousIP(ip);

    const context = {
      requestId: req.requestId,
      url: req.originalUrl,
      method: req.method,
      ip: ip,
      securityThreat: "XSS_ATTEMPT",
      userAgent: req.headers["user-agent"],
    };

    const error = new Error("Possible XSS attempt detected");
    error.name = "SecurityThreatXSS";
    errorLogger.logError(error, context).catch(console.error);

    return res.status(400).json({
      status: "error",
      type: ERROR_TYPES.BAD_REQUEST,
      message: "请求包含无效字符",
      requestId: req.requestId,
    });
  }

  next();
};

// 定期清理太老的可疑IP记录
setInterval(() => {
  const now = Date.now();

  suspiciousIpMap.forEach((record, ip) => {
    if (now - record.firstSeen > SUSPICIOUS_TRACKING_WINDOW) {
      suspiciousIpMap.delete(ip);
    }
  });
}, SUSPICIOUS_TRACKING_WINDOW);
