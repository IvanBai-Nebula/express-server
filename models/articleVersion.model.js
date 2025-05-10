module.exports = (sequelize, Sequelize) => {
  const ArticleVersion = sequelize.define(
    "articleVersion",
    {
      versionID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: "版本ID",
      },
      versionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "版本号",
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "标题",
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "简介",
      },
      richTextContent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "富文本内容",
      },
      videoURL: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "视频链接",
      },
      savedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: "保存时间",
      },
      // articleID, authorStaffID 将在模型关联中处理
    },
    {
      tableName: "ArticleVersions",
      timestamps: false, // 使用 savedAt 代替
      comment: "知识文章历史版本表",
    },
  );

  return ArticleVersion;
};
