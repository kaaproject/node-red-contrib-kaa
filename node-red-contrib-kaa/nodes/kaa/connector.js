class Connector {
    constructor(domain, application, version) {
        this.domain = domain;
        this.application = application;
        this.version = version;
    }     

    connect() {

    }

    sendMeta(payload, token) {

    }

    publishData(payload, token) {
        
    }

    disconnect() {
        
    }
}

module.exports = Connector;
