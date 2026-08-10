import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Event } from 'src/app/models/event';
import { mapEventFromFirestore } from 'src/app/models/event-mapper';
import { Firestore, collectionData, docData } from '@angular/fire/firestore';
import { collection, updateDoc, doc } from 'firebase/firestore';
import { User } from 'src/app/models/user';
import { RehearsalRoom } from 'src/app/models/rehearsal-room';
import { RehearsalRoomService } from 'src/app/services/rehearsal-room.service';
import { EventReminderService } from 'src/app/services/event-reminder.service';
import {
  createEmptyResponses,
  createResponseOption,
  EventResponseOption,
  EventResponses,
  getLegacyResponseArrays,
  getRespondedUserIds,
  getResponseOptionById,
  getSelectedResponseOptionId,
  normalizeOptionColor
} from 'src/app/models/event-response-option';
import { FirebaseError } from 'firebase/app';

interface UserGroup {
  title: string;
  users: User[];
}

@Component({
  selector: 'app-event-detail-page',
  templateUrl: './event-detail-page.component.html',
  styleUrls: ['./event-detail-page.component.scss']
})
export class EventDetailPageComponent implements OnInit {

  eventID:string = '';
  viewMode: 'list' | 'room' = 'list';
  isEventLoading:boolean = true;
  isUsersLoading:boolean = true;
  isRoomLoading:boolean = true;
  readonly skeletonItems:number[] = [1, 2, 3, 4];
  
  event:Event = {
    documentID: '',
    name: '',
    day: 0,
    month: 0,
    year: 0,
    time: '',
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

  timeDraft:string = '';
  meetingTimeDraft:string = '';
  meetingLocationDraft:string = '';
  isSavingMeetingInfo:boolean = false;
  meetingInfoMessage:string = '';

  responseOptionsDraft:EventResponseOption[] = [];
  newOptionLabel:string = '';
  newOptionColor:string = '#0a66c2';
  isSavingResponseOptions:boolean = false;
  responseOptionsMessage:string = '';
  isSendingTestReminder:boolean = false;
  isSendingAllReminders:boolean = false;
  reminderMessage:string = '';

  room: RehearsalRoom | null = null;
  allUsers: User[] = [];

  alto_saxophones:User[] = []
  tenor_saxophones:User[] = []
  trumpets:User[] = []
  trombones:User[] = []
  clarinets:User[] = []
  flutes:User[] = []
  percussions:User[] = []
  baritones:User[] = []
  others:User[] = []

  constructor(
    private activatedRoute:ActivatedRoute, 
    private router:Router, 
    private firestore:Firestore,
    private rehearsalRoomService: RehearsalRoomService,
    private eventReminderService: EventReminderService
  ) {  }
  
  ngOnInit(): void {
    this.eventID = this.activatedRoute.snapshot.params['eventID']
    this.loadEvent()
    this.loadRoom()
  }

  loadRoom(): void {
    this.rehearsalRoomService.getRooms().subscribe((rooms) => {
      if (rooms.length > 0) {
        this.room = rooms[0];
      }
      this.isRoomLoading = false;
    });
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'list' ? 'room' : 'list';
  }

  getSelectedOption(userId: string): EventResponseOption | null {
    if (!this.event.training && this.event.responseOptions.length > 0) {
      return getResponseOptionById(
        this.event.responseOptions,
        getSelectedResponseOptionId(this.event.responses, userId)
      );
    }

    if (this.event.promised.includes(userId)) {
      return { id: 'promised', label: 'Zugesagt', color: '#28a745' };
    }

    if (this.event.cancelled.includes(userId)) {
      return { id: 'cancelled', label: 'Abgesagt', color: '#dc3545' };
    }

    if (this.event.maby.includes(userId)) {
      return { id: 'maby', label: '?', color: '#ffc107' };
    }

    return null;
  }

  getStatusColor(userId: string): string {
    return this.getSelectedOption(userId)?.color ?? '#9aa6b2';
  }

  getStatusText(userId: string): string {
    const selectedOption = this.getSelectedOption(userId);
    if (!selectedOption) {
      return '•';
    }

    const label = selectedOption.label.trim();
    if (label.length <= 2) {
      return label;
    }

    return label.charAt(0).toUpperCase();
  }

  getStatusLabel(userId: string): string {
    return this.getSelectedOption(userId)?.label ?? 'Ausstehend';
  }

  loadEvent() {
    const eventDocument = doc(this.firestore, 'events', this.eventID);
    docData(eventDocument).subscribe((eventModel) => {
      if (!eventModel) {
        this.isEventLoading = false;
        return;
      }

      const mappedEvent = mapEventFromFirestore(eventModel as Record<string, unknown>, this.eventID);
      const shouldSyncMeetingDrafts =
        this.timeDraft === this.event.time
        && this.meetingTimeDraft === this.event.meetingTime
        && this.meetingLocationDraft === this.event.meetingLocation;
      const shouldSyncResponseOptions =
        JSON.stringify(this.responseOptionsDraft) === JSON.stringify(this.event.responseOptions);

      this.event = mappedEvent;

      if (shouldSyncMeetingDrafts) {
        this.timeDraft = this.event.time;
        this.meetingTimeDraft = this.event.meetingTime;
        this.meetingLocationDraft = this.event.meetingLocation;
      }

      if (shouldSyncResponseOptions) {
        this.responseOptionsDraft = this.event.responseOptions.map((option) => ({ ...option }));
      }

      this.isEventLoading = false;
    })
    this.loadUsers()
  }

  hasEventTime(): boolean {
    return this.event.time.trim().length > 0;
  }

  clearEventTime(): void {
    this.timeDraft = '';
    this.meetingInfoMessage = '';
  }

  clearMeetingTime(): void {
    this.meetingTimeDraft = '';
    this.meetingInfoMessage = '';
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

  async saveMeetingInfo(): Promise<void> {
    if (this.event.training || this.isSavingMeetingInfo || !this.event.documentID) {
      return;
    }

    this.isSavingMeetingInfo = true;
    this.meetingInfoMessage = '';

    try {
      const time = this.timeDraft.trim();
      const meetingTime = this.meetingTimeDraft.trim();
      const meetingLocation = this.meetingLocationDraft.trim();
      const eventCollection = collection(this.firestore, 'events');
      await updateDoc(doc(eventCollection, this.event.documentID), {
        time,
        meetingTime,
        meetingLocation
      });
      this.meetingInfoMessage = 'Termininfos wurden gespeichert.';
    } catch (error) {
      console.error(error);
      this.meetingInfoMessage = 'Termininfos konnten nicht gespeichert werden.';
    } finally {
      this.isSavingMeetingInfo = false;
    }
  }

  addResponseOption(): void {
    const label = this.newOptionLabel.trim();
    if (label.length === 0) {
      this.responseOptionsMessage = 'Bitte einen Text fuer die neue Option eingeben.';
      return;
    }

    this.responseOptionsDraft = [
      ...this.responseOptionsDraft,
      createResponseOption(label, this.newOptionColor)
    ];
    this.newOptionLabel = '';
    this.newOptionColor = '#0a66c2';
    this.responseOptionsMessage = '';
  }

  removeResponseOption(optionId: string): void {
    this.responseOptionsDraft = this.responseOptionsDraft.filter((option) => option.id !== optionId);
  }

  onOptionColorChange(optionId: string, color: string): void {
    this.responseOptionsDraft = this.responseOptionsDraft.map((option) => (
      option.id === optionId
        ? { ...option, color: normalizeOptionColor(color) }
        : option
    ));
  }

  onOptionLabelChange(optionId: string, label: string): void {
    this.responseOptionsDraft = this.responseOptionsDraft.map((option) => (
      option.id === optionId
        ? { ...option, label }
        : option
    ));
  }

  async saveResponseOptions(): Promise<void> {
    if (this.event.training || this.isSavingResponseOptions || !this.event.documentID) {
      return;
    }

    const cleanedOptions = this.responseOptionsDraft
      .map((option) => ({
        ...option,
        label: option.label.trim(),
        color: normalizeOptionColor(option.color)
      }))
      .filter((option) => option.label.length > 0);

    if (cleanedOptions.length === 0) {
      this.responseOptionsMessage = 'Bitte mindestens eine Abstimm-Moeglichkeit behalten.';
      return;
    }

    this.isSavingResponseOptions = true;
    this.responseOptionsMessage = '';

    try {
      const nextResponses = this.rebuildResponsesForOptions(cleanedOptions, this.event.responses);
      const legacyResponses = getLegacyResponseArrays(nextResponses);
      const eventCollection = collection(this.firestore, 'events');
      await updateDoc(doc(eventCollection, this.event.documentID), {
        responseOptions: cleanedOptions,
        responses: nextResponses,
        promised: legacyResponses.promised,
        cancelled: legacyResponses.cancelled,
        maby: legacyResponses.maby
      });
      this.responseOptionsDraft = cleanedOptions.map((option) => ({ ...option }));
      this.responseOptionsMessage = 'Abstimm-Moeglichkeiten wurden gespeichert.';
    } catch (error) {
      console.error(error);
      this.responseOptionsMessage = 'Abstimm-Moeglichkeiten konnten nicht gespeichert werden.';
    } finally {
      this.isSavingResponseOptions = false;
    }
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
      this.allUsers = [];
      this.alto_saxophones = [];
      this.tenor_saxophones = [];
      this.trumpets = [];
      this.trombones = [];
      this.clarinets = [];
      this.flutes = [];
      this.percussions = [];
      this.baritones = [];
      this.others = [];

      for(let i = 0; i < val.length; i++) {
        const mUserModel = val[i]
        const currentUser:User = {
          id: mUserModel['id'],
              username: mUserModel['username'],
              email: mUserModel['email'],
              fcmToken: mUserModel['fcmToken'],
              admin: mUserModel['admin'],
              instrument: mUserModel['instrument'],
              chairID: mUserModel['chairID'],
              defaultPromise: mUserModel['defaultPromise']
        }
        this.allUsers.push(currentUser);
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
      this.isUsersLoading = false;
    })
  }

  getUserGroups(): UserGroup[] {
    return [
      { title: 'Alt Saxophone', users: this.alto_saxophones },
      { title: 'Tenor Saxophone', users: this.tenor_saxophones },
      { title: 'Trompeten', users: this.trumpets },
      { title: 'Posaunen', users: this.trombones },
      { title: 'Klarinetten', users: this.clarinets },
      { title: 'Floeten', users: this.flutes },
      { title: 'Schlagwerk', users: this.percussions },
      { title: 'Baritone', users: this.baritones },
      { title: 'Sonstige', users: this.others },
    ].filter((group) => group.users.length > 0);
  }

  getEventDateLabel(): string {
    return `${this.padValue(this.event.day)}.${this.padValue(this.event.month)}.${this.event.year}`;
  }

  getAttendanceSummary(): string {
    if (!this.event.training && this.event.responseOptions.length > 0) {
      return this.event.responseOptions
        .map((option) => `${(this.event.responses[option.id] ?? []).length} ${option.label}`)
        .join(' · ');
    }

    return `${this.event.promised.length} zugesagt · ${this.event.maby.length} vielleicht · ${this.event.cancelled.length} abgesagt`;
  }

  getOpenResponsesCount(): number {
    if (!this.event.training && this.event.responseOptions.length > 0) {
      const respondedUserIds = getRespondedUserIds(this.event.responses);
      return this.allUsers.filter((user) => !respondedUserIds.has(user.id)).length;
    }

    const respondedUserIds = new Set([
      ...this.event.promised,
      ...this.event.cancelled,
      ...this.event.maby,
    ]);

    return this.allUsers.filter((user) => !respondedUserIds.has(user.id)).length;
  }

  async sendTestReminder(): Promise<void> {
    await this.sendReminder('test');
  }

  async sendAllReminders(): Promise<void> {
    await this.sendReminder('all');
  }

  private async sendReminder(mode: 'test' | 'all'): Promise<void> {
    if (
      this.event.training
      || this.isSendingTestReminder
      || this.isSendingAllReminders
      || !this.event.documentID
    ) {
      return;
    }

    if (mode === 'all' && this.getOpenResponsesCount() === 0) {
      this.reminderMessage = 'Alle Mitglieder haben bereits abgestimmt.';
      return;
    }

    if (mode === 'test') {
      this.isSendingTestReminder = true;
    } else {
      this.isSendingAllReminders = true;
    }
    this.reminderMessage = '';

    try {
      const result = await this.eventReminderService.remindUnvotedUsers(this.event.documentID, mode);
      if (mode === 'test') {
        this.reminderMessage = result.sent > 0
          ? 'Test-Erinnerung wurde an deine E-Mail-Adresse gesendet.'
          : 'Test-Erinnerung konnte nicht versendet werden.';
        return;
      }

      if (result.sent === 0) {
        this.reminderMessage = result.skippedWithoutEmail > 0
          ? 'Keine Erinnerung versendet. Bei offenen Mitgliedern fehlt eine gueltige E-Mail.'
          : 'Keine offenen Abstimmungen gefunden.';
      } else {
        const skippedLabel = result.skippedWithoutEmail > 0
          ? ` ${result.skippedWithoutEmail} ohne E-Mail uebersprungen.`
          : '';
        this.reminderMessage = `${result.sent} Erinnerungs-E-Mail${result.sent === 1 ? '' : 's'} versendet.${skippedLabel}`;
      }
    } catch (error) {
      console.error(error);
      this.reminderMessage = this.getReminderErrorMessage(error);
    } finally {
      this.isSendingTestReminder = false;
      this.isSendingAllReminders = false;
    }
  }

  onBackPressed() {
    this.router.navigate([this.event.training ? 'proben' : 'sonstige-termine']);
   }

  private getReminderErrorMessage(error: unknown): string {
    if (error instanceof FirebaseError && error.message.trim().length > 0) {
      return error.message;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const message = String((error as { message?: unknown }).message ?? '').trim();
      if (message.length > 0) {
        return message;
      }
    }

    return 'Die Erinnerungen konnten nicht versendet werden. Pruefe den Vercel-Deploy und die Env Vars.';
  }

  private rebuildResponsesForOptions(
    options: EventResponseOption[],
    previousResponses: EventResponses
  ): EventResponses {
    const nextResponses = createEmptyResponses(options);
    const optionIds = new Set(options.map((option) => option.id));

    for (const [optionId, userIds] of Object.entries(previousResponses)) {
      if (!optionIds.has(optionId)) {
        continue;
      }
      nextResponses[optionId] = [...userIds];
    }

    return nextResponses;
  }

  private padValue(value: number): string {
    return String(value).padStart(2, '0');
  }

}
