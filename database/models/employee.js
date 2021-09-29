const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('employee', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            organisation_id: DataTypes.INTEGER,
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [
                {name: 'idx_employee_organisation',fields: ['organisation_id']}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}