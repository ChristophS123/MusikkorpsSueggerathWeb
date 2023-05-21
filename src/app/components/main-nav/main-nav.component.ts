import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth } from 'firebase/auth';
import { Location } from '@angular/common';
import { MainPageComponent } from 'src/app/main_pages/main-page/main-page.component';

@Component({
  selector: 'app-main-nav',
  templateUrl: './main-nav.component.html',
  styleUrls: ['./main-nav.component.scss']
})
export class MainNavComponent {

  constructor(private router:Router) {  }

  isNavOpen: boolean = false;

  toggleNav() {
    this.isNavOpen = !this.isNavOpen;
  }

  signOut() {
    getAuth().signOut();
    this.router.navigate(['/anmelden'])
    
  }

}
