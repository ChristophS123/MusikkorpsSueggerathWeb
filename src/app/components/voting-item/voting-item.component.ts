import { Component, Input } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { getAuth } from 'firebase/auth';
import { Voting } from 'src/app/models/voting';
import { collection, doc, updateDoc, deleteDoc} from 'firebase/firestore';
import { User } from 'src/app/models/user';
import { Router } from '@angular/router';

@Component({
  selector: 'app-voting-item',
  templateUrl: './voting-item.component.html',
  styleUrls: ['./voting-item.component.scss']
})
export class VotingItemComponent { 

  user:string|undefined = '';
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

  @Input() voting:Voting = {
    id: '',
    name: 'Voting',
    liked: []
  }

  constructor(private firestore:Firestore, private router:Router) {
    this.user = getAuth().currentUser?.uid;
    this.loadUser()
  }

  deleteVotingItem() {
    const votingCollection = collection(this.firestore, 'votings');
    deleteDoc(doc(votingCollection, this.voting.id))
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
          break
        }
      }
    })
   }
  
  containsInLiked(): boolean {
    for(let i = 0; i < this.voting.liked.length; i++) {
      if(this.voting.liked[i] == this.user)
        return true;
    }
    return false
  }

  like() {
    if(this.user == undefined)
      return
    this.voting.liked.push(this.user)
    const votingCollection = collection(this.firestore, 'votings');
    updateDoc(doc(votingCollection, this.voting.id), "liked", this.voting.liked)
  }

  removeLike() {
    if(this.user == undefined)
      return
    let index:number = this.voting.liked.indexOf(this.user)
    this.voting.liked.splice(index, 1)
    const votingCollection = collection(this.firestore, 'votings');
    updateDoc(doc(votingCollection, this.voting.id), "liked", this.voting.liked)
  }

}

