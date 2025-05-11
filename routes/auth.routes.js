const controller = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

module.exports = function (app) {
  const router = require("express").Router();

  /**
   * @swagger
   * /api/v1/auth/register/user:
   *   post:
   *     summary: 注册新用户账户
   *     tags: [Client - Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserRegistrationPayload'
   *     responses:
   *       201:
   *         description: 用户注册成功，提示检查邮箱激活账户
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "用户注册成功！请检查您的邮箱以激活账户。"
   *                 user:
   *                   $ref: '#/components/schemas/UserRegistrationResponse'
   *       400:
   *         description: 请求无效 (例如，信息不完整、密码不匹配、用户名或邮箱已被使用)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage' # 假设你有一个通用的错误消息 schema
   *       500:
   *         description: 服务器内部注册过程中发生错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  // 用户注册
  router.post("/register/user", controller.registerUser);

  // 增加通用注册路径重定向
  router.post("/register", controller.registerUser);

  /**
   * @swagger
   * /api/v1/auth/login:
   *   post:
   *     summary: 用户或工作人员登录
   *     tags: [Client - Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginPayload'
   *     responses:
   *       200:
   *         description: 登录成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LoginSuccessResponse'
   *       400:
   *         description: 请求无效 (例如，未提供用户名/邮箱或密码)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       401:
   *         description: 认证失败 (用户名/邮箱或密码不正确)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       403:
   *         description: 禁止访问 (例如，账户已被停用)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       500:
   *         description: 服务器内部登录过程中发生错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  // 通用登录接口 - 支持用户和工作人员同时登录
  router.post("/login", controller.login);

  /**
   * @swagger
   * /api/v1/auth/me:
   *   get:
   *     summary: 获取当前登录的用户或工作人员的详细信息
   *     tags: [Client - Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功获取当前实体（用户或工作人员）的信息
   *         content:
   *           application/json:
   *             schema:
   *               oneOf: # 根据登录的角色，返回 UserProfile 或 StaffProfile
   *                 - $ref: '#/components/schemas/UserProfile'
   *                 - $ref: '#/components/schemas/StaffProfile'
   *       401:
   *         description: 未授权 (令牌无效或过期)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       404:
   *         description: 实体未找到
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       500:
   *         description: 服务器内部错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  // 获取当前用户信息
  router.get("/me", authMiddleware.verifyToken, controller.getMe);

  /**
   * @swagger
   * /api/v1/auth/refresh-token:
   *   post:
   *     summary: 刷新访问令牌
   *     tags: [Client - Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken:
   *                 type: string
   *                 description: 刷新令牌
   *     responses:
   *       200:
   *         description: 成功刷新令牌
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 accessToken:
   *                   type: string
   *                   description: 新的访问令牌
   *                 refreshToken:
   *                   type: string
   *                   description: 新的刷新令牌（可能与旧的相同）
   *       400:
   *         description: 请求无效（未提供刷新令牌）
   *       401:
   *         description: 刷新令牌无效或已过期
   *       500:
   *         description: 服务器内部错误
   */
  // 刷新访问令牌
  router.post(
    "/refresh-token",
    authMiddleware.verifyRefreshToken,
    controller.refreshToken
  );

  /**
   * @swagger
   * /api/v1/auth/logout:
   *   post:
   *     summary: 用户或工作人员退出登录
   *     tags: [Client - Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功退出登录
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *               example:
   *                 message: "已成功退出登录!"
   *       401:
   *         description: 未授权 (令牌无效)
   *       500:
   *         description: 服务器内部错误
   */
  // 退出登录
  router.post("/logout", authMiddleware.verifyToken, controller.logout);

  /**
   * @swagger
   * /api/v1/auth/forgot-password:
   *   post:
   *     summary: 请求发送重置密码邮件
   *     tags: [Client - Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ForgotPasswordPayload'
   *     responses:
   *       200:
   *         description: 请求成功，提示用户检查邮箱
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *               example:
   *                 message: "如果邮箱地址存在于我们的系统中，您将会收到一封包含重置密码指示的邮件。"
   *       400:
   *         description: 请求无效 (例如，未提供邮箱或邮箱格式不正确)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       404:
   *         description: 邮箱地址未在系统中找到 (或者为了安全，即使找不到也返回200)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *               # 注意：为了防止邮箱枚举攻击，即使邮箱不存在，某些实现也会返回200 OK。
   *               # 如果是这种情况，则不应有404响应。请根据您的控制器逻辑调整。
   *       500:
   *         description: 服务器内部错误 (例如，邮件发送失败)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  // 请求重置密码
  router.post("/forgot-password", controller.forgotPassword);

  /**
   * @swagger
   * /api/v1/auth/reset-password:
   *   post:
   *     summary: 使用令牌重置密码
   *     tags: [Client - Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ResetPasswordPayload'
   *     responses:
   *       200:
   *         description: 密码重置成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *               example:
   *                 message: "密码已成功重置，您现在可以使用新密码登录。"
   *       400:
   *         description: 请求无效 (例如，令牌无效或已过期、密码不匹配、新密码不符合要求)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       500:
   *         description: 服务器内部错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  // 重置密码
  router.post("/reset-password", controller.resetPassword);

  /**
   * @swagger
   * /api/v1/auth/verify-email:
   *   post:
   *     summary: 使用令牌验证用户邮箱地址
   *     tags: [Client - Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/VerifyEmailPayload'
   *     responses:
   *       200:
   *         description: 邮箱验证成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *               example:
   *                 message: "邮箱已成功验证！"
   *       400:
   *         description: 请求无效 (例如，令牌无效或已过期)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       500:
   *         description: 服务器内部错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  // 验证邮箱
  router.post("/verify-email", controller.verifyEmail);

  // 注册路由
  app.use("/api/v1/auth", router);
};
