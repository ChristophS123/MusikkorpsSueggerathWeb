import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Event } from 'src/app/models/event';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { collection, updateDoc, doc } from 'firebase/firestore';
import { User } from 'src/app/models/user';
import { RehearsalRoom } from 'src/app/models/rehearsal-room';
import { RehearsalRoomService } from 'src/app/services/rehearsal-room.service';

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
    promised: [],
    cancelled: [],
    maby: [],
    training: false,
    eventCancelled: true,
  };

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
    private rehearsalRoomService: RehearsalRoomService
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

  getUserStatus(userId: string): 'promised' | 'cancelled' | 'maybe' | 'pending' {
    if (this.event.promised.includes(userId)) {
      return 'promised';
    }

    if (this.event.cancelled.includes(userId)) {
      return 'cancelled';
    }

    if (this.event.maby.includes(userId)) {
      return 'maybe';
    }

    return 'pending';
  }

  getStatusColor(userId: string): string {
    const status = this.getUserStatus(userId);
    switch (status) {
      case 'promised': return '#28a745';
      case 'cancelled': return '#dc3545';
      case 'maybe': return '#ffc107';
      default: return '#9aa6b2';
    }
  }

  getStatusText(userId: string): string {
    const status = this.getUserStatus(userId);
    switch (status) {
      case 'promised': return '✓';
      case 'cancelled': return '✗';
      case 'maybe': return '?';
      default: return '•';
    }
  }

  getStatusLabel(userId: string): string {
    const status = this.getUserStatus(userId);
    switch (status) {
      case 'promised': return 'Zugesagt';
      case 'cancelled': return 'Abgesagt';
      case 'maybe': return 'Vielleicht';
      default: return 'Ausstehend';
    }
  }

  loadEvent() {
    const eventsCollection = collection(this.firestore, 'events');
    collectionData(eventsCollection).subscribe((val) => {
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
        if(event.documentID == this.eventID) {
          this.event = event
          this.isEventLoading = false;
        }
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
    return `${this.event.promised.length} zugesagt · ${this.event.maby.length} vielleicht · ${this.event.cancelled.length} abgesagt`;
  }

  getOpenResponsesCount(): number {
    const respondedUserIds = new Set([
      ...this.event.promised,
      ...this.event.cancelled,
      ...this.event.maby,
    ]);

    return this.allUsers.filter((user) => !respondedUserIds.has(user.id)).length;
  }

  onBackPressed() {
    this.router.navigate(['proben']);
   }

  private padValue(value: number): string {
    return String(value).padStart(2, '0');
  }

}