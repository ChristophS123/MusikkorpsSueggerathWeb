import { Injectable } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Observable, map } from 'rxjs';
import { RehearsalRoom, Chair } from '../models/rehearsal-room';

@Injectable({
  providedIn: 'root'
})
export class RehearsalRoomService {

  constructor(private firestore: Firestore) { }

  getRooms(): Observable<RehearsalRoom[]> {
    const roomsCollection = collection(this.firestore, 'rehearsal-rooms');
    return collectionData(roomsCollection).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((data: any[]) => {
        return data.map(room => ({
          documentID: room['documentID'],
          name: room['name'],
          width: room['width'],
          height: room['height'],
          chairs: room['chairs'] || []
        } as RehearsalRoom));
      })
    );
  }

  async saveRoom(room: RehearsalRoom): Promise<void> {
    const roomsCollection = collection(this.firestore, 'rehearsal-rooms');
    const roomDoc = doc(roomsCollection, room.documentID);
    await setDoc(roomDoc, {
      documentID: room.documentID,
      name: room.name,
      width: room.width,
      height: room.height,
      chairs: room.chairs
    });
  }

  async updateChairs(roomId: string, chairs: Chair[]): Promise<void> {
    const roomsCollection = collection(this.firestore, 'rehearsal-rooms');
    const roomDoc = doc(roomsCollection, roomId);
    await updateDoc(roomDoc, { chairs: chairs });
  }

  async deleteRoom(roomId: string): Promise<void> {
    const roomsCollection = collection(this.firestore, 'rehearsal-rooms');
    const roomDoc = doc(roomsCollection, roomId);
    await deleteDoc(roomDoc);
  }
}
