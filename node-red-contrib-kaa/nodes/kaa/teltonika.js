
// https://wiki.teltonika-gps.com/view/Codec#Codec_8_Extended
function Processor() {
    var self = this;

    this.process = function(data) {

        if (data.length == 0) {
            throw new Error("Empty data");
        }

        var parsedMsg = new Parser(data).parse();
        console.log("Parsed message: " + JSON.stringify(parsedMsg));

        var messages = [];
        for (var i = 0; i < parsedMsg.avl.length; i++) {
            var message = new AVLIODataParser().parse(parsedMsg.avl[i]);
            console.log("AVL message: " + JSON.stringify(message));
            messages.push(message);
        }

        return { messages: messages, parsedMsg: parsedMsg };
    };

    this.format = function(msg) {
        var result = {};

        // Coolant Temperature
        if (msg.obdCoolantTemperature !== undefined) {
            result.obdCoolantTemperature = msg.obdCoolantTemperature;
            result.obdCoolantTemperatureValid = 1;
        } else {
            result.obdCoolantTemperature = 0;
            result.obdCoolantTemperatureValid = 0;
        }

        // GSM signal
        result.gsmSignal = msg.gsmSignal;

        // battery
        if (msg.externalVoltage !== undefined) {
            result.externalVoltage = msg.externalVoltage / 1000; 
            result.externalVoltageValid = 1;
        } else {
            result.externalVoltage = 0;
            result.externalVoltageValid = 0;
        }

        // GPS coordinates
        if (msg.location !== undefined) {
            result.lat = msg.location.lat;
            result.lon = msg.location.lon;
            result.locationValid = 1;
        } else {
            result.locationValid = 0;
        }

        return result;
    }

};

class Parser {
    constructor(data) {
        this.inputMsg = data;
        this.inputDataPtr = 0;
    }

    parse() {
        return this.parseAVLfull();
    }

    //**********************************************************************************************
    // parseAVLfull
    //**********************************************************************************************
    parseAVLfull() {
        var parsedMsg = {};
        parsedMsg.avl = [];

        // get packet length
        parsedMsg.fullPacketLength = this.getNextInt16();

        // get packet ID
        parsedMsg.packetId = this.getNextInt16();

        // unused byte
        this.getNextInt8();

        // get AVL packet ID, IMEI, codec ID
        parsedMsg.avlPacketId = this.getNextInt8();

        // IMEI length & IMEI
        var imeiLength = this.getNextInt16();
        if (imeiLength != 15) {
            throw new Error("Wrong imei length: " + imeiLength);
        }
        parsedMsg.moduleIMEI = this.toImeiString(this.getNextSubArray(imeiLength));

        // AVL Data array

        // AVL codec ID
        parsedMsg.codecId = this.getNextInt8();
        if (parsedMsg.codecId != 0x8E) {
            throw new Error("Wrong codecId: " + parsedMsg.codecId);
        }

        // AVL number of data
        parsedMsg.numberOfData = this.getNextInt8();

        // payload start
        for (var i = 0; i < parsedMsg.numberOfData; i++) {
            var avl = this.parseAVLpacketDataArrayElement(parsedMsg);
            parsedMsg.avl.push(avl);
        }

        // read AVL packets
        parsedMsg.numberOfRecords = this.getNextInt8();

        return parsedMsg;
    }

    //**********************************************************************************************
    // toImeiString
    //**********************************************************************************************
    toImeiString(IMEIarray) {
        var result = "";
        for (var i = 0; i < IMEIarray.length; i++) {
            result += String.fromCharCode(IMEIarray[i]);
        }
        return result;
    }

    //**********************************************************************************************
    // parseAVLpacketDataArrayElement
    //**********************************************************************************************
    parseAVLpacketDataArrayElement(parsedMsg) {
        var avl = {};
        avl.timestamp = this.getTimestamp();
        avl.priority = this.getNextInt8();
        avl.GPS = this.parseGPSelement();
        this.parseIOelement(parsedMsg, avl);

        return avl;
    }

    //**********************************************************************************************
    // parseAVLpacket
    //**********************************************************************************************
    getTimestamp() {
        var timestampArray = this.getNextSubArray(8);
        var value = 0;
        for (var i = 0; i < timestampArray.length; i++) {
            value = (value * 256) + timestampArray[i];
        }
        return value;
    }

    //**********************************************************************************************
    // parseGPSelement
    //**********************************************************************************************
    parseGPSelement() {
        var GPS = {};
        GPS.longitude = this.getCoordinate(this.getNextSubArray(4));
        GPS.latitude = this.getCoordinate(this.getNextSubArray(4));
        GPS.altitude = this.getNextInt16();
        GPS.angle = this.getNextInt16();
        GPS.satellites = this.getNextInt8();
        GPS.speed = this.getNextInt16();

        return GPS;
    }

    //**********************************************************************************************
    // getCoordinate
    //**********************************************************************************************
    getCoordinate(array) {
        var value = 0;
        if (array[0] > 127) { //negative
            value = (array[0] << 24) + (array[1] << 16) + (array[2] << 8) + array[3];
            value -= parseInt("ffffffff", 16);
        } else { //positive
            value = (array[0] << 24) + (array[1] << 16) + (array[2] << 8) + array[3];
        }
        return value / 10000000;
    }

    //**********************************************************************************************
    // parseIOelement
    //**********************************************************************************************
    parseIOelement(parsedMsg, avl) {
        avl.eventIoID = this.getNextInt16();

        //if (avl.eventIoID == 385) {
        //    parseBeacon();
        //    getNextInt8();
        //} else {
        this.parseUsualIOelements(parsedMsg, avl);
        this.decodeUsualIOelements(avl);
        //}
    }

    //**********************************************************************************************
    // parseBeacon
    //**********************************************************************************************
    parseBeacon(array) {
        const BEACON_LENGTH = 20;
        const EDDY_LENGTH = 16;

        var avl = {};

        avl.beaconLength = array.length;

        var ptr = 0;

        // dataPart
        avl.dataPart = array[ptr++];
        avl.beaconRecordsCount = avl.dataPart & 0x0F;
        avl.recordNumber = (avl.dataPart & 0xF0) >> 4;

        if (avl.beaconLength < EDDY_LENGTH) {
            return avl;
        }

        // flags
        avl.flag = array[ptr++];
        avl.sygnalStrenghAvailable = ((avl.flag & 0x01) > 0) ? 1 : 0;
        avl.beaconDataSent = ((avl.flag & 0x20) > 0) ? 1 : 0;

        // beacons
        if (avl.beaconDataSent != 0) {
            // beacon data
            avl.beaconId = array.slice(ptr, ptr + BEACON_LENGTH);
            ptr += BEACON_LENGTH;
            if (avl.sygnalStrenghAvailable != 0) {
                avl.BeaconRssi = array[ptr++];
            }
        }

        return avl;
    }

    //**********************************************************************************************
    // parseUsualIOelements
    //**********************************************************************************************
    parseUsualIOelements(parsedMsg, avl) {
        avl.nTotalIo = this.getNextInt16();
        avl.n1Io = this.getNextInt16();
        avl.ioData = new Map();
        var i = 0;
        for (i = 0; i < avl.n1Io; i++) {
            var n1IoId = this.getNextInt16();
            var n1IoValue = this.getNextInt8();
            if (n1IoValue >= 128) {
                n1IoValue = n1IoValue - 256;
            }
            avl.ioData.set(n1IoId, n1IoValue);
        }

        if (this.inputDataPtr >= parsedMsg.fullPacketLength) { return [null, null]; }
        avl.n2Io = this.getNextInt16();
        for (i = 0; i < avl.n2Io; i++) {
            var n2IoId = this.getNextInt16();
            var n2IoValue = this.getNextInt16();
            if (n2IoValue >= 0x8000) {
                n2IoValue = n2IoValue - 0x8000;
            }
            avl.ioData.set(n2IoId, n2IoValue);
        }

        if (this.inputDataPtr >= parsedMsg.fullPacketLength) { return [null, null]; }
        avl.n4Io = this.getNextInt16();
        for (i = 0; i < avl.n4Io; i++) {
            var n4IoId = this.getNextInt16();
            var n4IoValue = this.getNextInt32();
            if (n4IoValue >= 0x80000000) {
                n4IoValue = n4IoValue - 0x80000000;
            }
            avl.ioData.set(n4IoId, n4IoValue);
        }

        if (this.inputDataPtr >= parsedMsg.fullPacketLength) { return [null, null]; }
        avl.n8Io = this.getNextInt16();
        for (i = 0; i < avl.n8Io; i++) {
            var n8IoId = this.getNextInt16();
            //var n8IoSubArray = getNextSubArray(8);
            var n8IoValue = this.getNextInt64();
            if (n8IoValue >= 0x8000000000000000) {
                n8IoValue = n8IoValue - 0x8000000000000000;
            }
            //node.warn(n8IoValue);
            avl.ioData.set(n8IoId, n8IoValue);
        }
        avl.nxIo = this.getNextInt16();
        for (i = 0; i < avl.nxIo; i++) {
            var nxIoId = this.getNextInt16();
            var nxIoLength = this.getNextInt16();
            if (nxIoId == 385) {
                avl.ioData.set(nxIoId, this.parseBeacon(getNextSubArray(nxIoLength)));
            } else {
                avl.ioData.set(nxIoId, this.getNextSubArray(nxIoLength));
            }
        }
    }

    //**********************************************************************************************
    // decodeUsualIOelements
    //**********************************************************************************************
    decodeUsualIOelements(avl) {
        avl.axis = {};
        avl.axis.x = avl.ioData.get(17);
        avl.axis.y = avl.ioData.get(18);
        avl.axis.z = avl.ioData.get(19);
    }

    //**********************************************************************************************
    // getCharArray
    //**********************************************************************************************
    getCharArray(array) {
        const result = [];
        for (var i = 0; i < array.length; i++) {
            result.push(String.fromCharCode(array[i]));
        }
        return result;
    }

    //**********************************************************************************************
    // getNextSubArray
    //**********************************************************************************************
    getNextSubArray(length) {
        var subarray = this.inputMsg.slice(this.inputDataPtr, this.inputDataPtr + length);
        this.inputDataPtr += length;
        return subarray;
    }

    //**********************************************************************************************
    // getNextInt8
    //**********************************************************************************************
    getNextInt8() {
        return this.inputMsg[this.inputDataPtr++];
    }

    //**********************************************************************************************
    // getNextInt16
    //**********************************************************************************************
    getNextInt16() {
        var value = this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        return value;
    }

    //**********************************************************************************************
    // getNextInt32
    //**********************************************************************************************
    getNextInt32() {
        var value = this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        return value;
    }

    //**********************************************************************************************
    // getNextInt64
    //**********************************************************************************************
    getNextInt64() {
        var value = this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        value = (value << 8) + this.inputMsg[this.inputDataPtr++];
        return value;
    }

    //**********************************************************************************************
    // Calculates the buffers CRC-16/IBM.
    //**********************************************************************************************
    crc16(buffer, startPtr, length) {
        var crc = 0;
        var odd;

        for (var i = 0; i < length; i++) {
            crc = crc ^ buffer[i + startPtr];

            var numBit = 0;
            do {
                odd = crc & 0x0001;
                crc = crc >> 1;
                if (odd == 1) {
                    crc = crc ^ 0xA001;
                }
                numBit++;
            } while (numBit < 8);
        }

        return crc;
    };
};

class AVLIODataParser {

    parse(avl) {
        //**********************************************************************************************
        // getIoData
        // Get IO data with specified AVL ID
        //**********************************************************************************************
        var getIoData = function(id) {
            if (avl.ioData.get(id) != null) {
                return avl.ioData.get(id);
            } else {
                return avl.ioData.get(id.toString());
            }
        }

        var payload = {};
        payload.timestamp = avl.timestamp;
        payload.altitude = avl.GPS.altitude;
        payload.angle = avl.GPS.angle;
        payload.satellites = avl.GPS.satellites;
        payload.latitude = avl.GPS.latitude;
        payload.longitude = avl.GPS.longitude;
        
        if (avl.axis != undefined) {
            payload.axis_x = avl.axis.x;
            payload.axis_y = avl.axis.y;
            payload.axis_z = avl.axis.z;
        }
        
        // fuel Used GPS
        var fuelUsedGps = getIoData(12);
        if (fuelUsedGps != null) {
            payload.fuelUsedGps = fuelUsedGps;
        }
        
        // fuel Rate GPS
        var fuelRateGps = getIoData(13);
        if (fuelRateGps != null) {
            payload.fuelRateGps = fuelRateGps;
        }
        
        // total odometer
        var totalOdometer = getIoData(16);
        if (totalOdometer != null) {
            payload.totalOdometer = totalOdometer / 1000;
        }
        
        // gsmSignal
        var gsmSignal = getIoData(21);
        if (gsmSignal != null) {
            payload.gsmSignal = gsmSignal;
        }
        
        // speed
        var speed = getIoData(24);
        if (speed != null) {
            payload.speed = speed;
        }
        
        // obdDtcNumber
        var obdDtcNumber = getIoData(30);
        if (obdDtcNumber != null) {
            payload.obdDtcNumber = obdDtcNumber;
        }
        
        // obdEngineLoad
        var obdEngineLoad = getIoData(31);
        if (obdEngineLoad != null) {
            payload.obdEngineLoad = obdEngineLoad;
        }
        
        // obdCoolantTemperature
        var obdCoolantTemperature = getIoData(32);
        if (obdCoolantTemperature != null) {
            payload.obdCoolantTemperature = obdCoolantTemperature;
        }
        
        // obdShortFuelTrim
        var obdShortFuelTrim = getIoData(33);
        if (obdShortFuelTrim != null) {
            payload.obdShortFuelTrim = obdShortFuelTrim;
        }
        
        // obdFuelPressure
        var obdFuelPressure = getIoData(34);
        if (obdFuelPressure != null) {
            payload.obdFuelPressure = obdFuelPressure;
        }
        
        // obdIntakeMAP
        var obdIntakeMAP = getIoData(35);
        if (obdIntakeMAP != null) {
            payload.obdIntakeMAP = obdIntakeMAP;
        }
        
        // obdEngineRPM
        var obdEngineRPM = getIoData(36);
        if (obdEngineRPM != null) {
            payload.obdEngineRPM = obdEngineRPM;
        }
        
        // obdVehicleSpeed
        var obdVehicleSpeed = getIoData(37);
        if (obdVehicleSpeed != null) {
            payload.obdVehicleSpeed = obdVehicleSpeed;
        }
        
        // obdTimingAdvance
        var obdTimingAdvance = getIoData(38);
        if (obdTimingAdvance != null) {
            payload.obdTimingAdvance = obdTimingAdvance;
        }
        
        // obdIntakeAirTemperature
        var obdIntakeAirTemperature = getIoData(39);
        if (obdIntakeAirTemperature != null) {
            payload.obdIntakeAirTemperature = obdIntakeAirTemperature;
        }
        
        // obdThrottlePosition
        var obdThrottlePosition = getIoData(41);
        if (obdThrottlePosition != null) {
            payload.obdThrottlePosition = obdThrottlePosition;
        }
        
        // obdDistanceTraveledMILon
        var obdDistanceTraveledMILon = getIoData(43);
        if (obdDistanceTraveledMILon != null) {
            payload.obdDistanceTraveledMILon = obdDistanceTraveledMILon;
        }
        
        // obdFuelLevel
        var obdFuelLevel = getIoData(48);
        if (obdFuelLevel != null) {
            payload.obdFuelLevel = obdFuelLevel;
        } else {
            payload.obdFuelLevel = 50;
        }
        
        // engineOilTemperature
        var engineOilTemperature = getIoData(58);
        if (engineOilTemperature != null) {
            payload.engineOilTemperature = engineOilTemperature;
        }
        
        // fuelRate
        var fuelRate = getIoData(60);
        if (fuelRate != null) {
            payload.fuelRate = fuelRate;
        }
        
        // externalVoltage
        var externalVoltage = getIoData(66);
        if (externalVoltage != null) {
            payload.externalVoltage = externalVoltage;
        }
        
        // batteryVoltage
        var batteryVoltage = getIoData(67);
        if (batteryVoltage != null) {
            payload.batteryVoltage = batteryVoltage;
        }
        
        // batteryCurrent
        var batteryCurrent = getIoData(68);
        if (batteryCurrent != null) {
            payload.batteryCurrent = batteryCurrent;
        }
        
        // gnssStatus
        var gnssStatus = getIoData(69);
        if (gnssStatus != null) {
            payload.gnssStatus = gnssStatus;
        }
        
        // batteryLevel
        var batteryLevel = getIoData(113);
        if (batteryLevel != null) {
            payload.batteryLevel = batteryLevel;
        }
        
        // tripOdometer
        var tripOdometer = getIoData(199);
        if (tripOdometer != null) {
            payload.tripOdometer = tripOdometer;
        }
        
        // gsmCellId
        var gsmCellId = getIoData(205);
        if (gsmCellId != null) {
            payload.gsmCellId = gsmCellId;
        }
        
        // gsmAreaCode
        var gsmAreaCode = getIoData(206);
        if (gsmAreaCode != null) {
            payload.gsmAreaCode = gsmAreaCode;
        }
        
        // ignition
        var ignition = getIoData(239);
        if (ignition != null) {
            payload.ignition = ignition;
        }
        
        // movement
        var movement = getIoData(240);
        if (movement != null) {
            payload.movement = movement;
        }
        
        // btStatus
        var btStatus = getIoData(263);
        if (btStatus != null) {
            payload.btStatus = btStatus;
        }
        
        // instantMovement
        var instantMovement = getIoData(303);
        if (instantMovement != null) {
            payload.instantMovement = instantMovement;
        }
        
        // obdOemTotalMileage
        var obdOemTotalMileage = getIoData(389);
        if (obdOemTotalMileage != null) {
            payload.obdOemTotalMileage = obdOemTotalMileage;
        }
        
        // obdOemFuelLevel
        var obdOemFuelLevel = getIoData(390);
        if (obdOemFuelLevel != null) {
            payload.obdOemFuelLevel = obdOemFuelLevel / 10;
        } else {
            payload.obdOemFuelLevel = 50;
        }
        
        return payload;
    }

}

module.exports.Processor = Processor;
