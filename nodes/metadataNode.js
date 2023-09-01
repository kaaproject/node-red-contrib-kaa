module.exports = function(RED) {
    function KaaMetadataNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function(msg) {
            var newMsg = {
                action: "meta",
                payload: msg.payload,
                token: msg.token
            };

            node.send(newMsg);
        });
    }
    RED.nodes.registerType("kaa-metadata", KaaMetadataNode);
}
