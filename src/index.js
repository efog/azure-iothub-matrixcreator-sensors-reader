const AzureIotHubClient = require("./azure-iot-hub-client");
const HumiditySensor = require("./humidity-sensor");
const ImuSensor = require("./imu-sensor");
const PressureSensor = require("./pressure-sensor");
const UvSensor = require("./uv-sensor");
const fs = require("fs");

let config = null;
try {
    const rootFiles = fs.readdirSync("./");
    rootFiles.forEach((element) => {
        console.log(element);
    });
    const configFiles = fs.readdirSync("./config");
    configFiles.forEach((element) => {
        console.log(element);
    });
    config = require("./config/config.json");
} catch (error) {
    console.error(error);
    console.log(`can't load config from folder, using dummy config`);
    config = {
        "interval": 60000,
        "deviceId": "Raspberry Pi Dev Node",
        "credentialPath": "~/.iot-hub",
        "connectionString": null
    };
}

const client = new AzureIotHubClient(config.connectionString || process.env.AzureIoTHubDeviceConnectionString, config);
const humiditySensor = new HumiditySensor();
const imuSensor = new ImuSensor();
const pressureSensor = new PressureSensor();
const uvSensor = new UvSensor();

humiditySensor.connect();
imuSensor.connect();
pressureSensor.connect();
uvSensor.connect();

client.start();