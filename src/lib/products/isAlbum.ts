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
    const tagStr = product.tags.join(' ').toLowerCase();
    if (tagStr.includes('album') || tagStr.includes('lp') || tagStr.includes('ep')) {
      return true;
    }
  }

  if (product.file_url && product.file_url.includes('manifest.json')) {
    return true;
  }

  return false;
}
