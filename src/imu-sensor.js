// Set Initial constiables \\
const dbg = require("debug");
const error = dbg("ERROR:athena.pi.iotclient:ImuSensor");
const info = dbg("INFO:athena.pi.iotclient:ImuSensor");

const zmq = require("zeromq");
const matrixIO = require("matrix-protos")["matrix_io"];

const matrixIP = "127.0.0.1";
const matrixImuBasePort = 20013;

const messageProcessor = require("./message-processor");

class ImuSensor {
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
        info(`using imu sensor configuration ${JSON.stringify(this._config)}`);
        info(`connecting imu sensor config socket tcp://${matrixIP}:${matrixImuBasePort}`);
        this._configSocket.connect(`tcp://${matrixIP}:${matrixImuBasePort}`);
        this._configSocket.send(matrixIO.malos.v1.driver.DriverConfig.encode(this._config).finish());

        info(`connecting imu sensor ping socket tcp://${matrixIP}:${matrixImuBasePort + 1}`);
        this._pingSocket.connect(`tcp://${matrixIP}:${matrixImuBasePort + 1}`);
        this._pingSocket.send("");
        setInterval(() => {
            this._pingSocket.send("");
        }, 5000);

        info(`connecting imu sensor error socket tcp://${matrixIP}:${matrixImuBasePort + 2}`);
        this._errorSocket.connect(`tcp://${matrixIP}:${matrixImuBasePort + 2}`);
        this._errorSocket.subscribe("");
        this._errorSocket.on("message", function (errorMessage) {
            error(`Error received: ${errorMessage.toString("utf8")}`);
        });
        
        info(`connecting imu sensor update socket tcp://${matrixIP}:${matrixImuBasePort + 3}`);
        this._updateSocket.connect(`tcp://${matrixIP}:${matrixImuBasePort + 3}`);
        this._updateSocket.subscribe("");
        this._updateSocket.on("message", (buffer) => {
            const data = matrixIO.malos.v1.sense.Imu.decode(buffer); 
            messageProcessor.state = data;
        });
    }
}
module.exports = ImuSensor;