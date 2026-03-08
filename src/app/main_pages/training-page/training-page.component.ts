import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Event } from 'src/app/models/event';
import { collection } from 'firebase/firestore';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { getAuth } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

@Component({
  selector: 'app-calendar-page',
  templateUrl: './training-page.component.html',
  styleUrls: ['./training-page.component.scss']
})
export class TrainingPageComponent implements OnInit {

  trainings:Event[] = [];
  isLoading:boolean = true;
  isPreferenceUpdating:boolean = false;
  isUserLoading:boolean = true;
  readonly skeletonItems:number[] = [1, 2, 3];
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
    this.loadTrainings();
   }

   ngOnInit(): void {
    getAuth().onAuthStateChanged((user) => {
      this.user = user?.uid;
      if (this.user === undefined) {
        this.isUserLoading = false;
        return;
      }

      this.loadUser();
    });
   }

   loadUser() {
    const eventsCollection = collection(this.firestore, 'users');
    collectionData(eventsCollection).subscribe((val) => {
      let hasMatch = false;

      for(let i = 0; i < val.length; i++) {
        const mUserModel = val[i];
        if(this.user == undefined)
          continue
        if(mUserModel['id'] == this.user) {
          hasMatch = true;
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
          this.isUserLoading = false;
          break
        }
      }

      if (!hasMatch) {
        this.isUserLoading = false;
      }
    })
   }

   async changeChecked(): Promise<void> {
    if (this.userModel.id.length === 0 || this.isPreferenceUpdating) {
      return;
    }

    const previousValue = this.userModel.defaultPromise;
    const nextValue = !previousValue;
    this.userModel.defaultPromise = nextValue;
    this.isPreferenceUpdating = true;

    try {
      const usersCollection = collection(this.firestore, 'users');
      await updateDoc(doc(usersCollection, this.userModel.id), { defaultPromise: nextValue });
    } catch (error) {
      console.error(error);
      this.userModel.defaultPromise = previousValue;
    } finally {
      this.isPreferenceUpdating = false;
    }
   }

   loadTrainings() {
    const eventsCollection = collection(this.firestore, 'events');
    collectionData(eventsCollection).subscribe((val) => {
      const upcomingTrainings: Event[] = [];

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
        const currentDate = new Date()
        if(currentDate.getTime() > eventDate.getTime())
          continue
        if(!event.training)
          continue

        upcomingTrainings.push(event);
      }

      this.trainings = upcomingTrainings.sort((firstTraining, secondTraining) => {
        return this.getEventDate(firstTraining).getTime() - this.getEventDate(secondTraining).getTime();
      });
      this.isLoading = false;
    })
   }

   onBackPressed() {
    this.router.navigate(['main']);
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

  getNextTrainingLabel(): string {
    if (this.trainings.length === 0) {
      return 'Aktuell ist keine kommende Probe geplant.';
    }

    const nextTraining = this.trainings[0];
    return `${nextTraining.day}.${nextTraining.month}.${nextTraining.year} um ${nextTraining.time} Uhr`;
  }

  getTrainingCountLabel(): string {
    return `${this.trainings.length} kommende Probe${this.trainings.length === 1 ? '' : 'n'}`;
  }

}
