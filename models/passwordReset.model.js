module.exports = (sequelize, Sequelize) => {
  const PasswordReset = sequelize.define("passwordReset", {
    resetID: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: "重置ID"
    },
    userType: {
      type: Sequelize.ENUM('User', 'Staff'),
      allowNull: false,
      comment: "用户类型"
    },
    token: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
      comment: "重置令牌"
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false,
      comment: "令牌过期时间"
    }
    // userID 将在模型关联中处理
  }, {
    tableName: 'PasswordResets',
    timestamps: true, // 保留 createdAt 记录请求时间
    updatedAt: false,
    comment: "密码重置请求表"
  });

  return PasswordReset;
}; 