var ConnectorFactory = require("./kaa/connectors.js");
var teltonika = require("./kaa/teltonika.js");
var token = "test123";

testHTTP();
// testMQTT();

function testHTTP() {
  var connector = ConnectorFactory.create(type = "HTTP", domain = "dev.kaatech.com", application = "cjjfbjgheq5g58bk4gdg", version = "v1")
  console.log(connector)
  connector.sendMeta({ x: "1"}, token)
  // connector.publishData([{ x: "1"}])
    .then(data => {
      console.info("data: " + data);
    })
    .catch(e => {
      console.error("error: " + e);
    });
  
    // connector.publishData([{ x: "1"}], token)
    // .then(data => {
    //   console.info("data: " + data);
    // })
    // .catch(e => {
    //   console.error("error: " + e);
    // });
}

function testMQTT() {
  var connector = ConnectorFactory.create(type = "MQTT", domain = "dev.kaatech.com", application = "cjjfbjgheq5g58bk4gdg", version = "v1")
  console.log(connector)

  const connectCallback = () => {
    console.log("connected");
  };

  const connectionLostCallback = () => {
    node.log("connection lost callback");
    setTimeout(reconnectCallback, 30 * 1000);
  };

  const reconnectCallback = () => {
    connector.connect(connectCallback, connectionLostCallback);
  };

  connector.connect(connectCallback, connectionLostCallback);

  setTimeout(function() {
    connector.sendMeta({ x: "2"}, token);
  }, 1000);

}



// var x = "005FCAFE0107000F3335323039333038363430333635358E010000016B4F831C680100000000000000000000000000000000010005000100010100010011009D00010010015E2C880002000B000000003544C87A000E000000001DD7E06A000001";
// var msg = hexToBytes(x);
// console.log(msg);

// service = new teltonika.Connector(connector);
// service.process(msg)
//   .then(data => {
//     console.info("data: " + data);
//   })
//   .catch(e => {
//     console.error("error: " + e);
//   });

// function hexToBytes(hex) {
//   let bytes = [];
//   for (let c = 0; c < hex.length; c += 2)
//       bytes.push(parseInt(hex.substr(c, 2), 16));
//   return bytes;
// }