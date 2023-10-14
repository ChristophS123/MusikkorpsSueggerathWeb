import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { getAuth, signInWithEmailAndPassword } from '@angular/fire/auth';

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
    if(data.value['email'] == 'gast123' && data.value['password'] == 'gast123') {
      console.log("test");
      this.router.navigate(['/main']);
      return;
    }
     const userCollection = collection(this.firestore, "users");
    collectionData(userCollection).subscribe((collection) => {
      console.log(collection);
      signInWithEmailAndPassword(getAuth(), data.value['email'], data.value['password']).then((user) => {
        this.router.navigate(['/main']);
      }).catch((error) => {
      })

    })
  }

}
