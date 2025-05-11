module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define(
    "user",
    {
      userID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: "用户编号",
      },
      username: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
        comment: "用户名",
      },
      passwordHash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "密码 (哈希存储)",
      },
      email: {
        type: Sequelize.STRING(100),
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true,
        },
        comment: "邮箱",
      },
      avatarURL: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "头像链接",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "账户是否激活/未注销",
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "邮箱是否已验证",
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "最后登录时间",
      },
      preferredLanguage: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: "zh-CN",
        comment: "偏好语言",
      },
      notificationPreferences: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "通知偏好设置",
      },
      tokenVersion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "令牌版本，用于使已颁发的令牌失效",
      },
      // CreatedAt 和 UpdatedAt 字段 Sequelize 会自动添加
    },
    {
      tableName: "Users", // 明确指定表名
      timestamps: true, // Sequelize 会自动管理 createdAt 和 updatedAt 字段
      comment: "用户表",
      indexes: [
        {
          name: "idx_user_username",
          fields: ["username"],
          unique: true,
        },
        {
          name: "idx_user_email",
          fields: ["email"],
          unique: true,
        },
        {
          name: "idx_user_is_active",
          fields: ["isActive"],
        },
        {
          name: "idx_user_email_verified",
          fields: ["emailVerified"],
        },
        {
          name: "idx_user_last_login",
          fields: ["lastLoginAt"],
        },
      ],
    }
  );

  return User;
};
