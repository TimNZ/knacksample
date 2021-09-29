const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('employee_group', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            organisation_id: DataTypes.INTEGER,
            name: DataTypes.STRING(30),
            knack_id: DataTypes.DECIMAL

        },
        {
            indexes: [
                { name: "idx_employeegroup_organisation", fields: ["organisation_id"]}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}