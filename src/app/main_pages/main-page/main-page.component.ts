import { Component, OnInit } from '@angular/core';
import { Firestore, collection, addDoc, collectionData } from '@angular/fire/firestore';
import { Router, RouterLink } from '@angular/router';
import { Auth, getAuth, user, signInWithEmailAndPassword, User } from '@angular/fire/auth';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent implements OnInit{

  constructor(private firestore:Firestore, private router:Router) {  }
  
  ngOnInit(): void {
    getAuth().onAuthStateChanged(() => {
      if(getAuth().currentUser == null)
        this.router.navigate(['login'])
    })
  }

 }
