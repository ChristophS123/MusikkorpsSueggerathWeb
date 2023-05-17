import { Component, OnInit } from '@angular/core';
import { Firestore, collection, addDoc, collectionData } from '@angular/fire/firestore';
import { Router, RouterLink } from '@angular/router';
import { Auth, getAuth, user, signInWithEmailAndPassword, User } from '@angular/fire/auth';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent { 

  constructor(private router:Router) {  }

  signOut() {
    if(getAuth().currentUser != null) {
      getAuth().signOut();
      this.router.navigate(['/anmelden']);
    }
  }

  openTrainingPage() {
    console.log('test')
    this.router.navigate(['/proben'])
  }

 }
