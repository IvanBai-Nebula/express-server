module.exports = (sequelize, Sequelize) => {
  const AuditLog = sequelize.define("auditLog", {
    logID: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: "日志ID"
    },
    actionType: {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: "操作类型 (例如: 'DELETE_USER', 'UPDATE_ARTICLE_STATUS')"
    },
    targetEntityType: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: "操作目标实体类型"
    },
    targetEntityID: {
      type: Sequelize.UUID,
      allowNull: true,
      comment: "操作目标实体 ID"
    },
    oldValue: {
      type: Sequelize.JSON,
      allowNull: true,
      comment: "操作前数据 (部分关键操作)"
    },
    newValue: {
      type: Sequelize.JSON,
      allowNull: true,
      comment: "操作后数据 (部分关键操作)"
    },
    timestamp: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
      comment: "操作时间"
    },
    ipAddress: {
      type: Sequelize.STRING(45),
      allowNull: true,
      comment: "操作者 IP"
    }
    // adminStaffID 将在模型关联中处理
  }, {
    tableName: 'AuditLogs',
    timestamps: false, // 使用 timestamp 字段代替
    comment: "系统审计日志表"
  });

  return AuditLog;
}; 