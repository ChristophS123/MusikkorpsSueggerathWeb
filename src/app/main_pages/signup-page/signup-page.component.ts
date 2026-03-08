import { Component } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { NgForm } from '@angular/forms';
import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { User } from 'src/app/models/user';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup-page',
  templateUrl: './signup-page.component.html',
  styleUrls: ['./signup-page.component.scss']
})
export class SignupPageComponent {

  isSubmitting:boolean = false;
  signupErrorMessage:string = '';
  signupSuccessMessage:string = '';

  constructor(private firestore:Firestore, private router:Router, private auth:Auth) {  }

  async submitSignUpData(data: NgForm): Promise<void> {
    this.clearMessages();

    const name = String(data.value['name'] ?? '').trim();
    const email = String(data.value['email'] ?? '').trim().toLowerCase();
    const password = String(data.value['password'] ?? '');
    const repeatPassword = String(data.value['repeat'] ?? '');

    if (!this.isValidateForm(name, email, password, repeatPassword)) {
      this.signupErrorMessage = 'Bitte fuelle alle Felder korrekt aus.';
      return;
    }

    if (password !== repeatPassword) {
      this.signupErrorMessage = 'Die Passwoerter stimmen nicht ueberein.';
      return;
    }

    if (password.length < 6) {
      this.signupErrorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      return;
    }

    this.isSubmitting = true;

    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      await this.createUserInFirestore(name, email, userCredential);
      this.signupSuccessMessage = 'Dein Konto wurde erfolgreich erstellt.';
      data.resetForm();
      this.router.navigate(['/anmelden']);
    } catch (error: unknown) {
      this.signupErrorMessage = this.getSignupErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private async createUserInFirestore(name:string, email:string, user: UserCredential): Promise<void> {
    let userModel:User = {
      id: user.user.uid,
      username: name,
      email: email,
      fcmToken: "",
      admin: 0,
      instrument: "",
      defaultPromise: false,
      chairID: 0
    }
    const usersCollection = collection(this.firestore, 'users');
    await setDoc(doc(usersCollection, userModel.id), userModel)
  }

  private isValidateForm(name:string, email:string, password:string, repeatPassword:string):boolean {
    if(name.length === 0)
      return false;
    if(email.length === 0)
      return false;
    if(password.length === 0)
      return false;
    if(repeatPassword.length === 0)
      return false;
    return true
  }

  private clearMessages(): void {
    this.signupErrorMessage = '';
    this.signupSuccessMessage = '';
  }

  private getSignupErrorMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) {
      return 'Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut.';
    }

    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Zu dieser E-Mail-Adresse existiert bereits ein Konto.';
      case 'auth/invalid-email':
        return 'Die E-Mail-Adresse ist nicht gueltig.';
      case 'auth/weak-password':
        return 'Das Passwort ist zu schwach. Bitte waehle ein sicheres Passwort.';
      case 'auth/network-request-failed':
        return 'Netzwerkfehler. Bitte pruefe deine Internetverbindung.';
      case 'auth/operation-not-allowed':
        return 'Die Registrierung per E-Mail ist in Firebase derzeit nicht aktiviert.';
      default:
        return 'Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut.';
    }
  }

}
