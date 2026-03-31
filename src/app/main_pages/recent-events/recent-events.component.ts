import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData, docData } from '@angular/fire/firestore';
import { Event } from 'src/app/models/event';
import { getAuth } from 'firebase/auth';
import { collection, doc } from 'firebase/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recent-events',
  templateUrl: './recent-events.component.html',
  styleUrls: ['./recent-events.component.scss']
})
export class RecentEventsComponent implements OnInit {

  events:Event[] = [];
  isLoading:boolean = true;
  isAdmin:boolean = false;
  readonly skeletonItems:number[] = [1, 2, 3];

  constructor(private firestore:Firestore, private router:Router) {
    this.loadEvents();
   }

   ngOnInit(): void {
    getAuth().onAuthStateChanged((user) => {
      if (!user) {
        this.isAdmin = false;
        return;
      }

      const userDocument = doc(this.firestore, 'users', user.uid);
      docData(userDocument).subscribe((userModel) => {
        this.isAdmin = Number(userModel?.['admin'] ?? 0) === 1;
      });
    });
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
          pieces: Array.isArray(eventModel['pieces']) ? eventModel['pieces'].map((piece) => String(piece)) : [],
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
