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
        this._connectionString = process.env.AzureIoTHubDeviceConnectionString || connectionString;
        this._messageId = 0;
    }
    get client() {
        if (!this._client) {
            this._client = this.initClient();
        }
        return this._client;
    }
    clientOpened(err) {
        if (err) {
            console.error(`[IoT hub Client] Connect error: ${err.message}`);
            return;
        }
        // set C2D and device method callback
        this._client.onDeviceMethod("start", (request, response) => {
            this.clientOnStart(request, response);
        });
        this._client.onDeviceMethod("stop", (request, response) => {
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
            console.log(`Receive message: ${message}`);
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
        if (!this._sendingMessage) {
            return;
        }
        this._messageId++;
        messageProcessor.getMessage(this._messageId, (content) => {
            const message = new Message(content);
            // message.properties.add('temperatureAlert', temperatureAlert ? 'true' : 'false');
            console.log(`Sending message: ${content}`);
            this._client.sendEvent(message, (err) => {
                if (err) {
                    console.error('Failed to send message to Azure IoT Hub');
                } else {
                    console.log('Message sent to Azure IoT Hub');
                }
                setTimeout(this._sendMessage, this._config.interval);
            });
        });
    }
    start() {
        this._client.open((err) => {
            this.clientOpened(err);
        });
    }
}
module.exports = AzureIotHubClient;