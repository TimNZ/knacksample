const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('employee_group_option_instance', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true,autoIncrement: true},
            employee_id: DataTypes.INTEGER,
            employee_group_option_id: DataTypes.INTEGER
        },
        {
            indexes: [
                { name: "idx_employeegroupoptinst_employeegroupopt", fields: ["employee_group_option_id"]},
                { name: "idx_employeegroupoptinst_employee", fields: ["employee_id"]}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}