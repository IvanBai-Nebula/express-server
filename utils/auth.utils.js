const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT 密钥，应该从环境变量中获取
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// 令牌过期时间
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * 对密码进行散列处理
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - 返回散列后的密码
 */
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * 验证密码是否匹配
 * @param {string} password - 明文密码
 * @param {string} hashedPassword - 已散列的密码
 * @returns {Promise<boolean>} - 返回密码是否匹配
 */
exports.comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * 生成JWT令牌
 * @param {Object} payload - 令牌载荷，通常包含用户ID和角色等信息
 * @returns {string} - 返回JWT令牌
 */
exports.generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {Object|null} - 返回解码后的载荷，验证失败返回null
 */
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * 生成随机令牌（用于密码重置等）
 * @param {number} size - 令牌字节数
 * @returns {string} - 返回随机令牌的十六进制表示
 */
exports.generateRandomToken = (size = 32) => {
  return crypto.randomBytes(size).toString('hex');
};

/**
 * 生成过期时间
 * @param {number} hours - 小时数
 * @returns {Date} - 返回未来指定小时数的日期
 */
exports.generateExpiryDate = (hours = 24) => {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}; 