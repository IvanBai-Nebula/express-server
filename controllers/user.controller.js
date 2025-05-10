const db = require("../models");
const User = db.users;
const LearningExperience = db.learningExperiences;
const authUtils = require("../utils/auth.utils");

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['passwordHash'] } // 排除敏感信息
    });

    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "获取用户信息时发生错误!", error: error.message });
  }
};

/**
 * 更新用户个人资料
 */
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }

    // 可更新的字段
    const updatableFields = [
      'username', 
      'email', 
      'avatarURL', 
      'preferredLanguage', 
      'notificationPreferences'
    ];
    
    const updates = {};
    
    // 只更新提供的字段
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        // 对于用户名和邮箱，需要检查唯一性
        if (field === 'username' && req.body.username !== user.username) {
          const existingUsername = await User.findOne({
            where: { username: req.body.username }
          });
          
          if (existingUsername) {
            return res.status(400).json({ message: "用户名已被使用!" });
          }
        }
        
        if (field === 'email' && req.body.email !== user.email) {
          const existingEmail = await User.findOne({
            where: { email: req.body.email }
          });
          
          if (existingEmail) {
            return res.status(400).json({ message: "电子邮件已被使用!" });
          }
          
          // 如果邮箱变更，需要重新验证
          updates.emailVerified = false;
          
          // TODO: 发送验证邮件
          // sendVerificationEmail(user);
        }
        
        updates[field] = req.body[field];
      }
    }
    
    await user.update(updates);
    
    // 返回更新后的用户信息（不包含密码）
    const updatedUser = await User.findByPk(req.userId, {
      attributes: { exclude: ['passwordHash'] }
    });
    
    res.status(200).json({
      message: "个人资料已更新!",
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: "更新个人资料时发生错误!", error: error.message });
  }
};

/**
 * 更新密码
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "请提供当前密码和新密码!" });
    }
    
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }
    
    // 验证当前密码
    const isPasswordValid = await authUtils.comparePassword(
      currentPassword,
      user.passwordHash
    );
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "当前密码不正确!" });
    }
    
    // 对新密码进行散列处理
    const hashedPassword = await authUtils.hashPassword(newPassword);
    
    // 更新密码
    await user.update({ passwordHash: hashedPassword });
    
    res.status(200).json({ message: "密码已成功更新!" });
  } catch (error) {
    res.status(500).json({ message: "更新密码时发生错误!", error: error.message });
  }
};

/**
 * 更新通知设置
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { notificationPreferences } = req.body;
    
    if (!notificationPreferences) {
      return res.status(400).json({ message: "请提供通知设置!" });
    }
    
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }
    
    // 更新通知设置
    await user.update({ notificationPreferences });
    
    res.status(200).json({
      message: "通知设置已更新!",
      notificationPreferences: user.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({ message: "更新通知设置时发生错误!", error: error.message });
  }
};

/**
 * 删除账户
 */
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: "请提供密码以确认删除操作!" });
    }
    
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }
    
    // 验证密码
    const isPasswordValid = await authUtils.comparePassword(
      password,
      user.passwordHash
    );
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "密码不正确!" });
    }
    
    // 删除用户数据（可以选择软删除或硬删除）
    // 这里使用的是软删除，将账户标记为非活跃
    await user.update({ isActive: false });
    
    // 如果需要硬删除，需要考虑删除关联数据
    // await user.destroy();
    
    res.status(200).json({ message: "账户已成功注销!" });
  } catch (error) {
    res.status(500).json({ message: "注销账户时发生错误!", error: error.message });
  }
};

/**
 * 获取用户的学习心得列表
 */
exports.getUserExperiences = async (req, res) => {
  try {
    const experiences = await LearningExperience.findAll({
      where: { userID: req.userId },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json(experiences);
  } catch (error) {
    res.status(500).json({ message: "获取学习心得列表时发生错误!", error: error.message });
  }
}; 