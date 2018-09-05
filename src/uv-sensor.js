// Set Initial constiables \\
const zmq = require("zeromq");
const matrixIO = require("matrix-protos")["matrix_io"];
const dbg = require("debug");
const error = dbg("ERROR:athena.pi.iotclient:UvSensor");
const info = dbg("INFO:athena.pi.iotclient:UvSensor");

const matrixIP = "127.0.0.1";
const matrixUvBasePort = 20029;

const messageProcessor = require("./message-processor");

class UvSensor {
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
        info(`using uv sensor configuration ${JSON.stringify(this._config)}`);
        info(`connecting uv sensor config socket tcp://${matrixIP}:${matrixUvBasePort}`);
        this._configSocket.connect(`tcp://${matrixIP}:${matrixUvBasePort}`);
        this._configSocket.send(matrixIO.malos.v1.driver.DriverConfig.encode(this._config).finish());

        info(`connecting uv sensor ping socket tcp://${matrixIP}:${matrixUvBasePort + 1}`);
        this._pingSocket.connect(`tcp://${matrixIP}:${matrixUvBasePort + 1}`);
        this._pingSocket.send("");
        setInterval(() => {
            this._pingSocket.send("");
        }, 5000);

        info(`connecting uv sensor error socket tcp://${matrixIP}:${matrixUvBasePort + 2}`);
        this._errorSocket.connect(`tcp://${matrixIP}:${matrixUvBasePort + 2}`);
        this._errorSocket.subscribe("");
        this._errorSocket.on("message", function (errorMessage) {
            error(`Error received: ${errorMessage.toString("utf8")}`);
        });
        
        info(`connecting uv sensor update socket tcp://${matrixIP}:${matrixUvBasePort + 3}`);
        this._updateSocket.connect(`tcp://${matrixIP}:${matrixUvBasePort + 3}`);
        this._updateSocket.subscribe("");
        this._updateSocket.on("message", (buffer) => {
            const data = matrixIO.malos.v1.sense.UV.decode(buffer); 
            messageProcessor.state = data;
        });
    }
}
module.exports = UvSensor; 