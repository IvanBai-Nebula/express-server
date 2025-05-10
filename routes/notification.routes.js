const controller = require("../controllers/notification.controller");
const authMiddleware = require("../middleware/auth.middleware");

module.exports = function(app) {
  const router = require("express").Router();

  // 所有通知路由需要身份验证
  router.use(authMiddleware.verifyToken);
  
  // 获取当前用户的通知列表
  /**
   * @swagger
   * /api/v1/notifications/:
   *   get:
   *     summary: 获取当前用户的通知列表 (分页)
   *     tags: [Client - Notifications]
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
   *         name: isRead
   *         schema:
   *           type: boolean
   *         description: 按已读/未读状态过滤 (true 或 false) (可选)
   *     responses:
   *       200:
   *         description: 成功获取通知列表
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedNotifications'
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.get("/", controller.getUserNotifications);
  
  // 获取通知汇总信息
  /**
   * @swagger
   * /api/v1/notifications/summary:
   *   get:
   *     summary: 获取当前用户的通知汇总信息 (未读数量和最新几条)
   *     tags: [Client - Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功获取通知汇总
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/NotificationSummary'
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.get("/summary", controller.getNotificationSummary);
  
  // 标记所有通知为已读
  /**
   * @swagger
   * /api/v1/notifications/read-all:
   *   put:
   *     summary: 标记当前用户的所有未读通知为已读
   *     tags: [Client - Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 成功标记所有通知为已读
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MarkAllNotificationsReadResponse'
   *       500:
   *         description: 服务器错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   */
  router.put("/read-all", controller.markAllAsRead);
  
  // 获取通知详情并标记为已读
  /**
   * @swagger
   * /api/v1/notifications/{notificationId}:
   *   get:
   *     summary: 获取指定通知的详情，并自动标记为已读
   *     tags: [Client - Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 通知的ID
   *     responses:
   *       200:
   *         description: 成功获取通知详情
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/NotificationDetails'
   *       403:
   *         description: 无权查看此通知
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       404:
   *         description: 通知不存在
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
  router.get("/:notificationId", controller.getNotificationDetails);
  
  // 标记通知为已读
  /**
   * @swagger
   * /api/v1/notifications/{notificationId}/read:
   *   put:
   *     summary: 标记指定通知为已读
   *     tags: [Client - Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 通知的ID
   *     responses:
   *       200:
   *         description: 通知已标记为已读 (或本身已是已读状态)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *       403:
   *         description: 无权修改此通知
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       404:
   *         description: 通知不存在
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
  router.put("/:notificationId/read", controller.markAsRead);
  
  // 删除通知
  /**
   * @swagger
   * /api/v1/notifications/{notificationId}:
   *   delete:
   *     summary: 删除指定通知
   *     tags: [Client - Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificationId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 通知的ID
   *     responses:
   *       200:
   *         description: 通知已成功删除
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericSuccessMessage'
   *       403:
   *         description: 无权删除此通知
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GenericErrorMessage'
   *       404:
   *         description: 通知不存在
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
  router.delete("/:notificationId", controller.deleteNotification);

  // 注册路由
  app.use("/api/v1/notifications", router);
}; 