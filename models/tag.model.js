module.exports = (sequelize, Sequelize) => {
  const Tag = sequelize.define(
    "tag",
    {
      tagID: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: "标签编号",
      },
      tagName: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: "标签名称",
      },
      // CreatedAt 字段 Sequelize 会自动添加, UpdatedAt 通常不需要，除非有修改标签名的需求
    },
    {
      tableName: "Tags",
      timestamps: true, // 只会创建 createdAt，如果需要 updatedAt，确保模型或业务逻辑支持修改标签名
      updatedAt: false, // 通常标签创建后不修改名称，如果需要修改，则设为true
      comment: "标签表",
    },
  );

  return Tag;
};
