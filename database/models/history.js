const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('history', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true,autoIncrement: true},
            event: DataTypes.STRING(100),
            data: DataTypes.JSONB,
            timestamp: DataTypes.DATE
        },
        {
            indexes: [
            ]
        }
    );

    model.associate = models => {

    };
    model.quickCreate = (event,data, timestamp = new Date()) => {
        return model.create({event,data,timestamp})
    }

    return model;
}