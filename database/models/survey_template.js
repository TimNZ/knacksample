const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('survey_template', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            organisation_id: DataTypes.INTEGER,
            framework_id: DataTypes.INTEGER,
            name: DataTypes.STRING(50),
            typeformid: DataTypes.STRING(30),
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [
                {name: 'idx_surveytemplate_organisation',fields: ['organisation_id']},
                {name: 'idx_surveytemplate_framework',fields: ['framework_id']}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}