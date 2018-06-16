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
import type {
  EventData,
  IDeviceAttributeRepository,
  IProductDeviceRepository,
  IProductFirmwareRepository,
  ProductDevice,
  ProtocolEvent,
  PublishOptions,
} from '../types';
import type ClaimCodeManager from '../lib/ClaimCodeManager';
import type CryptoManager from '../lib/CryptoManager';
import type EventPublisher from '../lib/EventPublisher';

import Handshake from '../lib/Handshake';

import net from 'net';
import crypto from 'crypto';
import nullthrows from 'nullthrows';
import moment from 'moment';
import Moniker from 'moniker';
import Device from '../clients/Device';

import FirmwareManager from '../lib/FirmwareManager';
import CoapMessages from '../lib/CoapMessages';
import { getRequestEventName } from '../lib/EventPublisher';
import SPARK_SERVER_EVENTS from '../lib/SparkServerEvents';
import {
  DEVICE_EVENT_NAMES,
  DEVICE_MESSAGE_EVENTS_NAMES,
  DEVICE_STATUS_MAP,
  SYSTEM_EVENT_NAMES,
} from '../clients/Device';
import Logger from '../lib/logger';
const logger = Logger.createModuleLogger(module);

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
  _areSystemFirmwareAutoupdatesEnabled: boolean;
  _claimCodeManager: ClaimCodeManager;
  _config: DeviceServerConfig;
  _cryptoManager: CryptoManager;
  _deviceAttributeRepository: IDeviceAttributeRepository;
  _devicesById: Map<string, Device> = new Map();
  _eventPublisher: EventPublisher;
  _productDeviceRepository: IProductDeviceRepository;
  _productFirmwareRepository: IProductFirmwareRepository;

  constructor(
    deviceAttributeRepository: IDeviceAttributeRepository,
    productDeviceRepository: IProductDeviceRepository,
    productFirmwareRepository: IProductFirmwareRepository,
    claimCodeManager: ClaimCodeManager,
    cryptoManager: CryptoManager,
    eventPublisher: EventPublisher,
    deviceServerConfig: DeviceServerConfig,
    areSystemFirmwareAutoupdatesEnabled: boolean,
  ) {
    this._areSystemFirmwareAutoupdatesEnabled = areSystemFirmwareAutoupdatesEnabled;
    this._config = deviceServerConfig;
    this._cryptoManager = cryptoManager;
    this._claimCodeManager = claimCodeManager;
    this._deviceAttributeRepository = deviceAttributeRepository;
    this._eventPublisher = eventPublisher;
    this._productDeviceRepository = productDeviceRepository;
    this._productFirmwareRepository = productFirmwareRepository;
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
      getRequestEventName(SPARK_SERVER_EVENTS.GET_DEVICE_ATTRIBUTES),
      this._onSparkServerGetDeviceAttributes,
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

    this._eventPublisher.subscribe(
      getRequestEventName(SPARK_SERVER_EVENTS.UPDATE_DEVICE_ATTRIBUTES),
      this._onSparkServerUpdateDeviceAttributesRequest,
    );

    this._eventPublisher.subscribe(
      SPARK_SERVER_EVENTS.FLASH_PRODUCT_FIRMWARE,
      this._onFlashProductFirmware,
    );

    const server = net.createServer((socket: Socket): void =>
      process.nextTick((): Promise<void> =>
        this._onNewSocketConnection(socket),
      ),
    );

    setInterval(
      (): void =>
        server.getConnections((error: Error, count: number) => {
          logger.info(
            { devices: this._devicesById.size, sockets: count },
            'Connected Devices',
          );
        }),
      10000,
    );

    server.on('error', (error: Error): void =>
      logger.error({ err: error }, 'something blew up'),
    );

    const serverPort = this._config.PORT.toString();
    server.listen(serverPort, (): void =>
      logger.info({ serverPort }, 'Server started'),
    );
  }

  _updateDeviceSystemFirmware = async (device: Device): Promise<void> => {
    await device.hasStatus(DEVICE_STATUS_MAP.READY);
    const { deviceID, ownerID } = device.getAttributes();
    const systemInformation = device.getSystemInformation();

    const config = FirmwareManager.getOtaSystemUpdateConfig(systemInformation);
    if (!config) {
      return;
    }

    setTimeout(async (): Promise<void> => {
      this.publishSpecialEvent(
        SYSTEM_EVENT_NAMES.SAFE_MODE_UPDATING,
        // Lets the user know if it's the system update part 1/2/3
        config.moduleIndex,
        deviceID,
        ownerID,
        false,
      );

      await device.flash(config.systemFile);
    }, 1000);
  };

  _checkProductFirmwareForUpdate = async (
    device: Device,
    /*appModule: Object,*/
  ): Promise<void> => {
    const productDevice = await this._productDeviceRepository.getFromDeviceID(
      device.getDeviceID(),
    );

    await this._flashDevice(productDevice);
  };

  _onNewSocketConnection = async (socket: Socket): Promise<void> => {
    try {
      logger.info('New Connection');
      connectionIdCounter += 1;
      const counter = connectionIdCounter;
      const connectionKey = `_${connectionIdCounter}`;
      const handshake = new Handshake(this._cryptoManager);
      const device = new Device(socket, connectionKey, handshake);

      const deviceID = await device.startProtocolInitialization();

      logger.info(
        {
          connectionID: counter,
          deviceID,
          remoteIPAddress: device.getRemoteIPAddress(),
        },
        'Connection',
      );

      process.nextTick(async (): Promise<void> => {
        try {
          device.on(DEVICE_EVENT_NAMES.DISCONNECT, (): Promise<void> =>
            this._onDeviceDisconnect(device),
          );

          device.on(
            DEVICE_MESSAGE_EVENTS_NAMES.SUBSCRIBE,
            (packet: CoapPacket): Promise<void> =>
              this._onDeviceSubscribe(packet, device),
          );

          device.on(
            DEVICE_MESSAGE_EVENTS_NAMES.PRIVATE_EVENT,
            (packet: CoapPacket): Promise<void> =>
              this._onDeviceSentMessage(packet, /* isPublic*/ false, device),
          );

          device.on(
            DEVICE_MESSAGE_EVENTS_NAMES.PUBLIC_EVENT,
            (packet: CoapPacket): Promise<void> =>
              this._onDeviceSentMessage(packet, /* isPublic*/ true, device),
          );

          device.on(
            DEVICE_MESSAGE_EVENTS_NAMES.GET_TIME,
            (packet: CoapPacket): void => this._onDeviceGetTime(packet, device),
          );

          // TODO in the next 3 subscriptions for flashing events
          // there is code duplication, its not clean, but
          // i guess we'll remove these subscription soon anyways
          // so I keep it like this for now.
          device.on(DEVICE_EVENT_NAMES.FLASH_STARTED, async (): Promise<
            void,
          > => {
            await device.hasStatus(DEVICE_STATUS_MAP.READY);
            const { ownerID } = device.getAttributes();
            this.publishSpecialEvent(
              SYSTEM_EVENT_NAMES.FLASH_STATUS,
              'started',
              deviceID,
              ownerID,
              false,
            );
          });

          device.on(DEVICE_EVENT_NAMES.FLASH_SUCCESS, async (): Promise<
            void,
          > => {
            await device.hasStatus(DEVICE_STATUS_MAP.READY);
            const { ownerID } = device.getAttributes();
            this.publishSpecialEvent(
              SYSTEM_EVENT_NAMES.FLASH_STATUS,
              'success',
              deviceID,
              ownerID,
              false,
            );
          });

          device.on(DEVICE_EVENT_NAMES.FLASH_FAILED, async (): Promise<
            void,
          > => {
            await device.hasStatus(DEVICE_STATUS_MAP.READY);
            const { ownerID } = device.getAttributes();
            this.publishSpecialEvent(
              SYSTEM_EVENT_NAMES.FLASH_STATUS,
              'failed',
              deviceID,
              ownerID,
              false,
            );
          });

          if (this._devicesById.has(deviceID)) {
            const existingConnection = this._devicesById.get(deviceID);
            nullthrows(existingConnection).disconnect(
              'Device was already connected. Reconnecting.',
            );
          }

          this._devicesById.set(deviceID, device);

          const systemInformation = await device.completeProtocolInitialization();

          let appModules;
          try {
            appModules = FirmwareManager.getAppModule(systemInformation);
          } catch (ignore) {
            appModules = { uuid: 'none' };
          }

          const { uuid: appHash } = appModules;

          await this._checkProductFirmwareForUpdate(device /* appModule*/);

          const existingAttributes = await this._deviceAttributeRepository.getByID(
            deviceID,
          );

          const {
            claimCode,
            currentBuildTarget,
            imei,
            isCellular,
            last_iccid,
            name,
            ownerID,
            registrar,
          } =
            existingAttributes || {};

          device.updateAttributes({
            appHash,
            claimCode,
            currentBuildTarget,
            imei,
            isCellular,
            last_iccid,
            lastHeard: new Date(),
            name: name || NAME_GENERATOR.choose(),
            ownerID,
            registrar,
          });

          device.setStatus(DEVICE_STATUS_MAP.READY);

          this.publishSpecialEvent(
            SYSTEM_EVENT_NAMES.SPARK_STATUS,
            'online',
            deviceID,
            ownerID,
            false,
          );

          // TODO
          // we may update attributes only on disconnect, but currently
          // removing update here can break claim/provision flow
          // so need to test carefully before doing this.
          await this._deviceAttributeRepository.updateByID(
            deviceID,
            device.getAttributes(),
          );

          // Send app-hash if this is a new app firmware
          if (!existingAttributes || appHash !== existingAttributes.appHash) {
            this.publishSpecialEvent(
              SYSTEM_EVENT_NAMES.APP_HASH,
              appHash,
              deviceID,
              ownerID,
              false,
            );
          }

          device.emit(DEVICE_EVENT_NAMES.READY);
        } catch (error) {
          device.disconnect(
            `Error during connection: ${error}: ${error.stack}`,
          );
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Device startup failed');
    }
  };

  _onDeviceDisconnect = async (device: Device): Promise<void> => {
    const attributes = device.getAttributes();
    const { deviceID, ownerID } = attributes;

    const newDevice = this._devicesById.get(deviceID);
    const connectionKey = device.getConnectionKey();
    if (device !== newDevice) {
      return;
    }

    this._devicesById.delete(deviceID);
    this._eventPublisher.unsubscribeBySubscriberID(deviceID);

    if (device.getStatus() === DEVICE_STATUS_MAP.READY) {
      await this._deviceAttributeRepository.updateByID(deviceID, attributes);
    }

    this.publishSpecialEvent(
      SYSTEM_EVENT_NAMES.SPARK_STATUS,
      'offline',
      deviceID,
      ownerID,
      false,
    );
    logger.warn(
      {
        connectionKey,
        deviceID,
      },
      'Session ended for Device',
    );
  };

  _onDeviceGetTime = (packet: CoapPacket, device: Device) => {
    const timeStamp = moment()
      .utc()
      .unix();
    const binaryValue = CoapMessages.toBinary(timeStamp, 'uint32');

    device.sendReply(
      'GetTimeReturn',
      packet.messageId,
      binaryValue,
      packet.token.length ? packet.token.readUInt8(0) : 0,
    );
  };

  _onDeviceSentMessage = async (
    packet: CoapPacket,
    isPublic: boolean,
    device: Device,
  ): Promise<void> => {
    try {
      await device.hasStatus(DEVICE_STATUS_MAP.READY);
      const { deviceID, name, ownerID } = device.getAttributes();

      const eventData: EventData = {
        connectionID: device.getConnectionKey(),
        data: packet.payload.toString('utf8'),
        deviceID,
        name: CoapMessages.getUriPath(packet).substr(3),
        ttl: CoapMessages.getMaxAge(packet),
      };

      const publishOptions: PublishOptions = {
        isInternal: false,
        isPublic,
      };
      const eventName = eventData.name.toLowerCase();

      let shouldSwallowEvent = false;

      // All spark events except special events should be hidden from the
      // event stream.
      if (eventName.startsWith('spark')) {
        // These should always be private but let's make sure. This way
        // if you are listening to a specific device you only see the system
        // events from it.
        publishOptions.isPublic = false;

        shouldSwallowEvent =
          !SPECIAL_EVENTS.some((specialEvent: string): boolean =>
            eventName.startsWith(specialEvent),
          ) || device.isFlashing();
        if (shouldSwallowEvent) {
          device.sendReply('EventAck', packet.messageId);
        }
      }

      if (!shouldSwallowEvent && ownerID) {
        this._eventPublisher.publish(
          { ...eventData, userID: ownerID },
          publishOptions,
        );
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.CLAIM_CODE)) {
        await this._onDeviceClaimCodeMessage(packet, device);
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.GET_IP)) {
        this.publishSpecialEvent(
          SYSTEM_EVENT_NAMES.GET_NAME,
          device.getRemoteIPAddress(),
          deviceID,
          ownerID,
          false,
        );
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.GET_NAME)) {
        this.publishSpecialEvent(
          SYSTEM_EVENT_NAMES.GET_NAME,
          name,
          deviceID,
          ownerID,
          false,
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
          false,
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
          false,
        );
      }

      if (eventName.startsWith(SYSTEM_EVENT_NAMES.MAX_BINARY)) {
        device.setMaxBinarySize(
          Number.parseInt(nullthrows(eventData.data), 10),
        );
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
          false,
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
      logger.error({ err: error }, 'Error');
    }
  };

  _onDeviceClaimCodeMessage = async (
    packet: CoapPacket,
    device: Device,
  ): Promise<void> => {
    await device.hasStatus(DEVICE_STATUS_MAP.READY);
    const claimCode = packet.payload.toString('utf8');
    const {
      claimCode: previousClaimCode,
      deviceID,
      ownerID,
    } = device.getAttributes();

    if (ownerID || claimCode === previousClaimCode) {
      return;
    }

    const claimRequestUserID = this._claimCodeManager.getUserIDByClaimCode(
      claimCode,
    );
    if (!claimRequestUserID) {
      return;
    }

    device.updateAttributes({
      claimCode,
      ownerID: claimRequestUserID,
    });
    await this._deviceAttributeRepository.updateByID(deviceID, {
      claimCode,
      ownerID: claimRequestUserID,
    });

    this._claimCodeManager.removeClaimCode(claimCode);
  };

  _onDeviceSubscribe = async (
    packet: CoapPacket,
    device: Device,
  ): Promise<void> => {
    await device.hasStatus(DEVICE_STATUS_MAP.READY);
    process.nextTick(() => {
      const deviceAttributes = device.getAttributes();
      const deviceID = deviceAttributes.deviceID;
      let ownerID = deviceAttributes.ownerID;

      // uri -> /e/?u    --> firehose for all my devices
      // uri -> /e/ (deviceid in body)   --> allowed
      // uri -> /e/    --> not allowed (no global firehose for cores, kthxplox)
      // uri -> /e/event_name?u    --> all my devices
      // uri -> /e/event_name?u (deviceid)    --> deviceid?
      const messageName = CoapMessages.getUriPath(packet).substr(3);
      const query = CoapMessages.getUriQuery(packet);
      const isFromMyDevices = !!query.match('u');

      if (!messageName) {
        device.sendReply('SubscribeFail', packet.messageId);
        return;
      }

      logger.info(
        {
          deviceID,
          isFromMyDevices,
          messageName,
        },
        'Subscribe Request',
      );

      device.sendReply('SubscribeAck', packet.messageId);

      if (!ownerID) {
        logger.info(
          {
            deviceID,
            messageName,
          },
          'device wasnt subscribed to event: the device is unclaimed.',
        );
        ownerID = '--unclaimed--';
      }

      const isSystemEvent = messageName.startsWith('spark');

      this._eventPublisher.subscribe(messageName, device.onDeviceEvent, {
        filterOptions: {
          connectionID: isSystemEvent ? device.getConnectionKey() : undefined,
          mydevices: isFromMyDevices,
          userID: ownerID,
        },
        subscriberID: deviceID,
      });
    });
  };

  _onSparkServerCallDeviceFunctionRequest = async (
    event: ProtocolEvent,
  ): Promise<void> => {
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

      this._eventPublisher.publish(
        {
          context: await device.callFunction(functionName, functionArguments),
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    } catch (error) {
      this._eventPublisher.publish(
        {
          context: { error },
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    }
  };

  _onSparkServerFlashDeviceRequest = async (
    event: ProtocolEvent,
  ): Promise<void> => {
    const { deviceID, fileBuffer, responseEventName } = nullthrows(
      event.context,
    );
    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }

      this._eventPublisher.publish(
        {
          context: await device.flash(fileBuffer),
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    } catch (error) {
      this._eventPublisher.publish(
        {
          context: { error },
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    }
  };

  _onSparkServerGetDeviceAttributes = async (
    event: ProtocolEvent,
  ): Promise<void> => {
    const { deviceID, responseEventName } = nullthrows(event.context);

    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }
      await device.hasStatus(DEVICE_STATUS_MAP.READY);

      this._eventPublisher.publish(
        {
          context: device.getAttributes(),
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    } catch (error) {
      this._eventPublisher.publish(
        {
          context: { error },
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    }
  };

  _onSparkServerGetDeviceVariableValueRequest = async (
    event: ProtocolEvent,
  ): Promise<void> => {
    const { deviceID, responseEventName, variableName } = nullthrows(
      event.context,
    );

    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }

      this._eventPublisher.publish(
        {
          context: { result: await device.getVariableValue(variableName) },
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    } catch (error) {
      this._eventPublisher.publish(
        {
          context: { error },
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    }
  };

  _onSparkServerPingDeviceRequest = async (
    event: ProtocolEvent,
  ): Promise<void> => {
    const { deviceID, responseEventName } = nullthrows(event.context);

    const device = this.getDevice(deviceID);
    const pingObject = device
      ? device.ping()
      : {
          connected: false,
          lastPing: null,
        };

    this._eventPublisher.publish(
      {
        context: pingObject,
        name: responseEventName,
      },
      {
        isInternal: true,
        isPublic: false,
      },
    );
  };

  _onSparkServerRaiseYourHandRequest = async (
    event: ProtocolEvent,
  ): Promise<void> => {
    const { deviceID, responseEventName, shouldShowSignal } = nullthrows(
      event.context,
    );

    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }

      await device.hasStatus(DEVICE_STATUS_MAP.READY);

      this._eventPublisher.publish(
        {
          context: await device.raiseYourHand(shouldShowSignal),
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    } catch (error) {
      this._eventPublisher.publish(
        {
          context: { error },
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    }
  };

  _onSparkServerUpdateDeviceAttributesRequest = async (
    event: ProtocolEvent,
  ): Promise<void> => {
    const { attributes, deviceID, responseEventName } = nullthrows(
      event.context,
    );

    try {
      const device = this.getDevice(deviceID);
      if (!device) {
        throw new Error('Could not get device for ID');
      }

      await device.hasStatus(DEVICE_STATUS_MAP.READY);
      device.updateAttributes({ ...attributes });

      this._eventPublisher.publish(
        {
          context: await device.getAttributes(),
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    } catch (error) {
      this._eventPublisher.publish(
        {
          context: { error },
          name: responseEventName,
        },
        {
          isInternal: true,
          isPublic: false,
        },
      );
    }
  };

  _onFlashProductFirmware = async (event: ProtocolEvent): Promise<void> => {
    const { deviceID, productID } = nullthrows(event.context);

    // Handle case where a new device is added to an existing product
    if (deviceID) {
      const productDevice = await this._productDeviceRepository.getFromDeviceID(
        deviceID,
      );

      if (!productDevice || productDevice.productID !== productID) {
        throw new Error(
          `Device ${deviceID} does not belong to product ${productID}`,
        );
      }

      await this._flashDevice(productDevice);

      return;
    }

    // NOTE - In a giant system, this is probably a bad idea but
    // we can worry about scaling this later. It will also be
    // inefficient if there is any horizontal scaling :/
    const productDevices = await this._productDeviceRepository.getAllByProductID(
      productID,
      0,
      Number.MAX_VALUE,
    );

    // TODO - FIgure out if this breaks things for large amounts
    // of devices. We will probably need to test with
    // particle-collider. I used setImmediate and only flash
    // one device at a time in hopes of limiting the server load
    while (productDevices.length) {
      const productDevice = productDevices.pop();
      await new Promise((resolve: () => void) => {
        setImmediate(async (): Promise<void> => {
          await this._flashDevice(productDevice);
          resolve();
        });
      });
    }
  };

  _flashDevice = async (productDevice: ?ProductDevice): Promise<void> => {
    if (
      !productDevice ||
      productDevice.denied ||
      productDevice.development ||
      productDevice.quarantined
    ) {
      return;
    }

    const device = this._devicesById.get(productDevice.deviceID);
    if (!device) {
      return;
    }

    if (device.isFlashing()) {
      logger.info(
        {
          productDevice,
        },
        'Device already flashing',
      );
      return;
    }

    let productFirmware = null;

    const lockedFirmwareVersion = productDevice.lockedFirmwareVersion;
    const {
      productFirmwareVersion,
      particleProductId,
    } = device.getAttributes();
    if (
      particleProductId === productDevice.productID &&
      lockedFirmwareVersion === productFirmwareVersion
    ) {
      return;
    }

    if (lockedFirmwareVersion !== null) {
      productFirmware = await this._productFirmwareRepository.getByVersionForProduct(
        productDevice.productID,
        nullthrows(lockedFirmwareVersion),
      );
    } else {
      productFirmware = await this._productFirmwareRepository.getCurrentForProduct(
        productDevice.productID,
      );
    }

    if (!productFirmware) {
      return;
    }

    // TODO - check appHash as well.  We should be saving this alongside the firmware
    if (
      productFirmware.product_id === particleProductId &&
      productFirmware.version === productFirmwareVersion
    ) {
      return;
    }

    const systemInformation = device.getSystemInformation();
    const isMissingDependency = FirmwareManager.isMissingOTAUpdate(
      systemInformation,
    );

    if (isMissingDependency) {
      return;
    }

    await device.flash(productFirmware.data);
    const oldProductFirmware = await this._productFirmwareRepository.getByVersionForProduct(
      productDevice.productID,
      productFirmwareVersion,
    );

    // Update the number of devices on the firmware versions
    if (oldProductFirmware) {
      oldProductFirmware.device_count -= 1;
      await this._productFirmwareRepository.updateByID(
        oldProductFirmware.id,
        oldProductFirmware,
      );
    }
    productFirmware.device_count += 1;
    await this._productFirmwareRepository.updateByID(
      productFirmware.id,
      productFirmware,
    );
  };

  getDevice = (deviceID: string): ?Device => this._devicesById.get(deviceID);

  publishSpecialEvent = (
    eventName: string,
    data?: string,
    deviceID: string,
    userID: ?string,
    isInternal?: boolean = false,
  ) => {
    if (!userID) {
      return;
    }
    const eventData = {
      data,
      deviceID,
      name: eventName,
      userID,
    };
    process.nextTick(() => {
      this._eventPublisher.publish(eventData, { isInternal, isPublic: false });
    });
  };
}

export default DeviceServer;
