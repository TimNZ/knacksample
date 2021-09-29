const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

module.exports = (sequelize,opts) => {
    const model = sequelize.define('partner', 
        {
            id: {type: DataTypes.INTEGER, primaryKey: true},
            name: DataTypes.STRING(100),
            settings: DataTypes.JSONB,
            mailgun_domain: DataTypes.STRING(100),
            mailgun_apikey: DataTypes.STRING(100),
            amplitude_key: DataTypes.STRING(100),
            clicksend_authorization: DataTypes.STRING(100),
            rebrandly_domain: DataTypes.STRING(100),
            rebrandly_apikey: DataTypes.STRING(100),
            survey_url: DataTypes.STRING(200),
            knack_app_base_url: DataTypes.STRING(200), 
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