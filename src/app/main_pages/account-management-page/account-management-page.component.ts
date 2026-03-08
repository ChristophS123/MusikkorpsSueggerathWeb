import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { collection, doc, updateDoc } from 'firebase/firestore';

interface ManagedUser extends User {
  originalInstrument: string;
  originalAdmin: number;
  isSaving: boolean;
  saveMessage: string;
}

@Component({
  selector: 'app-account-management-page',
  templateUrl: './account-management-page.component.html',
  styleUrls: ['./account-management-page.component.scss']
})
export class AccountManagementPageComponent implements OnInit {

  readonly instrumentOptions:string[] = [
    '',
    'Alt Saxophon',
    'Tenor Saxophone',
    'Trompete',
    'Posaune',
    'Klarinette',
    'Floete',
    'Schlagwerk',
    'Bariton',
    'Sonstiges'
  ];

  readonly skeletonItems:number[] = [1, 2, 3, 4];

  currentUserId:string = '';
  isAccountsLoading:boolean = true;
  accountSearch:string = '';
  managedUsers:ManagedUser[] = [];

  constructor(private router:Router, private firestore:Firestore, private auth:Auth) {
  }

  ngOnInit(): void {
    this.auth.onAuthStateChanged((currentUser) => {
      this.currentUserId = currentUser?.uid ?? '';

      if (this.currentUserId.length === 0) {
        this.router.navigate(['anmelden']);
        return;
      }

      this.loadUsers();
    });
  }

  onBackPressed() {
    this.router.navigate(['organisation']);
  }

  async saveUser(managedUser: ManagedUser): Promise<void> {
    if (!this.hasUserChanges(managedUser) || managedUser.isSaving) {
      return;
    }

    managedUser.isSaving = true;
    managedUser.saveMessage = '';

    try {
      const usersCollection = collection(this.firestore, 'users');
      await updateDoc(doc(usersCollection, managedUser.id), {
        instrument: managedUser.instrument.trim(),
        admin: Number(managedUser.admin)
      });

      managedUser.originalInstrument = managedUser.instrument.trim();
      managedUser.originalAdmin = Number(managedUser.admin);
      managedUser.saveMessage = 'Aenderungen gespeichert.';
    } catch (error) {
      console.error(error);
      managedUser.saveMessage = 'Speichern fehlgeschlagen.';
    } finally {
      managedUser.isSaving = false;
    }
  }

  hasUserChanges(managedUser: ManagedUser): boolean {
    return managedUser.instrument.trim() !== managedUser.originalInstrument || Number(managedUser.admin) !== managedUser.originalAdmin;
  }

  getFilteredUsers(): ManagedUser[] {
    const searchTerm = this.accountSearch.trim().toLowerCase();

    return [...this.managedUsers]
      .filter((managedUser) => {
        if (searchTerm.length === 0) {
          return true;
        }

        return managedUser.username.toLowerCase().includes(searchTerm)
          || managedUser.email.toLowerCase().includes(searchTerm)
          || managedUser.instrument.toLowerCase().includes(searchTerm);
      })
      .sort((firstUser, secondUser) => {
        if (Number(firstUser.admin) !== Number(secondUser.admin)) {
          return Number(secondUser.admin) - Number(firstUser.admin);
        }

        return firstUser.username.localeCompare(secondUser.username, 'de');
      });
  }

  getManagedAccountCountLabel(): string {
    return `${this.managedUsers.length} Account${this.managedUsers.length === 1 ? '' : 's'} im System`;
  }

  getAdminCountLabel(): string {
    const adminCount = this.managedUsers.filter((managedUser) => Number(managedUser.admin) === 1).length;
    return `${adminCount} Admin${adminCount === 1 ? '' : 's'}`;
  }

  getInitials(managedUser: ManagedUser): string {
    const baseText = managedUser.username.trim().length > 0 ? managedUser.username.trim() : managedUser.email.trim();
    if (baseText.length === 0) {
      return 'MK';
    }

    const parts = baseText.split(/\s+/).filter((part) => part.length > 0);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  getRoleLabel(managedUser: ManagedUser): string {
    return Number(managedUser.admin) === 1 ? 'Administrator' : 'Mitglied';
  }

  toggleAdminRole(managedUser: ManagedUser): void {
    managedUser.admin = Number(managedUser.admin) === 1 ? 0 : 1;
    managedUser.saveMessage = '';
  }

  private loadUsers(): void {
    const usersCollection = collection(this.firestore, 'users');
    collectionData(usersCollection).subscribe((users) => {
      const nextManagedUsers: ManagedUser[] = users.map((userModel) => {
        const instrument = typeof userModel['instrument'] === 'string' ? userModel['instrument'] : '';
        const admin = Number(userModel['admin']) === 1 ? 1 : 0;

        return {
          id: userModel['id'],
          username: userModel['username'],
          email: userModel['email'],
          fcmToken: userModel['fcmToken'],
          admin: admin,
          instrument: instrument,
          chairID: userModel['chairID'],
          defaultPromise: userModel['defaultPromise'],
          originalInstrument: instrument,
          originalAdmin: admin,
          isSaving: false,
          saveMessage: ''
        };
      });

      const currentManagedUser = nextManagedUsers.find((managedUser) => managedUser.id === this.currentUserId);
      if (!currentManagedUser || Number(currentManagedUser.admin) !== 1) {
        this.router.navigate(['main']);
        return;
      }

      this.managedUsers = nextManagedUsers;
      this.isAccountsLoading = false;
    });
  }

}