const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createClient } = require("redis");

// JWT密钥和配置
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'); // 随机生成一个，但建议在生产环境设置环境变量
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "1h"; // 访问令牌有效期更短
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d"; // 刷新令牌可以更长
const REFRESH_SECRET = process.env.REFRESH_SECRET || crypto.randomBytes(32).toString('hex');

// Redis 客户端设置
const redisClient = createClient({
  url: `redis://${process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD + '@' : ''}${process.env.REDIS_HOST || 'ivan.black'}:${process.env.REDIS_PORT || 6379}`,
  database: parseInt(process.env.REDIS_DB || '1')
});

// Redis 键前缀
const REDIS_PREFIX = process.env.REDIS_PREFIX || 'token_blacklist:';

// 连接 Redis
(async () => {
  redisClient.on('error', (err) => {
    console.error('Redis 连接错误:', err);
    // 如果Redis连接失败，服务器仍然可以运行，但令牌黑名单将不可用
    // 你可能希望根据你的使用场景采取不同的操作
  });
  
  await redisClient.connect().catch(err => {
    console.warn('Redis 连接失败，将使用内存黑名单作为备份:', err);
  });
})();

// 内存黑名单作为Redis不可用时的备份
const memoryBlacklist = new Set();

/**
 * 对密码进行散列处理
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - 返回散列后的密码
 */
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12); // 增加salt强度
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
 * 验证密码强度
 * @param {string} password - 要验证的密码
 * @returns {Object} - 返回验证结果 {valid: boolean, message: string}
 */
exports.validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: "密码长度必须至少为8个字符" };
  }
  
  // 检查是否包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return { 
      valid: false, 
      message: "密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符" 
    };
  }
  
  return { valid: true, message: "密码强度符合要求" };
};

/**
 * 生成访问令牌
 * @param {Object} payload - 令牌载荷，通常包含用户ID和角色等信息
 * @returns {string} - 返回JWT令牌
 */
exports.generateAccessToken = (payload) => {
  // 添加签发时间和不早于时间
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { 
      ...payload,
      iat: now,
      nbf: now,
      type: 'access'
    }, 
    JWT_SECRET, 
    { 
      expiresIn: JWT_ACCESS_EXPIRES_IN,
      audience: 'api-users',
      issuer: 'medical-knowledge-platform'
    }
  );
};

/**
 * 生成刷新令牌
 * @param {Object} payload - 应包含最小用户信息
 * @returns {string} - 返回刷新令牌
 */
exports.generateRefreshToken = (payload) => {
  // 刷新令牌只包含必要信息
  const minimalPayload = {
    id: payload.id,
    role: payload.role,
    type: 'refresh',
    tokenVersion: payload.tokenVersion || 0
  };
  
  return jwt.sign(
    minimalPayload, 
    REFRESH_SECRET, 
    { 
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      audience: 'api-users',
      issuer: 'medical-knowledge-platform'
    }
  );
};

/**
 * 生成令牌对
 * @param {Object} payload - 用户信息
 * @returns {Object} - 返回访问令牌和刷新令牌
 */
exports.generateTokens = (payload) => {
  return {
    accessToken: this.generateAccessToken(payload),
    refreshToken: this.generateRefreshToken(payload)
  };
};

/**
 * 检查令牌是否在黑名单中
 * @param {string} token - 要检查的令牌
 * @returns {Promise<boolean>} - 返回令牌是否在黑名单中
 */
const isTokenBlacklisted = async (token) => {
  // 计算令牌的哈希值，避免将完整令牌存储在Redis中
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const redisKey = `${REDIS_PREFIX}${tokenHash}`;
  
  try {
    if (redisClient.isReady) {
      // 使用Redis检查
      return await redisClient.exists(redisKey) === 1;
    } else {
      // 使用内存黑名单作为备份
      return memoryBlacklist.has(tokenHash);
    }
  } catch (error) {
    console.error('检查令牌黑名单时出错:', error);
    // 使用内存黑名单作为备份
    return memoryBlacklist.has(tokenHash);
  }
};

/**
 * 验证访问令牌
 * @param {string} token - JWT令牌
 * @returns {Promise<Object|null>} - 返回解码后的载荷，验证失败返回null
 */
exports.verifyAccessToken = async (token) => {
  try {
    // 检查令牌是否在黑名单中
    if (await isTokenBlacklisted(token)) {
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      audience: 'api-users',
      issuer: 'medical-knowledge-platform'
    });
    
    // 验证令牌类型
    if (decoded.type !== 'access') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('令牌验证失败:', error.message);
    return null;
  }
};

/**
 * 验证刷新令牌
 * @param {string} token - 刷新令牌
 * @returns {Promise<Object|null>} - 返回解码后的载荷，验证失败返回null
 */
exports.verifyRefreshToken = async (token) => {
  try {
    // 检查令牌是否在黑名单中
    if (await isTokenBlacklisted(token)) {
      return null;
    }
    
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      audience: 'api-users',
      issuer: 'medical-knowledge-platform'
    });
    
    // 验证令牌类型
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('刷新令牌验证失败:', error.message);
    return null;
  }
};

/**
 * 添加令牌到黑名单
 * @param {string} token - 要添加到黑名单的令牌
 * @param {number} [expirySeconds] - 可选的过期时间（秒）
 */
exports.blacklistToken = async (token, expirySeconds) => {
  try {
    // 解析令牌以获取过期时间
    let expiry;
    try {
      // 尝试解码令牌以获取过期时间
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        // 计算剩余时间（秒）
        expiry = decoded.exp - Math.floor(Date.now() / 1000);
        // 确保过期时间为正数
        expiry = expiry > 0 ? expiry : 86400; // 默认1天
      } else {
        expiry = expirySeconds || 86400; // 默认1天
      }
    } catch (error) {
      // 解码失败时使用默认过期时间
      expiry = expirySeconds || 86400; // 默认1天
    }
    
    // 计算令牌的哈希值
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const redisKey = `${REDIS_PREFIX}${tokenHash}`;
    
    if (redisClient.isReady) {
      // 使用Redis存储令牌黑名单
      await redisClient.set(redisKey, '1', { EX: expiry });
    } else {
      // 使用内存黑名单作为备份
      memoryBlacklist.add(tokenHash);
      // 设置过期时间
      setTimeout(() => {
        memoryBlacklist.delete(tokenHash);
      }, expiry * 1000);
    }
  } catch (error) {
    console.error('将令牌添加到黑名单时出错:', error);
    // 使用内存黑名单作为备份
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    memoryBlacklist.add(tokenHash);
    // 设置默认过期时间
    setTimeout(() => {
      memoryBlacklist.delete(tokenHash);
    }, (expirySeconds || 86400) * 1000);
  }
};

/**
 * 生成随机令牌（用于密码重置等）
 * @param {number} size - 令牌字节数
 * @returns {string} - 返回随机令牌的十六进制表示
 */
exports.generateRandomToken = (size = 32) => {
  return crypto.randomBytes(size).toString("hex");
};

/**
 * 生成过期时间
 * @param {number} hours - 小时数
 * @returns {Date} - 返回未来指定小时数的日期
 */
exports.generateExpiryDate = (hours = 24) => {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

/**
 * 关闭Redis连接
 */
exports.closeRedisConnection = async () => {
  if (redisClient.isReady) {
    await redisClient.quit();
  }
};

// 兼容性函数 - 保留旧函数以保持兼容性
exports.generateToken = exports.generateAccessToken;
exports.verifyToken = exports.verifyAccessToken;
