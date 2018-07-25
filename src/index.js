// Set Initial constiables \\
const zmq = require("zeromq");
const matrixIO = require("matrix-protos")["matrix_io"];

const matrixIP = "127.0.0.1";
const matrixHumidityBasePort = 20017;

// BASE PORT \\
// Create a Pusher socket
const configSocket = zmq.socket("push");
// Connect Pusher to Base port
configSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort}`);
// Create driver configuration
const config = matrixIO.malos.v1.driver.DriverConfig.create({
    // Update rate configuration
    "delayBetweenUpdates": 2.0,
    "timeoutAfterLastPing": 6.0,
    // Humidity configuration
    "humidity": matrixIO.malos.v1.sense.HumidityParams.create({
        "currentTemperature": 25
    })
});
// Send driver configuration
configSocket.send(matrixIO.malos.v1.driver.DriverConfig.encode(config).finish());

// KEEP-ALIVE PORT \\
// Create a Pusher socket
const pingSocket = zmq.socket("push");
// Connect Pusher to Keep-alive port
pingSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort + 1}`);
// Send initial ping
pingSocket.send("");
// Send ping every 5 seconds
setInterval(function () {
    pingSocket.send("");
}, 5000);

// ERROR PORT \\
// Create a Subscriber socket
const errorSocket = zmq.socket("sub");
// Connect Subscriber to Error port
errorSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort + 2}`);
// Connect Subscriber to Error port
errorSocket.subscribe("");
// On Message
errorSocket.on("message", function (errorMessage) {
    console.log(`Error received: ${errorMessage.toString("utf8")}`);
});

// DATA UPDATE PORT \\
// Create a Subscriber socket
const updateSocket = zmq.socket("sub");
// Connect Subscriber to Data Update port
updateSocket.connect(`tcp://${matrixIP}:${matrixHumidityBasePort + 3}`);
// Subscribe to messages
updateSocket.subscribe("");
// On Message
updateSocket.on("message", function (buffer) {
    const data = matrixIO.malos.v1.sense.Humidity.decode(buffer); 
    console.log(data);
});