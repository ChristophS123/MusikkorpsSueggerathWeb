import { Component, OnInit } from '@angular/core';
import { Firestore, collectionData, docData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { collection, doc, setDoc } from 'firebase/firestore';

interface DrinkOrder {
  id: string;
  userId: string;
  userName: string;
  drinkName: string;
  createdAt: number;
}

interface DrinkSummary {
  name: string;
  count: number;
  isCustom: boolean;
}

@Component({
  selector: 'app-voting-page',
  templateUrl: './voting-page.component.html',
  styleUrls: ['./voting-page.component.scss']
})
export class VotingPageComponent implements OnInit {

  readonly predefinedDrinks:string[] = [
    'Wasser',
    'Wasser (Still)',
    'Fanta',
    'Cola',
    'Cola Zero',
    'Bier',
    'Alkoholfreies Bier',
    'Radler',
    'Alkoholfreies Radler'
  ];

  readonly skeletonItems:number[] = [1, 2, 3, 4, 5, 6];

  currentUserId:string = '';
  currentUserName:string = 'Mitglied';
  currentUserEmail:string = '';
  orders:DrinkOrder[] = [];
  customDrinkName:string = '';
  isLoading:boolean = true;
  isSubmitting:boolean = false;
  isResetting:boolean = false;
  showResetConfirmation:boolean = false;
  statusMessage:string = '';
  statusType:'success' | 'error' | 'info' | '' = '';

  constructor(private router:Router, private firestore:Firestore, private auth:Auth) {
  }

  ngOnInit(): void {
    this.loadRound();

    this.auth.onAuthStateChanged((user) => {
      if (user == null) {
        this.currentUserId = '';
        this.currentUserName = 'Mitglied';
        this.currentUserEmail = '';
        return;
      }

      this.currentUserId = user.uid;
      this.currentUserEmail = user.email ?? '';
      this.currentUserName = user.displayName?.trim().length ? user.displayName : (user.email ?? 'Mitglied');
      this.loadCurrentUserName();
    });
  }

  onBackPressed() {
    this.router.navigate(['main']);
   }

  async addDrink(drinkName:string): Promise<void> {
    if (this.currentUserId.length === 0 || this.isSubmitting) {
      this.statusType = 'error';
      this.statusMessage = 'Bitte zuerst mit einem Benutzerkonto anmelden.';
      return;
    }

    const normalizedDrinkName = drinkName.trim();
    if (normalizedDrinkName.length === 0) {
      this.statusType = 'error';
      this.statusMessage = 'Bitte ein gueltiges Getraenk auswaehlen.';
      return;
    }

    this.isSubmitting = true;
    this.statusMessage = '';
    this.statusType = '';

    try {
      const nextOrders: DrinkOrder[] = [
        ...this.orders,
        {
          id: `${this.currentUserId}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
          userId: this.currentUserId,
          userName: this.getDisplayUserName(),
          drinkName: normalizedDrinkName,
          createdAt: Date.now()
        }
      ];

      await this.saveRound(nextOrders);
      this.statusType = 'success';
      this.statusMessage = `${normalizedDrinkName} wurde zur Runde hinzugefuegt.`;
    } catch (error) {
      console.error(error);
      this.statusType = 'error';
      this.statusMessage = 'Das Getraenk konnte nicht hinzugefuegt werden.';
    } finally {
      this.isSubmitting = false;
    }
  }

  async addCustomDrink(): Promise<void> {
    const customDrink = this.customDrinkName.trim();
    if (customDrink.length === 0) {
      this.statusType = 'error';
      this.statusMessage = 'Bitte zuerst ein eigenes Getraenk eingeben.';
      return;
    }

    await this.addDrink(customDrink);
    if (this.statusType === 'success') {
      this.customDrinkName = '';
    }
  }

  async removeOrder(orderId:string): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.statusMessage = '';
    this.statusType = '';

    try {
      const nextOrders = this.orders.filter((order) => order.id !== orderId);
      await this.saveRound(nextOrders);
      this.statusType = 'info';
      this.statusMessage = 'Ein Getraenk wurde aus deiner Runde entfernt.';
    } catch (error) {
      console.error(error);
      this.statusType = 'error';
      this.statusMessage = 'Das Getraenk konnte nicht entfernt werden.';
    } finally {
      this.isSubmitting = false;
    }
  }

  openResetConfirmation(): void {
    this.showResetConfirmation = true;
  }

  closeResetConfirmation(): void {
    this.showResetConfirmation = false;
  }

  async resetRound(): Promise<void> {
    if (this.isResetting) {
      return;
    }

    this.isResetting = true;
    this.statusMessage = '';
    this.statusType = '';

    try {
      await this.saveRound([]);
      this.showResetConfirmation = false;
      this.statusType = 'success';
      this.statusMessage = 'Die Runde wurde komplett zurueckgesetzt.';
    } catch (error) {
      console.error(error);
      this.statusType = 'error';
      this.statusMessage = 'Die Runde konnte nicht zurueckgesetzt werden.';
    } finally {
      this.isResetting = false;
    }
  }

  getDrinkSummaries(): DrinkSummary[] {
    const counts = new Map<string, number>();

    for (const drink of this.predefinedDrinks) {
      counts.set(drink, 0);
    }

    for (const order of this.orders) {
      counts.set(order.drinkName, (counts.get(order.drinkName) ?? 0) + 1);
    }

    const summaries: DrinkSummary[] = Array.from(counts.entries())
      .filter(([name, count]) => count > 0 || this.predefinedDrinks.includes(name))
      .map(([name, count]) => ({
        name,
        count,
        isCustom: !this.predefinedDrinks.includes(name)
      }));

    const predefinedSummaries = summaries.filter((summary) => !summary.isCustom);
    const customSummaries = summaries
      .filter((summary) => summary.isCustom && summary.count > 0)
      .sort((firstSummary, secondSummary) => secondSummary.count - firstSummary.count || firstSummary.name.localeCompare(secondSummary.name, 'de'));

    return [
      ...predefinedSummaries,
      ...customSummaries
    ];
  }

  getMyOrders(): DrinkOrder[] {
    return this.orders
      .filter((order) => order.userId === this.currentUserId)
      .sort((firstOrder, secondOrder) => secondOrder.createdAt - firstOrder.createdAt);
  }

  getTotalDrinkCountLabel(): string {
    return `${this.orders.length} Getraenk${this.orders.length === 1 ? '' : 'e'} insgesamt`;
  }

  getUniqueDrinkCountLabel(): string {
    const uniqueCount = this.orders.reduce((drinkNames, order) => drinkNames.add(order.drinkName), new Set<string>()).size;
    return `${uniqueCount} Sorte${uniqueCount === 1 ? '' : 'n'} bestellt`;
  }

  private loadRound(): void {
    const roundDocument = doc(this.firestore, 'drink-rounds', 'current-round');

    docData(roundDocument).subscribe((roundData) => {
      const orderModels = Array.isArray(roundData?.['orders']) ? roundData['orders'] : [];
      this.orders = orderModels
        .filter((orderModel) => typeof orderModel === 'object' && orderModel !== null)
        .map((orderModel) => ({
          id: String(orderModel['id'] ?? ''),
          userId: String(orderModel['userId'] ?? ''),
          userName: String(orderModel['userName'] ?? 'Mitglied'),
          drinkName: String(orderModel['drinkName'] ?? ''),
          createdAt: Number(orderModel['createdAt'] ?? 0)
        }))
        .filter((order) => order.id.length > 0 && order.drinkName.length > 0);
      this.isLoading = false;
    });
  }

  private loadCurrentUserName(): void {
    const usersCollection = collection(this.firestore, 'users');
    collectionData(usersCollection).subscribe((users) => {
      for (const userModel of users) {
        if (userModel['id'] !== this.currentUserId) {
          continue;
        }

        const username = String(userModel['username'] ?? '').trim();
        if (username.length > 0) {
          this.currentUserName = username;
        }
        break;
      }
    });
  }

  private getDisplayUserName(): string {
    if (this.currentUserName.trim().length > 0) {
      return this.currentUserName.trim();
    }

    if (this.currentUserEmail.trim().length > 0) {
      return this.currentUserEmail.trim();
    }

    return 'Mitglied';
  }

  private async saveRound(orders: DrinkOrder[]): Promise<void> {
    const roundDocument = doc(this.firestore, 'drink-rounds', 'current-round');
    await setDoc(roundDocument, {
      id: 'current-round',
      orders,
      updatedAt: Date.now()
    });
  }

}