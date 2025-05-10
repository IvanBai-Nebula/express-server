const controller = require("../controllers/tag.controller");
const authMiddleware = require("../middleware/auth.middleware");

module.exports = function(app) {
  const router = require("express").Router();

  // 公开路由 - 获取标签列表和标签详情
  /**
   * @swagger
   * /api/v1/tags/:
   *   get:
   *     summary: 获取所有标签列表
   *     tags: [Client - Tags]
   *     parameters:
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 按标签名称搜索 (可选)
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [name, createdAt, articleCount] 
   *           default: name
   *         description: 排序字段 (name, createdAt, articleCount - articleCount may not be directly sortable by DB without specific query adjustments)
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [ASC, DESC]
   *           default: ASC
   *         description: 排序顺序
   *     responses:
   *       200:
   *         description: 成功获取标签列表
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Tag' 
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.get("/", controller.getAllTags);

  /**
   * @swagger
   * /api/v1/tags/{tagId}:
   *   get:
   *     summary: 获取特定标签的详情及其关联的文章
   *     tags: [Client - Tags]
   *     parameters:
   *       - in: path
   *         name: tagId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 标签的ID
   *     responses:
   *       200:
   *         description: 成功获取标签详情
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TagWithArticles'
   *       404:
   *         description: 标签不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.get("/:tagId", controller.getTagById);
  
  // 需要工作人员权限的路由
  router.use(authMiddleware.verifyToken);
  router.use(authMiddleware.isStaff);
  
  // 标签管理
  /**
   * @swagger
   * /api/v1/tags/:
   *   post:
   *     summary: 创建新标签 (需要工作人员权限)
   *     tags: [Client - Tags]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TagCreatePayload'
   *     responses:
   *       201:
   *         description: 标签创建成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TagResponse'
   *       400:
   *         description: 请求参数错误或标签已存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       403:
   *         description: 无权限操作 (非工作人员)
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.post("/", controller.createTag);

  /**
   * @swagger
   * /api/v1/tags/{tagId}:
   *   put:
   *     summary: 更新标签名称 (需要工作人员权限)
   *     tags: [Client - Tags]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tagId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 要更新的标签ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TagUpdatePayload'
   *     responses:
   *       200:
   *         description: 标签更新成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TagResponse'
   *       400:
   *         description: 请求参数错误或新标签名称已存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       403:
   *         description: 无权限操作 (非工作人员)
   *       404:
   *         description: 标签不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.put("/:tagId", controller.updateTag);
  
  // 获取标签统计
  /**
   * @swagger
   * /api/v1/tags/stats/usage:
   *   get:
   *     summary: 获取标签使用统计 (需要工作人员权限)
   *     tags: [Client - Tags]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功获取标签统计数据
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TagStatsResponse'
   *       403:
   *         description: 无权限操作 (非工作人员)
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.get("/stats/usage", controller.getTagStats);

  // 注册路由
  app.use("/api/v1/tags", router);
}; 