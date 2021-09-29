const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('organisation', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            name: DataTypes.STRING(100),
            partner_id: DataTypes.INTEGER,
            email_template: DataTypes.TEXT,
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [
            ]
        }
    );

    model.associate = models => {
        model.belongsTo(models.partner, {as: 'partner', constraints: false, foreignKey: 'partner_id'});
    };

    return model;
}