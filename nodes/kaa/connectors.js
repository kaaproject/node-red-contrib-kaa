const HTTPConnector = require('./http-connector.js');
const MQTTConnector = require('./mqtt-connector.js');

class ConnectorFactory {
    create(type, domain, application, version, client_id) {
        switch(type) {
            case 'HTTP':
                return new HTTPConnector(domain, application, version, client_id);
            case 'MQTT':
                return new MQTTConnector(domain, application, version, client_id);
            default:
                return new Error('Connector type not supported');
        }
    }
}

module.exports = new ConnectorFactory();