/**
 * Rewrites a Cloudinary secure_url to add auto-optimization transforms.
 * q_auto: quality compression, f_auto: best format (WebP/AVIF), w_{n}: resize.
 * Safe to call on non-Cloudinary URLs — returns url unchanged.
 */
export function getOptimizedCloudinaryUrl(url: string, width = 800): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/q_auto,f_auto,w_${width}/`);
}
