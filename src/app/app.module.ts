import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RouterModule, Routes } from '@angular/router'; 
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { MainPageComponent } from './main_pages/main-page/main-page.component';
import { LoginPageComponent } from './main_pages/login-page/login-page.component';
import { SignupPageComponent } from './main_pages/signup-page/signup-page.component';
import { MainNavComponent } from './components/main-nav/main-nav.component';
import { TrainingPageComponent } from './main_pages/training-page/training-page.component';
import { EventItemComponent } from './components/event-item/event-item.component'

import { APP_BASE_HREF } from '@angular/common';
import { VotingPageComponent } from './main_pages/voting-page/voting-page.component';
import { VotingItemComponent } from './components/voting-item/voting-item.component';
import { RecentEventsComponent } from './main_pages/recent-events/recent-events.component';
import { OrganisationPageComponent } from './main_pages/organisation-page/organisation-page.component';
import { EventDetailPageComponent } from './main_pages/event-detail-page/event-detail-page.component';
import { EventDetailsUserItemComponent } from './components/event-details-user-item/event-details-user-item.component';
import { CreateEventPageComponent } from './main_pages/create-event-page/create-event-page.component';
import { RehearsalRoomEditorComponent } from './main_pages/rehearsal-room-editor/rehearsal-room-editor.component';
import { AccountManagementPageComponent } from './main_pages/account-management-page/account-management-page.component';
import { SongVotingPageComponent } from './main_pages/song-voting-page/song-voting-page.component';
import { RehearsalPiecesPageComponent } from './main_pages/rehearsal-pieces-page/rehearsal-pieces-page.component';
import { HttpClientModule } from '@angular/common/http';

const allRouts:Routes = [
  { path: 'anmelden', component: LoginPageComponent },
  { path: 'main', component: MainPageComponent },
  { path: 'registrieren', component: SignupPageComponent },
  { path: 'proben', component: TrainingPageComponent },
  { path: 'proben/:eventID/stuecke', component: RehearsalPiecesPageComponent },
  { path: 'sonstige-termine/:eventID/stuecke', component: RehearsalPiecesPageComponent },
  { path: 'abstimmungen', component: VotingPageComponent },
  { path: 'lied-abstimmungen', component: SongVotingPageComponent },
  { path: 'sonstige-termine', component: RecentEventsComponent },
  { path: 'organisation/accounts', component: AccountManagementPageComponent },
  { path: 'organisation', component: OrganisationPageComponent },
  { path: 'event-details/:eventID', component: EventDetailPageComponent },
  { path: 'termin-hinzufuegen', component: CreateEventPageComponent },
  { path: 'probenraum-editor', component: RehearsalRoomEditorComponent },
  { path: '**', component: LoginPageComponent } // TODO: PageNotFound
];

//TODOS
// Sicherheit, dass nicht jeder auf jede seite kommt

@NgModule({
  declarations: [
    AppComponent,
    MainPageComponent,
    LoginPageComponent,
    SignupPageComponent,
    MainNavComponent,
    TrainingPageComponent,
    EventItemComponent,
    VotingPageComponent,
    VotingItemComponent,
    RecentEventsComponent,
    OrganisationPageComponent,
    EventDetailPageComponent,
    EventDetailsUserItemComponent,
    CreateEventPageComponent,
    RehearsalRoomEditorComponent,
    AccountManagementPageComponent,
    SongVotingPageComponent,
    RehearsalPiecesPageComponent,
  ],
  imports: [
    RouterModule.forRoot(allRouts),
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    HttpClientModule,
  ],
  providers: [
    { provide: APP_BASE_HREF, useValue: '/' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
