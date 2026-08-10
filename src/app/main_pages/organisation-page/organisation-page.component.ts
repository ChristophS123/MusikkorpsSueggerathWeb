import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { Event } from 'src/app/models/event';
import { SongVotingOption } from 'src/app/models/song-voting-option';
import { createEmptyNewsBanner, NewsBanner } from 'src/app/models/news-banner';
import { NewsBannerService } from 'src/app/services/news-banner.service';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';

interface OrganisationCalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isMonday: boolean;
  hasExistingTraining: boolean;
  isSelectable: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-organisation-page',
  templateUrl: './organisation-page.component.html',
  styleUrls: ['./organisation-page.component.scss']
})
export class OrganisationPageComponent implements OnInit {

  user:string|undefined = ''
  generatedTrainingCount:number = 10;
  isGeneratingTrainings:boolean = false;
  trainingGenerationMessage:string = '';
  showBreakTrainingCalendar:boolean = false;
  selectedBreakStartDate:Date | null = null;
  calendarViewDate:Date = this.getMonthStart(new Date());
  calendarDays:OrganisationCalendarDay[] = [];
  private existingTrainingDateKeys:Set<string> = new Set<string>();
  readonly calendarWeekdayLabels:string[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  songVotingName:string = '';
  isAddingSongVoting:boolean = false;
  songVotingMessage:string = '';
  songVotingOptions:SongVotingOption[] = [];
  newsBanner:NewsBanner = createEmptyNewsBanner();
  newsBannerTitle:string = '';
  newsBannerDescription:string = '';
  newsBannerEnabled:boolean = false;
  isSavingNewsBanner:boolean = false;
  newsBannerMessage:string = '';
  hasRunPastEventsCleanup:boolean = false;
  isUsersLoading:boolean = true;
  accountCount:number = 0;
  adminCount:number = 0;
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

  constructor(
    private router:Router,
    private firestore:Firestore,
    private auth:Auth,
    private newsBannerService:NewsBannerService
  ) {
  }

  ngOnInit(): void {
    this.buildCalendarDays();

    this.auth.onAuthStateChanged((currentUser) => {
      this.user = currentUser?.uid;

      if (this.user === undefined) {
        this.router.navigate(['anmelden']);
        return;
      }

      this.loadUsers();
      this.loadNewsBanner();
    });
   }

  openCreateEventPage() {
    this.router.navigate(['termin-hinzufuegen'])
  }

  openRehearsalRoomEditor() {
    this.router.navigate(['probenraum-editor'])
  }

  openAccountManagementPage() {
    this.router.navigate(['organisation', 'accounts'])
  }

  openSongVotingPage() {
    this.router.navigate(['lied-abstimmungen'])
  }

  async generateTrainings(): Promise<void> {
    await this.createGeneratedTrainings();
  }

  async toggleBreakTrainingCalendar(): Promise<void> {
    this.showBreakTrainingCalendar = !this.showBreakTrainingCalendar;
    this.trainingGenerationMessage = '';

    if (this.showBreakTrainingCalendar) {
      this.calendarViewDate = this.getMonthStart(new Date());
      await this.refreshExistingTrainingDates();
      this.buildCalendarDays();
    }
  }

  shiftCalendarMonth(monthOffset: number): void {
    this.calendarViewDate = new Date(
      this.calendarViewDate.getFullYear(),
      this.calendarViewDate.getMonth() + monthOffset,
      1
    );
    this.buildCalendarDays();
  }

  selectBreakStartDate(day: OrganisationCalendarDay): void {
    if (!day.isSelectable) {
      return;
    }

    this.selectedBreakStartDate = this.createDateAtNineteen(day.date);
    this.buildCalendarDays();
    this.trainingGenerationMessage = '';
  }

  getCalendarMonthLabel(): string {
    return this.calendarViewDate.toLocaleDateString('de-DE', {
      month: 'long',
      year: 'numeric'
    });
  }

  getSelectedBreakStartDateLabel(): string {
    if (!this.selectedBreakStartDate) {
      return 'Noch kein Montag ausgewaehlt';
    }

    return this.selectedBreakStartDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  async generateTrainingsWithBreak(): Promise<void> {
    if (!this.selectedBreakStartDate || !this.isMonday(this.selectedBreakStartDate)) {
      this.trainingGenerationMessage = 'Bitte zuerst einen gueltigen Montag im Kalender auswaehlen.';
      return;
    }

    if (this.isDateBeforeToday(this.selectedBreakStartDate)) {
      this.trainingGenerationMessage = 'Der Startdatum-Montag darf nicht in der Vergangenheit liegen.';
      return;
    }

    await this.refreshExistingTrainingDates();
    if (this.hasExistingTrainingOnDate(this.selectedBreakStartDate)) {
      this.selectedBreakStartDate = null;
      this.buildCalendarDays();
      this.trainingGenerationMessage = 'An diesem Montag gibt es bereits eine Probe. Bitte einen anderen Montag waehlen.';
      return;
    }

    await this.createGeneratedTrainings(this.createDateAtNineteen(this.selectedBreakStartDate));
  }

  private async createGeneratedTrainings(forcedStartDate?: Date): Promise<void> {
    const trainingCount = Number(this.generatedTrainingCount);

    if (!Number.isInteger(trainingCount) || trainingCount < 1) {
      this.trainingGenerationMessage = 'Bitte eine gueltige Anzahl an Proben eingeben.';
      return;
    }

    if (this.isGeneratingTrainings) {
      return;
    }

    this.isGeneratingTrainings = true;
    this.trainingGenerationMessage = '';

    try {
      const eventsCollection = collection(this.firestore, 'events');
      const usersCollection = collection(this.firestore, 'users');
      const events = await firstValueFrom(collectionData(eventsCollection));
      const users = await firstValueFrom(collectionData(usersCollection));
      const promisedUsers = this.getUsersWithDefaultPromise(users);
      const latestTrainingDate = this.getLatestTrainingDate(events);

      let nextTrainingDate: Date;
      if (forcedStartDate) {
        if (this.hasExistingTrainingOnDate(forcedStartDate, events)) {
          this.trainingGenerationMessage = 'An diesem Montag gibt es bereits eine Probe. Bitte einen anderen Montag waehlen.';
          return;
        }

        if (latestTrainingDate !== null && forcedStartDate.getTime() <= latestTrainingDate.getTime()) {
          this.trainingGenerationMessage = 'Der gewaehlte Montag muss nach der letzten vorhandenen Probe liegen.';
          return;
        }

        nextTrainingDate = this.createDateAtNineteen(forcedStartDate);
      } else {
        nextTrainingDate = latestTrainingDate === null
          ? this.getNextTrainingDate(new Date())
          : this.getTrainingDateOneWeekLater(latestTrainingDate);
      }

      for (let i = 0; i < trainingCount; i++) {
        const generatedEvent = this.createTrainingEvent(nextTrainingDate, promisedUsers);
        await setDoc(doc(eventsCollection, generatedEvent.documentID), generatedEvent);
        nextTrainingDate = this.getTrainingDateOneWeekLater(nextTrainingDate);
      }

      await this.refreshExistingTrainingDates();
      if (
        this.selectedBreakStartDate !== null
        && this.hasExistingTrainingOnDate(this.selectedBreakStartDate)
      ) {
        this.selectedBreakStartDate = null;
      }
      this.buildCalendarDays();

      this.trainingGenerationMessage = forcedStartDate
        ? `${trainingCount} Probe${trainingCount === 1 ? '' : 'n'} ab dem ausgewaehlten Montag erfolgreich erstellt.`
        : `${trainingCount} Probe${trainingCount === 1 ? '' : 'n'} erfolgreich erstellt.`;
    } catch (error) {
      console.error(error);
      this.trainingGenerationMessage = 'Die Proben konnten nicht erstellt werden.';
    } finally {
      this.isGeneratingTrainings = false;
    }
  }

  async addSongVotingOption(): Promise<void> {
    const songName = this.songVotingName.trim();
    if (songName.length === 0 || this.isAddingSongVoting) {
      this.songVotingMessage = 'Bitte zuerst einen Liednamen eingeben.';
      return;
    }

    this.isAddingSongVoting = true;
    this.songVotingMessage = '';

    try {
      const songVotingsCollection = collection(this.firestore, 'song-votings');
      const songVotingOption: SongVotingOption = {
        id: `${songName}_${Date.now()}`,
        name: songName,
        proVotes: [],
        contraVotes: []
      };
      await setDoc(doc(songVotingsCollection, songVotingOption.id), songVotingOption);
      this.songVotingName = '';
      this.songVotingMessage = 'Lied wurde zur Abstimmung hinzugefuegt.';
    } catch (error) {
      console.error(error);
      this.songVotingMessage = 'Das Lied konnte nicht angelegt werden.';
    } finally {
      this.isAddingSongVoting = false;
    }
  }

  async deleteSongVotingOption(songOptionId: string): Promise<void> {
    try {
      const songVotingsCollection = collection(this.firestore, 'song-votings');
      await deleteDoc(doc(songVotingsCollection, songOptionId));
      this.songVotingMessage = 'Lied wurde aus der Abstimmung entfernt.';
    } catch (error) {
      console.error(error);
      this.songVotingMessage = 'Das Lied konnte nicht entfernt werden.';
    }
  }

  async saveNewsBanner(): Promise<void> {
    const title = this.newsBannerTitle.trim();
    const description = this.newsBannerDescription.trim();

    if (this.newsBannerEnabled && (title.length === 0 || description.length === 0)) {
      this.newsBannerMessage = 'Titel und Beschreibung sind erforderlich, wenn das Banner aktiv ist.';
      return;
    }

    if (this.isSavingNewsBanner) {
      return;
    }

    this.isSavingNewsBanner = true;
    this.newsBannerMessage = '';

    try {
      await this.newsBannerService.saveNewsBanner({
        title,
        description,
        enabled: this.newsBannerEnabled
      });
      this.newsBannerMessage = this.newsBannerEnabled
        ? 'News Banner wurde gespeichert und ist aktiv.'
        : 'News Banner wurde gespeichert und ist deaktiviert.';
    } catch (error) {
      console.error(error);
      this.newsBannerMessage = 'Das News Banner konnte nicht gespeichert werden.';
    } finally {
      this.isSavingNewsBanner = false;
    }
  }

  getNewsBannerStatusLabel(): string {
    return this.newsBanner.enabled ? 'Aktiv auf der Startseite' : 'Deaktiviert';
  }

  getSongVotingCountLabel(): string {
    return `${this.songVotingOptions.length} Lied${this.songVotingOptions.length === 1 ? '' : 'er'} in der Abstimmung`;
  }

   getManagedAccountCountLabel(): string {
    return this.isUsersLoading
      ? 'Accounts werden geladen...'
      : `${this.accountCount} Account${this.accountCount === 1 ? '' : 's'} im System`;
   }

   getAdminCountLabel(): string {
    return this.isUsersLoading
      ? 'Admins werden geladen...'
      : `${this.adminCount} Admin${this.adminCount === 1 ? '' : 's'}`;
   }

   private loadUsers() {
    const usersCollection = collection(this.firestore, 'users');
    collectionData(usersCollection).subscribe((users) => {
      if (this.user === undefined) {
        return;
      }

      this.accountCount = users.length;
      this.adminCount = users.filter((userModel) => Number(userModel['admin']) === 1).length;
      this.isUsersLoading = false;

      const currentManagedUser = users.find((managedUser) => managedUser['id'] === this.user);
      if (!currentManagedUser) {
        return;
      }

      this.userModel = {
        id: currentManagedUser['id'],
        username: currentManagedUser['username'],
        email: currentManagedUser['email'],
        fcmToken: currentManagedUser['fcmToken'],
        admin: currentManagedUser['admin'],
        instrument: currentManagedUser['instrument'],
        chairID: currentManagedUser['chairID'],
        defaultPromise: currentManagedUser['defaultPromise']
      };

      if (Number(this.userModel.admin) === 0) {
        this.router.navigate(['main']);
        return;
      }

      if (!this.hasRunPastEventsCleanup) {
        this.hasRunPastEventsCleanup = true;
        this.cleanupPastEvents();
      }
    })

    const songVotingsCollection = collection(this.firestore, 'song-votings');
    collectionData(songVotingsCollection).subscribe((songVotingModels) => {
      this.songVotingOptions = songVotingModels
        .map((songVotingModel) => ({
          id: String(songVotingModel['id'] ?? ''),
          name: String(songVotingModel['name'] ?? '').trim(),
          proVotes: Array.isArray(songVotingModel['proVotes'])
            ? songVotingModel['proVotes'].map((vote) => String(vote))
            : Array.isArray(songVotingModel['votes'])
              ? songVotingModel['votes'].map((vote) => String(vote))
              : [],
          contraVotes: Array.isArray(songVotingModel['contraVotes'])
            ? songVotingModel['contraVotes'].map((vote) => String(vote))
            : []
        }))
        .filter((songOption) => songOption.id.length > 0 && songOption.name.length > 0)
        .sort((firstOption, secondOption) => firstOption.name.localeCompare(secondOption.name, 'de'));
    });
   }

  private loadNewsBanner(): void {
    this.newsBannerService.getNewsBanner().subscribe((banner) => {
      this.newsBanner = banner;
      this.newsBannerTitle = banner.title;
      this.newsBannerDescription = banner.description;
      this.newsBannerEnabled = banner.enabled;
    });
  }

  onBackPressed() {
    this.router.navigate(['main']);
   }

  private async refreshExistingTrainingDates(): Promise<void> {
    try {
      const eventsCollection = collection(this.firestore, 'events');
      const events = await firstValueFrom(collectionData(eventsCollection));
      this.existingTrainingDateKeys = this.getTrainingDateKeys(events);

      if (
        this.selectedBreakStartDate !== null
        && this.hasExistingTrainingOnDate(this.selectedBreakStartDate)
      ) {
        this.selectedBreakStartDate = null;
      }
    } catch (error) {
      console.error(error);
      this.existingTrainingDateKeys = new Set<string>();
    }
  }

  private getTrainingDateKeys(events: unknown[]): Set<string> {
    const trainingDateKeys = new Set<string>();

    for (const eventModel of events) {
      if (typeof eventModel !== 'object' || eventModel === null) {
        continue;
      }

      const trainingEvent = eventModel as Partial<Event>;
      if (!trainingEvent.training || trainingEvent.day === undefined || trainingEvent.month === undefined || trainingEvent.year === undefined) {
        continue;
      }

      const eventDate = new Date(trainingEvent.year, trainingEvent.month - 1, trainingEvent.day);
      trainingDateKeys.add(this.getDateKey(eventDate));
    }

    return trainingDateKeys;
  }

  private hasExistingTrainingOnDate(date: Date, events?: unknown[]): boolean {
    if (events) {
      return this.getTrainingDateKeys(events).has(this.getDateKey(date));
    }

    return this.existingTrainingDateKeys.has(this.getDateKey(date));
  }

  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildCalendarDays(): void {
    const monthStart = this.getMonthStart(this.calendarViewDate);
    const calendarStart = new Date(monthStart);
    const mondayOffset = (monthStart.getDay() + 6) % 7;
    calendarStart.setDate(monthStart.getDate() - mondayOffset);

    const days: OrganisationCalendarDay[] = [];
    for (let dayIndex = 0; dayIndex < 42; dayIndex++) {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + dayIndex);
      date.setHours(0, 0, 0, 0);

      const isMonday = this.isMonday(date);
      const isCurrentMonth = date.getMonth() === this.calendarViewDate.getMonth();
      const hasExistingTraining = isMonday && this.hasExistingTrainingOnDate(date);
      const isSelectable = isMonday && !this.isDateBeforeToday(date) && !hasExistingTraining;
      const isSelected = this.selectedBreakStartDate !== null
        && this.isSameCalendarDay(this.selectedBreakStartDate, date);

      days.push({
        date,
        dayNumber: date.getDate(),
        isCurrentMonth,
        isMonday,
        hasExistingTraining,
        isSelectable,
        isSelected
      });
    }

    this.calendarDays = days;
  }

  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private isMonday(date: Date): boolean {
    return date.getDay() === 1;
  }

  private isDateBeforeToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() < today.getTime();
  }

  private isSameCalendarDay(firstDate: Date, secondDate: Date): boolean {
    return firstDate.getFullYear() === secondDate.getFullYear()
      && firstDate.getMonth() === secondDate.getMonth()
      && firstDate.getDate() === secondDate.getDate();
  }

  private createDateAtNineteen(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 19, 0, 0, 0);
  }

  private getLatestTrainingDate(events: unknown[]): Date | null {
    let latestTrainingDate: Date | null = null;

    for (const eventModel of events) {
      if (typeof eventModel !== 'object' || eventModel === null) {
        continue;
      }

      const trainingEvent = eventModel as Partial<Event>;
      if (!trainingEvent.training || trainingEvent.day === undefined || trainingEvent.month === undefined || trainingEvent.year === undefined) {
        continue;
      }

      const eventDate = new Date(trainingEvent.year, trainingEvent.month - 1, trainingEvent.day, 19, 0, 0, 0);
      if (latestTrainingDate === null || eventDate.getTime() > latestTrainingDate.getTime()) {
        latestTrainingDate = eventDate;
      }
    }

    return latestTrainingDate;
  }

  private getNextTrainingDate(baseDate: Date): Date {
    const nextTrainingDate = new Date(baseDate);
    nextTrainingDate.setHours(19, 0, 0, 0);

    const daysUntilMonday = (1 - nextTrainingDate.getDay() + 7) % 7;
    if (daysUntilMonday === 0 && baseDate.getTime() < nextTrainingDate.getTime()) {
      return nextTrainingDate;
    }

    nextTrainingDate.setDate(nextTrainingDate.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
    return nextTrainingDate;
  }

  private getTrainingDateOneWeekLater(baseDate: Date): Date {
    const nextTrainingDate = new Date(baseDate);
    nextTrainingDate.setDate(nextTrainingDate.getDate() + 7);
    nextTrainingDate.setHours(19, 0, 0, 0);
    return nextTrainingDate;
  }

  private getUsersWithDefaultPromise(users: unknown[]): string[] {
    const promisedUsers: string[] = [];

    for (const userModel of users) {
      if (typeof userModel !== 'object' || userModel === null) {
        continue;
      }

      const user = userModel as Partial<User>;
      if (user.defaultPromise && typeof user.id === 'string' && user.id.length > 0) {
        promisedUsers.push(user.id);
      }
    }

    return promisedUsers;
  }

  private async cleanupPastEvents(): Promise<void> {
    try {
      const eventsCollection = collection(this.firestore, 'events');
      const events = await firstValueFrom(collectionData(eventsCollection));
      const currentDate = new Date();

      for (const eventModel of events) {
        if (typeof eventModel !== 'object' || eventModel === null) {
          continue;
        }

        const event = eventModel as Partial<Event>;
        if (typeof event.documentID !== 'string' || event.documentID.length === 0) {
          continue;
        }
        if (event.day === undefined || event.month === undefined || event.year === undefined) {
          continue;
        }

        const endOfEventDay = new Date(
          event.year,
          event.month - 1,
          event.day,
          23,
          59,
          59,
          999
        );
        if (currentDate.getTime() > endOfEventDay.getTime()) {
          await deleteDoc(doc(eventsCollection, event.documentID));
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  private createTrainingEvent(trainingDate: Date, promisedUsers: string[]): Event {
    const day = trainingDate.getDate();
    const month = trainingDate.getMonth() + 1;
    const year = trainingDate.getFullYear();
    const documentID = `Probe_${year}_${String(month).padStart(2, '0')}_${String(day).padStart(2, '0')}_19_00`;

    return {
      documentID: documentID,
      name: 'Probe',
      day: day,
      month: month,
      year: year,
      time: '19:00',
      meetingTime: '',
      meetingLocation: '',
      promised: [...promisedUsers],
      cancelled: [],
      maby: [],
      responseOptions: [],
      responses: {},
      pieces: [],
      training: true,
      eventCancelled: false
    };
  }

}
