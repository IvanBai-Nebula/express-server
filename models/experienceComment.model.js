module.exports = (sequelize, Sequelize) => {
  const ExperienceComment = sequelize.define(
    "experienceComment",
    {
      commentID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: "评论ID",
      },
      userType: {
        type: Sequelize.ENUM("User", "Staff"),
        allowNull: false,
        comment: "用户类型",
      },
      commentText: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "评论内容",
      },
      status: {
        type: Sequelize.ENUM("Visible", "HiddenByModerator", "DeletedByUser"),
        defaultValue: "Visible",
        comment: "状态",
      },
      // experienceID, userID, parentCommentID 将在模型关联中处理
    },
    {
      tableName: "ExperienceComments",
      timestamps: true, // 保留 createdAt
      updatedAt: false, // 通常评论不会被编辑
      comment: "学习心得评论表",
    },
  );

  return ExperienceComment;
};
