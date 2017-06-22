// @flow

import EventPublisher from '../lib/EventPublisher';
import type { Event } from '../types';

class EventProvider {
  _eventPublisher: EventPublisher;

  constructor(eventPublisher: EventPublisher) {
    this._eventPublisher = eventPublisher;
  }

  onNewEvent = (callback: (event: Event) => void) => {
    this._eventPublisher.subscribe('*', this._onNewEvent(callback), {
      filterOptions: {
        listenToBroadcastedEvents: false,
      },
    });
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
