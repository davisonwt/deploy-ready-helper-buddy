// Single definition of "is this products row an album" — there is no
// dedicated column for it (checked the schema; there isn't one). An album
// is created by UploadForm.tsx's Album release type, which always appends
// the tag 'album' and stores a manifest.json path as file_url, never a
// direct audio file. Was previously copied three times (MyProductsPage,
// ProductsPage, ProductCard) with the same rule — this is the one to import.
export function isAlbum(product: {
  tags?: string[] | null;
  file_url?: string | null;
  metadata?: { is_album?: boolean } | null;
}): boolean {
  if (product.metadata?.is_album === true) return true;

  if (product.tags && Array.isArray(product.tags)) {
    // Exact-tag match, not substring: 'lp'/'ep' as *whole tags* mean an
    // album/EP release. A substring check on the joined string false-
    // positived on any tag merely containing those two letters anywhere
    // ("Deep House", "Sleep", "Help", "Alps"), wrongly hiding non-album
    // tracks from the music library.
    const normalizedTags = product.tags.map((t) => t.trim().toLowerCase());
    if (normalizedTags.includes('album') || normalizedTags.includes('lp') || normalizedTags.includes('ep')) {
      return true;
    }
  }

  if (product.file_url && product.file_url.includes('manifest.json')) {
    return true;
  }

  return false;
}
