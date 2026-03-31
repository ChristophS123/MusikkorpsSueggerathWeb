import { Injectable } from '@angular/core';
import { Firestore, docData } from '@angular/fire/firestore';
import { arrayUnion, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Observable, map, shareReplay } from 'rxjs';
import { Event } from '../models/event';
import { RehearsalPiece, normalizeRehearsalPieceName, normalizeRehearsalPieces } from '../models/rehearsal-piece';

@Injectable({
  providedIn: 'root'
})
export class RehearsalPiecesService {

  private readonly templateDocumentPath:[string, string] = ['app-metadata', 'rehearsal-piece-templates'];
  private templatePieces$?:Observable<string[]>;

  constructor(private firestore:Firestore) { }

  getEvent(eventId:string): Observable<Event | null> {
    return docData(doc(this.firestore, 'events', eventId)).pipe(
      map((eventModel) => {
        if (!eventModel) {
          return null;
        }

        return {
          documentID: String(eventModel['documentID'] ?? eventId),
          name: String(eventModel['name'] ?? ''),
          day: Number(eventModel['day'] ?? 0),
          month: Number(eventModel['month'] ?? 0),
          year: Number(eventModel['year'] ?? 0),
          time: String(eventModel['time'] ?? ''),
          promised: this.toStringArray(eventModel['promised']),
          cancelled: this.toStringArray(eventModel['cancelled']),
          maby: this.toStringArray(eventModel['maby']),
          pieces: normalizeRehearsalPieces(eventModel['pieces']),
          training: Boolean(eventModel['training']),
          eventCancelled: Boolean(eventModel['eventCancelled'])
        };
      })
    );
  }

  getTemplatePieces(): Observable<string[]> {
    if (!this.templatePieces$) {
      this.templatePieces$ = docData(doc(this.firestore, ...this.templateDocumentPath)).pipe(
        map((templateModel) => this.normalizePieceNames(this.toStringArray(templateModel?.['items']), true)),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }

    return this.templatePieces$;
  }

  async saveEventPieces(eventId:string, pieces:RehearsalPiece[]): Promise<void> {
    await updateDoc(doc(this.firestore, 'events', eventId), {
      pieces: normalizeRehearsalPieces(pieces)
    });
  }

  async savePieceTemplate(pieceName:string): Promise<void> {
    const normalizedPiece = normalizeRehearsalPieceName(pieceName);
    if (normalizedPiece.length === 0) {
      return;
    }

    await setDoc(doc(this.firestore, ...this.templateDocumentPath), {
      items: arrayUnion(normalizedPiece)
    }, { merge: true });
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((entry) => String(entry));
  }

  private normalizePieceNames(pieces:string[], sortAlphabetically:boolean): string[] {
    const uniquePieces = new Map<string, string>();

    for (const piece of pieces) {
      const normalizedPiece = normalizeRehearsalPieceName(piece);
      if (normalizedPiece.length === 0) {
        continue;
      }

      const normalizedKey = normalizedPiece.toLocaleLowerCase('de');
      if (!uniquePieces.has(normalizedKey)) {
        uniquePieces.set(normalizedKey, normalizedPiece);
      }
    }

    const normalizedPieces = [...uniquePieces.values()];
    if (sortAlphabetically) {
      normalizedPieces.sort((firstPiece, secondPiece) => firstPiece.localeCompare(secondPiece, 'de'));
    }

    return normalizedPieces;
  }
}