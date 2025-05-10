const controller = require("../controllers/medicalCategory.controller");
const authMiddleware = require("../middleware/auth.middleware");

module.exports = function (app) {
  const router = require("express").Router();

  // 公开路由 - 任何人都可以查看类别
  /**
   * @swagger
   * /api/v1/categories/:
   *   get:
   *     summary: 获取医疗知识类别列表
   *     tags: [Client - MedicalCategories]
   *     parameters:
   *       - in: query
   *         name: format
   *         schema: { type: string, enum: [flat, tree], default: flat }
   *         description: 返回格式 (flat - 扁平列表, tree - 树形结构)
   *       - in: query
   *         name: onlyActive
   *         schema: { type: boolean, default: true }
   *         description: 是否只返回激活的类别
   *     responses:
   *       200:
   *         description: 成功获取类别列表
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/MedicalCategory' }
   *       500:
   *         description: 服务器错误
   */
  router.get("/", controller.getAllCategories);

  /**
   * @swagger
   * /api/v1/categories/{categoryId}:
   *   get:
   *     summary: 获取特定医疗类别的详情 (包含子类别)
   *     tags: [Client - MedicalCategories]
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 类别ID
   *     responses:
   *       200:
   *         description: 成功获取类别详情
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/MedicalCategory' } # Includes subcategories
   *       404:
   *         description: 类别不存在
   *       500:
   *         description: 服务器错误
   */
  router.get("/:categoryId", controller.getCategoryById);

  /**
   * @swagger
   * /api/v1/categories/{categoryId}/articles:
   *   get:
   *     summary: 获取特定医疗类别下的知识文章列表 (分页)
   *     tags: [Client - MedicalCategories]
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 类别ID
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: includeSubcategories
   *         schema: { type: boolean, default: false }
   *         description: 是否包含子分类下的文章
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [Published, Draft, PendingReview], default: Published }
   *         description: 文章状态 (仅工作人员可查看非Published的文章)
   *     responses:
   *       200:
   *         description: 成功获取类别下的文章列表
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/PaginatedCategoryArticles' }
   *       404:
   *         description: 类别不存在
   *       500:
   *         description: 服务器错误
   */
  router.get("/:categoryId/articles", controller.getCategoryArticles);

  // 需要工作人员身份的路由
  router.use(authMiddleware.verifyToken);
  router.use(authMiddleware.isStaff);

  // 类别管理操作
  /**
   * @swagger
   * /api/v1/categories/:
   *   post:
   *     summary: 创建新的医疗知识类别 (工作人员)
   *     tags: [Client - MedicalCategories]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/MedicalCategoryCreatePayload' }
   *     responses:
   *       201:
   *         description: 类别创建成功
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/CategoryResponse' }
   *       400:
   *         description: 请求参数错误 (如名称已存在)
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 父类别不存在 (如果提供了 parentCategoryID)
   *       500:
   *         description: 服务器错误
   */
  router.post("/", controller.createCategory);

  /**
   * @swagger
   * /api/v1/categories/{categoryId}:
   *   put:
   *     summary: 更新医疗知识类别 (工作人员)
   *     tags: [Client - MedicalCategories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 类别ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/MedicalCategoryUpdatePayload' }
   *     responses:
   *       200:
   *         description: 类别更新成功
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/CategoryResponse' }
   *       400:
   *         description: 请求参数错误 (如名称已存在，或循环依赖)
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 类别或父类别不存在
   *       500:
   *         description: 服务器错误
   */
  router.put("/:categoryId", controller.updateCategory);

  /**
   * @swagger
   * /api/v1/categories/{categoryId}:
   *   delete:
   *     summary: 删除医疗知识类别 (工作人员)
   *     description: 如果类别包含子类别，则无法删除。如果类别有关联文章，则将其设为非活跃状态，否则物理删除。
   *     tags: [Client - MedicalCategories]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: categoryId
   *         required: true
   *         schema: { type: string, format: uuid }
   *         description: 类别ID
   *     responses:
   *       200:
   *         description: 操作成功 (类别已删除或已设为非活跃)
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/DeleteCategoryResponse' }
   *       400:
   *         description: 无法删除 (如包含子类别)
   *       403:
   *         description: 无权限 (非工作人员)
   *       404:
   *         description: 类别不存在
   *       500:
   *         description: 服务器错误
   */
  router.delete("/:categoryId", controller.deleteCategory);

  // 注册路由
  app.use("/api/v1/categories", router);
};
