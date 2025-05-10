const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: 0, // Sequelize v5 an prior use 'operatorsAliases: false'. v6 and beyond, this is not needed.
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 加载模型
db.users = require("./user.model.js")(sequelize, Sequelize);
db.staff = require("./staff.model.js")(sequelize, Sequelize);
db.medicalCategories = require("./medicalCategory.model.js")(sequelize, Sequelize);
db.tags = require("./tag.model.js")(sequelize, Sequelize);
db.knowledgeArticles = require("./knowledgeArticle.model.js")(sequelize, Sequelize);
db.articleTags = require("./articleTag.model.js")(sequelize, Sequelize);
db.learningExperiences = require("./learningExperience.model.js")(sequelize, Sequelize);
db.experienceReviews = require("./experienceReview.model.js")(sequelize, Sequelize);
db.articleVersions = require("./articleVersion.model.js")(sequelize, Sequelize);
db.articleFeedbacks = require("./articleFeedback.model.js")(sequelize, Sequelize);
db.experienceComments = require("./experienceComment.model.js")(sequelize, Sequelize);
db.userBookmarks = require("./userBookmark.model.js")(sequelize, Sequelize);
db.notifications = require("./notification.model.js")(sequelize, Sequelize);
db.passwordResets = require("./passwordReset.model.js")(sequelize, Sequelize);
db.auditLogs = require("./auditLog.model.js")(sequelize, Sequelize);
db.systemConfigs = require("./systemConfig.model.js")(sequelize, Sequelize);
db.emailVerifications = require("./emailVerification.model.js")(sequelize, Sequelize);

// 建立模型关联

// 系统配置与更新者关联
db.staff.hasMany(db.systemConfigs, {
  foreignKey: "updatedByStaffID",
  as: "updatedConfigs",
});
db.systemConfigs.belongsTo(db.staff, {
  foreignKey: "updatedByStaffID",
  as: "updatedBy",
});

// 医疗类别与创建者 (Staff) 的关联
db.staff.hasMany(db.medicalCategories, {
  foreignKey: { name: "createdByStaffID", allowNull: false },
  as: "createdCategories",
});
db.medicalCategories.belongsTo(db.staff, {
  foreignKey: "createdByStaffID",
  as: "creator",
});

// 知识文章与类别、作者的关联
db.medicalCategories.hasMany(db.knowledgeArticles, {
  foreignKey: { name: "categoryID", allowNull: false },
  as: "articles",
});
db.knowledgeArticles.belongsTo(db.medicalCategories, {
  foreignKey: "categoryID",
  as: "category",
});

db.staff.hasMany(db.knowledgeArticles, {
  foreignKey: { name: "authorStaffID", allowNull: false },
  as: "authoredArticles",
});
db.knowledgeArticles.belongsTo(db.staff, {
  foreignKey: "authorStaffID",
  as: "author",
});

// 文章版本追溯
db.knowledgeArticles.hasMany(db.knowledgeArticles, {
  foreignKey: "parentArticleID",
  as: "versions",
});
db.knowledgeArticles.belongsTo(db.knowledgeArticles, {
  foreignKey: "parentArticleID",
  as: "previousVersion",
});

// 知识文章与标签的多对多关联 (通过 ArticleTags 表)
db.knowledgeArticles.belongsToMany(db.tags, {
  through: db.articleTags,
  foreignKey: "articleID",
  otherKey: "tagID",
  as: "tags",
});
db.tags.belongsToMany(db.knowledgeArticles, {
  through: db.articleTags,
  foreignKey: "tagID",
  otherKey: "articleID",
  as: "articles",
});

// 文章历史版本的关联
db.knowledgeArticles.hasMany(db.articleVersions, {
  foreignKey: { name: "articleID", allowNull: false },
  as: "historyVersions",
});
db.articleVersions.belongsTo(db.knowledgeArticles, {
  foreignKey: "articleID",
  as: "article",
});

db.staff.hasMany(db.articleVersions, {
  foreignKey: { name: "authorStaffID", allowNull: false },
  as: "savedVersions",
});
db.articleVersions.belongsTo(db.staff, {
  foreignKey: "authorStaffID",
  as: "author",
});

// 文章反馈的关联
db.knowledgeArticles.hasMany(db.articleFeedbacks, {
  foreignKey: { name: "articleID", allowNull: false },
  as: "feedbacks",
});
db.articleFeedbacks.belongsTo(db.knowledgeArticles, {
  foreignKey: "articleID",
  as: "article",
});

// 用户与文章反馈的多态关联 (用户可以是 User 或 Staff)
db.users.hasMany(db.articleFeedbacks, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "User",
  },
  as: "articleFeedbacks",
});
db.staff.hasMany(db.articleFeedbacks, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "Staff",
  },
  as: "articleFeedbacks",
});
db.articleFeedbacks.belongsTo(db.users, {
  foreignKey: "userID",
  constraints: false,
  as: "user",
});
db.articleFeedbacks.belongsTo(db.staff, {
  foreignKey: "userID",
  constraints: false,
  as: "staffUser",
});

// 学习心得与用户的关联
db.users.hasMany(db.learningExperiences, {
  foreignKey: { name: "userID", allowNull: false },
  as: "experiences",
});
db.learningExperiences.belongsTo(db.users, {
  foreignKey: "userID",
  as: "user",
});

// 心得评论的关联
db.learningExperiences.hasMany(db.experienceComments, {
  foreignKey: { name: "experienceID", allowNull: false },
  as: "comments",
});
db.experienceComments.belongsTo(db.learningExperiences, {
  foreignKey: "experienceID",
  as: "experience",
});

// 评论的自引用关联 (用于回复评论)
db.experienceComments.hasMany(db.experienceComments, {
  foreignKey: "parentCommentID",
  as: "replies",
});
db.experienceComments.belongsTo(db.experienceComments, {
  foreignKey: "parentCommentID",
  as: "parentComment",
});

// 用户与心得评论的多态关联 (用户可以是 User 或 Staff)
db.users.hasMany(db.experienceComments, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "User",
  },
  as: "experienceComments",
});
db.staff.hasMany(db.experienceComments, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "Staff",
  },
  as: "experienceComments",
});
db.experienceComments.belongsTo(db.users, {
  foreignKey: "userID",
  constraints: false,
  as: "user",
});
db.experienceComments.belongsTo(db.staff, {
  foreignKey: "userID",
  constraints: false,
  as: "staffUser",
});

// 心得审核的关联
db.learningExperiences.hasMany(db.experienceReviews, {
  foreignKey: { name: "experienceID", allowNull: false },
  as: "reviews",
});
db.experienceReviews.belongsTo(db.learningExperiences, {
  foreignKey: "experienceID",
  as: "experience",
});

db.staff.hasMany(db.experienceReviews, {
  foreignKey: { name: "reviewerStaffID", allowNull: false },
  as: "reviewedExperiences",
});
db.experienceReviews.belongsTo(db.staff, {
  foreignKey: "reviewerStaffID",
  as: "reviewer",
});

// 用户收藏的多态关联
db.users.hasMany(db.userBookmarks, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "User",
  },
  as: "bookmarks",
});
db.staff.hasMany(db.userBookmarks, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "Staff",
  },
  as: "bookmarks",
});
db.userBookmarks.belongsTo(db.users, {
  foreignKey: "userID",
  constraints: false,
  as: "user",
});
db.userBookmarks.belongsTo(db.staff, {
  foreignKey: "userID",
  constraints: false,
  as: "staffUser",
});

// 通知的多态关联
db.users.hasMany(db.notifications, {
  foreignKey: "recipientUserID",
  constraints: false,
  scope: {
    recipientUserType: "User",
  },
  as: "notifications",
});
db.staff.hasMany(db.notifications, {
  foreignKey: "recipientUserID",
  constraints: false,
  scope: {
    recipientUserType: "Staff",
  },
  as: "notifications",
});
db.notifications.belongsTo(db.users, {
  foreignKey: "recipientUserID",
  constraints: false,
  as: "userRecipient",
});
db.notifications.belongsTo(db.staff, {
  foreignKey: "recipientUserID",
  constraints: false,
  as: "staffRecipient",
});

// 密码重置请求的多态关联
db.users.hasMany(db.passwordResets, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "User",
  },
  as: "passwordResets",
});
db.staff.hasMany(db.passwordResets, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "Staff",
  },
  as: "passwordResets",
});
db.passwordResets.belongsTo(db.users, {
  foreignKey: "userID",
  constraints: false,
  as: "user",
});
db.passwordResets.belongsTo(db.staff, {
  foreignKey: "userID",
  constraints: false,
  as: "staffUser",
});

// 邮箱验证的多态关联
db.users.hasMany(db.emailVerifications, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "User",
  },
  as: "emailVerifications",
});
db.staff.hasMany(db.emailVerifications, {
  foreignKey: "userID",
  constraints: false,
  scope: {
    userType: "Staff",
  },
  as: "emailVerifications",
});
db.emailVerifications.belongsTo(db.users, {
  foreignKey: "userID",
  constraints: false,
  as: "user",
});
db.emailVerifications.belongsTo(db.staff, {
  foreignKey: "userID",
  constraints: false,
  as: "staffUser",
});

// 审计日志与管理员的关联
db.staff.hasMany(db.auditLogs, {
  foreignKey: { name: "adminStaffID", allowNull: false },
  as: "auditLogs",
});
db.auditLogs.belongsTo(db.staff, {
  foreignKey: "adminStaffID",
  as: "admin",
});

module.exports = db;
