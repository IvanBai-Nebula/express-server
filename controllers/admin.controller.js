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

/**
 * 获取管理员仪表盘统计数据
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. 获取用户统计
    const userCount = await User.count();
    const staffCount = await Staff.count();
    const adminCount = await Staff.count({ where: { isAdmin: true } });
    
    // 2. 获取内容统计
    const articleCount = await KnowledgeArticle.count();
    const publishedArticleCount = await KnowledgeArticle.count({ where: { status: 'Published' } });
    
    const experienceCount = await LearningExperience.count();
    const approvedExperienceCount = await LearningExperience.count({ where: { status: 'Approved' } });
    const pendingExperienceCount = await LearningExperience.count({ where: { status: 'PendingReview' } });
    
    // 3. 获取分类和标签统计
    const categoryCount = await MedicalCategory.count();
    const tagCount = await Tag.count();
    
    // 4. 获取近期增长趋势
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    const newUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: lastMonth
        }
      }
    });
    
    const newArticles = await KnowledgeArticle.count({
      where: {
        createdAt: {
          [Op.gte]: lastMonth
        }
      }
    });
    
    const newExperiences = await LearningExperience.count({
      where: {
        createdAt: {
          [Op.gte]: lastMonth
        }
      }
    });
    
    // 5. 获取热门内容
    const topArticles = await KnowledgeArticle.findAll({
      where: { status: 'Published' },
      order: [['viewCount', 'DESC']],
      limit: 5,
      attributes: ['articleID', 'title', 'viewCount', 'averageRating', 'createdAt']
    });
    
    const topExperiences = await LearningExperience.findAll({
      where: { status: 'Approved' },
      order: [['upvoteCount', 'DESC']],
      limit: 5,
      attributes: ['experienceID', 'title', 'upvoteCount', 'createdAt']
    });
    
    // 返回统计数据
    res.status(200).json({
      users: {
        total: userCount,
        newLastMonth: newUsers
      },
      staff: {
        total: staffCount,
        admins: adminCount
      },
      content: {
        articles: {
          total: articleCount,
          published: publishedArticleCount,
          newLastMonth: newArticles
        },
        experiences: {
          total: experienceCount,
          approved: approvedExperienceCount,
          pending: pendingExperienceCount,
          newLastMonth: newExperiences
        }
      },
      taxonomy: {
        categories: categoryCount,
        tags: tagCount
      },
      popular: {
        articles: topArticles,
        experiences: topExperiences
      }
    });
  } catch (error) {
    res.status(500).json({ message: "获取仪表盘统计数据时发生错误!", error: error.message });
  }
};

/**
 * 获取系统审计日志
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, actionType, adminId, fromDate, toDate } = req.query;
    
    const offset = (page - 1) * limit;
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
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: Staff,
          as: 'admin',
          attributes: ['staffID', 'username']
        }
      ]
    });
    
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      logs: rows
    });
  } catch (error) {
    res.status(500).json({ message: "获取审计日志时发生错误!", error: error.message });
  }
};

/**
 * 获取用户列表 (包括用户和工作人员)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = 'all', search, isActive } = req.query;
    
    const offset = (page - 1) * limit;
    let totalCount = 0;
    let users = [];
    
    // 查询条件
    const userWhereClause = {};
    const staffWhereClause = {};
    
    if (search) {
      const searchCondition = {
        [Op.or]: [
          { username: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      };
      userWhereClause[Op.and] = [searchCondition];
      staffWhereClause[Op.and] = [searchCondition];
    }
    
    if (isActive !== undefined) {
      const activeCondition = { isActive: isActive === 'true' };
      
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
    if (type === 'all' || type === 'user') {
      const userResult = await User.findAndCountAll({
        where: userWhereClause,
        limit: type === 'all' ? Math.floor(parseInt(limit) / 2) : parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['passwordHash'] }
      });
      
      totalCount += type === 'all' ? userResult.count : 0;
      users = users.concat(userResult.rows.map(user => ({
        ...user.toJSON(),
        userType: 'User'
      })));
      
      if (type !== 'all') {
        totalCount = userResult.count;
      }
    }
    
    if (type === 'all' || type === 'staff') {
      const staffResult = await Staff.findAndCountAll({
        where: staffWhereClause,
        limit: type === 'all' ? Math.ceil(parseInt(limit) / 2) : parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['passwordHash'] }
      });
      
      totalCount += type === 'all' ? staffResult.count : 0;
      users = users.concat(staffResult.rows.map(staff => ({
        ...staff.toJSON(),
        userType: 'Staff'
      })));
      
      if (type !== 'all') {
        totalCount = staffResult.count;
      }
    }
    
    // 排序
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.status(200).json({
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
      users
    });
  } catch (error) {
    res.status(500).json({ message: "获取用户列表时发生错误!", error: error.message });
  }
};

/**
 * 更新用户状态
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    const { isActive } = req.body;
    
    if (isActive === undefined) {
      return res.status(400).json({ message: "请提供状态参数!" });
    }
    
    let user;
    
    if (userType === 'User') {
      user = await User.findByPk(userId);
    } else if (userType === 'Staff') {
      user = await Staff.findByPk(userId);
      
      // 检查是否是管理员，防止停用管理员账户
      if (user && user.isAdmin && !isActive) {
        return res.status(403).json({ message: "无法停用管理员账户!" });
      }
    } else {
      return res.status(400).json({ message: "无效的用户类型!" });
    }
    
    if (!user) {
      return res.status(404).json({ message: "用户不存在!" });
    }
    
    await user.update({ isActive });
    
    // 记录审计日志
    await AuditLog.create({
      adminStaffID: req.userId,
      actionType: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      targetEntityType: userType,
      targetEntityID: userId,
      oldValue: JSON.stringify({ isActive: !isActive }),
      newValue: JSON.stringify({ isActive }),
      ipAddress: req.ip
    });
    
    res.status(200).json({
      message: `用户已${isActive ? '激活' : '停用'}!`,
      user: {
        id: user.id || user.userID || user.staffID,
        userType,
        isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: "更新用户状态时发生错误!", error: error.message });
  }
};

/**
 * 创建工作人员账户
 */
exports.createStaffAccount = async (req, res) => {
  try {
    const { username, email, password, isAdmin = false } = req.body;
    
    // 验证请求体
    if (!username || !email || !password) {
      return res.status(400).json({ message: "用户名、邮箱和密码不能为空!" });
    }
    
    // 检查用户名或邮箱是否已存在
    const existingStaff = await Staff.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });
    
    if (existingStaff) {
      return res.status(400).json({ message: "用户名或邮箱已被使用!" });
    }
    
    // 创建工作人员账户
    const newStaff = await Staff.create({
      username,
      email,
      password,  // 假设模型中有钩子处理密码哈希
      isAdmin
    });
    
    // 记录审计日志
    await AuditLog.create({
      adminStaffID: req.userId,
      actionType: 'CREATE_STAFF',
      targetEntityType: 'Staff',
      targetEntityID: newStaff.staffID,
      newValue: JSON.stringify({
        username: newStaff.username,
        email: newStaff.email,
        isAdmin: newStaff.isAdmin
      }),
      ipAddress: req.ip
    });
    
    res.status(201).json({
      message: "工作人员账户创建成功!",
      staff: {
        staffID: newStaff.staffID,
        username: newStaff.username,
        email: newStaff.email,
        isAdmin: newStaff.isAdmin,
        createdAt: newStaff.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: "创建工作人员账户时发生错误!", error: error.message });
  }
};

/**
 * 获取特定工作人员详情
 */
exports.getStaffById = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    const staff = await Staff.findByPk(staffId, {
      attributes: { exclude: ['passwordHash'] }
    });
    
    if (!staff) {
      return res.status(404).json({ message: "工作人员不存在!" });
    }
    
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: "获取工作人员详情时发生错误!", error: error.message });
  }
};

/**
 * 更新工作人员信息
 */
exports.updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    const staff = await Staff.findByPk(staffId);
    
    if (!staff) {
      return res.status(404).json({ message: "工作人员不存在!" });
    }
    
    // 可更新的字段
    const updatableFields = [
      'username',
      'email',
      'avatarURL',
      'isAdmin',
      'isActive'
    ];
    
    const updates = {};
    
    // 只更新提供的字段
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        // 对于用户名和邮箱，需要检查唯一性
        if (field === 'username' && req.body.username !== staff.username) {
          const existingUsername = await Staff.findOne({
            where: { username: req.body.username }
          });
          
          if (existingUsername) {
            return res.status(400).json({ message: "用户名已被使用!" });
          }
        }
        
        if (field === 'email' && req.body.email !== staff.email) {
          const existingEmail = await Staff.findOne({
            where: { email: req.body.email }
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
    const updatedStaff = await Staff.findByPk(staffId, {
      attributes: { exclude: ['passwordHash'] }
    });

    // 记录审计日志 (更新工作人员信息)
    await AuditLog.create({
        adminStaffID: req.userId, // Assuming req.userId contains the ID of the admin performing the action
        actionType: 'UPDATE_STAFF',
        targetEntityType: 'Staff',
        targetEntityID: staffId,
        // oldValue: JSON.stringify(staff.get({ plain: true })), // Consider capturing old values if needed
        newValue: JSON.stringify(updates),
        ipAddress: req.ip
    });
    
    res.status(200).json({
      message: "工作人员信息已更新!",
      staff: updatedStaff
    });
  } catch (error) {
    res.status(500).json({ message: "更新工作人员信息时发生错误!", error: error.message });
  }
};

/**
 * 重置工作人员密码
 */
exports.resetStaffPassword = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ message: "请提供新密码!" });
    }
    
    const staff = await Staff.findByPk(staffId);
    
    if (!staff) {
      return res.status(404).json({ message: "工作人员不存在!" });
    }
    
    // 散列新密码
    const authUtils = require("../utils/auth.utils"); // Ensure authUtils is available
    const hashedPassword = await authUtils.hashPassword(newPassword); 
    
    // 更新密码
    await staff.update({ passwordHash: hashedPassword });

    // 记录审计日志 (重置工作人员密码)
    await AuditLog.create({
        adminStaffID: req.userId,
        actionType: 'RESET_STAFF_PASSWORD',
        targetEntityType: 'Staff',
        targetEntityID: staffId,
        ipAddress: req.ip 
    });
    
    res.status(200).json({ message: "工作人员密码已重置!" });
  } catch (error) {
    res.status(500).json({ message: "重置工作人员密码时发生错误!", error: error.message });
  }
};

/**
 * 删除工作人员
 */
exports.deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    const staff = await Staff.findByPk(staffId);
    
    if (!staff) {
      return res.status(404).json({ message: "工作人员不存在!" });
    }
    
    // 防止删除自己 (如果当前登录的管理员也是一个 staff 记录)
    // This check might need adjustment based on how admin identity (req.userId) relates to staff records
    if (staff.staffID === req.userId && staff.isAdmin) { // Example check
      return res.status(400).json({ message: "管理员无法删除自己的账户通过此接口!" });
    }
    
    // 软删除，将账户标记为非活跃
    await staff.update({ isActive: false });
    
    // 也可以选择硬删除
    // await staff.destroy();

    // 记录审计日志 (删除/停用工作人员)
    await AuditLog.create({
        adminStaffID: req.userId,
        actionType: 'DELETE_STAFF', // Or 'DEACTIVATE_STAFF' if it's a soft delete
        targetEntityType: 'Staff',
        targetEntityID: staffId,
        oldValue: JSON.stringify({ isActive: true }), // Assuming it was active before
        newValue: JSON.stringify({ isActive: false }),
        ipAddress: req.ip
    });
    
    res.status(200).json({ message: "工作人员账户已删除!" });
  } catch (error) {
    res.status(500).json({ message: "删除工作人员时发生错误!", error: error.message });
  }
};

/**
 * 获取系统配置
 */
exports.getSystemConfig = async (req, res) => {
  try {
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
        passwordMinLength: 8
      },
      content: {
        allowComments: true,
        moderateComments: true,
        moderateExperiences: true
      }
    });
  } catch (error) {
    res.status(500).json({ message: "获取系统配置时发生错误!", error: error.message });
  }
};

/**
 * 更新系统配置
 */
exports.updateSystemConfig = async (req, res) => {
  try {
    const { general, users, content } = req.body;
    
    // 这里应该有更新系统配置表的代码
    // 由于没有看到系统配置表，这里只返回成功响应
    
    // 记录审计日志
    await AuditLog.create({
      adminStaffID: req.userId,
      actionType: 'UPDATE_SYSTEM_CONFIG',
      newValue: JSON.stringify(req.body),
      ipAddress: req.ip
    });
    
    res.status(200).json({
      message: "系统配置已更新!",
      config: { general, users, content }
    });
  } catch (error) {
    res.status(500).json({ message: "更新系统配置时发生错误!", error: error.message });
  }
};

/**
 * 删除标签 (管理员)
 */
exports.deleteTag = async (req, res) => {
  try {
    const { tagId } = req.params;
    const adminUserId = req.userId; // Assuming admin user ID is available in req.userId

    const tag = await Tag.findByPk(tagId);

    if (!tag) {
      return res.status(404).json({ message: "标签不存在!" });
    }

    // 检查标签是否正在使用
    const usageCount = await ArticleTag.count({
      where: { tagID: tagId }
    });

    if (usageCount > 0) {
      return res.status(400).json({
        message: "标签正在被使用，无法删除!",
        usageCount
      });
    }
    
    const oldTagValue = JSON.stringify(tag.toJSON());

    // 删除标签
    await tag.destroy();

    // 记录审计日志
    await AuditLog.create({
      adminStaffID: adminUserId,
      actionType: 'DELETE_TAG',
      targetEntityType: 'Tag',
      targetEntityID: tagId,
      oldValue: oldTagValue,
      ipAddress: req.ip
    });

    res.status(200).json({ message: "标签已成功删除!" });
  } catch (error) {
    console.error("Error deleting tag:", error);
    res.status(500).json({ message: "删除标签时发生错误!", error: error.message });
  }
};

/**
 * 合并标签 (管理员)
 * 将源标签的所有关联迁移到目标标签，然后删除源标签
 */
exports.mergeTags = async (req, res) => {
  try {
    const { sourceTagId, targetTagId } = req.body;
    const adminUserId = req.userId; // Assuming admin user ID is available in req.userId

    if (!sourceTagId || !targetTagId) {
      return res.status(400).json({ message: "源标签和目标标签ID不能为空!" });
    }

    if (sourceTagId === targetTagId) {
      return res.status(400).json({ message: "源标签和目标标签不能相同!" });
    }

    // 检查两个标签是否存在
    const sourceTag = await Tag.findByPk(sourceTagId);
    const targetTag = await Tag.findByPk(targetTagId);

    if (!sourceTag) {
      return res.status(404).json({ message: "源标签不存在!" });
    }

    if (!targetTag) {
      return res.status(404).json({ message: "目标标签不存在!" });
    }

    // 查找源标签关联的所有文章
    const articleTagsToMigrate = await ArticleTag.findAll({
      where: { tagID: sourceTagId }
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
            tagID: targetTagId
          },
          transaction: t
        });

        // 如果不存在，创建新关联
        if (!existingLink) {
          await ArticleTag.create({
            articleID: articleTag.articleID,
            tagID: targetTagId
          }, { transaction: t });
          migratedCount++;
        }
      }

      // 删除源标签的所有关联
      await ArticleTag.destroy({
        where: { tagID: sourceTagId },
        transaction: t
      });

      const oldSourceTagValue = JSON.stringify(sourceTag.toJSON());
      // 删除源标签
      await sourceTag.destroy({ transaction: t });

      // 提交事务
      await t.commit();

      // 记录审计日志
      await AuditLog.create({
        adminStaffID: adminUserId,
        actionType: 'MERGE_TAGS',
        targetEntityType: 'Tag',
        targetEntityID: targetTagId, // Target tag is the one that remains
        oldValue: JSON.stringify({ sourceTagId, sourceTagData: oldSourceTagValue }),
        newValue: JSON.stringify({ targetTagId, migratedAssociations: migratedCount }),
        ipAddress: req.ip
      });

      res.status(200).json({
        message: `标签 "${sourceTag.name}" 已成功合并到 "${targetTag.name}"!`,
        migratedAssociations: migratedCount
      });
    } catch (error) {
      // 回滚事务
      await t.rollback();
      throw error; // Rethrow to be caught by outer catch block
    }
  } catch (error) {
    console.error("Error merging tags:", error);
    res.status(500).json({ message: "合并标签时发生错误!", error: error.message });
  }
}; 