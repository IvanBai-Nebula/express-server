const controller = require("../controllers/staff.controller");
const authMiddleware = require("../middleware/auth.middleware");

module.exports = function (app) {
  const router = require("express").Router();

  // 所有路由都需要验证令牌
  router.use(authMiddleware.verifyToken);

  // 需要工作人员身份的路由
  router.use(authMiddleware.isStaff);

  /**
   * @swagger
   * /api/v1/staff/profile:
   *   get:
   *     summary: 获取当前登录工作人员的个人资料
   *     tags: [Client - Staff Profile]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功获取工作人员个人资料
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/StaffProfile'
   *       401:
   *         description: 未授权 (令牌无效或过期)
   *       403:
   *         description: 禁止访问 (用户不是工作人员)
   *       404:
   *         description: 工作人员未找到
   *       500:
   *         description: 服务器内部错误
   */
  // 获取当前工作人员信息
  router.get("/profile", controller.getCurrentStaff);

  /**
   * @swagger
   * /api/v1/staff/profile:
   *   put:
   *     summary: 更新当前登录工作人员的个人资料
   *     tags: [Client - Staff Profile]
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
   *                 example: "updatedstaffuser"
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 新的邮箱地址 (如果提供，必须唯一，且会导致 emailVerified 置为 false)
   *                 example: "updatedstaff@example.com"
   *               avatarURL:
   *                 type: string
   *                 format: url
   *                 nullable: true
   *                 description: 新的头像链接
   *                 example: "http://example.com/new_staff_avatar.jpg"
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
   *                 staff:
   *                   $ref: '#/components/schemas/StaffProfile'
   *       400:
   *         description: 请求无效 (例如，用户名或邮箱已被使用)
   *       401:
   *         description: 未授权
   *       403:
   *         description: 禁止访问 (用户不是工作人员)
   *       404:
   *         description: 工作人员未找到
   *       500:
   *         description: 服务器内部错误
   */
  // 更新当前工作人员个人资料
  router.put("/profile", controller.updateProfile);

  /**
   * @swagger
   * /api/v1/staff/password:
   *   put:
   *     summary: 更新当前登录工作人员的密码
   *     tags: [Client - Staff Profile]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdatePasswordPayload'
   *     responses:
   *       200:
   *         description: 密码更新成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *               example:
   *                 message: "密码已成功更新!"
   *       400:
   *         description: 请求无效 (例如，未提供当前密码或新密码)
   *       401:
   *         description: 未授权 (例如，当前密码不正确)
   *       403:
   *         description: 禁止访问 (用户不是工作人员)
   *       404:
   *         description: 工作人员未找到
   *       500:
   *         description: 服务器内部错误
   */
  // 更新当前工作人员密码
  router.put("/password", controller.updatePassword);

  // 注册路由
  app.use("/api/v1/staff", router);
};
