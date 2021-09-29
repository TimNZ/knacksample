const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const uuid = require('uuid');
class ServerStats extends EventEmitter
{
	constructor(options)
	{
		super();
        this._state = {
            jobs: {processorRunning: false, lastLoopRun: null, recentHistory: [], running: new Map()}, 
            apiCalls: {running: new Map(), recentHistory: []},
            history: {recent: []}
        }   
	}

    toJSON() 
    {
        return this._state;
    }

    get(path,defaultValue)
    {
        return _.get(this._state,path,defaultValue);
    }

    set(path,value)
    {
        _.set(this._state,path,value);
        return this;
    }

    startedApiCall(call)
    {
        this._state.apiCalls.running.set(call.id,call);
        this._addRotatingItem('apiCalls.recentHistory',call);
    }

    stoppedApiCall(id)
    {
        return this._state.apiCalls.running.delete(id);
    }

    startedJob(job)
    {
        this._state.jobs.running.set(job.id,job);
        this._addRotatingItem('jobs.recentHistory',job);

    }

    stoppedJob(id)
    {
        this._state.jobs.running.delete(id);
    }

    addHistory(history)
    {
        this._addRotatingItem('history',history);
    }

    _addRotatingItem(path,value)
    {
        const maxSize = 100;
        let a = _.get(this._state,path);
        if (!a)
            return false;
        a.push(value);
        if (a.length > maxSize)
            a.shift();
        return a.length;
    }
}


module.exports = ServerStats;
