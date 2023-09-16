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
    training: false,
    eventCancelled: true,
  };

}
