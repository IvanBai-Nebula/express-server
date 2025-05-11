const db = require("../models");
const User = db.users;
const Staff = db.staff;
const PasswordReset = db.passwordResets;
const authUtils = require("../utils/auth.utils");
const mailUtils = require("../utils/mail.utils");

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
      where: { username: req.body.username },
    });

    if (existingUsername) {
      return res.status(400).json({ message: "用户名已被使用!" });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({
      where: { email: req.body.email },
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
      preferredLanguage: req.body.preferredLanguage || "zh-CN",
      notificationPreferences: req.body.notificationPreferences || {
        emailNotifications: true,
      },
    });

    // 移除敏感信息
    const userResponse = {
      userID: user.userID,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      avatarURL: user.avatarURL,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
    };

    // 生成验证令牌
    const token = authUtils.generateRandomToken();
    const expiryDate = authUtils.generateExpiryDate(24); // 24小时有效期

    // 将验证令牌保存到数据库
    await db.emailVerifications.create({
      userID: user.userID,
      userType: "User",
      token: token,
      expiresAt: expiryDate,
      isUsed: false,
    });

    // 发送验证邮件
    try {
      await mailUtils.sendVerificationEmail(user, token);
      console.log(`验证邮件已发送至 ${user.email}`);
    } catch (emailError) {
      console.error("发送验证邮件失败:", emailError);
      // 邮件发送失败不应影响用户注册流程
    }

    res.status(201).json({
      message: "用户注册成功！请检查您的邮箱以激活账户。",
      user: userResponse,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "注册过程中发生错误!", error: error.message });
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
      where: { username: req.body.username },
    });

    if (existingUsername) {
      return res.status(400).json({ message: "用户名已被使用!" });
    }

    // 检查邮箱是否已存在
    const existingEmail = await Staff.findOne({
      where: { email: req.body.email },
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
      preferredLanguage: req.body.preferredLanguage || "zh-CN",
      notificationPreferences: req.body.notificationPreferences || {
        emailNotifications: true,
      },
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
      createdAt: staff.createdAt,
    };

    // 生成验证令牌
    const token = authUtils.generateRandomToken();
    const expiryDate = authUtils.generateExpiryDate(24); // 24小时有效期

    // 将验证令牌保存到数据库
    await db.emailVerifications.create({
      userID: staff.staffID,
      userType: "Staff",
      token: token,
      expiresAt: expiryDate,
      isUsed: false,
    });

    // 发送验证邮件
    try {
      await mailUtils.sendVerificationEmail(staff, token);
      console.log(`验证邮件已发送至 ${staff.email}`);
    } catch (emailError) {
      console.error("发送验证邮件失败:", emailError);
      // 邮件发送失败不应影响用户注册流程
    }

    res.status(201).json({
      message: "工作人员注册成功!",
      staff: staffResponse,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "注册过程中发生错误!", error: error.message });
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
          { email: usernameOrEmail },
        ],
      },
    });

    let isStaff = false;

    // 如果用户不存在，尝试工作人员登录
    if (!user) {
      user = await Staff.findOne({
        where: {
          [db.Sequelize.Op.or]: [
            { username: usernameOrEmail },
            { email: usernameOrEmail },
          ],
        },
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

    // 检查邮箱是否已验证（非工作人员必须验证邮箱）
    if (!isStaff && !user.emailVerified) {
      // 生成新的验证令牌
      const token = authUtils.generateRandomToken();
      const expiryDate = authUtils.generateExpiryDate(24); // 24小时有效期

      // 将之前的验证令牌标记为失效
      await db.emailVerifications.update(
        { isUsed: true },
        {
          where: {
            userID: user.userID,
            userType: "User",
            isUsed: false,
          },
        }
      );

      // 创建新的验证令牌
      await db.emailVerifications.create({
        userID: user.userID,
        userType: "User",
        token: token,
        expiresAt: expiryDate,
        isUsed: false,
      });

      // 尝试发送验证邮件
      try {
        await mailUtils.sendVerificationEmail(user, token);
        console.log(`验证邮件已发送至 ${user.email}`);
      } catch (emailError) {
        console.error("发送验证邮件失败:", emailError);
      }

      return res.status(403).json({
        message:
          "您的邮箱尚未验证，请检查邮箱并完成验证后再登录。新的验证邮件已发送至您的邮箱。",
        emailVerificationRequired: true,
      });
    }

    // 准备用户信息载荷
    const payload = {
      id: isStaff ? user.staffID : user.userID,
      role: isStaff ? "staff" : "user",
      isAdmin: isStaff ? user.isAdmin : false,
      tokenVersion: user.tokenVersion || 0,
    };

    // 生成访问令牌和刷新令牌
    const { accessToken, refreshToken } = authUtils.generateTokens(payload);

    // 更新最后登录时间
    await user.update({ lastLoginAt: new Date() });

    // 用户/工作人员信息 (不包含敏感数据)
    const userInfo = {
      id: isStaff ? user.staffID : user.userID,
      username: user.username,
      email: user.email,
      role: isStaff ? "staff" : "user",
      isAdmin: isStaff ? user.isAdmin : false,
      avatar: user.avatarURL || null,
      emailVerified: user.emailVerified,
    };

    res.status(200).json({
      message: "登录成功!",
      token: accessToken, // 向后兼容
      accessToken, // 新的访问令牌
      refreshToken, // 刷新令牌
      user: userInfo,
    });
  } catch (error) {
    console.error("登录过程中出错:", error);
    res
      .status(500)
      .json({ message: "登录过程中发生错误!", error: error.message });
  }
};

/**
 * 获取当前用户信息 (将逻辑委托给具体的控制器)
 */
exports.getMe = async (req, res) => {
  try {
    // 根据用户角色重定向到相应的控制器方法
    if (req.userRole === "user") {
      return require("./user.controller").getCurrentUser(req, res);
    } else {
      return require("./staff.controller").getCurrentStaff(req, res);
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取用户信息时发生错误!", error: error.message });
  }
};

/**
 * 刷新访问令牌
 */
exports.refreshToken = async (req, res) => {
  try {
    // 用户信息已由 verifyRefreshToken 中间件添加到 req 对象
    const userId = req.userId;
    const userRole = req.userRole;
    const refreshToken = req.refreshToken;
    const tokenVersion = req.tokenVersion;

    // 根据用户角色获取用户信息
    let user;
    if (userRole === "user") {
      user = await db.users.findByPk(userId);
    } else if (userRole === "staff") {
      user = await db.staff.findByPk(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "用户不存在" });
    }

    // 检查用户状态
    if (!user.isActive) {
      // 撤销刷新令牌
      authUtils.blacklistToken(refreshToken);
      return res.status(403).json({ message: "账户已停用，请联系管理员" });
    }

    // 如果用户更改了密码，需要比较 tokenVersion
    // 此处假设用户模型中有 tokenVersion 字段，实际实现可能需要调整
    if (user.tokenVersion && user.tokenVersion !== tokenVersion) {
      authUtils.blacklistToken(refreshToken);
      return res.status(401).json({ message: "刷新令牌已失效，请重新登录" });
    }

    // 生成新的访问令牌
    const payload = {
      id: userId,
      role: userRole,
      isAdmin: userRole === "staff" ? user.isAdmin : false,
      tokenVersion: user.tokenVersion || 0,
    };

    // 生成新的访问令牌，继续使用相同的刷新令牌
    const accessToken = authUtils.generateAccessToken(payload);

    // 记录用户活动
    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      accessToken,
      refreshToken, // 返回相同的刷新令牌
    });
  } catch (error) {
    console.error("刷新令牌过程中出错:", error);
    return res
      .status(500)
      .json({ message: "服务器错误", error: error.message });
  }
};

/**
 * 用户或工作人员退出登录
 */
exports.logout = async (req, res) => {
  try {
    // 将当前访问令牌添加到黑名单
    const token = req.token;
    if (token) {
      await authUtils.blacklistToken(token);
    }

    return res.status(200).json({ message: "已成功退出登录!" });
  } catch (error) {
    console.error("退出登录过程中出错:", error);
    return res
      .status(500)
      .json({ message: "服务器错误", error: error.message });
  }
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

    if (!userType || !["user", "staff"].includes(userType)) {
      return res
        .status(400)
        .json({ message: "请提供有效的用户类型 (user 或 staff)!" });
    }

    // 根据用户类型查找用户
    let user;
    if (userType === "user") {
      user = await User.findOne({ where: { email } });
    } else {
      user = await Staff.findOne({ where: { email } });
    }

    if (!user) {
      // 出于安全考虑，即使用户不存在也返回成功
      return res.status(200).json({
        message: "如果该邮箱存在，我们已发送密码重置邮件。请查收您的邮箱。",
      });
    }

    // 生成重置令牌
    const token = authUtils.generateRandomToken();
    const expiresAt = authUtils.generateExpiryDate(2); // 2小时后过期

    // 存储重置令牌
    await PasswordReset.create({
      userID: userType === "user" ? user.userID : user.staffID,
      userType: userType === "user" ? "User" : "Staff",
      token,
      expiresAt,
    });

    // 发送重置密码邮件
    try {
      await mailUtils.sendPasswordResetEmail(user, token);
      console.log(`密码重置邮件已发送至 ${user.email}`);
    } catch (emailError) {
      console.error("发送密码重置邮件失败:", emailError);
      // 出于安全考虑，即使邮件发送失败也返回相同的成功消息
    }

    res.status(200).json({
      message: "如果该邮箱存在，我们已发送密码重置邮件。请查收您的邮箱。",
    });
  } catch (error) {
    console.error("请求重置密码过程中出错:", error);
    // 出于安全考虑，即使发生错误也不暴露详细信息
    res.status(200).json({
      message: "如果该邮箱存在，我们已发送密码重置邮件。请查收您的邮箱。",
    });
  }
};

/**
 * 重置密码
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmNewPassword } = req.body;

    if (!token || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "请提供所有必需的字段!" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "两次输入的密码不匹配!" });
    }

    // 验证密码强度
    const passwordValidation = authUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    // 根据令牌查找密码重置记录
    const resetRecord = await PasswordReset.findOne({
      where: {
        token: token,
        expiresAt: { [db.Sequelize.Op.gt]: new Date() }, // 未过期
        isUsed: false,
      },
    });

    if (!resetRecord) {
      return res.status(400).json({ message: "无效或已过期的令牌!" });
    }

    // 根据重置记录找到用户或工作人员
    let user;
    const entityType = resetRecord.userType;
    const userId = resetRecord.userID;

    if (entityType === "User") {
      user = await User.findByPk(userId);
    } else if (entityType === "Staff") {
      user = await Staff.findByPk(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }

    // 更新密码
    const hashedPassword = await authUtils.hashPassword(newPassword);
    await user.update({
      passwordHash: hashedPassword,
      // 增加令牌版本，使所有已颁发的令牌失效
      tokenVersion: (user.tokenVersion || 0) + 1,
    });

    // 标记密码重置记录为已使用
    await resetRecord.update({ isUsed: true });

    res.status(200).json({ message: "密码已成功重置!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "密码重置过程中发生错误!", error: error.message });
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

    // 查找验证记录
    const verification = await db.emailVerifications.findOne({
      where: {
        token,
        expiresAt: { [db.Sequelize.Op.gt]: new Date() }, // 未过期
        isUsed: false,
      },
    });

    if (!verification) {
      return res.status(400).json({ message: "无效或已过期的验证令牌!" });
    }

    // 更新用户邮箱验证状态
    const userType = verification.userType;
    const userId = verification.userID;

    let user;
    if (userType === "User") {
      user = await User.findByPk(userId);
    } else if (userType === "Staff") {
      user = await Staff.findByPk(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }

    // 更新用户邮箱验证状态和验证记录状态
    await user.update({ emailVerified: true });
    await verification.update({ isUsed: true });

    res.status(200).json({
      message: "邮箱验证成功!",
      verified: true,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "邮箱验证过程中发生错误!", error: error.message });
  }
};
