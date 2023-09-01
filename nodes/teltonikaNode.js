var teltonika = require("./kaa/teltonika.js");

module.exports = function(RED) {
    function KaaTeltonikaNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            var inputMsg = msg.payload;

            if (inputMsg.length == 1) {
                node.log("PING. " + msg.ip + ":" + msg.port);
                return null;
            }
            
            var service = new teltonika.Processor();
            var result = service.process(msg.payload); 
            var messages = result.messages;
            var parsedMsg = result.parsedMsg;

            for (var i = 0; i < messages.length; i++) {

                var newMsg = {}
                newMsg.token = parsedMsg.moduleIMEI;
                newMsg.action = "meta";
                newMsg.payload = messages[i];

                node.send(newMsg);

                newMsg = {}
                newMsg.token = parsedMsg.moduleIMEI;
                newMsg.action = "ts";
                newMsg.payload = messages[i];

                node.send(newMsg);
            }

            var response = [];
            response.push(0, 5);
            response.push(Math.floor(parsedMsg.packetId / 256), parsedMsg.packetId % 256);
            response.push(1);
            response.push(parsedMsg.avlPacketId);
            response.push(parsedMsg.numberOfData);

            var responseMsg = {};
            responseMsg.ip = msg.ip;
            responseMsg.port = msg.port;
            responseMsg.payload = Buffer.from(response);

            return responseMsg;
        });
    }
    RED.nodes.registerType("kaa-teltonika", KaaTeltonikaNode);
}
