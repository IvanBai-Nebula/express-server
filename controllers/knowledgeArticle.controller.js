const db = require("../models");
const KnowledgeArticle = db.knowledgeArticles;
const ArticleVersion = db.articleVersions;
const ArticleTag = db.articleTags;
const Tag = db.tags;
const ArticleFeedback = db.articleFeedbacks;
const MedicalCategory = db.medicalCategories;
const UserBookmark = db.userBookmarks;
const Staff = db.staff;
const User = db.users;
const Notification = db.notifications;
const { Op } = require("sequelize");
const {
  asyncHandler,
  createError,
} = require("../middleware/errorHandler.middleware");

/**
 * 创建新知识文章
 */
exports.createArticle = asyncHandler(async (req, res) => {
  const {
    title,
    summary,
    coverImageURL,
    richTextContent,
    videoURL,
    categoryID,
    tags,
    status = "Draft",
    parentArticleID,
  } = req.body;

  // 验证必填字段
  if (!title) {
    throw createError("标题不能为空!", 400);
  }

  // 验证工作人员是否有权创建文章（已通过中间件验证）
  const staffId = req.userId;

  // 创建新文章
  const newArticle = await KnowledgeArticle.create({
    title,
    summary,
    coverImageURL,
    richTextContent,
    videoURL,
    status,
    viewCount: 0,
    version: 1,
    authorStaffID: staffId,
    categoryID,
    parentArticleID,
  });

  // 如果提供了标签，处理标签关联
  if (tags && tags.length > 0) {
    let tagObjects = [];

    for (const tagName of tags) {
      // 如果是UUID格式，直接通过ID查找
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          tagName
        )
      ) {
        const existingTag = await Tag.findByPk(tagName);
        if (existingTag) {
          tagObjects.push(existingTag);
        }
      } else {
        // 否则通过名称查找或创建标签
        const [tag] = await Tag.findOrCreate({
          where: { tagName },
        });
        tagObjects.push(tag);
      }
    }

    // 关联标签到文章
    if (tagObjects.length > 0) {
      await newArticle.setTags(tagObjects);
    }
  }

  // 创建初始版本记录
  await ArticleVersion.create({
    articleID: newArticle.articleID,
    versionNumber: 1,
    title: newArticle.title,
    summary: newArticle.summary,
    richTextContent: newArticle.richTextContent,
    videoURL: newArticle.videoURL,
    authorStaffID: staffId,
  });

  // 返回创建的文章（包含关联的标签）
  const createdArticle = await KnowledgeArticle.findByPk(newArticle.articleID, {
    include: [
      {
        model: Tag,
        as: "tags",
        through: { attributes: [] }, // 不包含关联表的字段
      },
    ],
  });

  res.status(201).json({
    message: "文章创建成功!",
    article: createdArticle,
  });
});

/**
 * 获取所有知识文章（支持分页、搜索和过滤）
 */
exports.getAllArticles = asyncHandler(async (req, res) => {
  // 分页参数
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // 搜索和过滤参数
  const {
    search,
    category,
    status,
    tags,
    authorId,
    sortBy = "createdAt",
    sortOrder = "DESC",
  } = req.query;

  // 构建查询条件
  const whereConditions = {};
  const include = [];

  // 如果提供了搜索关键词
  if (search) {
    whereConditions[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { summary: { [Op.like]: `%${search}%` } },
    ];
  }

  // 如果提供了分类ID
  if (category) {
    whereConditions.categoryID = category;
  }

  // 如果提供了状态
  if (status) {
    whereConditions.status = status;
  }

  // 如果提供了作者ID
  if (authorId) {
    whereConditions.authorStaffID = authorId;
  }

  // 包含标签模型
  const tagInclude = {
    model: Tag,
    as: "tags",
    through: { attributes: [] }, // 不包含关联表的字段
  };

  // 如果提供了标签过滤
  if (tags) {
    const tagArray = tags.split(",");
    tagInclude.where = { tagName: { [Op.in]: tagArray } };
  }

  include.push(tagInclude);

  // 包含类别模型
  include.push({
    model: MedicalCategory,
    as: "category",
    attributes: ["categoryID", "name"],
  });

  // 包含作者信息
  include.push({
    model: db.staff,
    as: "author",
    attributes: ["staffID", "username", "avatarURL"],
  });

  // 执行查询
  const { count, rows } = await KnowledgeArticle.findAndCountAll({
    where: whereConditions,
    include,
    limit,
    offset,
    order: [[sortBy, sortOrder]],
    distinct: true, // 确保count计算正确
  });

  // 计算总页数
  const totalPages = Math.ceil(count / limit);

  res.status(200).json({
    totalItems: count,
    totalPages,
    currentPage: page,
    articles: rows,
  });
});

/**
 * 获取特定文章详情
 */
exports.getArticleById = asyncHandler(async (req, res) => {
  const { articleId } = req.params;

  // 查找文章及其关联数据
  const article = await KnowledgeArticle.findByPk(articleId, {
    include: [
      {
        model: MedicalCategory,
        as: "category",
      },
      {
        model: Staff,
        as: "author",
        attributes: ["staffID", "username", "avatarURL"],
      },
      {
        model: Tag,
        as: "tags",
        through: { attributes: [] },
      },
      {
        model: KnowledgeArticle,
        as: "previousVersion",
        attributes: ["articleID", "title"],
      },
    ],
  });

  if (!article) {
    throw createError("文章不存在!", 404);
  }

  // 检查文章状态
  const isStaff = req.userRole === "staff";
  const isOwner = req.userId === article.authorStaffID;

  // 如果不是已发布状态，且不是工作人员或作者，则拒绝访问
  if (article.status !== "Published" && !isStaff && !isOwner) {
    throw createError("您无权访问此文章!", 403);
  }

  // 增加浏览次数（仅限已发布文章且非工作人员访问）
  if (article.status === "Published" && req.userId && !isStaff) {
    await article.increment("viewCount");
  }

  // 获取相关文章
  const relatedArticles = await KnowledgeArticle.findAll({
    where: {
      categoryID: article.categoryID,
      status: "Published",
      articleID: { [db.Sequelize.Op.ne]: articleId },
    },
    limit: 5,
    order: [["publishedAt", "DESC"]],
    attributes: [
      "articleID",
      "title",
      "summary",
      "coverImageURL",
      "publishedAt",
    ],
  });

  // 检查当前用户是否已收藏该文章
  let isBookmarked = false;
  if (req.userId) {
    const bookmark = await UserBookmark.findOne({
      where: {
        userID: req.userId,
        userType: req.userRole === "staff" ? "Staff" : "User",
        entityType: "KnowledgeArticle",
        entityID: articleId,
      },
    });
    isBookmarked = !!bookmark;
  }

  // 构建响应
  const response = {
    ...article.toJSON(),
    relatedArticles,
    isBookmarked,
  };

  res.status(200).json(response);
});

/**
 * 更新文章
 */
exports.updateArticle = asyncHandler(async (req, res) => {
  // 启动数据库事务
  const t = await db.sequelize.transaction();

  try {
    const { articleId } = req.params;
    const {
      title,
      summary,
      coverImageURL,
      richTextContent,
      videoURL,
      categoryID,
      tags,
      status,
    } = req.body;

    // 查找文章
    const article = await KnowledgeArticle.findByPk(articleId, {
      transaction: t,
    });

    if (!article) {
      await t.rollback();
      throw createError("文章不存在!", 404);
    }

    // 数据验证
    if (title && title.length > 200) {
      await t.rollback();
      throw createError("文章标题不能超过200个字符!", 400);
    }

    if (summary && summary.length > 500) {
      await t.rollback();
      throw createError("文章摘要不能超过500个字符!", 400);
    }

    if (videoURL && !/^(https?:\/\/)/i.test(videoURL)) {
      await t.rollback();
      throw createError("视频URL格式无效，必须以http://或https://开头!", 400);
    }

    if (status) {
      const validStatuses = [
        "Draft",
        "PendingReview",
        "Published",
        "Archived",
        "Rejected",
      ];
      if (!validStatuses.includes(status)) {
        await t.rollback();
        throw createError("无效的文章状态值!", 400);
      }
    }

    // 验证类别
    if (categoryID && categoryID !== article.categoryID) {
      const category = await MedicalCategory.findByPk(categoryID, {
        transaction: t,
      });
      if (!category) {
        await t.rollback();
        throw createError("所选类别不存在!", 404);
      }
    }

    // 创建文章版本记录
    await ArticleVersion.create(
      {
        articleID: article.articleID,
        versionNumber: article.version + 1,
        title: article.title,
        summary: article.summary,
        richTextContent: article.richTextContent,
        videoURL: article.videoURL,
        authorStaffID: req.userId,
      },
      { transaction: t }
    );

    // 准备更新数据
    const updateData = {};

    if (title) updateData.title = title;
    if (summary !== undefined) updateData.summary = summary;
    if (coverImageURL !== undefined) updateData.coverImageURL = coverImageURL;
    if (richTextContent !== undefined)
      updateData.richTextContent = richTextContent;
    if (videoURL !== undefined) updateData.videoURL = videoURL;
    if (categoryID) updateData.categoryID = categoryID;
    if (status) {
      updateData.status = status;

      // 如果状态变为已发布，设置发布时间
      if (status === "Published" && article.status !== "Published") {
        updateData.publishedAt = new Date();
      }
    }

    // 增加版本号
    updateData.version = article.version + 1;

    // 更新文章
    await article.update(updateData, { transaction: t });

    // 如果提供了标签，处理标签关联
    if (tags && Array.isArray(tags)) {
      await handleArticleTags(articleId, tags, t);
    }

    // 如果状态变为已发布，发送通知
    if (updateData.status === "Published" && article.status !== "Published") {
      // 可以实现基于用户兴趣的通知发送
      // await sendArticlePublishedNotifications(article);
    }

    // 获取更新后的文章（包括关联数据）
    const updatedArticle = await KnowledgeArticle.findByPk(articleId, {
      include: [
        {
          model: Tag,
          as: "tags",
          through: { attributes: [] },
        },
        {
          model: MedicalCategory,
          as: "category",
        },
        {
          model: Staff,
          as: "author",
          attributes: ["staffID", "username", "avatarURL"],
        },
      ],
      transaction: t,
    });

    // 提交事务
    await t.commit();

    res.status(200).json({
      message: "文章更新成功!",
      article: updatedArticle,
    });
  } catch (error) {
    // 回滚事务
    await t.rollback();

    // 详细错误处理
    if (error.name === "SequelizeUniqueConstraintError") {
      throw createError("文章标题已存在，请使用不同的标题!", 409);
    }

    if (error.name === "SequelizeForeignKeyConstraintError") {
      throw createError("引用了不存在的外键值!", 400);
    }

    throw error; // 将其他错误抛给全局错误处理中间件
  }
});

/**
 * 删除文章
 */
exports.deleteArticle = asyncHandler(async (req, res) => {
  // 启动数据库事务
  const t = await db.sequelize.transaction();

  try {
    const { articleId } = req.params;

    // 查找文章
    const article = await KnowledgeArticle.findByPk(articleId, {
      transaction: t,
    });

    if (!article) {
      await t.rollback();
      throw createError("文章不存在!", 404);
    }

    // 检查是否有子文章
    const childArticles = await KnowledgeArticle.count({
      where: { parentArticleID: articleId },
      transaction: t,
    });

    if (childArticles > 0) {
      await t.rollback();
      throw createError("无法删除有关联子文章的文章!", 400);
    }

    // 删除文章相关的标签关联
    await ArticleTag.destroy({
      where: { articleID: articleId },
      transaction: t,
    });

    // 删除文章版本记录
    await ArticleVersion.destroy({
      where: { articleID: articleId },
      transaction: t,
    });

    // 删除文章反馈
    await ArticleFeedback.destroy({
      where: { articleID: articleId },
      transaction: t,
    });

    // 删除文章收藏
    await UserBookmark.destroy({
      where: {
        entityType: "KnowledgeArticle",
        entityID: articleId,
      },
      transaction: t,
    });

    // 删除相关通知
    await Notification.destroy({
      where: {
        relatedEntityType: "KnowledgeArticle",
        relatedEntityID: articleId,
      },
      transaction: t,
    });

    // 删除文章
    await article.destroy({ transaction: t });

    // 提交事务
    await t.commit();

    res.status(200).json({ message: "文章已成功删除!" });
  } catch (error) {
    // 回滚事务
    await t.rollback();
    throw error; // 将错误抛给全局错误处理中间件
  }
});

/**
 * 获取文章的版本历史
 */
exports.getArticleVersions = asyncHandler(async (req, res) => {
  const { articleId } = req.params;

  // 检查文章是否存在
  const article = await KnowledgeArticle.findByPk(articleId);

  if (!article) {
    throw createError("文章不存在!", 404);
  }

  // 获取版本历史
  const versions = await ArticleVersion.findAll({
    where: { articleID: articleId },
    include: [
      {
        model: Staff,
        as: "author",
        attributes: ["staffID", "username"],
      },
    ],
    order: [["versionNumber", "DESC"]],
  });

  res.status(200).json(versions);
});

/**
 * 获取特定版本的文章
 */
exports.getArticleVersion = asyncHandler(async (req, res) => {
  const { articleId, versionId } = req.params;

  // 检查文章是否存在
  const article = await KnowledgeArticle.findByPk(articleId);

  if (!article) {
    throw createError("文章不存在!", 404);
  }

  // 获取特定版本
  const version = await ArticleVersion.findOne({
    where: {
      articleID: articleId,
      versionID: versionId,
    },
    include: [
      {
        model: Staff,
        as: "author",
        attributes: ["staffID", "username", "avatarURL"],
      },
    ],
  });

  if (!version) {
    throw createError("文章版本不存在!", 404);
  }

  res.status(200).json(version);
});

/**
 * 提交文章反馈
 */
exports.submitFeedback = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const { rating, comment, isAnonymous = false } = req.body;

  // 增强验证
  if (rating === undefined && !comment) {
    throw createError("至少需要提供评分或评论!", 400);
  }

  // 验证评分范围
  if (rating !== undefined) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw createError("评分必须是1到5之间的整数!", 400);
    }
  }

  // 评论长度验证
  if (comment && comment.length > 1000) {
    throw createError("评论不能超过1000个字符!", 400);
  }

  // 检查文章是否存在
  const article = await KnowledgeArticle.findByPk(articleId);

  if (!article) {
    throw createError("文章不存在!", 404);
  }

  // 检查用户是否已经提交过反馈
  const existingFeedback = await ArticleFeedback.findOne({
    where: {
      articleID: articleId,
      userID: req.userId,
      userType: req.userRole === "staff" ? "Staff" : "User",
    },
  });

  if (existingFeedback) {
    // 更新现有反馈
    await existingFeedback.update({
      rating: rating !== undefined ? rating : existingFeedback.rating,
      comment: comment !== undefined ? comment : existingFeedback.comment,
      isAnonymous,
    });

    res.status(200).json({
      message: "反馈已更新!",
      feedback: existingFeedback,
    });
  } else {
    // 创建新反馈
    const newFeedback = await ArticleFeedback.create({
      articleID: articleId,
      userID: req.userId,
      userType: req.userRole === "staff" ? "Staff" : "User",
      rating,
      comment,
      isAnonymous,
    });

    // 更新文章平均评分
    if (rating !== undefined) {
      const allRatings = await ArticleFeedback.findAll({
        where: {
          articleID: articleId,
          rating: { [db.Sequelize.Op.ne]: null },
        },
        attributes: ["rating"],
      });

      if (allRatings.length > 0) {
        const sum = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
        const average = sum / allRatings.length;

        await article.update({ averageRating: average });
      }
    }

    // 通知文章作者有新反馈
    if (article.authorStaffID && !isAnonymous) {
      await Notification.create({
        recipientUserID: article.authorStaffID,
        recipientUserType: "Staff",
        type: "NEW_ARTICLE_FEEDBACK",
        content: `您的文章"${article.title}"收到了新的反馈`,
        relatedEntityType: "ArticleFeedback",
        relatedEntityID: newFeedback.feedbackID,
      });
    }

    res.status(201).json({
      message: "反馈提交成功!",
      feedback: newFeedback,
    });
  }
});

/**
 * 获取文章的反馈列表
 */
exports.getArticleFeedbacks = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // 检查文章是否存在
  const article = await KnowledgeArticle.findByPk(articleId);

  if (!article) {
    throw createError("文章不存在!", 404);
  }

  const offset = (page - 1) * limit;

  // 查询反馈
  const { count, rows } = await ArticleFeedback.findAndCountAll({
    where: { articleID: articleId },
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

  // 处理匿名反馈
  const feedbacks = rows.map((feedback) => {
    const result = feedback.toJSON();

    if (feedback.isAnonymous) {
      delete result.user;
      delete result.staffUser;
      result.anonymousUser = true;
    }

    return result;
  });

  res.status(200).json({
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    feedbacks,
  });
});

/**
 * 收藏/取消收藏文章
 */
exports.toggleBookmark = asyncHandler(async (req, res) => {
  const { articleId } = req.params;

  // 检查文章是否存在
  const article = await KnowledgeArticle.findByPk(articleId);

  if (!article) {
    throw createError("文章不存在!", 404);
  }

  // 查找现有收藏
  const existingBookmark = await UserBookmark.findOne({
    where: {
      userID: req.userId,
      userType: req.userRole === "staff" ? "Staff" : "User",
      entityType: "KnowledgeArticle",
      entityID: articleId,
    },
  });

  if (existingBookmark) {
    // 取消收藏
    await existingBookmark.destroy();

    res.status(200).json({
      message: "已取消收藏文章!",
      isBookmarked: false,
    });
  } else {
    // 添加收藏
    await UserBookmark.create({
      userID: req.userId,
      userType: req.userRole === "staff" ? "Staff" : "User",
      entityType: "KnowledgeArticle",
      entityID: articleId,
    });

    res.status(200).json({
      message: "文章已成功收藏!",
      isBookmarked: true,
    });
  }
});

/**
 * 处理文章标签
 * @param {string} articleId - 文章ID
 * @param {Array} tagNames - 标签名称数组
 */
async function handleArticleTags(articleId, tagNames, t) {
  // 删除现有标签关联
  await ArticleTag.destroy({
    where: { articleID: articleId },
    transaction: t,
  });

  if (!tagNames || tagNames.length === 0) {
    return;
  }

  // 处理每个标签
  for (const tagName of tagNames) {
    // 查找或创建标签
    let tag = await Tag.findOne({
      where: { tagName: tagName },
      transaction: t,
    });

    if (!tag) {
      tag = await Tag.create({ tagName: tagName }, { transaction: t });
    }

    // 建立文章与标签的关联
    await ArticleTag.create(
      {
        articleID: articleId,
        tagID: tag.tagID,
      },
      { transaction: t }
    );
  }
}

/**
 * 更新文章状态
 */
exports.updateArticleStatus = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "Draft",
    "PendingReview",
    "Published",
    "Archived",
    "Rejected",
  ];
  if (!validStatuses.includes(status)) {
    throw createError("无效的文章状态值!", 400);
  }

  const article = await db.knowledgeArticles.findByPk(articleId);
  if (!article) {
    throw createError("文章不存在!", 404);
  }

  const oldStatus = article.status;
  article.status = status;
  if (status === "Published" && oldStatus !== "Published") {
    article.publishedAt = new Date();
  } else if (status !== "Published" && oldStatus === "Published") {
    // article.publishedAt = null; // 根据需求决定取消发布时是否置空发布时间
  }

  const updatedArticle = await article.save();

  if (req.userRole === "staff" && req.userId) {
    await db.auditLogs.create({
      adminStaffID: req.userId,
      actionType: "UPDATE_ARTICLE_STATUS",
      targetEntityType: "KnowledgeArticle",
      targetEntityID: articleId,
      oldValue: { status: oldStatus },
      newValue: { status: updatedArticle.status },
      ipAddress: req.ip,
    });
  }

  res.status(200).json(updatedArticle);
});

/**
 * 为文章添加标签
 */
exports.addTagsToArticle = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const { tagIds } = req.body;

  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    throw createError("标签ID列表不能为空!", 400);
  }

  const article = await db.knowledgeArticles.findByPk(articleId);
  if (!article) {
    throw createError("文章不存在!", 404);
  }

  const existingTags = await db.tags.findAll({ where: { tagID: tagIds } });
  if (existingTags.length !== tagIds.length) {
    const foundDbTagIds = existingTags.map((t) => t.tagID);
    const notFoundIds = tagIds.filter((id) => !foundDbTagIds.includes(id));
    throw createError(
      `一个或多个提供的标签ID不存在: ${notFoundIds.join(", ")}`,
      400
    );
  }

  await article.addTags(existingTags);

  const updatedArticleWithTags = await db.knowledgeArticles.findByPk(
    articleId,
    {
      include: [{ model: db.tags, as: "tags", through: { attributes: [] } }],
    }
  );

  res.status(200).json({
    message: "标签添加成功!",
    article: updatedArticleWithTags,
  });
});

/**
 * 从文章移除标签
 */
exports.removeTagFromArticle = asyncHandler(async (req, res) => {
  const { articleId, tagId } = req.params;

  const article = await db.knowledgeArticles.findByPk(articleId);
  if (!article) {
    throw createError("文章不存在!", 404);
  }

  const tag = await db.tags.findByPk(tagId);
  if (!tag) {
    throw createError("标签不存在!", 404);
  }

  const result = await article.removeTag(tag);

  if (!result) {
    throw createError("文章与该标签无关联或移除失败!", 404);
  }

  res.status(200).json({ message: "标签移除成功!" });
});

/**
 * 创建新的文章版本
 */
exports.createNewArticleVersion = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const staffId = req.userRole === "staff" ? req.userId : null;

  const article = await db.knowledgeArticles.findByPk(articleId);
  if (!article) {
    throw createError("文章不存在!", 404);
  }

  if (!staffId) {
    throw createError("仅限工作人员操作!", 403);
  }

  const newVersionNumber = article.version + 1;

  const newVersion = await db.articleVersions.create({
    articleID: article.articleID,
    versionNumber: newVersionNumber,
    title: article.title,
    summary: article.summary,
    richTextContent: article.richTextContent,
    videoURL: article.videoURL,
    authorStaffID: staffId,
  });

  article.version = newVersionNumber;
  await article.save();

  res.status(201).json({
    message: "新版本创建成功!",
    version: newVersion,
  });
});

/**
 * 取消收藏文章
 */
