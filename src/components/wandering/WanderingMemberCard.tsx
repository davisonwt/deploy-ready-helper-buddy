import { Link } from 'react-router-dom';

export interface WanderingMemberCardProps {
  name: string;
  roleLabel: string;
  roleEmoji: string;
  color: string;
  location: string;
  tagline?: string | null;
  photoUrl?: string | null;
  galleryUrls?: string[] | null;
  /** Wraps the card in a Link when set; otherwise a static, non-clickable preview. */
  linkTo?: string;
  bookLabel?: string;
}

/**
 * The Wandering Directory's member card, extracted so RegisterWanderingPage's
 * live "How you'll appear" preview renders the exact same component a
 * grower sees there — not a lookalike. Visual style (dark card, colour top
 * bar, circular avatar) is unchanged from WanderingDirectoryPage.jsx's own
 * inline styles; gallery strip is new (spec-service-seeds.md's role-
 * profile rebuild).
 */
export default function WanderingMemberCard({
  name, roleLabel, roleEmoji, color, location, tagline, photoUrl, galleryUrls, linkTo, bookLabel,
}: WanderingMemberCardProps) {
  const s = {
    card: { background: '#0d1117', border: `1px solid ${color}33`, borderRadius: 14, overflow: 'hidden' as const, textDecoration: 'none' as const, display: 'block' as const },
    cardTop: { height: 6, background: color },
    cardBody: { padding: 16 },
    cardHeader: { display: 'flex' as const, alignItems: 'center' as const, gap: 12, marginBottom: 12 },
    avatar: { width: 48, height: 48, borderRadius: '50%', background: color + '33', border: `2px solid ${color}55`, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, fontSize: 22, flexShrink: 0 as const, overflow: 'hidden' as const },
    cardName: { fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 },
    cardRole: { fontSize: 12, color, fontWeight: 600 },
    cardDesc: { fontSize: 13, color: '#9ca3af', lineHeight: 1.5, marginBottom: 12, minHeight: 20 },
    gallery: { display: 'flex' as const, gap: 5, marginBottom: 12, overflowX: 'auto' as const },
    galleryImg: { width: 44, height: 44, borderRadius: 8, objectFit: 'cover' as const, flexShrink: 0 as const, border: '1px solid rgba(255,255,255,0.08)' },
    cardFooter: { display: 'flex' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    cardLocation: { fontSize: 12, color: '#4b5563' },
    bookBtn: { padding: '7px 14px', borderRadius: 20, background: color, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700 },
  };

  const content = (
    <>
      <div style={s.cardTop} />
      <div style={s.cardBody}>
        <div style={s.cardHeader}>
          <div style={s.avatar}>
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              roleEmoji
            )}
          </div>
          <div>
            <div style={s.cardName}>{name || 'Tribe member'}</div>
            <div style={s.cardRole}>{roleEmoji} {roleLabel}</div>
          </div>
        </div>
        <div style={s.cardDesc}>{tagline || 'Tribe member'}</div>
        {!!galleryUrls?.length && (
          <div style={s.gallery}>
            {galleryUrls.slice(0, 8).map((url, i) => (
              <img key={i} src={url} alt="" style={s.galleryImg} />
            ))}
          </div>
        )}
        <div style={s.cardFooter}>
          <div style={s.cardLocation}>📍 {location || 'Location not set'}</div>
          <button type="button" style={s.bookBtn} onClick={(e) => e.preventDefault()} tabIndex={-1}>
            {bookLabel ?? 'Book'}
          </button>
        </div>
      </div>
    </>
  );

  if (linkTo) {
    return <Link to={linkTo} style={s.card}>{content}</Link>;
  }
  return <div style={s.card}>{content}</div>;
}
