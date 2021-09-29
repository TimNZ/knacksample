const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('framework_group_option', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            framework_group_id: DataTypes.INTEGER,
            name: DataTypes.STRING(50),
            sort_order: DataTypes.INTEGER,
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [
                { name: "idx_frameworkgroup_frameworkgroup", fields: ["framework_group_id"]}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}