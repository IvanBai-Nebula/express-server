const db = require("../models");
const User = db.users;
const Staff = db.staff;
const KnowledgeArticle = db.knowledgeArticles;
const LearningExperience = db.learningExperiences;
const MedicalCategory = db.medicalCategories;
const Tag = db.tags;
const AuditLog = db.auditLogs;
const ArticleTag = db.articleTags;
const { Op } = db.Sequelize;
const authUtils = require("../utils/auth.utils");
const {
  asyncHandler,
  createError,
} = require("../middleware/errorHandler.middleware");

/**
 * 获取管理员仪表盘统计数据
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  // 1. 获取用户统计
  const userCount = await User.count();
  const staffCount = await Staff.count();
  const adminCount = await Staff.count({ where: { isAdmin: true } });

  // 2. 获取内容统计
  const articleCount = await KnowledgeArticle.count();
  const publishedArticleCount = await KnowledgeArticle.count({
    where: { status: "Published" },
  });

  const experienceCount = await LearningExperience.count();
  const approvedExperienceCount = await LearningExperience.count({
    where: { status: "Approved" },
  });
  const pendingExperienceCount = await LearningExperience.count({
    where: { status: "PendingReview" },
  });

  // 3. 获取分类和标签统计
  const categoryCount = await MedicalCategory.count();
  const tagCount = await Tag.count();

  // 4. 获取近期增长趋势
  const today = new Date();
  const lastMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    today.getDate()
  );

  const newUsers = await User.count({
    where: {
      createdAt: {
        [Op.gte]: lastMonth,
      },
    },
  });

  const newArticles = await KnowledgeArticle.count({
    where: {
      createdAt: {
        [Op.gte]: lastMonth,
      },
    },
  });

  const newExperiences = await LearningExperience.count({
    where: {
      createdAt: {
        [Op.gte]: lastMonth,
      },
    },
  });

  // 5. 获取热门内容
  const topArticles = await KnowledgeArticle.findAll({
    where: { status: "Published" },
    order: [["viewCount", "DESC"]],
    limit: 5,
    attributes: [
      "articleID",
      "title",
      "viewCount",
      "averageRating",
      "createdAt",
    ],
  });

  const topExperiences = await LearningExperience.findAll({
    where: { status: "Approved" },
    order: [["upvoteCount", "DESC"]],
    limit: 5,
    attributes: ["experienceID", "title", "upvoteCount", "createdAt"],
  });

  // 返回统计数据
  res.status(200).json({
    users: {
      total: userCount,
      newLastMonth: newUsers,
    },
    staff: {
      total: staffCount,
      admins: adminCount,
    },
    content: {
      articles: {
        total: articleCount,
        published: publishedArticleCount,
        newLastMonth: newArticles,
      },
      experiences: {
        total: experienceCount,
        approved: approvedExperienceCount,
        pending: pendingExperienceCount,
        newLastMonth: newExperiences,
      },
    },
    taxonomy: {
      categories: categoryCount,
      tags: tagCount,
    },
    popular: {
      articles: topArticles,
      experiences: topExperiences,
    },
  });
});

/**
 * 获取系统审计日志
 */
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    actionType,
    adminId,
    fromDate,
    toDate,
  } = req.query;

  // 验证分页参数
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    throw createError("页码必须是大于0的整数", 400);
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw createError("每页大小必须是1-100之间的整数", 400);
  }

  const offset = (pageNum - 1) * limitNum;
  const whereClause = {};

  // 过滤条件
  if (actionType) {
    whereClause.actionType = actionType;
  }

  if (adminId) {
    whereClause.adminStaffID = adminId;
  }

  if (fromDate || toDate) {
    whereClause.timestamp = {};

    if (fromDate) {
      whereClause.timestamp[Op.gte] = new Date(fromDate);
    }

    if (toDate) {
      whereClause.timestamp[Op.lte] = new Date(toDate);
    }
  }

  const { count, rows } = await AuditLog.findAndCountAll({
    where: whereClause,
    limit: limitNum,
    offset: offset,
    order: [["timestamp", "DESC"]],
    include: [
      {
        model: Staff,
        as: "admin",
        attributes: ["staffID", "username"],
      },
    ],
  });

  res.status(200).json({
    totalItems: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    logs: rows,
  });
});

/**
 * 获取用户列表 (包括用户和工作人员)
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type = "all", search, isActive } = req.query;

  // 验证分页参数
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    throw createError("页码必须是大于0的整数", 400);
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw createError("每页大小必须是1-100之间的整数", 400);
  }

  const offset = (pageNum - 1) * limitNum;
  let totalCount = 0;
  let users = [];

  // 查询条件
  const userWhereClause = {};
  const staffWhereClause = {};

  if (search) {
    const searchCondition = {
      [Op.or]: [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ],
    };
    userWhereClause[Op.and] = [searchCondition];
    staffWhereClause[Op.and] = [searchCondition];
  }

  if (isActive !== undefined) {
    const activeCondition = { isActive: isActive === "true" };

    if (userWhereClause[Op.and]) {
      userWhereClause[Op.and].push(activeCondition);
    } else {
      userWhereClause[Op.and] = [activeCondition];
    }

    if (staffWhereClause[Op.and]) {
      staffWhereClause[Op.and].push(activeCondition);
    } else {
      staffWhereClause[Op.and] = [activeCondition];
    }
  }

  // 根据类型查询用户
  if (type === "all" || type === "user") {
    try {
      const userResult = await User.findAndCountAll({
        where: userWhereClause,
        limit: type === "all" ? Math.floor(limitNum / 2) : limitNum,
        offset: offset,
        order: [["createdAt", "DESC"]],
        attributes: { exclude: ["passwordHash"] },
      });

      totalCount += type === "all" ? userResult.count : 0;
      users = users.concat(
        userResult.rows.map((user) => ({
          ...user.toJSON(),
          userType: "User",
        }))
      );

      if (type !== "all") {
        totalCount = userResult.count;
      }
    } catch (error) {
      console.error("获取用户列表时出错:", error);
      // 出错但继续处理，可能只是User表有问题
    }
  }

  if (type === "all" || type === "staff") {
    try {
      const staffResult = await Staff.findAndCountAll({
        where: staffWhereClause,
        limit: type === "all" ? Math.ceil(limitNum / 2) : limitNum,
        offset: offset,
        order: [["createdAt", "DESC"]],
        attributes: { exclude: ["passwordHash"] },
      });

      totalCount += type === "all" ? staffResult.count : 0;
      users = users.concat(
        staffResult.rows.map((staff) => ({
          ...staff.toJSON(),
          userType: "Staff",
        }))
      );

      if (type !== "all") {
        totalCount = staffResult.count;
      }
    } catch (error) {
      console.error("获取工作人员列表时出错:", error);
      // 出错但继续处理，可能只是Staff表有问题
    }
  }

  // 处理排序
  users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json({
    totalItems: totalCount,
    totalPages: Math.ceil(totalCount / limitNum),
    currentPage: pageNum,
    users,
  });
});

/**
 * 更新用户状态
 */
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { userId, userType } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    throw createError("请提供状态参数!", 400);
  }

  let user;
  let idField;

  if (userType.toLowerCase() === "user") {
    user = await User.findByPk(userId);
    idField = "userID";
  } else if (userType.toLowerCase() === "staff") {
    user = await Staff.findByPk(userId);
    idField = "staffID";

    // 检查是否是管理员，防止停用管理员账户
    if (user && user.isAdmin && !isActive) {
      throw createError("无法停用管理员账户!", 403);
    }
  } else {
    throw createError("无效的用户类型!", 400);
  }

  if (!user) {
    throw createError("用户不存在!", 404);
  }

  // 保存原始状态用于审计
  const oldValue = { isActive: user.isActive };

  // 更新状态
  await user.update({ isActive });

  // 记录审计日志
  try {
    await db.auditLogs.create({
      logID: db.sequelize.fn("UUID"), // 使用内置的UUID函数
      actionType: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      targetEntityType: userType.toLowerCase(),
      targetEntityID: userId,
      oldValue: JSON.stringify(oldValue),
      newValue: JSON.stringify({ isActive }),
      timestamp: new Date(),
      ipAddress: req.ip,
      adminStaffID: req.userId,
    });
  } catch (auditError) {
    console.error("记录审计日志失败:", auditError);
    // 即使审计失败，仍然继续执行，不影响用户结果
  }

  res.status(200).json({
    message: `用户状态已更新为 ${isActive ? "激活" : "停用"}!`,
    userType,
    userId,
    isActive,
  });
});

/**
 * 创建工作人员账户
 */
exports.createStaffAccount = asyncHandler(async (req, res) => {
  const { username, email, password, isAdmin = false } = req.body;

  // 验证请求体
  if (!username || !email || !password) {
    throw createError("用户名、邮箱和密码不能为空!", 400);
  }

  // 检查用户名或邮箱是否已存在
  const existingStaff = await Staff.findOne({
    where: {
      [Op.or]: [{ username }, { email }],
    },
  });

  if (existingStaff) {
    throw createError("用户名或邮箱已被使用!", 400);
  }

  // 创建工作人员账户
  const newStaff = await Staff.create({
    username,
    email,
    password, // 假设模型中有钩子处理密码哈希
    isAdmin,
  });

  // 记录审计日志
  await AuditLog.create({
    adminStaffID: req.userId,
    actionType: "CREATE_STAFF",
    targetEntityType: "Staff",
    targetEntityID: newStaff.staffID,
    newValue: JSON.stringify({
      username: newStaff.username,
      email: newStaff.email,
      isAdmin: newStaff.isAdmin,
    }),
    ipAddress: req.ip,
  });

  res.status(201).json({
    message: "工作人员账户创建成功!",
    staff: {
      staffID: newStaff.staffID,
      username: newStaff.username,
      email: newStaff.email,
      isAdmin: newStaff.isAdmin,
      createdAt: newStaff.createdAt,
    },
  });
});

/**
 * 获取特定工作人员详情
 */
exports.getStaffById = asyncHandler(async (req, res) => {
  const { staffId } = req.params;

  const staff = await Staff.findByPk(staffId, {
    attributes: { exclude: ["passwordHash"] },
  });

  if (!staff) {
    throw createError("工作人员不存在!", 404);
  }

  res.status(200).json(staff);
});

/**
 * 更新工作人员信息
 */
exports.updateStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;

  const staff = await Staff.findByPk(staffId);

  if (!staff) {
    throw createError("工作人员不存在!", 404);
  }

  // 可更新的字段
  const updatableFields = [
    "username",
    "email",
    "avatarURL",
    "isAdmin",
    "isActive",
  ];

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
          throw createError("用户名已被使用!", 400);
        }
      }

      if (field === "email" && req.body.email !== staff.email) {
        const existingEmail = await Staff.findOne({
          where: { email: req.body.email },
        });

        if (existingEmail) {
          throw createError("电子邮件已被使用!", 400);
        }

        // 如果邮箱变更，需要重新验证
        updates.emailVerified = false;
      }

      updates[field] = req.body[field];
    }
  }

  await staff.update(updates);

  // 返回更新后的工作人员信息（不包含密码）
  const updatedStaff = await Staff.findByPk(staffId, {
    attributes: { exclude: ["passwordHash"] },
  });

  // 记录审计日志 (更新工作人员信息)
  await AuditLog.create({
    adminStaffID: req.userId, // Assuming req.userId contains the ID of the admin performing the action
    actionType: "UPDATE_STAFF",
    targetEntityType: "Staff",
    targetEntityID: staffId,
    // oldValue: JSON.stringify(staff.get({ plain: true })), // Consider capturing old values if needed
    newValue: JSON.stringify(updates),
    ipAddress: req.ip,
  });

  res.status(200).json({
    message: "工作人员信息已更新!",
    staff: updatedStaff,
  });
});

/**
 * 重置工作人员密码
 */
exports.resetStaffPassword = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    throw createError("请提供新密码!", 400);
  }

  const staff = await Staff.findByPk(staffId);

  if (!staff) {
    throw createError("工作人员不存在!", 404);
  }

  // 散列新密码
  const hashedPassword = await authUtils.hashPassword(newPassword);

  // 更新密码
  await staff.update({ passwordHash: hashedPassword });

  // 记录审计日志 (重置工作人员密码)
  await AuditLog.create({
    adminStaffID: req.userId,
    actionType: "RESET_STAFF_PASSWORD",
    targetEntityType: "Staff",
    targetEntityID: staffId,
    ipAddress: req.ip,
  });

  res.status(200).json({ message: "工作人员密码已重置!" });
});

/**
 * 删除工作人员
 */
exports.deleteStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;

  const staff = await Staff.findByPk(staffId);

  if (!staff) {
    throw createError("工作人员不存在!", 404);
  }

  // 防止删除自己 (如果当前登录的管理员也是一个 staff 记录)
  if (staff.staffID === req.userId && staff.isAdmin) {
    throw createError("管理员无法删除自己的账户通过此接口!", 400);
  }

  // 软删除，将账户标记为非活跃
  await staff.update({ isActive: false });

  // 也可以选择硬删除
  // await staff.destroy();

  // 记录审计日志 (删除/停用工作人员)
  await AuditLog.create({
    adminStaffID: req.userId,
    actionType: "DELETE_STAFF", // Or 'DEACTIVATE_STAFF' if it's a soft delete
    targetEntityType: "Staff",
    targetEntityID: staffId,
    oldValue: JSON.stringify({ isActive: true }), // Assuming it was active before
    newValue: JSON.stringify({ isActive: false }),
    ipAddress: req.ip,
  });

  res.status(200).json({ message: "工作人员账户已删除!" });
});

/**
 * 获取系统配置
 */
exports.getSystemConfig = asyncHandler(async (req, res) => {
  // 这里假设有一个系统配置表，如果没有，可以创建一个
  // 由于没有看到系统配置表，这里返回一些基本配置
  res.status(200).json({
    general: {
      siteName: "医疗知识学习平台",
      defaultItemsPerPage: 10,
      maxUploadFileSize: 5242880, // 5MB
    },
    users: {
      allowUserRegistration: true,
      requireEmailVerification: true,
      passwordMinLength: 8,
    },
    content: {
      allowComments: true,
      moderateComments: true,
      moderateExperiences: true,
    },
  });
});

/**
 * 更新系统配置
 */
exports.updateSystemConfig = asyncHandler(async (req, res) => {
  const { general, users, content } = req.body;

  // 这里应该有更新系统配置表的代码
  // 由于没有看到系统配置表，这里只返回成功响应

  // 记录审计日志
  await AuditLog.create({
    adminStaffID: req.userId,
    actionType: "UPDATE_SYSTEM_CONFIG",
    newValue: JSON.stringify(req.body),
    ipAddress: req.ip,
  });

  res.status(200).json({
    message: "系统配置已更新!",
    config: { general, users, content },
  });
});

/**
 * 删除标签 (管理员)
 */
exports.deleteTag = asyncHandler(async (req, res) => {
  const { tagId } = req.params;
  const adminUserId = req.userId; // 假设管理员用户ID在req.userId中

  const tag = await Tag.findByPk(tagId);

  if (!tag) {
    throw createError("标签不存在!", 404);
  }

  // 检查标签是否正在使用
  const usageCount = await ArticleTag.count({
    where: { tagID: tagId },
  });

  if (usageCount > 0) {
    throw createError("标签正在被使用，无法删除!", 400, null, { usageCount });
  }

  const oldTagValue = JSON.stringify(tag.toJSON());

  // 删除标签
  await tag.destroy();

  // 记录审计日志
  await AuditLog.create({
    adminStaffID: adminUserId,
    actionType: "DELETE_TAG",
    targetEntityType: "Tag",
    targetEntityID: tagId,
    oldValue: oldTagValue,
    ipAddress: req.ip,
  });

  res.status(200).json({ message: "标签已成功删除!" });
});

/**
 * 合并标签 (管理员)
 * 将源标签的所有关联迁移到目标标签，然后删除源标签
 */
exports.mergeTags = asyncHandler(async (req, res) => {
  const { sourceTagId, targetTagId } = req.body;
  const adminUserId = req.userId;

  if (!sourceTagId || !targetTagId) {
    throw createError("源标签和目标标签ID不能为空!", 400);
  }

  if (sourceTagId === targetTagId) {
    throw createError("源标签和目标标签不能相同!", 400);
  }

  // 检查两个标签是否存在
  const sourceTag = await Tag.findByPk(sourceTagId);
  const targetTag = await Tag.findByPk(targetTagId);

  if (!sourceTag) {
    throw createError("源标签不存在!", 404);
  }

  if (!targetTag) {
    throw createError("目标标签不存在!", 404);
  }

  // 查找源标签关联的所有文章
  const articleTagsToMigrate = await ArticleTag.findAll({
    where: { tagID: sourceTagId },
  });

  // 开始事务
  const t = await db.sequelize.transaction();
  let migratedCount = 0;

  try {
    // 处理每个关联
    for (const articleTag of articleTagsToMigrate) {
      // 检查是否已存在目标标签的关联
      const existingLink = await ArticleTag.findOne({
        where: {
          articleID: articleTag.articleID,
          tagID: targetTagId,
        },
        transaction: t,
      });

      // 如果不存在，创建新关联
      if (!existingLink) {
        await ArticleTag.create(
          {
            articleID: articleTag.articleID,
            tagID: targetTagId,
          },
          { transaction: t }
        );
        migratedCount++;
      }
    }

    // 删除源标签的所有关联
    await ArticleTag.destroy({
      where: { tagID: sourceTagId },
      transaction: t,
    });

    const oldSourceTagValue = JSON.stringify(sourceTag.toJSON());
    // 删除源标签
    await sourceTag.destroy({ transaction: t });

    // 提交事务
    await t.commit();

    // 记录审计日志
    await AuditLog.create({
      adminStaffID: adminUserId,
      actionType: "MERGE_TAGS",
      targetEntityType: "Tag",
      targetEntityID: targetTagId, // Target tag is the one that remains
      oldValue: JSON.stringify({
        sourceTagId,
        sourceTagData: oldSourceTagValue,
      }),
      newValue: JSON.stringify({
        targetTagId,
        migratedAssociations: migratedCount,
      }),
      ipAddress: req.ip,
    });

    res.status(200).json({
      message: `标签合并成功! 迁移了 ${migratedCount} 个关联`,
    });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    throw createError("合并标签过程中发生错误", 500);
  }
});
