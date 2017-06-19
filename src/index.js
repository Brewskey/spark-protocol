/*
 * Copyright (c) 2015 Particle Industries, Inc.  All rights reserved.
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, see <http://www.gnu.org/licenses/>.
 *
 * @flow
 *
 */

import DeviceAttributeFileRepository from './repository/DeviceAttributeFileRepository';
import DeviceKeyFileRepository from './repository/DeviceKeyFileRepository';
import ClaimCodeManager from './lib/ClaimCodeManager';
import EventPublisher from './lib/EventPublisher';
import DeviceServer from './server/DeviceServer';
import FileManager from './repository/FileManager';
import JSONFileManager from './repository/JSONFileManager';
import ServerKeyFileRepository from './repository/ServerKeyFileRepository';
import Device from './clients/Device';
import * as settings from './settings';
import { knownPlatforms } from '../third-party/settings.json';
import defaultBindings from './defaultBindings';
import memoizeGet from './decorators/memoizeGet';
import memoizeSet from './decorators/memoizeSet';
import SPARK_SERVER_EVENTS from './lib/SparkServerEvents';
import { ALL_EVENTS } from './lib/EventPublisher';

export {
  ALL_EVENTS,
  ClaimCodeManager,
  defaultBindings,
  Device,
  DeviceAttributeFileRepository,
  DeviceKeyFileRepository,
  DeviceServer,
  EventPublisher,
  FileManager,
  JSONFileManager,
  knownPlatforms,
  memoizeGet,
  memoizeSet,
  ServerKeyFileRepository,
  settings,
  SPARK_SERVER_EVENTS,
};
