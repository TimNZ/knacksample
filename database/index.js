const Sequelize = require('sequelize');
const _ = require('lodash');
const ModelsToLoad = {
    answer: require('./models/survey_completed_answer'),
    employeeGroupOptionInstance: require('./models/employee_group_option_instance'),
    employeeGroupOption: require('./models/employee_group_option'),
    employeeGroup: require('./models/employee_group'),
    employee: require('./models/employee'),
    frameworkGroupOption: require('./models/framework_group_option'),
    frameworkGroup: require('./models/framework_group'),
    framework: require('./models/framework'),
    organisation: require('./models/organisation'),
    surveyTemplate: require('./models/survey_template'),
    surveyTemplateQuestionType: require('./models/survey_template_question_type'),
    surveyTemplateQuestion: require('./models/survey_template_question'),
    surveyTemplateQuestionOption: require('./models/survey_template_question_option'),
    surveyTemplateQuestionOptionInstance: require('./models/survey_template_question_option_instance'),
    surveyCohort: require('./models/survey_cohort'),
    surveyParticipant: require('./models/survey_participant'),
    surveyCompletedAnswer: require('./models/survey_completed_answer'),
    partner: require('./models/partner'),
    job: require('./models/job'),
    history: require('./models/history')
    
}
class Database 
{
    constructor(connectionString)
    {
        this.sequelize = new Sequelize(connectionString,{
            dialect: 'postgres',
            logging: console.log,
            benchmark: true,
            define: {
                freezeTableName: true,
                timestamps: false
            }
        })
        this._models = {}
        _.forEach(ModelsToLoad, (initModel,key) => {
            this._models[key] = initModel(this.sequelize)
        })
        _.forEach(this.models,model => model.associate && model.associate(this.models))
    }

    test()
    {
        return this.sequelize.authenticate()
    }

    get models()
    {
        return this._models;
    }

    getModel(name)
    {
        return this.models[name];
    }

    sync(options)
    {
        return this.sequelize.sync(options);
    }

    get Sequelize()
    {
        return Sequelize;
    }

    literal(...args)
    {
        return this.sequelize.literal(...args)
    }

    selectQuery(...args)
    {
        return this.sequelize.dialect.QueryGenerator.selectQuery(...args)
    }

}

module.exports = Database;