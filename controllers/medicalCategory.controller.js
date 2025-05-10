const db = require("../models");
const MedicalCategory = db.medicalCategories;
const KnowledgeArticle = db.knowledgeArticles;

/**
 * 创建新类别
 */
exports.createCategory = async (req, res) => {
  try {
    // 验证请求
    const { name, description, parentCategoryID } = req.body;

    if (!name) {
      return res.status(400).json({ message: "类别名称不能为空!" });
    }

    // 检查类别名是否已存在
    const existingCategory = await MedicalCategory.findOne({
      where: { name },
    });

    if (existingCategory) {
      return res.status(400).json({ message: "类别名称已存在!" });
    }

    // 如果提供了父类别ID，检查父类别是否存在
    if (parentCategoryID) {
      const parentCategory = await MedicalCategory.findByPk(parentCategoryID);

      if (!parentCategory) {
        return res.status(404).json({ message: "父类别不存在!" });
      }
    }

    // 创建新类别
    const newCategory = await MedicalCategory.create({
      name,
      description,
      parentCategoryID,
      createdBy: req.userId,
    });

    res.status(201).json({
      message: "类别创建成功!",
      category: newCategory,
    });
  } catch (error) {
    res.status(500).json({ message: "创建类别时发生错误!", error: error.message });
  }
};

/**
 * 获取所有类别
 */
exports.getAllCategories = async (req, res) => {
  try {
    // 支持扁平列表或树形结构
    const { format = "flat", onlyActive = "true" } = req.query;

    // 构建查询条件
    const whereClause = {};

    if (onlyActive === "true") {
      whereClause.isActive = true;
    }

    // 获取所有类别
    const categories = await MedicalCategory.findAll({
      where: whereClause,
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

        if (category.parentCategoryID && categoriesMap[category.parentCategoryID]) {
          // 添加到父类别的children
          categoriesMap[category.parentCategoryID].children.push(categoryWithChildren);
        } else {
          // 根类别
          rootCategories.push(categoryWithChildren);
        }
      });

      return res.status(200).json(rootCategories);
    }

    // 返回扁平结构
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "获取类别列表时发生错误!", error: error.message });
  }
};

/**
 * 获取特定类别详情
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await MedicalCategory.findByPk(categoryId, {
      include: [
        {
          model: MedicalCategory,
          as: "subcategories",
          where: { isActive: true },
          required: false,
        },
      ],
    });

    if (!category) {
      return res.status(404).json({ message: "类别不存在!" });
    }

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "获取类别详情时发生错误!", error: error.message });
  }
};

/**
 * 更新类别
 */
exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, parentCategoryID, isActive } = req.body;

    const category = await MedicalCategory.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ message: "类别不存在!" });
    }

    // 如果更改名称，检查新名称是否已存在
    if (name && name !== category.name) {
      const existingCategory = await MedicalCategory.findOne({
        where: { name },
      });

      if (existingCategory) {
        return res.status(400).json({ message: "类别名称已存在!" });
      }
    }

    // 如果更改父类别，检查父类别是否存在
    if (parentCategoryID && parentCategoryID !== category.parentCategoryID) {
      // 防止循环依赖：不能将类别的子类别设置为其父类别
      const isCircular = await isCircularDependency(categoryId, parentCategoryID);

      if (isCircular) {
        return res.status(400).json({ message: "无法设置循环依赖的父类别!" });
      }

      const parentCategory = await MedicalCategory.findByPk(parentCategoryID);

      if (!parentCategory) {
        return res.status(404).json({ message: "父类别不存在!" });
      }
    }

    // 更新类别
    const updates = {};

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (parentCategoryID !== undefined) updates.parentCategoryID = parentCategoryID;
    if (isActive !== undefined) updates.isActive = isActive;

    await category.update(updates);

    res.status(200).json({
      message: "类别更新成功!",
      category,
    });
  } catch (error) {
    res.status(500).json({ message: "更新类别时发生错误!", error: error.message });
  }
};

/**
 * 删除类别
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await MedicalCategory.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ message: "类别不存在!" });
    }

    // 检查是否有子类别
    const childCategories = await MedicalCategory.count({
      where: { parentCategoryID: categoryId },
    });

    if (childCategories > 0) {
      return res.status(400).json({ message: "无法删除包含子类别的类别!" });
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
  } catch (error) {
    res.status(500).json({ message: "删除类别时发生错误!", error: error.message });
  }
};

/**
 * 获取特定类别下的文章
 */
exports.getCategoryArticles = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10, includeSubcategories = "false", status } = req.query;

    const category = await MedicalCategory.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ message: "类别不存在!" });
    }

    const offset = (page - 1) * limit;
    const whereClause = {};

    // 仅包括指定状态的文章
    if (status) {
      whereClause.status = status;
    } else {
      // 默认只显示已发布的文章
      whereClause.status = "Published";
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
  } catch (error) {
    res.status(500).json({ message: "获取类别文章时发生错误!", error: error.message });
  }
};

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
 */
async function isCircularDependency(categoryId, newParentId) {
  // 检查是否将类别设置为自身的父类别
  if (categoryId === newParentId) {
    return true;
  }

  // 递归检查所有父类别
  let currentParentId = newParentId;

  while (currentParentId) {
    const parentCategory = await MedicalCategory.findByPk(currentParentId);

    if (!parentCategory) {
      return false;
    }

    // 如果父类别的父类别是当前类别，则存在循环依赖
    if (parentCategory.parentCategoryID === categoryId) {
      return true;
    }

    currentParentId = parentCategory.parentCategoryID;
  }

  return false;
}
