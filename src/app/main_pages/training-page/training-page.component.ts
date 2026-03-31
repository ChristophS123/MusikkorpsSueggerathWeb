import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData, docData } from '@angular/fire/firestore';
import { Event } from 'src/app/models/event';
import { normalizeRehearsalPieces } from 'src/app/models/rehearsal-piece';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { getAuth } from 'firebase/auth';

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
    if (this.user === undefined) {
      this.isUserLoading = false;
      return;
    }

    const userDocument = doc(this.firestore, 'users', this.user);
    docData(userDocument).subscribe((userModel) => {
      if (!userModel) {
        this.isUserLoading = false;
        return;
      }

      this.userModel = {
        id: String(userModel['id'] ?? this.user ?? ''),
        username: String(userModel['username'] ?? ''),
        email: String(userModel['email'] ?? ''),
        fcmToken: String(userModel['fcmToken'] ?? ''),
        admin: Number(userModel['admin'] ?? 0),
        instrument: String(userModel['instrument'] ?? ''),
        chairID: Number(userModel['chairID'] ?? 0),
        defaultPromise: Boolean(userModel['defaultPromise'])
      }
      this.isUserLoading = false;
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
          pieces: normalizeRehearsalPieces(eventModel['pieces']),
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
