import { Component } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Event } from 'src/app/models/event';
import { collection } from 'firebase/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recent-events',
  templateUrl: './recent-events.component.html',
  styleUrls: ['./recent-events.component.scss']
})
export class RecentEventsComponent {

  events:Event[] = [];
  isLoading:boolean = true;
  readonly skeletonItems:number[] = [1, 2, 3];

  constructor(private firestore:Firestore, private router:Router) {
    this.loadEvents();
   }

   loadEvents() {
    const eventsCollection = collection(this.firestore, 'events');
    collectionData(eventsCollection).subscribe((val) => {
      const upcomingEvents: Event[] = [];

      for(let i = 0; i < val.length; i++) {
        const eventModel = val[i];
        const event:Event = {
          documentID: eventModel['documentID'],
          name:eventModel['name'],
          day: eventModel['day'],
          month: eventModel['month'],
          year: eventModel['year'],
          time: eventModel['time'],
          promised: eventModel['promised'],
          cancelled: eventModel['cancelled'],
          maby: eventModel['maby'],
          training: eventModel['training'],
          eventCancelled: eventModel['eventCancelled']
        }

        const eventDate = this.getEventDate(event);
        const currentDate = new Date();
        if(currentDate.getTime() > eventDate.getTime())
          continue
        if(event.training)
          continue

        upcomingEvents.push(event);
      }

      this.events = upcomingEvents.sort((firstEvent, secondEvent) => {
        return this.getEventDate(firstEvent).getTime() - this.getEventDate(secondEvent).getTime();
      });
      this.isLoading = false;
    });
   }

   onBackPressed() {
    this.router.navigate(['main']);
   }

   getNextEventLabel(): string {
    if (this.events.length === 0) {
      return 'Aktuell ist kein kommender sonstiger Termin geplant.';
    }

    const nextEvent = this.events[0];
    return `${nextEvent.day}.${nextEvent.month}.${nextEvent.year} um ${nextEvent.time} Uhr`;
   }

   getEventCountLabel(): string {
    return `${this.events.length} kommender Termin${this.events.length === 1 ? '' : 'e'}`;
   }

   private getEventDate(event: Event): Date {
    const [hoursString, minutesString] = event.time.split(':');
    const hours = Number(hoursString);
    const minutes = Number(minutesString);

    return new Date(
      event.year,
      event.month - 1,
      event.day,
      Number.isNaN(hours) ? 0 : hours,
      Number.isNaN(minutes) ? 0 : minutes,
      0,
      0
    );
   }

}
