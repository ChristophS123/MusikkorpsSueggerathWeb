import { Component, Input } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { getAuth } from 'firebase/auth';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Event } from 'src/app/models/event';
import {
  DEFAULT_RESPONSE_OPTION_IDS,
  EventResponseOption,
  getResponseOptionById,
  getSelectedResponseOptionId,
  getSoftBackgroundColor,
  withUserResponse,
  getLegacyResponseArrays
} from 'src/app/models/event-response-option';

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
    meetingTime: '',
    meetingLocation: '',
    promised: [],
    cancelled: [],
    maby: [],
    responseOptions: [],
    responses: {},
    pieces: [],
    training: false,
    eventCancelled: true,
  };

  constructor(private firestore:Firestore) { }

  cancel(): void {
    this.updateLegacyResponseState('cancelled');
  }

  promise(): void {
    this.updateLegacyResponseState('promised');
  }

  maby(): void {
    this.updateLegacyResponseState('maby');
  }

  selectResponseOption(optionId: string): void {
    const user = this.getCurrentUserId();
    if (user === undefined || this.event.eventCancelled || this.event.training) {
      return;
    }

    const responses = withUserResponse(
      this.event.responses,
      this.event.responseOptions,
      user,
      optionId
    );
    const legacyResponses = getLegacyResponseArrays(responses);

    this.event.responses = responses;
    this.event.promised = legacyResponses.promised;
    this.event.cancelled = legacyResponses.cancelled;
    this.event.maby = legacyResponses.maby;

    const eventCollection = collection(this.firestore, 'events');
    updateDoc(doc(eventCollection, this.event.documentID), {
      responses,
      promised: legacyResponses.promised,
      cancelled: legacyResponses.cancelled,
      maby: legacyResponses.maby
    });
  }

  usesCustomResponseOptions(): boolean {
    return !this.event.training && this.event.responseOptions.length > 0;
  }

  hasOnlyStandardResponseOptions(): boolean {
    if (!this.usesCustomResponseOptions() || this.event.responseOptions.length !== 3) {
      return false;
    }

    const optionIds = new Set(this.event.responseOptions.map((option) => option.id));
    return optionIds.has(DEFAULT_RESPONSE_OPTION_IDS.cancelled)
      && optionIds.has(DEFAULT_RESPONSE_OPTION_IDS.maby)
      && optionIds.has(DEFAULT_RESPONSE_OPTION_IDS.promised);
  }

  getResponseOptions(): EventResponseOption[] {
    if (!this.hasOnlyStandardResponseOptions()) {
      return this.event.responseOptions;
    }

    const standardOrder = [
      DEFAULT_RESPONSE_OPTION_IDS.cancelled,
      DEFAULT_RESPONSE_OPTION_IDS.maby,
      DEFAULT_RESPONSE_OPTION_IDS.promised
    ];

    return standardOrder
      .map((optionId) => this.event.responseOptions.find((option) => option.id === optionId))
      .filter((option): option is EventResponseOption => Boolean(option));
  }

  isOptionSelected(optionId: string): boolean {
    const user = this.getCurrentUserId();
    if (user === undefined) {
      return false;
    }
    return getSelectedResponseOptionId(this.event.responses, user) === optionId;
  }

  getSelectedOption(): EventResponseOption | null {
    const user = this.getCurrentUserId();
    if (user === undefined) {
      return null;
    }
    return getResponseOptionById(
      this.event.responseOptions,
      getSelectedResponseOptionId(this.event.responses, user)
    );
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

  hasEventTime(): boolean {
    return this.event.time.trim().length > 0;
  }

  hasMeetingTime(): boolean {
    return this.event.meetingTime.trim().length > 0;
  }

  hasMeetingLocation(): boolean {
    return this.event.meetingLocation.trim().length > 0;
  }

  hasMeetingInfo(): boolean {
    return this.hasMeetingTime() || this.hasMeetingLocation();
  }

  getPiecesRoute(): string[] {
    return this.event.training
      ? ['/proben', this.event.documentID, 'stuecke']
      : ['/sonstige-termine', this.event.documentID, 'stuecke'];
  }

  getPiecesLinkLabel(): string {
    return this.event.pieces.length > 0 ? `Stuecke (${this.event.pieces.length})` : 'Stuecke';
  }

  getStatusLabel(): string {
    if (this.event.eventCancelled) {
      return 'Abgesagt';
    }

    if (this.usesCustomResponseOptions()) {
      const selectedOption = this.getSelectedOption();
      return selectedOption
        ? `Deine Antwort: ${selectedOption.label}`
        : 'Bitte gib deine Rueckmeldung ab';
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

    if (this.usesCustomResponseOptions()) {
      return this.getSelectedOption() ? 'custom' : 'open';
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

  getStatusPillStyles(): Record<string, string> | null {
    if (!this.usesCustomResponseOptions()) {
      return null;
    }

    const selectedOption = this.getSelectedOption();
    if (!selectedOption) {
      return null;
    }

    return {
      background: getSoftBackgroundColor(selectedOption.color),
      color: selectedOption.color
    };
  }

  getOptionButtonStyles(option: EventResponseOption): Record<string, string> | null {
    if (this.isOptionSelected(option.id)) {
      return null;
    }

    return {
      background: option.color,
      color: '#ffffff'
    };
  }

  private containsInList(list: string[]): boolean {
    const user = this.getCurrentUserId();
    if (user === undefined) {
      return false;
    }

    return list.includes(user);
  }

  private updateLegacyResponseState(nextState: 'promised' | 'cancelled' | 'maby'): void {
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
