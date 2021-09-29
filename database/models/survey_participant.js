const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('survey_participant', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            employee_id: DataTypes.INTEGER,
            survey_cohort_id: DataTypes.INTEGER,
            responded: DataTypes.DATE,
            first_sent: DataTypes.DATE,
            last_sent: DataTypes.DATE,
            participating: DataTypes.STRING(10),
            count_sent: {type: DataTypes.INTEGER, defaultValue: 0 },
            knack_id: DataTypes.DECIMAL,
            generated_id: DataTypes.STRING(20),
        },
        {
            indexes: [
                {name: 'idx_surveyparticipant_employee',fields: ['employee_id']},
                {name: 'idx_surveyparticipant_cohort',fields: ['survey_cohort_id']}
            ]
        }
    );

    model.associate = models => {
        model.belongsTo(models.surveyCohort, {as: 'cohort', constraints: false, foreignKey: 'survey_cohort_id'});
    };

    return model;
}