import { Component, OnInit } from '@angular/core';
import { Firestore, collection, addDoc, collectionData } from '@angular/fire/firestore';
import { Router, RouterLink } from '@angular/router';
import { Auth, getAuth, user, signInWithEmailAndPassword } from '@angular/fire/auth';
import { FirebaseApp } from '@angular/fire/app';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {

  constructor(private firestore:Firestore, private router:Router) {  }

  ngOnInit(): void {
    getAuth().onAuthStateChanged(() => {
      if(getAuth().currentUser != null)
        this.router.navigate(['main'])
    })
  }

  submitLoginData(data:any) {
     const userCollection = collection(this.firestore, "users");
    collectionData(userCollection).subscribe((collection) => {
      console.log(collection);
      signInWithEmailAndPassword(getAuth(), data.value['email'], data.value['password']).then((user) => {
        this.router.navigate(['/main']);
      }).catch(() => {
        
      })

    })
  }

}
