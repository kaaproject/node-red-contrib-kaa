module.exports = function(RED) {
    function KaaTimeseriesNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function(msg) {
            var newMsg = {
                action: "ts",
                payload: msg.payload,
                token: msg.token
            };

            node.send(newMsg);
        });
    }
    RED.nodes.registerType("kaa-timeseries", KaaTimeseriesNode);
}
