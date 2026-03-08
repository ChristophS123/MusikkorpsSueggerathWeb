import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
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

  isSubmitting:boolean = false;
  statusMessage:string = '';
  statusType:'success' | 'error' | '' = '';

  constructor(private router:Router, private firestore:Firestore) {  }

  onBackPressed() {
    this.router.navigate(['organisation']);
   }

   async submitEventData(data:NgForm): Promise<void> {
    if (data.invalid || this.isSubmitting) {
      data.control.markAllAsTouched();
      this.statusType = 'error';
      this.statusMessage = 'Bitte fuelle alle Felder gueltig aus.';
      return;
    }

    this.isSubmitting = true;
    this.statusMessage = '';
    this.statusType = '';

    try {
      const name = String(data.value['name']).trim();
      const time = String(data.value['time']).trim();
      const date = new Date(data.value['date']);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const documentID = `${name}_${Date.now()}`;
      const event:Event = {
        documentID:documentID,
        name:name,
        time:time,
        day:day,
        month:month,
        year:year,
        promised:[],
        cancelled:[],
        maby: [],
        training:false,
        eventCancelled:false
      };

      const eventCollection = collection(this.firestore, 'events');
      await setDoc(doc(eventCollection, event.documentID), event);
      this.statusType = 'success';
      this.statusMessage = 'Termin wurde erfolgreich erstellt.';
      this.router.navigate(['/organisation']);
    } catch (error) {
      console.error(error);
      this.statusType = 'error';
      this.statusMessage = 'Der Termin konnte nicht erstellt werden.';
    } finally {
      this.isSubmitting = false;
    }
   }

  sendEmail(email:string) {
    
  }  

}
