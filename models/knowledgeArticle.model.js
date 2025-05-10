module.exports = (sequelize, Sequelize) => {
  const KnowledgeArticle = sequelize.define("knowledgeArticle", {
    articleID: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: "知识编号"
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: "标题"
    },
    summary: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "简介"
    },
    coverImageURL: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "封面图片链接"
    },
    richTextContent: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "富文本内容"
    },
    videoURL: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "视频链接"
    },
    status: {
      type: Sequelize.ENUM('Draft', 'PendingReview', 'Published', 'Archived', 'Rejected'),
      allowNull: false,
      defaultValue: 'Draft',
      comment: "状态 (草稿, 待审核, 已发布, 已归档, 已拒绝)"
    },
    publishedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "发布时间"
    },
    version: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "文章版本号"
    },
    averageRating: {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: "平均评分"
    },
    viewCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "浏览次数"
    }
    // categoryID, authorStaffID, parentArticleID 将在模型关联中处理
  }, {
    tableName: 'KnowledgeArticles',
    timestamps: true,
    comment: "医疗知识表"
  });

  return KnowledgeArticle;
}; 