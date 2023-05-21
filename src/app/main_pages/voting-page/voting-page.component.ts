import { Component } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { collection } from 'firebase/firestore';
import { Voting } from 'src/app/models/voting';

@Component({
  selector: 'app-voting-page',
  templateUrl: './voting-page.component.html',
  styleUrls: ['./voting-page.component.scss']
})
export class VotingPageComponent {

  votings:Voting[] = []

  constructor(private router:Router, private firestore:Firestore) { 
    this.loadVotings()
   }

  onBackPressed() {
    this.router.navigate(['main']);
   }

   loadVotings() {
    const votingCollection = collection(this.firestore, 'votings');
    collectionData(votingCollection).subscribe((val) => {
      this.votings = []
      for(let i = 0; i < val.length; i++) {
        let votingModel = val[i];
        let voting:Voting = {
          id: votingModel['id'],
          name: votingModel['name'],
          liked: votingModel['liked']
        }
        this.votings.push(voting);
      }
      console.log(this.votings)
    })
   }

}