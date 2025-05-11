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
      attributes: { exclude: ["passwordHash"] }, // 排除敏感信息
    });

    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }

    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取用户信息时发生错误!", error: error.message });
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
      "username",
      "email",
      "avatarURL",
      "preferredLanguage",
      "notificationPreferences",
    ];

    const updates = {};
    let emailChanged = false;

    // 只更新提供的字段
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        // 对于用户名和邮箱，需要检查唯一性
        if (field === "username" && req.body.username !== user.username) {
          if (req.body.username.length < 3 || req.body.username.length > 50) {
            return res
              .status(400)
              .json({ message: "用户名长度必须在3-50个字符之间!" });
          }

          if (!/^[a-zA-Z0-9_\-]+$/.test(req.body.username)) {
            return res
              .status(400)
              .json({ message: "用户名只能包含字母、数字、下划线和连字符!" });
          }

          const existingUsername = await User.findOne({
            where: { username: req.body.username },
          });

          if (existingUsername) {
            return res.status(400).json({ message: "用户名已被使用!" });
          }
        }

        if (field === "email" && req.body.email !== user.email) {
          // 验证邮箱格式
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
            return res.status(400).json({ message: "无效的电子邮件格式!" });
          }

          const existingEmail = await User.findOne({
            where: { email: req.body.email },
          });

          if (existingEmail) {
            return res.status(400).json({ message: "电子邮件已被使用!" });
          }

          // 如果邮箱变更，需要重新验证
          updates.emailVerified = false;
          emailChanged = true;
        }

        updates[field] = req.body[field];
      }
    }

    await user.update(updates);

    // 如果邮箱已变更，发送验证邮件
    if (emailChanged) {
      try {
        // 生成验证令牌
        const token = require("../utils/auth.utils").generateRandomToken();
        const expiryDate = require("../utils/auth.utils").generateExpiryDate(
          24
        ); // 24小时有效期

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

        // 发送验证邮件
        await require("../utils/mail.utils").sendVerificationEmail(user, token);
        console.log(`验证邮件已发送至新邮箱 ${user.email}`);
      } catch (emailError) {
        console.error("发送验证邮件失败:", emailError);
        // 邮件发送失败不应影响用户资料更新
      }
    }

    // 返回更新后的用户信息（不包含密码）
    const updatedUser = await User.findByPk(req.userId, {
      attributes: { exclude: ["passwordHash"] },
    });

    res.status(200).json({
      message: emailChanged
        ? "个人资料已更新! 请检查您的新邮箱以完成验证。"
        : "个人资料已更新!",
      user: updatedUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "更新个人资料时发生错误!", error: error.message });
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

    try {
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
    } catch (passwordError) {
      console.error("密码验证或更新过程中出错:", passwordError);
      return res.status(500).json({
        message: "密码更新过程中出错",
        error: passwordError.message,
      });
    }
  } catch (error) {
    console.error("更新密码时发生错误:", error);
    // 检查是否是数据库表不存在的错误
    if (
      error.name === "SequelizeDatabaseError" &&
      error.original &&
      error.original.code === "ER_NO_SUCH_TABLE"
    ) {
      return res.status(503).json({
        message: "数据库维护中，请稍后再试",
        error: "临时数据库错误",
      });
    }
    res.status(500).json({
      message: "更新密码时发生错误!",
      error: error.message,
    });
  }
};

/**
 * 更新通知设置
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    // 允许直接从请求体中获取，或从notificationPreferences字段获取
    const preferences = req.body.notificationPreferences || req.body;

    // 确保请求中至少包含一项通知设置
    if (Object.keys(preferences).length === 0) {
      return res.status(400).json({ message: "请提供通知设置!" });
    }

    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }

    try {
      // 转换成JSON字符串再解析，确保是有效的JSON对象
      const validPreferences = JSON.parse(JSON.stringify(preferences));

      // 更新通知设置
      await user.update({ notificationPreferences: validPreferences });

      res.status(200).json({
        message: "通知设置已更新!",
        notificationPreferences: user.notificationPreferences,
      });
    } catch (prefError) {
      console.error("更新通知首选项时出错:", prefError);
      return res
        .status(400)
        .json({ message: "通知设置格式无效!", error: prefError.message });
    }
  } catch (error) {
    console.error("更新通知设置时发生错误:", error);
    res.status(500).json({
      message: "更新通知设置时发生错误!",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "注销账户时发生错误!", error: error.message });
  }
};

/**
 * 获取用户的学习心得列表
 */
exports.getUserExperiences = async (req, res) => {
  try {
    const experiences = await LearningExperience.findAll({
      where: { userID: req.userId },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(experiences);
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取学习心得列表时发生错误!", error: error.message });
  }
};
