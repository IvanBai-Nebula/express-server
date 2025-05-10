const controller = require("../controllers/admin.controller");
const authMiddleware = require("../middleware/auth.middleware");

module.exports = function (app) {
  const router = require("express").Router();

  // 所有管理员路由需要管理员权限
  router.use(authMiddleware.verifyToken);
  router.use(authMiddleware.isAdmin);

  // 仪表盘统计
  /**
   * @swagger
   * /api/admin/dashboard/stats:
   *   get:
   *     summary: 获取管理员仪表盘统计数据
   *     tags: [Admin - Dashboard]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功获取仪表盘统计数据
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DashboardStats'
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.get("/dashboard/stats", controller.getDashboardStats);

  // 审计日志
  /**
   * @swagger
   * /api/admin/audit-logs:
   *   get:
   *     summary: 获取系统审计日志 (分页)
   *     tags: [Admin - AuditLogs]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: 页码
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: 每页数量
   *       - in: query
   *         name: actionType
   *         schema:
   *           type: string
   *         description: 按操作类型过滤 (可选)
   *       - in: query
   *         name: adminId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 按执行管理员ID过滤 (可选)
   *       - in: query
   *         name: fromDate
   *         schema:
   *           type: string
   *           format: date
   *         description: 起始日期 (YYYY-MM-DD) (可选)
   *       - in: query
   *         name: toDate
   *         schema:
   *           type: string
   *           format: date
   *         description: 结束日期 (YYYY-MM-DD) (可选)
   *     responses:
   *       200:
   *         description: 成功获取审计日志列表
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedAuditLogs'
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.get("/audit-logs", controller.getAuditLogs);

  // 用户管理
  /**
   * @swagger
   * /api/admin/users:
   *   get:
   *     summary: 获取用户列表 (包括普通用户和工作人员, 分页)
   *     tags: [Admin - UserManagement]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: 页码
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: 每页数量
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [all, user, staff]
   *           default: all
   *         description: 用户类型过滤 (all, user, staff)
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 按用户名或邮箱搜索 (可选)
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: 按激活状态过滤 (true 或 false) (可选)
   *     responses:
   *       200:
   *         description: 成功获取用户列表
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedAdminUsers'
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.get("/users", controller.getAllUsers);

  /**
   * @swagger
   * /api/admin/staff:
   *   post:
   *     summary: 管理员创建新的工作人员账户
   *     tags: [Admin - StaffManagement]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StaffCreationPayloadByAdmin'
   *     responses:
   *       201:
   *         description: 工作人员账户创建成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/StaffProfile' # Assuming StaffProfile is suitable, or create a specific one
   *       400:
   *         description: 请求参数错误或邮箱/用户名已存在
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
  router.post("/staff", controller.createStaffAccount);

  /**
   * @swagger
   * /api/admin/staff/{staffId}:
   *   get:
   *     summary: 获取特定工作人员的详细信息 (管理员权限)
   *     tags: [Admin - StaffManagement]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 工作人员的ID
   *     responses:
   *       200:
   *         description: 成功获取工作人员信息
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/StaffProfile'
   *       401:
   *         description: 未授权
   *       403:
   *         description: 禁止访问 (用户不是管理员)
   *       404:
   *         description: 工作人员未找到
   *       500:
   *         description: 服务器内部错误
   */
  router.get("/staff/:staffId", controller.getStaffById);

  /**
   * @swagger
   * /api/admin/staff/{staffId}:
   *   put:
   *     summary: 更新特定工作人员的信息 (管理员权限)
   *     tags: [Admin - StaffManagement]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 要更新的工作人员ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StaffUpdatePayloadByAdmin'
   *     responses:
   *       200:
   *         description: 工作人员信息更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "工作人员信息已更新!"
   *                 staff:
   *                   $ref: '#/components/schemas/StaffProfile'
   *       400:
   *         description: 请求无效 (例如，用户名或邮箱已被使用)
   *       401:
   *         description: 未授权
   *       403:
   *         description: 禁止访问 (用户不是管理员)
   *       404:
   *         description: 工作人员未找到
   *       500:
   *         description: 服务器内部错误
   */
  router.put("/staff/:staffId", controller.updateStaff);

  /**
   * @swagger
   * /api/admin/staff/{staffId}/reset-password:
   *   put:
   *     summary: 重置特定工作人员的密码 (管理员权限)
   *     tags: [Admin - StaffManagement]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 工作人员的ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StaffResetPasswordPayload'
   *     responses:
   *       200:
   *         description: 工作人员密码重置成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *               example:
   *                 message: "工作人员密码已重置!"
   *       400:
   *         description: 请求无效 (例如，未提供新密码)
   *       401:
   *         description: 未授权
   *       403:
   *         description: 禁止访问 (用户不是管理员)
   *       404:
   *         description: 工作人员未找到
   *       500:
   *         description: 服务器内部错误
   */
  router.put("/staff/:staffId/reset-password", controller.resetStaffPassword);

  /**
   * @swagger
   * /api/admin/staff/{staffId}:
   *   delete:
   *     summary: 删除特定工作人员的账户 (软删除，管理员权限)
   *     tags: [Admin - StaffManagement]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: staffId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 要删除的工作人员ID
   *     responses:
   *       200:
   *         description: 工作人员账户删除成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *               example:
   *                 message: "工作人员账户已删除!"
   *       400:
   *         description: 请求无效 (例如，试图删除自己的账户)
   *       401:
   *         description: 未授权
   *       403:
   *         description: 禁止访问 (用户不是管理员)
   *       404:
   *         description: 工作人员未找到
   *       500:
   *         description: 服务器内部错误
   */
  router.delete("/staff/:staffId", controller.deleteStaff);

  /**
   * @swagger
   * /api/admin/users/{userType}/{userId}/status:
   *   put:
   *     summary: 更新用户或工作人员的账户状态 (激活/禁用)
   *     tags: [Admin - UserManagement]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [user, staff]
   *         description: 目标账户类型 (user 或 staff)
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 目标账户的ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserStatusUpdatePayload'
   *     responses:
   *       200:
   *         description: 账户状态更新成功
   *         content:
   *           application/json:
   *             schema: # Might return the updated user/staff object or a success message
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *       400:
   *         description: 请求参数错误 (例如无效的 userType)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       404:
   *         description: 未找到指定的用户/工作人员
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
  router.put("/users/:userType/:userId/status", controller.updateUserStatus);

  // Tag Management (Admin)
  /**
   * @swagger
   * /api/admin/tags/{tagId}:
   *   delete:
   *     summary: 删除标签 (需要管理员权限)
   *     tags: [Admin - TagManagement]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tagId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 要删除的标签ID
   *     responses:
   *       200:
   *         description: 标签删除成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *       400:
   *         description: 标签正在被使用，无法删除
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DeleteTagErrorResponse'
   *       403:
   *         description: 无权限操作 (非管理员)
   *       404:
   *         description: 标签不存在
   *       500:
   *         description: 服务器错误
   */
  router.delete("/tags/:tagId", controller.deleteTag); // ATTENTION: Ensure controller.deleteTag is available (likely from tag.controller or moved to admin.controller)

  /**
   * @swagger
   * /api/admin/tags/merge:
   *   post:
   *     summary: 合并两个标签 (需要管理员权限)
   *     description: 将源标签的所有关联迁移到目标标签，然后删除源标签。
   *     tags: [Admin - TagManagement]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/MergeTagsPayload'
   *     responses:
   *       200:
   *         description: 标签合并成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MergeTagsResponse'
   *       400:
   *         description: 请求参数错误 (例如，源和目标ID相同，或ID无效)
   *       403:
   *         description: 无权限操作 (非管理员)
   *       404:
   *         description: 源标签或目标标签不存在
   *       500:
   *         description: 服务器错误
   */
  router.post("/tags/merge", controller.mergeTags); // ATTENTION: Ensure controller.mergeTags is available

  // 系统配置
  /**
   * @swagger
   * /api/admin/system-config:
   *   get:
   *     summary: 获取系统配置信息
   *     tags: [Admin - SystemConfig]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功获取系统配置
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SystemConfig'
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.get("/system-config", controller.getSystemConfig);

  /**
   * @swagger
   * /api/admin/system-config:
   *   put:
   *     summary: 更新系统配置信息
   *     tags: [Admin - SystemConfig]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SystemConfig' # Assuming the full config object is sent for update
   *     responses:
   *       200:
   *         description: 系统配置更新成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/SystemConfig' # Returns the updated config
   *       400:
   *         description: 请求参数错误
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
  router.put("/system-config", controller.updateSystemConfig);

  // 注册路由
  app.use("/api/admin", router);
};
