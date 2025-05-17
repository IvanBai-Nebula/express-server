const db = require("../models");
const LearningExperience = db.learningExperiences;
const ExperienceReview = db.experienceReviews;
const ExperienceComment = db.experienceComments;
const UserBookmark = db.userBookmarks;
const User = db.users;
const Staff = db.staff;
const Notification = db.notifications;
const KnowledgeArticle = db.knowledgeArticles;
const Bookmark = db.bookmarks;
const { Op } = require("sequelize");
const {
  asyncHandler,
  createError,
} = require("../middleware/errorHandler.middleware");

/**
 * 创建新心得
 */
exports.createExperience = asyncHandler(async (req, res) => {
  const {
    title,
    richTextContent,
    allowComments = true,
    relatedArticleID,
  } = req.body;

  // 基本验证
  if (!title || !richTextContent) {
    throw createError("心得标题和内容不能为空!", 400);
  }

  // 如果提供了关联文章ID，验证文章是否存在
  if (relatedArticleID) {
    const article = await KnowledgeArticle.findByPk(relatedArticleID);
    if (!article) {
      throw createError("关联的文章不存在!", 404);
    }
  }

  // 创建心得
  const experience = await LearningExperience.create({
    title,
    richTextContent,
    userID: req.userId,
    status: "Draft", // 默认为草稿状态
    allowComments,
    relatedArticleID,
  });

  res.status(201).json({
    message: "心得创建成功!",
    experience,
  });
});

/**
 * 获取心得列表
 */
exports.getAllExperiences = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status = "Approved,Published,Draft",
    userId,
    search,
    sortBy = "createdAt",
    sortOrder = "DESC",
  } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = {};

  // 状态过滤
  if (status) {
    const statusArray = status.split(",");
    whereClause.status = { [db.Sequelize.Op.in]: statusArray };
    console.log("Status filter:", whereClause.status);
  }

  // 用户过滤
  if (userId) {
    whereClause.userID = userId;
  }

  // 搜索过滤
  if (search) {
    whereClause[db.Sequelize.Op.or] = [
      { title: { [db.Sequelize.Op.like]: `%${search}%` } },
      { richTextContent: { [db.Sequelize.Op.like]: `%${search}%` } },
    ];
  }

  console.log("Final where clause:", JSON.stringify(whereClause));

  // 查询心得
  const { count, rows } = await LearningExperience.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, sortOrder]],
    include: [
      {
        model: User,
        as: "user",
        attributes: ["userID", "username", "avatarURL"],
      },
      {
        model: KnowledgeArticle,
        as: "relatedArticle",
        attributes: ["articleID", "title"],
        required: false,
      },
    ],
  });

  console.log(`Found ${count} experiences`);

  // 如果没有找到记录，查询数据库中的状态值
  if (count === 0) {
    // 检查数据库中是否有记录
    const totalCount = await LearningExperience.count();
    console.log(`Total experiences in database: ${totalCount}`);

    // 如果有记录，获取状态分布
    if (totalCount > 0) {
      const statusCounts = await LearningExperience.findAll({
        attributes: [
          "status",
          [db.Sequelize.fn("count", db.Sequelize.col("status")), "count"],
        ],
        group: ["status"],
        raw: true,
      });
      console.log("Experiences by status:", statusCounts);
    }
  }

  res.status(200).json({
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    experiences: rows,
  });
});

/**
 * 获取特定心得详情
 */
exports.getExperienceById = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;

  // 查找心得及其关联数据
  const experience = await LearningExperience.findByPk(experienceId, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["userID", "username", "avatarURL"],
      },
      {
        model: KnowledgeArticle,
        as: "relatedArticle",
        attributes: ["articleID", "title", "summary"],
        required: false,
      },
      {
        model: ExperienceReview,
        as: "reviews",
        include: [
          {
            model: Staff,
            as: "reviewer",
            attributes: ["staffID", "username"],
          },
        ],
        required: false,
      },
    ],
  });

  if (!experience) {
    throw createError("心得不存在!", 404);
  }

  // 检查心得状态
  const isStaff = req.userRole === "staff";
  const isOwner = req.userId === experience.userID;

  // 如果不是已批准状态，且不是工作人员或作者，则拒绝访问
  if (
    experience.status !== "Approved" &&
    experience.status !== "Published" &&
    !isStaff &&
    !isOwner
  ) {
    throw createError("您无权访问此心得!", 403);
  }

  // 检查当前用户是否已收藏该心得
  let isBookmarked = false;
  if (req.userId) {
    const bookmark = await UserBookmark.findOne({
      where: {
        userID: req.userId,
        userType: req.userRole === "staff" ? "Staff" : "User",
        entityType: "LearningExperience",
        entityID: experienceId,
      },
    });
    isBookmarked = !!bookmark;
  }

  // 获取评论数量
  const commentCount = await ExperienceComment.count({
    where: {
      experienceID: experienceId,
      status: "Visible",
    },
  });

  // 构建响应
  const response = {
    ...experience.toJSON(),
    commentCount,
    isBookmarked,
  };

  res.status(200).json(response);
});

/**
 * 更新心得
 */
exports.updateExperience = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;
  const { title, richTextContent, allowComments, status } = req.body;

  // 查找心得
  const experience = await LearningExperience.findByPk(experienceId);

  if (!experience) {
    throw createError("心得不存在!", 404);
  }

  // 权限检查：只有作者或工作人员可以修改
  const isStaff = req.userRole === "staff";
  const isOwner = req.userId === experience.userID;

  if (!isStaff && !isOwner) {
    throw createError("您没有权限修改此心得!", 403);
  }

  // 普通用户不能修改已批准或已拒绝的心得
  if (
    !isStaff &&
    (experience.status === "Approved" || experience.status === "Rejected")
  ) {
    throw createError("已审核的心得不能修改!", 400);
  }

  // 准备更新数据
  const updateData = {};

  // 作者可以更新的字段
  if (isOwner) {
    if (title !== undefined) updateData.title = title;
    if (richTextContent !== undefined)
      updateData.richTextContent = richTextContent;
    if (allowComments !== undefined) updateData.allowComments = allowComments;

    // 如果心得状态为草稿，可以提交审核
    if (status === "PendingReview" && experience.status === "Draft") {
      updateData.status = "PendingReview";
    }
  }

  // 工作人员可以更新的字段
  if (isStaff) {
    if (status !== undefined) updateData.status = status;
  }

  // 更新心得
  await experience.update(updateData);

  // 如果工作人员更改了状态，添加审核记录
  if (isStaff && status && status !== experience.status) {
    const { reviewComments } = req.body;

    await ExperienceReview.create({
      experienceID: experienceId,
      reviewerStaffID: req.userId,
      reviewResult: status,
      comments: reviewComments || null,
    });

    // 发送通知给作者
    await Notification.create({
      recipientUserID: experience.userID,
      recipientUserType: "User",
      type: `EXPERIENCE_${status.toUpperCase()}`,
      content: `您的心得"${experience.title}"已${
        status === "Approved"
          ? "通过审核"
          : status === "Rejected"
          ? "被拒绝"
          : status === "Published"
          ? "发布"
          : "需要修改"
      }`,
      relatedEntityType: "LearningExperience",
      relatedEntityID: experienceId,
    });
  }

  // 获取更新后的心得
  const updatedExperience = await LearningExperience.findByPk(experienceId, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["userID", "username", "avatarURL"],
      },
      {
        model: KnowledgeArticle,
        as: "relatedArticle",
        attributes: ["articleID", "title"],
        required: false,
      },
    ],
  });

  res.status(200).json({
    message: "心得更新成功!",
    experience: updatedExperience,
  });
});

/**
 * 删除心得
 */
exports.deleteExperience = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;

  // 查找心得
  const experience = await LearningExperience.findByPk(experienceId);

  if (!experience) {
    throw createError("心得不存在!", 404);
  }

  // 权限检查：只有作者或工作人员可以删除
  const isStaff = req.userRole === "staff";
  const isOwner = req.userId === experience.userID;

  if (!isStaff && !isOwner) {
    throw createError("您没有权限删除此心得!", 403);
  }

  // 删除心得相关的评论
  await ExperienceComment.destroy({
    where: { experienceID: experienceId },
  });

  // 删除心得的审核记录
  await ExperienceReview.destroy({
    where: { experienceID: experienceId },
  });

  // 删除心得的收藏
  await UserBookmark.destroy({
    where: {
      entityType: "LearningExperience",
      entityID: experienceId,
    },
  });

  // 删除相关通知
  await Notification.destroy({
    where: {
      relatedEntityType: "LearningExperience",
      relatedEntityID: experienceId,
    },
  });

  // 删除心得
  await experience.destroy();

  res.status(200).json({ message: "心得已成功删除!" });
});

/**
 * 添加评论
 */
exports.addComment = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;
  const { commentText, parentCommentID } = req.body;

  // 验证请求
  if (!commentText) {
    throw createError("评论内容不能为空!", 400);
  }

  // 检查心得是否存在
  const experience = await LearningExperience.findByPk(experienceId);

  if (!experience) {
    throw createError("心得不存在!", 404);
  }

  // 检查心得是否允许评论
  if (!experience.allowComments) {
    throw createError("该心得不允许评论!", 403);
  }

  // 检查心得状态
  if (experience.status !== "Approved" && experience.status !== "Published") {
    throw createError("只能评论已批准或已发布的心得!", 403);
  }

  // 如果是回复评论，检查父评论是否存在
  if (parentCommentID) {
    const parentComment = await ExperienceComment.findByPk(parentCommentID);

    if (!parentComment || parentComment.experienceID !== experienceId) {
      throw createError("父评论不存在!", 404);
    }

    if (parentComment.status !== "Visible") {
      throw createError("无法回复已隐藏或已删除的评论!", 403);
    }
  }

  // 创建评论
  const comment = await ExperienceComment.create({
    experienceID: experienceId,
    userID: req.userId,
    userType: req.userRole === "staff" ? "Staff" : "User",
    commentText,
    parentCommentID,
  });

  // 发送通知给心得作者（如果评论者不是作者自己）
  if (req.userId !== experience.userID) {
    await Notification.create({
      recipientUserID: experience.userID,
      recipientUserType: "User",
      type: "NEW_EXPERIENCE_COMMENT",
      content: `您的心得"${experience.title}"收到了新评论`,
      relatedEntityType: "ExperienceComment",
      relatedEntityID: comment.commentID,
    });
  }

  // 如果是回复评论，发送通知给被回复的评论作者
  if (parentCommentID) {
    const parentComment = await ExperienceComment.findByPk(parentCommentID, {
      attributes: ["userID", "userType"],
    });

    if (parentComment && parentComment.userID !== req.userId) {
      await Notification.create({
        recipientUserID: parentComment.userID,
        recipientUserType: parentComment.userType,
        type: "EXPERIENCE_COMMENT_REPLY",
        content: `您在心得"${experience.title}"中的评论收到了回复`,
        relatedEntityType: "ExperienceComment",
        relatedEntityID: comment.commentID,
      });
    }
  }

  // 获取包含用户信息的完整评论
  const createdComment = await ExperienceComment.findByPk(comment.commentID, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["userID", "username", "avatarURL"],
        required: false,
      },
      {
        model: Staff,
        as: "staffUser",
        attributes: ["staffID", "username", "avatarURL"],
        required: false,
      },
    ],
  });

  res.status(201).json({
    message: "评论添加成功!",
    comment: createdComment,
  });
});

/**
 * 获取心得评论列表
 */
exports.getComments = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // 检查心得是否存在
  const experience = await LearningExperience.findByPk(experienceId);

  if (!experience) {
    throw createError("心得不存在!", 404);
  }

  const offset = (page - 1) * limit;

  // 查询根评论
  const { count, rows } = await ExperienceComment.findAndCountAll({
    where: {
      experienceID: experienceId,
      parentCommentID: null, // 只获取根评论
      status: "Visible",
    },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: User,
        as: "user",
        attributes: ["userID", "username", "avatarURL"],
        required: false,
      },
      {
        model: Staff,
        as: "staffUser",
        attributes: ["staffID", "username", "avatarURL"],
        required: false,
      },
    ],
  });

  // 对于每个根评论，获取其回复
  const commentsWithReplies = await Promise.all(
    rows.map(async (comment) => {
      const replies = await ExperienceComment.findAll({
        where: {
          parentCommentID: comment.commentID,
          status: "Visible",
        },
        order: [["createdAt", "ASC"]],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["userID", "username", "avatarURL"],
            required: false,
          },
          {
            model: Staff,
            as: "staffUser",
            attributes: ["staffID", "username", "avatarURL"],
            required: false,
          },
        ],
      });

      return {
        ...comment.toJSON(),
        replies,
      };
    })
  );

  res.status(200).json({
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    comments: commentsWithReplies,
  });
});

/**
 * 删除/隐藏评论
 */
exports.deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // 查找评论
  const comment = await ExperienceComment.findByPk(commentId);

  if (!comment) {
    throw createError("评论不存在!", 404);
  }

  // 权限检查：只有评论作者、心得作者或工作人员可以处理评论
  const isStaff = req.userRole === "staff";
  const isCommentOwner =
    req.userId === comment.userID &&
    req.userRole.toLowerCase() === comment.userType.toLowerCase();

  // 获取心得以检查用户是否为心得作者
  const experience = await LearningExperience.findByPk(comment.experienceID);
  const isExperienceOwner = experience && req.userId === experience.userID;

  if (!isStaff && !isCommentOwner && !isExperienceOwner) {
    throw createError("您没有权限删除此评论!", 403);
  }

  if (isStaff) {
    // 工作人员可以隐藏评论
    await comment.update({ status: "HiddenByModerator" });
  } else {
    // 评论作者可以删除自己的评论
    await comment.update({ status: "DeletedByUser" });
  }

  res.status(200).json({ message: "评论已成功删除/隐藏!" });
});

/**
 * 点赞心得
 */
exports.upvoteExperience = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;

  // 检查心得是否存在
  const experience = await LearningExperience.findByPk(experienceId);

  if (!experience) {
    throw createError("心得不存在!", 404);
  }

  // 检查心得状态
  if (experience.status !== "Approved" && experience.status !== "Published") {
    throw createError("只能点赞已批准或已发布的心得!", 403);
  }

  // 增加点赞数
  await experience.increment("upvoteCount");

  // 获取更新后的心得
  const updatedExperience = await LearningExperience.findByPk(experienceId);

  res.status(200).json({
    message: "点赞成功!",
    upvoteCount: updatedExperience.upvoteCount,
  });
});

/**
 * 收藏/取消收藏心得
 */
exports.toggleBookmark = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;

  // 检查心得是否存在
  const experience = await LearningExperience.findByPk(experienceId);

  if (!experience) {
    throw createError("心得不存在!", 404);
  }

  // 查找现有收藏
  const existingBookmark = await UserBookmark.findOne({
    where: {
      userID: req.userId,
      userType: req.userRole === "staff" ? "Staff" : "User",
      entityType: "LearningExperience",
      entityID: experienceId,
    },
  });

  if (existingBookmark) {
    // 取消收藏
    await existingBookmark.destroy();

    res.status(200).json({
      message: "已取消收藏心得!",
      isBookmarked: false,
    });
  } else {
    // 添加收藏
    await UserBookmark.create({
      userID: req.userId,
      userType: req.userRole === "staff" ? "Staff" : "User",
      entityType: "LearningExperience",
      entityID: experienceId,
    });

    res.status(200).json({
      message: "心得已成功收藏!",
      isBookmarked: true,
    });
  }
});

/**
 * 获取待审核的心得列表 (工作人员)
 */
exports.getPendingExperiences = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const offset = (page - 1) * limit;

  // 查询待审核心得
  const { count, rows } = await LearningExperience.findAndCountAll({
    where: { status: "PendingReview" },
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [["createdAt", "ASC"]],
    include: [
      {
        model: User,
        as: "user",
        attributes: ["userID", "username", "avatarURL"],
      },
    ],
  });

  res.status(200).json({
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    experiences: rows,
  });
});

/**
 * 修改自己的心得评论
 * PUT /api/v1/experiences/comments/:commentId
 */
exports.updateExperienceComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { commentText } = req.body;
  const userId = req.userId;
  const userType = req.userRole === "staff" ? "Staff" : "User";

  if (!commentText || commentText.trim() === "") {
    throw createError("评论内容不能为空!", 400);
  }

  const comment = await db.experienceComments.findByPk(commentId);

  if (!comment) {
    throw createError("评论不存在!", 404);
  }

  // 检查用户是否有权修改此评论 (必须是评论的作者)
  if (comment.userID !== userId || comment.userType !== userType) {
    throw createError("您没有权限修改此评论!", 403);
  }

  // 检查评论状态，例如是否允许修改非草稿状态的评论
  // if (comment.status !== 'Visible') { // 或者根据您的业务逻辑调整
  //   return res.status(400).json({ message: "此状态的评论不能修改!" });
  // }

  comment.commentText = commentText;
  // 如果您的 ExperienceComment 模型有 updatedAt 字段且 timestamps: true (或者您手动管理它)
  // comment.updatedAt = new Date();
  await comment.save();

  // 查询更新后的评论，可能需要包含用户信息等
  const updatedComment = await db.experienceComments.findByPk(commentId, {
    include: [
      {
        model: userType === "User" ? db.users : db.staff,
        as: userType.toLowerCase(), // 'user' or 'staff' based on userType
        attributes: [
          userType === "User" ? "userID" : "staffID",
          "username",
          "avatarURL",
        ],
      },
    ],
  });

  res.status(200).json({ message: "评论修改成功!", comment: updatedComment });
});

/**
 * 举报学习心得
 * POST /api/v1/experiences/:experienceId/report
 */
exports.reportExperience = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;
  const { reason, details } = req.body; // 举报原因和详细说明
  const reporterUserId = req.userId;
  const reporterUserType = req.userRole === "staff" ? "Staff" : "User";

  if (!reason) {
    throw createError("举报原因不能为空!", 400);
  }

  const experience = await db.learningExperiences.findByPk(experienceId);
  if (!experience) {
    throw createError("要举报的心得不存在!", 404);
  }

  // TODO: 实现举报存储逻辑，例如存到新的 Report表 或通过通知系统通知管理员
  // 例如，创建一个通知给所有管理员
  const admins = await db.staff.findAll({
    where: { isAdmin: true, isActive: true },
  });
  const notificationPromises = admins.map((admin) => {
    return db.notifications.create({
      recipientUserID: admin.staffID,
      recipientUserType: "Staff",
      type: "EXPERIENCE_REPORTED",
      content: `学习心得 (ID: ${experienceId}, 标题: "${
        experience.title
      }") 被用户 (ID: ${reporterUserId}, 类型: ${reporterUserType}) 举报。原因: ${reason}. 详情: ${
        details || "无"
      }`,
      relatedEntityType: "LearningExperience",
      relatedEntityID: experienceId,
    });
  });
  await Promise.all(notificationPromises);

  res.status(200).json({ message: "举报已提交,感谢您的反馈!" });
});

/**
 * 举报心得评论
 * POST /api/v1/experiences/comments/:commentId/report
 */
exports.reportExperienceComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { reason, details } = req.body;
  const reporterUserId = req.userId;
  const reporterUserType = req.userRole === "staff" ? "Staff" : "User";

  if (!reason) {
    throw createError("举报原因不能为空!", 400);
  }

  const comment = await db.experienceComments.findByPk(commentId, {
    include: [{ model: db.learningExperiences, as: "experience" }], // 获取关联的心得信息
  });
  if (!comment) {
    throw createError("要举报的评论不存在!", 404);
  }

  // TODO: 实现举报存储逻辑
  const admins = await db.staff.findAll({
    where: { isAdmin: true, isActive: true },
  });
  const notificationPromises = admins.map((admin) => {
    return db.notifications.create({
      recipientUserID: admin.staffID,
      recipientUserType: "Staff",
      type: "EXPERIENCE_COMMENT_REPORTED",
      content: `心得评论 (ID: ${commentId}) 在心得 (ID: ${
        comment.experienceID
      }, 标题: "${
        comment.experience ? comment.experience.title : "N/A"
      }") 下被用户 (ID: ${reporterUserId}, 类型: ${reporterUserType}) 举报。原因: ${reason}. 详情: ${
        details || "无"
      }`,
      relatedEntityType: "ExperienceComment",
      relatedEntityID: commentId,
    });
  });
  await Promise.all(notificationPromises);

  res.status(200).json({ message: "评论举报已提交,感谢您的反馈!" });
});

/**
 * 用户提交心得进行审核
 */
exports.submitForReview = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;

  // 查找心得
  const experience = await LearningExperience.findByPk(experienceId);

  if (!experience) {
    throw createError("心得不存在！", 404);
  }

  // 权限检查：只有作者可以提交审核
  if (req.userId !== experience.userID) {
    throw createError("您没有权限提交此心得审核！", 403);
  }

  // 状态检查：只有草稿状态可以提交审核
  if (experience.status !== "Draft") {
    throw createError(
      `心得当前状态为"${experience.status}"，只有草稿状态的心得可以提交审核！`,
      400
    );
  }

  // 更新状态为待审核
  await experience.update({ status: "PendingReview" });

  // 获取更新后的心得
  const updatedExperience = await LearningExperience.findByPk(experienceId, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["userID", "username", "avatarURL"],
      },
      {
        model: KnowledgeArticle,
        as: "relatedArticle",
        attributes: ["articleID", "title"],
        required: false,
      },
    ],
  });

  res.status(200).json({
    message: "心得已成功提交审核！",
    experience: updatedExperience,
  });
});

/**
 * 工作人员审核心得
 */
exports.reviewExperience = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;
  const { status, reviewComments } = req.body;

  // 验证请求
  if (!status || !["Approved", "Rejected", "Published"].includes(status)) {
    throw createError(
      "无效的审核结果！审核结果必须为 'Approved'、'Rejected' 或 'Published'",
      400
    );
  }

  // 查找心得
  const experience = await LearningExperience.findByPk(experienceId);

  if (!experience) {
    throw createError("心得不存在！", 404);
  }

  // 状态检查：只有待审核状态可以被审核
  if (experience.status !== "PendingReview") {
    throw createError(
      `心得当前状态为"${experience.status}"，只有待审核状态的心得可以进行审核！`,
      400
    );
  }

  // 创建审核记录
  const review = await ExperienceReview.create({
    experienceID: experienceId,
    reviewerStaffID: req.userId,
    reviewResult: status,
    comments: reviewComments || null,
  });

  // 更新心得状态
  await experience.update({ status });

  // 发送通知给作者
  await Notification.create({
    recipientUserID: experience.userID,
    recipientUserType: "User",
    type: `EXPERIENCE_${status.toUpperCase()}`,
    content: `您的心得"${experience.title}"已${
      status === "Approved"
        ? "通过审核"
        : status === "Published"
        ? "发布"
        : "被拒绝"
    }${reviewComments ? "，审核意见：" + reviewComments : ""}`,
    relatedEntityType: "LearningExperience",
    relatedEntityID: experienceId,
  });

  // 获取审核记录详情（包括审核人信息）
  const reviewWithDetails = await ExperienceReview.findByPk(review.reviewID, {
    include: [
      {
        model: Staff,
        as: "reviewer",
        attributes: ["staffID", "username"],
      },
    ],
  });

  // 获取更新后的心得
  const updatedExperience = await LearningExperience.findByPk(experienceId, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["userID", "username", "avatarURL"],
      },
    ],
  });

  res.status(200).json({
    message: `心得审核${
      status === "Approved"
        ? "通过"
        : status === "Published"
        ? "并发布"
        : "拒绝"
    }成功！`,
    experience: updatedExperience,
    review: reviewWithDetails,
  });
});

/**
 * 获取心得审核历史
 */
exports.getReviewHistory = asyncHandler(async (req, res) => {
  const { experienceId } = req.params;

  // 查找心得
  const experience = await LearningExperience.findByPk(experienceId);

  if (!experience) {
    throw createError("心得不存在！", 404);
  }

  // 权限检查：只有作者或工作人员可以查看审核历史
  const isStaff = req.userRole === "staff";
  const isOwner = req.userId === experience.userID;

  if (!isStaff && !isOwner) {
    throw createError("您没有权限查看此心得的审核历史！", 403);
  }

  // 获取审核历史记录
  const reviews = await ExperienceReview.findAll({
    where: { experienceID: experienceId },
    include: [
      {
        model: Staff,
        as: "reviewer",
        attributes: ["staffID", "username"],
      },
    ],
    order: [["reviewTime", "DESC"]],
  });

  res.status(200).json({
    experienceId,
    title: experience.title,
    currentStatus: experience.status,
    reviews,
  });
});
