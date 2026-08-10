import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Event } from 'src/app/models/event';
import {
  createDefaultResponseOptions,
  createEmptyResponses,
  createResponseOption,
  EventResponseOption,
  getLegacyResponseArrays,
  normalizeOptionColor
} from 'src/app/models/event-response-option';
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
  responseOptions:EventResponseOption[] = createDefaultResponseOptions();
  newOptionLabel:string = '';
  newOptionColor:string = '#0a66c2';

  constructor(private router:Router, private firestore:Firestore) {  }

  onBackPressed() {
    this.router.navigate(['organisation']);
   }

  addResponseOption(): void {
    const label = this.newOptionLabel.trim();
    if (label.length === 0) {
      this.statusType = 'error';
      this.statusMessage = 'Bitte einen Text fuer die neue Abstimm-Option eingeben.';
      return;
    }

    this.responseOptions = [
      ...this.responseOptions,
      createResponseOption(label, this.newOptionColor)
    ];
    this.newOptionLabel = '';
    this.newOptionColor = '#0a66c2';
    this.statusMessage = '';
    this.statusType = '';
  }

  removeResponseOption(optionId: string): void {
    this.responseOptions = this.responseOptions.filter((option) => option.id !== optionId);
  }

  onOptionColorChange(optionId: string, color: string): void {
    this.responseOptions = this.responseOptions.map((option) => (
      option.id === optionId
        ? { ...option, color: normalizeOptionColor(color) }
        : option
    ));
  }

  onOptionLabelChange(optionId: string, label: string): void {
    this.responseOptions = this.responseOptions.map((option) => (
      option.id === optionId
        ? { ...option, label }
        : option
    ));
  }

   async submitEventData(data:NgForm): Promise<void> {
    if (data.invalid || this.isSubmitting) {
      data.control.markAllAsTouched();
      this.statusType = 'error';
      this.statusMessage = 'Bitte Name und Datum gueltig ausfuellen.';
      return;
    }

    const cleanedOptions = this.responseOptions
      .map((option) => ({
        ...option,
        label: option.label.trim(),
        color: normalizeOptionColor(option.color)
      }))
      .filter((option) => option.label.length > 0);

    if (cleanedOptions.length === 0) {
      this.statusType = 'error';
      this.statusMessage = 'Bitte mindestens eine Abstimm-Moeglichkeit hinterlegen.';
      return;
    }

    this.isSubmitting = true;
    this.statusMessage = '';
    this.statusType = '';

    try {
      const name = String(data.value['name']).trim();
      const time = String(data.value['time'] ?? '').trim();
      const meetingTime = String(data.value['meetingTime'] ?? '').trim();
      const meetingLocation = String(data.value['meetingLocation'] ?? '').trim();
      const date = new Date(data.value['date']);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const documentID = `${name}_${Date.now()}`;
      const responses = createEmptyResponses(cleanedOptions);
      const legacyResponses = getLegacyResponseArrays(responses);
      const event:Event = {
        documentID:documentID,
        name:name,
        time:time,
        meetingTime:meetingTime,
        meetingLocation:meetingLocation,
        day:day,
        month:month,
        year:year,
        promised: legacyResponses.promised,
        cancelled: legacyResponses.cancelled,
        maby: legacyResponses.maby,
        responseOptions: cleanedOptions,
        responses,
        pieces: [],
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

}
