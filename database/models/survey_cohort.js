const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('survey_cohort', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            organisation_id: DataTypes.INTEGER,
            survey_template_id: DataTypes.INTEGER,
            name: DataTypes.STRING(100),
            stage: DataTypes.STRING(30),
            count_sent: {type: DataTypes.INTEGER, defaultValue: 0 },
            count_completed: {type: DataTypes.INTEGER, defaultValue: 0 },
            start_date: DataTypes.DATEONLY,
            generated_id: DataTypes.STRING(20),
            knack_id: DataTypes.DECIMAL,
            delivery_method: DataTypes.STRING(10),
            from_email: DataTypes.STRING(100),
            first_message: DataTypes.TEXT,
            first_message_html: DataTypes.TEXT,
            first_message_subject: DataTypes.STRING(200),
            followup_message: DataTypes.TEXT,
            followup_message_html: DataTypes.TEXT,
            followup_message_subject: DataTypes.STRING(200),
            last_message: DataTypes.TEXT,
            last_message_html: DataTypes.TEXT,
            last_message_subject: DataTypes.STRING(200),
            survey_embed_code: DataTypes.TEXT
        },
        {
            indexes: [
                {name: 'idx_surveycohort_organisation',fields: ['organisation_id']},
                {name: 'idx_surveycohort_surveytemplate',fields: ['survey_template_id']}
            ]
        }
    );

    model.associate = models => {

    };

    return model;
}