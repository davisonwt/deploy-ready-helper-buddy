// Small brand/company icon shown next to a seed's description.
import { useSignedImage } from '@/lib/storage/signedImage';
import type { SowerBrand } from '@/api/sowerBrands';

export default function BrandIcon({ brand, size = 18 }: { brand?: SowerBrand | null; size?: number }) {
  const signed = useSignedImage(brand?.logo_url || undefined);
  if (!brand) return null;
  const src = signed || brand.logo_url;

  return (
    <span
      title={brand.name}
      className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 align-middle"
    >
      {src ? (
        <img
          src={src}
          alt={`${brand.name} logo`}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
          loading="lazy"
        />
      ) : (
        <span
          style={{ width: size, height: size, fontSize: size * 0.55 }}
          className="inline-flex items-center justify-center rounded-full bg-primary/30 font-extrabold text-primary-foreground"
        >
          {brand.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="max-w-[90px] truncate text-[10px] font-bold uppercase tracking-wide text-primary">
        {brand.name}
      </span>
    </span>
  );
}
