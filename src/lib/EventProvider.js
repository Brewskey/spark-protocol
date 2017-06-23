// @flow

import EventPublisher from '../lib/EventPublisher';
import type { Event } from '../types';

class EventProvider {
  _eventPublisher: EventPublisher;

  constructor(eventPublisher: EventPublisher) {
    this._eventPublisher = eventPublisher;
  }

  onNewEvent = (callback: (event: Event) => void, eventNamePrefix: string = '*') => {
    this._eventPublisher.subscribe(
      eventNamePrefix,
      this._onNewEvent(callback),
      {
        filterOptions: {
          listenToBroadcastedEvents: false,
          listenToInternalEvents: false,
        },
      },
    );
  };

  _onNewEvent = (callback: (event: Event) => void): (event: Event) => void =>
    (event: Event) => {
      const eventToBroadcast: Event = ({
        ...event,
      }: any);

    callback(eventToBroadcast);
  };
}

export default EventProvider;
