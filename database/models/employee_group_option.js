const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('employee_group_option', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            employee_group_id: DataTypes.INTEGER,
            name: DataTypes.STRING(50),
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [
                { name: "idx_employeegroupopt_employeegroup", fields: ["employee_group_id"]}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}