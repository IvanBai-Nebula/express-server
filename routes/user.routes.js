const controller = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");

module.exports = function (app) {
  const router = require("express").Router();

  // 所有路由都需要验证令牌
  router.use(authMiddleware.verifyToken);

  /**
   * @swagger
   * /api/v1/users/profile:
   *   get:
   *     summary: 获取当前登录用户的个人资料
   *     tags: [Client - Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功获取用户个人资料
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserProfile' # 直接引用 UserProfile schema
   *       401:
   *         description: 未授权 - 需要有效的认证令牌
   *       404:
   *         description: 用户未找到
   *       500:
   *         description: 服务器内部错误
   */
  // 获取当前用户信息
  router.get("/profile", controller.getCurrentUser);

  /**
   * @swagger
   * /api/v1/users/profile:
   *   put:
   *     summary: 更新当前登录用户的个人资料
   *     tags: [Client - Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *                 description: 新的用户名 (如果提供，必须唯一)
   *                 example: "newjohndoe"
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 新的邮箱地址 (如果提供，必须唯一，且会导致 emailVerified 置为 false)
   *                 example: "newjohndoe@example.com"
   *               avatarURL:
   *                 type: string
   *                 format: url
   *                 nullable: true
   *                 description: 新的头像链接
   *                 example: "http://example.com/new_avatar.jpg"
   *               preferredLanguage:
   *                 type: string
   *                 nullable: true
   *                 description: 偏好语言
   *                 example: "en-US"
   *               notificationPreferences: # 确保这个结构与 UserProfile schema 中的定义一致或更具体
   *                 type: object
   *                 nullable: true
   *                 description: 通知偏好设置
   *                 example: { "emailEnabled": false, "pushEnabled": true }
   *     responses:
   *       200:
   *         description: 个人资料更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "个人资料已更新!"
   *                 user:
   *                   $ref: '#/components/schemas/UserProfile'
   *       400:
   *         description: 无效的输入数据 (例如，用户名或邮箱已被使用)
   *       401:
   *         description: 未授权
   *       404:
   *         description: 用户未找到
   *       500:
   *         description: 服务器内部错误
   */
  // 更新用户个人资料
  router.put("/profile", controller.updateProfile);

  /**
   * @swagger
   * /api/v1/users/password:
   *   put:
   *     summary: 更新当前登录用户的密码
   *     tags: [Client - Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *                 format: password
   *                 description: 当前密码
   *                 example: "currentSecurePassword123"
   *               newPassword:
   *                 type: string
   *                 format: password
   *                 description: 新密码 (应符合一定的复杂度要求，但此处未具体定义)
   *                 example: "newSecurePassword456"
   *     responses:
   *       200:
   *         description: 密码更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "密码已成功更新!"
   *       400:
   *         description: 请求无效 (例如，未提供当前密码或新密码)
   *       401:
   *         description: 未授权 (例如，当前密码不正确)
   *       404:
   *         description: 用户未找到
   *       500:
   *         description: 服务器内部错误
   */
  // 更新用户密码
  router.put("/password", controller.updatePassword);

  /**
   * @swagger
   * /api/v1/users/notification-preferences:
   *   put:
   *     summary: 更新当前登录用户的通知设置
   *     tags: [Client - Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: 用户的通知偏好设置对象。具体结构应与 UserProfile schema 中 notificationPreferences 的定义一致。
   *             example: { "emailEnabled": true, "pushEnabled": false }
   *             # 如果 UserProfile schema 中 notificationPreferences 的 properties 已详细定义，则可直接引用：
   *             # $ref: '#/components/schemas/UserProfile/properties/notificationPreferences'
   *             # 或者为此创建一个独立的 schema, 例如 NotificationPreferencesPayload
   *             properties: # 示例，请根据 UserProfile schema 或实际情况调整
   *                emailEnabled:
   *                  type: boolean
   *                pushEnabled:
   *                  type: boolean
   *     responses:
   *       200:
   *         description: 通知设置更新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "通知设置已更新!"
   *                 notificationPreferences: # 确保此结构与 UserProfile schema 中定义的一致
   *                   type: object
   *                   example: { "emailEnabled": true, "pushEnabled": false }
   *                   # $ref: '#/components/schemas/UserProfile/properties/notificationPreferences' # 或者引用
   *       400:
   *         description: 请求无效 (例如，未提供通知设置)
   *       401:
   *         description: 未授权
   *       404:
   *         description: 用户未找到
   *       500:
   *         description: 服务器内部错误
   */
  // 更新通知设置
  router.put("/notification-preferences", controller.updateNotificationPreferences);

  /**
   * @swagger
   * /api/v1/users:
   *   delete:
   *     summary: 注销当前登录用户的账户 (软删除)
   *     tags: [Client - Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - password
   *             properties:
   *               password:
   *                 type: string
   *                 format: password
   *                 description: 用户当前密码以确认操作
   *                 example: "currentSecurePassword123"
   *     responses:
   *       200:
   *         description: 账户注销成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "账户已成功注销!"
   *       400:
   *         description: 请求无效 (例如，未提供密码)
   *       401:
   *         description: 未授权 (例如，密码不正确)
   *       404:
   *         description: 用户未找到
   *       500:
   *         description: 服务器内部错误
   */
  // 删除账户
  router.delete("/", controller.deleteAccount);

  /**
   * @swagger
   * /api/v1/users/experiences:
   *   get:
   *     summary: 获取当前登录用户的所有学习心得列表
   *     tags: [Client - Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功获取学习心得列表
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/LearningExperience'
   *       401:
   *         description: 未授权
   *       500:
   *         description: 服务器内部错误
   */
  // 获取用户的学习心得列表
  router.get("/experiences", controller.getUserExperiences);

  // 注册路由
  app.use("/api/v1/users", router);
};
