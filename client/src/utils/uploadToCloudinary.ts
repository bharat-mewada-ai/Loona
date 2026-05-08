import { Platform } from 'react-native';
import client from '../api/client';

export interface CloudinaryResult {
  url: string;       // https CDN URL — store this in DB
  publicId: string;  // for future deletion
  width: number;
  height: number;
}

/**
 * Uploads an image from a local file URI directly to Cloudinary
 * using a **signed signature** from our backend.
 *
 * Flow:
 * 1. Fetch short-lived signature from /api/upload/sign (Auth required)
 * 2. POST image + signature to Cloudinary
 * 3. Return results
 */
export async function uploadToCloudinary(
  localUri: string
): Promise<CloudinaryResult> {
  // 1. Get signed signature from our API
  let signData;
  try {
    const { data } = await client.get('/upload/sign');
    signData = data;
  } catch (err: any) {
    throw new Error(`Failed to get upload signature: ${err.message}`);
  }

  const { timestamp, signature, folder, cloudName, apiKey } = signData;

  // 2. Prepare FormData
  const filename = localUri.split('/').pop() ?? 'upload.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const body = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    const blob = await response.blob();
    body.append('file', blob, filename);
  } else {
    body.append('file', {
      uri: localUri,
      name: filename,
      type: mimeType,
    } as any);
  }

  // Add signed parameters required by Cloudinary
  body.append('api_key', apiKey);
  body.append('timestamp', timestamp.toString());
  body.append('signature', signature);
  body.append('folder', folder);
  body.append('transformation', 'q_auto,f_auto,w_1200,c_limit');

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
    width: data.width as number,
    height: data.height as number,
  };
}
