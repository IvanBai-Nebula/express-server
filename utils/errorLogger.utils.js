/**
 * 错误日志记录工具
 * 提供高级错误分析、聚合和持久化功能
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

// 日志目录和文件
const LOG_DIR = path.join(process.cwd(), "logs");
const ERROR_LOG_FILE = path.join(LOG_DIR, "error.log");
const appendFileAsync = promisify(fs.appendFile);

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * 错误严重性级别
 */
const SEVERITY = {
  CRITICAL: "CRITICAL", // 严重错误，影响系统可用性
  ERROR: "ERROR", // 常规错误，需要修复
  WARNING: "WARNING", // 警告，可能导致问题
  INFO: "INFO", // 信息性错误，通常无需修复
};

/**
 * 确定错误严重性
 * @param {Error} error - 错误对象
 * @param {number} statusCode - HTTP状态码
 * @returns {string} 严重性级别
 */
function determineSeverity(error, statusCode) {
  // 根据状态码初步判断
  if (statusCode >= 500) return SEVERITY.ERROR;
  if (statusCode >= 400) return SEVERITY.WARNING;

  // 根据错误类型判断
  if (
    error.name === "SequelizeConnectionError" ||
    error.name === "SequelizeConnectionRefusedError"
  ) {
    return SEVERITY.CRITICAL;
  }

  if (
    error.name === "SequelizeUniqueConstraintError" ||
    error.name === "SequelizeValidationError"
  ) {
    return SEVERITY.INFO;
  }

  return SEVERITY.ERROR;
}

/**
 * 记录错误
 * @param {Error} error - 错误对象
 * @param {Object} context - 错误上下文信息
 */
exports.logError = async (error, context = {}) => {
  const timestamp = new Date().toISOString();
  const severity = determineSeverity(error, context.statusCode || 500);

  const logEntry = {
    timestamp,
    requestId: context.requestId || "unknown",
    severity,
    message: error.message,
    stack: error.stack,
    type: error.type || error.name,
    statusCode: context.statusCode,
    url: context.url,
    method: context.method,
    userId: context.userId,
    userRole: context.userRole,
    ip: context.ip,
  };

  // 控制台输出
  const logPrefix = `[${severity}] ${timestamp} (${logEntry.requestId})`;
  if (severity === SEVERITY.CRITICAL) {
    console.error(`${logPrefix}: ${error.message}`, logEntry);
  } else if (severity === SEVERITY.ERROR) {
    console.error(`${logPrefix}: ${error.message}`);
  } else if (severity === SEVERITY.WARNING) {
    console.warn(`${logPrefix}: ${error.message}`);
  } else {
    console.info(`${logPrefix}: ${error.message}`);
  }

  // 写入文件
  try {
    await appendFileAsync(ERROR_LOG_FILE, JSON.stringify(logEntry) + "\n");
  } catch (fileError) {
    console.error("无法写入错误日志文件:", fileError);
  }

  // 这里可以添加其他日志处理逻辑，如发送到错误监控服务
  // 例如 Sentry, New Relic, Datadog 等
};

/**
 * 按请求ID查找错误日志
 * @param {string} requestId - 请求ID
 * @returns {Promise<Array>} 查找到的日志条目
 */
exports.findErrorsByRequestId = async (requestId) => {
  // 实现日志搜索逻辑
  try {
    const fileContent = await promisify(fs.readFile)(ERROR_LOG_FILE, "utf8");
    const lines = fileContent.split("\n").filter((line) => line.trim() !== "");

    return lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter((entry) => entry && entry.requestId === requestId);
  } catch (err) {
    console.error("读取错误日志失败:", err);
    return [];
  }
};

/**
 * 清理旧错误日志
 * @param {number} daysToKeep - 保留日志的天数
 */
exports.cleanupOldLogs = async (daysToKeep = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  try {
    const fileContent = await promisify(fs.readFile)(ERROR_LOG_FILE, "utf8");
    const lines = fileContent.split("\n").filter((line) => line.trim() !== "");

    const recentLogs = lines.filter((line) => {
      try {
        const entry = JSON.parse(line);
        return new Date(entry.timestamp) >= cutoffDate;
      } catch (e) {
        return false;
      }
    });

    await promisify(fs.writeFile)(ERROR_LOG_FILE, recentLogs.join("\n") + "\n");
    console.log(`清理了 ${lines.length - recentLogs.length} 条旧错误日志`);
  } catch (err) {
    console.error("清理错误日志失败:", err);
  }
};
