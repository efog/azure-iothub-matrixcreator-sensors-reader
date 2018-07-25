class MessageProcessor {
    constructor() {
        this._state = {};
    }
    get state() {
        return this._state;
    }
    set state(value) {
        this._state = Object.assign({}, this.state, value);
    }
    getMessage(messageId, callback) {
        const message = Object.assign({ "messageId": messageId }, this.state);
        callback(message);
    }
}

module.exports = new MessageProcessor();