import { Component } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { User } from 'src/app/models/user';
import { collection, addDoc, getDoc, doc, setDoc } from 'firebase/firestore';
import { Router } from '@angular/router';
import { getFirestore } from 'firebase/firestore';

@Component({
  selector: 'app-signup-page',
  templateUrl: './signup-page.component.html',
  styleUrls: ['./signup-page.component.scss']
})
export class SignupPageComponent {

  constructor(private firestore:Firestore, private router:Router) {  }

  submitSignUpData(data:any) {
    let name = data.value['name']
    let email = data.value['email']
    if(!this.isValidateForm(data)) {
      alert('Bitte fülle alle Felder aus.')
      return
    }
    if(data.value['password'] != data.value['repeat']) {
      alert('Die Passwörter stimmen nicht überein.')
      return
    }
    console.log("test")
    createUserWithEmailAndPassword(getAuth(), data.value['email'], data.value['password']).then((user) => {
      console.log(user);
      this.createUserInFirestore(name, email, user)
    }).catch((error) => {
      alert("Fehler bei Registrierung: " + error);
    })
  }
  createUserInFirestore(name:string, email:string, user: UserCredential) {
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
    setDoc(doc(usersCollection, userModel.id), userModel).then(() => {
      alert("Erfolgreich registriert.")
    }).catch((error) => {
      alert("Fehler bei Registrierung: " + error);
    })
  }

  

  isValidateForm(data:any):boolean {
    if(data.value['name'] == '')
      return false;
    if(data.value['email'] == '')
      return false;
    if(data.value['password'] == '')
      return false;
    if(data.value['repeat'] == '')
      return false;
    return true
  }

}
