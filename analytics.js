const Amplitude = require('amplitude');

class Analytics 
{
    constructor(opts)
    {
        this.amplitude = new Amplitude(opts.amplitude.key,opts.amplitude.options)
    }

    track(eventType,other)
    {
        return this.amplitude.track(Object.assign({eventType: eventType,other}));
    }
}

module.exports = Analytics;
