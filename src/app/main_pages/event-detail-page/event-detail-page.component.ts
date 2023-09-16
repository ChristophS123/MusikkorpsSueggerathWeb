import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Event } from 'src/app/models/event';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { collection, updateDoc, doc } from 'firebase/firestore';
import { User } from 'src/app/models/user';

@Component({
  selector: 'app-event-detail-page',
  templateUrl: './event-detail-page.component.html',
  styleUrls: ['./event-detail-page.component.scss']
})
export class EventDetailPageComponent implements OnInit {

  eventID:string = '';
  
  event:Event = {
    documentID: '',
    name: '',
    day: 0,
    month: 0,
    year: 0,
    time: '',
    promised: [],
    cancelled: [],
    maby: [],
    training: false,
    eventCancelled: true,
  };

  alto_saxophones:User[] = []
  tenor_saxophones:User[] = []
  trumpets:User[] = []
  trombones:User[] = []
  clarinets:User[] = []
  flutes:User[] = []
  percussions:User[] = []
  baritones:User[] = []
  others:User[] = []

  constructor(private activatedRoute:ActivatedRoute, private router:Router, private firestore:Firestore) {  }
  
  ngOnInit(): void {
    this.eventID = this.activatedRoute.snapshot.params['eventID']
    this.loadEvent()
  }

  loadEvent() {
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
          maby: eventModel['maby'],
          training: eventModel['training'],
          eventCancelled: eventModel['eventCancelled']
        }
        let date:Date = new Date(event.day, event.month, event.year);
        let currentDate = new Date();
        if(currentDate < date)
          continue
        if(event.documentID == this.eventID)
          this.event = event
      }
    })
    this.loadUsers()
  }

  cancelEvent() {
    const eventCollection = collection(this.firestore, 'events');
    updateDoc(doc(eventCollection, this.event.documentID), "eventCancelled", true).then(() => {
      this.router.navigate(['main'])
    })
  }

  loadUsers() {
    const usersCollection = collection(this.firestore, 'users');
    collectionData(usersCollection).subscribe((val) => {
      for(let i = 0; i < val.length; i++) {
        let mUserModel = val[i]
        let currentUser:User = {
          id: mUserModel['id'],
              username: mUserModel['username'],
              email: mUserModel['email'],
              fcmToken: mUserModel['fcmToken'],
              admin: mUserModel['admin'],
              instrument: mUserModel['instrument'],
              chairID: mUserModel['chairID'],
              defaultPromise: mUserModel['defaultPromise']
        }
        switch(currentUser.instrument) {
          case ('Alt Saxophon'):
            this.alto_saxophones.push(currentUser)
            break
          case ('Tenor Saxophone'):
            this.tenor_saxophones.push(currentUser)
            break
          case ('Trompete'):
            this.trumpets.push(currentUser)
            break
          case ('Posaune'):
            this.trombones.push(currentUser)
            break
          case ('Klarinette'):
            this.clarinets.push(currentUser)
            break
          case ('Floete'):
            this.flutes.push(currentUser)
            break
          case ('Schlagwerk'):
            this.percussions.push(currentUser)
            break
          case ('Bariton'):
            this.baritones.push(currentUser)
            break
          default:
            this.others.push(currentUser)
            break
        }
      
      }
    })
  }

  onBackPressed() {
    this.router.navigate(['proben']);
   }

}