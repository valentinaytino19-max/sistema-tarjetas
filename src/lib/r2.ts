const R2_UPLOAD_URL = import.meta.env.VITE_R2_UPLOAD_URL;
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

export async function uploadToR2(file: File): Promise<string> {
  if (!R2_UPLOAD_URL) {
    throw new Error('R2 upload URL missing. Set VITE_R2_UPLOAD_URL in .env');
  }

  const response = await fetch(R2_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'image/jpeg',
    },
    body: file,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.url;
}

export async function deleteFromR2(imageUrl: string): Promise<void> {
  if (!R2_PUBLIC_URL) return;
  const key = imageUrl.replace(R2_PUBLIC_URL + '/', '');
  if (!key || key === imageUrl) return;
  console.warn('Delete not implemented via Worker:', key);
}
