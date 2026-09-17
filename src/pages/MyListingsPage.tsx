import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMyContent } from '@/api/sowerContent';
import { deleteProduct } from '@/api/products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import SignedImg from '@/components/media/SignedImg';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Pencil, Trash2, Loader2, EyeOff, Share2 } from 'lucide-react';
import { vehicleTypeLabel } from '@/lib/sleeping/wheelOptions';
import { stayTypeLabel } from '@/lib/sleeping/pillowOptions';
import { serviceCategoryLabel } from '@/lib/sleeping/handOptions';
import ShareSeedDialog from '@/components/share/ShareSeedDialog';

/**
 * One place a member manages their own Sleeping Seeds.
 *
 * Reuses useMyContent, the same source My Garden and the Dashboard read, so
 * there is no divergent query to drift. Editing reuses the listing's own sow
 * form rather than a second editor -- a second form is exactly how EditForm
 * came to silently drop every wheel_seed_details field.
 *
 * A card never claims a listing is showing without checking the one thing
 * that decides it: whether the listing has coordinates. The proximity search
 * skips a row with a null lat/lng in silence, so the card is the only place
 * an owner can learn their listing is invisible.
 */

const SERVICE_KINDS = ['wheel', 'pillow', 'hand'] as const;
type ServiceKind = typeof SERVICE_KINDS[number];

const KIND_META: Record<ServiceKind, { label: string; emoji: string; sowPath: string; seedPath: string }> = {
  wheel:  { label: 'Wheel',  emoji: '🚗',  sowPath: '/sow/wheel',  seedPath: '/seed/wheel' },
  pillow: { label: 'Pillow', emoji: '🛏️', sowPath: '/sow/pillow', seedPath: '/seed/pillow' },
  hand:   { label: 'Hand',   emoji: '🤲',  sowPath: '/sow/hand',   seedPath: '/seed/hand' },
};

interface Row {
  id: string;
  kind: ServiceKind;
  title: string;
  description?: string | null;
  cover?: string | null;
}

export default function MyListingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { seeds, loading, refetch } = useMyContent(user?.id) as any;

  const [busyId, setBusyId] = useState<string | null>(null);
  /** The listing whose share dialog is open. The dialog itself is the one
   *  ShareSeedDialog every other surface uses -- no second share path. */
  const [shareRow, setShareRow] = useState<Row | null>(null);
  /** product_id -> availability, loaded lazily for Wheel rows. */
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [vehicleTypes, setVehicleTypes] = useState<Record<string, string>>({});
  const [stayTypes, setStayTypes] = useState<Record<string, string>>({});
  const [handCategories, setHandCategories] = useState<Record<string, string>>({});
  /** product_id -> whether it has coordinates, and the location it was given. */
  const [placement, setPlacement] = useState<Record<string, { located: boolean; location: string | null }>>({});
  const [placementLoaded, setPlacementLoaded] = useState(false);

  const rows: Row[] = useMemo(() => {
    return ((seeds ?? []) as any[])
      // kind alone is enough: a legacy `seeds` row always has kind null, so
      // anything tagged wheel/pillow/hand is a products row. Do NOT also
      // require __table here -- splitDashboardRows only stamps that on music,
      // so requiring it hid every listing.
      .filter((s) => SERVICE_KINDS.includes(s?.kind))
      .map((s) => ({
        id: s.id,
        kind: s.kind as ServiceKind,
        title: s.title || 'Untitled listing',
        description: s.description,
        // The two fetch paths name this differently: `images` on the RPC
        // path, cover_image_url/image_urls on the direct one.
        cover: (Array.isArray(s.images) ? s.images[0] : null)
          || s.cover_image_url
          || (Array.isArray(s.image_urls) ? s.image_urls[0] : null),
      }));
  }, [seeds]);

  const wheelIds = useMemo(() => rows.filter((r) => r.kind === 'wheel').map((r) => r.id), [rows]);
  const pillowIds = useMemo(() => rows.filter((r) => r.kind === 'pillow').map((r) => r.id), [rows]);
  const handIds = useMemo(() => rows.filter((r) => r.kind === 'hand').map((r) => r.id), [rows]);

  // Availability and vehicle type live in wheel_seed_details, not in the
  // products row useMyContent returns, so they are fetched alongside.
  const wheelKey = wheelIds.join(',');
  const pillowKey = pillowIds.join(',');
  const handKey = handIds.join(',');
  useEffect(() => {
    let alive = true;
    if (wheelIds.length === 0 && pillowIds.length === 0 && handIds.length === 0) return;
    (async () => {
      const avail: Record<string, boolean> = {};
      // Every listing starts un-placed: a products row with no detail row at
      // all cannot show either, and saying nothing would be the same lie.
      const place: Record<string, { located: boolean; location: string | null }> = {};
      for (const id of [...wheelIds, ...pillowIds, ...handIds]) {
        place[id] = { located: false, location: null };
      }
      const recordPlace = (d: any) => {
        place[d.product_id] = {
          located: Number.isFinite(Number(d.base_lat)) && Number.isFinite(Number(d.base_lng))
            && d.base_lat !== null && d.base_lng !== null,
          location: d.base_location ?? null,
        };
      };
      const vTypes: Record<string, string> = {};
      const sTypes: Record<string, string> = {};
      const hCats: Record<string, string> = {};

      if (wheelIds.length) {
        const { data } = await supabase
          .from('wheel_seed_details')
          .select('product_id, availability, vehicle_type, base_lat, base_lng, base_location')
          .in('product_id', wheelIds);
        for (const d of (data ?? []) as any[]) {
          avail[d.product_id] = d.availability !== false;
          vTypes[d.product_id] = d.vehicle_type;
          recordPlace(d);
        }
      }
      if (pillowIds.length) {
        const { data } = await supabase
          .from('pillow_seed_details')
          .select('product_id, availability, stay_type, base_lat, base_lng, base_location')
          .in('product_id', pillowIds);
        for (const d of (data ?? []) as any[]) {
          avail[d.product_id] = d.availability !== false;
          sTypes[d.product_id] = d.stay_type;
          recordPlace(d);
        }
      }
      if (handIds.length) {
        const { data } = await supabase
          .from('hand_seed_details')
          .select('product_id, availability, service_category, base_lat, base_lng, base_location')
          .in('product_id', handIds);
        for (const d of (data ?? []) as any[]) {
          avail[d.product_id] = d.availability !== false;
          hCats[d.product_id] = d.service_category;
          recordPlace(d);
        }
      }
      if (!alive) return;
      setAvailability(avail);
      setVehicleTypes(vTypes);
      setStayTypes(sTypes);
      setHandCategories(hCats);
      setPlacement(place);
      setPlacementLoaded(true);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wheelKey, pillowKey, handKey]);

  const toggleAvailability = async (row: Row) => {
    const next = !(availability[row.id] ?? true);
    setBusyId(row.id);
    try {
      const table = row.kind === 'pillow' ? 'pillow_seed_details'
        : row.kind === 'hand' ? 'hand_seed_details'
        : 'wheel_seed_details';
      const { data, error } = await supabase
        .from(table)
        .update({ availability: next, updated_at: new Date().toISOString() })
        .eq('product_id', row.id)
        .select('product_id, availability');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('the listing was not found, or you do not have permission to change it');
      }
      setAvailability((prev) => ({ ...prev, [row.id]: next }));
      toast.success(next
        ? `"${row.title}" is available again and will show in Sleeping Seeds.`
        : `"${row.title}" is now unavailable and will not show in Sleeping Seeds.`);
    } catch (e: any) {
      toast.error(`Could not change availability: ${e?.message ?? 'unknown error'}`);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: Row) => {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    setBusyId(row.id);
    try {
      await deleteProduct(row.id);
      toast.success(`"${row.title}" deleted.`);
      refetch?.();
    } catch (e: any) {
      toast.error(`Could not delete: ${e?.message ?? 'unknown error'}`);
    } finally {
      setBusyId(null);
    }
  };

  const edit = (row: Row) => {
    // Each kind edits in its OWN sow form, in edit mode. All three have one.
    navigate(`${KIND_META[row.kind].sowPath}?edit=${row.id}`);
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6">
      {/* Golden rule: every page has a visible way back. */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/cockpit')} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Cockpit
      </Button>

      <header className="mb-5">
        <h1 className="text-2xl font-bold">My Listings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your vehicles, places to stay and helping hands. Everything you have offered to the tribe.
        </p>
      </header>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-4">
          <p className="text-muted-foreground">You have not listed anything yet.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button asChild><Link to="/sow/wheel">Register a vehicle</Link></Button>
            <Button asChild variant="outline"><Link to="/sow/hand">Offer a hand</Link></Button>
            <Button asChild variant="outline"><Link to="/sow/pillow">List a place</Link></Button>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((row) => {
            const meta = KIND_META[row.kind];
            const isWheel = row.kind === 'wheel';
            const hasAvailability = true; // all three kinds carry an availability flag
            const isAvailable = availability[row.id] ?? true;
            const place = placement[row.id];
            const busy = busyId === row.id;

            return (
              <li key={row.id} className="rounded-xl border bg-card overflow-hidden">
                <div className="flex gap-3 p-3">
                  <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
                    {row.cover && (
                      <SignedImg src={row.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold leading-tight truncate">{row.title}</h2>
                      <Badge variant="secondary" className="shrink-0">
                        {meta.emoji}{' '}
                        {isWheel && vehicleTypes[row.id]
                          ? vehicleTypeLabel(vehicleTypes[row.id])
                          : row.kind === 'pillow' && stayTypes[row.id]
                            ? stayTypeLabel(stayTypes[row.id])
                            : row.kind === 'hand' && handCategories[row.id]
                              ? serviceCategoryLabel(handCategories[row.id])
                              : meta.label}
                      </Badge>
                    </div>

                    {!isAvailable ? (
                      <p className="text-xs mt-1 text-muted-foreground">Hidden from Sleeping Seeds</p>
                    ) : !placementLoaded ? (
                      <p className="text-xs mt-1 text-muted-foreground">Checking where this shows…</p>
                    ) : place?.located ? (
                      <p className="text-xs mt-1 text-primary">
                        Showing in Sleeping Seeds{place.location ? ` near ${place.location}` : ''}
                      </p>
                    ) : (
                      <p className="text-xs mt-1 text-destructive">
                        Not showing in Sleeping Seeds: we could not place{' '}
                        {place?.location ? `“${place.location}”` : 'this listing'} on the map.
                        Tap Edit and give a town or city with its country, like “Mossel Bay, South Africa”.
                      </p>
                    )}

                    {row.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{row.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t p-3">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`${meta.seedPath}/${row.id}`}>
                      <Eye className="w-4 h-4 mr-1" /> Open
                    </Link>
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => edit(row)} disabled={busy}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>

                  {hasAvailability && (
                    <Button size="sm" variant="outline" onClick={() => toggleAvailability(row)} disabled={busy}>
                      {busy
                        ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        : isAvailable
                          ? <EyeOff className="w-4 h-4 mr-1" />
                          : <Eye className="w-4 h-4 mr-1" />}
                      {isAvailable ? 'Make unavailable' : 'Make available'}
                    </Button>
                  )}

                  <Button size="sm" variant="outline" onClick={() => setShareRow(row)} disabled={busy}>
                    <Share2 className="w-4 h-4 mr-1" /> Share
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => remove(row)}
                    disabled={busy}
                  >
                    {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        One dialog for the whole list, driven by whichever row was tapped.
        This is the same component the Wandering door and My Garden use, so
        a share from here runs the identical chain:
        get_or_create_direct_room -> send_chat_message -> notify_member.
      */}
      {shareRow && (
        <ShareSeedDialog
          open={!!shareRow}
          onOpenChange={(open) => { if (!open) setShareRow(null); }}
          seedId={shareRow.id}
          title={shareRow.title}
          subtitle={shareRow.description ?? KIND_META[shareRow.kind].label}
          image={shareRow.cover ?? null}
          openPath={`${KIND_META[shareRow.kind].seedPath}/${shareRow.id}`}
          feedKind="photo"
        />
      )}
    </div>
  );
}
