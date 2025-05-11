# Express Server for Medical Learning Platform

This repository contains the Express.js server for a medical learning platform.

## Setting up the Admin User

There are multiple ways to create an admin user:

### Method 1: Using the Sync Database Script

This method will recreate all tables and add the admin user:

```bash
node syncDatabase.js
```

This will create an admin user with:
- Username: admin
- Email: admin@example.com
- Password: Admin@123

### Method 2: Using the Create Admin Script

If you already have the database tables set up and just want to add the admin user:

```bash
node createAdmin.js
```

### Method 3: Using Direct SQL (if needed)

You can also use the SQL script to directly insert the admin user:

```sql
-- From createAdminSQL.sql
INSERT INTO Staff (
  staffID, 
  username, 
  passwordHash, 
  email, 
  isAdmin, 
  isActive, 
  emailVerified, 
  preferredLanguage, 
  tokenVersion, 
  createdAt, 
  updatedAt
) VALUES (
  UUID(),
  'admin', 
  '$2a$10$XvnQaQ8UqEiVH1J1H6nuFewRNRhvDwODSRcwP21J9QvzC0Q4g.J4a', -- password is 'Admin@123'
  'admin@example.com', 
  1, -- isAdmin = true
  1, -- isActive = true
  1, -- emailVerified = true
  'zh-CN', 
  0, -- tokenVersion
  NOW(), -- createdAt
  NOW()  -- updatedAt
);
```

## Running the Tests

Before running tests, make sure that test/helpers.js has the correct admin credentials:

```javascript
const adminCredentials = {
  usernameOrEmail: "admin", 
  password: "Admin@123", 
};
```

# 医疗知识学习平台 API

医疗知识学习平台后端API服务，为医学生和医疗专业人员提供知识文章、学习心得分享等功能。

## 主要功能

- 用户账号管理：注册、登录、个人资料管理
- 医疗知识文章：浏览、搜索、标签分类、评论
- 学习心得分享：记录、分享学习经验和收获
- 管理员后台：内容审核、用户管理、系统配置

## 技术栈

- Node.js
- Express.js
- MySQL
- Sequelize ORM
- JSON Web Token (JWT)
- Swagger API文档

## 环境配置

创建`.env`文件，参考`.env.example`配置环境变量：

```
# 服务器配置
PORT=8080
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=password
DB_NAME=medical_platform

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h

# 邮件服务配置
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=user@example.com
MAIL_PASS=mail_password
MAIL_FROM=no-reply@example.com
```

## 快速开始

1. 安装依赖：

```bash
npm install
```

2. 启动开发服务器：

```bash
npm run dev
```

3. 启动生产服务器：

```bash
npm start
```

## API文档

启用Swagger API文档，访问 `/api-docs` 路径查看API详情。

```bash
# 通过环境变量启用Swagger
ENABLE_SWAGGER=true npm run dev
```

## 项目结构

```
├── config/            # 配置文件
├── controllers/       # 控制器
├── models/            # 数据模型
├── routes/            # 路由定义
├── middleware/        # 中间件
├── utils/             # 工具函数
├── logs/              # 日志文件
├── test/              # 测试代码
├── server.js          # 主服务器文件
└── server.dev.js      # 开发环境服务器文件
```

## 最近改进内容

### 2023-05-XX (最新)

1. **添加API分页功能**：标签API现在支持分页查询，减少大量数据返回时的性能问题。
2. **增强错误处理**：新增集中式错误处理中间件，处理各种错误类型并提供一致的响应格式。
3. **添加API速率限制**：实现基于IP的API速率限制，包括：
   - 全局API限制：每15分钟100次请求
   - 登录限制：每小时10次登录尝试
   - 注册限制：每24小时5次注册请求
   - 密码重置限制：每小时3次密码重置请求
   - 标签创建限制：每15分钟20次标签创建请求
4. **改进异步处理**：使用asyncHandler包装异步路由处理器，优雅处理Promise错误。

### 2023-05-XX (之前)

1. **修复标签模块错误**：
   - 修复 "Unknown column 'tag.name'" 错误，将name改为tagName
   - 修复 "tag is not associated to articleTag" 错误，添加显式关联
   - 解决 "Unknown column 'Tag.tagID' in 'group statement'" 问题
   - 修复MySQL ONLY_FULL_GROUP_BY模式兼容性问题
2. **更新Swagger文档**：确保标签相关schema使用tagName而非name
3. **增强测试数据**：丰富seedData.js的测试数据，包括：
   - 添加更多用户、标签、医疗分类、文章和心得
   - 增加邮箱验证和密码重置记录
   - 添加通知数据和系统配置
   - 丰富审计日志记录

## 许可证

[MIT] 