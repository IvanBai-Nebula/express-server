const db = require("../models");
const Tag = db.tags;
const ArticleTag = db.articleTags;

/**
 * 获取所有标签
 */
exports.getAllTags = async (req, res) => {
  try {
    const { search, sortBy = "name", sortOrder = "ASC" } = req.query;

    // 构建查询条件
    const whereClause = {};

    if (search) {
      whereClause.name = {
        [db.Sequelize.Op.like]: `%${search}%`,
      };
    }

    // 查询标签
    const tags = await Tag.findAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: db.knowledgeArticles,
          as: "articles",
          attributes: ["articleID"],
          through: { attributes: [] },
        },
      ],
      attributes: {
        include: [
          [db.Sequelize.fn("COUNT", db.Sequelize.col("articles.articleID")), "articleCount"],
        ],
      },
      group: ["Tag.tagID"],
      raw: true,
    });

    res.status(200).json(tags);
  } catch (error) {
    res.status(500).json({ message: "获取标签列表时发生错误!", error: error.message });
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
          attributes: ["articleID", "title", "summary", "coverImageURL", "publishedAt"],
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
    res.status(500).json({ message: "获取标签详情时发生错误!", error: error.message });
  }
};

/**
 * 创建新标签 (工作人员/管理员)
 */
exports.createTag = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "标签名称不能为空!" });
    }

    // 检查标签是否已存在
    const existingTag = await Tag.findOne({
      where: { name },
    });

    if (existingTag) {
      return res.status(400).json({ message: "标签已存在!" });
    }

    // 创建新标签
    const tag = await Tag.create({ name });

    res.status(201).json({
      message: "标签创建成功!",
      tag,
    });
  } catch (error) {
    res.status(500).json({ message: "创建标签时发生错误!", error: error.message });
  }
};

/**
 * 更新标签 (工作人员/管理员)
 */
exports.updateTag = async (req, res) => {
  try {
    const { tagId } = req.params;
    const { name } = req.body;

    const tag = await Tag.findByPk(tagId);

    if (!tag) {
      return res.status(404).json({ message: "标签不存在!" });
    }

    if (!name) {
      return res.status(400).json({ message: "标签名称不能为空!" });
    }

    // 检查新名称是否已存在
    if (name !== tag.name) {
      const existingTag = await Tag.findOne({
        where: { name },
      });

      if (existingTag) {
        return res.status(400).json({ message: "标签名称已存在!" });
      }
    }

    // 更新标签
    await tag.update({ name });

    res.status(200).json({
      message: "标签更新成功!",
      tag,
    });
  } catch (error) {
    res.status(500).json({ message: "更新标签时发生错误!", error: error.message });
  }
};

/**
 * 获取标签使用统计
 */
exports.getTagStats = async (req, res) => {
  try {
    // 获取使用最多的标签
    const popularTags = await ArticleTag.findAll({
      attributes: ["tagID", [db.Sequelize.fn("COUNT", db.Sequelize.col("tagID")), "count"]],
      include: [
        {
          model: Tag,
          as: "tag",
          attributes: ["name"],
        },
      ],
      group: ["tagID"],
      order: [[db.Sequelize.literal("count"), "DESC"]],
      limit: 10,
    });

    // 获取总标签数和未使用的标签数
    const totalTags = await Tag.count();
    const unusedTags = await Tag.findAll({
      include: [
        {
          model: db.knowledgeArticles,
          as: "articles",
          attributes: ["articleID"],
          through: { attributes: [] },
          required: false,
        },
      ],
      attributes: ["tagID", "name"],
      group: ["Tag.tagID"],
      having: db.Sequelize.literal("COUNT(articles.articleID) = 0"),
    });

    res.status(200).json({
      popularTags,
      totalTags,
      unusedTagsCount: unusedTags.length,
      unusedTags,
    });
  } catch (error) {
    res.status(500).json({ message: "获取标签统计时发生错误!", error: error.message });
  }
};
