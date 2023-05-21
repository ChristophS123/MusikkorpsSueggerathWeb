import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Event } from 'src/app/models/event';
import { getDoc, collection } from 'firebase/firestore';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

@Component({
  selector: 'app-calendar-page',
  templateUrl: './training-page.component.html',
  styleUrls: ['./training-page.component.scss']
})
export class TrainingPageComponent {

  trainings:Event[] = [];
  user:string|undefined = ''
  userModel:User = {
    id: '',
    username: '',
    email: '',
    admin: 0,
    chairID: 0,
    defaultPromise: false,
    fcmToken: '',
    instrument: ''
  }

  constructor(private firestore:Firestore, private router:Router) {
    this.user = getAuth().currentUser?.uid
    this.loadUser();
    this.loadTrainings();
   }

   loadUser() {
    const eventsCollection = collection(this.firestore, 'users');
    collectionData(eventsCollection).subscribe((val) => {
      for(let i = 0; i < val.length; i++) {
        let mUserModel = val[i];
        if(this.user == undefined)
          continue
        if(mUserModel['id'] == this.user) {
          this.userModel = {
            id: mUserModel['id'],
            username: mUserModel['username'],
            email: mUserModel['email'],
            fcmToken: mUserModel['fcmToken'],
            admin: mUserModel['admin'],
            instrument: mUserModel['instrument'],
            chairID: mUserModel['chairID'],
            defaultPromise: mUserModel['defaultPromise']
          }
          break
        }
      }
    })
   }

   changeChecked() {
    this.userModel.defaultPromise = !this.userModel.defaultPromise
    const votingCollection = collection(this.firestore, 'users');
    updateDoc(doc(votingCollection, this.userModel.id), "defaultPromise", this.userModel.defaultPromise)
   }

   loadTrainings() {
    const eventsCollection = collection(this.firestore, 'events');
    collectionData(eventsCollection).subscribe((val) => {
      this.trainings = []
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
        if(currentDate.getTime() > date.getTime())
          continue
        if(!event.training)
          continue
        this.trainings.push(event);
      }
    })
   }

   onBackPressed() {
    this.router.navigate(['main']);
   }

}
