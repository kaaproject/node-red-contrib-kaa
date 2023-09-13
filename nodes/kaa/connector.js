class Connector {
    constructor(domain, application, version, client_id) {
        this.domain = domain;
        this.application = application;
        this.version = version;
        this.client_id = client_id;
    }     

    connect() {
    }

    sendMeta(payload, token) {
    }

    subscribeToCommand(command, token, callback) {
    }

    unsubscribeFromCommand(subscriptionId) {
    }

    sendCommandResponse(token, response) {

    }

    publishData(payload, token) {
    }

    disconnect() {
    }
}

module.exports = Connector;
