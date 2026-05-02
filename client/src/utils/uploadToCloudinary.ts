import { Platform } from 'react-native';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

export interface CloudinaryResult {
  url: string;       // https CDN URL — store this in DB
  publicId: string;  // for future deletion
  width: number;
  height: number;
}

/**
 * Uploads an image from a local file URI (from expo-image-picker) directly
 * to Cloudinary using an **unsigned upload preset**.
 *
 * No server involvement — the raw image bytes never hit our Node.js process.
 * Returns the secure CDN URL to be stored in the Post document.
 *
 * @throws {Error} if CLOUDINARY env vars are missing or the upload fails
 */
export async function uploadToCloudinary(
  localUri: string
): Promise<CloudinaryResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and ' +
        'EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in client/.env'
    );
  }

  // Build a multipart FormData payload — works on both iOS and Android
  const filename = localUri.split('/').pop() ?? 'upload.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const body = new FormData();

  if (Platform.OS === 'web') {
    // For Web: We need to fetch the local URI and convert it to a Blob
    const response = await fetch(localUri);
    const blob = await response.blob();
    body.append('file', blob, filename);
  } else {
    // For Native (iOS/Android): Use the React Native specific object syntax
    body.append('file', {
      uri: localUri,
      name: filename,
      type: mimeType,
    } as any);
  }

  body.append('upload_preset', UPLOAD_PRESET);
  // NOTE: 'folder' and 'transformation' are NOT allowed in unsigned presets.
  // Configure transformations inside the Cloudinary preset dashboard instead.

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body,
    // Do NOT set Content-Type manually — fetch sets multipart boundary automatically
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[Cloudinary] Upload failed:', response.status, text);
    throw new Error(`Cloudinary upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  console.log('✅ [Cloudinary] Upload success! URL:', data.secure_url);

  return {
    url: data.secure_url as string,         // always HTTPS
    publicId: data.public_id as string,
    width: data.width as number,
    height: data.height as number,
  };
}
