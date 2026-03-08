import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { Event } from 'src/app/models/event';
import { SongVotingOption } from 'src/app/models/song-voting-option';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';

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
  songVotingName:string = '';
  isAddingSongVoting:boolean = false;
  songVotingMessage:string = '';
  songVotingOptions:SongVotingOption[] = [];
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

  constructor(private router:Router, private firestore:Firestore, private auth:Auth) { 
  }

  ngOnInit(): void {
    this.auth.onAuthStateChanged((currentUser) => {
      this.user = currentUser?.uid;

      if (this.user === undefined) {
        this.router.navigate(['anmelden']);
        return;
      }

      this.loadUsers();
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
    const trainingCount = Number(this.generatedTrainingCount);

    if (!Number.isInteger(trainingCount) || trainingCount < 1) {
      this.trainingGenerationMessage = 'Bitte eine gueltige Anzahl an Proben eingeben.';
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
      let nextTrainingDate = latestTrainingDate === null
        ? this.getNextTrainingDate(new Date())
        : this.getTrainingDateOneWeekLater(latestTrainingDate);

      for (let i = 0; i < trainingCount; i++) {
        const generatedEvent = this.createTrainingEvent(nextTrainingDate, promisedUsers);
        await setDoc(doc(eventsCollection, generatedEvent.documentID), generatedEvent);
        nextTrainingDate = this.getTrainingDateOneWeekLater(nextTrainingDate);
      }

      this.trainingGenerationMessage = `${trainingCount} Probe${trainingCount === 1 ? '' : 'n'} erfolgreich erstellt.`;
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

  onBackPressed() {
    this.router.navigate(['main']);
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

        const eventDate = this.getEventDate(event);
        if (currentDate.getTime() > eventDate.getTime()) {
          await deleteDoc(doc(eventsCollection, event.documentID));
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  private getEventDate(event: Partial<Event>): Date {
    const time = typeof event.time === 'string' ? event.time : '00:00';
    const [hoursString, minutesString] = time.split(':');
    const hours = Number(hoursString);
    const minutes = Number(minutesString);

    return new Date(
      event.year ?? 0,
      (event.month ?? 1) - 1,
      event.day ?? 1,
      Number.isNaN(hours) ? 0 : hours,
      Number.isNaN(minutes) ? 0 : minutes,
      0,
      0
    );
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
      promised: [...promisedUsers],
      cancelled: [],
      maby: [],
      training: true,
      eventCancelled: false
    };
  }

}
