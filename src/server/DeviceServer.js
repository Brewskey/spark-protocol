/*
*   Copyright (c) 2015 Particle Industries, Inc.  All rights reserved.
*
*   This program is free software; you can redistribute it and/or
*   modify it under the terms of the GNU Lesser General Public
*   License as published by the Free Software Foundation, either
*   version 3 of the License, or (at your option) any later version.
*
*   This program is distributed in the hope that it will be useful,
*   but WITHOUT ANY WARRANTY; without even the implied warranty of
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
*   Lesser General Public License for more details.
*
*   You should have received a copy of the GNU Lesser General Public
*   License along with this program; if not, see <http://www.gnu.org/licenses/>.
*
* @flow
*
*/

import type { Socket } from 'net';
import type { Message } from 'h5.coap';
import type { Event, IDeviceAttributeRepository } from '../types';
import type ClaimCodeManager from '../lib/ClaimCodeManager';
import type CryptoManager from '../lib/CryptoManager';
import type EventPublisher from '../lib/EventPublisher';

import Handshake from '../lib/Handshake';

import chalk from 'chalk';
import net from 'net';
import crypto from 'crypto';
import nullthrows from 'nullthrows';
import moment from 'moment';
import Moniker from 'moniker';
import Device from '../clients/Device';

import FirmwareManager from '../lib/FirmwareManager';
import logger from '../lib/logger';
import Messages from '../lib/Messages';
import { getRequestEventName } from '../lib/EventPublisher';
import SPARK_SERVER_EVENTS from '../lib/SparkServerEvents';
import {
  DEVICE_EVENT_NAMES,
  DEVICE_MESSAGE_EVENTS_NAMES,
  SYSTEM_EVENT_NAMES,
} from '../clients/Device';

type DeviceServerConfig = {|
  HOST: string,
  PORT: number,
|};

const NAME_GENERATOR = Moniker.generator([Moniker.adjective, Moniker.noun]);

const SPECIAL_EVENTS = [
  SYSTEM_EVENT_NAMES.APP_HASH,
  SYSTEM_EVENT_NAMES.FLASH_AVAILABLE,
  SYSTEM_EVENT_NAMES.FLASH_PROGRESS,
  SYSTEM_EVENT_NAMES.FLASH_STATUS,
  SYSTEM_EVENT_NAMES.SAFE_MODE,
  SYSTEM_EVENT_NAMES.SPARK_STATUS,
];

let connectionIdCounter = 0;
class DeviceServer {
  _claimCodeManager: ClaimCodeManager;
  _config: DeviceServerConfig;
  _cryptoManager: CryptoManager;
  _deviceAttributeRepository: IDeviceAttributeRepository;
  _devicesById: Map<string, Device> = new Map();
  _areSystemFirmwareAutoupdatesEnabled: boolean;
  _eventPublisher: EventPublisher;

  constructor(
    deviceAttributeRepository: IDeviceAttributeRepository,
    claimCodeManager: ClaimCodeManager,
    cryptoManager: CryptoManager,
    eventPublisher: EventPublisher,
    deviceServerConfig: DeviceServerConfig,
    areSystemFirmwareAutoupdatesEnabled: boolean,
  ) {
    this._config = deviceServerConfig;
    this._deviceAttributeRepository = deviceAttributeRepository;
    this._cryptoManager = cryptoManager;
    this._claimCodeManager = claimCodeManager;
    this._eventPublisher = eventPublisher;
    this._areSystemFirmwareAutoupdatesEnabled =
      areSystemFirmwareAutoupdatesEnabled;
  }

  start() {
    this._eventPublisher.subscribe(
      getRequestEventName(SPARK_SERVER_EVENTS.CALL_DEVICE_FUNCTION),
      this._onSparkServerCallDeviceFunctionRequest,
    );

    this._eventPublisher.subscribe(
      getRequestEventName(SPARK_SERVER_EVENTS.FLASH_DEVICE),
      this._onSparkServerFlashDeviceRequest,
    );

    this._eventPublisher.subscribe(
      getRequestEventName(SPARK_SERVER_EVENTS.GET_DEVICE_DESCRIPTION),
      this._onSparkServerGetDeviceDescriptionRequest,
    );

    this._eventPublisher.subscribe(
      getRequestEventName(SPARK_SERVER_EVENTS.GET_DEVICE_VARIABLE_VALUE),
      this._onSparkServerGetDeviceVariableValueRequest,
    );

    this._eventPublisher.subscribe(
      getRequestEventName(SPARK_SERVER_EVENTS.PING_DEVICE),
      this._onSparkServerPingDeviceRequest,
    );

    this._eventPublisher.subscribe(
      getRequestEventName(SPARK_SERVER_EVENTS.RAISE_YOUR_HAND),
      this._onSparkServerRaiseYourHandRequest,
    );

    const server = net.createServer(
      (socket: Socket): void =>
        process.nextTick((): Promise<void> =>
          this._onNewSocketConnection(socket),
        ),
    );

    setInterval(
      (): void => server.getConnections((error: Error, count: number) => {
        logger.info(
          `Connected Devices ${chalk.green(this._devicesById.size)}`,
          ` - Sockets ${chalk.green(count)} `,
        );
      }),
      10000,
    );

    server.on('error', (error: Error): void =>
      logger.error(`something blew up ${error.message}`),
    );

    const serverPort = this._config.PORT.toString();
    server.listen(
      serverPort,
      (): void => logger.log(`Server started on port: ${serverPort}`),
    );
  }

  _updateDeviceSystemFirmware = async (device: Device): Promise<void> => {
    const description = await device.getDescription();
    const systemInformation = description.systemInformation;
    if (!systemInformation) {
      return;
    }

    const { deviceID, ownerID } = device.getAttributes();

    const config = await FirmwareManager.getOtaSystemUpdateConfig(
      systemInformation,
    );
    if (!config) {
      return;
    }

    setTimeout(
      async (): Promise<void> => {
        this.publishSpecialEvent(
          SYSTEM_EVENT_NAMES.SAFE_MODE_UPDATING,
          // Lets the user know if it's the system update part 1/2/3
          config.moduleIndex + 1,
          deviceID,
          ownerID,
        );

        await device.flash(config.systemFile);
      },
      1000,
    );
  };

  _onNewSocketConnection = async (socket: Socket): Promise<void> => {
    try {
      connectionIdCounter += 1;
      const counter = connectionIdCounter;
      const connectionKey = `_${connectionIdCounter}`;
      const handshake = new Handshake(this._cryptoManager);
      const device = new Device(
        socket,
        connectionKey,
        handshake,
      );

      const deviceID = await device.startProtocolInitialization();
      try {
        // todo fix this:  its needed only for flash events
        // and we dont get ownerID at this point
        // const ownerID = deviceAttributes && deviceAttributes.ownerID;

        device.on(
          DEVICE_EVENT_NAMES.DISCONNECT,
          (): Promise<void> => this._onDeviceDisconnect(device),
        );

        device.on(
          DEVICE_MESSAGE_EVENTS_NAMES.SUBSCRIBE,
          (message: Message): Promise<void> =>
            this._onDeviceSubscribe(message, device),
        );

        device.on(
          DEVICE_MESSAGE_EVENTS_NAMES.PRIVATE_EVENT,
          (message: Message): Promise<void> =>
            this._onDeviceSentMessage(
              message,
              /* isPublic */false,
              device,
            ),
        );

        device.on(
          DEVICE_MESSAGE_EVENTS_NAMES.PUBLIC_EVENT,
          (message: Message): Promise<void> =>
            this._onDeviceSentMessage(
              message,
              /* isPublic */true,
              device,
            ),
        );

        device.on(
          DEVICE_MESSAGE_EVENTS_NAMES.GET_TIME,
          (message: Message): void =>
            this._onDeviceGetTime(message, device),
        );

        // device.on(
        //   DEVICE_EVENT_NAMES.FLASH_STARTED,
        //   (): void => this.publishSpecialEvent(
        //     SYSTEM_EVENT_NAMES.FLASH_STATUS,
        //     'started',
        //     deviceID,
        //     ownerID,
        //   ),
        // );
        //
        // device.on(
        //   DEVICE_EVENT_NAMES.FLASH_SUCCESS,
        //   (): void => this.publishSpecialEvent(
        //     SYSTEM_EVENT_NAMES.FLASH_STATUS,
        //     'success',
        //     deviceID,
        //     ownerID,
        //   ),
        // );
        //
        // device.on(
        //   DEVICE_EVENT_NAMES.FLASH_FAILED,
        //   (): void => this.publishSpecialEvent(
        //     SYSTEM_EVENT_NAMES.FLASH_STATUS,
        //     'failed',
        //     deviceID,
        //     ownerID,
        //   ),
        // );

        if (this._devicesById.has(deviceID)) {
          const existingConnection = this._devicesById.get(deviceID);
          nullthrows(existingConnection).disconnect(
            'Device was already connected. Reconnecting.\r\n',
          );
        }

        this._devicesById.set(deviceID, device);

        device.completeProtocolInitialization();

        // process.nextTick(() => this._onDeviceReady(device));
        setImmediate((): void => this._onDeviceReady(device));


        logger.info(
          `Connection from: ${device.getRemoteIPAddress()} - ` +
            `Device ID: ${deviceID}`,
            `Connection ID: ${counter}`,
        );
      } catch (error) {
        device.disconnect(
          `Error during connection: ${error}`,
        );
      }
    } catch (error) {
      logger.error(`Device startup failed: ${error.message}`);
    }
  };

  _onDeviceDisconnect = async (
    device: Device,
  ): Promise<void> => {
    const deviceAttributes = device.getAttributes();
    const { deviceID, ownerID } = deviceAttributes;
    console.log('disconnect');

    const newDevice = this._devicesById.get(deviceID);
    const connectionKey = device.getConnectionKey();
    if (device !== newDevice) {
      return;
    }

    this._devicesById.delete(deviceID);
    this._eventPublisher.unsubscribeBySubscriberID(deviceID);

    await this._deviceAttributeRepository.update(deviceAttributes);

    this.publishSpecialEvent(
      SYSTEM_EVENT_NAMES.SPARK_STATUS,
      'offline',
      deviceID,
      ownerID,
    );
    logger.warn(
      `Session ended for device with ID: ${deviceID} with connectionKey: ` +
      `${connectionKey || 'no connection key'}`,
    );
  };

  _onDeviceGetTime = (message: Message, device: Device) => {
    const timeStamp = moment().utc().unix();
    const binaryValue = Messages.toBinary(timeStamp, 'uint32');

    device.sendReply(
      'GetTimeReturn',
      message.getId(),
      binaryValue,
      message.getToken(),
    );
  };

  _onDeviceReady = async (device: Device): Promise<void> => {
    try {
      logger.log('Device online!');
      const deviceID = device.getID();

      const existingAttributes =
        await this._deviceAttributeRepository.getByID(deviceID);
      device.updateAttributes(existingAttributes);

      const ownerID = existingAttributes && existingAttributes.ownerID;

      this.publishSpecialEvent(
        SYSTEM_EVENT_NAMES.SPARK_STATUS,
        'online',
        deviceID,
        ownerID,
      );

      const description = await device.getDescription();
      const { uuid } = FirmwareManager.getAppModule(
        description.systemInformation,
      );

      const deviceAttributes = {
        name: NAME_GENERATOR.choose(),
        ...existingAttributes,
        appHash: uuid,
        deviceID,
        ip: device.getRemoteIPAddress(),
        lastHeard: new Date(),
        particleProductId: description.productID,
        productFirmwareVersion: description.firmwareVersion,
      };

      this._deviceAttributeRepository.update(
        deviceAttributes,
      );

      // Send app-hash if this is a new app firmware
      if (!existingAttributes || uuid !== existingAttributes.appHash) {
        this.publishSpecialEvent(
          SYSTEM_EVENT_NAMES.APP_HASH,
          uuid,
          deviceID,
          ownerID,
        );
      }
    } catch (error) {
      logger.error(error);
    }
  };

  _onDeviceSentMessage = async (
    message: Message,
    isPublic: boolean,
    device: Device,
  ): Promise<void> => {
    try {
      const { deviceID, name, ownerID } = device.getAttributes();

      const eventData = {
        connectionID: device.getConnectionKey(),
        data: message.getPayloadLength() === 0
          ? ''
          : message.getPayload().toString(),
        deviceID,
        isPublic,
        name: message.getUriPath().substr(3),
        ttl: message.getMaxAge(),
      };

      const eventName = eventData.name.toLowerCase();

      let shouldSwallowEvent = false;

      // All spark events except special events should be hidden from the
      // event stream.
      if (eventName.startsWith('spark')) {
        // These should always be private but let's make sure. This way
        // if you are listening to a specific device you only see the system
        // events from it.
        eventData.isPublic = false;

        shouldSwallowEvent = !SPECIAL_EVENTS.some(
          (specialEvent: string): boolean =>
            eventName.startsWith(specialEvent),
        );
        if (shouldSwallowEvent) {
          device.sendReply('EventAck', message.getId());
        }
      }

      if (!shouldSwallowEvent && ownerID) {
        this._eventPublisher.publish({ ...eventData, userID: ownerID });
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.CLAIM_CODE)) {
        await this._onDeviceClaimCodeMessage(message, device);
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.GET_IP)) {
        this.publishSpecialEvent(
          SYSTEM_EVENT_NAMES.GET_NAME,
          device.getRemoteIPAddress(),
          deviceID,
          ownerID,
        );
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.GET_NAME)) {
        this.publishSpecialEvent(
          SYSTEM_EVENT_NAMES.GET_NAME,
          name,
          deviceID,
          ownerID,
        );
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.GET_RANDOM_BUFFER)) {
        const cryptoString = crypto
          .randomBytes(40)
          .toString('base64')
          .substring(0, 40);

        this.publishSpecialEvent(
          SYSTEM_EVENT_NAMES.GET_RANDOM_BUFFER,
          cryptoString,
          deviceID,
          ownerID,
        );
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.IDENTITY)) {
        // TODO - open up for possibility of retrieving multiple ID datums
        // This is mostly for electron - You can get the IMEI and IICCID this way
        // https://github.com/spark/firmware/blob/develop/system/src/system_cloud_internal.cpp#L682-L685
        // https://github.com/spark/firmware/commit/73df5a4ac4c64f008f63a495d50f866d724c6201
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.LAST_RESET)) {
        this.publishSpecialEvent(
          SYSTEM_EVENT_NAMES.LAST_RESET,
          eventData.data,
          deviceID,
          ownerID,
        );
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.MAX_BINARY)) {
        device.setMaxBinarySize(Number.parseInt(nullthrows(eventData.data), 10));
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.OTA_CHUNK_SIZE)) {
        device.setOtaChunkSize(Number.parseInt(nullthrows(eventData.data), 10));
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.SAFE_MODE)) {
        this.publishSpecialEvent(
          SYSTEM_EVENT_NAMES.SAFE_MODE,
          eventData.data,
          deviceID,
          ownerID,
        );

        if (this._areSystemFirmwareAutoupdatesEnabled) {
          await this._updateDeviceSystemFirmware(device);
        }
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.SPARK_SUBSYSTEM)) {
        // TODO: Test this with a Core device
        // get patch version from payload
        // compare with version on disc
        // if device version is old, do OTA update with patch
      }
    } catch (error) {
      logger.error(error);
    }
  };

  _onDeviceClaimCodeMessage = async (
    message: Message,
    device: Device,
  ): Promise<void> => {
    const claimCode = message.getPayload().toString();
    const deviceAttributes = device.getAttributes();

    if (
      deviceAttributes.ownerID ||
      deviceAttributes.claimCode === claimCode
    ) {
      return;
    }

    const claimRequestUserID =
      this._claimCodeManager.getUserIDByClaimCode(claimCode);
    if (!claimRequestUserID) {
      return;
    }

    const newAttributes = {
      ...deviceAttributes,
      claimCode,
      ownerID: claimRequestUserID,
    };

    device.updateAttributes(newAttributes);
    await this._deviceAttributeRepository.update(newAttributes);

    this._claimCodeManager.removeClaimCode(claimCode);
  };

  _onDeviceSubscribe = async (
    message: Message,
    device: Device,
  ): Promise<void> => {
    // uri -> /e/?u    --> firehose for all my devices
    // uri -> /e/ (deviceid in body)   --> allowed
    // uri -> /e/    --> not allowed (no global firehose for cores, kthxplox)
    // uri -> /e/event_name?u    --> all my devices
    // uri -> /e/event_name?u (deviceid)    --> deviceid?
    const messageName = message.getUriPath().substr(3);
    const deviceAttributes = device.getAttributes();
    const deviceID = deviceAttributes.deviceID;
    let ownerID = deviceAttributes.ownerID;

    const query = message.getUriQuery();
    const isFromMyDevices = query && !!query.match('u');

    if (!messageName) {
      device.sendReply('SubscribeFail', message.getId());
      return;
    }

    logger.log(
      'Subscribe Request:\r\n',
      {
        deviceID,
        isFromMyDevices,
        messageName,
      },
    );

    device.sendReply('SubscribeAck', message.getId());

    process.nextTick(() => {
      if (!ownerID) {
        logger.log(
          `device with ID ${deviceID} wasn't subscribed to ` +
            `${messageName} event: the device is unclaimed.`,
        );
        ownerID = '--unclaimed--';
      }

      const isSystemEvent = messageName.startsWith('spark');

      this._eventPublisher.subscribe(
        messageName,
        device.onDeviceEvent,
        {
          filterOptions: {
            connectionID: isSystemEvent ? device.getConnectionKey() : null,
            mydevices: isFromMyDevices,
            userID: ownerID,
          },
          subscriberID: deviceID,
        },
      );
    });
  };

  _onSparkServerCallDeviceFunctionRequest = async (event: Event): Promise<void> => {
    const {
      deviceID,
      functionArguments,
      functionName,
      responseEventName,
    } = nullthrows(event.context);
    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }

      this._eventPublisher.publish({
        context: await device.callFunction(functionName, functionArguments),
        isPublic: false,
        name: responseEventName,
      });
    } catch (error) {
      this._eventPublisher.publish({
        context: { error },
        isPublic: false,
        name: responseEventName,
      });
    }
  };

  _onSparkServerFlashDeviceRequest = async (event: Event): Promise<void> => {
    const {
      deviceID,
      fileBuffer,
      responseEventName,
    } = nullthrows(event.context);
    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }

      this._eventPublisher.publish({
        context: await device.flash(fileBuffer),
        isPublic: false,
        name: responseEventName,
      });
    } catch (error) {
      this._eventPublisher.publish({
        context: { error },
        isPublic: false,
        name: responseEventName,
      });
    }
  };

  _onSparkServerGetDeviceDescriptionRequest = async (event: Event): Promise<void> => {
    const {
      deviceID,
      responseEventName,
    } = nullthrows(event.context);
    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }

      this._eventPublisher.publish({
        context: await device.getDescription(),
        isPublic: false,
        name: responseEventName,
      });
    } catch (error) {
      this._eventPublisher.publish({
        context: { error },
        isPublic: false,
        name: responseEventName,
      });
    }
  };

  _onSparkServerGetDeviceVariableValueRequest = async (event: Event): Promise<void> => {
    const {
      deviceID,
      responseEventName,
      variableName,
    } = nullthrows(event.context);

    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }

      this._eventPublisher.publish({
        context: { result: await device.getVariableValue(variableName) },
        isPublic: false,
        name: responseEventName,
      });
    } catch (error) {
      this._eventPublisher.publish({
        context: { error },
        isPublic: false,
        name: responseEventName,
      });
    }
  };

  _onSparkServerPingDeviceRequest = async (event: Event): Promise<void> => {
    const { deviceID, responseEventName } = nullthrows(event.context);

    const device = this.getDevice(deviceID);
    const pingObject = device
      ? device.ping()
      : {
        connected: false,
        lastPing: null,
      };

    this._eventPublisher.publish({
      context: pingObject,
      isPublic: false,
      name: responseEventName,
    });
  };

  _onSparkServerRaiseYourHandRequest = async (event: Event): Promise<void> => {
    const {
      deviceID,
      responseEventName,
      shouldShowSignal,
    } = nullthrows(event.context);

    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }

      this._eventPublisher.publish({
        context: await device.raiseYourHand(shouldShowSignal),
        isPublic: false,
        name: responseEventName,
      });
    } catch (error) {
      this._eventPublisher.publish({
        context: { error },
        isPublic: false,
        name: responseEventName,
      });
    }
  };

  getDevice = (deviceID: string): ?Device =>
    this._devicesById.get(deviceID);

  publishSpecialEvent = (
    eventName: string,
    data: string,
    deviceID: string,
    userID: ?string,
  ) => {
    if (!userID) {
      return;
    }
    process.nextTick(() => {
      this._eventPublisher.publish({
        data,
        deviceID,
        isPublic: false,
        name: eventName,
        userID,
      });
    });
  }
}

export default DeviceServer;
