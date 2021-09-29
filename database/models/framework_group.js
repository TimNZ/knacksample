const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('framework_group', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            framework_id: DataTypes.INTEGER,
            organisation_id: DataTypes.INTEGER,
            name: DataTypes.STRING(30),
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [
                { name: "idx_frameworkgroup_framework", fields: ["framework_id"]}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}