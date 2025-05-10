module.exports = (sequelize, Sequelize) => {
  const Notification = sequelize.define(
    "notification",
    {
      notificationID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: "通知ID",
      },
      recipientUserType: {
        type: Sequelize.ENUM("User", "Staff"),
        allowNull: false,
        comment: "接收者用户类型",
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment:
          "通知类型 (例如: 'NEW_EXPERIENCE_COMMENT', 'EXPERIENCE_REVIEWED', 'ARTICLE_UPDATED')",
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "通知内容",
      },
      relatedEntityType: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "关联实体类型",
      },
      relatedEntityID: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: "关联实体的 ID (例如，评论 ID 或文章 ID)",
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "是否已读",
      },
      // recipientUserID 将在模型关联中处理
    },
    {
      tableName: "Notifications",
      timestamps: true, // 保留 createdAt 作为通知发送时间
      updatedAt: false, // 通知内容通常不会更新
      comment: "通知表",
    },
  );

  return Notification;
};
