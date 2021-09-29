const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('survey_template_question_option_instance', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true,autoIncrement: true},
            survey_template_question_id: DataTypes.INTEGER,
            survey_template_question_option_id: DataTypes.INTEGER
        },
        {
            indexes: [
                {name: 'idx_surveytemplatequestionoptinst_question',fields: ['survey_template_question_id']},
                {name: 'idx_surveytemplatequestionoptinst_option',fields: ['survey_template_question_option_id']},
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}