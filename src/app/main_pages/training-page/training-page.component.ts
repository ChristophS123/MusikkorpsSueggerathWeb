import { Component } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Event } from 'src/app/models/event';
import { getDoc, collection } from 'firebase/firestore';

@Component({
  selector: 'app-calendar-page',
  templateUrl: './training-page.component.html',
  styleUrls: ['./training-page.component.scss']
})
export class TrainingPageComponent {

  trainings:Event[] = [];

  constructor(private firestore:Firestore) {
    this.loadTrainings();
   }

   loadTrainings() {
    const eventsCollection = collection(this.firestore, 'events');
    collectionData(eventsCollection).subscribe((val) => {
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
        if(!event.training)
          continue
        this.trainings.push(event);
      }
    })
   }

}
