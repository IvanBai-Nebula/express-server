const db = require("../models");
const LearningExperience = db.learningExperiences;
const ExperienceReview = db.experienceReviews;
const ExperienceComment = db.experienceComments;
const UserBookmark = db.userBookmarks;
const User = db.users;
const Staff = db.staff;
const Notification = db.notifications;
const KnowledgeArticle = db.knowledgeArticles;

/**
 * 创建新心得
 */
exports.createExperience = async (req, res) => {
  try {
    const { title, richTextContent, allowComments = true, relatedArticleID } = req.body;
    
    // 基本验证
    if (!title || !richTextContent) {
      return res.status(400).json({ message: "心得标题和内容不能为空!" });
    }
    
    // 如果提供了关联文章ID，验证文章是否存在
    if (relatedArticleID) {
      const article = await KnowledgeArticle.findByPk(relatedArticleID);
      if (!article) {
        return res.status(404).json({ message: "关联的文章不存在!" });
      }
    }
    
    // 创建心得
    const experience = await LearningExperience.create({
      title,
      richTextContent,
      userID: req.userId,
      status: 'Draft',  // 默认为草稿状态
      allowComments,
      relatedArticleID
    });
    
    res.status(201).json({
      message: "心得创建成功!",
      experience
    });
  } catch (error) {
    res.status(500).json({ message: "创建心得时发生错误!", error: error.message });
  }
};

/**
 * 获取心得列表
 */
exports.getAllExperiences = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'Approved', 
      userId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    // 状态过滤
    if (status) {
      whereClause.status = status;
    }
    
    // 用户过滤
    if (userId) {
      whereClause.userID = userId;
    }
    
    // 搜索过滤
    if (search) {
      whereClause[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.like]: `%${search}%` } },
        { richTextContent: { [db.Sequelize.Op.like]: `%${search}%` } }
      ];
    }
    
    // 查询心得
    const { count, rows } = await LearningExperience.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userID', 'username', 'avatarURL']
        },
        {
          model: KnowledgeArticle,
          as: 'relatedArticle',
          attributes: ['articleID', 'title'],
          required: false
        }
      ]
    });
    
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      experiences: rows
    });
  } catch (error) {
    res.status(500).json({ message: "获取心得列表时发生错误!", error: error.message });
  }
};

/**
 * 获取特定心得详情
 */
exports.getExperienceById = async (req, res) => {
  try {
    const { experienceId } = req.params;
    
    // 查找心得及其关联数据
    const experience = await LearningExperience.findByPk(experienceId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userID', 'username', 'avatarURL']
        },
        {
          model: KnowledgeArticle,
          as: 'relatedArticle',
          attributes: ['articleID', 'title', 'summary'],
          required: false
        },
        {
          model: ExperienceReview,
          as: 'reviews',
          include: [
            {
              model: Staff,
              as: 'reviewer',
              attributes: ['staffID', 'username']
            }
          ],
          required: false
        }
      ]
    });
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在!" });
    }
    
    // 检查心得状态
    const isStaff = req.userRole === 'staff';
    const isOwner = req.userId === experience.userID;
    
    // 如果不是已批准状态，且不是工作人员或作者，则拒绝访问
    if (experience.status !== 'Approved' && !isStaff && !isOwner) {
      return res.status(403).json({ message: "您无权访问此心得!" });
    }
    
    // 检查当前用户是否已收藏该心得
    let isBookmarked = false;
    if (req.userId) {
      const bookmark = await UserBookmark.findOne({
        where: {
          userID: req.userId,
          userType: req.userRole === 'staff' ? 'Staff' : 'User',
          entityType: 'LearningExperience',
          entityID: experienceId
        }
      });
      isBookmarked = !!bookmark;
    }
    
    // 获取评论数量
    const commentCount = await ExperienceComment.count({
      where: { 
        experienceID: experienceId,
        status: 'Visible'
      }
    });
    
    // 构建响应
    const response = {
      ...experience.toJSON(),
      commentCount,
      isBookmarked
    };
    
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "获取心得详情时发生错误!", error: error.message });
  }
};

/**
 * 更新心得
 */
exports.updateExperience = async (req, res) => {
  try {
    const { experienceId } = req.params;
    const { title, richTextContent, allowComments, status } = req.body;
    
    // 查找心得
    const experience = await LearningExperience.findByPk(experienceId);
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在!" });
    }
    
    // 权限检查：只有作者或工作人员可以修改
    const isStaff = req.userRole === 'staff';
    const isOwner = req.userId === experience.userID;
    
    if (!isStaff && !isOwner) {
      return res.status(403).json({ message: "您没有权限修改此心得!" });
    }
    
    // 普通用户不能修改已批准或已拒绝的心得
    if (!isStaff && (experience.status === 'Approved' || experience.status === 'Rejected')) {
      return res.status(400).json({ message: "已审核的心得不能修改!" });
    }
    
    // 准备更新数据
    const updateData = {};
    
    // 作者可以更新的字段
    if (isOwner) {
      if (title !== undefined) updateData.title = title;
      if (richTextContent !== undefined) updateData.richTextContent = richTextContent;
      if (allowComments !== undefined) updateData.allowComments = allowComments;
      
      // 如果心得状态为草稿，可以提交审核
      if (status === 'PendingReview' && experience.status === 'Draft') {
        updateData.status = 'PendingReview';
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
        comments: reviewComments || null
      });
      
      // 发送通知给作者
      await Notification.create({
        recipientUserID: experience.userID,
        recipientUserType: 'User',
        type: `EXPERIENCE_${status.toUpperCase()}`,
        content: `您的心得"${experience.title}"已${
          status === 'Approved' ? '通过审核' : 
          status === 'Rejected' ? '被拒绝' : 
          '需要修改'
        }`,
        relatedEntityType: 'LearningExperience',
        relatedEntityID: experienceId
      });
    }
    
    // 获取更新后的心得
    const updatedExperience = await LearningExperience.findByPk(experienceId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userID', 'username', 'avatarURL']
        },
        {
          model: KnowledgeArticle,
          as: 'relatedArticle',
          attributes: ['articleID', 'title'],
          required: false
        }
      ]
    });
    
    res.status(200).json({
      message: "心得更新成功!",
      experience: updatedExperience
    });
  } catch (error) {
    res.status(500).json({ message: "更新心得时发生错误!", error: error.message });
  }
};

/**
 * 删除心得
 */
exports.deleteExperience = async (req, res) => {
  try {
    const { experienceId } = req.params;
    
    // 查找心得
    const experience = await LearningExperience.findByPk(experienceId);
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在!" });
    }
    
    // 权限检查：只有作者或工作人员可以删除
    const isStaff = req.userRole === 'staff';
    const isOwner = req.userId === experience.userID;
    
    if (!isStaff && !isOwner) {
      return res.status(403).json({ message: "您没有权限删除此心得!" });
    }
    
    // 删除心得相关的评论
    await ExperienceComment.destroy({
      where: { experienceID: experienceId }
    });
    
    // 删除心得的审核记录
    await ExperienceReview.destroy({
      where: { experienceID: experienceId }
    });
    
    // 删除心得的收藏
    await UserBookmark.destroy({
      where: { 
        entityType: 'LearningExperience',
        entityID: experienceId
      }
    });
    
    // 删除相关通知
    await Notification.destroy({
      where: {
        relatedEntityType: 'LearningExperience',
        relatedEntityID: experienceId
      }
    });
    
    // 删除心得
    await experience.destroy();
    
    res.status(200).json({ message: "心得已成功删除!" });
  } catch (error) {
    res.status(500).json({ message: "删除心得时发生错误!", error: error.message });
  }
};

/**
 * 添加评论
 */
exports.addComment = async (req, res) => {
  try {
    const { experienceId } = req.params;
    const { commentText, parentCommentID } = req.body;
    
    // 验证请求
    if (!commentText) {
      return res.status(400).json({ message: "评论内容不能为空!" });
    }
    
    // 检查心得是否存在
    const experience = await LearningExperience.findByPk(experienceId);
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在!" });
    }
    
    // 检查心得是否允许评论
    if (!experience.allowComments) {
      return res.status(403).json({ message: "该心得不允许评论!" });
    }
    
    // 检查心得状态
    if (experience.status !== 'Approved') {
      return res.status(403).json({ message: "只能评论已批准的心得!" });
    }
    
    // 如果是回复评论，检查父评论是否存在
    if (parentCommentID) {
      const parentComment = await ExperienceComment.findByPk(parentCommentID);
      
      if (!parentComment || parentComment.experienceID !== experienceId) {
        return res.status(404).json({ message: "父评论不存在!" });
      }
      
      if (parentComment.status !== 'Visible') {
        return res.status(403).json({ message: "无法回复已隐藏或已删除的评论!" });
      }
    }
    
    // 创建评论
    const comment = await ExperienceComment.create({
      experienceID: experienceId,
      userID: req.userId,
      userType: req.userRole === 'staff' ? 'Staff' : 'User',
      commentText,
      parentCommentID
    });
    
    // 发送通知给心得作者（如果评论者不是作者自己）
    if (req.userId !== experience.userID) {
      await Notification.create({
        recipientUserID: experience.userID,
        recipientUserType: 'User',
        type: 'NEW_EXPERIENCE_COMMENT',
        content: `您的心得"${experience.title}"收到了新评论`,
        relatedEntityType: 'ExperienceComment',
        relatedEntityID: comment.commentID
      });
    }
    
    // 如果是回复评论，发送通知给被回复的评论作者
    if (parentCommentID) {
      const parentComment = await ExperienceComment.findByPk(parentCommentID, {
        attributes: ['userID', 'userType']
      });
      
      if (parentComment && parentComment.userID !== req.userId) {
        await Notification.create({
          recipientUserID: parentComment.userID,
          recipientUserType: parentComment.userType,
          type: 'EXPERIENCE_COMMENT_REPLY',
          content: `您在心得"${experience.title}"中的评论收到了回复`,
          relatedEntityType: 'ExperienceComment',
          relatedEntityID: comment.commentID
        });
      }
    }
    
    // 获取包含用户信息的完整评论
    const createdComment = await ExperienceComment.findByPk(comment.commentID, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userID', 'username', 'avatarURL'],
          required: false
        },
        {
          model: Staff,
          as: 'staff',
          attributes: ['staffID', 'username', 'avatarURL'],
          required: false
        }
      ]
    });
    
    res.status(201).json({
      message: "评论添加成功!",
      comment: createdComment
    });
  } catch (error) {
    res.status(500).json({ message: "添加评论时发生错误!", error: error.message });
  }
};

/**
 * 获取心得评论列表
 */
exports.getComments = async (req, res) => {
  try {
    const { experienceId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // 检查心得是否存在
    const experience = await LearningExperience.findByPk(experienceId);
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在!" });
    }
    
    const offset = (page - 1) * limit;
    
    // 查询根评论
    const { count, rows } = await ExperienceComment.findAndCountAll({
      where: { 
        experienceID: experienceId,
        parentCommentID: null, // 只获取根评论
        status: 'Visible'
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userID', 'username', 'avatarURL'],
          required: false
        },
        {
          model: Staff,
          as: 'staff',
          attributes: ['staffID', 'username', 'avatarURL'],
          required: false
        }
      ]
    });
    
    // 对于每个根评论，获取其回复
    const commentsWithReplies = await Promise.all(rows.map(async (comment) => {
      const replies = await ExperienceComment.findAll({
        where: { 
          parentCommentID: comment.commentID,
          status: 'Visible'
        },
        order: [['createdAt', 'ASC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['userID', 'username', 'avatarURL'],
            required: false
          },
          {
            model: Staff,
            as: 'staff',
            attributes: ['staffID', 'username', 'avatarURL'],
            required: false
          }
        ]
      });
      
      return {
        ...comment.toJSON(),
        replies
      };
    }));
    
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      comments: commentsWithReplies
    });
  } catch (error) {
    res.status(500).json({ message: "获取评论列表时发生错误!", error: error.message });
  }
};

/**
 * 删除/隐藏评论
 */
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // 查找评论
    const comment = await ExperienceComment.findByPk(commentId);
    
    if (!comment) {
      return res.status(404).json({ message: "评论不存在!" });
    }
    
    // 权限检查：只有评论作者、心得作者或工作人员可以处理评论
    const isStaff = req.userRole === 'staff';
    const isCommentOwner = req.userId === comment.userID && req.userRole.toLowerCase() === comment.userType.toLowerCase();
    
    // 获取心得以检查用户是否为心得作者
    const experience = await LearningExperience.findByPk(comment.experienceID);
    const isExperienceOwner = experience && req.userId === experience.userID;
    
    if (!isStaff && !isCommentOwner && !isExperienceOwner) {
      return res.status(403).json({ message: "您没有权限删除此评论!" });
    }
    
    if (isStaff) {
      // 工作人员可以隐藏评论
      await comment.update({ status: 'HiddenByModerator' });
    } else {
      // 评论作者可以删除自己的评论
      await comment.update({ status: 'DeletedByUser' });
    }
    
    res.status(200).json({ message: "评论已成功删除/隐藏!" });
  } catch (error) {
    res.status(500).json({ message: "删除评论时发生错误!", error: error.message });
  }
};

/**
 * 点赞心得
 */
exports.upvoteExperience = async (req, res) => {
  try {
    const { experienceId } = req.params;
    
    // 检查心得是否存在
    const experience = await LearningExperience.findByPk(experienceId);
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在!" });
    }
    
    // 检查心得状态
    if (experience.status !== 'Approved') {
      return res.status(403).json({ message: "只能点赞已批准的心得!" });
    }
    
    // 增加点赞数
    await experience.increment('upvoteCount');
    
    // 获取更新后的心得
    const updatedExperience = await LearningExperience.findByPk(experienceId);
    
    res.status(200).json({
      message: "点赞成功!",
      upvoteCount: updatedExperience.upvoteCount
    });
  } catch (error) {
    res.status(500).json({ message: "点赞时发生错误!", error: error.message });
  }
};

/**
 * 收藏/取消收藏心得
 */
exports.toggleBookmark = async (req, res) => {
  try {
    const { experienceId } = req.params;
    
    // 检查心得是否存在
    const experience = await LearningExperience.findByPk(experienceId);
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在!" });
    }
    
    // 查找现有收藏
    const existingBookmark = await UserBookmark.findOne({
      where: {
        userID: req.userId,
        userType: req.userRole === 'staff' ? 'Staff' : 'User',
        entityType: 'LearningExperience',
        entityID: experienceId
      }
    });
    
    if (existingBookmark) {
      // 取消收藏
      await existingBookmark.destroy();
      
      res.status(200).json({
        message: "已取消收藏心得!",
        isBookmarked: false
      });
    } else {
      // 添加收藏
      await UserBookmark.create({
        userID: req.userId,
        userType: req.userRole === 'staff' ? 'Staff' : 'User',
        entityType: 'LearningExperience',
        entityID: experienceId
      });
      
      res.status(200).json({
        message: "心得已成功收藏!",
        isBookmarked: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: "操作收藏时发生错误!", error: error.message });
  }
};

/**
 * 获取待审核的心得列表 (工作人员)
 */
exports.getPendingExperiences = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // 查询待审核心得
    const { count, rows } = await LearningExperience.findAndCountAll({
      where: { status: 'PendingReview' },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'ASC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userID', 'username', 'avatarURL']
        }
      ]
    });
    
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      experiences: rows
    });
  } catch (error) {
    res.status(500).json({ message: "获取待审核心得列表时发生错误!", error: error.message });
  }
}; 

/**
 * 修改自己的心得评论
 * PUT /api/v1/experiences/comments/:commentId
 */
exports.updateExperienceComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { commentText } = req.body;
    const userId = req.userId;
    const userType = req.userRole === 'staff' ? 'Staff' : 'User';

    if (!commentText || commentText.trim() === '') {
      return res.status(400).json({ message: "评论内容不能为空!" });
    }

    const comment = await db.experienceComments.findByPk(commentId);

    if (!comment) {
      return res.status(404).json({ message: "评论不存在!" });
    }

    // 检查用户是否有权修改此评论 (必须是评论的作者)
    if (comment.userID !== userId || comment.userType !== userType) {
      return res.status(403).json({ message: "您没有权限修改此评论!" });
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
          model: userType === 'User' ? db.users : db.staff,
          as: userType.toLowerCase(), // 'user' or 'staff' based on userType
          attributes: [userType === 'User' ? 'userID' : 'staffID', 'username', 'avatarURL']
        }
      ]
    });

    res.status(200).json({ message: "评论修改成功!", comment: updatedComment });

  } catch (error) {
    res.status(500).json({ message: "修改心得评论时发生错误!", error: error.message });
  }
};

/**
 * 举报学习心得
 * POST /api/v1/experiences/:experienceId/report
 */
exports.reportExperience = async (req, res) => {
  try {
    const { experienceId } = req.params;
    const { reason, details } = req.body; // 举报原因和详细说明
    const reporterUserId = req.userId;
    const reporterUserType = req.userRole === 'staff' ? 'Staff' : 'User';

    if (!reason) {
      return res.status(400).json({ message: "举报原因不能为空!" });
    }

    const experience = await db.learningExperiences.findByPk(experienceId);
    if (!experience) {
      return res.status(404).json({ message: "要举报的心得不存在!" });
    }

    // TODO: 实现举报存储逻辑，例如存到新的 Report表 或通过通知系统通知管理员
    // 例如，创建一个通知给所有管理员
    const admins = await db.staff.findAll({ where: { isAdmin: true, isActive: true } });
    const notificationPromises = admins.map(admin => {
      return db.notifications.create({
        recipientUserID: admin.staffID,
        recipientUserType: 'Staff',
        type: 'EXPERIENCE_REPORTED',
        content: `学习心得 (ID: ${experienceId}, 标题: "${experience.title}") 被用户 (ID: ${reporterUserId}, 类型: ${reporterUserType}) 举报。原因: ${reason}. 详情: ${details || '无'}`,
        relatedEntityType: 'LearningExperience',
        relatedEntityID: experienceId
      });
    });
    await Promise.all(notificationPromises);

    res.status(200).json({ message: "举报已提交,感谢您的反馈!" });

  } catch (error) {
    res.status(500).json({ message: "举报学习心得时发生错误!", error: error.message });
  }
};

/**
 * 举报心得评论
 * POST /api/v1/experiences/comments/:commentId/report
 */
exports.reportExperienceComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason, details } = req.body;
    const reporterUserId = req.userId;
    const reporterUserType = req.userRole === 'staff' ? 'Staff' : 'User';

    if (!reason) {
      return res.status(400).json({ message: "举报原因不能为空!" });
    }

    const comment = await db.experienceComments.findByPk(commentId, {
      include: [{ model: db.learningExperiences, as: 'experience' }] // 获取关联的心得信息
    });
    if (!comment) {
      return res.status(404).json({ message: "要举报的评论不存在!" });
    }

    // TODO: 实现举报存储逻辑
    const admins = await db.staff.findAll({ where: { isAdmin: true, isActive: true } });
    const notificationPromises = admins.map(admin => {
      return db.notifications.create({
        recipientUserID: admin.staffID,
        recipientUserType: 'Staff',
        type: 'EXPERIENCE_COMMENT_REPORTED',
        content: `心得评论 (ID: ${commentId}) 在心得 (ID: ${comment.experienceID}, 标题: "${comment.experience ? comment.experience.title : 'N/A'}") 下被用户 (ID: ${reporterUserId}, 类型: ${reporterUserType}) 举报。原因: ${reason}. 详情: ${details || '无'}`,
        relatedEntityType: 'ExperienceComment',
        relatedEntityID: commentId
      });
    });
    await Promise.all(notificationPromises);

    res.status(200).json({ message: "评论举报已提交,感谢您的反馈!" });

  } catch (error) {
    res.status(500).json({ message: "举报心得评论时发生错误!", error: error.message });
  }
};

/**
 * 用户提交心得进行审核
 */
exports.submitForReview = async (req, res) => {
  try {
    const { experienceId } = req.params;
    
    // 查找心得
    const experience = await LearningExperience.findByPk(experienceId);
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在！" });
    }
    
    // 权限检查：只有作者可以提交审核
    if (req.userId !== experience.userID) {
      return res.status(403).json({ message: "您没有权限提交此心得审核！" });
    }
    
    // 状态检查：只有草稿状态可以提交审核
    if (experience.status !== 'Draft') {
      return res.status(400).json({ 
        message: `心得当前状态为"${experience.status}"，只有草稿状态的心得可以提交审核！` 
      });
    }
    
    // 更新状态为待审核
    await experience.update({ status: 'PendingReview' });
    
    // 获取更新后的心得
    const updatedExperience = await LearningExperience.findByPk(experienceId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userID', 'username', 'avatarURL']
        },
        {
          model: KnowledgeArticle,
          as: 'relatedArticle',
          attributes: ['articleID', 'title'],
          required: false
        }
      ]
    });
    
    res.status(200).json({
      message: "心得已成功提交审核！",
      experience: updatedExperience
    });
  } catch (error) {
    res.status(500).json({ message: "提交心得审核时发生错误！", error: error.message });
  }
};

/**
 * 工作人员审核心得
 */
exports.reviewExperience = async (req, res) => {
  try {
    const { experienceId } = req.params;
    const { status, reviewComments } = req.body;
    
    // 验证请求
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: "无效的审核结果！审核结果必须为 'Approved' 或 'Rejected'" });
    }
    
    // 查找心得
    const experience = await LearningExperience.findByPk(experienceId);
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在！" });
    }
    
    // 状态检查：只有待审核状态可以被审核
    if (experience.status !== 'PendingReview') {
      return res.status(400).json({ 
        message: `心得当前状态为"${experience.status}"，只有待审核状态的心得可以进行审核！` 
      });
    }
    
    // 创建审核记录
    const review = await ExperienceReview.create({
      experienceID: experienceId,
      reviewerStaffID: req.userId,
      reviewResult: status,
      comments: reviewComments || null
    });
    
    // 更新心得状态
    await experience.update({ status });
    
    // 发送通知给作者
    await Notification.create({
      recipientUserID: experience.userID,
      recipientUserType: 'User',
      type: `EXPERIENCE_${status.toUpperCase()}`,
      content: `您的心得"${experience.title}"已${status === 'Approved' ? '通过审核' : '被拒绝'}${reviewComments ? '，审核意见：' + reviewComments : ''}`,
      relatedEntityType: 'LearningExperience',
      relatedEntityID: experienceId
    });
    
    // 获取审核记录详情（包括审核人信息）
    const reviewWithDetails = await ExperienceReview.findByPk(review.reviewID, {
      include: [
        {
          model: Staff,
          as: 'reviewer',
          attributes: ['staffID', 'username']
        }
      ]
    });
    
    // 获取更新后的心得
    const updatedExperience = await LearningExperience.findByPk(experienceId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userID', 'username', 'avatarURL']
        }
      ]
    });
    
    res.status(200).json({
      message: `心得审核${status === 'Approved' ? '通过' : '拒绝'}成功！`,
      experience: updatedExperience,
      review: reviewWithDetails
    });
  } catch (error) {
    res.status(500).json({ message: "审核心得时发生错误！", error: error.message });
  }
};

/**
 * 获取心得审核历史
 */
exports.getReviewHistory = async (req, res) => {
  try {
    const { experienceId } = req.params;
    
    // 查找心得
    const experience = await LearningExperience.findByPk(experienceId);
    
    if (!experience) {
      return res.status(404).json({ message: "心得不存在！" });
    }
    
    // 权限检查：只有作者或工作人员可以查看审核历史
    const isStaff = req.userRole === 'staff';
    const isOwner = req.userId === experience.userID;
    
    if (!isStaff && !isOwner) {
      return res.status(403).json({ message: "您没有权限查看此心得的审核历史！" });
    }
    
    // 获取审核历史记录
    const reviews = await ExperienceReview.findAll({
      where: { experienceID: experienceId },
      include: [
        {
          model: Staff,
          as: 'reviewer',
          attributes: ['staffID', 'username']
        }
      ],
      order: [['reviewTime', 'DESC']]
    });
    
    res.status(200).json({
      experienceId,
      title: experience.title,
      currentStatus: experience.status,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: "获取审核历史时发生错误！", error: error.message });
  }
}; 