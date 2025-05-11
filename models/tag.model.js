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
    },
    {
      tableName: "Tags",
      timestamps: true,
      updatedAt: false,
      comment: "标签表",
      indexes: [
        {
          name: "idx_tag_name",
          fields: ["tagName"],
          unique: true,
        },
      ],
    }
  );

  return Tag;
};
