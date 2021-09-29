const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('framework', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            organisation_id: DataTypes.INTEGER,
            name: DataTypes.STRING(50),
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [
                { name: "idx_framework_organisation", fields: ["organisation_id"]}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}