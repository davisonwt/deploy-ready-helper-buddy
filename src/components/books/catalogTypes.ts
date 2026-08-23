/** One completed marketplace sale, with its financial split, for a catalog item. */
export interface CatalogSaleRow {
  id: string;
  product_id: string | null;
  amount: number;
  platform_fee: number;
  whisperer_amount: number;
  whisperer_id: string | null;
  income_type: 'sale' | 'gift';
  created_at: string;
}
