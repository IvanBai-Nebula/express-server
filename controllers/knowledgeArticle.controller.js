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

/**
 * 创建新文章
 */
exports.createArticle = async (req, res) => {
  try {
    const { 
      title, summary, coverImageURL, richTextContent, 
      videoURL, categoryID, tags, status = 'Draft' 
    } = req.body;
    
    // 基本验证
    if (!title) {
      return res.status(400).json({ message: "文章标题不能为空!" });
    }
    
    // 验证类别
    if (categoryID) {
      const category = await MedicalCategory.findByPk(categoryID);
      if (!category) {
        return res.status(404).json({ message: "所选类别不存在!" });
      }
    }
    
    // 创建文章
    const articleData = {
      title,
      summary,
      coverImageURL,
      richTextContent,
      videoURL,
      categoryID,
      authorStaffID: req.userId,
      status
    };
    
    // 如果状态为"已发布"，设置发布时间
    if (status === 'Published') {
      articleData.publishedAt = new Date();
    }
    
    const article = await KnowledgeArticle.create(articleData);
    
    // 如果提供了标签，处理标签关联
    if (tags && Array.isArray(tags) && tags.length > 0) {
      await handleArticleTags(article.articleID, tags);
    }
    
    // 创建第一个版本记录
    await ArticleVersion.create({
      articleID: article.articleID,
      versionNumber: 1,
      title: article.title,
      summary: article.summary,
      richTextContent: article.richTextContent,
      videoURL: article.videoURL,
      authorStaffID: req.userId
    });
    
    // 获取完整的文章（包括关联数据）
    const createdArticle = await KnowledgeArticle.findByPk(article.articleID, {
      include: [
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] } // 不包含中间表数据
        },
        {
          model: MedicalCategory,
          as: 'category'
        },
        {
          model: Staff,
          as: 'author',
          attributes: ['staffID', 'username', 'avatarURL']
        }
      ]
    });
    
    res.status(201).json({
      message: "文章创建成功!",
      article: createdArticle
    });
  } catch (error) {
    res.status(500).json({ message: "创建文章时发生错误!", error: error.message });
  }
};

/**
 * 获取文章列表
 */
exports.getAllArticles = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'Published', 
      categoryID, 
      tag, 
      search,
      sortBy = 'publishedAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    // 状态过滤
    if (status) {
      whereClause.status = status;
    }
    
    // 类别过滤
    if (categoryID) {
      whereClause.categoryID = categoryID;
    }
    
    // 搜索过滤
    if (search) {
      whereClause[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.like]: `%${search}%` } },
        { summary: { [db.Sequelize.Op.like]: `%${search}%` } }
      ];
    }
    
    // 包含关联数据
    const include = [
      {
        model: MedicalCategory,
        as: 'category',
        attributes: ['categoryID', 'name']
      },
      {
        model: Staff,
        as: 'author',
        attributes: ['staffID', 'username', 'avatarURL']
      },
      {
        model: Tag,
        as: 'tags',
        through: { attributes: [] }
      }
    ];
    
    // 如果按标签过滤
    if (tag) {
      include[2].where = { name: tag };
    }
    
    // 排序选项
    let order = [[sortBy, sortOrder]];
    
    // 查询文章
    const { count, rows } = await KnowledgeArticle.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include,
      order,
      distinct: true  // 避免关联查询中的重复计数问题
    });
    
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      articles: rows
    });
  } catch (error) {
    res.status(500).json({ message: "获取文章列表时发生错误!", error: error.message });
  }
};

/**
 * 获取特定文章详情
 */
exports.getArticleById = async (req, res) => {
  try {
    const { articleId } = req.params;
    
    // 查找文章及其关联数据
    const article = await KnowledgeArticle.findByPk(articleId, {
      include: [
        {
          model: MedicalCategory,
          as: 'category'
        },
        {
          model: Staff,
          as: 'author',
          attributes: ['staffID', 'username', 'avatarURL']
        },
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] }
        },
        {
          model: KnowledgeArticle,
          as: 'parentArticle',
          attributes: ['articleID', 'title']
        }
      ]
    });
    
    if (!article) {
      return res.status(404).json({ message: "文章不存在!" });
    }
    
    // 检查文章状态
    const isStaff = req.userRole === 'staff';
    
    // 如果不是已发布状态，且不是工作人员，则拒绝访问
    if (article.status !== 'Published' && !isStaff) {
      return res.status(403).json({ message: "您无权访问此文章!" });
    }
    
    // 增加浏览次数（仅限已发布文章且非工作人员访问）
    if (article.status === 'Published' && req.userId && !isStaff) {
      await article.increment('viewCount');
    }
    
    // 获取相关文章
    const relatedArticles = await KnowledgeArticle.findAll({
      where: {
        categoryID: article.categoryID,
        status: 'Published',
        articleID: { [db.Sequelize.Op.ne]: articleId }
      },
      limit: 5,
      order: [['publishedAt', 'DESC']],
      attributes: ['articleID', 'title', 'summary', 'coverImageURL', 'publishedAt']
    });
    
    // 检查当前用户是否已收藏该文章
    let isBookmarked = false;
    if (req.userId) {
      const bookmark = await UserBookmark.findOne({
        where: {
          userID: req.userId,
          userType: req.userRole === 'staff' ? 'Staff' : 'User',
          entityType: 'KnowledgeArticle',
          entityID: articleId
        }
      });
      isBookmarked = !!bookmark;
    }
    
    // 构建响应
    const response = {
      ...article.toJSON(),
      relatedArticles,
      isBookmarked
    };
    
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "获取文章详情时发生错误!", error: error.message });
  }
};

/**
 * 更新文章
 */
exports.updateArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { 
      title, summary, coverImageURL, richTextContent, 
      videoURL, categoryID, tags, status 
    } = req.body;
    
    // 查找文章
    const article = await KnowledgeArticle.findByPk(articleId);
    
    if (!article) {
      return res.status(404).json({ message: "文章不存在!" });
    }
    
    // 验证类别
    if (categoryID && categoryID !== article.categoryID) {
      const category = await MedicalCategory.findByPk(categoryID);
      if (!category) {
        return res.status(404).json({ message: "所选类别不存在!" });
      }
    }
    
    // 创建文章版本记录
    await ArticleVersion.create({
      articleID: article.articleID,
      versionNumber: article.version + 1,
      title: article.title,
      summary: article.summary,
      richTextContent: article.richTextContent,
      videoURL: article.videoURL,
      authorStaffID: req.userId
    });
    
    // 准备更新数据
    const updateData = {};
    
    if (title) updateData.title = title;
    if (summary !== undefined) updateData.summary = summary;
    if (coverImageURL !== undefined) updateData.coverImageURL = coverImageURL;
    if (richTextContent !== undefined) updateData.richTextContent = richTextContent;
    if (videoURL !== undefined) updateData.videoURL = videoURL;
    if (categoryID) updateData.categoryID = categoryID;
    if (status) {
      updateData.status = status;
      
      // 如果状态变为已发布，设置发布时间
      if (status === 'Published' && article.status !== 'Published') {
        updateData.publishedAt = new Date();
      }
    }
    
    // 增加版本号
    updateData.version = article.version + 1;
    
    // 更新文章
    await article.update(updateData);
    
    // 如果提供了标签，处理标签关联
    if (tags && Array.isArray(tags)) {
      await handleArticleTags(articleId, tags);
    }
    
    // 如果状态变为已发布，发送通知
    if (updateData.status === 'Published' && article.status !== 'Published') {
      // 可以实现基于用户兴趣的通知发送
      // await sendArticlePublishedNotifications(article);
    }
    
    // 获取更新后的文章（包括关联数据）
    const updatedArticle = await KnowledgeArticle.findByPk(articleId, {
      include: [
        {
          model: Tag,
          as: 'tags',
          through: { attributes: [] }
        },
        {
          model: MedicalCategory,
          as: 'category'
        },
        {
          model: Staff,
          as: 'author',
          attributes: ['staffID', 'username', 'avatarURL']
        }
      ]
    });
    
    res.status(200).json({
      message: "文章更新成功!",
      article: updatedArticle
    });
  } catch (error) {
    res.status(500).json({ message: "更新文章时发生错误!", error: error.message });
  }
};

/**
 * 删除文章
 */
exports.deleteArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    
    // 查找文章
    const article = await KnowledgeArticle.findByPk(articleId);
    
    if (!article) {
      return res.status(404).json({ message: "文章不存在!" });
    }
    
    // 检查是否有子文章
    const childArticles = await KnowledgeArticle.count({
      where: { parentArticleID: articleId }
    });
    
    if (childArticles > 0) {
      return res.status(400).json({ message: "无法删除有关联子文章的文章!" });
    }
    
    // 删除文章相关的标签关联
    await ArticleTag.destroy({
      where: { articleID: articleId }
    });
    
    // 删除文章版本记录
    await ArticleVersion.destroy({
      where: { articleID: articleId }
    });
    
    // 删除文章反馈
    await ArticleFeedback.destroy({
      where: { articleID: articleId }
    });
    
    // 删除文章收藏
    await UserBookmark.destroy({
      where: { 
        entityType: 'KnowledgeArticle',
        entityID: articleId
      }
    });
    
    // 删除相关通知
    await Notification.destroy({
      where: {
        relatedEntityType: 'KnowledgeArticle',
        relatedEntityID: articleId
      }
    });
    
    // 删除文章
    await article.destroy();
    
    res.status(200).json({ message: "文章已成功删除!" });
  } catch (error) {
    res.status(500).json({ message: "删除文章时发生错误!", error: error.message });
  }
};

/**
 * 获取文章的版本历史
 */
exports.getArticleVersions = async (req, res) => {
  try {
    const { articleId } = req.params;
    
    // 检查文章是否存在
    const article = await KnowledgeArticle.findByPk(articleId);
    
    if (!article) {
      return res.status(404).json({ message: "文章不存在!" });
    }
    
    // 获取版本历史
    const versions = await ArticleVersion.findAll({
      where: { articleID: articleId },
      include: [
        {
          model: Staff,
          as: 'author',
          attributes: ['staffID', 'username']
        }
      ],
      order: [['versionNumber', 'DESC']]
    });
    
    res.status(200).json(versions);
  } catch (error) {
    res.status(500).json({ message: "获取文章版本历史时发生错误!", error: error.message });
  }
};

/**
 * 获取特定版本的文章
 */
exports.getArticleVersion = async (req, res) => {
  try {
    const { articleId, versionId } = req.params;
    
    // 检查文章是否存在
    const article = await KnowledgeArticle.findByPk(articleId);
    
    if (!article) {
      return res.status(404).json({ message: "文章不存在!" });
    }
    
    // 获取特定版本
    const version = await ArticleVersion.findOne({
      where: { 
        articleID: articleId,
        versionID: versionId
      },
      include: [
        {
          model: Staff,
          as: 'author',
          attributes: ['staffID', 'username', 'avatarURL']
        }
      ]
    });
    
    if (!version) {
      return res.status(404).json({ message: "文章版本不存在!" });
    }
    
    res.status(200).json(version);
  } catch (error) {
    res.status(500).json({ message: "获取文章版本时发生错误!", error: error.message });
  }
};

/**
 * 提交文章反馈
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { rating, comment, isAnonymous = false } = req.body;
    
    // 验证请求
    if (rating === undefined && !comment) {
      return res.status(400).json({ message: "至少需要提供评分或评论!" });
    }
    
    // 检查文章是否存在
    const article = await KnowledgeArticle.findByPk(articleId);
    
    if (!article) {
      return res.status(404).json({ message: "文章不存在!" });
    }
    
    // 检查用户是否已经提交过反馈
    const existingFeedback = await ArticleFeedback.findOne({
      where: {
        articleID: articleId,
        userID: req.userId,
        userType: req.userRole === 'staff' ? 'Staff' : 'User'
      }
    });
    
    if (existingFeedback) {
      // 更新现有反馈
      await existingFeedback.update({
        rating: rating !== undefined ? rating : existingFeedback.rating,
        comment: comment !== undefined ? comment : existingFeedback.comment,
        isAnonymous
      });
      
      res.status(200).json({
        message: "反馈已更新!",
        feedback: existingFeedback
      });
    } else {
      // 创建新反馈
      const newFeedback = await ArticleFeedback.create({
        articleID: articleId,
        userID: req.userId,
        userType: req.userRole === 'staff' ? 'Staff' : 'User',
        rating,
        comment,
        isAnonymous
      });
      
      // 更新文章平均评分
      if (rating !== undefined) {
        const allRatings = await ArticleFeedback.findAll({
          where: {
            articleID: articleId,
            rating: { [db.Sequelize.Op.ne]: null }
          },
          attributes: ['rating']
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
          recipientUserType: 'Staff',
          type: 'NEW_ARTICLE_FEEDBACK',
          content: `您的文章"${article.title}"收到了新的反馈`,
          relatedEntityType: 'ArticleFeedback',
          relatedEntityID: newFeedback.feedbackID
        });
      }
      
      res.status(201).json({
        message: "反馈提交成功!",
        feedback: newFeedback
      });
    }
  } catch (error) {
    res.status(500).json({ message: "提交反馈时发生错误!", error: error.message });
  }
};

/**
 * 获取文章的反馈列表
 */
exports.getArticleFeedbacks = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // 检查文章是否存在
    const article = await KnowledgeArticle.findByPk(articleId);
    
    if (!article) {
      return res.status(404).json({ message: "文章不存在!" });
    }
    
    const offset = (page - 1) * limit;
    
    // 查询反馈
    const { count, rows } = await ArticleFeedback.findAndCountAll({
      where: { articleID: articleId },
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
    
    // 处理匿名反馈
    const feedbacks = rows.map(feedback => {
      const result = feedback.toJSON();
      
      if (feedback.isAnonymous) {
        delete result.user;
        delete result.staff;
        result.anonymousUser = true;
      }
      
      return result;
    });
    
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      feedbacks
    });
  } catch (error) {
    res.status(500).json({ message: "获取文章反馈时发生错误!", error: error.message });
  }
};

/**
 * 收藏/取消收藏文章
 */
exports.toggleBookmark = async (req, res) => {
  try {
    const { articleId } = req.params;
    
    // 检查文章是否存在
    const article = await KnowledgeArticle.findByPk(articleId);
    
    if (!article) {
      return res.status(404).json({ message: "文章不存在!" });
    }
    
    // 查找现有收藏
    const existingBookmark = await UserBookmark.findOne({
      where: {
        userID: req.userId,
        userType: req.userRole === 'staff' ? 'Staff' : 'User',
        entityType: 'KnowledgeArticle',
        entityID: articleId
      }
    });
    
    if (existingBookmark) {
      // 取消收藏
      await existingBookmark.destroy();
      
      res.status(200).json({
        message: "已取消收藏文章!",
        isBookmarked: false
      });
    } else {
      // 添加收藏
      await UserBookmark.create({
        userID: req.userId,
        userType: req.userRole === 'staff' ? 'Staff' : 'User',
        entityType: 'KnowledgeArticle',
        entityID: articleId
      });
      
      res.status(200).json({
        message: "文章已成功收藏!",
        isBookmarked: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: "操作收藏时发生错误!", error: error.message });
  }
};

/**
 * 处理文章标签
 * @param {string} articleId - 文章ID
 * @param {Array} tagNames - 标签名称数组
 */
async function handleArticleTags(articleId, tagNames) {
  // 删除现有标签关联
  await ArticleTag.destroy({
    where: { articleID: articleId }
  });
  
  if (!tagNames || tagNames.length === 0) {
    return;
  }
  
  // 处理每个标签
  for (const tagName of tagNames) {
    // 查找或创建标签
    let tag = await Tag.findOne({
      where: { name: tagName }
    });
    
    if (!tag) {
      tag = await Tag.create({ name: tagName });
    }
    
    // 建立文章与标签的关联
    await ArticleTag.create({
      articleID: articleId,
      tagID: tag.tagID
    });
  }
}

/**
 * 更新文章状态
 */
exports.updateArticleStatus = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['Draft', 'PendingReview', 'Published', 'Archived', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '无效的文章状态值!' });
    }
    
    const article = await db.knowledgeArticles.findByPk(articleId);
    if (!article) {
      return res.status(404).json({ message: '文章不存在!' });
    }
    
    const oldStatus = article.status;
    article.status = status;
    if (status === 'Published' && oldStatus !== 'Published') {
      article.publishedAt = new Date();
    } else if (status !== 'Published' && oldStatus === 'Published') {
      // article.publishedAt = null; // 根据需求决定取消发布时是否置空发布时间
    }
    
    const updatedArticle = await article.save();
    
    if (req.userRole === 'staff' && req.userId) { 
      await db.auditLogs.create({
        adminStaffID: req.userId,
        actionType: 'UPDATE_ARTICLE_STATUS',
        targetEntityType: 'KnowledgeArticle',
        targetEntityID: articleId,
        oldValue: { status: oldStatus },
        newValue: { status: updatedArticle.status },
        ipAddress: req.ip
      });
    }
    
    res.status(200).json(updatedArticle);
  } catch (error) {
    // console.error('更新文章状态出错:', error); // 控制台日志可以保留英文或按需修改
    res.status(500).json({ message: '更新文章状态时发生错误!', error: error.message });
  }
};

/**
 * 为文章添加标签
 */
exports.addTagsToArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { tagIds } = req.body;
    
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({ message: '标签ID列表不能为空!' });
    }

    const article = await db.knowledgeArticles.findByPk(articleId);
    if (!article) {
      return res.status(404).json({ message: '文章不存在!' });
    }
    
    const existingTags = await db.tags.findAll({ where: { tagID: tagIds } });
    if (existingTags.length !== tagIds.length) {
      const foundDbTagIds = existingTags.map(t => t.tagID);
      const notFoundIds = tagIds.filter(id => !foundDbTagIds.includes(id));
      return res.status(400).json({ message: `一个或多个提供的标签ID不存在: ${notFoundIds.join(', ')}` });
    }
    
    await article.addTags(existingTags);
    
    const updatedArticleWithTags = await db.knowledgeArticles.findByPk(articleId, {
      include: [{ model: db.tags, as: 'tags', through: { attributes: [] } }]
    });

    res.status(200).json({ 
      message: '标签添加成功!',
      article: updatedArticleWithTags
    });
  } catch (error) {
    // console.error('添加文章标签出错:', error);
    res.status(500).json({ message: '为文章添加标签时发生错误!', error: error.message });
  }
};

/**
 * 从文章移除标签
 */
exports.removeTagFromArticle = async (req, res) => {
  try {
    const { articleId, tagId } = req.params;
    
    const article = await db.knowledgeArticles.findByPk(articleId);
    if (!article) {
      return res.status(404).json({ message: '文章不存在!' });
    }

    const tag = await db.tags.findByPk(tagId);
    if (!tag) {
      return res.status(404).json({ message: '标签不存在!' });
    }
    
    const result = await article.removeTag(tag);
    
    if (!result) {
      return res.status(404).json({ message: '文章与该标签无关联或移除失败!' });
    }
    
    res.status(200).json({ message: '标签移除成功!' });
  } catch (error) {
    // console.error('移除文章标签出错:', error);
    res.status(500).json({ message: '从文章移除标签时发生错误!', error: error.message });
  }
};

/**
 * 创建新的文章版本
 */
exports.createNewArticleVersion = async (req, res) => {
  try {
    const { articleId } = req.params;
    const staffId = req.userRole === 'staff' ? req.userId : null;

    const article = await db.knowledgeArticles.findByPk(articleId);
    if (!article) {
      return res.status(404).json({ message: '文章不存在!' });
    }

    if (!staffId) {
        return res.status(403).json({ message: '仅限工作人员操作!' });
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
      message: '新版本创建成功!',
      version: newVersion
    });
  } catch (error) {
    // console.error('创建文章新版本出错:', error);
    res.status(500).json({ message: '创建文章新版本时发生错误!', error: error.message });
  }
};

/**
 * 取消收藏文章
 */
