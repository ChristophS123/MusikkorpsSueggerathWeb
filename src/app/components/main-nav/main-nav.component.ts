import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { collection } from 'firebase/firestore';
import { User } from 'src/app/models/user';

interface NavItem {
  label: string;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-main-nav',
  templateUrl: './main-nav.component.html',
  styleUrls: ['./main-nav.component.scss']
})
export class MainNavComponent implements OnInit {

  readonly navItems: NavItem[] = [
    { label: 'Start', route: '/main' },
    { label: 'Proben', route: '/proben' },
    { label: 'Sonstige Termine', route: '/sonstige-termine' },
    { label: 'Runde geben', route: '/abstimmungen' },
    { label: 'Lied-Abstimmungen', route: '/lied-abstimmungen' },
    { label: 'Organisation', route: '/organisation', adminOnly: true }
  ];

  readonly emptyUser: User = {
    id: '',
    username: '',
    email: '',
    fcmToken: '',
    admin: 0,
    instrument: '',
    defaultPromise: false,
    chairID: 0
  };

  userModel:User = { ...this.emptyUser };
  currentUserId:string = '';

  isNavOpen: boolean = false;
  isAccountMenuOpen: boolean = false;

  constructor(private router:Router, private firestore:Firestore, private auth:Auth) {  }

  ngOnInit(): void {
    this.auth.onAuthStateChanged((user) => {
      if (user == null) {
        this.currentUserId = '';
        this.userModel = { ...this.emptyUser };
        return;
      }

      this.currentUserId = user.uid;
      this.loadUser();
    });
  }

  toggleNav() {
    this.isNavOpen = !this.isNavOpen;
    if (this.isNavOpen) {
      this.isAccountMenuOpen = false;
    }
  }

  closeNav(): void {
    this.isNavOpen = false;
  }

  toggleAccountMenu(): void {
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
    if (this.isAccountMenuOpen) {
      this.isNavOpen = false;
    }
  }

  closeAccountMenu(): void {
    this.isAccountMenuOpen = false;
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.closeNav();
    this.closeAccountMenu();
    this.router.navigate(['/anmelden'])
  }

  getVisibleNavItems(): NavItem[] {
    const isAdmin = Number(this.userModel.admin) === 1;
    return this.navItems.filter((item) => !item.adminOnly || isAdmin);
  }

  getDisplayName(): string {
    if (this.userModel.username.trim().length > 0) {
      return this.userModel.username;
    }

    if (this.userModel.email.trim().length > 0) {
      return this.userModel.email;
    }

    return 'Musikkorps Konto';
  }

  getSubtitle(): string {
    const isAdmin = Number(this.userModel.admin) === 1;
    const role = isAdmin ? 'Administrator' : 'Mitglied';

    if (this.userModel.instrument.trim().length > 0) {
      return `${role} · ${this.userModel.instrument}`;
    }

    return role;
  }

  getInitials(): string {
    const baseText = this.userModel.username.trim().length > 0
      ? this.userModel.username.trim()
      : this.userModel.email.trim();

    if (baseText.length === 0) {
      return 'MK';
    }

    const parts = baseText.split(/\s+/).filter((part) => part.length > 0);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private loadUser(): void {
    const usersCollection = collection(this.firestore, 'users');
    collectionData(usersCollection).subscribe((users) => {
      for (const userModel of users) {
        if (userModel['id'] !== this.currentUserId) {
          continue;
        }

        this.userModel = {
          id: userModel['id'],
          username: userModel['username'],
          email: userModel['email'],
          fcmToken: userModel['fcmToken'],
          admin: userModel['admin'],
          instrument: userModel['instrument'],
          chairID: userModel['chairID'],
          defaultPromise: userModel['defaultPromise']
        };
        break;
      }
    });
  }

}
