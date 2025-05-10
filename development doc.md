**开发设计文档：医疗知识学习平台**

**1. 引言**

- **1.1 目的：** 本文档旨在概述医疗知识学习平台的开发设计。该平台旨在提供一个用于管理医疗知识、促进学习并使用户能够分享其见解的集中式系统。
- **1.2 范围：** 系统将支持具有不同角色的用户管理（用户、工作人员、管理员）、知识管理（分类、标记、发布各种内容类型）、心得分享（用户提交）以及用户生成内容的审核流程。
- **1.3 定义：**
  - **用户 (User)：** 消费知识和分享学习心得的最终用户。
  - **工作人员 (Staff)：** 负责内容管理（知识文章）、分类管理以及审核用户提交心得的用户。
  - **管理员 (Administrator)：** 拥有最高权限的工作人员，职责包括管理所有用户账户、所有内容、系统分类以及监督整个平台。
  - **医疗知识 (Knowledge Article)：** 由工作人员或管理员发布的精选医疗信息，可能包括文本、图片和视频。
  - **学习心得 (Learning Experience)：** 由用户分享的用户生成内容，需经过审核。

**2. 用户角色与权限**

系统定义了三种主要用户角色，具有特定的权限：

- **2.1 用户 (User)：**

  - 账户管理：注册、登录、登出、修改个人资料（密码、邮箱、头像）、删除本人账户。
  - 知识管理：查询和浏览知识文章。
  - 心得管理：添加、修改（重新提交审核）、删除本人的学习心得。

- **2.2 工作人员 (Staff)：**

  - 账户管理：登录、登出、修改个人资料。可由管理员授予修改其他（非管理员）用户账户（例如，状态）的权限。
  - 知识管理：
    - 分类管理：添加、修改、删除知识分类（根据表 1，尽管表 4 将此明确分配给管理员。假设如果被委派或管理员主要执行，工作人员也可以操作）。_澄清：根据表 1 和表 3，"类别"管理未列出给工作人员。这仍然是管理员的功能。_
    - 文章管理：添加、修改、删除、查询知识文章（文本、图片）。
    - 标签管理：创建、更新标签，获取标签统计信息。
  - 心得管理：
    - 审核：审核用户提交的学习心得（批准、拒绝、提供反馈）。
    - 删除：删除不当或有问题的学习心得。

- **2.3 管理员 (Administrator)：** 拥有所有工作人员权限，外加：
  - 账户管理：创建新账户（工作人员、管理员，如果需要管理员直接创建，也可能包括用户账户）、修改任何用户账户（详细信息、权限、状态）、删除任何用户账户、查询所有账户。
  - 知识管理：
    - 分类管理：添加、修改、删除知识分类。
    - 文章管理：对知识文章（包括含视频内容的文章）进行完整的增删改查操作。
    - 标签管理：删除标签，合并标签。
  - 心得管理：对所有学习心得进行完整的增删改查，包括直接添加心得和全面的审核能力。
  - 系统管理：监督系统备份和恢复过程（操作层面）。

**3. 数据库设计**

以下数据表将用于存储平台数据。标准做法是使用 UUID 或自增整数作为主键 (PK)。时间戳用于跟踪创建和更新。

- **3.1 `Users` (用户表)**

  - `UserID` (PK, UUID/INT 自增) - 用户编号
  - `Username` (VARCHAR(50), UNIQUE, NOT NULL) - 用户名
  - `PasswordHash` (VARCHAR(255), NOT NULL) - 密码 (哈希存储)
  - `Email` (VARCHAR(100), UNIQUE, NOT NULL) - 邮箱
  - `AvatarURL` (VARCHAR(255), NULLABLE) - 头像链接
  - `IsActive` (BOOLEAN, NOT NULL, DEFAULT TRUE) - 账户是否激活/未注销
  - `CreatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP) - 创建时间
  - `UpdatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) - 更新时间
  - `EmailVerified` (BOOLEAN, NOT NULL, DEFAULT FALSE) - 邮箱是否已验证
  - `LastLoginAt` (TIMESTAMP, NULLABLE) - 最后登录时间
  - `PreferredLanguage` (VARCHAR(10), NULLABLE, DEFAULT 'zh-CN') - 偏好语言 (为未来国际化预留)
  - `NotificationPreferences` (JSON, NULLABLE) - 通知偏好设置 (例如，是否接收邮件通知等)

- **3.2 `Staff` (工作人员表)**

  - `StaffID` (PK, UUID/INT 自增) - 工作人员编号
  - `Username` (VARCHAR(50), UNIQUE, NOT NULL) - 用户名
  - `PasswordHash` (VARCHAR(255), NOT NULL) - 密码 (哈希存储)
  - `Email` (VARCHAR(100), UNIQUE, NOT NULL) - 邮箱
  - `AvatarURL` (VARCHAR(255), NULLABLE) - 头像链接
  - `IsAdmin` (BOOLEAN, NOT NULL, DEFAULT FALSE) - 是否为管理员
  - `IsActive` (BOOLEAN, NOT NULL, DEFAULT TRUE) - 账户是否激活/未注销
  - `CreatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP) - 创建时间
  - `UpdatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) - 更新时间

- **3.3 `MedicalCategories` (医疗类别表)**

  - `CategoryID` (PK, UUID/INT 自增) - 类别编号
  - `Name` (VARCHAR(100), NOT NULL, UNIQUE) - 类别名称
  - `Description` (TEXT, NULLABLE) - 描述
  - `CreatedByStaffID` (FK 关联 `Staff.StaffID`, NOT NULL) - 创建者 (工作人员编号)
  - `CreatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP) - 创建时间
  - `UpdatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) - 更新时间

- **3.4 `Tags` (标签表)**

  - `TagID` (PK, UUID/INT 自增) - 标签编号
  - `Name` (VARCHAR(50), NOT NULL, UNIQUE) - 标签名称
  - `CreatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP) - 创建时间

- **3.5 `KnowledgeArticles` (医疗知识表)**

  - `ArticleID` (PK, UUID/INT 自增) - 知识编号
  - `CategoryID` (FK 关联 `MedicalCategories.CategoryID`, NOT NULL) - 类别编号
  - `AuthorStaffID` (FK 关联 `Staff.StaffID`, NOT NULL) - 作者/发布者 (工作人员编号)
  - `Title` (VARCHAR(255), NOT NULL) - 标题
  - `Summary` (TEXT, NULLABLE) - 简介
  - `CoverImageURL` (VARCHAR(255), NULLABLE) - 封面图片链接
  - `RichTextContent` (TEXT, NULLABLE) - 富文本内容 (可嵌入图片)
  - `VideoURL` (VARCHAR(255), NULLABLE) - 视频链接
  - `Status` (ENUM('Draft', 'PendingReview', 'Published', 'Archived', 'Rejected'), NOT NULL, DEFAULT 'Draft') - 状态 (草稿, 待审核, 已发布, 已归档, 已拒绝)
  - `CreatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP) - 创建时间
  - `UpdatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) - 更新时间
  - `PublishedAt` (TIMESTAMP, NULLABLE) - 发布时间
  - `Version` (INT, NOT NULL, DEFAULT 1) - 文章版本号
  - `ParentArticleID` (FK referencing `KnowledgeArticles.ArticleID`, NULLABLE) - 指向旧版本文章 (用于版本追溯)
  - `AverageRating` (DECIMAL(3,2), NULLABLE, DEFAULT 0.00) - 平均评分
  - `ViewCount` (INT, NOT NULL, DEFAULT 0) - 浏览次数

- **3.6 `ArticleTags` (知识文章标签关联表)**

  - `ArticleID` (FK 关联 `KnowledgeArticles.ArticleID`, PK) - 知识编号
  - `TagID` (FK 关联 `Tags.TagID`, PK) - 标签编号
  - _(复合主键: (ArticleID, TagID))_

- **3.7 `LearningExperiences` (学习心得表)**

  - `ExperienceID` (PK, UUID/INT 自增) - 心得编号
  - `UserID` (FK 关联 `Users.UserID`, NOT NULL) - 用户编号
  - `Title` (VARCHAR(255), NOT NULL) - 标题
  - `RichTextContent` (TEXT, NOT NULL) - 富文本内容 (可嵌入图片)
  - `Status` (ENUM('Draft', 'PendingReview', 'Approved', 'Rejected'), NOT NULL, DEFAULT 'Draft') - 状态 (草稿, 待审核, 已批准, 已拒绝)
  - `CreatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP) - 创建时间
  - `UpdatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) - 更新时间
  - `AllowComments` (BOOLEAN, NOT NULL, DEFAULT TRUE) - 是否允许评论
  - `UpvoteCount` (INT, NOT NULL, DEFAULT 0) - 点赞数

- **3.8 `ExperienceReviews` (心得审核记录表)**

  - `ReviewID` (PK, UUID/INT 自增) - 记录编号
  - `ExperienceID` (FK 关联 `LearningExperiences.ExperienceID`, NOT NULL) - 心得编号
  - `ReviewerStaffID` (FK 关联 `Staff.StaffID`, NOT NULL) - 审核的工作人员编号
  - `ReviewResult` (ENUM('Approved', 'Rejected', 'NeedsRevision'), NOT NULL) - 审核结果 (已批准, 已拒绝, 需要修改)
  - `Comments` (TEXT, NULLABLE) - 审核意见
  - `ReviewTime` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP) - 审核时间

- **3.9 `ArticleVersions` (知识文章历史版本表)**

  - `VersionID` (PK, UUID/INT 自增)
  - `ArticleID` (FK referencing `KnowledgeArticles.ArticleID`)
  - `VersionNumber` (INT)
  - `Title`, `Summary`, `RichTextContent`, `VideoURL` (与主表类似，保存该版本的内容)
  - `AuthorStaffID` (FK referencing `Staff.StaffID`)
  - `SavedAt` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

- **3.10 `ArticleFeedbacks` (知识文章反馈/评论表)**

  - `FeedbackID` (PK, UUID/INT 自增)
  - `ArticleID` (FK referencing `KnowledgeArticles.ArticleID`)
  - `UserID` (可以是 UserID 或 StaffID，需要指明 UserType) - 提交反馈的用户
  - `UserType` (ENUM('User', 'Staff'))
  - `Rating` (INT, NULLABLE, MIN 1, MAX 5) - 评分 (1-5 星)
  - `Comment` (TEXT, NULLABLE) - 评论内容
  - `CreatedAt` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
  - `IsAnonymous` (BOOLEAN, DEFAULT FALSE) - 是否匿名反馈

- **3.11 `ExperienceComments` (学习心得评论表)**

  - `CommentID` (PK, UUID/INT 自增)
  - `ExperienceID` (FK referencing `LearningExperiences.ExperienceID`)
  - `UserID` (可以是 UserID 或 StaffID，需要指明 UserType)
  - `UserType` (ENUM('User', 'Staff'))
  - `ParentCommentID` (FK referencing `ExperienceComments.CommentID`, NULLABLE) - 用于回复评论
  - `CommentText` (TEXT, NOT NULL)
  - `CreatedAt` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
  - `Status` (ENUM('Visible', 'HiddenByModerator', 'DeletedByUser'), DEFAULT 'Visible')

- **3.12 `UserBookmarks` (用户收藏表)**

  - `BookmarkID` (PK, UUID/INT 自增)
  - `UserID` (可以是 UserID 或 StaffID)
  - `UserType` (ENUM('User', 'Staff'))
  - `EntityType` (ENUM('KnowledgeArticle', 'LearningExperience')) - 收藏的实体类型
  - `EntityID` (UUID/INT) - 对应实体的 ID
  - `CreatedAt` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

- **3.13 `Notifications` (通知表)**

  - `NotificationID` (PK, UUID/INT 自增)
  - `RecipientUserID` (可以是 UserID 或 StaffID)
  - `RecipientUserType` (ENUM('User', 'Staff'))
  - `Type` (VARCHAR(50)) - 通知类型 (例如: 'NEW_EXPERIENCE_COMMENT', 'EXPERIENCE_REVIEWED', 'ARTICLE_UPDATED')
  - `Content` (TEXT) - 通知内容
  - `RelatedEntityID` (UUID/INT, NULLABLE) - 关联实体的 ID (例如，评论 ID 或文章 ID)
  - `RelatedEntityType` (VARCHAR(50), NULLABLE)
  - `IsRead` (BOOLEAN, DEFAULT FALSE) - 是否已读
  - `CreatedAt` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

- **3.14 `PasswordResets` (密码重置请求表)**

  - `ResetID` (PK, UUID/INT 自增)
  - `UserID` (可以是 UserID 或 StaffID)
  - `UserType` (ENUM('User', 'Staff'))
  - `Token` (VARCHAR(255), UNIQUE, NOT NULL) - 重置令牌
  - `ExpiresAt` (TIMESTAMP, NOT NULL) - 令牌过期时间
  - `CreatedAt` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

- **3.15 `AuditLogs` (系统审计日志表 - 管理员操作)**

  - `LogID` (PK, UUID/INT 自增)
  - `AdminStaffID` (FK referencing `Staff.StaffID`) - 操作管理员
  - `ActionType` (VARCHAR(100)) - 操作类型 (例如: 'DELETE_USER', 'UPDATE_ARTICLE_STATUS')
  - `TargetEntityType` (VARCHAR(50), NULLABLE) - 操作目标实体类型
  - `TargetEntityID` (UUID/INT, NULLABLE) - 操作目标实体 ID
  - `OldValue` (JSON, NULLABLE) - 操作前数据 (部分关键操作)
  - `NewValue` (JSON, NULLABLE) - 操作后数据 (部分关键操作)
  - `Timestamp` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
  - `IPAddress` (VARCHAR(45), NULLABLE) - 操作者 IP

- **3.16 `SystemConfigs` (系统配置表)**

  - `ConfigID` (PK, UUID/INT 自增) - 配置编号
  - `ConfigKey` (VARCHAR(100), UNIQUE, NOT NULL) - 配置键名
  - `ConfigValue` (TEXT, NULLABLE) - 配置值 (JSON 格式)
  - `ConfigGroup` (VARCHAR(50), NOT NULL) - 配置分组 (general, users, content 等)
  - `Description` (VARCHAR(255), NULLABLE) - 配置描述
  - `UpdatedByStaffID` (FK 关联 `Staff.StaffID`, NULLABLE) - 最后更新者编号
  - `CreatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP) - 创建时间
  - `UpdatedAt` (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) - 更新时间

**4. 关键功能模块**

- **4.1 账户管理**

  - **用户注册：** 用户自行注册。管理员可以创建工作人员/管理员账户。
  - **登录/登出：** 所有角色的安全身份验证。
  - **个人资料管理：** 用户可以更新其个人资料（密码、邮箱、头像）。管理员可以管理所有用户个人资料。
  - **账户删除/停用：** 用户可以删除其账户。管理员可以删除/停用任何账户。
  - **用户查询与列表：** 管理员可以查询和列出用户账户。
  - **邮箱验证：** 用户注册后发送验证邮件，点击链接激活。
  - **密码重置：** "忘记密码"功能，通过邮箱发送重置链接。
  - **账户活动日志 (管理员)：** 管理员可查看用户登录历史、关键操作记录（通过 `AuditLogs` 实现部分）。
  - **个性化通知设置：** 用户可选择接收哪些类型的通知，以及通知方式（站内、邮件）。

- **4.2 知识管理**

  - **分类管理 (管理员)：** 管理员创建、更新和删除医疗知识分类。
  - **标签管理 (管理员/工作人员)：**
    - 工作人员可创建标签、更新标签名称、获取标签统计。
    - 管理员可删除标签、合并标签。
  - **知识文章创建/编辑 (工作人员/管理员)：**
    - 支持富文本、图片嵌入和视频链接。
    - 文章具有状态（草稿、待审核、已发布、已归档）。
    - 工作人员修改已发布的文章可能需要重新批准或遵循内部审核工作流程（除非特别指明，否则不在 `ExperienceReviews` 中正式跟踪）。
  - **知识文章发布 (工作人员/管理员)：** 将状态更改为"已发布"。
  - **知识文章删除 (工作人员/管理员)：** 删除文章。
  - **知识文章查询/浏览 (所有角色)：** 用户可以通过关键词、分类、标签进行搜索。分页显示结果和排序。
  - **文章版本控制 (工作人员/管理员)：** 修改重要文章时可创建新版本，旧版本可追溯。
  - **高级搜索：** 支持全文搜索、按作者、日期范围、标签组合筛选。
  - **内容反馈与评分 (所有角色)：** 用户可对知识文章进行评分和评论。
  - **收藏功能 (所有角色)：** 用户可收藏感兴趣的知识文章和学习心得。
  - **相关内容推荐：** 根据当前浏览内容，推荐相关知识文章或心得。
  - **浏览统计：** 显示文章的浏览次数。

- **4.3 学习心得管理**

  - **心得创建/编辑 (用户)：** 用户使用富文本（可嵌入图片）创建并提交心得。编辑已提交的心得会将其状态改回"待审核"。
  - **心得删除 (用户, 工作人员/管理员)：** 用户可以删除自己的心得。工作人员/管理员可以删除任何心得。
  - **心得查询/浏览 (所有角色)：** 用户可以搜索和浏览已批准的心得。
  - **心得审核 (工作人员/管理员)：**
    - 工作人员/管理员审核"待审核"的心得。
    - 操作：批准、拒绝、请求修改（附带评论）。
    - 审核过的心得会更新其状态。`ExperienceReviews` 表记录此过程。
  - **心得评论与回复 (所有有权限用户)：** 用户可以对学习心得进行评论和回复，形成讨论。评论需审核或有举报机制。
  - **心得点赞 (所有有权限用户)：** 用户可以为喜欢的心得点赞。
  - **内容举报 (所有角色)：** 用户可以举报不恰当的心得或评论，由工作人员/管理员处理。

- **4.4 系统备份与恢复 (操作层面)**

  - 这是在基础设施/数据库层面管理的关键操作要求。必须定期备份数据库。必须制定系统故障时数据恢复的程序。应用程序本身通常不提供这些操作的界面。

- **4.5 通知系统 (所有角色)**

  - **站内通知：** 用户登录后可以看到未读通知。
  - **邮件通知 (可选)：** 根据用户偏好设置，将重要通知通过邮件发送。
  - **通知类型示例：**
    - 心得被审核（通过/拒绝/需修改）。
    - 发布的心得收到新评论/点赞。
    - 关注的知识类别有新文章发布。
    - 密码修改成功/重置请求。
  - **通知管理：**
    - 获取通知列表（支持分页和筛选）
    - 标记通知为已读/标记所有通知为已读
    - 获取通知详情（同时自动标记为已读）
    - 获取通知汇总（未读数量、最新未读通知）
    - 删除通知

- **4.6 后台管理与分析 (管理员/特定权限工作人员)**

  - **系统仪表盘：** 展示关键指标，如用户增长、内容发布量、活跃用户数等。
  - **内容管理增强：** 批量操作（如批量审核、删除），更细致的内容筛选。
  - **用户行为分析 (初步)：** 热门文章/心得排行，用户活跃度分析。
  - **审计日志查询：** 管理员可查询关键操作日志，追踪系统变更。
  - **系统配置：** 管理员可配置部分系统参数，如默认每页显示数量、敏感词过滤等 (需要额外设计配置表)。

**5. API 端点列表**

本节提供了所有RESTful API端点的列表，并标注当前实现状态。

### Admin - Dashboard

- `GET /api/admin/dashboard/stats` - 获取管理员仪表盘统计数据 ✅ Implemented

### Admin - AuditLogs

- `GET /api/admin/audit-logs` - 获取系统审计日志 (分页) ✅ Implemented

### Admin - UserManagement

- `GET /api/admin/users` - 获取用户列表 (包括普通用户和工作人员, 分页) ✅ Implemented
- `PUT /api/admin/users/{userType}/{userId}/status` - 更新用户或工作人员的账户状态 (激活/禁用) ✅ Implemented

### Admin - StaffManagement

- `POST /api/admin/staff` - 管理员创建新的工作人员账户 ✅ Implemented
- `GET /api/admin/staff/{staffId}` - 获取特定工作人员的详细信息 (管理员权限) ✅ Implemented
- `PUT /api/admin/staff/{staffId}` - 更新特定工作人员的信息 (管理员权限) ✅ Implemented
- `DELETE /api/admin/staff/{staffId}` - 删除特定工作人员的账户 (软删除，管理员权限) ✅ Implemented
- `PUT /api/admin/staff/{staffId}/reset-password` - 重置特定工作人员的密码 (管理员权限) ✅ Implemented

### Admin - TagManagement

- `DELETE /api/admin/tags/{tagId}` - 删除标签 (需要管理员权限) ✅ Implemented
- `POST /api/admin/tags/merge` - 合并两个标签 (需要管理员权限) ✅ Implemented

### Admin - SystemConfig

- `GET /api/admin/system-config` - 获取系统配置信息 ✅ Implemented
- `PUT /api/admin/system-config` - 更新系统配置信息 ✅ Implemented

### Client - Auth

- `POST /api/v1/auth/register/user` - 注册新用户账户 ✅ Implemented
- `POST /api/v1/auth/login` - 用户或工作人员登录 ✅ Implemented
- `GET /api/v1/auth/me` - 获取当前登录的用户或工作人员的详细信息 ✅ Implemented
- `POST /api/v1/auth/logout` - 用户或工作人员退出登录 ✅ Implemented
- `POST /api/v1/auth/forgot-password` - 请求发送重置密码邮件 ✅ Implemented
- `POST /api/v1/auth/reset-password` - 使用令牌重置密码 ✅ Implemented
- `POST /api/v1/auth/verify-email` - 使用令牌验证用户邮箱地址 ✅ Implemented

### Client - KnowledgeArticles

- `GET /api/v1/articles/` - 获取知识文章列表 (公开，默认获取已发布的) ✅ Implemented
- `POST /api/v1/articles/` - 创建新的知识文章 (工作人员) ✅ Implemented
- `GET /api/v1/articles/{articleId}` - 获取特定知识文章的详情 ✅ Implemented
- `PUT /api/v1/articles/{articleId}` - 更新知识文章 (工作人员) ✅ Implemented
- `DELETE /api/v1/articles/{articleId}` - 删除知识文章 (工作人员) ✅ Implemented
- `POST /api/v1/articles/{articleId}/bookmark` - 收藏/取消收藏知识文章 ✅ Implemented
- `POST /api/v1/articles/{articleId}/feedback` - 提交对知识文章的反馈 (评分/评论) ✅ Implemented
- `GET /api/v1/articles/{articleId}/feedback` - 获取指定知识文章的反馈列表 (分页) ✅ Implemented
- `GET /api/v1/articles/{articleId}/versions` - 获取知识文章的版本历史 (工作人员) ✅ Implemented
- `GET /api/v1/articles/{articleId}/versions/{versionId}` - 获取知识文章的特定版本详情 (工作人员) ✅ Implemented
- `PUT /api/v1/articles/{articleId}/status` - 更新文章状态 (工作人员) ✅ Implemented
- `POST /api/v1/articles/{articleId}/tags` - 为文章添加标签 (工作人员) ✅ Implemented
- `DELETE /api/v1/articles/{articleId}/tags/{tagId}` - 从文章移除标签 (工作人员) ✅ Implemented
- `POST /api/v1/articles/{articleId}/create-version` - 创建新的文章版本 (工作人员) ✅ Implemented

### Client - LearningExperiences

- `GET /api/v1/experiences/` - 获取学习心得列表 (公开，默认获取已批准的) ✅ Implemented
- `POST /api/v1/experiences/` - 用户创建新的学习心得 ✅ Implemented
- `GET /api/v1/experiences/{experienceId}` - 获取特定学习心得的详情 ✅ Implemented
- `PUT /api/v1/experiences/{experienceId}` - 更新学习心得 (作者更新内容，工作人员可更新状态) ✅ Implemented
- `DELETE /api/v1/experiences/{experienceId}` - 删除学习心得 (作者或工作人员) ✅ Implemented
- `GET /api/v1/experiences/{experienceId}/comments` - 获取指定学习心得的评论列表 (分页) ✅ Implemented
- `POST /api/v1/experiences/{experienceId}/comments` - 发表对学习心得的评论 ✅ Implemented
- `DELETE /api/v1/experiences/comments/{commentId}` - 删除心得评论 (评论作者或工作人员) ✅ Implemented
- `POST /api/v1/experiences/{experienceId}/upvote` - 点赞/取消点赞学习心得 ✅ Implemented
- `POST /api/v1/experiences/{experienceId}/bookmark` - 收藏/取消收藏学习心得 ✅ Implemented
- `GET /api/v1/experiences/staff/pending` - 获取待审核的学习心得列表 (工作人员) ✅ Implemented
- `POST /api/v1/experiences/{experienceId}/submit` - 用户提交心得进行审核 ✅ Implemented
- `POST /api/v1/experiences/staff/{experienceId}/review` - 工作人员审核心得 (通过/拒绝) ✅ Implemented
- `GET /api/v1/experiences/{experienceId}/reviews` - 获取心得的审核历史记录 ✅ Implemented

### Client - MedicalCategories

- `GET /api/v1/categories/` - 获取医疗知识类别列表 ✅ Implemented
- `POST /api/v1/categories/` - 创建新的医疗知识类别 (工作人员) ✅ Implemented
- `GET /api/v1/categories/{categoryId}` - 获取特定医疗类别的详情 (包含子类别) ✅ Implemented
- `PUT /api/v1/categories/{categoryId}` - 更新医疗知识类别 (工作人员) ✅ Implemented
- `DELETE /api/v1/categories/{categoryId}` - 删除医疗知识类别 (工作人员) ✅ Implemented
- `GET /api/v1/categories/{categoryId}/articles` - 获取特定医疗类别下的知识文章列表 (分页) ✅ Implemented

### Client - Notifications

- `GET /api/v1/notifications/` - 获取当前用户的通知列表 (分页) ✅ Implemented
- `GET /api/v1/notifications/summary` - 获取当前用户的通知汇总信息 (未读数量和最新几条) ✅ Implemented
- `PUT /api/v1/notifications/read-all` - 标记当前用户的所有未读通知为已读 ✅ Implemented
- `GET /api/v1/notifications/{notificationId}` - 获取指定通知的详情，并自动标记为已读 ✅ Implemented
- `DELETE /api/v1/notifications/{notificationId}` - 删除指定通知 ✅ Implemented
- `PUT /api/v1/notifications/{notificationId}/read` - 标记指定通知为已读 ✅ Implemented

### Client - Staff Profile

- `GET /api/v1/staff/profile` - 获取当前登录工作人员的个人资料 ✅ Implemented
- `PUT /api/v1/staff/profile` - 更新当前登录工作人员的个人资料 ✅ Implemented
- `PUT /api/v1/staff/password` - 更新当前登录工作人员的密码 ✅ Implemented

### Client - Tags

- `GET /api/v1/tags/` - 获取所有标签列表 ✅ Implemented
- `POST /api/v1/tags/` - 创建新标签 (需要工作人员权限) ✅ Implemented
- `GET /api/v1/tags/{tagId}` - 获取特定标签的详情及其关联的文章 ✅ Implemented
- `PUT /api/v1/tags/{tagId}` - 更新标签名称 (需要工作人员权限) ✅ Implemented
- `GET /api/v1/tags/stats/usage` - 获取标签使用统计 (需要工作人员权限) ✅ Implemented

### Client - Users

- `GET /api/v1/users/profile` - 获取当前登录用户的个人资料 ✅ Implemented
- `PUT /api/v1/users/profile` - 更新当前登录用户的个人资料 ✅ Implemented
- `PUT /api/v1/users/password` - 更新当前登录用户的密码 ✅ Implemented
- `PUT /api/v1/users/notification-preferences` - 更新当前登录用户的通知设置 ✅ Implemented
- `DELETE /api/v1/users` - 注销当前登录用户的账户 (软删除) ✅ Implemented
- `GET /api/v1/users/experiences` - 获取当前登录用户的所有学习心得列表 ✅ Implemented

**6. 非功能性需求**

- **6.1 安全性：**
  - 密码哈希 (例如：bcrypt, Argon2)。
  - 基于角色的访问控制 (RBAC) 在 API 层面严格执行。
  - 防范常见的 Web 漏洞 (XSS, CSRF, SQL 注入)。
  - 所有通信使用 HTTPS。
- **6.2 可用性：** 所有角色界面直观易用。清晰的导航和反馈。
- **6.3 性能：** 高效的数据库查询，优化富文本和媒体处理。长列表使用分页。
- **6.4 可伸缩性：** 系统设计应能处理不断增长的用户和内容数量。
- **6.5 可维护性：** 代码应结构良好、有文档记录，并遵循编码标准，以便于维护和未来开发。
- **6.6 可靠性：** 系统应健壮且具有最小的停机时间。
- **6.7 可访问性 (Accessibility)：** 考虑 WCAG 标准，确保内容和功能对残障用户友好。
- **6.8 API 版本控制：** 在 API 路径中加入版本号 (例如 `/api/v1/...`)，方便未来升级和兼容。
- **6.9 日志记录：** 更完善的应用级日志记录，包括错误日志、请求日志，方便问题排查。
