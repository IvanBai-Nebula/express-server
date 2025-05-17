const db = require("../models");
const MedicalCategory = db.medicalCategories;
const KnowledgeArticle = db.knowledgeArticles;
const {
  asyncHandler,
  createError,
} = require("../middleware/errorHandler.middleware");

/**
 * 创建新类别
 */
exports.createCategory = asyncHandler(async (req, res) => {
  // 验证请求
  const { name, description, parentCategoryID } = req.body;

  if (!name) {
    throw createError("类别名称不能为空!", 400);
  }

  // 检查类别名是否已存在
  const existingCategory = await MedicalCategory.findOne({
    where: { name },
  });

  if (existingCategory) {
    throw createError("类别名称已存在!", 400);
  }

  // 如果提供了父类别ID，检查父类别是否存在
  if (parentCategoryID) {
    const parentCategory = await MedicalCategory.findByPk(parentCategoryID);

    if (!parentCategory) {
      throw createError("父类别不存在!", 404);
    }
  }

  // 创建新类别
  const newCategory = await MedicalCategory.create({
    name,
    description,
    parentCategoryID,
    createdByStaffID: req.userId,
  });

  res.status(201).json({
    message: "类别创建成功!",
    category: newCategory,
  });
});

/**
 * 获取所有类别
 */
exports.getAllCategories = asyncHandler(async (req, res) => {
  // 支持扁平列表或树形结构
  const { format = "flat" } = req.query;

  // 获取所有类别
  const categories = await MedicalCategory.findAll({
    order: [["name", "ASC"]],
  });

  // 如果需要树形结构
  if (format === "tree") {
    const categoriesMap = {};
    const rootCategories = [];

    // 将所有类别映射到字典
    categories.forEach((category) => {
      categoriesMap[category.categoryID] = {
        ...category.toJSON(),
        children: [],
      };
    });

    // 构建树形结构
    categories.forEach((category) => {
      const categoryWithChildren = categoriesMap[category.categoryID];

      if (
        category.parentCategoryID &&
        categoriesMap[category.parentCategoryID]
      ) {
        // 添加到父类别的children
        categoriesMap[category.parentCategoryID].children.push(
          categoryWithChildren
        );
      } else {
        // 根类别
        rootCategories.push(categoryWithChildren);
      }
    });

    return res.status(200).json(rootCategories);
  }

  // 返回扁平结构
  res.status(200).json(categories);
});

/**
 * 获取特定类别详情
 */
exports.getCategoryById = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const category = await MedicalCategory.findByPk(categoryId, {
    include: [
      {
        model: MedicalCategory,
        as: "subcategories",
        where: { isActive: true },
        required: false,
        include: [
          {
            model: MedicalCategory,
            as: "subcategories",
            where: { isActive: true },
            required: false,
          },
        ],
      },
    ],
  });

  if (!category) {
    throw createError("类别不存在!", 404);
  }

  res.status(200).json(category);
});

/**
 * 更新类别
 */
exports.updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { name, description, parentCategoryID, isActive } = req.body;

  const category = await MedicalCategory.findByPk(categoryId);

  if (!category) {
    throw createError("类别不存在!", 404);
  }

  // 如果更改名称，检查新名称是否已存在
  if (name && name !== category.name) {
    const existingCategory = await MedicalCategory.findOne({
      where: { name },
    });

    if (existingCategory) {
      throw createError("类别名称已存在!", 400);
    }
  }

  // 如果更改父类别，检查父类别是否存在
  if (parentCategoryID && parentCategoryID !== category.parentCategoryID) {
    // 防止循环依赖：不能将类别的子类别设置为其父类别
    const isCircular = await isCircularDependency(categoryId, parentCategoryID);

    if (isCircular) {
      throw createError("无法设置循环依赖的父类别!", 400);
    }

    const parentCategory = await MedicalCategory.findByPk(parentCategoryID);

    if (!parentCategory) {
      throw createError("父类别不存在!", 404);
    }
  }

  // 更新类别
  const updates = {};

  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (parentCategoryID !== undefined)
    updates.parentCategoryID = parentCategoryID;
  if (isActive !== undefined) updates.isActive = isActive;

  await category.update(updates);

  res.status(200).json({
    message: "类别更新成功!",
    category,
  });
});

/**
 * 删除类别
 */
exports.deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const category = await MedicalCategory.findByPk(categoryId);

  if (!category) {
    throw createError("类别不存在!", 404);
  }

  // 检查是否有子类别
  const childCategories = await MedicalCategory.count({
    where: { parentCategoryID: categoryId },
  });

  if (childCategories > 0) {
    throw createError("无法删除包含子类别的类别!", 400);
  }

  // 检查是否有关联的文章
  const associatedArticles = await KnowledgeArticle.count({
    where: { categoryID: categoryId },
  });

  if (associatedArticles > 0) {
    // 如果有关联文章，改为软删除（设置为非活跃）
    await category.update({ isActive: false });

    return res.status(200).json({
      message: "类别已设置为非活跃状态，因为存在关联的文章!",
      category,
    });
  }

  // 如果没有关联的文章，可以完全删除
  await category.destroy();

  res.status(200).json({ message: "类别已成功删除!" });
});

/**
 * 获取特定类别下的文章
 */
exports.getCategoryArticles = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const {
    page = 1,
    limit = 10,
    includeSubcategories = "false",
    status,
  } = req.query;

  const category = await MedicalCategory.findByPk(categoryId);

  if (!category) {
    throw createError("类别不存在!", 404);
  }

  const offset = (page - 1) * limit;
  const whereClause = {};

  // 仅包括指定状态的文章
  if (status) {
    whereClause.status = status;
  } else {
    // 不再默认只显示已发布的文章
    // whereClause.status = "Published";
  }

  let categoryIDs = [categoryId];

  // 如果需要包含子类别的文章
  if (includeSubcategories === "true") {
    const subcategoryIDs = await getAllSubcategoryIDs(categoryId);
    categoryIDs = [...categoryIDs, ...subcategoryIDs];
  }

  whereClause.categoryID = { [db.Sequelize.Op.in]: categoryIDs };

  const { count, rows } = await KnowledgeArticle.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [["publishedAt", "DESC"]],
  });

  res.status(200).json({
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    articles: rows,
  });
});

/**
 * 递归获取所有子类别ID
 */
async function getAllSubcategoryIDs(categoryId) {
  const subcategories = await MedicalCategory.findAll({
    where: { parentCategoryID: categoryId },
  });

  let ids = subcategories.map((subcat) => subcat.categoryID);

  for (const subcat of subcategories) {
    const childIds = await getAllSubcategoryIDs(subcat.categoryID);
    ids = [...ids, ...childIds];
  }

  return ids;
}

/**
 * 检查是否存在循环依赖
 * @param {number} categoryId 当前类别ID
 * @param {number} newParentId 新的父类别ID
 * @returns {Promise<boolean>} 是否存在循环依赖
 */
async function isCircularDependency(categoryId, newParentId) {
  // 使用哈希表存储已检查过的节点，提高大型类别树效率
  const visitedNodes = new Set();
  let currentNodeId = newParentId;

  // 最大深度限制，防止无限循环
  const maxDepth = 100;
  let currentDepth = 0;

  while (currentNodeId && currentDepth < maxDepth) {
    // 如果当前节点是目标节点，存在循环依赖
    if (currentNodeId === categoryId) {
      return true;
    }

    // 如果当前节点已被访问过，可以提前结束
    if (visitedNodes.has(currentNodeId)) {
      break;
    }

    // 记录已访问节点
    visitedNodes.add(currentNodeId);

    // 查找父节点
    const category = await MedicalCategory.findByPk(currentNodeId);

    // 如果没有父节点，结束
    if (!category || !category.parentCategoryID) {
      break;
    }

    // 移至父节点
    currentNodeId = category.parentCategoryID;
    currentDepth++;
  }

  // 如果到达根节点或最大深度仍未发现循环，则无循环依赖
  return false;
}
