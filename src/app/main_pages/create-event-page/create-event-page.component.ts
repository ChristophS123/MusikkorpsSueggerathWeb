import { Component } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Event } from 'src/app/models/event';
import { collection, doc, setDoc } from 'firebase/firestore';

@Component({
  selector: 'app-create-event-page',
  templateUrl: './create-event-page.component.html',
  styleUrls: ['./create-event-page.component.scss']
})
export class CreateEventPageComponent {

  constructor(private router:Router, private firestore:Firestore) {  }

  onBackPressed() {
    this.router.navigate(['organisation']);
   }

   submitEventData(data:any) {
    let name:string = data.value['name']
    let time:string = data.value['time']
    let date:Date = new Date(data.value['date'])
    let day:number = date.getDate()
    let month:number = date.getMonth() + 1
    let year:number = date.getFullYear()
    let documentID:string = name + "_" + Date.now()
    let event:Event = {
      documentID:documentID,
      name:name,
      time:time,
      day:day,
      month:month,
      year:year,
      promised:[],
      cancelled:[],
      training:false,
      eventCancelled:false
    }
    const eventCollection = collection(this.firestore, 'events');
    setDoc(doc(eventCollection, event.documentID), event).then(() => {
      this.router.navigate(['/organisation']);
    })
   }

}
