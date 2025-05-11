const db = require("../models");
const Staff = db.staff;
const authUtils = require("../utils/auth.utils");

/**
 * 获取当前工作人员信息
 */
exports.getCurrentStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.userId, {
      attributes: { exclude: ["passwordHash"] },
    });

    if (!staff) {
      return res.status(404).json({ message: "工作人员不存在!" });
    }

    res.status(200).json(staff);
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取工作人员信息时发生错误!", error: error.message });
  }
};

/**
 * 更新当前工作人员个人资料
 */
exports.updateProfile = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.userId);

    if (!staff) {
      return res.status(404).json({ message: "工作人员不存在!" });
    }

    // 可更新的字段
    const updatableFields = ["username", "email", "avatarURL"];

    const updates = {};

    // 只更新提供的字段
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        // 对于用户名和邮箱，需要检查唯一性
        if (field === "username" && req.body.username !== staff.username) {
          const existingUsername = await Staff.findOne({
            where: { username: req.body.username },
          });

          if (existingUsername) {
            return res.status(400).json({ message: "用户名已被使用!" });
          }
        }

        if (field === "email" && req.body.email !== staff.email) {
          const existingEmail = await Staff.findOne({
            where: { email: req.body.email },
          });

          if (existingEmail) {
            return res.status(400).json({ message: "电子邮件已被使用!" });
          }

          // 如果邮箱变更，需要重新验证
          updates.emailVerified = false;
        }

        updates[field] = req.body[field];
      }
    }

    await staff.update(updates);

    // 返回更新后的工作人员信息（不包含密码）
    const updatedStaff = await Staff.findByPk(req.userId, {
      attributes: { exclude: ["passwordHash"] },
    });

    res.status(200).json({
      message: "个人资料已更新!",
      staff: updatedStaff,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "更新个人资料时发生错误!", error: error.message });
  }
};

/**
 * 更新当前工作人员密码
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "请提供当前密码和新密码!" });
    }

    // 验证新密码格式
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "新密码长度必须至少为8位!" });
    }

    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return res
        .status(400)
        .json({ message: "新密码必须包含大写字母、小写字母和数字!" });
    }

    const staff = await Staff.findByPk(req.userId);

    if (!staff) {
      return res.status(404).json({ message: "工作人员不存在!" });
    }

    // 验证当前密码
    const isPasswordValid = await authUtils.comparePassword(
      currentPassword,
      staff.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "当前密码不正确!" });
    }

    // 对新密码进行散列处理
    const hashedPassword = await authUtils.hashPassword(newPassword);

    // 更新密码并递增令牌版本，使当前所有有效的令牌失效
    const currentTokenVersion = staff.tokenVersion || 0;
    await staff.update({
      passwordHash: hashedPassword,
      tokenVersion: currentTokenVersion + 1,
    });

    res.status(200).json({ message: "密码已成功更新，请重新登录!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "更新密码时发生错误!", error: error.message });
  }
};
