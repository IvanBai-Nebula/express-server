const db = require("../models");
const Notification = db.notifications;

/**
 * 获取当前用户的通知列表
 */
exports.getUserNotifications = async (req, res) => {
  try {
    let { page = 1, limit = 10, isRead } = req.query;

    // 验证页码和限制参数
    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) {
      return res
        .status(400)
        .json({ message: "无效的页码，必须为大于0的整数!" });
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res
        .status(400)
        .json({ message: "无效的限制参数，必须为1-100之间的整数!" });
    }

    const offset = (page - 1) * limit;

    // 构建查询条件
    const whereClause = {
      recipientUserID: req.userId,
      recipientUserType: req.userRole === "staff" ? "Staff" : "User",
    };

    // 按已读/未读状态筛选
    if (isRead !== undefined) {
      whereClause.isRead = isRead === "true";
    }

    // 查询通知
    const { count, rows } = await Notification.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [["createdAt", "DESC"]],
    });

    // 获取未读通知数量
    const unreadCount = await Notification.count({
      where: {
        recipientUserID: req.userId,
        recipientUserType: req.userRole === "staff" ? "Staff" : "User",
        isRead: false,
      },
    });

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      unreadCount,
      notifications: rows,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取通知列表时发生错误!", error: error.message });
  }
};

/**
 * 标记通知为已读
 */
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({ message: "通知不存在!" });
    }

    // 验证权限：只能标记自己的通知
    if (
      notification.recipientUserID !== req.userId ||
      notification.recipientUserType !==
        (req.userRole === "staff" ? "Staff" : "User")
    ) {
      return res.status(403).json({ message: "您无权修改此通知!" });
    }

    // 如果通知已经标记为已读，直接返回成功
    if (notification.isRead) {
      return res.status(200).json({ message: "通知已是已读状态!" });
    }

    // 标记为已读
    await notification.update({ isRead: true });

    res.status(200).json({ message: "通知已标记为已读!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "标记通知已读时发生错误!", error: error.message });
  }
};

/**
 * 标记所有通知为已读
 */
exports.markAllAsRead = async (req, res) => {
  try {
    // 更新所有未读通知
    const result = await Notification.update(
      { isRead: true },
      {
        where: {
          recipientUserID: req.userId,
          recipientUserType: req.userRole === "staff" ? "Staff" : "User",
          isRead: false,
        },
      }
    );

    const updatedCount = result[0]; // Sequelize 返回的受影响行数

    res.status(200).json({
      message: "所有通知已标记为已读!",
      count: updatedCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "标记所有通知已读时发生错误!", error: error.message });
  }
};

/**
 * 删除通知
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({ message: "通知不存在!" });
    }

    // 验证权限：只能删除自己的通知
    if (
      notification.recipientUserID !== req.userId ||
      notification.recipientUserType !==
        (req.userRole === "staff" ? "Staff" : "User")
    ) {
      return res.status(403).json({ message: "您无权删除此通知!" });
    }

    // 检查通知是否与相关实体存在关联
    if (notification.relatedEntityID && notification.relatedEntityType) {
      let entityExists = false;

      switch (notification.relatedEntityType) {
        case "KnowledgeArticle":
          entityExists = await db.knowledgeArticles.findByPk(
            notification.relatedEntityID
          );
          break;
        case "LearningExperience":
          entityExists = await db.learningExperiences.findByPk(
            notification.relatedEntityID
          );
          break;
        case "ExperienceComment":
          entityExists = await db.experienceComments.findByPk(
            notification.relatedEntityID
          );
          break;
        case "ArticleFeedback":
          entityExists = await db.articleFeedbacks.findByPk(
            notification.relatedEntityID
          );
          break;
      }

      if (!entityExists) {
        console.log(
          `通知关联的实体 ${notification.relatedEntityType} ID ${notification.relatedEntityID} 不存在`
        );
      }
    }

    // 删除通知
    await notification.destroy();

    res.status(200).json({ message: "通知已成功删除!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "删除通知时发生错误!", error: error.message });
  }
};

/**
 * 获取通知详情并标记为已读
 */
exports.getNotificationDetails = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({ message: "通知不存在!" });
    }

    // 验证权限：只能查看自己的通知
    if (
      notification.recipientUserID !== req.userId ||
      notification.recipientUserType !==
        (req.userRole === "staff" ? "Staff" : "User")
    ) {
      return res.status(403).json({ message: "您无权查看此通知!" });
    }

    // 如果通知未读，标记为已读
    if (!notification.isRead) {
      await notification.update({ isRead: true });
    }

    // 根据通知类型和关联实体，获取额外信息
    let extraData = null;

    if (notification.relatedEntityType && notification.relatedEntityID) {
      switch (notification.relatedEntityType) {
        case "KnowledgeArticle":
          extraData = await db.knowledgeArticles.findByPk(
            notification.relatedEntityID,
            {
              attributes: [
                "articleID",
                "title",
                "coverImageURL",
                "status",
                "publishedAt",
              ],
            }
          );
          break;
        case "LearningExperience":
          extraData = await db.learningExperiences.findByPk(
            notification.relatedEntityID,
            {
              attributes: ["experienceID", "title", "status", "createdAt"],
            }
          );
          break;
        case "ExperienceComment":
          extraData = await db.experienceComments.findByPk(
            notification.relatedEntityID,
            {
              include: [
                {
                  model: db.learningExperiences,
                  as: "experience",
                  attributes: ["experienceID", "title"],
                },
              ],
            }
          );
          break;
        case "ArticleFeedback":
          extraData = await db.articleFeedbacks.findByPk(
            notification.relatedEntityID,
            {
              include: [
                {
                  model: db.knowledgeArticles,
                  as: "article",
                  attributes: ["articleID", "title"],
                },
              ],
            }
          );
          break;
      }
    }

    res.status(200).json({
      notification,
      relatedData: extraData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取通知详情时发生错误!", error: error.message });
  }
};

/**
 * 获取通知汇总信息
 */
exports.getNotificationSummary = async (req, res) => {
  try {
    // 获取未读通知数量
    const unreadCount = await Notification.count({
      where: {
        recipientUserID: req.userId,
        recipientUserType: req.userRole === "staff" ? "Staff" : "User",
        isRead: false,
      },
    });

    // 获取最新5条未读通知
    const latestUnread = await Notification.findAll({
      where: {
        recipientUserID: req.userId,
        recipientUserType: req.userRole === "staff" ? "Staff" : "User",
        isRead: false,
      },
      limit: 5,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      unreadCount,
      latestUnread,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取通知汇总信息时发生错误!", error: error.message });
  }
};
