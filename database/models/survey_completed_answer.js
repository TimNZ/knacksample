const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('survey_completed_answer', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true,autoIncrement: true},
            survey_participant_id: DataTypes.INTEGER,
            survey_template_question_id: DataTypes.INTEGER,
            number: DataTypes.DECIMAL,
            text: DataTypes.TEXT
        },
        {
            indexes: [
                { name: "idx_surveycompletedanswer_question", fields: ["survey_template_question_id"]},
                { name: "idx_surveycompletedanswer_participant", fields: ["survey_participant_id"]}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}