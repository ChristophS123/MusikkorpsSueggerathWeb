import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { collection } from 'firebase/firestore';
import { RehearsalRoom, Chair } from 'src/app/models/rehearsal-room';
import { User } from 'src/app/models/user';
import { RehearsalRoomService } from 'src/app/services/rehearsal-room.service';

@Component({
  selector: 'app-rehearsal-room-editor',
  templateUrl: './rehearsal-room-editor.component.html',
  styleUrls: ['./rehearsal-room-editor.component.scss']
})
export class RehearsalRoomEditorComponent implements OnInit {

  room: RehearsalRoom = {
    documentID: '',
    name: 'Probenraum',
    width: 800,
    height: 600,
    chairs: []
  };

  users: User[] = [];
  selectedChair: Chair | null = null;
  isDragging = false;
  dragOffsetX = 0;
  dragOffsetY = 0;
  nextChairId = 1;
  isNewRoom = true;

  constructor(
    private router: Router,
    private firestore: Firestore,
    private rehearsalRoomService: RehearsalRoomService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoom();
  }

  loadUsers(): void {
    const usersCollection = collection(this.firestore, 'users');
    collectionData(usersCollection).subscribe((val) => {
      this.users = [];
      for (let i = 0; i < val.length; i++) {
        const mUserModel = val[i];
        this.users.push({
          id: mUserModel['id'],
          username: mUserModel['username'],
          email: mUserModel['email'],
          fcmToken: mUserModel['fcmToken'],
          admin: mUserModel['admin'],
          instrument: mUserModel['instrument'],
          chairID: mUserModel['chairID'],
          defaultPromise: mUserModel['defaultPromise']
        });
      }
    });
  }

  loadRoom(): void {
    this.rehearsalRoomService.getRooms().subscribe((rooms) => {
      if (rooms.length > 0) {
        this.room = rooms[0];
        this.isNewRoom = false;
        if (this.room.chairs.length > 0) {
          this.nextChairId = Math.max(...this.room.chairs.map(c => c.id)) + 1;
        }
      } else {
        this.room.documentID = this.generateUUID();
      }
    });
  }

  addChair(): void {
    const newChair: Chair = {
      id: this.nextChairId++,
      x: 50,
      y: 50,
      userId: '',
      userName: ''
    };
    this.room.chairs.push(newChair);
  }

  removeChair(chair: Chair): void {
    const index = this.room.chairs.findIndex(c => c.id === chair.id);
    if (index > -1) {
      this.room.chairs.splice(index, 1);
    }
    this.selectedChair = null;
  }

  onChairMouseDown(event: MouseEvent, chair: Chair): void {
    this.selectedChair = chair;
    this.isDragging = true;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.dragOffsetX = event.clientX - rect.left;
    this.dragOffsetY = event.clientY - rect.top;
    event.preventDefault();
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.selectedChair) {
      const canvas = document.getElementById('room-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        let newX = event.clientX - rect.left - this.dragOffsetX;
        let newY = event.clientY - rect.top - this.dragOffsetY;
        
        // Grenzen einhalten
        newX = Math.max(0, Math.min(newX, this.room.width - 80));
        newY = Math.max(0, Math.min(newY, this.room.height - 60));
        
        this.selectedChair.x = newX;
        this.selectedChair.y = newY;
      }
    }
  }

  onCanvasMouseUp(): void {
    this.isDragging = false;
  }

  onCanvasMouseLeave(): void {
    this.isDragging = false;
  }

  assignUserToChair(chair: Chair, userId: string): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      chair.userId = user.id;
      chair.userName = user.username;
    } else {
      chair.userId = '';
      chair.userName = '';
    }
  }

  getUnassignedUsers(): User[] {
    const assignedUserIds = this.room.chairs.map(c => c.userId);
    return this.users.filter(u => !assignedUserIds.includes(u.id));
  }

  async saveRoom(): Promise<void> {
    try {
      await this.rehearsalRoomService.saveRoom(this.room);
      alert('Probenraum wurde gespeichert!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern des Probenraums.');
    }
  }

  onBackPressed(): void {
    this.router.navigate(['organisation']);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
