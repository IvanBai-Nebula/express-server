const db = require("../models");
const Staff = db.staff;
const {
  asyncHandler,
  createError,
} = require("../middleware/errorHandler.middleware");
const authUtils = require("../utils/auth.utils");

/**
 * 获取当前工作人员信息
 */
exports.getCurrentStaff = asyncHandler(async (req, res) => {
  const staffId = req.userId;

  const staff = await Staff.findByPk(staffId, {
    attributes: { exclude: ["passwordHash"] }, // 排除敏感信息
  });

  if (!staff) {
    throw createError("工作人员不存在!", 404);
  }

  res.status(200).json(staff);
});

/**
 * 更新当前工作人员个人资料
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const staffId = req.userId;
  const {
    username,
    email,
    avatarURL,
    preferredLanguage,
    notificationPreferences,
  } = req.body;

  const staff = await Staff.findByPk(staffId);

  if (!staff) {
    throw createError("工作人员不存在!", 404);
  }

  // 如果更改用户名，检查新用户名是否已存在
  if (username && username !== staff.username) {
    const existingUsername = await Staff.findOne({
      where: { username },
    });

    if (existingUsername) {
      throw createError("用户名已被使用!", 400);
    }
  }

  // 如果更改邮箱，检查新邮箱是否已存在，并将邮箱验证状态设为false
  if (email && email !== staff.email) {
    const existingEmail = await Staff.findOne({
      where: { email },
    });

    if (existingEmail) {
      throw createError("邮箱已被使用!", 400);
    }
  }

  // 更新信息
  const updates = {};

  if (username) updates.username = username;

  if (email && email !== staff.email) {
    updates.email = email;
    updates.emailVerified = false;

    // 生成新的验证令牌并发送验证邮件
    // 这部分代码根据邮件验证系统实现可能有所不同
  }

  if (avatarURL !== undefined) updates.avatarURL = avatarURL;
  if (preferredLanguage) updates.preferredLanguage = preferredLanguage;

  if (notificationPreferences) {
    updates.notificationPreferences = {
      ...staff.notificationPreferences,
      ...notificationPreferences,
    };
  }

  await staff.update(updates);

  // 获取更新后的信息（排除敏感字段）
  const updatedStaff = await Staff.findByPk(staffId, {
    attributes: { exclude: ["passwordHash"] },
  });

  res.status(200).json({
    message: "个人资料已更新!",
    staff: updatedStaff,
  });
});

/**
 * 更新当前工作人员密码
 */
exports.updatePassword = asyncHandler(async (req, res) => {
  const staffId = req.userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw createError("请提供当前密码和新密码!", 400);
  }

  const staff = await Staff.findByPk(staffId);

  if (!staff) {
    throw createError("工作人员不存在!", 404);
  }

  // 验证当前密码
  const isPasswordValid = await authUtils.comparePassword(
    currentPassword,
    staff.passwordHash
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
  await staff.update({ passwordHash: hashedPassword });

  // 可选：撤销现有的刷新令牌
  if (staff.tokenVersion !== undefined) {
    staff.tokenVersion = staff.tokenVersion + 1;
    await staff.save();
  }

  res.status(200).json({
    message: "密码已成功更新!",
  });
});
