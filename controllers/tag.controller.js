const db = require("../models");
const Tag = db.tags;
const ArticleTag = db.articleTags;

/**
 * 获取所有标签
 */
exports.getAllTags = async (req, res) => {
  try {
    const { search, sortBy = "tagName", sortOrder = "ASC" } = req.query;

    // 构建查询条件
    const whereClause = {};

    if (search) {
      whereClause.tagName = {
        [db.Sequelize.Op.like]: `%${search}%`,
      };
    }

    // 查询标签
    const tags = await Tag.findAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      attributes: ["tagID", "tagName", "createdAt"],
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

    res.status(200).json(tagsWithCount);
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取标签列表时发生错误!", error: error.message });
  }
};

/**
 * 获取特定标签的详情
 */
exports.getTagById = async (req, res) => {
  try {
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
      return res.status(404).json({ message: "标签不存在!" });
    }

    res.status(200).json(tag);
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取标签详情时发生错误!", error: error.message });
  }
};

/**
 * 创建新标签 (工作人员/管理员)
 */
exports.createTag = async (req, res) => {
  try {
    const { name: tagName } = req.body;

    if (!tagName) {
      return res.status(400).json({ message: "标签名称不能为空!" });
    }

    // 验证标签长度
    if (tagName.length < 2 || tagName.length > 50) {
      return res.status(400).json({ message: "标签长度必须在2-50个字符之间!" });
    }

    // 验证标签是否包含特殊字符
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/.test(tagName)) {
      return res.status(400).json({
        message: "标签只能包含字母、数字、中文、下划线、连字符和空格!",
      });
    }

    // 检查标签是否已存在
    const existingTag = await Tag.findOne({
      where: { tagName },
    });

    if (existingTag) {
      return res.status(400).json({ message: "标签已存在!" });
    }

    // 创建新标签
    const tag = await Tag.create({ tagName });

    res.status(201).json({
      message: "标签创建成功!",
      tag,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "创建标签时发生错误!", error: error.message });
  }
};

/**
 * 更新标签 (工作人员/管理员)
 */
exports.updateTag = async (req, res) => {
  try {
    const { tagId } = req.params;
    const { name: tagName } = req.body;

    const tag = await Tag.findByPk(tagId);

    if (!tag) {
      return res.status(404).json({ message: "标签不存在!" });
    }

    if (!tagName) {
      return res.status(400).json({ message: "标签名称不能为空!" });
    }

    // 验证标签长度
    if (tagName.length < 2 || tagName.length > 50) {
      return res.status(400).json({ message: "标签长度必须在2-50个字符之间!" });
    }

    // 验证标签是否包含特殊字符
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/.test(tagName)) {
      return res.status(400).json({
        message: "标签只能包含字母、数字、中文、下划线、连字符和空格!",
      });
    }

    // 检查新名称是否已存在
    if (tagName !== tag.tagName) {
      const existingTag = await Tag.findOne({
        where: { tagName },
      });

      if (existingTag) {
        return res.status(400).json({ message: "标签名称已存在!" });
      }
    }

    // 更新标签
    await tag.update({ tagName });

    res.status(200).json({
      message: "标签更新成功!",
      tag,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "更新标签时发生错误!", error: error.message });
  }
};

/**
 * 获取标签使用统计
 */
exports.getTagStats = async (req, res) => {
  try {
    // 获取使用最多的标签
    const popularTags = await ArticleTag.findAll({
      attributes: [
        "tagID",
        [
          db.Sequelize.fn("COUNT", db.Sequelize.col("articleTag.tagID")),
          "count",
        ],
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

    // 获取总标签数和未使用的标签数
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "获取标签统计时发生错误!", error: error.message });
  }
};
