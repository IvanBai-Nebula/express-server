const controller = require("../controllers/knowledgeArticle.controller");
const authMiddleware = require("../middleware/auth.middleware");

module.exports = function (app) {
  const router = require("express").Router();

  // 公开路由 - 获取已发布文章列表
  /**
   * @swagger
   * /api/v1/articles/:
   *   get:
   *     summary: 获取知识文章列表 (公开，默认获取已发布的)
   *     tags: [Client - KnowledgeArticles]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [Published, Draft, PendingReview, Archived, Rejected], default: Published }
   *         description: 按状态筛选 (Published 对所有人可见, 其他状态仅工作人员可见)
   *       - in: query
   *         name: categoryID
   *         schema: { type: string, format: uuid }
   *         description: 按分类ID筛选
   *       - in: query
   *         name: tag
   *         schema: { type: string }
   *         description: 按标签名称筛选
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *         description: 按标题或摘要搜索
   *       - in: query
   *         name: sortBy
   *         schema: { type: string, enum: [publishedAt, createdAt, title, viewCount, averageRating], default: publishedAt }
   *       - in: query
   *         name: sortOrder
   *         schema: { type: string, enum: [ASC, DESC], default: DESC }
   *     responses:
   *       200:
   *         description: 成功获取文章列表
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/PaginatedKnowledgeArticles' }
   *       500:
   *         description: 服务器错误
   */
  router.get("/", controller.getAllArticles);

  // 验证令牌的路由（可选令牌，用于获取用户的收藏状态等）
  /**
   * @swagger
   * /api/v1/articles/{articleId}:
   *   get:
   *     summary: 获取特定知识文章的详情
   *     tags: [Client - KnowledgeArticles]
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *     security:
   *       - bearerAuth: [] # Optional: For isBookmarked status and view count logic
   *     responses:
   *       200:
   *         description: 成功获取文章详情
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/KnowledgeArticleDetailed' }
   *       403:
   *         description: 无权访问此文章 (如文章未发布且非工作人员)
   *       404:
   *         description: 文章不存在
   *       500:
   *         description: 服务器错误
   */
  router.get(
    "/:articleId",
    (req, res, next) => {
      // 如果没有令牌，继续处理请求，但不设置用户信息
      const token = req.headers["x-access-token"] || req.headers["authorization"]?.split(" ")[1];
      if (!token) {
        return next();
      }

      // 有令牌，验证令牌
      authMiddleware.verifyToken(req, res, next);
    },
    controller.getArticleById,
  );

  // 需要验证令牌的路由
  router.use(authMiddleware.verifyToken);

  // 收藏/取消收藏文章
  /**
   * @swagger
   * /api/v1/articles/{articleId}/bookmark:
   *   post:
   *     summary: 收藏/取消收藏知识文章
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *     responses:
   *       200:
   *         description: 操作成功
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ToggleBookmarkResponse' } # Reusing schema
   *       404:
   *         description: 文章不存在
   *       500:
   *         description: 服务器错误
   */
  router.post("/:articleId/bookmark", controller.toggleBookmark);

  // 提交文章反馈
  /**
   * @swagger
   * /api/v1/articles/{articleId}/feedback:
   *   get:
   *     summary: 获取指定知识文章的反馈列表 (分页)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: [] # Or make it staff only depending on requirements
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: sortBy
   *         schema: { type: string, enum: [createdAt, rating], default: 'createdAt' }
   *       - in: query
   *         name: sortOrder
   *         schema: { type: string, enum: [ASC, DESC], default: 'DESC' }
   *     responses:
   *       200:
   *         description: 成功获取反馈列表
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/PaginatedArticleFeedbacks' }
   *       404:
   *         description: 文章不存在
   *       500:
   *         description: 服务器错误
   */
  router.get("/:articleId/feedback", controller.getArticleFeedbacks);

  /**
   * @swagger
   * /api/v1/articles/{articleId}/feedback:
   *   post:
   *     summary: 提交对知识文章的反馈 (评分/评论)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/ArticleFeedbackPayload' }
   *     responses:
   *       200:
   *         description: 反馈已更新
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 feedback: { $ref: '#/components/schemas/ArticleFeedback' }
   *       201:
   *         description: 反馈提交成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 feedback: { $ref: '#/components/schemas/ArticleFeedback' }
   *       400:
   *         description: 请求参数错误
   *       404:
   *         description: 文章不存在
   *       500:
   *         description: 服务器错误
   */
  router.post("/:articleId/feedback", controller.submitFeedback);

  // 需要工作人员身份的路由
  router.use(authMiddleware.isStaff);

  // 创建文章
  /**
   * @swagger
   * /api/v1/articles/:
   *   post:
   *     summary: 创建新的知识文章 (工作人员)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/KnowledgeArticleCreatePayload' }
   *     responses:
   *       201:
   *         description: 文章创建成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 article: { $ref: '#/components/schemas/KnowledgeArticleDetailed' } # Return detailed view
   *       400:
   *         description: 请求参数错误
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 分类不存在 (如果提供了categoryID)
   *       500:
   *         description: 服务器错误
   */
  router.post("/", controller.createArticle);

  // 更新文章
  /**
   * @swagger
   * /api/v1/articles/{articleId}:
   *   put:
   *     summary: 更新知识文章 (工作人员)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/KnowledgeArticleUpdatePayload' }
   *     responses:
   *       200:
   *         description: 文章更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 article: { $ref: '#/components/schemas/KnowledgeArticleDetailed' }
   *       400:
   *         description: 请求参数错误
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 文章或分类不存在
   *       500:
   *         description: 服务器错误
   */
  router.put("/:articleId", controller.updateArticle);

  // 删除文章
  /**
   * @swagger
   * /api/v1/articles/{articleId}:
   *   delete:
   *     summary: 删除知识文章 (工作人员)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *     responses:
   *       200:
   *         description: 文章删除成功
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/GenericSuccessMessage' }
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 文章不存在
   *       500:
   *         description: 服务器错误
   */
  router.delete("/:articleId", controller.deleteArticle);

  // 获取文章版本历史
  /**
   * @swagger
   * /api/v1/articles/{articleId}/versions:
   *   get:
   *     summary: 获取知识文章的版本历史 (工作人员)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200:
   *         description: 成功获取版本历史
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/PaginatedArticleVersions' }
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 文章不存在
   *       500:
   *         description: 服务器错误
   */
  router.get("/:articleId/versions", controller.getArticleVersions);

  // 获取特定版本的文章
  /**
   * @swagger
   * /api/v1/articles/{articleId}/versions/{versionId}:
   *   get:
   *     summary: 获取知识文章的特定版本详情 (工作人员)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *       - in: path
   *         name: versionId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 版本ID
   *     responses:
   *       200:
   *         description: 成功获取文章版本详情
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ArticleVersion' }
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 文章或版本不存在
   *       500:
   *         description: 服务器错误
   */
  router.get("/:articleId/versions/:versionId", controller.getArticleVersion);

  // PUT /api/v1/articles/{articleId}/status - 更新文章状态 (工作人员)
  /**
   * @swagger
   * /api/v1/articles/{articleId}/status:
   *   put:
   *     summary: 更新文章状态 (工作人员)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [Draft, PendingReview, Published, Archived, Rejected]
   *                 description: 新的文章状态
   *     responses:
   *       200:
   *         description: 文章状态更新成功
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/KnowledgeArticle' }
   *       400:
   *         description: 无效的状态值
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 文章不存在
   *       500:
   *         description: 服务器错误
   */
  router.put("/:articleId/status", controller.updateArticleStatus);

  // POST /api/v1/articles/{articleId}/tags - 为文章添加标签 (工作人员)
  /**
   * @swagger
   * /api/v1/articles/{articleId}/tags:
   *   post:
   *     summary: 为文章添加标签 (工作人员)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [tagIds]
   *             properties:
   *               tagIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: uuid
   *                 description: 标签ID数组
   *     responses:
   *       200:
   *         description: 标签添加成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 article: { $ref: '#/components/schemas/KnowledgeArticleDetailed' }
   *       400:
   *         description: 标签ID列表不能为空或标签不存在
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 文章不存在
   *       500:
   *         description: 服务器错误
   */
  router.post("/:articleId/tags", controller.addTagsToArticle);

  // DELETE /api/v1/articles/{articleId}/tags/{tagId} - 从文章移除标签 (工作人员)
  /**
   * @swagger
   * /api/v1/articles/{articleId}/tags/{tagId}:
   *   delete:
   *     summary: 从文章移除标签 (工作人员)
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *       - in: path
   *         name: tagId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 标签ID
   *     responses:
   *       200:
   *         description: 标签移除成功
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 文章或标签不存在，或文章没有此标签
   *       500:
   *         description: 服务器错误
   */
  router.delete("/:articleId/tags/:tagId", controller.removeTagFromArticle);

  // POST /api/v1/articles/{articleId}/versions - 创建新的文章版本 (工作人员)
  /**
   * @swagger
   * /api/v1/articles/{articleId}/versions:
   *   post:
   *     summary: 创建新的文章版本 (工作人员)
   *     description: 基于文章当前内容创建一个新的版本记录，并增加主文章的版本号。
   *     tags: [Client - KnowledgeArticles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: articleId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 文章ID
   *     responses:
   *       201:
   *         description: 新版本创建成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 version: { $ref: '#/components/schemas/ArticleVersion' }
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 文章不存在
   *       500:
   *         description: 服务器错误
   */
  router.post("/:articleId/versions", controller.createNewArticleVersion);

  // 注册路由
  app.use("/api/v1/articles", router);
};
