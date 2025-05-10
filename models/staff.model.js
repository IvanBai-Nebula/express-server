module.exports = (sequelize, Sequelize) => {
  const Staff = sequelize.define("staff", {
    staffID: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: "工作人员编号"
    },
    username: {
      type: Sequelize.STRING(50),
      unique: true,
      allowNull: false,
      comment: "用户名"
    },
    passwordHash: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: "密码 (哈希存储)"
    },
    email: {
      type: Sequelize.STRING(100),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      },
      comment: "邮箱"
    },
    avatarURL: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "头像链接"
    },
    isAdmin: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "是否为管理员"
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "账户是否激活/未注销"
    },
    emailVerified: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "邮箱是否已验证"
    },
    lastLoginAt: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "最后登录时间"
    },
    preferredLanguage: {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: 'zh-CN',
      comment: "偏好语言"
    },
    notificationPreferences: {
      type: Sequelize.JSON,
      allowNull: true,
      comment: "通知偏好设置"
    }
    // CreatedAt 和 UpdatedAt 字段 Sequelize 会自动添加
  }, {
    tableName: 'Staff', // 明确指定表名，与文档一致
    timestamps: true,
    comment: "工作人员表"
  });

  return Staff;
}; 