const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('survey_template_question_type', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            survey_template_question_option_id: DataTypes.INTEGER,
            name: DataTypes.STRING(100),
            sort_order: DataTypes.INTEGER,
            knack_id: DataTypes.DECIMAL
        },
        {
            indexes: [

            ]
        }
    );

    model.associate = models => {

    };

    return model;
}