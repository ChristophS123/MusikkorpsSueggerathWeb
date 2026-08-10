import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData, docData } from '@angular/fire/firestore';
import { Event } from 'src/app/models/event';
import { mapEventFromFirestore } from 'src/app/models/event-mapper';
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
        const event = mapEventFromFirestore(val[i] as Record<string, unknown>);

        if (this.isEventDayOver(event)) {
          continue;
        }
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
    const timeLabel = nextEvent.time.trim().length > 0 ? ` um ${nextEvent.time} Uhr` : '';
    return `${nextEvent.day}.${nextEvent.month}.${nextEvent.year}${timeLabel}`;
   }

   getEventCountLabel(): string {
    return `${this.events.length} kommender Termin${this.events.length === 1 ? '' : 'e'}`;
   }

   private getEventDate(event: Event): Date {
    const timeParts = event.time.trim().split(':');
    const hours = Number(timeParts[0]);
    const minutes = Number(timeParts[1]);

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

  private isEventDayOver(event: Event): boolean {
    const endOfEventDay = new Date(event.year, event.month - 1, event.day, 23, 59, 59, 999);
    return Date.now() > endOfEventDay.getTime();
  }

}
