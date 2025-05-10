module.exports = (sequelize, Sequelize) => {
  const ExperienceReview = sequelize.define("experienceReview", {
    reviewID: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: "记录编号"
    },
    reviewResult: {
      type: Sequelize.ENUM('Approved', 'Rejected', 'NeedsRevision'),
      allowNull: false,
      comment: "审核结果 (已批准, 已拒绝, 需要修改)"
    },
    comments: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "审核意见"
    },
    reviewTime: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
      comment: "审核时间"
    }
    // experienceID, reviewerStaffID 将在模型关联中处理
  }, {
    tableName: 'ExperienceReviews',
    timestamps: false, // 使用 reviewTime 代替
    comment: "心得审核记录表"
  });

  return ExperienceReview;
}; 