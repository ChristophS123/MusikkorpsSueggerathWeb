import { Component } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Route, Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-organisation-page',
  templateUrl: './organisation-page.component.html',
  styleUrls: ['./organisation-page.component.scss']
})
export class OrganisationPageComponent {

  user:string|undefined = ''
  userModel:User = {
    id: '',
    username: '',
    email: '',
    admin: 0,
    chairID: 0,
    defaultPromise: false,
    fcmToken: '',
    instrument: ''
  }

  constructor(private router:Router, private firestore:Firestore) { 
    this.user = getAuth().currentUser?.uid
    this.loadUser()
   }

  openCreateEventPage() {
    this.router.navigate(['termin-hinzufuegen'])
  }

   loadUser() {
    const usersCollection = collection(this.firestore, 'users');
    collectionData(usersCollection).subscribe((val) => {
      for(let i = 0; i < val.length; i++) {
        let mUserModel = val[i];
        if(this.user == undefined)
          continue
        if(mUserModel['id'] == this.user) {
          this.userModel = {
            id: mUserModel['id'],
            username: mUserModel['username'],
            email: mUserModel['email'],
            fcmToken: mUserModel['fcmToken'],
            admin: mUserModel['admin'],
            instrument: mUserModel['instrument'],
            chairID: mUserModel['chairID'],
            defaultPromise: mUserModel['defaultPromise']
          }
          if(this.userModel.admin == 0) {
            this.router.navigate(['main'])
          }
          break
        }
      }
    })
   }

  onBackPressed() {
    this.router.navigate(['main']);
   }

}
