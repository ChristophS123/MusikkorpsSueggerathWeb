import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { environment } from 'src/environments/environment';

export type EventReminderMode = 'test' | 'all';

export interface EventReminderResult {
  sent: number;
  skippedWithoutEmail: number;
  totalUnvoted: number;
}

@Injectable({
  providedIn: 'root'
})
export class EventReminderService {

  constructor(private auth: Auth) { }

  async remindUnvotedUsers(
    eventId: string,
    mode: EventReminderMode = 'test'
  ): Promise<EventReminderResult> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('Bitte zuerst anmelden.');
    }

    const idToken = await currentUser.getIdToken();
    const apiBaseUrl = String(environment.apiBaseUrl || '').replace(/\/$/, '');
    const endpoint = `${apiBaseUrl}/api/remind-unvoted`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ eventId, mode })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(payload?.error || `API-Fehler (${response.status})`));
    }

    return {
      sent: Number(payload?.sent ?? 0),
      skippedWithoutEmail: Number(payload?.skippedWithoutEmail ?? 0),
      totalUnvoted: Number(payload?.totalUnvoted ?? 0)
    };
  }
}
