import { Component } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Event } from 'src/app/models/event';
import { getDoc, collection } from 'firebase/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recent-events',
  templateUrl: './recent-events.component.html',
  styleUrls: ['./recent-events.component.scss']
})
export class RecentEventsComponent {

  events:Event[] = [];

  constructor(private firestore:Firestore, private router:Router) {
    this.loadEvents();
   }

   loadEvents() {
    const eventsCollection = collection(this.firestore, 'events');
    collectionData(eventsCollection).subscribe((val) => {
      this.events = []
      for(let i = 0; i < val.length; i++) {
        let eventModel = val[i];
        let event:Event = {
          documentID: eventModel['documentID'],
          name:eventModel['name'],
          day: eventModel['day'],
          month: eventModel['month'],
          year: eventModel['year'],
          time: eventModel['time'],
          promised: eventModel['promised'],
          cancelled: eventModel['cancelled'],
          training: eventModel['training'],
          eventCancelled: eventModel['eventCancelled']
        }
        let date:Date = new Date();
        date.setDate(event.day)
        date.setMonth(event.month-1)
        date.setFullYear(event.year)
        let currentDate = new Date()
        if(currentDate > date)
          continue
        if(event.training)
          continue
        this.events.push(event);
      }
    })
   }

   onBackPressed() {
    this.router.navigate(['main']);
   }

}
