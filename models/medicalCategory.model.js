module.exports = (sequelize, Sequelize) => {
  const MedicalCategory = sequelize.define("medicalCategory", {
    categoryID: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: "类别编号"
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
      comment: "类别名称"
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "描述"
    }
    // createdByStaffID 将作为外键关联在模型关系定义中处理
    // CreatedAt 和 UpdatedAt 字段 Sequelize 会自动添加
  }, {
    tableName: 'MedicalCategories',
    timestamps: true,
    comment: "医疗类别表"
  });

  return MedicalCategory;
}; 