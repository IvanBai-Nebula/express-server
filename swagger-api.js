const swaggerUi = require('swagger-ui-express')
const swaggerJsdoc = require('swagger-jsdoc')

// Swagger definition
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0', // YOU MIGHT NEED TO CHANGE THIS
    info: {
      title: '医疗知识学习平台 API', // 更新为你的 API 标题
      version: '1.0.0', // Version (required)
      description: '医疗知识学习平台 API 文档', // 更新为你的 API 描述
    },
    servers: [
      {
        url: 'https://yrsbqzlehtyb.sealoshzh.site', // 应与 server.js 中的 PORT 一致
      },
    ],
    components: { // 新增: 定义安全方案
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', // 或者你的 Token 类型, 例如: PASETO, etc.
        }
      },
      schemas: { // 在这里定义你的数据模型
        UserProfile: { // 根据 models/user.model.js 更新
          type: 'object',
          properties: {
            userID: {
              type: 'string',
              format: 'uuid',
              description: '用户编号',
              example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
            },
            username: {
              type: 'string',
              description: '用户名',
              example: 'johndoe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '邮箱',
              example: 'johndoe@example.com'
            },
            avatarURL: {
              type: 'string',
              format: 'url',
              nullable: true,
              description: '头像链接',
              example: 'http://example.com/avatar.jpg'
            },
            isActive: {
              type: 'boolean',
              description: '账户是否激活/未注销',
              example: true
            },
            emailVerified: {
              type: 'boolean',
              description: '邮箱是否已验证',
              example: false
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: '最后登录时间'
            },
            preferredLanguage: {
              type: 'string',
              nullable: true,
              description: '偏好语言',
              example: 'zh-CN'
            },
            notificationPreferences: {
              type: 'object',
              nullable: true,
              description: '通知偏好设置',
              properties: { 
                // 你需要根据实际的 JSON 结构来定义这里的属性
                // 例如: emailEnabled: { type: 'boolean' }, smsEnabled: { type: 'boolean' }
              },
              example: { emailEnabled: true, pushEnabled: false }
            },
            createdAt: { // Sequelize 自动添加
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updatedAt: { // Sequelize 自动添加
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        LearningExperience: { // Base schema from previous work, ensure it matches model closely
          type: 'object',
          properties: {
            experienceID: { type: 'string', format: 'uuid', description: '心得编号' },
            userID: { type: 'string', format: 'uuid', description: '用户编号 (作者)' },
            title: { type: 'string', description: '标题' },
            richTextContent: { type: 'string', description: '富文本内容' },
            status: { type: 'string', enum: ['Draft', 'PendingReview', 'Approved', 'Rejected'], description: '状态' },
            allowComments: { type: 'boolean', description: '是否允许评论' },
            upvoteCount: { type: 'integer', description: '点赞数' },
            relatedArticleID: { type: 'string', format: 'uuid', nullable: true, description: '关联的文章ID' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
            updatedAt: { type: 'string', format: 'date-time', description: '更新时间' }
          }
        },
        AuthorInfo: { // Reusable schema for author details
          type: 'object',
          properties: {
            userID: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            avatarURL: { type: 'string', format: 'url', nullable: true }
          }
        },
        RelatedArticleInfo: { // Reusable for related article snippet
          type: 'object',
          properties: {
            articleID: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            summary: { type: 'string', nullable: true } // summary added for detail view
          }
        },
        LearningExperienceBrief: { // For lists
          allOf: [{ '$ref': '#/components/schemas/LearningExperience' }],
          type: 'object',
          properties: {
            user: { '$ref': '#/components/schemas/AuthorInfo' },
            relatedArticle: { '$ref': '#/components/schemas/RelatedArticleInfo', nullable: true }
            // commentCount could be added here if the list endpoint provides it
          }
        },
        ExperienceReviewInfo: {
          type: 'object',
          properties: {
            reviewID: { type: 'string', format: 'uuid' },
            reviewerStaffID: { type: 'string', format: 'uuid' },
            reviewTimestamp: { type: 'string', format: 'date-time' },
            statusGiven: { type: 'string', enum: ['Approved', 'Rejected'] },
            comments: { type: 'string', nullable: true },
            reviewer: {
              type: 'object',
              properties: {
                staffID: { type: 'string', format: 'uuid' },
                username: { type: 'string' }
              }
            }
          }
        },
        LearningExperienceDetailed: { // For single item view
          allOf: [{ '$ref': '#/components/schemas/LearningExperienceBrief' }],
          type: 'object',
          properties: {
            commentCount: { type: 'integer', description: '评论数量' },
            isBookmarked: { type: 'boolean', description: '当前用户是否已收藏' },
            reviews: {
              type: 'array',
              items: { '$ref': '#/components/schemas/ExperienceReviewInfo' },
              nullable: true
            }
          }
        },
        PaginatedLearningExperiences: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer' },
            totalPages: { type: 'integer' },
            currentPage: { type: 'integer' },
            experiences: {
              type: 'array',
              items: { '$ref': '#/components/schemas/LearningExperienceBrief' }
            }
          }
        },
        ExperienceComment: { // Based on models/experienceComment.model.js
          type: 'object',
          properties: {
            commentID: { type: 'string', format: 'uuid' },
            experienceID: { type: 'string', format: 'uuid', description: '所属心得ID' },
            userID: { type: 'string', format: 'uuid', description: '评论用户ID' },
            userType: { type: 'string', enum: ['User', 'Staff'] },
            commentText: { type: 'string' },
            status: { type: 'string', enum: ['Visible', 'HiddenByModerator', 'DeletedByUser'] },
            createdAt: { type: 'string', format: 'date-time' },
            user: { '$ref': '#/components/schemas/AuthorInfo' }, // Added from controller include
            parentCommentID: { type: 'string', format: 'uuid', nullable: true, description: '父评论ID (用于回复)' }
            // replies (nested comments) can be added if the API supports it
          }
        },
        PaginatedExperienceComments: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer' },
            totalPages: { type: 'integer' },
            currentPage: { type: 'integer' },
            comments: {
              type: 'array',
              items: { '$ref': '#/components/schemas/ExperienceComment' }
            }
          }
        },
        LearningExperienceCreatePayload: {
          type: 'object',
          required: ['title', 'richTextContent'],
          properties: {
            title: { type: 'string', example: '我的学习心得标题' },
            richTextContent: { type: 'string', example: '<p>这是我的心得内容...</p>' },
            allowComments: { type: 'boolean', default: true },
            relatedArticleID: { type: 'string', format: 'uuid', nullable: true, description: '关联的知识文章ID (可选)' }
            // status is set by backend, defaults to Draft
          }
        },
        LearningExperienceUpdatePayload: { // For user updating their own, or staff updating status
          type: 'object',
          properties: {
            title: { type: 'string', nullable: true, example: '更新后的心得标题' },
            richTextContent: { type: 'string', nullable: true, example: '<p>更新后的内容...</p>' },
            allowComments: { type: 'boolean', nullable: true },
            status: { type: 'string', enum: ['Draft', 'PendingReview', 'Approved', 'Rejected'], nullable: true, description: '更新状态 (用户可提交审核, 工作人员可改任意状态)' }
            // relatedArticleID is usually not updatable after creation, confirm if needed
          }
        },
        ExperienceCommentPayload: {
          type: 'object',
          required: ['commentText'],
          properties: {
            commentText: { type: 'string', example: '这是一个很棒的心得！' },
            parentCommentID: { type: 'string', format: 'uuid', nullable: true, description: '回复某条评论的ID (可选)' }
          }
        },
        ToggleBookmarkResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '操作成功' },
            isBookmarked: { type: 'boolean', description: '当前心得是否已收藏' }
          }
        },
        ExperienceReviewResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '心得审核通过成功！' },
            experience: { '$ref': '#/components/schemas/LearningExperienceBrief' },
            review: { '$ref': '#/components/schemas/ExperienceReviewInfo' }
          }
        },
        ExperienceReviewHistoryResponse: {
          type: 'object',
          properties: {
            experienceId: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: '我的学习心得' },
            currentStatus: { type: 'string', enum: ['Draft', 'PendingReview', 'Approved', 'Rejected'] },
            reviews: {
              type: 'array',
              items: { '$ref': '#/components/schemas/ExperienceReviewInfo' }
            }
          }
        },
        // Auth Schemas Start
        UserRegistrationPayload: {
          type: 'object',
          required: ['username', 'email', 'password', 'confirmPassword'],
          properties: {
            username: {
              type: 'string',
              description: '用户名',
              example: 'newuser'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '电子邮箱',
              example: 'newuser@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              description: '密码',
              example: 'P@sswOrd123'
            },
            confirmPassword: {
              type: 'string',
              format: 'password',
              description: '确认密码',
              example: 'P@sswOrd123'
            },
            avatarURL: {
              type: 'string',
              format: 'url',
              nullable: true,
              description: '头像链接 (可选)',
              example: 'http://example.com/avatar.jpg'
            },
            preferredLanguage: {
              type: 'string',
              nullable: true,
              description: '偏好语言 (可选，默认 zh-CN)',
              example: 'en-US'
            },
            notificationPreferences: { // 结构应与 UserProfile 中的定义类似
              type: 'object',
              nullable: true,
              description: '通知偏好设置 (可选)',
              example: { "emailNotifications": true }
            }
          }
        },
        UserRegistrationResponse: {
          type: 'object',
          properties: {
            userID: {
              type: 'string',
              format: 'uuid',
              description: '用户ID'
            },
            username: {
              type: 'string',
              description: '用户名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '电子邮箱'
            },
            emailVerified: {
              type: 'boolean',
              description: '邮箱是否已验证'
            },
            avatarURL: {
              type: 'string',
              format: 'url',
              nullable: true,
              description: '头像链接'
            },
            preferredLanguage: {
              type: 'string',
              nullable: true,
              description: '偏好语言'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            }
          }
        },
        StaffRegistrationPayload: {
          type: 'object',
          required: ['username', 'email', 'password', 'confirmPassword'],
          properties: {
            username: {
              type: 'string',
              description: '工作人员用户名',
              example: 'staffmember'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '工作人员电子邮箱',
              example: 'staff@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              description: '密码',
              example: 'StaffP@sswOrd789'
            },
            confirmPassword: {
              type: 'string',
              format: 'password',
              description: '确认密码',
              example: 'StaffP@sswOrd789'
            },
            isAdmin: {
              type: 'boolean',
              description: '是否为管理员 (可选，默认 false)',
              example: false
            },
            avatarURL: {
              type: 'string',
              format: 'url',
              nullable: true,
              description: '头像链接 (可选)',
              example: 'http://example.com/staff_avatar.jpg'
            },
            preferredLanguage: {
              type: 'string',
              nullable: true,
              description: '偏好语言 (可选，默认 zh-CN)',
              example: 'en-US'
            },
            notificationPreferences: { // 结构应与 UserProfile 中的定义类似
              type: 'object',
              nullable: true,
              description: '通知偏好设置 (可选)',
              example: { "emailNotifications": true }
            }
          }
        },
        StaffRegistrationResponse: {
          type: 'object',
          properties: {
            staffID: {
              type: 'string',
              format: 'uuid',
              description: '工作人员ID'
            },
            username: {
              type: 'string',
              description: '用户名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '电子邮箱'
            },
            isAdmin: {
              type: 'boolean',
              description: '是否为管理员'
            },
            emailVerified: {
              type: 'boolean',
              description: '邮箱是否已验证'
            },
            avatarURL: {
              type: 'string',
              format: 'url',
              nullable: true,
              description: '头像链接'
            },
            preferredLanguage: {
              type: 'string',
              nullable: true,
              description: '偏好语言'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            }
          }
        },
        LoginPayload: {
          type: 'object',
          required: ['usernameOrEmail', 'password'],
          properties: {
            usernameOrEmail: {
              type: 'string',
              description: '用户名或电子邮箱',
              example: 'johndoe' 
            },
            password: {
              type: 'string',
              format: 'password',
              description: '密码',
              example: 'P@sswOrd123'
            }
          }
        },
        LoginResponseUserSummary: { // 登录成功后返回的用户/工作人员摘要信息
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '用户或工作人员ID'
            },
            username: {
              type: 'string',
              description: '用户名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '电子邮箱'
            },
            role: {
              type: 'string',
              enum: ['user', 'staff'],
              description: '用户角色'
            },
            isAdmin: {
              type: 'boolean',
              description: '是否为管理员 (仅当role为staff时相关)'
            },
            avatar: {
              type: 'string',
              format: 'url',
              nullable: true,
              description: '头像链接'
            },
            emailVerified: {
              type: 'boolean',
              description: '邮箱是否已验证'
            }
          }
        },
        LoginSuccessResponse: { // 整个登录成功后的响应体
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: '登录成功!'
            },
            token: {
              type: 'string',
              description: 'JWT 认证令牌',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
            },
            user: {
              $ref: '#/components/schemas/LoginResponseUserSummary'
            }
          }
        },
        ForgotPasswordPayload: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: '注册时使用的电子邮箱地址',
              example: 'user@example.com'
            }
          }
        },
        ResetPasswordPayload: {
          type: 'object',
          required: ['token', 'newPassword', 'confirmNewPassword'],
          properties: {
            token: {
              type: 'string',
              description: '从重置密码邮件中获取的令牌',
              example: 'reset_token_string_here'
            },
            newPassword: {
              type: 'string',
              format: 'password',
              description: '新密码',
              example: 'NewP@sswOrd456'
            },
            confirmNewPassword: {
              type: 'string',
              format: 'password',
              description: '确认新密码',
              example: 'NewP@sswOrd456'
            }
          }
        },
        VerifyEmailPayload: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: '从验证邮件中获取的令牌',
              example: 'email_verification_token_string'
            }
          }
        },
        GenericSuccessMessage: { // 通用的成功消息响应
          type: 'object',
          properties: {
            message: {
              type: 'string'
            }
          }
        },
        GenericErrorMessage: { // 通用的错误消息响应
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: '错误信息描述'
            },
            error: { // 可选，用于更详细的错误或开发环境下的调试信息
              type: 'string',
              nullable: true,
              description: '详细错误内容 (可选)'
            }
          },
          example: {
            message: "请求处理失败。",
            error: "具体错误原因... (可选)"
          }
        },
        StaffProfile: { // 与 UserProfile 类似, 但用于工作人员
          type: 'object',
          properties: {
            staffID: {
              type: 'string',
              format: 'uuid',
              description: '工作人员编号',
              example: 's-a1b2-c3d4-e5f6-7890'
            },
            username: {
              type: 'string',
              description: '用户名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '邮箱'
            },
            isAdmin: {
              type: 'boolean',
              description: '是否为管理员'
            },
            avatarURL: {
              type: 'string',
              format: 'url',
              nullable: true,
              description: '头像链接'
            },
            isActive: {
              type: 'boolean',
              description: '账户是否激活/未注销'
            },
            emailVerified: {
              type: 'boolean',
              description: '邮箱是否已验证'
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: '最后登录时间'
            },
            preferredLanguage: {
              type: 'string',
              nullable: true,
              description: '偏好语言'
            },
            notificationPreferences: {
              type: 'object',
              nullable: true,
              description: '通知偏好设置' // 具体结构参考 UserProfile
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        StaffListResponse: {
          type: 'object',
          properties: {
            totalItems: {
              type: 'integer',
              description: '总条目数'
            },
            totalPages: {
              type: 'integer',
              description: '总页数'
            },
            currentPage: {
              type: 'integer',
              description: '当前页码'
            },
            staffList: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/StaffProfile'
              }
            }
          }
        },
        UpdatePasswordPayload: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              format: 'password',
              description: '当前密码'
            },
            newPassword: {
              type: 'string',
              format: 'password',
              description: '新密码'
            }
          }
        },
        StaffUpdatePayloadByAdmin: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: '新的用户名 (如果提供，必须唯一)'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '新的邮箱地址 (如果提供，必须唯一，且会导致 emailVerified 置为 false)'
            },
            avatarURL: {
              type: 'string',
              format: 'url',
              nullable: true,
              description: '新的头像链接'
            },
            isAdmin: {
              type: 'boolean',
              description: '设置是否为管理员'
            },
            isActive: {
              type: 'boolean',
              description: '设置账户是否激活'
            }
            // preferredLanguage 和 notificationPreferences 也可以考虑加入
          }
        },
        StaffResetPasswordPayload: {
          type: 'object',
          required: ['newPassword'],
          properties: {
            newPassword: {
              type: 'string',
              format: 'password',
              description: '要设置的新密码'
            }
          }
        },
        // Staff Schemas End

        // Admin Schemas Start
        DashboardStats: {
          type: 'object',
          properties: {
            users: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 150 },
                newLastMonth: { type: 'integer', example: 20 }
              }
            },
            staff: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 15 },
                admins: { type: 'integer', example: 3 }
              }
            },
            content: {
              type: 'object',
              properties: {
                articles: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer', example: 200 },
                    published: { type: 'integer', example: 180 },
                    newLastMonth: { type: 'integer', example: 30 }
                  }
                },
                experiences: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer', example: 100 },
                    approved: { type: 'integer', example: 85 },
                    pending: { type: 'integer', example: 10 },
                    newLastMonth: { type: 'integer', example: 15 }
                  }
                }
              }
            },
            taxonomy: {
              type: 'object',
              properties: {
                categories: { type: 'integer', example: 10 },
                tags: { type: 'integer', example: 50 }
              }
            },
            popular: {
              type: 'object',
              properties: {
                articles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      articleID: { type: 'string', format: 'uuid' },
                      title: { type: 'string' },
                      viewCount: { type: 'integer' },
                      averageRating: { type: 'number', format: 'float' },
                      createdAt: { type: 'string', format: 'date-time' }
                    }
                  }
                },
                experiences: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      experienceID: { type: 'string', format: 'uuid' },
                      title: { type: 'string' },
                      upvoteCount: { type: 'integer' },
                      createdAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          },
          description: '管理员仪表盘统计数据'
        },
        AuditLogAdmin: {
          type: 'object',
          properties: {
            staffID: { type: 'string', format: 'uuid', description: '管理员ID' },
            username: { type: 'string', description: '管理员用户名' }
          }
        },
        AuditLogEntry: { // Based on models/auditLog.model.js
          type: 'object',
          properties: {
            logID: { type: 'string', format: 'uuid', description: '日志ID' },
            actionType: { type: 'string', description: '操作类型', example: 'UPDATE_USER_STATUS' },
            targetEntityType: { type: 'string', nullable: true, description: '目标实体类型', example: 'User' },
            targetEntityID: { type: 'string', format: 'uuid', nullable: true, description: '目标实体ID' },
            oldValue: { type: 'object', nullable: true, description: '操作前数据 (JSON)', example: { status: 'active' } },
            newValue: { type: 'object', nullable: true, description: '操作后数据 (JSON)', example: { status: 'inactive' } },
            timestamp: { type: 'string', format: 'date-time', description: '操作时间' },
            ipAddress: { type: 'string', format: 'ip', nullable: true, description: '操作者IP' },
            adminStaffID: { type: 'string', format: 'uuid', description: '执行操作的管理员Staff ID (外键)' },
            admin: { // Populated from include
              '$ref': '#/components/schemas/AuditLogAdmin'
            }
          }
        },
        PaginatedAuditLogs: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
            currentPage: { type: 'integer', example: 1 },
            logs: {
              type: 'array',
              items: {
                '$ref': '#/components/schemas/AuditLogEntry'
              }
            }
          }
        },
        AdminUserListItem: { // For combined User and Staff list
          type: 'object',
          properties: {
            // Common fields first
            id: { type: 'string', format: 'uuid', description: '用户或员工ID (userID 或 staffID)' },
            userType: { type: 'string', enum: ['User', 'Staff'], description: '用户类型' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            // User specific (nullable)
            emailVerified: { type: 'boolean', nullable: true },
            lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
            // Staff specific (nullable)
            isAdmin: { type: 'boolean', nullable: true },
            role: { type: 'string', nullable: true, example: 'ContentManager' },
            department: { type: 'string', nullable: true, example: 'Editorial' }
            // Add other relevant fields, excluding sensitive ones like passwordHash
          },
          example: {
            id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            userType: 'User',
            username: 'johndoe',
            email: 'johndoe@example.com',
            isActive: true,
            createdAt: '2023-01-01T12:00:00Z',
            updatedAt: '2023-01-10T10:00:00Z',
            emailVerified: true,
            lastLoginAt: '2023-01-10T09:00:00Z'
          }
        },
        PaginatedAdminUsers: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer', example: 50 },
            totalPages: { type: 'integer', example: 5 },
            currentPage: { type: 'integer', example: 1 },
            users: {
              type: 'array',
              items: {
                '$ref': '#/components/schemas/AdminUserListItem'
              }
            }
          }
        },
        StaffCreationPayloadByAdmin: { // Similar to StaffRegistrationPayload, but admin might not need confirmPassword
          type: 'object',
          required: ['username', 'email', 'password', 'role'],
          properties: {
            username: { type: 'string', description: '用户名', example: 'newstaff' },
            email: { type: 'string', format: 'email', description: '邮箱', example: 'newstaff@example.com' },
            password: { type: 'string', format: 'password', description: '初始密码', example: 'StaffP@sswOrd' },
            role: { type: 'string', description: '角色', example: 'ContentEditor' },
            department: { type: 'string', nullable: true, description: '部门', example: 'Medical Content' },
            isAdmin: { type: 'boolean', default: false, description: '是否为管理员' },
            // avatarURL can be added if needed
          }
        },
        UserStatusUpdatePayload: {
          type: 'object',
          required: ['isActive'],
          properties: {
            isActive: { type: 'boolean', description: '新的激活状态 (true for active, false for inactive/disabled)' }
          }
        },
        SystemConfig: {
          type: 'object',
          // Define properties based on what getSystemConfig and updateSystemConfig handle
          // This is a placeholder, you'll need to fill this based on your actual system config structure
          properties: {
            siteName: { type: 'string', example: 'My Awesome Platform' },
            maintenanceMode: { type: 'boolean', example: false },
            allowUserRegistration: { type: 'boolean', example: true },
            maxUploadFileSizeMB: { type: 'integer', example: 50 },
            defaultLanguage: { type: 'string', example: 'zh-CN' },
            version: {type: 'string', example: '1.2.3'}
            // ... other config fields
          }
        },
        // Admin Schemas End

        // Notification Schemas Start
        Notification: {
          type: 'object',
          properties: {
            notificationID: { type: 'string', format: 'uuid', description: '通知ID' },
            recipientUserID: { type: 'string', format: 'uuid', description: '接收用户ID (通过JWT确定, 此处为展示)' },
            recipientUserType: { type: 'string', enum: ['User', 'Staff'], description: '接收者用户类型' },
            type: { type: 'string', description: '通知类型', example: 'NEW_EXPERIENCE_COMMENT' },
            content: { type: 'string', description: '通知内容' },
            relatedEntityType: { type: 'string', nullable: true, description: '关联实体类型', example: 'LearningExperience' },
            relatedEntityID: { type: 'string', format: 'uuid', nullable: true, description: '关联实体ID' },
            isRead: { type: 'boolean', description: '是否已读' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间 (通知发送时间)' }
          }
        },
        PaginatedNotifications: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer', example: 50 },
            totalPages: { type: 'integer', example: 5 },
            currentPage: { type: 'integer', example: 1 },
            unreadCount: { type: 'integer', example: 5 },
            notifications: {
              type: 'array',
              items: { '$ref': '#/components/schemas/Notification' }
            }
          }
        },
        NotificationSummary: {
          type: 'object',
          properties: {
            unreadCount: { type: 'integer', example: 5 },
            latestUnread: {
              type: 'array',
              items: { '$ref': '#/components/schemas/Notification' },
              description: '最新的几条未读通知'
            }
          }
        },
        NotificationRelatedData: { // A flexible schema for related data
          type: 'object',
          description: '通知关联的实体数据，具体结构取决于 relatedEntityType',
          example: {
            articleID: 'article-uuid',
            title: '相关文章标题'
            // or experienceID, title etc.
          }
          // We cannot strictly define this without knowing all possible relatedEntityType and their specific fields.
          // For a more robust definition, oneOf could be used if all possible structures are known.
        },
        NotificationDetails: {
          type: 'object',
          properties: {
            notification: { '$ref': '#/components/schemas/Notification' },
            relatedData: {
              '$ref': '#/components/schemas/NotificationRelatedData',
              nullable: true
            }
          }
        },
        MarkAllNotificationsReadResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '所有通知已标记为已读!' },
            count: { type: 'integer', description: '本次操作标记为已读的通知数量', example: 3 }
          }
        },
        // Notification Schemas End

        // Tag Schemas Start
        Tag: {
          type: 'object',
          properties: {
            tagID: { type: 'string', format: 'uuid', description: '标签ID' },
            tagName: { type: 'string', description: '标签名称', example: 'React' }, // Renamed from name in controller for consistency with model
            articleCount: { type: 'integer', description: '使用该标签的文章数量', example: 15 },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' }
            // UpdatedAt is false in model, so not included unless tagName can be updated
          }
        },
        BriefArticleInfo: { // For embedding in TagWithArticles
          type: 'object',
          properties: {
            articleID: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            summary: { type: 'string', nullable: true },
            coverImageURL: { type: 'string', format: 'url', nullable: true },
            publishedAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        TagWithArticles: { // For GET /tags/{tagId}
          type: 'object',
          properties: {
            tagID: { type: 'string', format: 'uuid' },
            tagName: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            articles: {
              type: 'array',
              items: { '$ref': '#/components/schemas/BriefArticleInfo' },
              description: '使用此标签的已发布文章列表'
            }
          }
        },
        TagCreatePayload: {
          type: 'object',
          required: ['name'], // Controller uses 'name' in req.body
          properties: {
            name: { type: 'string', description: '新标签的名称', example: 'JavaScript ES2023' }
          }
        },
        TagUpdatePayload: {
          type: 'object',
          required: ['name'], // Controller uses 'name' in req.body
          properties: {
            name: { type: 'string', description: '标签的新名称', example: 'ECMAScript 2023' }
          }
        },
        TagResponse: { // Common response for create/update
          type: 'object',
          properties: {
            message: { type: 'string' },
            tag: { '$ref': '#/components/schemas/Tag' } // Returns the full tag object without articleCount initially
          }
        },
        DeleteTagErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '标签正在被使用，无法删除!' },
            usageCount: { type: 'integer', example: 5 }
          }
        },
        PopularTagStat: {
          type: 'object',
          properties: {
            tagID: { type: 'string', format: 'uuid' },
            count: { type: 'integer', description: '使用次数' },
            tag: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '标签名称' } // Controller returns nested tag.name
              }
            }
          }
        },
        UnusedTagInfo: {
            type: 'object',
            properties: {
                tagID: { type: 'string', format: 'uuid' },
                name: { type: 'string' } // Controller returns tag.name directly for unused tags
            }
        },
        TagStatsResponse: {
          type: 'object',
          properties: {
            popularTags: {
              type: 'array',
              items: { '$ref': '#/components/schemas/PopularTagStat' }
            },
            totalTags: { type: 'integer', example: 100 },
            unusedTagsCount: { type: 'integer', example: 10 },
            unusedTags: {
                type: 'array',
                items: { '$ref': '#/components/schemas/UnusedTagInfo' }
            }
          }
        },
        MergeTagsPayload: {
          type: 'object',
          required: ['sourceTagId', 'targetTagId'],
          properties: {
            sourceTagId: { type: 'string', format: 'uuid', description: '要被合并的源标签ID' },
            targetTagId: { type: 'string', format: 'uuid', description: '合并目标标签ID' }
          }
        },
        MergeTagsResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '标签合并成功!' },
            targetTag: { '$ref': '#/components/schemas/Tag' } // Or a more detailed tag object if appropriate
          }
        },
        UpdateExperienceCommentPayload: {
          type: 'object',
          required: ['commentText'],
          properties: {
            commentText: { type: 'string', description: '新的评论内容', example: '这是更新后的评论。' }
          }
        },
        UpdateExperienceCommentResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '评论修改成功!' },
            comment: { '$ref': '#/components/schemas/ExperienceComment' }
          }
        },
        ReportPayload: {
          type: 'object',
          required: ['reason'],
          properties: {
            reason: { type: 'string', description: '举报原因', example: '内容不当' },
            details: { type: 'string', nullable: true, description: '详细说明 (可选)', example: '评论中包含攻击性言论。' }
          }
        },
        // Learning Experience Schemas End

        // Knowledge Article Schemas Start
        KnowledgeArticle: { // Base schema from models/knowledgeArticle.model.js
          type: 'object',
          properties: {
            articleID: { type: 'string', format: 'uuid', description: '知识文章ID' },
            title: { type: 'string', description: '标题' },
            summary: { type: 'string', nullable: true, description: '简介' },
            coverImageURL: { type: 'string', format: 'url', nullable: true, description: '封面图片链接' },
            richTextContent: { type: 'string', nullable: true, description: '富文本内容' },
            videoURL: { type: 'string', format: 'url', nullable: true, description: '视频链接' },
            status: { type: 'string', enum: ['Draft', 'PendingReview', 'Published', 'Archived', 'Rejected'], description: '状态' },
            publishedAt: { type: 'string', format: 'date-time', nullable: true, description: '发布时间' },
            version: { type: 'integer', description: '当前版本号' },
            averageRating: { type: 'number', format: 'float', nullable: true, description: '平均评分' },
            viewCount: { type: 'integer', description: '浏览次数' },
            categoryID: { type: 'string', format: 'uuid', nullable: true, description: '所属分类ID' },
            authorStaffID: { type: 'string', format: 'uuid', description: '作者Staff ID' },
            parentArticleID: { type: 'string', format: 'uuid', nullable: true, description: '父文章ID (用于系列文章)' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
            updatedAt: { type: 'string', format: 'date-time', description: '更新时间' }
          }
        },
        ArticleAuthor: { // For Staff author
          type: 'object',
          properties: {
            staffID: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            avatarURL: { type: 'string', format: 'url', nullable: true }
          }
        },
        ArticleCategorySummary: {
          type: 'object',
          properties: {
            categoryID: { type: 'string', format: 'uuid' },
            name: { type: 'string' }
          }
        },
        KnowledgeArticleBrief: { // For list items
          allOf: [{ '$ref': '#/components/schemas/KnowledgeArticle' }],
          type: 'object',
          properties: {
            // Properties from KnowledgeArticle are inherited
            author: { '$ref': '#/components/schemas/ArticleAuthor' },
            category: { '$ref': '#/components/schemas/ArticleCategorySummary', nullable: true },
            tags: {
              type: 'array',
              items: { '$ref': '#/components/schemas/Tag' }
            }
          }
        },
        KnowledgeArticleDetailed: { // For single article view
          allOf: [{ '$ref': '#/components/schemas/KnowledgeArticleBrief' }], // Inherits from Brief
          type: 'object',
          properties: {
            // Properties from KnowledgeArticleBrief are inherited
            isBookmarked: { type: 'boolean', description: '当前用户是否已收藏此文章' },
            relatedArticles: { // Snippets of related articles
              type: 'array',
              items: { '$ref': '#/components/schemas/BriefArticleInfo' }, // Reusing BriefArticleInfo from Tags
              nullable: true
            },
            parentArticle: { // Snippet of parent article, if any
              type: 'object',
              nullable: true,
              properties: {
                articleID: { type: 'string', format: 'uuid' },
                title: { type: 'string' }
              }
            }
            // Feedback summary (e.g., averageRating, feedbackCount) is already in KnowledgeArticle base
          }
        },
        PaginatedKnowledgeArticles: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer' },
            totalPages: { type: 'integer' },
            currentPage: { type: 'integer' },
            articles: {
              type: 'array',
              items: { '$ref': '#/components/schemas/KnowledgeArticleBrief' }
            }
          }
        },
        ArticleFeedback: { // Based on models/articleFeedback.model.js
          type: 'object',
          properties: {
            feedbackID: { type: 'string', format: 'uuid' },
            articleID: { type: 'string', format: 'uuid', description: '所属文章ID' },
            userID: { type: 'string', format: 'uuid', description: '提交反馈的用户ID' },
            userType: { type: 'string', enum: ['User', 'Staff'] },
            rating: { type: 'integer', minimum: 1, maximum: 5, nullable: true, description: '评分 (1-5星)' },
            comment: { type: 'string', nullable: true, description: '评论内容' },
            isAnonymous: { type: 'boolean', description: '是否匿名反馈' },
            createdAt: { type: 'string', format: 'date-time' },
            user: { '$ref': '#/components/schemas/AuthorInfo', description: "提交反馈的用户信息 (如果非匿名)", nullable: true } // User or Staff info
          }
        },
        PaginatedArticleFeedbacks: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer' },
            totalPages: { type: 'integer' },
            currentPage: { type: 'integer' },
            feedbacks: {
              type: 'array',
              items: { '$ref': '#/components/schemas/ArticleFeedback' }
            }
          }
        },
        ArticleFeedbackPayload: {
          type: 'object',
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, nullable: true, description: '评分 (1-5 星)，可选' },
            comment: { type: 'string', nullable: true, description: '反馈评论内容，可选' },
            isAnonymous: { type: 'boolean', default: false, description: '是否匿名提交，可选' }
          },
          // At least one of rating or comment should be present, this can be handled by controller logic or a more complex schema (oneOf)
        },
        ArticleVersion: { // Based on models/articleVersion.model.js
          type: 'object',
          properties: {
            versionID: { type: 'string', format: 'uuid' },
            articleID: { type: 'string', format: 'uuid' },
            versionNumber: { type: 'integer' },
            title: { type: 'string' },
            summary: { type: 'string', nullable: true },
            richTextContent: { type: 'string', nullable: true },
            videoURL: { type: 'string', format: 'url', nullable: true },
            authorStaffID: { type: 'string', format: 'uuid', description: '保存此版本的Staff ID' },
            savedAt: { type: 'string', format: 'date-time' },
            author: { '$ref': '#/components/schemas/ArticleAuthor', description: "保存此版本的员工信息"}
          }
        },
        PaginatedArticleVersions: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer' },
            totalPages: { type: 'integer' },
            currentPage: { type: 'integer' },
            versions: {
              type: 'array',
              items: { '$ref': '#/components/schemas/ArticleVersion' }
            }
          }
        },
        KnowledgeArticleCreatePayload: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: '如何诊断普通感冒' },
            summary: { type: 'string', nullable: true, example: '本文介绍了普通感冒的常见症状和诊断方法。' },
            coverImageURL: { type: 'string', format: 'url', nullable: true },
            richTextContent: { type: 'string', nullable: true, example: '<p>详细内容...</p>' },
            videoURL: { type: 'string', format: 'url', nullable: true },
            categoryID: { type: 'string', format: 'uuid', nullable: true, description: '所属分类ID' },
            tags: { type: 'array', items: { type: 'string' }, nullable: true, description: '标签名称或ID数组', example: ['感冒', '呼吸道'] },
            status: { type: 'string', enum: ['Draft', 'PendingReview', 'Published'], default: 'Draft', description: '文章状态' },
            parentArticleID: { type: 'string', format: 'uuid', nullable: true, description: '父文章ID (用于系列文章)' }
          }
        },
        KnowledgeArticleUpdatePayload: {
          type: 'object',
          properties: {
            title: { type: 'string', nullable: true },
            summary: { type: 'string', nullable: true },
            coverImageURL: { type: 'string', format: 'url', nullable: true },
            richTextContent: { type: 'string', nullable: true },
            videoURL: { type: 'string', format: 'url', nullable: true },
            categoryID: { type: 'string', format: 'uuid', nullable: true },
            tags: { type: 'array', items: { type: 'string' }, nullable: true, description: '标签名称或ID数组 (会替换现有标签)' },
            status: { type: 'string', enum: ['Draft', 'PendingReview', 'Published', 'Archived', 'Rejected'], nullable: true },
            parentArticleID: { type: 'string', format: 'uuid', nullable: true }
          }
        },
        UnbookmarkArticleResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '取消收藏成功!' },
            isBookmarked: { type: 'boolean', example: false, description: '当前收藏状态' }
          }
        },
        // Knowledge Article Schemas End

        // Medical Category Schemas Start
        MedicalCategory: { // Based on models/medicalCategory.model.js
          type: 'object',
          properties: {
            categoryID: { type: 'string', format: 'uuid', description: '类别ID' },
            name: { type: 'string', description: '类别名称', example: '内科' },
            description: { type: 'string', nullable: true, description: '类别描述' },
            parentCategoryID: { type: 'string', format: 'uuid', nullable: true, description: '父类别ID' },
            isActive: { type: 'boolean', default: true, description: '是否激活' },
            createdByStaffID: { type: 'string', format: 'uuid', nullable: true, description: '创建人Staff ID' }, // Assuming this is populated
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            subcategories: { // For GET /:categoryId response
              type: 'array',
              items: { '$ref': '#/components/schemas/MedicalCategory' }, // Recursive, but only one level usually shown or controlled by query param
              description: '子类别列表 (仅活跃的)', 
              nullable: true
            },
            children: { // For tree format in GET /
              type: 'array',
              items: { '$ref': '#/components/schemas/MedicalCategory' }, // Recursive for tree structure
              description: '子类别 (用于树形结构显示)',
              nullable: true
            },
            articleCount: { type: 'integer', nullable: true, description: '该类别下的文章数量 (可能在特定查询中提供)'}
          }
        },
        MedicalCategoryCreatePayload: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: '儿科' },
            description: { type: 'string', nullable: true, example: '关于儿童健康的分类' },
            parentCategoryID: { type: 'string', format: 'uuid', nullable: true, description: '父类别ID (可选)' }
          }
        },
        MedicalCategoryUpdatePayload: {
          type: 'object',
          properties: {
            name: { type: 'string', nullable: true, example: '小儿内科' },
            description: { type: 'string', nullable: true },
            parentCategoryID: { type: 'string', format: 'uuid', nullable: true },
            isActive: { type: 'boolean', nullable: true, description: '设置类别是否激活' }
          }
        },
        CategoryResponse: { // For create/update success
          type: 'object',
          properties: {
            message: { type: 'string' },
            category: { '$ref': '#/components/schemas/MedicalCategory' }
          }
        },
        DeleteCategoryResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '类别已成功删除! 或 类别已设置为非活跃状态，因为存在关联的文章!' },
            category: { '$ref': '#/components/schemas/MedicalCategory', nullable: true, description: '如果类别被设为非活跃，则返回类别对象' }
          }
        },
        PaginatedCategoryArticles: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer' },
            totalPages: { type: 'integer' },
            currentPage: { type: 'integer' },
            category: { '$ref': '#/components/schemas/MedicalCategory', description: '当前分类信息 (不含子分类和文章列表)' },
            articles: {
              type: 'array',
              items: { '$ref': '#/components/schemas/KnowledgeArticleBrief' }
            }
          }
        }
        // Medical Category Schemas End
      }
    },
    security: [ // 可选: 全局安全设置 (如果所有API都需要认证)
      {
        bearerAuth: []
      }
    ]
  },
  // Path to the API docs
  apis: ['./routes/*.js'], // (You might need to change this if your route files are elsewhere or have different extensions)
}

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const swaggerDocs = swaggerJsdoc(swaggerOptions)

// Function to setup Swagger UI
module.exports = function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))
  // 可以选择性地在此处添加一个指向 /api-docs 的重定向或欢迎信息
  // 例如：
  // app.get('/swagger', (req, res) => res.redirect('/api-docs'));
} 