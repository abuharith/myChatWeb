import { useCallback, useEffect, useRef, useState } from 'react';
import type { AttachmentDTO, AttachmentUrlsDTO } from '@voidlink/shared';
import { api } from '../lib/api';

interface Urls {
  url: string | null;
  thumbnailUrl: string | null;
}

/**
 * Media URLs are signed for a fixed TTL. If a chat stays open longer, the
 * element fails to load and we re-sign once instead of leaving a broken image.
 */
export function useAttachmentUrls(attachment: AttachmentDTO) {
  const [urls, setUrls] = useState<Urls>({
    url: attachment.url,
    thumbnailUrl: attachment.thumbnailUrl,
  });
  const retriedRef = useRef(false);
  const inFlightRef = useRef<Promise<Urls | null> | null>(null);

  useEffect(() => {
    setUrls({ url: attachment.url, thumbnailUrl: attachment.thumbnailUrl });
    retriedRef.current = false;
  }, [attachment.id, attachment.url, attachment.thumbnailUrl]);

  const refresh = useCallback(
    async (force = false): Promise<Urls | null> => {
      if (attachment.viewOnce) return null;
      if (!force && retriedRef.current) return null;
      retriedRef.current = true;
      if (inFlightRef.current) return inFlightRef.current;

      const request = api
        .get<AttachmentUrlsDTO>(`/v1/attachments/${attachment.id}/url`)
        .then((data) => {
          const next: Urls = { url: data.url, thumbnailUrl: data.thumbnailUrl };
          setUrls(next);
          return next;
        })
        .catch(() => null)
        .finally(() => {
          inFlightRef.current = null;
        });

      inFlightRef.current = request;
      return request;
    },
    [attachment.id, attachment.viewOnce],
  );

  return { ...urls, refresh };
}
