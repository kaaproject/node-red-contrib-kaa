const Connector = require('./connector.js');
const https = require("https");

class HTTPConnector extends Connector {
    
    constructor(domain, application, version, client_id) {
        super(domain, application, version, client_id)
        this.url = "connect." + domain;
    }

    connect(connectCallback, connectionLostCallback) {
        connectCallback();
    }

    async sendMeta(payload, token) {
        var data = JSON.stringify(payload);
        return this.post('metadata', `kp1/${this.application}-${this.version}/epmx/${token}/update/keys`, data);
    };

    async publishData(payload, token) {
        var data = []
        if (Array.isArray(payload)) { 
            data = JSON.stringify(payload);
        } else {
            data = JSON.stringify([payload]);
        }

        return this.post('timeseries', `kp1/${this.application}-${this.version}/dcx/${token}/json`, data);
    };

    async post(name, topic, data) {
        console.debug(`Sending ${name} to ${topic}: ${data}`);

        var options = {
            hostname: this.url,
            port: 443,
            path: "/" + topic,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
   
                res.on('data', (chunk) => {
                    body += chunk;
                });
    
                res.on('end', () => {
                    if (res.statusCode / 2 === 100 ) {
                        resolve('Success');
                    } else {
                        reject(new Error(`${name}: statusCode=${res.statusCode}`));
                    }
                });
    
                res.on('error', (err) => {
                    reject(err);
                });
            });
            req.write(data)
            req.end();
        });
    }

}

module.exports = HTTPConnector;