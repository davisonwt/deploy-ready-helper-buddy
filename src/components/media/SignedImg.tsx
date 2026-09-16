import { forwardRef } from 'react';
import { useSignedImage } from '@/lib/storage/signedImage';

/**
 * Drop-in replacement for a plain <img> whose src may point at a private
 * storage bucket (e.g. orchard-images). Re-signs the URL via
 * useSignedImage before handing it to the DOM; anything that isn't a
 * private-bucket storage URL (data: URIs, external URLs, already-public
 * buckets) passes through unchanged.
 *
 * forwardRef is NOT optional. This has to be a true drop-in, and callers
 * measure the element: StallInteriorView and HotspotEditor both hand it an
 * imgRef that useContainImageRect polls to compute where hotspots sit. On
 * React 18 a ref given to a plain function component is dropped silently --
 * TypeScript accepts it, nothing warns in a production build, and the ref
 * simply stays null. That is what took out every stall interior's hotspots
 * on 2026-09-16: useContainImageRect waited forever, `rect` stayed null,
 * and `{rect && hotspots.map(...)}` rendered nothing at all.
 *
 * Every other <img> prop already passes through via ...props.
 */
const SignedImg = forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  function SignedImg({ src, ...props }, ref) {
    const signedSrc = useSignedImage(typeof src === 'string' ? src : null);
    return <img ref={ref} src={signedSrc ?? undefined} {...props} />;
  },
);

export default SignedImg;
