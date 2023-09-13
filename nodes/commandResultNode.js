module.exports = function(RED) {
    function KaaCommandResultNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            node.log(JSON.stringify(msg));

            if (msg.command === undefined) {
                node.error("command is absent")
                return null;
            }

            msg.action = "command_result";
            if (msg.error === undefined) {
                msg.statusCode = 200;
            } else {
                msg.statusCode = 500;
                msg.reasonPhrase = msg.error.message;
            }

            node.send(msg);
        });
    }
    RED.nodes.registerType("kaa-command-result", KaaCommandResultNode);
}
