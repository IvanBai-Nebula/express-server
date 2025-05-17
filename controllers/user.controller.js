const db = require("../models");
const User = db.users;
const LearningExperience = db.learningExperiences;
const authUtils = require("../utils/auth.utils");
const {
  asyncHandler,
  createError,
} = require("../middleware/errorHandler.middleware");

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const user = await User.findByPk(userId, {
    attributes: {
      exclude: ["passwordHash", "resetToken", "resetTokenExpires"],
    },
    });

    if (!user) {
    throw createError("用户不存在!", 404);
    }

    res.status(200).json(user);
});

/**
 * 更新用户个人资料
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const {
    username,
    email,
    avatarURL,
    preferredLanguage,
    notificationPreferences,
  } = req.body;

  const user = await User.findByPk(userId);

    if (!user) {
    throw createError("用户不存在!", 404);
    }

  // 如果更改用户名，检查新用户名是否已存在
  if (username && username !== user.username) {
          const existingUsername = await User.findOne({
      where: { username },
          });

          if (existingUsername) {
      throw createError("用户名已被使用!", 400);
          }
        }

  // 如果更改邮箱，检查新邮箱是否已存在，并将邮箱验证状态设为false
  if (email && email !== user.email) {
          const existingEmail = await User.findOne({
      where: { email },
          });

          if (existingEmail) {
      throw createError("邮箱已被使用!", 400);
    }
          }

  // 更新用户资料
  const updates = {};

  if (username) updates.username = username;

  if (email && email !== user.email) {
    updates.email = email;
          updates.emailVerified = false;

    // 生成新的验证令牌并发送验证邮件
    // 这部分代码根据邮件验证系统实现可能有所不同
  }

  if (avatarURL !== undefined) updates.avatarURL = avatarURL;
  if (preferredLanguage) updates.preferredLanguage = preferredLanguage;

  if (notificationPreferences) {
    updates.notificationPreferences = {
      ...user.notificationPreferences,
      ...notificationPreferences,
    };
    }

    await user.update(updates);

  // 获取更新后的用户数据（排除敏感字段）
  const updatedUser = await User.findByPk(userId, {
    attributes: {
      exclude: ["passwordHash", "resetToken", "resetTokenExpires"],
    },
    });

    res.status(200).json({
    message: "个人资料已更新!",
      user: updatedUser,
    });
});

/**
 * 更新用户密码
 */
exports.updatePassword = asyncHandler(async (req, res) => {
  const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
    throw createError("请提供当前密码和新密码!", 400);
    }

  const user = await User.findByPk(userId);

    if (!user) {
    throw createError("用户不存在!", 404);
    }

      // 验证当前密码
      const isPasswordValid = await authUtils.comparePassword(
        currentPassword,
        user.passwordHash
      );

      if (!isPasswordValid) {
    throw createError("当前密码不正确!", 401);
      }

  // 验证新密码强度
  const passwordValidation = authUtils.validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    throw createError(passwordValidation.message, 400);
  }

      // 更新密码
  const hashedPassword = await authUtils.hashPassword(newPassword);
      await user.update({ passwordHash: hashedPassword });

  // 撤销所有现有的刷新令牌（可选，增加安全性）
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.status(200).json({
    message: "密码已成功更新!",
    });
});

/**
 * 更新通知设置
 */
exports.updateNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.userId;

  if (!req.body || Object.keys(req.body).length === 0) {
    throw createError("请提供通知设置!", 400);
    }

  const user = await User.findByPk(userId);

    if (!user) {
    throw createError("用户不存在!", 404);
    }

      // 更新通知设置
  const currentPreferences = user.notificationPreferences || {};
  const updatedPreferences = { ...currentPreferences, ...req.body };

  await user.update({ notificationPreferences: updatedPreferences });

      res.status(200).json({
        message: "通知设置已更新!",
    notificationPreferences: updatedPreferences,
      });
});

/**
 * 删除账户
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
    throw createError("请提供密码以确认删除操作!", 400);
    }

    const user = await User.findByPk(req.userId);

    if (!user) {
    throw createError("用户不存在!", 404);
    }

    // 验证密码
    const isPasswordValid = await authUtils.comparePassword(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
    throw createError("密码不正确!", 401);
    }

    // 使用事务来确保关联数据处理的一致性
    const transaction = await db.sequelize.transaction();

    try {
      // 1. 处理用户的学习体验
      await LearningExperience.update(
        { isDeleted: true },
        {
          where: { userID: user.userID },
          transaction,
        }
      );

      // 2. 处理用户的通知
      await db.notifications.update(
        { isDeleted: true },
        {
          where: {
            recipientUserID: user.userID,
            recipientUserType: "User",
          },
          transaction,
        }
      );

      // 3. 处理用户的评论
      await db.experienceComments.update(
        { isDeleted: true, content: "此评论已被删除" },
        {
          where: { userID: user.userID },
          transaction,
        }
      );

      // 4. 处理用户的文章反馈
      await db.articleFeedbacks.update(
        { isDeleted: true },
        {
          where: { userID: user.userID },
          transaction,
        }
      );

      // 5. 删除用户电子邮件验证记录
      await db.emailVerifications.update(
        { isUsed: true },
        {
          where: {
            userID: user.userID,
            userType: "User",
          },
          transaction,
        }
      );

      // 6. 软删除用户账户
      await user.update(
        {
          isActive: false,
          email: `deleted_${user.userID}_${user.email}`, // 防止邮箱被重用
          username: `deleted_${user.userID}_${user.username}`, // 防止用户名被重用
          deletedAt: new Date(),
        },
        { transaction }
      );

      // 提交事务
      await transaction.commit();

      res.status(200).json({ message: "账户已成功注销!" });
    } catch (transactionError) {
      // 如果出错回滚事务
      await transaction.rollback();
      throw transactionError;
    }
});

/**
 * 获取用户的学习心得列表
 */
exports.getUserExperiences = asyncHandler(async (req, res) => {
    const experiences = await LearningExperience.findAll({
      where: { userID: req.userId },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(experiences);
});
