module.exports = (sequelize, Sequelize) => {
  const LearningExperience = sequelize.define(
    "learningExperience",
    {
      experienceID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: "心得编号",
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "标题",
      },
      richTextContent: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "富文本内容",
      },
      status: {
        type: Sequelize.ENUM("Draft", "PendingReview", "Approved", "Rejected", "Published"),
        allowNull: false,
        defaultValue: "Draft",
        comment: "状态 (草稿, 待审核, 已批准, 已拒绝, 已发布)",
      },
      allowComments: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "是否允许评论",
      },
      upvoteCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "点赞数",
      },
      // userID 将在模型关联中处理
    },
    {
      tableName: "LearningExperiences",
      timestamps: true,
      comment: "学习心得表",
    },
  );

  return LearningExperience;
};
