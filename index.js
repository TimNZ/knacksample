'use strict';
require('datejs');
const KnackClient = require('./knack');
const _ = require('lodash');
const Mailgun = require('mailgun-js');
const rp = require('request-promise');
const async = require('async');
const TypeformHelper = require('./TypeformHelper');
const KnackDatabase = require('./KnackDatabase');
const handlebars = require('handlebars');	
const fs = require('fs');
const uuid = require('uuid');
const bigInt = require('big-integer');
const EventEmitter = require('events').EventEmitter;
const {ProcessingError} = require('./errors');
const ServerStats = require('./ServerStats');

// TODO: Secure store of credentials

const KnackApplicationID = process.env.APP_KNACK_APP_ID;
const KnackAPIKey = process.env.APP_KNACK_API_KEY;
const MailgunAPIKey = process.env.APP_MAILGUN_KEY;
const MailgunDomain = process.env.APP_MAILGUN_DOMAIN;
const ClicksendAuthorization = process.env.APP_CLICKSEND_AUTH;
const RebrandlyAPIKey = process.env.APP_REBRANDLY_API_KEY;
const RebrandlyDomain = "cmch.co";
const AmplitudeKey = process.env.APP_AMPLITUDE_KEY;
const PostgresConnectionString = process.env.APP_POSTGRES_CONNECTION;
const AdminEmail = process.env.APP_ADMIN_EMAIL;

const Analytics = require('./analytics');
const Database = require('./database');

const log = (...args) => {
	console.log(...args);
}
/**
 * Populate Survey Participants for a Survey Cohort
 * @param {Object} request Express request object - http://expressjs.com/en/4x/api.html#req
 * @param {Object} response Express response object - http://expressjs.com/en/4x/api.html#res
 */

let database = new Database(PostgresConnectionString);
process.on('unhandledRejection', error => {
  		log('unhandledRejection', error.message,error.stack);
});	

const serverStats = new ServerStats();


const init = (request,response) => {
	request.call_id = uuid.v4();
}
const createAnalyticsInstance = key => new Analytics({amplitude: {key: AmplitudeKey}});
const logApiCall = async (name,data,request,response) => {
	const call = {name, id: request.call_id, data, request: _.pick(request,'call_id','body','query','headers','method','ip')};
	serverStats.startedApiCall(call);
	createHistory('api.call',call);
}

const createJob = async (type,data) => {
	return database.getModel('job').quickCreate(type,data);
}

const createHistory = async (event,data,timestamp) => {
	return database.getModel('history').quickCreate(event,data,timestamp);
}

exports.serverStats = (request,response) => {
	const state = serverStats.toJSON();
	const returnStats = {
		jobs: { processorRunning: state.jobs.processorRunning,lastLoopRun: state.jobs.lastLoopRun, running: Array.from(state.jobs.running.values())},
		apiCalls: { running: Array.from(state.apiCalls.running.values())}
	};
	response.send(returnStats);
}
exports.dummyApiCall = (request,response) => {
	init(request,response);
	logApiCall('dummyApiCall',{item: 'value'},request,response);
	setTimeout(() => {
		serverStats.stoppedApiCall(request.call_id);
		response.send({success: true});
	},10000);	
}

exports.jobProcessor = (request,response) => {
	switch(request.query.action)
	{
		case 'start':
			try
			{
				jobProcessor.start();
			}
			catch(err)
			{

			}
			return response.send({success: true});
		case 'stop':
			return jobProcessor.stop()
			.then(() => {
				response.send({success: true});
			});
		case 'getState':
			return response.send(_.pick(serverStats.get('jobs'),['processorRunning','lastLoopRun']));
		case 'setTypes':
			processorJobTypes = request.query.jobtypes
			return response.send({jobTypes: processorJobTypes.split(','),..._.pick(serverStats.get('jobs'),['processorRunning','lastLoopRun'])});
			break
		default:
			return response.send({error: 'unknown action'});
	}
}

exports.convertKnackId = (request,response) => {
	response.send(convertFromKnackId(request.query.id))
}
exports.getSurveyParticipants = (request,response) => {
	init(request,response);
	knackGetSurveyParticipants(request.query.cohortid,{userToken: request.query.usertoken})
	.then(result => response.send(result))
    .catch(err => {
      response.status(422).send(err);
    })

}
exports.populateSurveyParticipants = async (request, response) => {
	init(request,response);
	await logApiCall('populateSurveyParticipants',null,request,response);
	return createJob('prepare_survey',request.body)
	.then(result => response.send(result))
    .catch(err => {
      response.status(422).send(err.stack);
    })
};

exports.databaseSyncSchema = async (request,response) => {
	init(request,response);
	await logApiCall('databaseSyncSchema',null,request,response);
	let p = null;
	if (request.query.models)
	{
		const force = _.get(request.query,'force','0') == '1';
		const modelNames = request.query.models.split(',')
		p = Promise.all(modelNames.map(modelName => { return database.getModel(modelName).sync({force})}))
	}
	else
		p = database.sync({});

	return p
	.then(() => response.send({success: true}))
	.catch(err => response.status(422).send(err.message))
}



let dashboardHtml;
exports.dumbDashboard = (request,response) => {
	init(request,response);
	if (!dashboardHtml)
		dashboardHtml = fs.readFileSync('./views/dashboard.html','utf8');
	response.send(renderTemplate(dashboardHtml,{host: request.headers.host, 
		jobProcessor: { ..._.pick(serverStats.toJSON().jobs,['processorRunning','lastLoopRun']), 
			adminEmail: process.env.CM_ADMIN_EMAIL || AdminEmail,
			jobTypes: processorJobTypes}}));
}


exports.databaseSyncFromKnack = async (request,response) => {
	init(request,response);
	await logApiCall('databaseSyncFromKnack',null,request,response);
	let tables = ['partner','organisation','employee_group','employee_group_option','employee','framework','framework_group',
                'framework_group_option','survey_template','survey_cohort','survey_participant',
				'survey_template_question_type','survey_template_question_option','survey_template_question'
				];

	if (request.query.tables)
		tables = request.query.tables.split(',')
	const truncateTable = request.query.truncate ? request.query.truncate == 'true' : true
	return createJob('sync_from_knack',{tables, truncate_table: truncateTable})
	.then(result => response.send({success: true}))
	.catch(err => response.status(422).send(err.message));
}


exports.databaseTest = async (request,response) => {
	init(request,response);
	database.test()
	.then(_ => {
		return database.getModel('employee').findAll({limit: 10,raw: true})
	})
	.then(results => {
		response.send({employees: results});
	})
	.catch(err => response.status(422).send(err.message));
}

exports.updateSurveyParticipantsFirstSent = async (request, response) => {
	init(request,response);
	await logApiCall('updateSurveyParticipantsFirstSent',null,request,response);
	return createJob('update_survey_participants_first_sent',request.body)
	.then(result => response.send({success: 'true'}))
	.catch(err => response.status(422).send(err.message))
};
/**
 * Send 
 * @param {*} request 
 * @param {*} response 
 */
exports.sendInviteToSurveyParticipants = async (request, response) => {
	init(request,response);
	await logApiCall('sendInviteToSurveyParticipants',null,request,response);

	return createJob('send_survey_invite',request.body)
	.then(result => response.send({success: 'true'}))
	.catch(err => response.status(422).send(err.message))
};

exports.databaseSyncRecordFromKnack = async (request,response) => {
	init(request,response);
	await logApiCall('databaseSyncRecordFromKnack',null,request,response);
	let objectId = request.body.object_id;
	let data = request.body.data;
	let action = request.body.action;

	let knackDatabase = new KnackDatabase(database,knackClientInstance());
	let tableMapping = knackDatabase.getMappingByObjectId(objectId);
	
	const p = ['create','update'].includes(action)
	? knackDatabase.syncRecordFromKnack(tableMapping,data)
	: knackDatabase.removePostgresRecord(tableMapping,data);

	p
	.then(result => response.send({success: true}))
	.catch(err => response.status(422).send(err.message));

}
exports.processCompletedTypeformSurvey = async (request,response) => {
	init(request,response);
	await logApiCall('processCompletedTypeformSurvey',null,request,response);

	// const typeFormHelper = new TypeformHelper(database, knackClientInstance());
	// return typeFormHelper.processCompletedSurvey(request.body)
	createJob('process_completed_survey',{survey_response: request.body})
	.then(result => response.send(result))
	.catch(err => response.status(422).send(err.message));	
}

exports.shortenURL = (request,response) => {
	shortenURL(request.query.url)
	.then(result => response.send(result.shortUrl))
	.catch(err => response.status(422).send(err.message))
}

exports.sendSMS = (request,response) => {
	sendSingleSMS(request.body.phone,request.body.message)
	.then(result => response.send(result))
	.catch(err => response.status(422).send(err))
}

exports.testKnackPaging = (request,response) => {
	knackGetSurveyParticipants(request.query.cohortid,{retrieveAllPages: false,pageCallback: (result) => console.log(result),userToken: request.query.usertoken,})
	.then(result => response.send(result))
}

async function knackUpdateSurveyParticipantsFirstSent(data)
{
	const cohortId = data.cohortid;
	const organisationId = data.orgid;
	const filters = {match: 'and', rules:[
				{"field":"field_128","operator":"is","value":"Yes","field_name":"Participating"}, // Participating
				{"field":"field_66", "operator":"is", "value":cohortId}, // Survey Cohort ID
				{"field": "field_68","operator": "is blank"}, // first sent blank
				{"field": "field_71","operator": "is blank"}]}; // Not responded
	const organisationRecord = await database.getModel('organisation').findOne({where: {knack_id: convertFromKnackId(organisationId)},
		include: [{as: 'partner', required: true, model: database.getModel('partner')}]});
	const partnerSettings = organisationRecord.partner.dataValues || {};
	await createHistory('updateSurveyParticipantsFirstSent.get_participants');
	return knackGetSurveyParticipants(cohortId,{filters,unsecured: true,requestCallback: function() { console.log(arguments)},
		filters}) // No response timestamp
	.then(async participants => {
		await createHistory('sendinvitetosurveyparticipants.got_participants',{count: participants.records.length});
		return new Promise((resolve,reject) => {
			async.eachSeries(participants.records, async (participant) => {
				let updateData = {}
				if (!participant.field_68_raw)
					updateData.field_68 = new Date().toString('MM/dd/yyyy');
				updateData.field_69 = new Date().toString('MM/dd/yyyy');
				updateData.field_72 = (participant.field_72 || 0 ) + 1;
				return createJob('knack.update_record', {knack_id: participant.id, data: updateData, type: 'survey_participant'});
			},
			err => {
				resolve();				
			})
		})
	})

}

async function syncSurveyParticipantsFromKnack(cohortId)
{
	const historyModel = database.getModel('history');
}
async function sendInviteToSurveyParticipants(data)
{
	const cohortData = data.cohort;
	const onlyFirstTime = data.onlyFirstTime;
	const messageNumber = _.toSafeInteger(data.messageNumber) || 1;
	const typeFormId = cohortData.field_136_raw;
	const cohortGenId = cohortData.field_154_raw;
	const cohortId = cohortData.id;
	const cohortAutoId = cohortData.field_165;
	const organisationRecord = await database.getModel('organisation').findOne({where: {knack_id: convertFromKnackId(_.get(cohortData,'field_33_raw.0.id'))},
		include: [{as: 'partner', required: true, model: database.getModel('partner')}]});
	const partnerSettings = organisationRecord.partner.dataValues || {};
	const deliveryMedium = cohortData.field_117_raw; // Email or SMS
	const surveyUrl = `${organisationRecord.partner.settings.survey_url || 'https://labs.knack.com/expotential#survey/'}?survey=${typeFormId}&cohort=${cohortGenId}`;
	const filters = {match: 'and', rules:[
				{"field":"field_128","operator":"is","value":"Yes","field_name":"Participating"}, // Participating
				{"field":"field_66", "operator":"is", "value":cohortId}, // Survey Cohort ID
				{"field": "field_71","operator": "is blank"}]}; // Not responded
	if (onlyFirstTime)
		filters.rules.push({"field": "field_68","operator": "is blank"})

	// TODO: Shift to using DB synced data
	// const surveyParticipantModel = database.getModel('surveyParticipant');
	// const participantsWhere = {participating: 'Yes', survey_cohort_id: cohortAutoId, responsed: { [database.Sequelize.Op.eq]: null}};
	// if (onlyFirstTime)
	// 	participantsWhere.first_time = { [database.Sequelize.Op.eq]: null};
	// const participants = await surveyParticipantModel.findAll({raw: true,where: {generated_id}})
	await createHistory('sendinvitetosurveyparticipants.get_participants');
	return knackGetSurveyParticipants(cohortId,{unsecured: true,requestCallback: function() { console.log(arguments)},
		filters}) // No response timestamp
	.then(async participants => {
		await createHistory('sendinvitetosurveyparticipants.got_participants',{count: participants.records.length});
		return new Promise((resolve,reject) => {
			async.eachLimit(participants.records,10,(participant,cb) => {
				const anonHash = participant.field_144_raw;
				participant.surveyUrl = `${surveyUrl}&anonhash=${anonHash}`;
				if (deliveryMedium == 'Email' || _.isEmpty(participant.field_138_raw)) // Revert to Email if no phone number
					cb();
				else // SMS
				{
					shortenURL(participant.surveyUrl,{domain: partnerSettings.rebrandly_domain, api_key: partnerSettings.rebrandly_apikey})
					.then(result => {
						participant.shortUrl = result.shortUrl;
						cb();
					})
				}
			},
			err => {
				if (err) reject(err); else resolve(participants);
			})
		})
		.then(async participants => {
				console.log(participants);
				// Cycle through all participants sending SMS or email
				const smsToSend = [];
				const emailToSend = [];
				// const surveyCohortRecord = await this.database.getModel('surveyCohort').findOne({raw: true, where: { id: cohortAutoId}});
				participants.records.forEach(async participant => {
					// participant.employee = await database.getModel('employee').findOne({raw: true,where: {'knack_id': convertFromKnackId(_.get(participant,'field_67_raw.0.id'))}})
					if (participant.shortUrl) 
					{
						const sms = buildSurveySMS(messageNumber,cohortData,participant);
						smsToSend.push(sms);
					}
					else
					{
						const email = buildSurveyEmail(messageNumber,cohortData,participant,{survey_url: partnerSettings.survey_url});
						emailToSend.push(email);
					}
				})
				let p = [];
				p.push(smsToSend.length ? queueGroupSMS(smsToSend,partnerSettings.id) : Promise.resolve([]));
				p.push(emailToSend.length ? queueEmails(emailToSend,partnerSettings.id) : Promise.resolve([]));
				return Promise.all(p)
				.then(async results => {
					await new Promise((resolve,reject) => {
						async.eachSeries(participants.records, async (participant) => {
							let updateData = {}
							if (!participant.field_68_raw)
								updateData.field_68 = new Date().toString('MM/dd/yyyy');
							updateData.field_69 = new Date().toString('MM/dd/yyyy');
							updateData.field_72 = (participant.field_72 || 0 ) + 1;
							await createJob('knack.update_record', {data: updateData, knack_id: participant.id,type: 'survey_participant'});							
						},
						err => {
							err ? reject(err) : resolve();
						})

					})
					await createJob('knack.update_record', {data: { field_122: 'Survey Sent', field_35: (cohortData.field_35 || 0) + 1}, update_database: true, knack_id: cohortData.id,type: 'survey_cohort'});							
					await createHistory('sendinvitetosurveyparticipants.completed',{ smsQueued: smsToSend.length, emailsQueued: emailToSend.length});
				})
		})
	})
}

function renderTemplate(content,data)
{
	return handlebars.compile(content)(data);
}
function getCohortMessageSettings(messageNumber, cohort, deliveryMedium)
{
	messageNumber = _.toSafeInteger(messageNumber) || 1;
	if (deliveryMedium == 'SMS')
		return [{text: cohort.field_123},{text: cohort.field_124},{text: cohort.field_125}][messageNumber-1];
	else // email
		return [{text: cohort.field_123, subject: cohort.field_161, html: cohort.field_158},{subject: cohort.field_162, text: cohort.field_124, html: cohort.field_159},{subject: cohort.field_163, text: cohort.field_125, html: cohort.field_160}][messageNumber-1];
}
function buildSurveySMS(messageNumber,cohort,participant)
{
	
	const sms = { custom_string: participant.id, to: participant.field_138_raw, 
		body: renderTemplate(getCohortMessageSettings(messageNumber,cohort,'SMS').text,{ cohort,participant,shortUrl: participant.shortUrl})}
	return sms;
}

function buildSurveyEmail(messageNumber,cohort,participant,settings)
{
	const messageSettings = getCohortMessageSettings(messageNumber,cohort,'Email');
	const surveyUrl = renderTemplate(`${settings.survey_url || 'https://labs.knack.com/expotential#survey/'}?survey={{ cohort.field_136_raw }}&cohort={{ cohort.field_154_raw}}&anonhash={{ participant.field_144_raw}}`,{cohort,participant})
	const templateData = {cohort,participant,surveyUrl, anonhash: participant.field_144_raw, extraParams: `cohort=${cohort.field_154_raw}&anonhash=${participant.field_144_raw}`};
	// EXPLICIT regexp replace of typeform survey url
	const surveySnippet = renderTemplate(cohort.field_164_raw.replace(/https?:\/\/[A-Za-z0-9_\-]+\.typeform.com\/to\/[A-Za-z0-9]{6}\??/gi,'{{{ surveyUrl }}}&'),templateData);
	templateData.surveySnippet = surveySnippet;
	const renderedMessage = renderTemplate(messageSettings.html, templateData);
	const email = {from: cohort.field_141_raw, subject: renderTemplate(messageSettings.subject,templateData),
		to: participant.field_137_raw,
		html: renderTemplate(cohort.field_181_raw,{...templateData,message: renderedMessage})};
	return email;

}


// Knack related operations

async function syncKnackSurveyParticipantToDatabase(knackData)
{
	return syncKnackObjectToDatabase('object_17',knackData);
}

async function syncKnackSurveyCohortToDatabase(knackData)
{
	return syncKnackObjectToDatabase('object_11',knackData);
}

async function syncKnackObjectToDatabase(objectId,knackData)
{
	let knackDatabase = new KnackDatabase(database,knackClientInstance());
	let tableMapping = knackDatabase.getMappingByObjectId(objectId);
	return knackDatabase.syncRecordFromKnack(tableMapping,knackData);
}

function knackClientInstance()
{
	return new KnackClient({app_id: KnackApplicationID,api_key: KnackAPIKey,database });
}

function knackGetSurveyParticipants(cohortId,{filters,requestCallback,unsecured = false,retrieveAllPages = false, page = 1, pageCallback, rowsPerPage = 1000,forceView = false,userToken} = {})
{
	if (userToken || forceView || !unsecured)
	{
		return knackClientInstance().viewFindRecords('scene_162','view_294',{idKey: 'survey-participants_id', 
			filters,rows_per_page: rowsPerPage, page, retrieveAllPages,pageCallback,requestCallback,
			idValue: cohortId, userToken});
	}
	else
		return knackClientInstance().viewFindRecords('scene_189','view_322',{
			unsecured,
			filters: filters || {match: 'and', rules:[{"field":"field_66","operator":"is","value":cohortId}]},
			rows_per_page: rowsPerPage, page, retrieveAllPages,pageCallback,requestCallback})
}


async function knackPopulateSurveyParticipants(organisationId,cohortId,{userToken,notificationsEmail,callback} = {})
{
	const historyModel = database.getModel('history');
	const jobModel = database.getModel('job');

	if (!organisationId || !cohortId)
		throw new ProcessingError('Missing organisation id or cohort id','populate_survey_participant', {organisationId,cohortId},true);


	let surveyParticipantsFilter = null;
	const organisationRecord = await database.getModel('organisation').findOne({where: {knack_id: convertFromKnackId(organisationId)},
		include: [{as: 'partner', required: true, model: database.getModel('partner')}]});
	const cohortRecord = await database.getModel('surveyCohort').findOne({where: {knack_id: convertFromKnackId(cohortId)}});
	if (!userToken)
	{
		surveyParticipantsFilter = {match: 'and', rules:[
					// {"field":"field_128","operator":"is","value":"Yes","field_name":"Participating"}, // Participating
					{"field":"field_66", "operator":"is", "value":cohortId}, // Survey Cohort ID
					// {"field": "field_71","operator": "is blank"}
					]}; // Not responded
	}		
	
	return Promise.all([knackGetOrganisationEmployees(organisationId,{userToken}),knackGetSurveyParticipants(cohortId,{filters: surveyParticipantsFilter, userToken})])
	.then(async results => {
		await createHistory('prepare_survey.retrieve_records', {employee_count: results[0].records.length, existing_participants_count: results[1].records.length});
		const knackEmployees = results[0].records;
		const knackExistingParticipants = results[1].records;
		let participantsToBeCreatedCount = 0;
		await new Promise((resolve,reject) => {
			async.eachSeries(knackEmployees, async employee => {
				if (!_.find(knackExistingParticipants, ep => ep.field_67_raw[0].id == employee.id))
				{
					await createJob('knack.create_record', {data: { field_66: cohortId, field_67: employee.id},type: 'survey_participant'});
					participantsToBeCreatedCount++;
				}
			}, err => err ? reject(err) : resolve()) 
		})
		await createHistory('prepare_survey.create_participants_start', {participants_to_add_count: participantsToBeCreatedCount});
		await createJob('knack.update_record', {knack_id: cohortId,data: { field_122: 'Participants selected'},type: 'survey_cohort'});
		await queueEmails([{
			from: 'mitch@mitcholson.co.nz', to: notificationsEmail || 'mitch@mitcholson.co.nz',
			subject: 'Your survey is being prepared', 
			html: `${organisationRecord.partner.knack_app_base_url}/#survey-cohorts/edit-survey-cohort2/${cohortId}/process/${cohortId}/`
		}], organisationRecord.partner.id);
	})
	
}

function knackGetOrganisationEmployees(organisationId,{userToken,rowsPerPage = 1000,requestCallback} = {})
{
	if (userToken)
		return knackClientInstance().viewFindRecords('scene_1','view_223',{userToken,rows_per_page: rowsPerPage});
	else
		return knackClientInstance().viewFindRecords('scene_189','view_329',
			{filters: {match: 'and', rules:[{"field":"field_5","operator":"is","value":organisationId}]},rows_per_page: rowsPerPage})
}

function knackCreateSurveyParticipant(cohortId,employeeId,{userToken, requestCallback} = {})
{
	const payload = {
			field_66: cohortId,
			field_67: employeeId
		};
	return knackClientInstance().viewCreateRecord('scene_189','view_323',payload,{requestCallback} )
}
function knackUpdateSurveyParticipant(surveyParticipantId,data,{userToken, requestCallback} = {})
{
	return knackClientInstance().viewUpdateRecord('scene_191','view_324',surveyParticipantId,data, {unsecured: true,requestCallback});
}

function knackUpdateSurveyCohort(cohortId,data,{userToken, requestCallback} = {})
{
	// return knackClientInstance().viewUpdateRecord('scene_192','view_325',cohortId,data,{userToken,requestCallback});
	return knackClientInstance().viewUpdateRecord('scene_169','view_282',cohortId,data,{userToken,requestCallback});
}



function knackGetApplicationDetails(applicationId)
{
	return knackClientInstance().applicationDetails(applicationId);
}


// UTILITY FUNCTIONS

function apiCall(opts,{retryInterval = 100} = {})
{
	const optsCopy = Object.assign({},opts);
	optsCopy.resolveWithFullResponse = true;
  return rp(optsCopy)
  .then(response => {
    return response.body;
  })
  .catch(response => {
    if (response.statusCode == 429 ) // Rate limit hit
		{
			return sleep(retryInterval)
			.then(() => apiCall(opts,{retryInterval}))		
		}
		throw response;
  });
}



const queueEmails = async (emails,partnerId) => {
	return new Promise((resolve,reject) => {
		async.eachSeries(emails, 
			(email,done) => {
				createJob('send_email', {email: email, partner_id: partnerId})
				.then(() => {
					done();
				})
			},
			err => {
				err ? reject(err) : resolve(emails)
			})
	})
}
function sendEmails(emails,settings)
{
	emails.forEach(email => {
		sendEmail(email,settings)
	})
	return emails;
}

function mailgunInstance({api_key = MailgunAPIKey, domain = MailgunDomain} = {})
{
  return Mailgun({apiKey: api_key, domain})
}
// work-in-progress function to alternative send messages via email
// will need to construct the data payload differently 
// I think this only allows up to 1,000 emails to be sent in any one call.  Will need to build in pagination model at some point.
async function sendEmail(data,settings) {

	var mailgun = mailgunInstance(settings);
	return mailgun.messages().send(data)
	.then(async result => {
		await createHistory('sent_email', {email: data, result})
		return result;
	})
	.catch(async err => {
		await createHistory('send_email.error', {email: data, error: err})
		throw err;
	})
}

async function sendAdminEmail(data,settings)
{
	const message = data.message + (data.err ? `\n\n${data.err.message}\n\n${data.err.stack}` : '')
	const emailData = {from: AdminEmail, to: AdminEmail, subject: data.subject || 'Expotential Admin Email', text: message }
	if (process.env.CM_ADMIN_EMAIL)
		emailData.to = process.env.CM_ADMIN_EMAIL;
	return sendEmail(emailData,settings)
}

function shortenURL(longURL,{domain = RebrandlyDomain, api_key = RebrandlyAPIKey} = {}) {

	return apiCall({
			uri: "https://api.rebrandly.com/v1/links",
			method: "POST",
			body: {
				"destination" : longURL,
				"domain": { "fullName": domain }
				},
			headers: {
				"Content-Type": "application/json",
				"apikey": api_key
			},
			json: true
    })
}

const queueGroupSMS = async (payload,partnerId) =>
{
	const historyRecord = await createHistory('queue_group_sms',{payload,partnerId});
	await createJob('send_group_sms',{payload,partner_id: partnerId,history_id: historyRecord.id});
	return payload;
}
function sendGroupSMS(payloadArray,{authorization = ClicksendAuthorization} = {}) {
  
	return apiCall({
		"uri": "https://rest.clicksend.com/v3/sms/send",
		"method": "POST",
		"headers": {
			"Content-Type": "application/json",
			"Authorization": authorization
		},
		body: {messages: payloadArray},
		json: true
	});   
}

function sendSingleSMS(phoneNumber, message,{authorization = ClicksendAuthorization} = {}) {
  
	return apiCall({
		"uri": "https://rest.clicksend.com/v3/sms/send",
		"method": "POST",
		"headers": {
			"Content-Type": "application/json",
			"Authorization": authorization
		},
		body: {messages: [{body: message, to: phoneNumber}]},
		json: true
	}); 
}

const sleep = ms => new Promise((resolve) => setTimeout(resolve,ms))
const convertFromKnackId = x => bigInt(x,16).toString()
let processorJobTypes = process.env.CM_JOB_TYPES

class JobProcessor extends EventEmitter
{
    constructor(options,database)
    {
        super();
        this._options = options;
		this._instanceId = process.env.CM_JP_INSTANCEID || uuid.v4();
        this._running = false;
		this._partnerModel = database.getModel('partner');
		this._jobModel = database.getModel('job');
		this._historyModel = database.getModel('history');
		this._concurrentJobs = 1;
		this._inError = false;
		
    }

    start()
    {
		const self = this;
		if (this._running)
		{
			log('JobProcessor is already running')
			throw new Error('JobProcessor is already running')
		}

		log('JobProcessor init');
        this._running = true;
		return this._jobModel.update({status: 'new',locked: null },
			{
				where: {
					status: 'processing',locked: this._instanceId
				}
			})
		.then(() => {
			if (self._inError)
			{
				sendAdminEmail({err,message: 'JobProcessor started after succesfull DB connection.'});
				self._inError = false;
			}
			log('JobProcessor starting loop');
			this.loop();
		})
		.catch(err => {
			if (!this._inError)
				sendAdminEmail({err,message: 'Error starting JobProcessor.  Will retry every 30 seconds.  An email will be sent on successful re-connection'})
			this._inError = true
			setTimeout(() => this.start(), 30 * 1000);
		})
		
    }

	
	loop()
	{
		const self = this;
		log('JobProcessor loop run')
		serverStats.set('jobs.lastLoopRun',new Date());
		serverStats.set('jobs.processorRunning',true);
		if (this._stop)
			return this._stop.resolve();
		const jobFilter = {status: ['new','retry'],retry_after: { $or: [{$eq: null},{$lt: new Date()}]}};
		if (processorJobTypes)
		{
			const types = _.compact(processorJobTypes.split(','));
			if (!_.isEmpty(types))
				jobFilter.type = types;
		}
		const subquerySql = database.selectQuery('job',{attributes: ['id'], limit: 5,where: jobFilter})
		try
		{
			this._jobModel.update({locked: this._instanceId, status: 'processing'},{returning: true, order: [['id','ASC']],
				where: {id: {$in: database.literal(`(${subquerySql.slice(0,-1)})`)}}})
			.then(([count,rows]) => {
				if (self._inError)
				{
					sendAdminEmail({message: 'JobProcessor loop job query succesfull after DB connection issue.'});
					self._inError = false;
				}
				async.eachSeries(rows,
					self.processJob.bind(self),
					err => {
						setTimeout(self.loop.bind(self),count == this._concurrentJobs ? 0 : 100);
					})
			})
			.catch(err => {
				processError(err);
			})
		}
		catch(err)
		{
			processError(err)
		}

		function processError(err)
		{
			log('JobProcesor loop update() error',err.message);
			if (!self._inError)
				sendAdminEmail({message: 'JobProcessor loop job update error, likely a DB connection issue.  Re-attempting every 30 seconds.  An email will be sent once the DB connection has been restored'});
			self._inError = true
			setTimeout(self.loop.bind(self),30 * 1000);
		}
	}

    stop()
    {
		log('JobProcessor stopping')
        return new Promise((resolve,reject) => {
            this._stop = {resolve,reject};
			const x = setInterval(() => {
				if (!this._running)
				{
					clearInterval(x);
					resolve();
				}
			})
        })
		.then(() => {
			this._running = false;
			this._stop = null;
			this._inError = false;
			serverStats.set('jobs.processorRunning',false);
			log('JobProcessor stopped');
			
		})
    }

    async processJob(job)
	{
		log(`Processing job ${job.id}`);
		await job.set({attempt_count: job.attempt_count + 1, attempt_last_start: new Date()});
		await job.save();
		await this._historyModel.quickCreate('job.start', {type: job.type, job_id: job.id});
		let partner = null;
		if (job.data.partner_id)
			partner = await this._partnerModel.findById(job.data.partner_id);
		
		try
		{

			switch(job.type)
			{
				case 'knack.update_record':
					await this.knackUpdateRecord(job.data);
					break;
				case 'knack.create_record':
					await this.knackCreateRecord(job.data);
					break;
				case 'update_survey_participants_first_sent':
					await knackUpdateSurveyParticipantsFirstSent(job.data);
					break;
				case 'sync_from_knack':
					await new KnackDatabase(database,knackClientInstance()).syncToPostgres({tables: job.data.tables,truncateTable: job.data.truncate_table});
					break;
				case 'process_completed_survey':
					const typeFormHelper = new TypeformHelper(database, knackClientInstance());
					await typeFormHelper.processCompletedSurvey(job.data.survey_response);
					break;
				case 'prepare_survey':
					await knackPopulateSurveyParticipants(job.data.orgid,job.data.cohortid,{ notificationsEmail: _.get(job.data,'user.email')});
					break;
				case 'send_survey_invite':
					await sendInviteToSurveyParticipants(job.data);
					break;
				case 'send_email':
					await sendEmail(job.data.email,{api_key: partner.mailgun_apikey, domain: partner.mailgun_domain});
					break;
				case 'send_group_sms':
					await sendGroupSMS(job.data.payload,{authorization: partner.clicksend_authorization});
					break;
			}
			job.set({status: 'completed', locked: null,attempt_last_finish: new Date()});
			await this._historyModel.quickCreate('job.completed',{type: job.type, job_id: job.id});
		}
		catch(err) {
			const status = job.attempt_count > 5 || err.fatal ? 'error' : 'retry';
			job.set({attempt_last_outcome: err.message,status: status, locked: null,attempt_last_finish: new Date(), retry_after: status == 'retry' ? new Date().addMinutes(5) : null});
			await this._historyModel.quickCreate('job.error',{type: job.type, job_id: job.id, error: _.pick(err,['code','stack','message','data'])});
		}
		await job.save();
		
	}

	async knackUpdateRecord(data)
	{
		switch(data.type)
		{
			case 'survey_participant':
				return knackUpdateSurveyParticipant(data.knack_id,data.data)
				.then(async result => {
					await syncKnackSurveyParticipantToDatabase(result.record);
					return result;

				})
			case 'survey_cohort': 
				return knackUpdateSurveyCohort(data.knack_id,data.data)
				.then(async result => {
					await syncKnackSurveyCohortToDatabase(result.record);
					return result;
				})
		}
	}

	async knackCreateRecord(data)
	{
		switch(data.type)
		{
			case 'survey_participant':
				return knackCreateSurveyParticipant(data.data.field_66,data.data.field_67)
				.then(async result => {
					await syncKnackSurveyParticipantToDatabase(result.record);
					return result;
				})
		}
	}

}

// Run 
const jobProcessor = new JobProcessor({},database);
if (!process.env.CM_NOJOBS)
{
	log('Starting JobProcessor');
	jobProcessor.start();
}

