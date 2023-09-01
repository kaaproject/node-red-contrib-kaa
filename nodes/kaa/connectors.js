const HTTPConnector = require('./http-connector.js');
const MQTTConnector = require('./mqtt-connector.js');

class ConnectorFactory {
    create(type, domain, application, version) {
        switch(type) {
            case 'HTTP':
                return new HTTPConnector(domain, application, version);
            case 'MQTT':
                return new MQTTConnector(domain, application, version);
            default:
                return new Error('Connector type not supported');
        }
    }
}

module.exports = new ConnectorFactory();