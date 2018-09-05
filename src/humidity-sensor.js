// Set Initial constiables \\
const dbg = require("debug");
const error = dbg("ERROR:athena.pi.iotclient:HumiditySensor");
const info = dbg("INFO:athena.pi.iotclient:HumiditySensor");

const zmq = require("zeromq");
const matrixIO = require("matrix-protos")["matrix_io"];

const matrixIP = "127.0.0.1";
const matrixHumidityBasePort = 20017;

const messageProcessor = require("./message-processor");

class HumiditySensor {
    constructor() {
        this._config = matrixIO.malos.v1.driver.DriverConfig.create({
            // Update rate configuration
            "delayBetweenUpdates": 2.0,
            "timeoutAfterLastPing": 6.0,
            // Humidity configuration
            "humidity": matrixIO.malos.v1.sense.HumidityParams.create({
                "currentTemperature": 25
            })
        });
    }
    connect() {
        
        this._configSocket = zmq.socket("push");
        this._pingSocket = zmq.socket("push");
        this._errorSocket = zmq.socket("sub");
        this._updateSocket = zmq.socket("sub");

        // Connect Pusher to Base port
        info(`using humidity sensor configuration ${JSON.stringify(this._config)}`);
        info(`connecting humidity sensor config socket tcp://${matrixIP}:${matrixHumidityBasePort}`);
        this._configSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort}`);
        this._configSocket.send(matrixIO.malos.v1.driver.DriverConfig.encode(this._config).finish());

        info(`connecting humidity sensor ping socket tcp://${matrixIP}:${matrixHumidityBasePort + 1}`);
        this._pingSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort + 1}`);
        this._pingSocket.send("");
        setInterval(() => {
            this._pingSocket.send("");
        }, 5000);

        info(`connecting humidity sensor error socket tcp://${matrixIP}:${matrixHumidityBasePort + 2}`);
        this._errorSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort + 2}`);
        this._errorSocket.subscribe("");
        this._errorSocket.on("message", function (errorMessage) {
            error(`Error received: ${errorMessage.toString("utf8")}`);
        });
        
        info(`connecting humidity sensor update socket tcp://${matrixIP}:${matrixHumidityBasePort + 3}`);
        this._updateSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort + 3}`);
        this._updateSocket.subscribe("");
        this._updateSocket.on("message", (buffer) => {
            const data = matrixIO.malos.v1.sense.Humidity.decode(buffer); 
            messageProcessor.state = data;
        });
    }
}
module.exports = HumiditySensor;