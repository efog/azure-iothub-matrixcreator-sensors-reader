// Set Initial constiables \\
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
        console.log(`using pressure sensor configuration ${JSON.stringify(this._config)}`);
        console.log(`connecting pressure sensor config socket tcp://${matrixIP}:${matrixPressureBasePort}`);
        this._configSocket.connect(`tcp://${matrixIP}:${matrixPressureBasePort}`);
        this._configSocket.send(matrixIO.malos.v1.driver.DriverConfig.encode(this._config).finish());

        console.log(`connecting pressure sensor ping socket tcp://${matrixIP}:${matrixPressureBasePort + 1}`);
        this._pingSocket.connect(`tcp://${matrixIP}:${matrixPressureBasePort + 1}`);
        this._pingSocket.send("");
        setInterval(() => {
            this._pingSocket.send("");
        }, 5000);

        console.log(`connecting pressure sensor error socket tcp://${matrixIP}:${matrixPressureBasePort + 2}`);
        this._errorSocket.connect(`tcp://${matrixIP}:${matrixPressureBasePort + 2}`);
        this._errorSocket.subscribe("");
        this._errorSocket.on("message", function (errorMessage) {
            console.error(`Error received: ${errorMessage.toString("utf8")}`);
        });
        
        console.log(`connecting pressure sensor update socket tcp://${matrixIP}:${matrixPressureBasePort + 3}`);
        this._updateSocket.connect(`tcp://${matrixIP}:${matrixPressureBasePort + 3}`);
        this._updateSocket.subscribe("");
        this._updateSocket.on("message", (buffer) => {
            const data = matrixIO.malos.v1.sense.Pressure.decode(buffer); 
            messageProcessor.state = data;
        });
    }
}
module.exports = PressureSensor;