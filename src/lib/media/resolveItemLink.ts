/**
 * Where a bought item's own page lives, given what buyer_purchases_v /
 * a receipt's seed_lines know about it: which table it came from
 * (product_bestowals vs content_purchases), and — for content — which
 * content_type.
 *
 * Only the routes actually confirmed to exist are mapped. Returns null
 * rather than guessing at a route that might not exist — an item with no
 * confirmed page shows no link rather than a broken one.
 */
export type PurchasedItemSource = 'product' | 'content' | null | undefined;

export interface ItemLinkRef {
  itemId?: string | null;
  itemSource?: PurchasedItemSource;
  contentType?: string | null;
}

export function resolveItemLink(ref: ItemLinkRef): string | null {
  if (!ref.itemId) return null;
  if (ref.itemSource === 'product') return `/music-track/${ref.itemId}`;
  if (ref.itemSource === 'content') {
    switch (ref.contentType) {
      case 'music_track':
        return `/music-track/${ref.itemId}`;
      case 'premium_room_access':
        return `/premium-room/${ref.itemId}`;
      default:
        // library_item / live_session_media / premium_item: no confirmed
        // per-item detail route in this codebase yet.
        return null;
    }
  }
  return null;
}
