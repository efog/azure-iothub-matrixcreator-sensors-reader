const Client = require("azure-iot-device").Client;
const ConnectionString = require("azure-iot-device").ConnectionString;
const dbg = require("debug");
const error = dbg("ERROR:athena.pi.iotclient:AzureIotHubClient");
const fs = require("fs");
const info = dbg("INFO:athena.pi.iotclient:AzureIotHubClient");
const Message = require("azure-iot-device").Message;
const messageProcessor = require("./message-processor");
const path = require("path");
const Protocol = require("azure-iot-device-amqp").Amqp;

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
        info(`running with config ${JSON.stringify(config)}`);
        this._connectionString = connectionString;
        this._messageId = 0;
    }
    get client() {
        if (!this._client) {
            info('Creating instance of client...');
            this._client = this.initClient();
        }
        return this._client;
    }
    clientOpened(err) {
        info(`Client opened`);
        if (err) {
            error(`[IoT hub Client] Connect error: ${err.message}`);
            return;
        }
        // set C2D and device method callback
        this._client.onDeviceMethod("start", (request, response) => {
            info(`Client started`);
            this.clientOnStart(request, response);
        });
        this._client.onDeviceMethod("stop", (request, response) => {
            info(`Client stopped`);
            this.clientOnStop(request, response);
        });
        this._client.on("message", (message) => {
            this.clientOnReceiveMessage(message);
        });
    }
    clientOnReceiveMessage(msg) {
        const message = msg.getData().toString("utf-8");
        this._client.complete(msg, () => {
            info(`received message: ${message}`);
        });
    }
    clientOnStart(request, response) {
        info(`Try to invoke method start (${request.payload})`);
        this._sendingMessage = true;
        response.send(200, "Successully start sending message to cloud", (err) => {
            if (err) {
                error(`[IoT hub Client] Failed sending a method response:\n ${err.message}`);
            }
        });
    }
    clientOnStop(request, response) {
        info(`Try to invoke method stop (${request.payload})`);
        this._sendingMessage = false;
        response.send(200, "Successully stop sending message to cloud", function (err) {
            if (err) {
                error(`[IoT hub Client] Failed sending a method response:\n ${err.message}`);
            }
        });
    }
    initClient() {
        info(`Using connection string ${this._connectionString}`);
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
            info("[Device] Using X.509 client certificate authentication");
        }
        return client;
    }
    sendMessage() {
        info("sending message initiated");
        if (this._sendingMessage) {
            return;
        }
        this._messageId++;
        info(`Message id : ${this._messageId}`);
        messageProcessor.getMessage(this._messageId, (content) => {
            const message = new Message(JSON.stringify(content));
            this._client.sendEvent(message, (err) => {
                if (err) {
                    error(`Send to IoT hub failed: ${JSON.stringify(err)}`);
                } else {
                    info(`Sent to IoT hub: ${JSON.stringify(content)}`);
                }
                setTimeout(() => {
                    this.sendMessage();
                }, this._config.interval);
            });
        });
    }
    start() {
        info('Starting...');
        this.client.open((err) => {
            this.clientOpened(err);
            setTimeout(() => {
                this.sendMessage();
            });
        });
    }
}
module.exports = AzureIotHubClient;