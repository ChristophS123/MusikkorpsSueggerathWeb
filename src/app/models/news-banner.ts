export interface NewsBanner {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  updatedAt: number;
}

export function createEmptyNewsBanner(): NewsBanner {
  return {
    id: 'news-banner',
    title: '',
    description: '',
    enabled: false,
    updatedAt: 0
  };
}
