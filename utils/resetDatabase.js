const db = require("../models");
const seedData = require("./seedData");

const resetDatabase = async () => {
  try {
    console.log("开始重置数据库...");
    
    // 同步数据库模型 (使用 force: true 会先删除所有表再创建)
    await db.sequelize.sync({ force: true });
    console.log("数据库表已重新创建");
    
    // 添加种子数据
    await seedData();
    
    console.log("数据库重置完成！");
    process.exit(0);
  } catch (error) {
    console.error("数据库重置失败:", error);
    process.exit(1);
  }
};

// 执行重置
resetDatabase(); 