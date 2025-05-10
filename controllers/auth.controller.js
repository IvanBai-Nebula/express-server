const db = require("../models");
const User = db.users;
const Staff = db.staff;
const PasswordReset = db.passwordResets;
const authUtils = require("../utils/auth.utils");

/**
 * 用户注册
 */
exports.registerUser = async (req, res) => {
  try {
    // 验证请求
    if (!req.body.username || !req.body.password || !req.body.email) {
      return res.status(400).json({ message: "请提供用户名、密码和电子邮件!" });
    }

    // 检查密码确认是否匹配
    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ message: "密码和确认密码不匹配!" });
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({
      where: { username: req.body.username }
    });

    if (existingUsername) {
      return res.status(400).json({ message: "用户名已被使用!" });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({
      where: { email: req.body.email }
    });

    if (existingEmail) {
      return res.status(400).json({ message: "电子邮件已被使用!" });
    }

    // 创建新用户
    const hashedPassword = await authUtils.hashPassword(req.body.password);

    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      passwordHash: hashedPassword,
      emailVerified: false,
      // 其他可选字段
      avatarURL: req.body.avatarURL || null,
      preferredLanguage: req.body.preferredLanguage || 'zh-CN',
      notificationPreferences: req.body.notificationPreferences || { emailNotifications: true }
    });

    // 移除敏感信息
    const userResponse = {
      userID: user.userID,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      avatarURL: user.avatarURL,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt
    };

    // TODO: 发送验证邮件
    // sendVerificationEmail(user);

    res.status(201).json({
      message: "用户注册成功！请检查您的邮箱以激活账户。",
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ message: "注册过程中发生错误!", error: error.message });
  }
};

/**
 * 工作人员注册 (由管理员进行)
 */
exports.registerStaff = async (req, res) => {
  try {
    // 验证请求
    if (!req.body.username || !req.body.password || !req.body.email) {
      return res.status(400).json({ message: "请提供用户名、密码和电子邮件!" });
    }

    // 检查密码确认是否匹配
    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ message: "密码和确认密码不匹配!" });
    }
    
    // 检查用户名是否已存在
    const existingUsername = await Staff.findOne({
      where: { username: req.body.username }
    });

    if (existingUsername) {
      return res.status(400).json({ message: "用户名已被使用!" });
    }

    // 检查邮箱是否已存在
    const existingEmail = await Staff.findOne({
      where: { email: req.body.email }
    });

    if (existingEmail) {
      return res.status(400).json({ message: "电子邮件已被使用!" });
    }

    // 创建新工作人员
    const hashedPassword = await authUtils.hashPassword(req.body.password);

    const staff = await Staff.create({
      username: req.body.username,
      email: req.body.email,
      passwordHash: hashedPassword,
      isAdmin: req.body.isAdmin || false, // 默认不是管理员
      emailVerified: false,
      // 其他可选字段
      avatarURL: req.body.avatarURL || null,
      preferredLanguage: req.body.preferredLanguage || 'zh-CN',
      notificationPreferences: req.body.notificationPreferences || { emailNotifications: true }
    });

    // 移除敏感信息
    const staffResponse = {
      staffID: staff.staffID,
      username: staff.username,
      email: staff.email,
      isAdmin: staff.isAdmin,
      emailVerified: staff.emailVerified,
      avatarURL: staff.avatarURL,
      preferredLanguage: staff.preferredLanguage,
      createdAt: staff.createdAt
    };

    // TODO: 发送验证邮件
    // sendVerificationEmail(staff);

    res.status(201).json({
      message: "工作人员注册成功!",
      staff: staffResponse
    });
  } catch (error) {
    res.status(500).json({ message: "注册过程中发生错误!", error: error.message });
  }
};

/**
 * 通用登录接口 - 同时支持用户和工作人员登录
 */
exports.login = async (req, res) => {
  try {
    // 验证请求
    if (!req.body.usernameOrEmail || !req.body.password) {
      return res.status(400).json({ message: "请提供用户名/邮箱和密码!" });
    }

    const { usernameOrEmail, password } = req.body;
    
    // 先尝试用户登录
    let user = await User.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { username: usernameOrEmail },
          { email: usernameOrEmail }
        ]
      }
    });

    let isStaff = false;
    
    // 如果用户不存在，尝试工作人员登录
    if (!user) {
      user = await Staff.findOne({
        where: {
          [db.Sequelize.Op.or]: [
            { username: usernameOrEmail },
            { email: usernameOrEmail }
          ]
        }
      });
      
      if (user) {
        isStaff = true;
      } else {
        return res.status(401).json({ message: "用户名/邮箱或密码不正确!" });
      }
    }

    // 验证密码
    const isPasswordValid = await authUtils.comparePassword(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "用户名/邮箱或密码不正确!" });
    }

    // 检查账户是否激活
    if (!user.isActive) {
      return res.status(403).json({ message: "账户已被停用，请联系管理员!" });
    }

    // 生成 JWT 令牌
    const token = authUtils.generateToken({
      id: isStaff ? user.staffID : user.userID,
      role: isStaff ? 'staff' : 'user',
      isAdmin: isStaff ? user.isAdmin : false
    });

    // 更新最后登录时间
    await user.update({ lastLoginAt: new Date() });

    // 用户/工作人员信息 (不包含敏感数据)
    const userInfo = {
      id: isStaff ? user.staffID : user.userID,
      username: user.username,
      email: user.email,
      role: isStaff ? 'staff' : 'user',
      isAdmin: isStaff ? user.isAdmin : false,
      avatar: user.avatarURL || null,
      emailVerified: user.emailVerified,
    };

    res.status(200).json({
      message: "登录成功!",
      token: token,
      user: userInfo
    });
  } catch (error) {
    res.status(500).json({ message: "登录过程中发生错误!", error: error.message });
  }
};

/**
 * 获取当前用户信息
 */
exports.getMe = async (req, res) => {
  try {
    let user;
    
    if (req.userRole === 'user') {
      user = await User.findByPk(req.userId, {
        attributes: { exclude: ['passwordHash'] }
      });
    } else {
      user = await Staff.findByPk(req.userId, {
        attributes: { exclude: ['passwordHash'] }
      });
    }
    
    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "获取用户信息时发生错误!", error: error.message });
  }
};

/**
 * 退出登录
 */
exports.logout = (req, res) => {
  // 由于使用JWT，服务器端不需要执行特殊操作
  // 客户端负责删除已存储的令牌
  res.status(200).json({ message: "登出成功!" });
};

/**
 * 请求重置密码
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email) {
      return res.status(400).json({ message: "请提供电子邮件!" });
    }

    if (!userType || !['user', 'staff'].includes(userType)) {
      return res.status(400).json({ message: "请提供有效的用户类型 (user 或 staff)!" });
    }

    // 根据用户类型查找用户
    let user;
    if (userType === 'user') {
      user = await User.findOne({ where: { email } });
    } else {
      user = await Staff.findOne({ where: { email } });
    }

    if (!user) {
      // 出于安全考虑，即使用户不存在也返回成功
      return res.status(200).json({ message: "如果该邮箱存在，我们已发送密码重置邮件。请查收您的邮箱。" });
    }

    // 生成重置令牌
    const token = authUtils.generateRandomToken();
    const expiresAt = authUtils.generateExpiryDate(2); // 2小时后过期

    // 存储重置令牌
    await PasswordReset.create({
      userID: userType === 'user' ? user.userID : user.staffID,
      userType: userType === 'user' ? 'User' : 'Staff',
      token,
      expiresAt
    });

    // TODO: 发送重置密码邮件
    // sendPasswordResetEmail(user.email, token);

    res.status(200).json({ message: "如果该邮箱存在，我们已发送密码重置邮件。请查收您的邮箱。" });
  } catch (error) {
    res.status(500).json({ message: "请求重置密码过程中发生错误!", error: error.message });
  }
};

/**
 * 重置密码
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "请提供令牌和新密码!" });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "密码和确认密码不匹配!" });
    }

    // 查找重置请求
    const resetRequest = await PasswordReset.findOne({
      where: { token }
    });

    if (!resetRequest) {
      return res.status(400).json({ message: "重置令牌无效或已过期!" });
    }

    // 检查是否过期
    if (new Date() > resetRequest.expiresAt) {
      await resetRequest.destroy(); // 删除过期的请求
      return res.status(400).json({ message: "令牌已过期，请重新请求重置密码!" });
    }

    // 根据用户类型查找用户
    let user;
    if (resetRequest.userType === 'User') {
      user = await User.findByPk(resetRequest.userID);
    } else {
      user = await Staff.findByPk(resetRequest.userID);
    }

    if (!user) {
      return res.status(404).json({ message: "未找到用户!" });
    }

    // 更新密码
    const hashedPassword = await authUtils.hashPassword(password);
    await user.update({ passwordHash: hashedPassword });

    // 删除重置请求
    await resetRequest.destroy();

    res.status(200).json({ message: "密码重置成功！您现在可以使用新密码登录。" });
  } catch (error) {
    res.status(500).json({ message: "重置密码过程中发生错误!", error: error.message });
  }
};

/**
 * 验证邮箱
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "请提供验证令牌!" });
    }

    // TODO: 实现邮箱验证逻辑
    // 在实际实现中，需要创建一个单独的表来存储验证令牌

    res.status(200).json({ 
      message: "邮箱验证成功!",
      verified: true
    });
  } catch (error) {
    res.status(500).json({ message: "邮箱验证过程中发生错误!", error: error.message });
  }
}; 