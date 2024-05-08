# node-red-contrib-kaa

This Node-RED node library, `@kaaiot/node-red-contrib-kaa`, facilitates integration with the [Kaa IoT platform](https://www.kaaiot.com/), allowing Node-RED to leverage a variety of Kaa functionalities. While these nodes form an integral part of the [dedicated Kaa hosted Node-RED instance](https://www.kaaiot.com/products/nodered-hosting-plan), they are also designed for independent use.

## Nodes

The package includes the following nodes:
- **kaa-connector**: Manages connections to the Kaa server.
- **kaa-update-metadata**: Handles updating metadata on Kaa.
- **kaa-timeseries**: Manages timeseries data.
- **kaa-command-subscription**: Subscribes to commands from Kaa.
- **kaa-command-result**: Handles command results from Kaa.
- **kaa-teltonika**: Integrates with Teltonika devices.

## Installation

To install this node library, run the following command in your Node-RED environment:

```bash
npm install @kaaiot/node-red-contrib-kaa
```

Ensure that you have Node-RED already installed and running before adding this package.

## Usage

After installation, the nodes will be available in your Node-RED editor under the nodes panel. You can drag and drop these nodes into your flow and configure them according to your needs. Kaa hosted Node-RED provides flow examples using this library. Users can check the tutorial below to see how to use the nodes:

* [Connecting devices via HTTP using Node-RED to Kaa IoT Platform](https://www.kaaiot.com/blog/connecting-devices-via-http-using-node-red-to-kaa-iot-platform)

## License

This project is licensed under the ISC License.

