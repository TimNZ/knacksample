const async = require('async');
const _ = require('lodash');
const bigInt = require('big-integer');

const sortOrderTransform = (value,context) => !_.isNumber(value) ? 0 : value
const Mappings = {
    partner: {
        object_id: 'object_19',
        // find_records_view: { scene_key: 'scene_76', view_key: 'view_116'},
        model: 'partner',
        fields: [
            {knack_path: 'field_182',db_column: 'id'},
            {knack_path: 'field_87',db_column: 'name'},
            {knack_path: 'field_175_raw', db_column: 'survey_url'},
            {knack_path: 'field_169_raw', db_column: 'mailgun_apikey'},
            {knack_path: 'field_170_raw', db_column: 'mailgun_domain'},
            {knack_path: 'field_171_raw', db_column: 'clicksend_authorization'},
            {knack_path: 'field_172_raw', db_column: 'rebrandly_apikey'},
            {knack_path: 'field_176_raw', db_column: 'rebrandly_domain'},
            {knack_path: 'field_173_raw', db_column: 'amplitude_key'},
            {knack_path: 'field_183_raw', db_column: 'knack_app_base_url'}
        ],
        // Called after fields are processed and before save
        from_knack: (knackRecord,postgresData,context) => {
            const settings = postgresData.settings || {};
            _.merge(settings,{
                survey_url: knackRecord.field_175_raw,
                mailgun: { 
                    api_key: knackRecord.field_169_raw,
                    domain: knackRecord.field_170_raw,
                },
                clicksend: {
                    authorization: knackRecord.field_171_raw
                },
                rebrandly: {
                    api_key: knackRecord.field_172_raw,
                    domain: knackRecord.field_176_raw
                },
                amplitude: {
                    key: knackRecord.field_173_raw
                }
            })
            postgresData.settings = settings;

        }
    },    
    organisation: {
        object_id: 'object_2',
        model: 'organisation',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_328'},
        fields: [
            {knack_path: 'field_79',db_column: 'id'},
            {knack_path: 'field_4',db_column: 'name'},
            {knack_path: 'field_89_raw',db_column: 'partner_id', lookup_model: 'partner'},
            {knack_path: 'field_179_raw',db_column: 'email_template'}
        ]
    },
    employee: {
        object_id: 'object_1',
        model: 'employee',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_329'},
        fields: [
            {knack_path: 'field_78',db_column: 'id'},
            {knack_path: 'field_5_raw',db_column: 'organisation_id', lookup_model: 'organisation'},
        ],
        after_postgres_save: async (knackRecord,postgresRecord,context) => {
            // Remove and re-create employee_group_option_instance records
            // field_9 - array of {id}
            let employeeGroupOptionInstanceModel = context.database.getModel('employeeGroupOptionInstance');
            return employeeGroupOptionInstanceModel.destroy({where: { employee_id: postgresRecord.id}})
            .then(() => {
                return Promise.all((knackRecord.field_9_raw || []).map(optionId => {
                    return context.lookupRecordByKnackId('employeeGroupOption',optionId.id)
                }))
                .then(results => {
                    return Promise.all(results.map(result => {
                        return employeeGroupOptionInstanceModel.create({employee_id: postgresRecord.id,employee_group_option_id: result })
                    }))
                })
            })
        }

    },
    employee_group_option: {
        object_id: 'object_4',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_331'},
        model: 'employeeGroupOption',
        fields: [
            {knack_path: 'field_81',db_column: 'id'},
            {knack_path: 'field_8_raw',db_column: 'employee_group_id', lookup_model: 'employeeGroup'},
            {knack_path: 'field_7',db_column: 'name'}
        ]
    },
    employee_group: {
        object_id: 'object_3',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_330'},
        model: 'employeeGroup',
        fields: [
            {knack_path: 'field_80',db_column: 'id'},
            {knack_path: 'field_10_raw',db_column: 'organisation_id', lookup_model: 'organisation'},
            {knack_path: 'field_6',db_column: 'name'}
        ]
    },
    framework: {
        object_id: 'object_5',
        model: 'framework',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_332'},
        fields: [
            {knack_path: 'field_82',db_column: 'id'},
            {knack_path: 'field_102_raw',db_column: 'organisation_id', lookup_model: 'organisation'},
            {knack_path: 'field_13',db_column: 'name'}
        ]
    },
    framework_group_option: {
        object_id: 'object_7',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_334'},
        model: 'frameworkGroupOption',
        fields: [
            {knack_path: 'field_84',db_column: 'id'},
            {knack_path: 'field_17_raw',db_column: 'framework_group_id', lookup_model: 'frameworkGroup'},
            {knack_path: 'field_16',db_column: 'name'},
            {knack_path: 'field_18',db_column: 'sort_order',transform: sortOrderTransform}
        ]
    },
    framework_group: {
        object_id: 'object_6',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_333'},
        model: 'frameworkGroup',
        fields: [
            {knack_path: 'field_83',db_column: 'id'},
            {knack_path: 'field_15_raw',db_column: 'framework_id', lookup_model: 'framework'},
            {knack_path: 'field_135_raw',db_column: 'organisation_id', lookup_model: 'organisation'},
            {knack_path: 'field_14',db_column: 'name'}
        ]
    },
    survey_template: {
        object_id: 'object_8',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_335'},
        model: 'surveyTemplate',
        fields: [
            {knack_path: 'field_85',db_column: 'id'},
            {knack_path: 'field_103_raw',db_column: 'framework_id', lookup_model: 'framework'},
            {knack_path: 'field_105_raw',db_column: 'organisation_id', lookup_model: 'organisation'},
            {knack_path: 'field_19',db_column: 'name'},
            {knack_path: 'field_21',db_column: 'typeformid'}
        ]
    },
    survey_cohort: {
        object_id: 'object_11',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_319'},
        model: 'surveyCohort',
        fields: [
            {knack_path: 'field_165',db_column: 'id'},
            {knack_path: 'field_109_raw',db_column: 'survey_template_id', lookup_model: 'surveyTemplate'},
            {knack_path: 'field_33_raw',db_column: 'organisation_id', lookup_model: 'organisation'},
            {knack_path: 'field_31',db_column: 'name'},
            {knack_path: 'field_35',db_column: 'count_sent'},
            {knack_path: 'field_122_raw',db_column: 'stage'},
            {knack_path: 'field_154',db_column: 'generated_id'},
            {knack_path: 'field_117_raw',db_column: 'delivery_method'},
            {knack_path: 'field_123_raw',db_column: 'first_message'},
            {knack_path: 'field_124_raw',db_column: 'followup_message'},
            {knack_path: 'field_125_raw',db_column: 'last_message'},
            {knack_path: 'field_158_raw',db_column: 'first_message_html'},
            {knack_path: 'field_159_raw',db_column: 'followup_message_html'},
            {knack_path: 'field_160_raw',db_column: 'last_message_html'},
            {knack_path: 'field_161_raw',db_column: 'first_message_subject'},
            {knack_path: 'field_162_raw',db_column: 'followup_message_subject'},
            {knack_path: 'field_163_raw',db_column: 'last_message_subject'},
            {knack_path: 'field_164_raw',db_column: 'survey_embed_code'},
            {knack_path: 'field_141_raw',db_column: 'from_email'},
            
        ]
    },
    survey_participant: {
        object_id: 'object_17',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_322'},
        model: 'surveyParticipant',
        fields: [
            {knack_path: 'field_166',db_column: 'id'},
            {knack_path: 'field_66_raw',db_column: 'survey_cohort_id', lookup_model: 'surveyCohort'},
            {knack_path: 'field_67_raw',db_column: 'employee_id', lookup_model: 'employee'},
            {knack_path: 'field_71_raw.iso_timestamp',db_column: 'responded'},
            {knack_path: 'field_128',db_column: 'participating'},
            {knack_path: 'field_68_raw.iso_timestamp',db_column: 'first_sent'},
            {knack_path: 'field_69_raw.iso_timestamp',db_column: 'last_sent'},
            {knack_path: 'field_72',db_column: 'count_sent'},
            {knack_path: 'field_144',db_column: 'generated_id'},
        ]
    },
    survey_template_question: {
        object_id: 'object_9',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_336'},
        model: 'surveyTemplateQuestion',
        fields: [
            {knack_path: 'field_150',db_column: 'id'},
            {knack_path: 'field_22',db_column: 'question'},
            {knack_path: 'field_25_raw',db_column: 'survey_template_id', lookup_model: 'surveyTemplate'},
            {knack_path: 'field_112_raw',db_column: 'framework_group_id', lookup_model: 'frameworkGroup'},
            {knack_path: 'field_23_raw',db_column: 'framework_group_option_id', lookup_model: 'frameworkGroupOption'},
            {knack_path: 'field_29_raw',db_column: 'survey_template_question_type_id', lookup_model: 'surveyTemplateQuestionType'},
            {knack_path: 'field_24',db_column: 'sort_order',sortOrderTransform },
            {knack_path: 'field_30',db_column: 'question_guid'}
        ],
        after_postgres_save: async (knackRecord,postgresRecord,context) => {
            // Remove and re-create survey_template_question_option_instance records
            // field_157 - array of {id}
            let surveyTemplateQuestionOptionInstanceModel = context.database.getModel('surveyTemplateQuestionOptionInstance');
            return surveyTemplateQuestionOptionInstanceModel.destroy({where: { survey_template_question_id: postgresRecord.id}})
            .then(() => {
                return Promise.all((knackRecord.field_157_raw || []).map(optionId => {
                    return context.lookupRecordByKnackId('surveyTemplateQuestionOption',optionId.id)
                }))
                .then(results => {
                    return Promise.all(results.map(result => {
                        return surveyTemplateQuestionOptionInstanceModel.create({survey_template_question_id: postgresRecord.id,survey_template_question_option_id: result })
                    }))
                })
            })
        }
    },
    survey_template_question_type: {
        object_id: 'object_10',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_337'},
        model: 'surveyTemplateQuestionType',
        fields: [
            {knack_path: 'field_149',db_column: 'id'},
            {knack_path: 'field_26',db_column: 'name'},
            {knack_path: 'field_116_raw',db_column: 'survey_template_question_option_id', lookup_model: 'surveyTemplateQuestionOption'},
            {knack_path: 'field_28',db_column: 'sort_order',transform: sortOrderTransform },
        ]
    },
    survey_template_question_option: {
        object_id: 'object_23',
        find_records_view: { scene_key: 'scene_189', view_key: 'view_338'},
        model: 'surveyTemplateQuestionOption',
        fields: [
            {knack_path: 'field_167',db_column: 'id'},
            {knack_path: 'field_113',db_column: 'option'},
            {knack_path: 'field_156_raw',db_column: 'survey_template_question_id', lookup_model: 'surveyTemplateQuestion'},
            {knack_path: 'field_115',db_column: 'sort_order',transform: sortOrderTransform },
        ]
    },




};

class KnackDatabase
{
    constructor(database,knackClient)
    {
        this.database = database;
        this.knackClient = knackClient;
        this.idCache = {};
    }

    /**
     * Sync data from Knack to Postgres
     */
    async syncToPostgres({tables,truncateTable = false,userToken} = {})
    {
        const self = this;
        const database = this.database;
        const afterQueue = [];
        const historyModel = database.getModel('history');
        return new Promise((resolve,reject) => {
            return async.eachSeries(tables,
                async (name) => {
                    await historyModel.quickCreate('sync_from_knack.table', {source: 'knack', table: name});
                    const tableMap = Mappings[name];
                    const databaseModel = database.getModel(tableMap.model);
                    return Promise.resolve()
                    .then(async () => {
                        if (truncateTable)
                        {
                            await historyModel.quickCreate('sync_from_knack.table.truncate', {source: 'knack', table: name});
                            return databaseModel.destroy({where: {}});
                        }
                    })
                    .then(() => {
                        return tableMap.find_records_view 
                            ? this.knackClient.viewFindRecords(tableMap.find_records_view.scene_key, tableMap.find_records_view.view_key,
                                {retrieveAllPages: true, userToken, pageCallback,rows_per_page: 100})
                            : this.knackClient.objectFindRecords(tableMap.object_id,{ retrieveAllPages: true, pageCallback});
                    })
                    async function pageCallback(result)
                    {
                        await historyModel.quickCreate('sync_from_knack.table.got_records', {source: 'knack', table: name, count: result.records.length});
                        console.log(`${name}: Got ${result.records.length} records`);
                        return new Promise((resolve,reject) => {
                            async.eachSeries(result.records,
                                (record,nextRecord) => {
                                    self.syncRecordFromKnack(tableMap,record,{afterQueue})
                                    .then((result) => {
                                        nextRecord()
                                    })
                                    .catch(err =>
                                    {
                                        console.log(err.message);
                                        nextRecord(err);
                                    } )
                                },
                                async err => {
                                    await historyModel.quickCreate('sync_from_knack.table.finished', {source: 'knack', table: name});
                                    if (err)
                                    {
                                        await historyModel.quickCreate('sync_from_knack.table.error', {source: 'knack', table: name, error: err.message});
                                        return reject(err);
                                    }
                                        
                                    console.log(`Processed ${result.records.length} records`);
                                    resolve();
                                })
                        })
                    }
                },
                err => {
                    if (err)
                    {
                        return reject(err);
                    }
                    async.eachSeries(afterQueue,async x => x(), err => resolve())                    
                })
        })
    }
    getMappingByObjectId(objectId)
    {
        return _.find(Mappings,{ object_id: objectId})
    }

    removePostgresRecord(tableMap,data)
    {
        let idField = _.find(tableMap.fields, {db_column: 'id'});
        let idValue = _.get(data,idField.knack_path);
        return this.database.getModel(tableMap.model).destroy({where: {id: idValue}})

    }
    syncRecordFromKnack(tableMap,record, {afterQueue} = {})
    {
        const database = this.database;
        const databaseModel = database.getModel(tableMap.model);
        const recordToProcess = {};
        const idField = _.find(tableMap.fields, {db_column: 'id'});
        recordToProcess.knack_id = bigInt(record.id,16).toString();
        return databaseModel.findById(_.get(record,idField.knack_path))
        .then(existingRecord => {
            if (existingRecord)
                Object.assign(recordToProcess,existingRecord.dataValues);
            return ((tableMap.from_knack && tableMap.from_knack(record,recordToProcess,this)) || Promise.resolve())
            .then(() => {
                return new Promise((resolve,reject) => {
                    async.each(tableMap.fields,
                        (field,nextField) => {
                            let knackPath = field.lookup_model ? field.knack_path + '.0.id' : field.knack_path
                            recordToProcess[field.db_column] = _.get(record,knackPath);
                            if (field.transform)
                                recordToProcess[field.db_column] = field.transform(recordToProcess[field.db_column])
                            if (field.lookup_model)
                            {
                                console.log(`Looking up ${field.lookup_model} with id ${recordToProcess[field.db_column]} `);
                                this.lookupRecordByKnackId(field.lookup_model,recordToProcess[field.db_column])
                                .then(id => {
                                    recordToProcess[field.db_column] = id;
                                    nextField();
                                })
                            }
                            else
                                nextField()
                        },
                        err => {
                            if (err)
                                return reject(err);

                            databaseModel.upsert(recordToProcess,{returning: true})    
                            .then((result) => {
                                if (tableMap.after_postgres_save)
                                {
                                    if (afterQueue)
                                    {
                                        afterQueue.push(() => tableMap.after_postgres_save(record,result[0].dataValues,this));
                                        return result;
                                    }
                                    else
                                        return tableMap.after_postgres_save(record,result[0].dataValues,this)
                                        .then(() => result)
                                }
                            })
                            .then((result) => {
                                resolve(result)
                            })
                            .catch(err => reject(err))
                        })
                    })
            })

        })

    }

    lookupRecordByKnackId(modelName,knackId)
    {
        if (_.isEmpty(knackId))
            return Promise.resolve(null);

        let modelIdCache = this.idCache[modelName];
        if (!modelIdCache)
        {
            modelIdCache = new Map();
            this.idCache[modelName] = modelIdCache;
        }
        if (modelIdCache.has(knackId))
            return Promise.resolve(modelIdCache.get(knackId));

        return this.database.getModel(modelName).findOne({raw: true,where: { knack_id: bigInt(knackId,16).toString() }})
        .then(result => {
            modelIdCache.set(knackId,result && result.id);
            return result && result.id;
        })
    }
}

module.exports = KnackDatabase;
