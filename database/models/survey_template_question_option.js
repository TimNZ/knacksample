const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('survey_template_question_option', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            survey_template_question_id: DataTypes.INTEGER,
            sort_order: DataTypes.INTEGER,
            option: DataTypes.STRING(100),
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [
                {name: 'idx_surveytemplatequestionopt_question',fields: ['survey_template_question_id']}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}