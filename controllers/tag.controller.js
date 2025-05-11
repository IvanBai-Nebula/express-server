const db = require("../models");
const Tag = db.tags;
const ArticleTag = db.articleTags;
const {
  asyncHandler,
  createError,
} = require("../middleware/errorHandler.middleware");

/**
 * 获取所有标签
 */
exports.getAllTags = asyncHandler(async (req, res) => {
  const {
    search,
    sortBy = "tagName",
    sortOrder = "ASC",
    page = 1,
    pageSize = 10,
  } = req.query;

  // 验证排序参数
  const validSortFields = ["tagName", "createdAt"];
  const validSortOrders = ["ASC", "DESC"];

  if (!validSortFields.includes(sortBy)) {
    throw createError(`无效的排序字段: ${sortBy}`, 400);
  }

  if (!validSortOrders.includes(sortOrder)) {
    throw createError(`无效的排序方向: ${sortOrder}`, 400);
  }

  // 转换为数字类型
  const pageNum = parseInt(page, 10);
  const limit = parseInt(pageSize, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    throw createError("页码必须是大于0的整数", 400);
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw createError("每页大小必须是1-100之间的整数", 400);
  }

  const offset = (pageNum - 1) * limit;

  // 构建查询条件
  const whereClause = {};

  if (search) {
    whereClause.tagName = {
      [db.Sequelize.Op.like]: `%${search}%`,
    };
  }

  // 计算总记录数
  const totalCount = await Tag.count({ where: whereClause });
  const totalPages = Math.ceil(totalCount / limit);

  // 查询标签
  const tags = await Tag.findAll({
    where: whereClause,
    order: [[sortBy, sortOrder]],
    attributes: ["tagID", "tagName", "createdAt"],
    limit,
    offset,
  });

  // 计算每个标签的文章数量
  const tagsWithCount = await Promise.all(
    tags.map(async (tag) => {
      const articleCount = await ArticleTag.count({
        where: { tagID: tag.tagID },
      });

      return {
        ...tag.toJSON(),
        articleCount,
      };
    })
  );

  res.status(200).json({
    tags: tagsWithCount,
    pagination: {
      page: pageNum,
      pageSize: limit,
      totalCount,
      totalPages,
    },
  });
});

/**
 * 获取特定标签的详情
 */
exports.getTagById = asyncHandler(async (req, res) => {
  const { tagId } = req.params;

  const tag = await Tag.findByPk(tagId, {
    include: [
      {
        model: db.knowledgeArticles,
        as: "articles",
        attributes: [
          "articleID",
          "title",
          "summary",
          "coverImageURL",
          "publishedAt",
        ],
        through: { attributes: [] },
        where: { status: "Published" },
      },
    ],
  });

  if (!tag) {
    throw createError("标签不存在!", 404);
  }

  res.status(200).json(tag);
});

/**
 * 创建新标签 (工作人员/管理员)
 */
exports.createTag = asyncHandler(async (req, res) => {
  const { name: tagName } = req.body;

  if (!tagName) {
    throw createError("标签名称不能为空!", 400);
  }

  // 验证标签长度
  if (tagName.length < 2 || tagName.length > 50) {
    throw createError("标签长度必须在2-50个字符之间!", 400);
  }

  // 验证标签是否包含特殊字符
  if (!/^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/.test(tagName)) {
    throw createError(
      "标签只能包含字母、数字、中文、下划线、连字符和空格!",
      400
    );
  }

  // 检查标签是否已存在
  const existingTag = await Tag.findOne({
    where: { tagName },
  });

  if (existingTag) {
    throw createError("标签已存在!", 400);
  }

  // 创建新标签
  const tag = await Tag.create({ tagName });

  res.status(201).json({
    message: "标签创建成功!",
    tag,
  });
});

/**
 * 更新标签 (工作人员/管理员)
 */
exports.updateTag = asyncHandler(async (req, res) => {
  const { tagId } = req.params;
  const { name: tagName } = req.body;

  const tag = await Tag.findByPk(tagId);

  if (!tag) {
    throw createError("标签不存在!", 404);
  }

  if (!tagName) {
    throw createError("标签名称不能为空!", 400);
  }

  // 验证标签长度
  if (tagName.length < 2 || tagName.length > 50) {
    throw createError("标签长度必须在2-50个字符之间!", 400);
  }

  // 验证标签是否包含特殊字符
  if (!/^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/.test(tagName)) {
    throw createError(
      "标签只能包含字母、数字、中文、下划线、连字符和空格!",
      400
    );
  }

  // 检查新名称是否已存在
  if (tagName !== tag.tagName) {
    const existingTag = await Tag.findOne({
      where: { tagName },
    });

    if (existingTag) {
      throw createError("标签名称已存在!", 400);
    }
  }

  // 更新标签
  await tag.update({ tagName });

  res.status(200).json({
    message: "标签更新成功!",
    tag,
  });
});

/**
 * 获取标签使用统计
 */
exports.getTagStats = asyncHandler(async (req, res) => {
  // 获取使用最多的标签
  const popularTags = await ArticleTag.findAll({
    attributes: [
      "tagID",
      [db.Sequelize.fn("COUNT", db.Sequelize.col("articleTag.tagID")), "count"],
    ],
    include: [
      {
        model: Tag,
        as: "tag",
        attributes: ["tagName"],
      },
    ],
    group: ["tagID", "tag.tagID"],
    order: [[db.Sequelize.literal("count"), "DESC"]],
    limit: 10,
  });

  // 获取总标签数
  const totalTags = await Tag.count();

  // 修改查找未使用标签的查询
  const unusedTags = await Tag.findAll({
    include: [
      {
        model: db.knowledgeArticles,
        as: "articles",
        attributes: [], // 移除 articleID 属性，只关注关联存在与否
        through: { attributes: [] },
        required: false,
      },
    ],
    attributes: ["tagID", "tagName"],
    group: ["tagID", "tagName"],
    having: db.Sequelize.literal("COUNT(articles.articleID) = 0"),
  });

  res.status(200).json({
    popularTags,
    totalTags,
    unusedTagsCount: unusedTags.length,
    unusedTags,
  });
});
