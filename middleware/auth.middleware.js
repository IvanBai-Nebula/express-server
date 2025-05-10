const authUtils = require('../utils/auth.utils');
const db = require('../models');
const User = db.users;
const Staff = db.staff;

/**
 * 验证令牌中间件
 * 验证请求头中的 JWT 令牌是否有效
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers['x-access-token'] || req.headers['authorization']?.split(' ')[1];

    if (!token) {
      return res.status(403).json({ message: '未提供访问令牌' });
    }

    const decoded = authUtils.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: '未授权! 令牌无效或已过期' });
    }

    // 存储解码后的用户信息供后续中间件和路由处理器使用
    req.userId = decoded.id;
    req.userRole = decoded.role; // 'user' 或 'staff'
    req.isAdmin = decoded.isAdmin || false;

    next();
  } catch (error) {
    return res.status(401).json({ message: '未授权!', error: error.message });
  }
};

/**
 * 验证是否为管理员
 * 必须在 verifyToken 中间件之后使用
 */
exports.isAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ message: '需要管理员权限!' });
  }
  next();
};

/**
 * 验证是否为工作人员
 * 必须在 verifyToken 中间件之后使用
 */
exports.isStaff = (req, res, next) => {
  if (req.userRole !== 'staff') {
    return res.status(403).json({ message: '需要工作人员权限!' });
  }
  next();
};

/**
 * 验证是否为资源所有者中间件
 * 通用中间件函数生成器，用于验证用户是否有权修改指定资源
 * @param {Function} modelAccessor - 获取资源模型的函数
 * @param {String} paramName - URL参数名称
 * @param {String} userIdField - 模型中表示用户ID的字段名
 */
exports.isResourceOwner = (modelAccessor, paramName, userIdField = 'userID') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      if (!resourceId) {
        return res.status(400).json({ message: `缺少参数: ${paramName}` });
      }

      const resource = await modelAccessor().findByPk(resourceId);
      if (!resource) {
        return res.status(404).json({ message: '资源未找到' });
      }

      // 管理员可以访问任何资源
      if (req.isAdmin) {
        return next();
      }

      // 检查是否为资源所有者
      if (resource[userIdField] !== req.userId) {
        return res.status(403).json({ message: '您没有权限修改此资源' });
      }

      next();
    } catch (error) {
      return res.status(500).json({ message: '服务器错误', error: error.message });
    }
  };
}; 