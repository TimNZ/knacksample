'use strict';

const _ = require('lodash');
const rp = require('request-promise');
const querystring = require('querystring');
const async = require('async');
module.exports = class KnackHQClient {

  constructor(options) {

    this.host = options.host || 'https://api.knack.com';
    this.token  = options.token;
    this.app_id = options.app_id;
    this.api_key = options.api_key;
    this.database = options.database;
    this.api_version = 'v1';
  }

  async request(options) {
    const historyModel = this.database.getModel('history');
    const startAt = new Date();
    const request_options = {
      uri: `${this.host}/v1/${options.path}`,
      headers: {
        'X-Knack-Application-Id': this.app_id,
        'Content-Type': 'application/json'
      },
      json: true,
      body: options.body,
      resolveWithFullResponse: true
    }

    if ((options.token || this.token) && !options.forceApiKey)  {

      request_options.headers['Authorization'] = options.token || this.token;
      request_options.headers['X-Knack-REST-API-Key'] = 'knack';
    } else if (options.api_key || this.api_key) {
      request_options.headers['X-Knack-REST-API-Key'] = options.api_key || this.api_key;
    }
    // return Promise.resolve(request_options);
    request_options.method = options.method || (options.body ? 'POST' : 'GET');
    options.requestCallback && options.requestCallback('start',request_options);
    return rp(request_options)
      .then(async result => {
        options.requestCallback && options.requestCallback('success',request_options,result,startAt);
        await historyModel.quickCreate('knack_api.success',{request: request_options,result: result.body});
        return result.body;
      })
      .catch(async result => {
        options.requestCallback && options.requestCallback('error',request_options,result,startAt);
        await historyModel.quickCreate('knack_api.error',{request: request_options,result: result.body, error: result.error, statusCode: result.statusCode});
        // token no longer valid, use api key
        if (result.statusCode == 403 && result.error.includes('token'))
        {
          const newOptions = _.clone(options);
          newOptions.forceApiKey = true;
          return this.request(newOptions);
        }
        // Rate limit exceeded
        if (result.statusCode == 429)
        {
          return sleep(1010) // Sleep for just over 1 second
            .then(() => this.request(options))
        }
        else
          throw result
      })
  }

  authenticate(email, password) {

    if (!email || !password)
      return;

    return this.request({
      body: {
        email,
        password
      },
      path: `applications/${this.app_id}/session`
    }).then(_.bind(function(data) {
      return this.token = data.session.user.token;
    }, this));
  }

  objects() {
    return this.request({
      path: 'objects'
    });
  }
  
  applicationDetails(appId) {
    return this.request({
      path: `applications/${appId}`
    })
  }

  objectRecords(object_key) {

    return this.request({
      path: `objects/${object_key}/records`
    });
  }

  objectRecord(object_key, record_key) {

    return this.request({

      path: `objects/${object_key}/records/${record_key}`
    });
  }

  objectCreateRecord(object_key, body) {

    return this.request({
      path: `objects/${object_key}/records`,
      body: body,
      method: 'POST'
    });
  }

  objectDeleteRecord(object_key, record_key) {

    return this.request({

      path: `objects/${object_key}/records/${record_key}`,
      method: 'DELETE'
    });
  }

  objectUpdateRecord(object_key, record_key, body) {

    return this.request({
      path: 'objects/${object_key}/records/${record_key}',
      method: 'PUT',
      body: body
    });
  }

  objectFindRecords(object_key, {filters, requestCallback, pageCallback, retrieveAllPages = false, page = 1, rows_per_page = 1000} = {}) {

    let qObject = {};
    if (filters)
      qObject.filters = JSON.stringify(filters);
    if (page)
      qObject.page = page;
    if (rows_per_page)
      qObject.rows_per_page = rows_per_page;
    
    if (!retrieveAllPages)
      return this.request({
        path: 'objects/' + object_key + '/records?' + querystring.stringify(qObject)
      })
    else
    {
      return new Promise((resolve,reject) => {
        return this.request({
          path: 'objects/' + object_key + '/records?' + querystring.stringify(qObject)
        })
        .then(result => {
          const startingPage = parseInt(result.current_page);
          const totalPages = parseInt(result.total_pages);
          (pageCallback(result) || Promise.resolve() )
          .then(() => {
            if (startingPage == totalPages)
              return resolve(result);

            async.timesSeries(result.total_pages - result.current_page, 
              (n,next) => {
                this.objectFindRecords(object_key,{ filters, page: n + startingPage + 1, rows_per_page,apiKey,requestCallback})
                .then(result => {
                  (pageCallback(result) || Promise.resolve() )
                  .then(() => {
                    next();
                  })
                  
                })
              },
              err => {
                resolve(result);
              })

          })
        })

      })

    }
  }

  viewCreateRecord(scene_key,view_key, body, {userToken,requestCallback,unsecured = false, apiKey} = {}) {

    return this.request({
      path: this.makePagesViewPath(scene_key,view_key) + '/records/',
      body: body,
      token: userToken,
      method: 'POST',
      requestCallback,
      api_key:  unsecured ? 'knack' : apiKey
    });
  }

  viewUpdateRecord(scene_key,view_key, id,body, {userToken,requestCallback,unsecured = false,apiKey} = {}) {

    return this.request({
      path: this.makePagesViewPath(scene_key,view_key) + '/records/' + id,
      body: body,
      token: userToken,
      method: 'PUT',
      api_key:  unsecured ? 'knack' : apiKey,
      requestCallback
    });
  }

  viewDeleteRecord(scene_key,view_key, id, {userToken,requestCallback,apiKey} = {}) {

    return this.request({
      path: this.makePagesViewPath(scene_key,view_key) + '/records/' + id,
      token: userToken,
      method: 'DELETE',
      requestCallback,
      api_key:  unsecured ? 'knack' : apiKey
    });
  }
  

  viewFindRecords(scene_key, view_key, {filters,page = 1, pageCallback, unsecured = false,retrieveAllPages = false,rows_per_page,idKey,idValue,userToken,apiKey,requestCallback} = {}) {
    let qObject = {};
    if (filters)
      qObject.filters = JSON.stringify(filters);
    if (page)
      qObject.page = page;
    if (rows_per_page)
      qObject.rows_per_page = rows_per_page;
    if (idKey)
      qObject[idKey] = idValue;

    // if (!retrieveAllPages)
    //   return this.request({
    //     path: this.makeScenesViewPath(scene_key,view_key) + '/records?' + querystring.stringify(qObject),
    //     token: userToken,
    //     api_key:  unsecured ? 'knack' : apiKey,
    //     requestCallback
    //   });
    // else
    // {
      return new Promise((resolve,reject) => {
        this.request({
          path: this.makeScenesViewPath(scene_key,view_key) + '/records?' + querystring.stringify(qObject),
          token: userToken,
          api_key:  unsecured ? 'knack' : apiKey,
          requestCallback
        })
        .then(result => {
          const startingPage = parseInt(result.current_page);
          const totalPages = parseInt(result.total_pages);
          return ((pageCallback && pageCallback(result)) || Promise.resolve() )
          .then(() => {
            if (!retrieveAllPages || startingPage == totalPages)
              return resolve(result);

            async.timesSeries(result.total_pages - result.current_page, 
              (n,next) => {
                this.viewFindRecords(scene_key,view_key,{ filters, page: n + startingPage + 1, rows_per_page,unsecured,idKey,idValue,userToken,apiKey,requestCallback, retrieveAllPages: false})
                .then(result => {
                  ((pageCallback && pageCallback(result)) || Promise.resolve() )
                  .then(() => {
                    next();
                  })
                })
              },
              err => {
                resolve(result);
              })

          })
        })
      })
    // }      
  }

  makeScenesViewPath(sceneKey,viewKey)
  {
      return `scenes/${sceneKey}/views/${viewKey}`
  }
  makePagesViewPath(sceneKey,viewKey)
  {
      return `pages/${sceneKey}/views/${viewKey}`
  }

  objectUpload(object_key, field_key, filename, body) {

    return this.request({
        path: `applications/${this.app_id}/assets/file/upload`,
        body: _.extend({}, body)
      })
      .then((result) => {

        const file_body = _.extend({}, body);
        file_body[field_key] = result.id;

        return {
          path: `objects/${object_key}/records`,
          body: file_body
        };
      })
      .then(this.request);
  }
}

const sleep = ms => new Promise((resolve) => setTimeout(() => resolve(),ms))