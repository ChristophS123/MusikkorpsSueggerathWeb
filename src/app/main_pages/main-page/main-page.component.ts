import { Component, OnInit } from '@angular/core';
import { Firestore, collection, addDoc, collectionData } from '@angular/fire/firestore';
import { Router, RouterLink } from '@angular/router';
import { Auth, getAuth, user, signInWithEmailAndPassword, User } from '@angular/fire/auth';

const orchesterWitze: string[] = [
  "Der Dirigent sagt zum Orchester: 'Spielt bitte diesmal in meinem Tempo – nicht in eurem.'",
  "Warum sitzen Saxophonisten immer so entspannt im Orchester? Weil sie wissen, dass sie erst in 120 Takten dran sind.",
  "Der Dirigent zum Schlagzeuger: 'Du musst nicht jedes Mal ein Solo spielen.' – Schlagzeuger: 'Ich nenne das musikalische Initiative.'",
  "Warum mögen Trompeter hohe Töne? Weil sie dann denken, sie wären wichtig.",
  "Was ist der Unterschied zwischen einer Trompete und einer Kreissäge? Die Kreissäge kann man leiser stellen.",
  "Der Dirigent: 'Wer spielt hier falsch?' – Die Klarinette: 'Ich nicht, ich improvisiere.'",
  "Warum hat der Posaunist immer einen langen Arm? Weil er ständig nach der richtigen Position sucht.",
  "Flötistin: 'Ich spiele heute ganz zart.' – Dirigent: 'Perfekt, dann hören wir dich genauso wie sonst.'",
  "Warum sitzen Schlagzeuger immer hinten im Orchester? Damit der Dirigent eine Chance hat, zu überleben.",
  "Der Dirigent unterbricht: 'Die Trompeten bitte etwas leiser.' – Trompete: 'Ich spiele schon pianissimo!'",
  "Warum sind Klarinettisten gute Detektive? Sie finden immer den falschen Ton.",
  "Was macht der Saxophonist während der Generalpause? Er zählt... und zählt... und zählt...",
  "Der Dirigent: 'Die Flöten bitte mehr Ausdruck!' – Flöte: 'Noch mehr Luft?'",
  "Warum hat der Posaunist immer ein Lächeln im Gesicht? Weil er keine Ahnung hat, in welchem Takt wir sind.",
  "Der Schlagzeuger fragt: 'Wann ist mein Einsatz?' – Dirigent: 'Wenn du mich am meisten erschreckst.'",
  "Warum spielen Trompeter immer so laut? Weil sie denken, Lautstärke ersetzt Talent.",
  "Der Dirigent ruft: 'Mehr Dynamik!' – Das Orchester: 'Meinen Sie laut oder sehr laut?'",
  "Warum lieben Saxophonisten Jazz? Weil falsche Töne dort Stil haben.",
  "Die Klarinette fragt den Dirigenten: 'War das zu laut?' – Dirigent: 'Nein, nur zu hörbar.'",
  "Der Dirigent am Ende der Probe: 'Sehr gut! Morgen spielen wir das gleiche Stück – diesmal aber zusammen.'"
];

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent implements OnInit{

  randomJoke:string = '';

  constructor(private firestore:Firestore, private router:Router) {  }
  
  ngOnInit(): void {
    this.randomJoke = orchesterWitze[Math.floor(Math.random() * orchesterWitze.length)];

    getAuth().onAuthStateChanged(() => {
      if(getAuth().currentUser == null)
        this.router.navigate(['login'])
    })
  }

 }
