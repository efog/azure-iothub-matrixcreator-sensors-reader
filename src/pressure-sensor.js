// Set Initial constiables \\
const dbg = require("debug");
const error = dbg("ERROR:athena.pi.iotclient:PressureSensor");
const info = dbg("INFO:athena.pi.iotclient:PressureSensor");

const zmq = require("zeromq");
const matrixIO = require("matrix-protos")["matrix_io"];

const matrixIP = "127.0.0.1";
const matrixPressureBasePort = 20025;

const messageProcessor = require("./message-processor");

class PressureSensor {
    constructor() {
        this._config = matrixIO.malos.v1.driver.DriverConfig.create({
            // Update rate configuration
            "delayBetweenUpdates": 2.0, 
            "timeoutAfterLastPing": 6.0, 
        });
    }
    connect() {
        
        this._configSocket = zmq.socket("push");
        this._pingSocket = zmq.socket("push");
        this._errorSocket = zmq.socket("sub");
        this._updateSocket = zmq.socket("sub");

        // Connect Pusher to Base port
        info(`using pressure sensor configuration ${JSON.stringify(this._config)}`);
        info(`connecting pressure sensor config socket tcp://${matrixIP}:${matrixPressureBasePort}`);
        this._configSocket.connect(`tcp://${matrixIP}:${matrixPressureBasePort}`);
        this._configSocket.send(matrixIO.malos.v1.driver.DriverConfig.encode(this._config).finish());

        info(`connecting pressure sensor ping socket tcp://${matrixIP}:${matrixPressureBasePort + 1}`);
        this._pingSocket.connect(`tcp://${matrixIP}:${matrixPressureBasePort + 1}`);
        this._pingSocket.send("");
        setInterval(() => {
            this._pingSocket.send("");
        }, 5000);

        info(`connecting pressure sensor error socket tcp://${matrixIP}:${matrixPressureBasePort + 2}`);
        this._errorSocket.connect(`tcp://${matrixIP}:${matrixPressureBasePort + 2}`);
        this._errorSocket.subscribe("");
        this._errorSocket.on("message", function (errorMessage) {
            error(`Error received: ${errorMessage.toString("utf8")}`);
        });
        
        info(`connecting pressure sensor update socket tcp://${matrixIP}:${matrixPressureBasePort + 3}`);
        this._updateSocket.connect(`tcp://${matrixIP}:${matrixPressureBasePort + 3}`);
        this._updateSocket.subscribe("");
        this._updateSocket.on("message", (buffer) => {
            const data = matrixIO.malos.v1.sense.Pressure.decode(buffer); 
            delete data.temperature;
            messageProcessor.state = data;
        });
    }
}
module.exports = PressureSensor;