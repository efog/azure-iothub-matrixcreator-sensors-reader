const AzureIotHubClient = require("./azure-iot-hub-client");
const humiditySensor = require("./humidity-sensor");

const connectionString = process.env.AzureIoTHubDeviceConnectionString;
let config = null;
try {
    config = require("./config/config.json");
} catch (error) {
    console.log(`can't log config from folder, using dummy config`);
    config = {
        "simulatedData": false,
        "interval": 2000,
        "deviceId": "Raspberry Pi Dev Node",
        "LEDPin": 5,
        "messageMax": 256,
        "credentialPath": "~/.iot-hub",
        "temperatureAlert": 30,
        "i2cOption": {
            "pin": 9,
            "i2cBusNo": 1,
            "i2cAddress": 119
        }
    };
}
const client = new AzureIotHubClient(connectionString, config);
humiditySensor.connect();
client.start();