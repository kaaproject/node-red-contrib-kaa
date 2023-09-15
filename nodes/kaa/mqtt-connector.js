const Connector = require('./connector.js');
const mqtt = require("mqtt");

class MQTTConnector extends Connector {
    
    constructor(domain, application, version, client_id) {
        super(domain, application, version, client_id)
        this.url = "mqtt://mqtt." + domain + ":1883";

        this.connecting = false;
        this.reconnectCounter = 0;

        this.commandSubscription = undefined;
        this.subscription = undefined;
    }

    connect(connectCallback, connectionLostCallback) {
        this.connecting = true;

        const clientId = this.client_id;
        this.client = mqtt.connect(this.url, {
            clientId,
            clean: true,
            connectTimeout: 1000,
            reconnectPeriod: 1000
        });
        
        this.client.on("connect", () => {
            this.connecting = false;
            this.reconnectCounter = 0;
            connectCallback();
        });

        this.client.on("error", (error) => {
            this.connecting = false;
            try {
                let waittime = Math.min((this.reconnectCounter + 1) * 1000, 30000);
                setTimeout(() => {
                    connectionLostCallback(error);
                }, waittime);
        
                this.reconnectCounter += 1;
              } catch (e) {
                console.error("error: " + e);
              }
        });

        this.client.on('message', (topic, message) => {
            // console.log(`Message received: topic [${topic}] body [${message}]`);

            if (this.subscription) {
                this.subscription(topic, message);
            }

            if (this.commandSubscription) {
                let parts = topic.split("/");
                if (parts[2] === "cex" && parts[4] === "command") {
                    this.commandSubscription(parts[5], parts[3], message);
                }
            }
    
        });
    }

    async sendMeta(payload, token) {
        var data = JSON.stringify(payload);
        const randomKey = Math.floor(Math.random() * Math.floor(1000));
        return this.publish('metdata', `kp1/${this.application}-${this.version}/epmx/${token}/update/keys/${randomKey}`, data);
    };

    async publishData(payload, token) {
        var data = []
        if (Array.isArray(payload)) { 
            data = JSON.stringify(payload);
        } else {
            data = JSON.stringify([payload]);
        }

        const randomKey = Math.floor(Math.random() * Math.floor(1000));
        return this.publish('timeseries', `kp1/${this.application}-${this.version}/dcx/${token}/json/${randomKey}`, data);
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

    subscribeToCommand(callback) {
        this.commandSubscription = function(command, token, payload) {
            let objects = JSON.parse(payload.toString());
            if (!Array.isArray(objects)) {
                objects = [objects];                        
            }
            for (let object of objects) {
                callback({
                    id: object.id,
                    command: command,
                    token: token,
                    payload: object.payload
                });
            }
        };
    }

    subscribe(callback) {
        this.subscription = function(topic, message) {
            if (message && message.length > 0) {
                try {
                    callback(topic, JSON.parse(message));
                } catch (error) {
                    console.error(`Cannot parse message: [${message}] due to ${error}`);
                    callback(topic, message);
                }
            } else {
                callback(topic, message);
            }
        };
    }

    observeCommand(command, token) {
        const topic = `kp1/${this.application}-${this.version}/cex/${token}/command/${command}`;

        this.client.publish(topic, JSON.stringify({
            observe: true
        }));
    }


    sendCommandResponse(token, response) {
        const topic = `kp1/${this.application}-${this.version}/cex/${token}/result/${response.command}`;

        this.client.publish(topic, JSON.stringify([{
            id: response.id,
            statusCode: response.statusCode,
            reasonPhrase: response.reasonPhrase,
            payload: response.payload
        }]));
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