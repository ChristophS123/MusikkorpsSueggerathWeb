import { Injectable } from '@angular/core';
import { Firestore, docData } from '@angular/fire/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { Observable, map, shareReplay } from 'rxjs';
import { NewsBanner, createEmptyNewsBanner } from '../models/news-banner';

@Injectable({
  providedIn: 'root'
})
export class NewsBannerService {

  private readonly documentPath: [string, string] = ['app-metadata', 'news-banner'];
  private newsBanner$?: Observable<NewsBanner>;

  constructor(private firestore: Firestore) { }

  getNewsBanner(): Observable<NewsBanner> {
    if (!this.newsBanner$) {
      this.newsBanner$ = docData(doc(this.firestore, ...this.documentPath)).pipe(
        map((bannerModel) => this.normalizeBanner(bannerModel)),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }

    return this.newsBanner$;
  }

  async saveNewsBanner(banner: Pick<NewsBanner, 'title' | 'description' | 'enabled'>): Promise<void> {
    const title = banner.title.trim();
    const description = banner.description.trim();

    await setDoc(doc(this.firestore, ...this.documentPath), {
      id: 'news-banner',
      title,
      description,
      enabled: Boolean(banner.enabled),
      updatedAt: Date.now()
    });
  }

  private normalizeBanner(bannerModel: { [key: string]: unknown } | undefined): NewsBanner {
    if (!bannerModel) {
      return createEmptyNewsBanner();
    }

    return {
      id: 'news-banner',
      title: String(bannerModel['title'] ?? '').trim(),
      description: String(bannerModel['description'] ?? '').trim(),
      enabled: Boolean(bannerModel['enabled']),
      updatedAt: Number(bannerModel['updatedAt'] ?? 0)
    };
  }
}
