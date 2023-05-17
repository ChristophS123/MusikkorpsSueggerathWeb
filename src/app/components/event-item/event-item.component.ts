import { Component, Input } from '@angular/core';
import { getAuth } from 'firebase/auth';
import { Event } from 'src/app/models/event';
import { User } from 'src/app/models/user';

@Component({
  selector: 'app-event-item',
  templateUrl: './event-item.component.html',
  styleUrls: ['./event-item.component.scss']
})
export class EventItemComponent {

  user:string|undefined = '';

  constructor() {
    this.user = getAuth().currentUser?.uid;
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
    training: false,
    eventCancelled: true,
  };

  promise() {
    
  }

  containsInPromise():boolean {
    for(let i in this.event.promised) {
      if(i === this.user)
      return true
    }
    return false;
  }

  containsInCancelled():boolean {
    for(let i in this.event.cancelled) {
      if(i === this.user)
      return true
    }
    return false;
  }

}
