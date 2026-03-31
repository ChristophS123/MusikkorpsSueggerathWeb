import { Component, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, docData } from '@angular/fire/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { doc } from 'firebase/firestore';
import { Event } from 'src/app/models/event';
import { RehearsalPiecesService } from 'src/app/services/rehearsal-pieces.service';

@Component({
  selector: 'app-rehearsal-pieces-page',
  templateUrl: './rehearsal-pieces-page.component.html',
  styleUrls: ['./rehearsal-pieces-page.component.scss']
})
export class RehearsalPiecesPageComponent implements OnInit {

  eventId:string = '';
  rehearsal:Event | null = null;
  templatePieces:string[] = [];
  newPieceName:string = '';
  editingIndex:number = -1;
  editingValue:string = '';
  isEventLoading:boolean = true;
  isTemplatesLoading:boolean = true;
  isUserLoading:boolean = true;
  isSaving:boolean = false;
  isAdmin:boolean = false;
  statusMessage:string = '';
  statusType:'success' | 'error' | '' = '';
  readonly skeletonItems:number[] = [1, 2, 3, 4];

  constructor(
    private activatedRoute:ActivatedRoute,
    private router:Router,
    private auth:Auth,
    private firestore:Firestore,
    private rehearsalPiecesService:RehearsalPiecesService
  ) { }

  ngOnInit(): void {
    this.eventId = String(this.activatedRoute.snapshot.params['eventID'] ?? '');
    this.loadUser();
    this.loadRehearsal();
    this.loadTemplatePieces();
  }

  onBackPressed(): void {
    this.router.navigate(['proben']);
  }

  async addPiece(): Promise<void> {
    const normalizedPiece = this.normalizePiece(this.newPieceName);
    if (!this.isAdmin) {
      this.setStatus('error', 'Nur Administratoren können Stücke bearbeiten.');
      return;
    }
    if (normalizedPiece.length === 0) {
      this.setStatus('error', 'Bitte zuerst einen Stücknamen eingeben.');
      return;
    }
    if (this.isDuplicatePiece(normalizedPiece)) {
      this.setStatus('error', 'Dieses Stück ist bereits in der Probe hinterlegt.');
      return;
    }

    await this.persistPieces([...this.getPieces(), normalizedPiece], normalizedPiece, 'Stück wurde hinzugefügt.');
    this.newPieceName = '';
  }

  startEditing(index:number): void {
    if (!this.isAdmin) {
      return;
    }

    this.editingIndex = index;
    this.editingValue = this.getPieces()[index] ?? '';
    this.clearStatus();
  }

  cancelEditing(): void {
    this.editingIndex = -1;
    this.editingValue = '';
  }

  async saveEditedPiece(): Promise<void> {
    const normalizedPiece = this.normalizePiece(this.editingValue);
    if (this.editingIndex < 0) {
      return;
    }
    if (normalizedPiece.length === 0) {
      this.setStatus('error', 'Bitte einen gültigen Stücknamen eingeben.');
      return;
    }

    const nextPieces = [...this.getPieces()];
    const duplicateIndex = nextPieces.findIndex((piece, index) => index !== this.editingIndex && this.toComparisonKey(piece) === this.toComparisonKey(normalizedPiece));
    if (duplicateIndex >= 0) {
      this.setStatus('error', 'Dieses Stück ist bereits in der Liste vorhanden.');
      return;
    }

    nextPieces[this.editingIndex] = normalizedPiece;
    await this.persistPieces(nextPieces, normalizedPiece, 'Stück wurde aktualisiert.');
    this.cancelEditing();
  }

  async deletePiece(index:number): Promise<void> {
    if (!this.isAdmin) {
      return;
    }

    const nextPieces = this.getPieces().filter((_, pieceIndex) => pieceIndex !== index);
    await this.persistPieces(nextPieces, '', 'Stück wurde entfernt.');
    if (this.editingIndex === index) {
      this.cancelEditing();
    }
  }

  getPieceCountLabel(): string {
    const pieceCount = this.getPieces().length;
    return `${pieceCount} Stück${pieceCount === 1 ? '' : 'e'} für diese Probe`;
  }

  getModeLabel(): string {
    return this.isAdmin ? 'Admin-Modus: Liste bearbeiten' : 'Mitgliederansicht: Liste nur lesen';
  }

  getPieces(): string[] {
    return this.rehearsal?.pieces ?? [];
  }

  getSuggestedTemplatePieces(searchValue:string, excludeIndex:number = -1): string[] {
    const comparisonSearchValue = this.toComparisonKey(searchValue);

    return this.templatePieces
      .filter((piece) => comparisonSearchValue.length === 0 || this.toComparisonKey(piece).includes(comparisonSearchValue))
      .filter((piece) => !this.getPieces().some((existingPiece, index) => index !== excludeIndex && this.toComparisonKey(existingPiece) === this.toComparisonKey(piece)))
      .slice(0, 6);
  }

  selectNewPieceTemplate(pieceName:string): void {
    this.newPieceName = pieceName;
    this.clearStatus();
  }

  selectEditingTemplate(pieceName:string): void {
    this.editingValue = pieceName;
    this.clearStatus();
  }

  trackByIndex(index:number): number {
    return index;
  }

  trackByPiece(_:number, piece:string): string {
    return piece;
  }

  private loadUser(): void {
    this.auth.onAuthStateChanged((user) => {
      if (!user) {
        this.isAdmin = false;
        this.isUserLoading = false;
        this.router.navigate(['anmelden']);
        return;
      }

      const userDocument = doc(this.firestore, 'users', user.uid);
      docData(userDocument).subscribe((userModel) => {
        this.isAdmin = Number(userModel?.['admin'] ?? 0) === 1;
        this.isUserLoading = false;
      });
    });
  }

  private loadRehearsal(): void {
    this.rehearsalPiecesService.getEvent(this.eventId).subscribe((eventModel) => {
      this.rehearsal = eventModel;
      this.isEventLoading = false;
    });
  }

  private loadTemplatePieces(): void {
    this.rehearsalPiecesService.getTemplatePieces().subscribe((pieces) => {
      this.templatePieces = pieces;
      this.isTemplatesLoading = false;
    });
  }

  private async persistPieces(nextPieces:string[], templatePiece:string, successMessage:string): Promise<void> {
    if (!this.rehearsal || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.clearStatus();

    try {
      await this.rehearsalPiecesService.saveEventPieces(this.rehearsal.documentID, nextPieces);
      if (templatePiece.length > 0) {
        await this.rehearsalPiecesService.savePieceTemplate(templatePiece);
        this.mergeTemplatePiece(templatePiece);
      }

      this.rehearsal = {
        ...this.rehearsal,
        pieces: nextPieces
      };
      this.setStatus('success', successMessage);
    } catch (error) {
      console.error(error);
      this.setStatus('error', 'Die Stückliste konnte nicht gespeichert werden.');
    } finally {
      this.isSaving = false;
    }
  }

  private mergeTemplatePiece(pieceName:string): void {
    const normalizedPiece = this.normalizePiece(pieceName);
    if (normalizedPiece.length === 0) {
      return;
    }

    if (this.templatePieces.some((piece) => this.toComparisonKey(piece) === this.toComparisonKey(normalizedPiece))) {
      return;
    }

    this.templatePieces = [...this.templatePieces, normalizedPiece].sort((firstPiece, secondPiece) => firstPiece.localeCompare(secondPiece, 'de'));
  }

  private isDuplicatePiece(pieceName:string): boolean {
    return this.getPieces().some((piece) => this.toComparisonKey(piece) === this.toComparisonKey(pieceName));
  }

  private normalizePiece(pieceName:string): string {
    return pieceName.replace(/\s+/g, ' ').trim();
  }

  private toComparisonKey(pieceName:string): string {
    return this.normalizePiece(pieceName).toLocaleLowerCase('de');
  }

  private setStatus(type:'success' | 'error' | '', message:string): void {
    this.statusType = type;
    this.statusMessage = message;
  }

  private clearStatus(): void {
    this.statusType = '';
    this.statusMessage = '';
  }
}