import { Component, Input, OnInit } from '@angular/core';
import { getAuth } from 'firebase/auth';
import { Event } from 'src/app/models/event';
import { User } from 'src/app/models/user';
import { getDoc, updateDoc, collection, doc} from 'firebase/firestore';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-event-item',
  templateUrl: './event-item.component.html',
  styleUrls: ['./event-item.component.scss']
})
export class EventItemComponent implements OnInit{

  user:string|undefined = '';
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
  eventID:string = '';

  constructor(private firestore:Firestore, private router:Router) {
    this.user = getAuth().currentUser?.uid;
    this.loadUser()
  }

  ngOnInit(): void {
    this.eventID = this.event.documentID
  }

  loadUser() {
    const usersCollection = collection(this.firestore, 'users');
    collectionData(usersCollection).subscribe((val) => {
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

  cancel() {
    if(this.user !== undefined) {
      this.event.cancelled.push(this.user)
      if(this.containsInPromise()) {
        let index = this.event.promised.indexOf(this.user)
        if(index > -1) 
          this.event.promised.splice(index, 1);
        const eventCollection = collection(this.firestore, 'events');
        updateDoc(doc(eventCollection, this.event.documentID), "promised", this.event.promised)
      } else if(this.containsInMaby()) {
        let index = this.event.maby.indexOf(this.user)
        if(index > -1) 
          this.event.maby.splice(index, 1);
        const eventCollection = collection(this.firestore, 'events');
        updateDoc(doc(eventCollection, this.event.documentID), "maby", this.event.maby)
      }
    }
    const eventCollection = collection(this.firestore, 'events');
    updateDoc(doc(eventCollection, this.event.documentID), "cancelled", this.event.cancelled)
  }

  promise() {
    if(this.user !== undefined) {
      this.event.promised.push(this.user)
      if(this.containsInCancelled()) {
        let index = this.event.cancelled.indexOf(this.user)
        if(index > -1) 
          this.event.cancelled.splice(index, 1);
        const eventCollection = collection(this.firestore, 'events');
        updateDoc(doc(eventCollection, this.event.documentID), "cancelled", this.event.cancelled)
      } else if(this.containsInMaby()) {
        let index = this.event.maby.indexOf(this.user)
        if(index > -1) 
          this.event.maby.splice(index, 1);
        const eventCollection = collection(this.firestore, 'events');
        updateDoc(doc(eventCollection, this.event.documentID), "maby", this.event.maby)
      }
    }
    const eventCollection = collection(this.firestore, 'events');
    updateDoc(doc(eventCollection, this.event.documentID), "promised", this.event.promised)
  }

  maby() {
    if(this.user !== undefined) {
      this.event.maby.push(this.user)
      if(this.containsInCancelled()) {
        let index = this.event.cancelled.indexOf(this.user)
        if(index > -1) 
          this.event.cancelled.splice(index, 1);
        const eventCollection = collection(this.firestore, 'events');
        updateDoc(doc(eventCollection, this.event.documentID), "cancelled", this.event.cancelled)
      } else if(this.containsInPromise()) {
        let index = this.event.promised.indexOf(this.user)
        if(index > -1) 
          this.event.promised.splice(index, 1);
        const eventCollection = collection(this.firestore, 'events');
        updateDoc(doc(eventCollection, this.event.documentID), "promised", this.event.promised)
      }
    }
    const eventCollection = collection(this.firestore, 'events');
    updateDoc(doc(eventCollection, this.event.documentID), "maby", this.event.maby)
  }

  containsInPromise():boolean {
    for(let i = 0; i < this.event.promised.length; i++) {
      if(this.user == this.event.promised[i]) {
        return true;
      }
    }
    return false;
  }

  containsInCancelled():boolean {{}
    for(let i = 0; i < this.event.cancelled.length; i++) {
      if(this.user == this.event.cancelled[i]) {
        return true;
      }
    }
    return false;
  }

  containsInMaby():boolean {
    for(let i = 0; i < this.event.maby.length; i++) {
      if(this.user == this.event.maby[i]) {
        return true;
      }
    }
    return false;
  }

}
