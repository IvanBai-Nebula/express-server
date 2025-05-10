const controller = require("../controllers/learningExperience.controller");
const authMiddleware = require("../middleware/auth.middleware");

module.exports = function(app) {
  const router = require("express").Router();

  // 公开路由 - 获取已批准的心得列表
  /**
   * @swagger
   * /api/v1/experiences/:
   *   get:
   *     summary: 获取学习心得列表 (公开，默认获取已批准的)
   *     tags: [Client - LearningExperiences]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *         description: 页码
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *         description: 每页数量
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [Approved, PendingReview, Draft, Rejected], default: Approved }
   *         description: 按状态筛选 (仅工作人员可查看非Approved状态的心得，除非是用户查看自己的)
   *       - in: query
   *         name: userId
   *         schema: { type: string, format: uuid }
   *         description: 按用户ID筛选 (查看特定用户的心得)
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *         description: 按标题或内容搜索
   *       - in: query
   *         name: sortBy
   *         schema: { type: string, enum: [createdAt, upvoteCount, title], default: createdAt }
   *         description: 排序字段
   *       - in: query
   *         name: sortOrder
   *         schema: { type: string, enum: [ASC, DESC], default: DESC }
   *         description: 排序顺序
   *     responses:
   *       200:
   *         description: 成功获取心得列表
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedLearningExperiences'
   *       500:
   *         description: 服务器错误
   */
  router.get("/", controller.getAllExperiences);
  
  // 获取特定心得详情 (可选验证)
  /**
   * @swagger
   * /api/v1/experiences/{experienceId}:
   *   get:
   *     summary: 获取特定学习心得的详情
   *     tags: [Client - LearningExperiences]
   *     parameters:
   *       - in: path
   *         name: experienceId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 心得ID
   *     security: 
   *       - bearerAuth: [] # Optional: for isBookmarked status
   *     responses:
   *       200:
   *         description: 成功获取心得详情
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LearningExperienceDetailed'
   *       403:
   *         description: 无权访问此心得 (例如，心得未批准且非作者/工作人员)
   *       404:
   *         description: 心得不存在
   *       500:
   *         description: 服务器错误
   */
  router.get("/:experienceId", (req, res, next) => {
    // 如果没有令牌，继续处理请求，但不设置用户信息
    const token = req.headers['x-access-token'] || req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return next();
    }
    
    // 有令牌，验证令牌
    authMiddleware.verifyToken(req, res, next);
  }, controller.getExperienceById);
  
  // 获取心得评论列表
  /**
   * @swagger
   * /api/v1/experiences/{experienceId}/comments:
   *   get:
   *     summary: 获取指定学习心得的评论列表 (分页)
   *     tags: [Client - LearningExperiences]
   *     parameters:
   *       - in: path
   *         name: experienceId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 心得ID
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200:
   *         description: 成功获取评论列表
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedExperienceComments'
   *       404:
   *         description: 心得不存在
   *       500:
   *         description: 服务器错误
   */
  router.get("/:experienceId/comments", controller.getComments);
  
  // 需要验证令牌的路由
  router.use(authMiddleware.verifyToken);
  
  // 创建心得
  /**
   * @swagger
   * /api/v1/experiences/:
   *   post:
   *     summary: 用户创建新的学习心得
   *     tags: [Client - LearningExperiences]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LearningExperienceCreatePayload'
   *     responses:
   *       201:
   *         description: 心得创建成功 (默认为草稿状态)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 experience: { $ref: '#/components/schemas/LearningExperience' } # Returns the basic experience object
   *       400:
   *         description: 请求参数错误 (如标题内容为空)
   *       404:
   *         description: 关联的文章不存在 (如果提供了relatedArticleID)
   *       500:
   *         description: 服务器错误
   */
  router.post("/", controller.createExperience);
  
  // 更新心得 (仅作者或工作人员)
  /**
   * @swagger
   * /api/v1/experiences/{experienceId}:
   *   put:
   *     summary: 更新学习心得 (作者更新内容，工作人员可更新状态)
   *     tags: [Client - LearningExperiences]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: experienceId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 心得ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LearningExperienceUpdatePayload'
   *     responses:
   *       200:
   *         description: 心得更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 experience: { $ref: '#/components/schemas/LearningExperienceDetailed' } # Returns full detail
   *       400:
   *         description: 请求错误 (如用户修改已审核心得，或状态转换无效)
   *       403:
   *         description: 无权限修改
   *       404:
   *         description: 心得不存在
   *       500:
   *         description: 服务器错误
   */
  router.put("/:experienceId", controller.updateExperience);
  
  // 删除心得 (仅作者或工作人员)
  /**
   * @swagger
   * /api/v1/experiences/{experienceId}:
   *   delete:
   *     summary: 删除学习心得 (作者或工作人员)
   *     tags: [Client - LearningExperiences]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: experienceId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 心得ID
   *     responses:
   *       200:
   *         description: 心得删除成功
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/GenericSuccessMessage' }
   *       403:
   *         description: 无权限删除
   *       404:
   *         description: 心得不存在
   *       500:
   *         description: 服务器错误
   */
  router.delete("/:experienceId", controller.deleteExperience);
  
  // 心得互动
  /**
   * @swagger
   * /api/v1/experiences/{experienceId}/comments:
   *   post:
   *     summary: 发表对学习心得的评论
   *     tags: [Client - LearningExperiences]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: experienceId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 心得ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ExperienceCommentPayload'
   *     responses:
   *       201:
   *         description: 评论发表成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ExperienceComment'
   *       400:
   *         description: 评论内容为空或心得不允许评论
   *       404:
   *         description: 心得不存在或父评论不存在
   *       500:
   *         description: 服务器错误
   */
  router.post("/:experienceId/comments", controller.addComment);

  /**
   * @swagger
   * /api/v1/experiences/comments/{commentId}:
   *   delete:
   *     summary: 删除心得评论 (评论作者或工作人员)
   *     tags: [Client - LearningExperiences]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 评论ID
   *     responses:
   *       200:
   *         description: 评论删除成功
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/GenericSuccessMessage' }
   *       403:
   *         description: 无权限删除此评论
   *       404:
   *         description: 评论不存在
   *       500:
   *         description: 服务器错误
   */
  router.delete("/comments/:commentId", controller.deleteComment);

  /**
   * @swagger
   * /api/v1/experiences/{experienceId}/upvote:
   *   post:
   *     summary: 点赞/取消点赞学习心得
   *     tags: [Client - LearningExperiences]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: experienceId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 心得ID
   *     responses:
   *       200:
   *         description: 操作成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 upvoteCount: { type: integer }
   *                 action: { type: string, enum: ['upvoted', 'removed_upvote'] }
   *       404:
   *         description: 心得不存在
   *       500:
   *         description: 服务器错误
   */
  router.post("/:experienceId/upvote", controller.upvoteExperience);

  /**
   * @swagger
   * /api/v1/experiences/{experienceId}/bookmark:
   *   post:
   *     summary: 收藏/取消收藏学习心得
   *     tags: [Client - LearningExperiences]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: experienceId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 心得ID
   *     responses:
   *       200:
   *         description: 操作成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ToggleBookmarkResponse'
   *       404:
   *         description: 心得不存在
   *       500:
   *         description: 服务器错误
   */
  router.post("/:experienceId/bookmark", controller.toggleBookmark);
  
  // 工作人员专用路由
  router.use("/staff", authMiddleware.isStaff);
  
  // 获取待审核的心得列表
  /**
   * @swagger
   * /api/v1/experiences/staff/pending:
   *   get:
   *     summary: 获取待审核的学习心得列表 (工作人员)
   *     tags: [Client - LearningExperiences]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: sortBy
   *         schema: { type: string, default: 'createdAt' }
   *       - in: query
   *         name: sortOrder
   *         schema: { type: string, enum: ['ASC', 'DESC'], default: 'ASC' }
   *     responses:
   *       200:
   *         description: 成功获取待审核心得列表
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedLearningExperiences' # Uses the same paginated schema
   *       403:
   *         description: 无权限 (非工作人员)
   *       500:
   *         description: 服务器错误
   */
  router.get("/staff/pending", controller.getPendingExperiences);
  
  // 注册路由
  app.use("/api/v1/experiences", router);
}; 