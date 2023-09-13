module.exports = function(RED) {
    function KaaCommandSubscriptionNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            if (msg.command === config.command) {
                node.log(JSON.stringify(msg));

                node.send(msg);

                if (config.auto_reply) {
                    var connector = node.context().flow.get("connector");
                    connector.sendCommandResponse(msg.token, { 
                        id: msg.commandId,
                        command: msg.command,
                        statusCode: 200,
                        payload: config.auto_reply_message
                    });
                }
            }

            return null;

        });
    }
    RED.nodes.registerType("kaa-command-subscription", KaaCommandSubscriptionNode);
}
