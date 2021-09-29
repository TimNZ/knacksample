class ProcessingError extends Error
{
    constructor(message,code,data,fatal = false)
    {
        super(message);
        this.code = code;
        this.data = data;
        this.fatal = fatal;
    }

}

module.exports = {ProcessingError}; 