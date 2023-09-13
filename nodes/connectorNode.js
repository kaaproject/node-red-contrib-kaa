var ConnectorFactory = require("./kaa/connectors.js");

module.exports = function(RED) {
    function KaaConnectorNode(config) {
        RED.nodes.createNode(this, config);
        this.status({fill: "blue", shape: "dot", text: "initializing"});

        var node = this;

        var mapping = {};

        node.log("connecting to: " + config.domain );

        node.connector = ConnectorFactory.create(
            config.connection_type,
            config.domain,
            config.application,
            config.version,
            config.client_id
        );
        
        const connectCallback = () => {
            node.log("Connected");
            node.status({fill: "green", shape: "dot", text: "connected"});

            node.connector.subscribe((topic, message) => {
                node.log(`Got message for topic [${topic}]: ${JSON.stringify(message)}`);

                if (topic.endsWith("/error")) {
                    node.error("error", message);
                    return;
                }

                var tmp = topic.split("/");
                if (tmp[2] === "cex") {
                    const token = tmp[3];
                    if (token in mapping) {
                        if (!Array.isArray(message)) {
                            message = [message];                        
                        }
                        for (let msg of message) {
                            const newMsg = Object.assign({}, mapping[token]);
                            newMsg.commandId = msg.id;
                            newMsg.command = tmp[5];
                            newMsg.token = token;
                            newMsg.payload = msg.payload;
                            delete newMsg.action;
                            delete newMsg._msgid;
                            node.send(newMsg);
                        }
                    } else {
                        node.warn(`Got CEX message for unregistered token [${token}]`);
                    }
                }
            });
        };
    
        const connectionLostCallback = (error) => {
            node.error(`Connection lost ${error}`);
            node.status({fill: "red", shape: "ring", text: "not connected"});
    
            setTimeout(reconnectCallback, 30 * 1000);
        };
    
        const reconnectCallback = () => {
            node.status({fill: "blue", shape: "dot", text: "reconnecting"});
            node.connector.connect(connectCallback, connectionLostCallback);
        };

        node.connector.connect(connectCallback, connectionLostCallback);

        var flowContext = node.context().flow;
        flowContext.set("connector", node.connector);

        node.on('input', function(msg) {

            if (msg.token === undefined) {
                node.error("token is absent")
                return null;
            } 

            mapping[msg.token] = msg;

            node.log(JSON.stringify(msg));

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
            } else if (msg.action === "command_result") {
                node.connector.sendCommandResponse(msg.token, { 
                    id: msg.commandId,
                    command: msg.command,
                    statusCode: msg.statusCode,
                    reasonPhrase: msg.reasonPhrase,
                    payload: msg.payload
                  });
            } else {
                node.error("Unsupported action: " + msg.action);
            }

            return null;
        });
    }

    RED.nodes.registerType("kaa-connector", KaaConnectorNode);
}
