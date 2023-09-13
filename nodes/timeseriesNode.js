module.exports = function(RED) {
    function KaaTimeseriesNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function(msg) {
            msg.action = "ts";
            node.send(msg);
        });
    }
    RED.nodes.registerType("kaa-timeseries", KaaTimeseriesNode);
}
