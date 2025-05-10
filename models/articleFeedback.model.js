module.exports = (sequelize, Sequelize) => {
  const ArticleFeedback = sequelize.define("articleFeedback", {
    feedbackID: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: "反馈ID"
    },
    userType: {
      type: Sequelize.ENUM('User', 'Staff'),
      allowNull: false,
      comment: "用户类型"
    },
    rating: {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      },
      comment: "评分 (1-5 星)"
    },
    comment: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "评论内容"
    },
    isAnonymous: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: "是否匿名反馈"
    }
    // articleID, userID 将在模型关联中处理
  }, {
    tableName: 'ArticleFeedbacks',
    timestamps: true, // 保留 createdAt
    updatedAt: false, // 通常评论不会被编辑
    comment: "知识文章反馈/评论表"
  });

  return ArticleFeedback;
}; 