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
} = db;

// 生成加密密码的函数
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// 主要的种子数据函数
const seedData = async () => {
  try {
    console.log("开始生成种子数据...");

    // 创建管理员和普通职员
    const adminPasswordHash = await hashPassword("admin123");
    const staffPasswordHash = await hashPassword("staff123");

    const admin = await staff.create({
      username: "admin",
      passwordHash: adminPasswordHash,
      email: "admin@example.com",
      isAdmin: true,
      emailVerified: true,
    });

    const doctor1 = await staff.create({
      username: "doctor1",
      passwordHash: staffPasswordHash,
      email: "doctor1@example.com",
      isAdmin: false,
      emailVerified: true,
    });

    const doctor2 = await staff.create({
      username: "doctor2",
      passwordHash: staffPasswordHash,
      email: "doctor2@example.com",
      isAdmin: false,
      emailVerified: true,
    });

    console.log("已创建管理员和职员账号");

    // 创建普通用户
    const userPasswordHash = await hashPassword("user123");
    
    const testUsers = [];
    for (let i = 1; i <= 5; i++) {
      testUsers.push(await users.create({
        username: `user${i}`,
        passwordHash: userPasswordHash,
        email: `user${i}@example.com`,
        emailVerified: true,
      }));
    }
    
    console.log("已创建测试用户");

    // 创建医疗分类
    const internalMedicine = await medicalCategories.create({
      name: "内科",
      description: "内科医学是研究人体内脏器官疾病的诊断与非手术治疗的医学专科",
      createdByStaffID: admin.staffID,
    });

    const surgery = await medicalCategories.create({
      name: "外科",
      description: "外科医学是研究外伤、肿瘤和先天性等疾病的手术治疗方法的医学专科",
      createdByStaffID: admin.staffID,
    });

    const pediatrics = await medicalCategories.create({
      name: "儿科",
      description: "儿科医学是研究小儿时期身心发育、疾病防治及保健的医学专科",
      createdByStaffID: admin.staffID,
    });

    const gynecology = await medicalCategories.create({
      name: "妇产科",
      description: "妇产科医学是研究女性生殖器官疾病与妊娠分娩的医学专科",
      createdByStaffID: admin.staffID,
    });

    const cardiology = await medicalCategories.create({
      name: "心脏科",
      description: "心脏科是内科的一个分支，专门研究心脏及血管疾病",
      createdByStaffID: doctor1.staffID,
      parentCategoryID: internalMedicine.categoryID,
    });

    console.log("已创建医疗分类");

    // 创建标签
    const tagData = ["常见病", "慢性病", "急症", "预防", "治疗", "康复", "儿童", "老年人", "孕妇", "心脏"];
    const createdTags = [];
    
    for (const tagName of tagData) {
      createdTags.push(await tags.create({ tagName }));
    }
    
    console.log("已创建标签");

    // 创建知识文章
    const article1 = await knowledgeArticles.create({
      title: "高血压的日常管理",
      summary: "本文介绍了高血压患者的日常生活管理方法，包括饮食、运动和药物治疗",
      richTextContent: "<h2>高血压的日常管理</h2><p>高血压是一种常见的慢性疾病，需要长期管理。</p><p>1. 饮食管理：减少盐分摄入，多吃蔬果</p><p>2. 规律运动：每天30分钟适度有氧运动</p><p>3. 药物治疗：按医嘱规律服药</p><p>4. 定期监测：定期测量血压并记录</p>",
      status: "Published",
      publishedAt: new Date(),
      categoryID: internalMedicine.categoryID,
      authorStaffID: doctor1.staffID,
    });

    await articleTags.bulkCreate([
      { articleID: article1.articleID, tagID: createdTags[0].tagID }, // 常见病
      { articleID: article1.articleID, tagID: createdTags[1].tagID }, // 慢性病
      { articleID: article1.articleID, tagID: createdTags[9].tagID }, // 心脏
    ]);

    const article2 = await knowledgeArticles.create({
      title: "儿童感冒护理指南",
      summary: "本文提供了儿童感冒期间的家庭护理方法和就医建议",
      richTextContent: "<h2>儿童感冒护理指南</h2><p>儿童感冒是最常见的疾病之一，大多数情况下可以在家进行护理。</p><p>1. 充分休息：保证充足的睡眠</p><p>2. 补充水分：防止脱水</p><p>3. 控制发热：当体温超过38.5°C时，可以使用退热药</p><p>4. 何时就医：出现高烧不退、呼吸困难等症状时应立即就医</p>",
      status: "Published",
      publishedAt: new Date(),
      categoryID: pediatrics.categoryID,
      authorStaffID: doctor2.staffID,
    });

    await articleTags.bulkCreate([
      { articleID: article2.articleID, tagID: createdTags[0].tagID }, // 常见病
      { articleID: article2.articleID, tagID: createdTags[6].tagID }, // 儿童
      { articleID: article2.articleID, tagID: createdTags[3].tagID }, // 预防
    ]);

    const article3 = await knowledgeArticles.create({
      title: "心肌梗塞急救措施",
      summary: "本文介绍了心肌梗塞的紧急救治措施及预防方法",
      richTextContent: "<h2>心肌梗塞急救措施</h2><p>心肌梗塞是一种危及生命的紧急情况，需要立即采取措施。</p><p>1. 紧急求助：立即拨打急救电话</p><p>2. 保持静卧：让患者平躺，头稍微抬高</p><p>3. 服用药物：如有医嘱，可服用阿司匹林</p><p>4. 心肺复苏：如果患者失去意识且无呼吸，开始心肺复苏</p>",
      status: "Published",
      publishedAt: new Date(),
      categoryID: cardiology.categoryID,
      authorStaffID: doctor1.staffID,
    });

    await articleTags.bulkCreate([
      { articleID: article3.articleID, tagID: createdTags[2].tagID }, // 急症
      { articleID: article3.articleID, tagID: createdTags[4].tagID }, // 治疗
      { articleID: article3.articleID, tagID: createdTags[9].tagID }, // 心脏
    ]);

    console.log("已创建知识文章");

    // 创建学习心得
    const experience1 = await learningExperiences.create({
      title: "我的高血压管理经验",
      richTextContent: "<h3>我的高血压管理经验</h3><p>作为一名高血压患者，我在过去一年里严格按照医生的建议进行饮食和运动管理。</p><p>通过减少盐分摄入，增加蔬果比例，以及每天步行30分钟，我的血压从160/100降到了正常范围。</p><p>希望我的经验能帮助到其他患者。</p>",
      userID: testUsers[0].userID,
      status: "Published",
    });

    const experience2 = await learningExperiences.create({
      title: "儿童感冒家庭护理的体会",
      richTextContent: "<h3>儿童感冒家庭护理的体会</h3><p>上个月我的孩子感冒了，我严格按照《儿童感冒护理指南》中的方法进行护理。</p><p>保证充分休息和补充水分确实很重要，孩子在三天后明显好转。</p><p>感谢医生提供的专业建议！</p>",
      userID: testUsers[1].userID,
      status: "Published",
    });

    console.log("已创建学习心得");

    // 创建心得评论
    await experienceComments.create({
      commentText: "感谢分享！我也是高血压患者，想请问您是如何坚持每日运动的？",
      userID: testUsers[2].userID,
      userType: "User",
      experienceID: experience1.experienceID,
    });

    await experienceComments.create({
      commentText: "作为医生，我建议高血压患者除了生活方式干预，也要按时服药，定期监测血压。",
      userID: doctor1.staffID,
      userType: "Staff",
      experienceID: experience1.experienceID,
    });

    console.log("已创建评论");

    console.log("种子数据生成完成！");
  } catch (error) {
    console.error("种子数据生成失败:", error);
  }
};

module.exports = seedData; 