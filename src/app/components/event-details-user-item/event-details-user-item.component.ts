import { Component, Input } from '@angular/core';
import { User } from 'src/app/models/user';
import { Event } from 'src/app/models/event';
import {
  EventResponseOption,
  getResponseOptionById,
  getSelectedResponseOptionId,
  getSoftBackgroundColor
} from 'src/app/models/event-response-option';

@Component({
  selector: 'app-event-details-user-item',
  templateUrl: './event-details-user-item.component.html',
  styleUrls: ['./event-details-user-item.component.scss']
})
export class EventDetailsUserItemComponent {

  @Input() user:User = {
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

  getSelectedOption(): EventResponseOption | null {
    if (!this.event.training && this.event.responseOptions.length > 0) {
      return getResponseOptionById(
        this.event.responseOptions,
        getSelectedResponseOptionId(this.event.responses, this.user.id)
      );
    }

    if (this.event.promised.includes(this.user.id)) {
      return { id: 'promised', label: 'Zugesagt', color: '#28a745' };
    }

    if (this.event.cancelled.includes(this.user.id)) {
      return { id: 'cancelled', label: 'Abgesagt', color: '#dc3545' };
    }

    if (this.event.maby.includes(this.user.id)) {
      return { id: 'maby', label: '?', color: '#ffc107' };
    }

    return null;
  }

  getStatusLabel(): string {
    return this.getSelectedOption()?.label ?? 'Ausstehend';
  }

  getStatusDescription(): string {
    const selectedOption = this.getSelectedOption();
    if (!selectedOption) {
      return 'Noch keine Rueckmeldung abgegeben';
    }
    return `Antwort: ${selectedOption.label}`;
  }

  getCardStyles(): Record<string, string> | null {
    const selectedOption = this.getSelectedOption();
    if (!selectedOption) {
      return null;
    }

    return {
      borderColor: getSoftBackgroundColor(selectedOption.color)
    };
  }

  getBadgeStyles(): Record<string, string> {
    const selectedOption = this.getSelectedOption();
    if (!selectedOption) {
      return {
        background: 'rgba(154, 166, 178, 0.16)',
        color: '#617181'
      };
    }

    return {
      background: getSoftBackgroundColor(selectedOption.color),
      color: selectedOption.color
    };
  }

}
