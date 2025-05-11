const bcrypt = require("bcryptjs");
const db = require("../models");

// 模型简写，方便使用
const {
  users,
  staff,
  medicalCategories,
  tags,
  knowledgeArticles,
  articleTags,
  learningExperiences,
  experienceComments,
  articleVersions,
  passwordResets,
  emailVerifications,
  experienceReviews,
  notifications,
  systemConfigs,
  userBookmarks,
  articleFeedbacks,
  auditLogs,
} = db;

// 生成加密密码的函数
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// 辅助函数：生成随机字符串
const generateRandomString = (length) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// 辅助函数：生成随机日期（在过去某段时间内）
const getRandomDate = (daysAgo = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
};

// 辅助函数：从数组中随机选择一个元素
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 主要的种子数据函数
const seedData = async () => {
  try {
    console.log("开始生成种子数据...");

    // --- 职员和管理员 ---
    const adminPasswordHash = await hashPassword("Admin@123");
    const staffPasswordHash = await hashPassword("staff123");
    const staffList = [];

    const admin = await staff.create({
      username: "admin",
      passwordHash: adminPasswordHash,
      email: "admin@example.com",
      isAdmin: true,
      emailVerified: true,
    });
    staffList.push(admin);

    // 创建5个医生（增加数量）
    for (let i = 1; i <= 5; i++) {
      staffList.push(
        await staff.create({
          username: `doctor${i}`,
          passwordHash: staffPasswordHash,
          email: `doctor${i}@example.com`,
          isAdmin: false,
          emailVerified: true,
        })
      );
    }

    console.log(`已创建 ${staffList.length} 个职员账号`);

    // --- 普通用户 ---
    const userPasswordHash = await hashPassword("user123");
    const testUsers = [];
    // 创建10个用户（增加数量）
    for (let i = 1; i <= 10; i++) {
      testUsers.push(
        await users.create({
          username: `user${i}`,
          passwordHash: userPasswordHash,
          email: `user${i}@example.com`,
          emailVerified: true,
        })
      );
    }
    console.log(`已创建 ${testUsers.length} 个测试用户`);

    // --- 邮箱验证记录 ---
    // 添加一些电子邮箱验证记录
    for (let i = 1; i <= 3; i++) {
      const randomUser = getRandomElement(testUsers);
      await emailVerifications.create({
        token: `verification-token-${i}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
        userID: randomUser.userID,
        userType: "User",
      });
    }

    // 为员工创建邮箱验证记录
    for (let i = 1; i <= 2; i++) {
      const randomStaff = getRandomElement(staffList.filter((s) => !s.isAdmin));
      await emailVerifications.create({
        token: `staff-verification-token-${i}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
        userID: randomStaff.staffID,
        userType: "Staff",
      });
    }
    console.log("已创建 5 条邮箱验证记录");

    // --- 密码重置记录 ---
    // 添加一些密码重置记录
    for (let i = 1; i <= 3; i++) {
      const randomUser = getRandomElement(testUsers);
      await passwordResets.create({
        token: `reset-token-${i}`,
        expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3小时后过期
        userID: randomUser.userID,
        userType: "User",
      });
    }

    // 为员工创建密码重置记录
    for (let i = 1; i <= 2; i++) {
      const randomStaff = getRandomElement(staffList);
      await passwordResets.create({
        token: `staff-reset-token-${i}`,
        expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3小时后过期
        userID: randomStaff.staffID,
        userType: "Staff",
      });
    }
    console.log("已创建 5 条密码重置记录");

    // --- 医疗分类 ---
    const medicalCategoriesList = [];
    // 创建5个顶级分类（增加数量）
    const topLevelCategoriesData = [
      {
        name: "内科",
        description:
          "内科医学是研究人体内脏器官疾病的诊断与非手术治疗的医学专科",
        isActive: true,
      },
      {
        name: "外科",
        description:
          "外科医学是研究外伤、肿瘤和先天性等疾病的手术治疗方法的医学专科",
        isActive: true,
      },
      {
        name: "儿科",
        description: "儿科医学是研究小儿时期身心发育、疾病防治及保健的医学专科",
        isActive: true,
      },
      {
        name: "妇产科",
        description: "妇产科医学是研究女性生殖系统疾病和妊娠相关疾病的医学专科",
        isActive: true,
      },
      {
        name: "神经科",
        description: "神经科医学是研究神经系统疾病的诊断与治疗的医学专科",
        isActive: true,
      },
    ];

    for (const catData of topLevelCategoriesData) {
      medicalCategoriesList.push(
        await medicalCategories.create({
          ...catData,
          createdByStaffID: admin.staffID,
        })
      );
    }

    // 创建8个子分类（增加数量）
    const subCategoriesData = [
      { name: "心脏内科", parentIndex: 0, createdByStaffIndex: 1 }, // 内科 -> doctor1
      { name: "肺病内科", parentIndex: 0, createdByStaffIndex: 2 }, // 内科 -> doctor2
      { name: "普通外科", parentIndex: 1, createdByStaffIndex: 3 }, // 外科 -> doctor3
      { name: "骨外科", parentIndex: 1, createdByStaffIndex: 4 }, // 外科 -> doctor4
      { name: "小儿内科", parentIndex: 2, createdByStaffIndex: 5 }, // 儿科 -> doctor5
      { name: "小儿外科", parentIndex: 2, createdByStaffIndex: 1 }, // 儿科 -> doctor1
      { name: "产科", parentIndex: 3, createdByStaffIndex: 2 }, // 妇产科 -> doctor2
      { name: "神经内科", parentIndex: 4, createdByStaffIndex: 3 }, // 神经科 -> doctor3
    ];

    for (const subCatData of subCategoriesData) {
      if (
        medicalCategoriesList[subCatData.parentIndex] &&
        staffList[subCatData.createdByStaffIndex]
      ) {
        medicalCategoriesList.push(
          await medicalCategories.create({
            name: subCatData.name,
            description: `${subCatData.name}的相关描述`,
            isActive: true,
            createdByStaffID: staffList[subCatData.createdByStaffIndex].staffID,
            parentCategoryID:
              medicalCategoriesList[subCatData.parentIndex].categoryID,
          })
        );
      }
    }

    // 添加几个三级分类
    const thirdLevelCategoriesData = [
      { name: "冠心病专科", parentIndex: 5, createdByStaffIndex: 1 }, // 心脏内科 -> doctor1
      { name: "心律失常科", parentIndex: 5, createdByStaffIndex: 2 }, // 心脏内科 -> doctor2
      { name: "肺癌科室", parentIndex: 6, createdByStaffIndex: 3 }, // 肺病内科 -> doctor3
      { name: "骨折专科", parentIndex: 8, createdByStaffIndex: 4 }, // 骨外科 -> doctor4
      { name: "儿童营养科", parentIndex: 9, createdByStaffIndex: 5 }, // 小儿内科 -> doctor5
    ];

    for (const thirdCatData of thirdLevelCategoriesData) {
      if (
        medicalCategoriesList[thirdCatData.parentIndex] &&
        staffList[thirdCatData.createdByStaffIndex]
      ) {
        medicalCategoriesList.push(
          await medicalCategories.create({
            name: thirdCatData.name,
            description: `${thirdCatData.name}的相关描述`,
            isActive: true,
            createdByStaffID:
              staffList[thirdCatData.createdByStaffIndex].staffID,
            parentCategoryID:
              medicalCategoriesList[thirdCatData.parentIndex].categoryID,
          })
        );
      }
    }

    console.log(`已创建 ${medicalCategoriesList.length} 个医疗分类`);

    // --- 标签 ---
    // 创建20个标签（增加数量）
    const tagData = [
      "常见病",
      "慢性病",
      "急症",
      "预防",
      "治疗",
      "康复",
      "儿童",
      "老年人",
      "孕妇",
      "心脏",
      "肺部",
      "消化系统",
      "神经系统",
      "骨科",
      "皮肤",
      "营养",
      "心理健康",
      "传染病",
      "免疫系统",
      "药物治疗",
    ];
    const createdTags = [];
    for (const tagName of tagData) {
      createdTags.push(await tags.create({ tagName }));
    }
    console.log(`已创建 ${createdTags.length} 个标签`);

    // --- 知识文章 ---
    const knowledgeArticlesList = [];
    const articleStatuses = [
      "Draft",
      "Published",
      "Published",
      "Published",
      "Archived",
      "PendingReview",
    ];
    // 创建20篇文章（增加数量）
    for (let i = 1; i <= 20; i++) {
      const randomCategory = getRandomElement(medicalCategoriesList);
      const randomAuthor = getRandomElement(
        staffList.filter((s) => !s.isAdmin)
      ); // Authors are non-admin staff
      // 将状态偏向Published，确保有足够多的已发布文章
      const randomStatus = getRandomElement(articleStatuses);

      const article = await knowledgeArticles.create({
        title: `${randomCategory.name}相关知识文章 ${i}`,
        summary: `这是关于 ${randomCategory.name} 的文章 ${i} 的摘要。简要内容描述。`,
        richTextContent: `<h2>文章 ${i} 标题</h2><p>这是文章 ${i} 的详细内容。基本内容包括疾病介绍、症状、治疗方法等。</p><ul><li>要点1</li><li>要点2</li></ul>`,
        status: randomStatus,
        publishedAt: randomStatus === "Published" ? new Date() : null,
        version: 1,
        viewCount: Math.floor(Math.random() * 1000),
        averageRating: (Math.random() * 4 + 1).toFixed(1),
        categoryID: randomCategory.categoryID,
        authorStaffID: randomAuthor.staffID,
      });

      knowledgeArticlesList.push(article);

      // 为每篇文章添加3-5个标签（增加标签关联数量）
      const tagCount = Math.floor(Math.random() * 3) + 3; // 3-5 tags
      const usedTagIndexes = new Set();
      for (let j = 0; j < tagCount; j++) {
        let randomTagIndex;
        do {
          randomTagIndex = Math.floor(Math.random() * createdTags.length);
        } while (usedTagIndexes.has(randomTagIndex));
        usedTagIndexes.add(randomTagIndex);

        await articleTags.create({
          articleID: article.articleID,
          tagID: createdTags[randomTagIndex].tagID,
        });
      }

      // 为部分文章创建历史版本
      if (i % 3 === 0) {
        // 为三分之一的文章创建历史版本
        const versionCount = Math.floor(Math.random() * 2) + 1; // 1-2个历史版本
        for (let v = 1; v <= versionCount; v++) {
          await articleVersions.create({
            versionNumber: v,
            title: `${article.title} - 历史版本 ${v}`,
            summary: `${article.summary} - 历史版本`,
            richTextContent: `${article.richTextContent} - 历史版本内容 ${v}`,
            videoURL: article.videoURL,
            savedAt: new Date(Date.now() - v * 7 * 24 * 60 * 60 * 1000), // v*7天前
            articleID: article.articleID,
            authorStaffID: randomAuthor.staffID,
          });
        }
      }

      // 为更多文章添加反馈（增加反馈数量）
      const feedbackCount = Math.floor(Math.random() * 3); // 0-2条反馈
      for (let f = 0; f < feedbackCount; f++) {
        const randomUser = getRandomElement(testUsers);
        await articleFeedbacks.create({
          userType: "User",
          rating: Math.floor(Math.random() * 5) + 1,
          comment: `这是用户${randomUser.username}对文章 ${i} 的反馈评论 ${
            f + 1
          }。${
            Math.random() > 0.5 ? "内容质量不错。" : "希望能有更多详细内容。"
          }`,
          isAnonymous: Math.random() > 0.7, // 30%概率匿名
          articleID: article.articleID,
          userID: randomUser.userID,
        });
      }
    }
    console.log(`已创建 ${knowledgeArticlesList.length} 篇知识文章`);

    // --- 学习心得 ---
    const experienceStatuses = [
      "Draft",
      "Approved",
      "Published",
      "PendingReview",
      "Rejected",
    ];
    const experiencesList = [];

    // 创建15条学习心得（增加数量）
    for (let i = 1; i <= 15; i++) {
      const randomUser = getRandomElement(testUsers);
      const randomStatus = getRandomElement(experienceStatuses);
      // 随机关联一篇文章
      const relatedArticle =
        Math.random() > 0.3 ? getRandomElement(knowledgeArticlesList) : null;

      const experience = await learningExperiences.create({
        title: `学习心得 ${i}`,
        richTextContent: `<h2>我的学习心得 ${i}</h2><p>这是我的学习心得详细内容。包含对${
          relatedArticle ? relatedArticle.title : "某医学知识"
        }的学习总结与个人体会。</p>`,
        status: randomStatus,
        allowComments: Math.random() > 0.1, // 90%允许评论
        upvoteCount: Math.floor(Math.random() * 50),
        userID: randomUser.userID,
        relatedArticleID: relatedArticle ? relatedArticle.articleID : null,
      });

      experiencesList.push(experience);

      // 为部分心得添加审核记录，注意 reviewResult 只能是 "Approved", "Rejected", "NeedsRevision"
      if (randomStatus !== "Draft") {
        const randomStaff = getRandomElement(staffList);

        // 映射 experienceStatus 到有效的 reviewResult 值
        let reviewResult;
        if (randomStatus === "Approved" || randomStatus === "Published") {
          reviewResult = "Approved";
        } else if (randomStatus === "Rejected") {
          reviewResult = "Rejected";
        } else {
          // PendingReview 或其他状态
          reviewResult = Math.random() > 0.5 ? "NeedsRevision" : "Approved";
        }

        await experienceReviews.create({
          reviewResult: reviewResult,
          comments:
            reviewResult === "Rejected"
              ? "内容不符合规范，需要修改"
              : reviewResult === "NeedsRevision"
              ? "内容大体良好，但需要小幅修改"
              : "内容符合规范，审核通过",
          reviewTime: getRandomDate(14), // 最近14天内的随机日期
          experienceID: experience.experienceID,
          reviewerStaffID: randomStaff.staffID,
        });
      }

      // 为部分心得添加更多评论（增加评论数量）
      const commentCount = Math.floor(Math.random() * 4); // 0-3条评论
      for (let c = 0; c < commentCount; c++) {
        const commenter = getRandomElement(
          testUsers.filter((u) => u.userID !== randomUser.userID)
        );

        // 创建主评论
        const mainComment = await experienceComments.create({
          userType: "User",
          commentText: `这是用户${commenter.username}对心得 ${i} 的评论 ${
            c + 1
          }。${
            Math.random() > 0.5
              ? "收获很多，感谢分享。"
              : "有几个问题想请教一下。"
          }`,
          status: "Visible",
          experienceID: experience.experienceID,
          userID: commenter.userID,
        });

        // 50%概率添加回复
        if (Math.random() > 0.5) {
          const replier =
            Math.random() > 0.3 ? randomUser : getRandomElement(testUsers);
          await experienceComments.create({
            userType: "User",
            commentText: `回复@${commenter.username}: 谢谢你的评论！`,
            status: "Visible",
            experienceID: experience.experienceID,
            userID: replier.userID,
            parentCommentID: mainComment.commentID,
          });
        }
      }
    }
    console.log(`已创建 ${experiencesList.length} 条学习心得`);

    // --- 用户收藏 ---
    // 创建10条收藏（增加数量）
    const bookmarkCount = 10;
    for (let i = 0; i < bookmarkCount; i++) {
      const randomUser = getRandomElement(testUsers);

      // 70%收藏文章，30%收藏心得
      if (Math.random() > 0.3) {
        const randomArticle = getRandomElement(knowledgeArticlesList);
        await userBookmarks.create({
          userType: "User",
          entityType: "KnowledgeArticle",
          entityID: randomArticle.articleID,
          userID: randomUser.userID,
        });
      } else {
        const randomExperience = getRandomElement(experiencesList);
        await userBookmarks.create({
          userType: "User",
          entityType: "LearningExperience",
          entityID: randomExperience.experienceID,
          userID: randomUser.userID,
        });
      }
    }
    console.log(`已创建 ${bookmarkCount} 条用户收藏`);

    // --- 通知 --- （新增通知数据）
    const notificationTypes = [
      "ARTICLE_PUBLISHED",
      "EXPERIENCE_APPROVED",
      "EXPERIENCE_REJECTED",
      "NEW_COMMENT",
      "COMMENT_REPLY",
      "SYSTEM_ANNOUNCEMENT",
    ];

    // 为用户创建通知
    let notificationCount = 0;
    for (const user of testUsers) {
      // 每个用户1-3条通知
      const userNotificationCount = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < userNotificationCount; i++) {
        const notificationType = getRandomElement(notificationTypes);
        let relatedEntityType = null;
        let relatedEntityID = null;
        let content = "";

        switch (notificationType) {
          case "ARTICLE_PUBLISHED":
            relatedEntityType = "KnowledgeArticle";
            relatedEntityID = getRandomElement(knowledgeArticlesList).articleID;
            content = "有一篇新的医学文章发布了，可能对您感兴趣。";
            break;
          case "EXPERIENCE_APPROVED":
          case "EXPERIENCE_REJECTED":
            relatedEntityType = "LearningExperience";
            relatedEntityID = getRandomElement(experiencesList).experienceID;
            content =
              notificationType === "EXPERIENCE_APPROVED"
                ? "您的学习心得已经通过审核！"
                : "您的学习心得未通过审核，请查看原因。";
            break;
          case "NEW_COMMENT":
          case "COMMENT_REPLY":
            relatedEntityType = "LearningExperience";
            relatedEntityID = getRandomElement(experiencesList).experienceID;
            content =
              notificationType === "NEW_COMMENT"
                ? "您的心得收到了新的评论。"
                : "有人回复了您的评论。";
            break;
          case "SYSTEM_ANNOUNCEMENT":
            content = "系统公告：平台将于下周进行维护，请提前保存您的内容。";
            break;
        }

        await notifications.create({
          recipientUserID: user.userID,
          recipientUserType: "User",
          type: notificationType,
          content: content,
          relatedEntityType: relatedEntityType,
          relatedEntityID: relatedEntityID,
          isRead: Math.random() > 0.7, // 30%已读
          createdAt: getRandomDate(10), // 最近10天内
        });

        notificationCount++;
      }
    }

    // 为员工创建通知
    for (const member of staffList) {
      // 每个员工1-2条通知
      const staffNotificationCount = Math.floor(Math.random() * 2) + 1;

      for (let i = 0; i < staffNotificationCount; i++) {
        const notificationType = getRandomElement([
          "PENDING_REVIEW",
          "SYSTEM_ANNOUNCEMENT",
          "NEW_ARTICLE_FEEDBACK",
        ]);
        let relatedEntityType = null;
        let relatedEntityID = null;
        let content = "";

        switch (notificationType) {
          case "PENDING_REVIEW":
            relatedEntityType = "LearningExperience";
            relatedEntityID = getRandomElement(experiencesList).experienceID;
            content = "有新的学习心得等待您审核。";
            break;
          case "SYSTEM_ANNOUNCEMENT":
            content = "管理员通知：请更新您的个人信息。";
            break;
          case "NEW_ARTICLE_FEEDBACK":
            relatedEntityType = "KnowledgeArticle";
            relatedEntityID = getRandomElement(knowledgeArticlesList).articleID;
            content = "您的文章收到了新的反馈。";
            break;
        }

        await notifications.create({
          recipientUserID: member.staffID,
          recipientUserType: "Staff",
          type: notificationType,
          content: content,
          relatedEntityType: relatedEntityType,
          relatedEntityID: relatedEntityID,
          isRead: Math.random() > 0.5, // 50%已读
          createdAt: getRandomDate(7), // 最近7天内
        });

        notificationCount++;
      }
    }
    console.log(`已创建 ${notificationCount} 条通知`);

    // --- 系统配置 ---
    await systemConfigs.create({
      configKey: "auth_settings",
      configValue: JSON.stringify({
        allowRegistration: true,
        requireEmailVerification: true,
        tokenExpiryHours: 24,
      }),
      configGroup: "auth",
      description: "认证系统设置",
      updatedByStaffID: admin.staffID,
    });

    await systemConfigs.create({
      configKey: "site_settings",
      configValue: JSON.stringify({
        siteName: "医疗知识平台",
        contactEmail: "contact@example.com",
        maintenanceMode: false,
      }),
      configGroup: "general",
      description: "站点通用设置",
      updatedByStaffID: admin.staffID,
    });

    // 添加更多系统配置
    await systemConfigs.create({
      configKey: "content_settings",
      configValue: JSON.stringify({
        defaultArticlesPerPage: 10,
        featuredArticlesCount: 5,
        experienceReviewRequired: true,
        allowAnonymousFeedback: true,
      }),
      configGroup: "content",
      description: "内容管理设置",
      updatedByStaffID: admin.staffID,
    });

    await systemConfigs.create({
      configKey: "notification_settings",
      configValue: JSON.stringify({
        emailNotificationsEnabled: true,
        defaultEmailTemplates: {
          welcome: "欢迎加入医疗知识平台",
          passwordReset: "密码重置请求",
          contentApproval: "您的内容已获批准",
        },
      }),
      configGroup: "notifications",
      description: "通知系统设置",
      updatedByStaffID: staffList[1].staffID,
    });
    console.log(`已创建 4 条系统配置`);

    // --- 审计日志 ---
    const actionTypes = [
      "CREATE_ARTICLE",
      "UPDATE_ARTICLE_STATUS",
      "DELETE_COMMENT",
      "APPROVE_EXPERIENCE",
      "UPDATE_SYSTEM_CONFIG",
      "REJECT_EXPERIENCE",
      "CREATE_CATEGORY",
      "CREATE_TAG",
      "DELETE_TAG",
      "USER_LOGIN",
      "USER_LOGOUT",
      "PASSWORD_RESET",
    ];

    // 创建10条审计日志（增加数量）
    for (let i = 0; i < 10; i++) {
      const randomStaff = getRandomElement(staffList);
      const randomActionType = getRandomElement(actionTypes);
      let targetEntityType, targetEntityID, oldValue, newValue;

      switch (randomActionType) {
        case "CREATE_ARTICLE":
          targetEntityType = "KnowledgeArticle";
          targetEntityID = getRandomElement(knowledgeArticlesList).articleID;
          oldValue = null;
          newValue = JSON.stringify({ status: "Draft", title: "新文章标题" });
          break;
        case "UPDATE_ARTICLE_STATUS":
          targetEntityType = "KnowledgeArticle";
          targetEntityID = getRandomElement(knowledgeArticlesList).articleID;
          oldValue = JSON.stringify({ status: "Draft" });
          newValue = JSON.stringify({ status: "Published" });
          break;
        case "DELETE_COMMENT":
          targetEntityType = "ExperienceComment";
          targetEntityID = null; // 模拟已删除的评论
          oldValue = JSON.stringify({ status: "Visible" });
          newValue = JSON.stringify({ status: "DeletedByModerator" });
          break;
        case "APPROVE_EXPERIENCE":
        case "REJECT_EXPERIENCE":
          targetEntityType = "LearningExperience";
          targetEntityID = getRandomElement(experiencesList).experienceID;
          oldValue = JSON.stringify({ status: "PendingReview" });
          newValue = JSON.stringify({
            status:
              randomActionType === "APPROVE_EXPERIENCE"
                ? "Approved"
                : "Rejected",
          });
          break;
        case "UPDATE_SYSTEM_CONFIG":
          targetEntityType = "SystemConfig";
          targetEntityID = null;
          oldValue = JSON.stringify({ maintenanceMode: false });
          newValue = JSON.stringify({ maintenanceMode: true });
          break;
        case "CREATE_CATEGORY":
          targetEntityType = "MedicalCategory";
          targetEntityID = getRandomElement(medicalCategoriesList).categoryID;
          oldValue = null;
          newValue = JSON.stringify({ name: "新分类", isActive: true });
          break;
        case "CREATE_TAG":
        case "DELETE_TAG":
          targetEntityType = "Tag";
          targetEntityID = getRandomElement(createdTags).tagID;
          oldValue =
            randomActionType === "DELETE_TAG"
              ? JSON.stringify({ tagName: "已删除标签" })
              : null;
          newValue =
            randomActionType === "CREATE_TAG"
              ? JSON.stringify({ tagName: "新标签" })
              : null;
          break;
        case "USER_LOGIN":
        case "USER_LOGOUT":
          targetEntityType = Math.random() > 0.5 ? "User" : "Staff";
          targetEntityID =
            targetEntityType === "User"
              ? getRandomElement(testUsers).userID
              : getRandomElement(staffList).staffID;
          oldValue = null;
          newValue = JSON.stringify({
            timestamp: new Date().toISOString(),
            action: randomActionType === "USER_LOGIN" ? "登录" : "登出",
          });
          break;
        case "PASSWORD_RESET":
          targetEntityType = Math.random() > 0.5 ? "User" : "Staff";
          targetEntityID =
            targetEntityType === "User"
              ? getRandomElement(testUsers).userID
              : getRandomElement(staffList).staffID;
          oldValue = JSON.stringify({ passwordHash: "旧密码哈希" });
          newValue = JSON.stringify({ passwordReset: true });
          break;
      }

      await auditLogs.create({
        actionType: randomActionType,
        targetEntityType: targetEntityType,
        targetEntityID: targetEntityID,
        oldValue: oldValue,
        newValue: newValue,
        timestamp: getRandomDate(30), // 最近30天内的随机时间
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(
          Math.random() * 255
        )}`,
        adminStaffID: randomStaff.staffID,
      });
    }
    console.log(`已创建 10 条审计日志`);

    console.log("种子数据生成完成！");
    return true;
  } catch (error) {
    console.error("生成种子数据时出错:", error);
    return false;
  }
};

module.exports = seedData;
