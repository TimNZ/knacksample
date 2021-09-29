const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('job', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true,autoIncrement: true},
            type: DataTypes.STRING(40),
            data: DataTypes.JSONB,
            attempt_last_outcome: DataTypes.TEXT,
            status: {type: DataTypes.STRING(20), defaultValue: 'new'},
            attempt_count: {type: DataTypes.INTEGER, defaultValue: 0 },
            attempt_last_start: DataTypes.DATE,
            retry_after: DataTypes.DATE,
            attempt_last_finish: DataTypes.DATE,
            locked: DataTypes.STRING(40)
        },
        {
            timestamps: true,
            indexes: [
            ]
        }
    );

    model.associate = models => {

    };

    model.quickCreate = (type,data) => {
        return model.create({type,data})
    }


    return model;
}