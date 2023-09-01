var ConnectorFactory = require("./kaa/connectors.js");

module.exports = function(RED) {
    function KaaConnectorNode(config) {
        RED.nodes.createNode(this, config);
        this.status({fill: "blue", shape: "dot", text: "initializing"});

        var node = this;

        node.log("connecting to: " + config);

        node.connector = ConnectorFactory.create(
            config.connection_type,
            config.domain,
            config.application,
            config.version
        );
        
        const connectCallback = () => {
            node.status({fill: "green", shape: "dot", text: "connected"});
        };
    
        const connectionLostCallback = () => {
            node.log("connection lost callback");
            node.status({fill: "red", shape: "ring", text: "not connected"});
    
            setTimeout(reconnectCallback, 30 * 1000);
        };
    
        const reconnectCallback = () => {
            node.status({fill: "blue", shape: "dot", text: "reconnecting"});
            node.connector.connect(connectCallback, connectionLostCallback);
        };

        node.connector.connect(connectCallback, connectionLostCallback);

        node.on('input', function(msg) {

            if (msg.token === undefined) {
                node.error("token is absent")
                return null;
            } 

            if (msg.action === "meta") {
                node.connector.sendMeta(msg.payload, msg.token).then((data) => {
                    node.status({fill: "green", shape: "dot", text: "processed"});
                })
                .catch((err) => {
                    node.log(err);
                    node.status({fill: "red", shape: "ring", text: "error"});
                });
            } else if (msg.action === "ts") {
                node.connector.publishData([msg.payload], msg.token).then((data) => {
                    node.status({fill: "green", shape: "dot", text: "processed"});
                })
                .catch((err) => {
                    node.log(err);
                    node.status({fill: "red", shape: "ring", text: "error"});
                });
            } else {
                node.error("Unsupported action: " + msg.action);
            }

            return null;
        });
    }

    RED.nodes.registerType("kaa-connector", KaaConnectorNode);
}
