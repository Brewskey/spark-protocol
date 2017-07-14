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

import type { Event, EventData, PublishOptions } from '../types';

import EventEmitter from 'events';
import nullthrows from 'nullthrows';
import uuid from 'uuid';
import settings from '../settings';

export const getRequestEventName = (eventName: string): string =>
  `${eventName}/request`;

const LISTEN_FOR_RESPONSE_TIMEOUT = 15000;

type FilterOptions = {
  connectionID?: ?string,
  deviceID?: string,
  listenToBroadcastedEvents?: boolean,
  listenToInternalEvents?: boolean,
  mydevices?: boolean,
  userID?: string,
};

type SubscriptionOptions = {
  filterOptions?: FilterOptions,
  once?: boolean,
  subscriberID?: string,
  subscriptionTimeout?: number,
  timeoutHandler?: () => void,
};

type Subscription = {
  eventNamePrefix: string,
  id: string,
  listener: (event: Event) => void | Promise<void>,
  options: SubscriptionOptions,
};

class EventPublisher extends EventEmitter {
  _subscriptionsByID: Map<string, Subscription> = new Map();

  publish = (
    eventData: EventData,
    options: ?PublishOptions = {
      isInternal: false,
      isPublic: false,
    },
  ) => {
    const ttl = eventData.ttl && eventData.ttl > 0
      ? eventData.ttl
      : settings.DEFAULT_EVENT_TTL;

    const event: Event = {
      ...eventData,
      ...options,
      publishedAt: new Date(),
      ttl,
    };

    setImmediate(() => {
      this._emitWithPrefix(eventData.name, event);
      this.emit('*', event);
    });
  };

  publishAndListenForResponse = async (
    eventData: EventData,
  ): Promise<Object> => {
    const eventID = uuid();
    const requestEventName = `${getRequestEventName(
      eventData.name,
    )}/${eventID}`;
    const responseEventName = `${eventData.name}/response/${eventID}`;

    return new Promise(
      (resolve: (event: Event) => void, reject: (error: Error) => void) => {
        const responseListener = (event: Event): void =>
          resolve(nullthrows(event.context));

        this.subscribe(responseEventName, responseListener, {
          once: true,
          subscriptionTimeout: LISTEN_FOR_RESPONSE_TIMEOUT,
          timeoutHandler: (): void =>
            reject(new Error(`Response timeout for event: ${eventData.name}`)),
        });

        this.publish(
          {
            ...eventData,
            context: {
              ...eventData.context,
              responseEventName,
            },
            name: requestEventName,
          },
          {
            isInternal: true,
            isPublic: false,
          },
        );
      },
    );
  };

  subscribe = (
    eventNamePrefix: string = '*',
    eventHandler: (event: Event) => void | Promise<void>,
    options?: SubscriptionOptions = {},
  ): string => {
    const {
      filterOptions,
      once,
      subscriptionTimeout,
      timeoutHandler,
    } = options;

    let subscriptionID = uuid();
    while (this._subscriptionsByID.has(subscriptionID)) {
      subscriptionID = uuid();
    }

    const listener = filterOptions
      ? this._filterEvents(eventHandler, filterOptions)
      : eventHandler;

    this._subscriptionsByID.set(subscriptionID, {
      eventNamePrefix,
      id: subscriptionID,
      listener,
      options,
    });

    if (subscriptionTimeout) {
      const timeout = setTimeout(() => {
        this.unsubscribe(subscriptionID);
        if (timeoutHandler) {
          timeoutHandler();
        }
      }, subscriptionTimeout);
      this.once(eventNamePrefix, (): void => clearTimeout(timeout));
    }

    if (once) {
      this.once(eventNamePrefix, (event: Event) => {
        this._subscriptionsByID.delete(subscriptionID);
        listener(event);
      });
    } else {
      this.on(eventNamePrefix, listener);
    }
    return subscriptionID;
  };

  unsubscribe = (subscriptionID: string) => {
    const subscription: ?Subscription = this._subscriptionsByID.get(
      subscriptionID,
    );
    if (!subscription) {
      return;
    }
    this.removeListener(subscription.eventNamePrefix, subscription.listener);
    this._subscriptionsByID.delete(subscriptionID);
  };

  unsubscribeBySubscriberID = (subscriberID: string) => {
    this._subscriptionsByID.forEach((subscription: Subscription) => {
      if (subscription.options.subscriberID === subscriberID) {
        this.unsubscribe(subscription.id);
      }
    });
  };

  _emitWithPrefix = (eventName: string, event: Event) => {
    this.eventNames()
      .filter((eventNamePrefix: string): boolean =>
        eventName.startsWith(eventNamePrefix),
      )
      .forEach((eventNamePrefix: string): boolean =>
        this.emit(eventNamePrefix, event),
      );
  };

  _filterEvents = (
    eventHandler: (event: Event) => void | Promise<void>,
    filterOptions: FilterOptions,
  ): ((event: Event) => void) => (event: Event) => {
    if (event.isInternal && filterOptions.listenToInternalEvents === false) {
      return;
    }
    // filter private events from another devices
    if (
      filterOptions.userID &&
      !event.isPublic &&
      filterOptions.userID !== event.userID
    ) {
      return;
    }

    // filter private events with wrong connectionID
    if (
      !event.isPublic &&
      filterOptions.connectionID &&
      event.connectionID !== filterOptions.connectionID
    ) {
      return;
    }

    // filter mydevices events
    if (filterOptions.mydevices && filterOptions.userID !== event.userID) {
      return;
    }

    // filter event by deviceID
    if (filterOptions.deviceID && event.deviceID !== filterOptions.deviceID) {
      return;
    }

    // filter broadcasted events
    if (
      filterOptions.listenToBroadcastedEvents === false &&
      event.broadcasted
    ) {
      return;
    }

    process.nextTick((): void | Promise<void> => eventHandler(event));
  };
}

export default EventPublisher;
