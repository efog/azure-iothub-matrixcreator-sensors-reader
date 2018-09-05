const dbg = require("debug");
const error = dbg("ERROR:athena.pi.iotclient:MessageProcessor");
const info = dbg("INFO:athena.pi.iotclient:MessageProcessor");

class MessageProcessor {
    constructor() {
        this._state = {};
    }
    get state() {
        info(`Getting state: ${JSON.stringify(this._state)}`);
        return this._state;
    }
    set state(value) {
        info(`Setting state: ${JSON.stringify(value)}`);
        this._state = Object.assign({}, this.state, value);
    }
    getMessage(messageId, callback) {
        const message = Object.assign({ "messageId": messageId }, this.state);
        callback(message);
    }
}

module.exports = new MessageProcessor();