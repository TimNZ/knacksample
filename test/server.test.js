const assert = require('assert');
const rp = require('request-promise');
const app = require('../index')


describe('API tests', () => {
    before(() => {

    });

    after(() => {

    });

    it('Retrieves a stats object', () => {
        return rp(app.getUrl()).then(body =>
            assert.ok(body.indexOf('<html') !== -1)

        );
    });
})

describe('Job Processor', () => {

    it('JobProcessor flagged not to start',() => {

    })

    it('JobProcessor starts',() => {

    })

    it('JobProcessor only scanning for certain job types',() => {

    })

    it('JobProcessor stopping',() => {

    })

    it('JobProcessor restarted',() => {

    })


})