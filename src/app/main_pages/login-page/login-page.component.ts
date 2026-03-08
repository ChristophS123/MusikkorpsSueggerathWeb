import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { FirebaseError } from 'firebase/app';
import { collection } from 'firebase/firestore';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { User } from 'src/app/models/user';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {

  isSubmitting:boolean = false;
  isSendingResetEmail:boolean = false;
  loginErrorMessage:string = '';
  loginSuccessMessage:string = '';
  resetPasswordMessage:string = '';

  constructor(private router:Router, private auth:Auth, private firestore:Firestore) {  }

  ngOnInit(): void {
    this.auth.onAuthStateChanged(() => {
      if(this.auth.currentUser != null)
        this.router.navigate(['main'])
    })
  }

  submitLoginData(data: NgForm): void {
    this.clearMessages();

    const email = String(data.value['email'] ?? '').trim();
    const password = String(data.value['password'] ?? '');

    if (email.length === 0 || password.length === 0) {
      this.loginErrorMessage = 'Bitte gib deine E-Mail-Adresse und dein Passwort ein.';
      return;
    }

    this.isSubmitting = true;

    if(email === 'gast123' && password === 'gast123') {
      this.loginSuccessMessage = 'Gastzugang erfolgreich angemeldet.';
      this.isSubmitting = false;
      this.router.navigate(['/main']);
      return;
    }

    signInWithEmailAndPassword(this.auth, email, password).then(() => {
        this.loginSuccessMessage = 'Anmeldung erfolgreich.';
        this.router.navigate(['/main']);
      }).catch((error: unknown) => {
        this.loginErrorMessage = this.getLoginErrorMessage(error);
      }).finally(() => {
        this.isSubmitting = false;
      });
  }

  async sendResetPasswordEmail(data: NgForm): Promise<void> {
    this.resetPasswordMessage = '';
    this.loginErrorMessage = '';
    this.loginSuccessMessage = '';

    const email = String(data.value['email'] ?? '').trim().toLowerCase();
    if (email.length === 0) {
      this.loginErrorMessage = 'Bitte gib zuerst deine E-Mail-Adresse ein.';
      return;
    }

    this.isSendingResetEmail = true;
    this.auth.languageCode = 'de';

    try {
      const usersCollection = collection(this.firestore, 'users');
      const users = await firstValueFrom(collectionData(usersCollection));
      const hasMatchingUser = users.some((userModel) => {
        const user = userModel as Partial<User>;
        return typeof user.email === 'string' && user.email.trim().toLowerCase() === email;
      });

      if (!hasMatchingUser) {
        this.loginErrorMessage = 'Zu dieser E-Mail-Adresse wurde kein Konto gefunden.';
        return;
      }

      await sendPasswordResetEmail(this.auth, email);
      this.resetPasswordMessage = 'Die E-Mail zum Zuruecksetzen des Passworts wurde versendet.';
    } catch (error: unknown) {
      this.loginErrorMessage = this.getResetPasswordErrorMessage(error);
    } finally {
      this.isSendingResetEmail = false;
    }
  }

  private clearMessages(): void {
    this.loginErrorMessage = '';
    this.loginSuccessMessage = '';
    this.resetPasswordMessage = '';
  }

  private getLoginErrorMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.';
    }

    switch (error.code) {
      case 'auth/invalid-email':
        return 'Die E-Mail-Adresse ist nicht gueltig.';
      case 'auth/user-disabled':
        return 'Dieses Benutzerkonto wurde deaktiviert.';
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        return 'E-Mail-Adresse oder Passwort sind nicht korrekt.';
      case 'auth/wrong-password':
        return 'E-Mail-Adresse oder Passwort sind nicht korrekt.';
      case 'auth/too-many-requests':
        return 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte warte kurz und versuche es dann erneut.';
      case 'auth/network-request-failed':
        return 'Netzwerkfehler. Bitte pruefe deine Internetverbindung.';
      default:
        return 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.';
    }
  }

  private getResetPasswordErrorMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return 'Die Reset-E-Mail konnte nicht versendet werden.';
    }

    switch (error.code) {
      case 'auth/invalid-email':
        return 'Die E-Mail-Adresse ist nicht gueltig.';
      case 'auth/user-not-found':
        return 'Zu dieser E-Mail-Adresse wurde kein Konto gefunden.';
      case 'auth/operation-not-allowed':
        return 'Passwort-Reset ist in Firebase derzeit nicht aktiviert.';
      case 'auth/missing-email':
        return 'Bitte gib zuerst deine E-Mail-Adresse ein.';
      case 'auth/network-request-failed':
        return 'Netzwerkfehler. Bitte pruefe deine Internetverbindung.';
      case 'auth/too-many-requests':
        return 'Der Reset kann im Moment nicht ausgefuehrt werden. Bitte versuche es spaeter erneut.';
      default:
        return 'Die Reset-E-Mail konnte nicht versendet werden.';
    }
  }

}
