import { useSignedImage } from '@/lib/storage/signedImage';

/**
 * Drop-in replacement for a plain <img> whose src may point at a private
 * storage bucket (e.g. orchard-images). Re-signs the URL via
 * useSignedImage before handing it to the DOM; anything that isn't a
 * private-bucket storage URL (data: URIs, external URLs, already-public
 * buckets) passes through unchanged.
 */
export default function SignedImg({
  src,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const signedSrc = useSignedImage(typeof src === 'string' ? src : null);
  return <img src={signedSrc ?? undefined} {...props} />;
}
