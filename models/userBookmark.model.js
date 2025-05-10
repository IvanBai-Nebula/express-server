module.exports = (sequelize, Sequelize) => {
  const UserBookmark = sequelize.define("userBookmark", {
    bookmarkID: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: "收藏ID"
    },
    userType: {
      type: Sequelize.ENUM('User', 'Staff'),
      allowNull: false,
      comment: "用户类型"
    },
    entityType: {
      type: Sequelize.ENUM('KnowledgeArticle', 'LearningExperience'),
      allowNull: false,
      comment: "收藏的实体类型"
    },
    entityID: {
      type: Sequelize.UUID,
      allowNull: false,
      comment: "对应实体的 ID"
    }
    // userID 将在模型关联中处理
  }, {
    tableName: 'UserBookmarks',
    timestamps: true, // 保留 createdAt
    updatedAt: false, // 收藏一般不会更新
    comment: "用户收藏表"
  });

  return UserBookmark;
}; 