module.exports = (sequelize, Sequelize) => {
  const SystemConfig = sequelize.define(
    "systemConfig",
    {
      configID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: "配置编号",
      },
      configKey: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: "配置键名",
      },
      configValue: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "配置值 (JSON格式)",
      },
      configGroup: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: "配置分组 (general, users, content等)",
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "配置描述",
      },
      updatedByStaffID: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: "最后更新者编号",
      },
    },
    {
      tableName: "SystemConfigs",
      timestamps: true,
      comment: "系统配置表",
    },
  );

  return SystemConfig;
};
