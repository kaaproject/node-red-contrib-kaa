const Connector = require('./connector.js');
const mqtt = require("mqtt");

class MQTTConnector extends Connector {
    
    constructor(domain, application, version) {
        super(domain, application, version)
        this.url = "mqtt://mqtt." + domain + ":1883";

        this.connecting = false;
        this.reconnectCounter = 0;
    }

    connect(connectCallback, connectionLostCallback) {
        this.connecting = true;

        const clientId = 'mqtt_test'

        this.client = mqtt.connect(this.url, {
            clientId,
            clean: true,
            connectTimeout: 1000,
            reconnectPeriod: 1000,
          });
        

        const topic = `kp1/${this.application}-${this.version}`;

        this.client.on("connect", () => {
            this.connecting = false;
            this.reconnectCounter = 0;
            console.log("mqtt is connected");
            this.client.subscribe([topic], () => {
                console.log(`Subscribe to topic '${topic}'`)
            });
            connectCallback();
        });

        this.client.on("error", (error) => {
            this.connecting = false;
            console.error("Can't connect " + error);
            try {
                let waittime = Math.min((this.reconnectCounter + 1) * 1000, 30000);
                setTimeout(() => {
                    connectionLostCallback();
                }, waittime);
        
                this.reconnectCounter += 1;
              } catch (e) {
                console.error("error: " + e);
              }
        });

        this.client.on('message', (topic, payload) => {
            console.log('Received message for topic: ' + topic + " message= " + payload)
        })
    }

    async sendMeta(payload, token) {
        var data = JSON.stringify(payload);
        var requestId = Math.floor(Math.random() * 100);

        return this.publish('metdata', `kp1/${this.application}-${this.version}/epmx/${token}/update/keys/${requestId}`, data);
    };

    async publishData(payload, token) {
        var data = []
        if (Array.isArray(payload)) { 
            data = JSON.stringify(payload);
        } else {
            data = JSON.stringify([payload]);
        }

        return this.publish('timeseries', `kp1/${this.application}-${this.version}/dcx/${token}/json`, data);
    };

    async publish(name, topic, data) {
        return  new Promise((resolve, reject) => {
            if (this.client != undefined) {
                this.client.publish(topic, data, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve("Success");
                    }
                });
            } else {
                reject(new Error("client undefined"));
            }
        });
    }


    disconnect() {
        console.info("disconnect mqtt client");
        if (this.client != undefined) {
            try {
                this.client.end(true);
              } catch (e) {
                console.error("Disconnect called, but client was not connected");
              }
        }
    }

}

module.exports = MQTTConnector;