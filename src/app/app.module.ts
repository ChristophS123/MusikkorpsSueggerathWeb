import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RouterModule, Routes } from '@angular/router'; 
import { AngularFireModule } from '@angular/fire/compat';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { MainPageComponent } from './main_pages/main-page/main-page.component';
import { LoginPageComponent } from './main_pages/login-page/login-page.component';
import { SignupPageComponent } from './main_pages/signup-page/signup-page.component';
import { MainNavComponent } from './components/main-nav/main-nav.component';
import { TrainingPageComponent } from './main_pages/training-page/training-page.component';
import { EventItemComponent } from './components/event-item/event-item.component'

import { APP_BASE_HREF } from '@angular/common';

NgModule({
  // ...
  providers: [{ provide: APP_BASE_HREF, useValue: '/' }]
})

const allRouts:Routes = [
  { path: 'anmelden', component: LoginPageComponent },
  { path: 'main', component: MainPageComponent },
  { path: 'registrieren', component: SignupPageComponent },
  { path: 'proben', component: TrainingPageComponent },
];

// https://www.youtube.com/watch?v=HXSqKW4JCr4 : 11:39 // Angular

@NgModule({
  declarations: [
    AppComponent,
    MainPageComponent,
    LoginPageComponent,
    SignupPageComponent,
    MainNavComponent,
    TrainingPageComponent,
    EventItemComponent,
  ],
  imports: [
    RouterModule.forRoot(allRouts),
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()) 
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
