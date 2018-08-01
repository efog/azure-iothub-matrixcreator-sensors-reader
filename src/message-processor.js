class MessageProcessor {
    constructor() {
        this._state = {};
    }
    get state() {
        console.log(`Getting state: ${JSON.stringify(this._state)}`);
        return this._state;
    }
    set state(value) {
        console.log(`Setting state: ${JSON.stringify(value)}`);
        this._state = Object.assign({}, this.state, value);
    }
    getMessage(messageId, callback) {
        const message = Object.assign({ "messageId": messageId }, this.state);
        callback(message);
    }
}

module.exports = new MessageProcessor();