// src/api/imageScan.ts — "Görsel Tara" (10 Kasım 2026 kullanıcı isteği,
// Behçet) mobil karşılığı. Web'deki lib/api.ts'teki imageScanApi ile birebir
// aynı davranış; tek fark görsel gönderimi: web'de File nesnesi var, React
// Native'de FormData'ya {uri, name, type} şeklinde (ImagePicker sonucundan)
// ekleniyor — studyNotes.ts::uploadImages'daki AYNI RN multipart deseni.
import { api } from './client';
import type { ImageScanResult } from './types';

export interface PickedScanImage {
  uri: string;
  name: string;
  type: string;
}

export const imageScanApi = {
  scan: async (image: PickedScanImage): Promise<ImageScanResult> => {
    const form = new FormData();
    form.append('file', { uri: image.uri, name: image.name, type: image.type } as unknown as Blob);
    const res = await api.post<ImageScanResult>('/image-scan', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
