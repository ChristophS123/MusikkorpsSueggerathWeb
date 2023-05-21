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
    if(!this.isValidateForm(data)) {
      alert('Bitte fülle alle Felder aus.')
      return
    }
    if(data.value['password'] != data.value['repeat']) {
      alert('Die Passwörter stimmen nicht überein.')
      return
    }
    createUserWithEmailAndPassword(getAuth(), data.value['email'], data.value['password']).then(() => {
      signInWithEmailAndPassword(getAuth(), data.value['email'], data.value['password']).then((user) => {
        this.createUserInFirestore(data, user); 
      })
    })
  }
  createUserInFirestore(data: any, user: UserCredential) {
    let userModel:User = {
      id: user.user.uid,
      username: data.value['name'],
      email: data.value['email'],
      fcmToken: "",
      admin: 0,
      instrument: "",
      defaultPromise: false,
      chairID: 0
    }
    const usersCollection = collection(this.firestore, 'users');
    setDoc(doc(usersCollection, userModel.id), userModel).then(() => {
      this.router.navigate(['/main']);
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
