import { useEffect, useState } from 'react';
import { getMedia } from '@/lib/persistence';

interface UseStoredMediaUrlOptions {
  mediaId?: string;
  fallbackUrl?: string | null;
}

export function useStoredMediaUrl({ mediaId, fallbackUrl = null }: UseStoredMediaUrlOptions) {
  const [url, setUrl] = useState<string | null>(fallbackUrl);
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    let isActive = true;
    let objectUrl: string | null = null;

    setUrl(fallbackUrl);
    setIsMissing(false);

    if (!mediaId) {
      return;
    }

    void getMedia(mediaId)
      .then((record) => {
        if (!isActive) return;
        objectUrl = URL.createObjectURL(record.blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!isActive) return;
        setIsMissing(true);
        setUrl(fallbackUrl);
      });

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fallbackUrl, mediaId]);

  return { url, isMissing };
}
