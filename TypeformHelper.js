const database = require('./database');
const _ = require('lodash');
const bigInt = require('big-integer');
const Analytics = require('./analytics');
class TypeformHelper
{
    constructor(database,knackClient,context)
    {
        this.database = database;
        this.knackClient = knackClient;
        this.context = context;
    }

    /**
     * Process a completed survey webhook
     * @param {object} surveyResponse typeform completed survey
     */
    async processCompletedSurvey(surveyResponse)
    {
        const cohortGeneratedId = surveyResponse.form_response.hidden.cohort;
        const participantGeneratedId = surveyResponse.form_response.hidden.anonhash;
        const surveyParticipantModel = this.database.getModel('surveyParticipant');
        const surveyCohortModel = this.database.getModel('surveyCohort');
        const surveyCompletedAnswerModel = this.database.getModel('surveyCompletedAnswer');
        const jobModel = this.database.getModel('job');
        const historyModel = this.database.getModel('history');
        return surveyParticipantModel.findOne({where: {generated_id: participantGeneratedId}, 
            include: [{as: 'cohort',model: surveyCohortModel, required: true} ]})
        .then(async participant =>  {

            // Fail if no match or already responded
            if (!participant)
            {
                await historyModel.quickCreate('typeform.webhook.no_matching_participant',{participant_id: participantGeneratedId});
                throw new Error('No matching participant');
            }
            if (participant.responded)                
            {
                await historyModel.quickCreate('typeform.webhook.already_responded',{participant_id: participantGeneratedId,responded_at: participant.responded});
                return;
            }
            const organisationRecord = await this.database.getModel('organisation').findOne({where: {id: participant.cohort.organisation_id},
                include: [{as: 'partner', required: true, model: this.database.getModel('partner')}]});
            // const analytics = new Analytics({amplitude: {key: organisationRecord.partner.amplitude_key}});
            
            // analytics.track('Survey Response',{survey_participant_id: participant.id});
            // Update Knack Survey Participant record
            // TODO: Move to create knack.update_record job
            // jobModel.quickCreate('knack.update_record', {knack_id: participant.id, data: {field_71: surveyResponse.form_response.submitted_at}, type: 'survey_participant'});
            this.knackClient.viewUpdateRecord('scene_191','view_324',bigInt(participant.knack_id).toString(16),{field_71: surveyResponse.form_response.submitted_at})
            return Promise.all([
                surveyParticipantModel.update({responded: surveyResponse.form_response.submitted_at},{ where: { id: participant.id}}),
                surveyCohortModel.update({count_completed: this.database.Sequelize.literal('count_completed + 1') },{where: { id: participant.cohort.id}})
            ])
            .then(() => {
                return this.database.getModel('surveyTemplateQuestion').findAll({raw: true,where: { survey_template_id: participant.cohort.survey_template_id}})
                .then(questions => {
                    let surveyCompletedAnswerToCreate = [];
                    surveyResponse.form_response.answers.forEach(answer => {
                        let surveyQuestion = _.find(questions, { question_guid: answer.field.id});
                        if (surveyQuestion) // Don't record answers if no survey question found
                        {
                            const v = {survey_participant_id: participant.id, survey_template_question_id: surveyQuestion.id};
                            if (answer.number)
                                v.number = answer.number;
                            else if (answer.choice)
                                v.text = answer.choice.label;
                            else if (answer.text)
                                v.text = answer.text;
                            surveyCompletedAnswerToCreate.push(v)
                        }
                    })
                    return surveyCompletedAnswerModel.bulkCreate(surveyCompletedAnswerToCreate)
                })
            })
        })
    }
}

module.exports = TypeformHelper;