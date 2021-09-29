const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('survey_template_question', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            survey_template_id: DataTypes.INTEGER,
            framework_group_id: DataTypes.INTEGER,
            framework_group_option_id: DataTypes.INTEGER,
            survey_template_question_type_id: DataTypes.INTEGER,
            question: DataTypes.TEXT,
            question_guid: DataTypes.STRING(30),
            sort_order: DataTypes.INTEGER,
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [
                {name: 'idx_surveytemplatequestion_template',fields: ['survey_template_id']},
                {name: 'idx_surveytemplatequestion_frameworkgroup',fields: ['framework_group_id']},
                {name: 'idx_surveytemplatequestion_frameworkgroupoption',fields: ['framework_group_option_id']}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}