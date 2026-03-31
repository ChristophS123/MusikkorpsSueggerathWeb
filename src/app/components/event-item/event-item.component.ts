import { Component, Input } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { getAuth } from 'firebase/auth';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Event } from 'src/app/models/event';

@Component({
  selector: 'app-event-item',
  templateUrl: './event-item.component.html',
  styleUrls: ['./event-item.component.scss']
})
export class EventItemComponent {

  @Input() isAdmin:boolean = false;

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
    pieces: [],
    training: false,
    eventCancelled: true,
  };

  constructor(private firestore:Firestore) { }

  cancel(): void {
    this.updateResponseState('cancelled');
  }

  promise(): void {
    this.updateResponseState('promised');
  }

  maby(): void {
    this.updateResponseState('maby');
  }

  containsInPromise():boolean {
    return this.containsInList(this.event.promised);
  }

  containsInCancelled():boolean {
    return this.containsInList(this.event.cancelled);
  }

  containsInMaby():boolean {
    return this.containsInList(this.event.maby);
  }

  getEventDateLabel(): string {
    return `${this.padValue(this.event.day)}.${this.padValue(this.event.month)}.${this.event.year}`;
  }

  getStatusLabel(): string {
    if (this.event.eventCancelled) {
      return 'Abgesagt';
    }

    if (this.containsInPromise()) {
      return 'Du hast zugesagt';
    }

    if (this.containsInCancelled()) {
      return 'Du hast abgesagt';
    }

    if (this.containsInMaby()) {
      return 'Deine Rueckmeldung ist offen';
    }

    return 'Bitte gib deine Rueckmeldung ab';
  }

  getStatusClass(): string {
    if (this.event.eventCancelled) {
      return 'cancelled';
    }

    if (this.containsInPromise()) {
      return 'promised';
    }

    if (this.containsInCancelled()) {
      return 'declined';
    }

    if (this.containsInMaby()) {
      return 'maybe';
    }

    return 'open';
  }

  getResponseCountLabel(): string {
    return `${this.event.promised.length} zugesagt · ${this.event.maby.length} offen · ${this.event.cancelled.length} abgesagt`;
  }

  getUserActionLabel(): string {
    if (this.containsInPromise()) {
      return 'Zugesagt';
    }

    if (this.containsInCancelled()) {
      return 'Abgesagt';
    }

    if (this.containsInMaby()) {
      return 'Vielleicht';
    }

    return 'Offen';
  }

  private containsInList(list: string[]): boolean {
    const user = this.getCurrentUserId();
    if (user === undefined) {
      return false;
    }

    return list.includes(user);
  }

  private updateResponseState(nextState: 'promised' | 'cancelled' | 'maby'): void {
    const user = this.getCurrentUserId();
    if (user === undefined || this.event.eventCancelled) {
      return;
    }

    this.event.promised = this.event.promised.filter((entry) => entry !== user);
    this.event.cancelled = this.event.cancelled.filter((entry) => entry !== user);
    this.event.maby = this.event.maby.filter((entry) => entry !== user);

    if (nextState === 'promised') {
      this.event.promised.push(user);
    } else if (nextState === 'cancelled') {
      this.event.cancelled.push(user);
    } else {
      this.event.maby.push(user);
    }

    const eventCollection = collection(this.firestore, 'events');
    updateDoc(doc(eventCollection, this.event.documentID), {
      promised: this.event.promised,
      cancelled: this.event.cancelled,
      maby: this.event.maby,
    });
  }

  private padValue(value: number): string {
    return String(value).padStart(2, '0');
  }

  private getCurrentUserId(): string | undefined {
    return getAuth().currentUser?.uid;
  }

}
