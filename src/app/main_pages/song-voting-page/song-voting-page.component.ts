import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { SongVotingOption } from 'src/app/models/song-voting-option';

@Component({
  selector: 'app-song-voting-page',
  templateUrl: './song-voting-page.component.html',
  styleUrls: ['./song-voting-page.component.scss']
})
export class SongVotingPageComponent implements OnInit {

  currentUserId:string = '';
  songOptions:SongVotingOption[] = [];
  isLoading:boolean = true;
  isSubmitting:boolean = false;
  statusMessage:string = '';
  statusType:'success' | 'error' | 'info' | '' = '';
  readonly skeletonItems:number[] = [1, 2, 3, 4];

  constructor(private router:Router, private firestore:Firestore, private auth:Auth) {
  }

  ngOnInit(): void {
    this.auth.onAuthStateChanged((user) => {
      this.currentUserId = user?.uid ?? '';
    });

    this.loadSongOptions();
  }

  onBackPressed() {
    this.router.navigate(['main']);
  }

  async voteForSong(songOption: SongVotingOption, voteType: 'pro' | 'contra'): Promise<void> {
    if (this.currentUserId.length === 0 || this.isSubmitting) {
      this.statusType = 'error';
      this.statusMessage = 'Bitte zuerst mit einem Benutzerkonto anmelden.';
      return;
    }

    this.isSubmitting = true;
    this.statusMessage = '';
    this.statusType = '';

    try {
      const hasProVote = songOption.proVotes.includes(this.currentUserId);
      const hasContraVote = songOption.contraVotes.includes(this.currentUserId);

      let nextProVotes = songOption.proVotes.filter((vote) => vote !== this.currentUserId);
      let nextContraVotes = songOption.contraVotes.filter((vote) => vote !== this.currentUserId);

      if (voteType === 'pro' && !hasProVote) {
        nextProVotes = [...nextProVotes, this.currentUserId];
      }

      if (voteType === 'contra' && !hasContraVote) {
        nextContraVotes = [...nextContraVotes, this.currentUserId];
      }

      await updateDoc(doc(collection(this.firestore, 'song-votings'), songOption.id), {
        proVotes: nextProVotes,
        contraVotes: nextContraVotes
      });

      this.statusType = 'success';
      if ((voteType === 'pro' && hasProVote) || (voteType === 'contra' && hasContraVote)) {
        this.statusMessage = 'Deine Stimme wurde entfernt.';
      } else {
        this.statusMessage = voteType === 'pro'
          ? `Du hast bei ${songOption.name} dafuer gestimmt.`
          : `Du hast bei ${songOption.name} dagegen gestimmt.`;
      }
    } catch (error) {
      console.error(error);
      this.statusType = 'error';
      this.statusMessage = 'Die Stimme konnte nicht gespeichert werden.';
    } finally {
      this.isSubmitting = false;
    }
  }

  hasProVote(songOption: SongVotingOption): boolean {
    return this.currentUserId.length > 0 && songOption.proVotes.includes(this.currentUserId);
  }

  hasContraVote(songOption: SongVotingOption): boolean {
    return this.currentUserId.length > 0 && songOption.contraVotes.includes(this.currentUserId);
  }

  getVoteBadgeLabel(songOption: SongVotingOption): string {
    if (this.hasProVote(songOption)) {
      return 'Du hast dafuer abgestimmt';
    }

    if (this.hasContraVote(songOption)) {
      return 'Du hast dagegen abgestimmt';
    }

    return 'Noch keine Stimme von dir';
  }

  getCurrentVoteLabel(): string {
    const totalOwnVotes = this.songOptions.reduce((voteCount, songOption) => {
      const hasAnyVote = this.hasProVote(songOption) || this.hasContraVote(songOption);
      return voteCount + (hasAnyVote ? 1 : 0);
    }, 0);

    if (totalOwnVotes === 0) {
      return 'Du hast bisher noch bei keinem Lied abgestimmt.';
    }

    return `${totalOwnVotes} Lied${totalOwnVotes === 1 ? '' : 'er'} von dir bewertet`;
  }

  getTotalVotesLabel(): string {
    const totalVotes = this.songOptions.reduce((voteCount, songOption) => voteCount + songOption.proVotes.length + songOption.contraVotes.length, 0);
    return `${totalVotes} Stimme${totalVotes === 1 ? '' : 'n'} insgesamt`;
  }

  getLeadingSongLabel(): string {
    if (this.songOptions.length === 0) {
      return 'Noch keine Lieder in der Abstimmung.';
    }

    const sortedOptions = [...this.songOptions].sort((firstOption, secondOption) => {
      const firstScore = firstOption.proVotes.length - firstOption.contraVotes.length;
      const secondScore = secondOption.proVotes.length - secondOption.contraVotes.length;
      if (secondScore !== firstScore) {
        return secondScore - firstScore;
      }

      return firstOption.name.localeCompare(secondOption.name, 'de');
    });

    const leadingSong = sortedOptions[0];
    const score = leadingSong.proVotes.length - leadingSong.contraVotes.length;
    return `${leadingSong.name} hat aktuell einen Saldo von ${score}`;
  }

  private loadSongOptions(): void {
    const songVotingsCollection = collection(this.firestore, 'song-votings');
    collectionData(songVotingsCollection).subscribe((songVotingModels) => {
      this.songOptions = songVotingModels
        .map((songVotingModel) => ({
          id: String(songVotingModel['id'] ?? ''),
          name: String(songVotingModel['name'] ?? '').trim(),
          proVotes: Array.isArray(songVotingModel['proVotes'])
            ? songVotingModel['proVotes'].map((vote) => String(vote))
            : Array.isArray(songVotingModel['votes'])
              ? songVotingModel['votes'].map((vote) => String(vote))
              : [],
          contraVotes: Array.isArray(songVotingModel['contraVotes'])
            ? songVotingModel['contraVotes'].map((vote) => String(vote))
            : []
        }))
        .filter((songOption) => songOption.id.length > 0 && songOption.name.length > 0)
        .sort((firstOption, secondOption) => {
          const firstScore = firstOption.proVotes.length - firstOption.contraVotes.length;
          const secondScore = secondOption.proVotes.length - secondOption.contraVotes.length;
          if (secondScore !== firstScore) {
            return secondScore - firstScore;
          }

          return firstOption.name.localeCompare(secondOption.name, 'de');
        });

      this.isLoading = false;
    });
  }

}