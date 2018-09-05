const Client = require("azure-iot-device").Client;
const ConnectionString = require("azure-iot-device").ConnectionString;
const fs = require("fs");
const Message = require("azure-iot-device").Message;
const messageProcessor = require("./message-processor");
const path = require("path");
const Protocol = require("azure-iot-device-mqtt").Mqtt;

/**
 * Azure IOT Hub Client bootstrap class
 *
 * @class AzureIotClient
 */
class AzureIotHubClient {

    /**
     * Default constructor
     * @param {*} connectionString Azure IOT Hub device connection string
     * @param {*} config Azure IOT Hub configuration
     */
    constructor(connectionString, config) {
        this._client = null;
        this._config = config;
        console.log(`running with config ${JSON.stringify(config)}`);
        this._connectionString = connectionString;
        this._messageId = 0;
    }
    get client() {
        if (!this._client) {
            console.log('Creating instance of client...');
            this._client = this.initClient();
        }
        return this._client;
    }
    clientOpened(err) {
        console.log(`Client opened`);
        if (err) {
            console.error(`[IoT hub Client] Connect error: ${err.message}`);
            return;
        }
        // set C2D and device method callback
        this._client.onDeviceMethod("start", (request, response) => {
            console.log(`Client started`);
            this.clientOnStart(request, response);
        });
        this._client.onDeviceMethod("stop", (request, response) => {
            console.log(`Client stopped`);
            this.clientOnStop(request, response);
        });
        this._client.on("message", (message) => {
            this.clientOnReceiveMessage(message);
        });
        setInterval(() => {
            this._client.getTwin((error, twin) => {
                if (error) {
                    console.error("get twin message error");
                    return;
                }
                this._config.interval = twin.properties.desired.interval || this._config.interval;
            });
        }, this._config.interval);
    }
    clientOnReceiveMessage(msg) {
        const message = msg.getData().toString("utf-8");
        this._client.complete(msg, () => {
            console.log(`received message: ${message}`);
        });
    }
    clientOnStart(request, response) {
        console.log(`Try to invoke method start (${request.payload})`);
        this._sendingMessage = true;
        response.send(200, "Successully start sending message to cloud", (err) => {
            if (err) {
                console.error(`[IoT hub Client] Failed sending a method response:\n ${err.message}`);
            }
        });
    }
    clientOnStop(request, response) {
        console.log(`Try to invoke method stop (${request.payload})`);
        this._sendingMessage = false;
        response.send(200, "Successully stop sending message to cloud", function (err) {
            if (err) {
                console.error(`[IoT hub Client] Failed sending a method response:\n ${err.message}`);
            }
        });
    }
    initClient() {
        console.log(`Using connection string ${this._connectionString}`);
        const connectionString = ConnectionString.parse(this._connectionString);
        const deviceId = connectionString.DeviceId;
        const client = Client.fromConnectionString(this._connectionString, Protocol);
        // Configure the client to use X509 authentication if required by the connection string.
        if (connectionString.x509) {
            // Read X.509 certificate and private key.
            // These files should be in the current folder and use the following naming convention:
            // [device name]-cert.pem and [device name]-key.pem, example: myraspberrypi-cert.pem
            const connectionOptions = {
                "cert": fs.readFileSync(path.join(this._config.credentialPath, `${deviceId}-cert.pem`)).toString(),
                "key": fs.readFileSync(path.join(this._config.credentialPath, `${deviceId}-key.pem`)).toString()
            };
            client.setOptions(connectionOptions);
            console.log("[Device] Using X.509 client certificate authentication");
        }
        return client;
    }
    sendMessage() {
        console.log("sending message initiated");
        if (this._sendingMessage) {
            return;
        }
        this._messageId++;
        console.log(`Message id : ${this._messageId}`);
        messageProcessor.getMessage(this._messageId, (content) => {
            const message = new Message(JSON.stringify(content));
            console.log(`Got message : ${message}`);
            this._client.sendEvent(message, (err) => {
                if (err) {
                    console.error(`Send to IoT hub failed: ${JSON.stringify(err)}`);
                } else {
                    console.log(`Sent to IoT hub: ${message}`);

                }
                setTimeout(() => {
                    this.sendMessage();
                }, this._config.interval);
            });
        });
    }
    start() {
        console.log('Starting...');
        this.client.open((err) => {
            this.clientOpened(err);
            setTimeout(() => {
                this.sendMessage();
            });
        });
    }
}
module.exports = AzureIotHubClient;