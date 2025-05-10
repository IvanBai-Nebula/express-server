module.exports = (sequelize, Sequelize) => {
  const EmailVerification = sequelize.define(
    "emailVerification",
    {
      verificationID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: "验证ID",
      },
      userType: {
        type: Sequelize.ENUM("User", "Staff"),
        allowNull: false,
        comment: "用户类型",
      },
      userID: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: "用户ID",
      },
      token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: "验证令牌",
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: "令牌过期时间",
      },
      isUsed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: "是否已使用"
      }
    },
    {
      tableName: "EmailVerifications",
      timestamps: true, // 保留 createdAt 记录请求时间
      updatedAt: false,
      comment: "邮箱验证请求表",
    },
  );

  return EmailVerification;
}; 