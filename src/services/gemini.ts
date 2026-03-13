
export interface FileSearchStore {
  name: string;
  displayName?: string;
  createTime: string;
  updateTime: string;
}

export interface FileSearchDocument {
  name: string;
  displayName: string;
  mimeType: string;
  createTime: string;
  updateTime: string;
  customMetadata?: Record<string, string | number | boolean | object>;
}

export interface ListStoresResponse {
  fileSearchStores: FileSearchStore[];
  nextPageToken?: string;
}

export interface ListDocumentsResponse {
  documents: FileSearchDocument[];
  nextPageToken?: string;
}

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchWithError(path: string, options: RequestInit = {}) {
    const url = `${BASE_URL}/${path}${path.includes('?') ? '&' : '?'}key=${this.apiKey}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  async listStores(): Promise<ListStoresResponse> {
    return this.fetchWithError('fileSearchStores');
  }

  async listDocuments(storeName: string): Promise<ListDocumentsResponse> {
    // storeName is usually "fileSearchStores/id"
    return this.fetchWithError(`${storeName}/documents`);
  }

  async deleteDocument(documentName: string): Promise<void> {
    // documentName is "fileSearchStores/{storeId}/documents/{docId}"
    await this.fetchWithError(documentName, { method: 'DELETE' });
  }

  async deleteStore(storeName: string): Promise<void> {
    // storeName is "fileSearchStores/{storeId}"
    await this.fetchWithError(storeName, { method: 'DELETE' });
  }
}
