module.exports = (sequelize, Sequelize) => {
  const ArticleTag = sequelize.define(
    "articleTag",
    {
      // 复合主键将在关联设置中定义
    },
    {
      tableName: "ArticleTags",
      timestamps: false, // 这个关联表通常不需要时间戳
      comment: "知识文章标签关联表",
    },
  );

  return ArticleTag;
};
