// Set Initial constiables \\
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
        console.log(`using humidity sensor configuration ${JSON.stringify(this._config)}`);
        console.log(`connecting humidity sensor config socket tcp://${matrixIP}:${matrixHumidityBasePort}`);
        this._configSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort}`);
        this._configSocket.send(matrixIO.malos.v1.driver.DriverConfig.encode(this._config).finish());

        console.log(`connecting humidity sensor ping socket tcp://${matrixIP}:${matrixHumidityBasePort + 1}`);
        this._pingSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort + 1}`);
        this._pingSocket.send("");
        setInterval(() => {
            this._pingSocket.send("");
        }, 500);

        console.log(`connecting humidity sensor error socket tcp://${matrixIP}:${matrixHumidityBasePort + 2}`);
        this._errorSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort + 2}`);
        this._errorSocket.subscribe("");
        this._errorSocket.on("message", function (errorMessage) {
            console.error(`Error received: ${errorMessage.toString("utf8")}`);
        });
        
        console.log(`connecting humidity sensor update socket tcp://${matrixIP}:${matrixHumidityBasePort + 3}`);
        this._updateSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort + 3}`);
        this._updateSocket.subscribe("");
        this._updateSocket.on("message", (buffer) => {
            const data = matrixIO.malos.v1.sense.Humidity.decode(buffer); 
            messageProcessor.state = data;
        });
    }
}
module.exports = HumiditySensor;