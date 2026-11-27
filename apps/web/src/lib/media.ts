import type {
  AttachmentDTO,
  CompletedUploadDTO,
  PresignedUploadDTO,
} from '@voidlink/shared';
import { api } from './api';

export type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE' | 'FILE';

const MAX_IMAGE_EDGE = 2048;

export function kindForFile(file: File): MediaKind {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.type.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}

/**
 * Re-encodes through a canvas: this strips EXIF/GPS, applies the camera
 * orientation and caps the long edge before anything leaves the device.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close?.();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.85),
  );
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}

function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Upload failed (${request.status})`));
    };
    request.onerror = () => reject(new Error('Upload interrupted'));
    request.onabort = () => reject(new Error('Upload cancelled'));
    request.send(file);
  });
}

export async function uploadMedia(
  file: File,
  options: {
    kind?: MediaKind;
    durationMs?: number;
    waveform?: number[];
    onProgress?: (percent: number) => void;
  } = {},
): Promise<AttachmentDTO> {
  const kind = options.kind ?? kindForFile(file);
  const prepared = kind === 'IMAGE' ? await compressImage(file) : file;
  const mimeType = prepared.type || file.type || 'application/octet-stream';

  const presigned = await api.post<PresignedUploadDTO>('/v1/uploads/presign', {
    kind,
    mimeType,
    sizeBytes: prepared.size,
    ...(options.durationMs !== undefined ? { durationMs: options.durationMs } : {}),
    ...(options.waveform ? { waveform: options.waveform } : {}),
  });

  await putWithProgress(presigned.url, prepared, presigned.headers, options.onProgress);

  const completed = await api.post<CompletedUploadDTO>(
    `/v1/uploads/${presigned.uploadId}/complete`,
    {
      ...(options.durationMs !== undefined ? { durationMs: options.durationMs } : {}),
      ...(options.waveform ? { waveform: options.waveform } : {}),
    },
  );

  return completed.attachment;
}
