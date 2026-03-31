import { Component, Input } from '@angular/core';
import { User } from 'src/app/models/user';
import { Event } from 'src/app/models/event';

@Component({
  selector: 'app-event-details-user-item',
  templateUrl: './event-details-user-item.component.html',
  styleUrls: ['./event-details-user-item.component.scss']
})
export class EventDetailsUserItemComponent {

  @Input() user:User = {
    id: '',
    username: '',
    email: '',
    admin: 0,
    chairID: 0,
    defaultPromise: false,
    fcmToken: '',
    instrument: ''
  }

  @Input() event:Event = {
    documentID: '',
    name: 'Name',
    day: 0,
    month: 0,
    year: 0,
    time: 'Zeit',
    promised: [],
    cancelled: [],
    maby: [],
    pieces: [],
    training: false,
    eventCancelled: true,
  };

  getStatus(): 'promised' | 'cancelled' | 'maybe' | 'pending' {
    if (this.event.promised.includes(this.user.id)) {
      return 'promised';
    }

    if (this.event.cancelled.includes(this.user.id)) {
      return 'cancelled';
    }

    if (this.event.maby.includes(this.user.id)) {
      return 'maybe';
    }

    return 'pending';
  }

  getStatusLabel(): string {
    switch (this.getStatus()) {
      case 'promised':
        return 'Zugesagt';
      case 'cancelled':
        return 'Abgesagt';
      case 'maybe':
        return '?';
      default:
        return 'Ausstehend';
    }
  }

  getStatusDescription(): string {
    switch (this.getStatus()) {
      case 'promised':
        return 'Nimmt am Termin teil';
      case 'cancelled':
        return 'Ist fuer diesen Termin abgemeldet';
      case 'maybe':
        return 'Rueckmeldung ist noch unsicher';
      default:
        return 'Noch keine Rueckmeldung abgegeben';
    }
  }

}
