

## Plan: Fix Music Under Entertainment & Improve Category Button Visibility

### Problem 1: Music Not Showing Under Entertainment
Currently, clicking "Entertainment" only shows items where the creator manually set `category = 'entertainment'`. Many music uploads don't have this set, so they disappear when the filter is active.

**Fix:** Update the filtering logic so that when "Entertainment" is selected, ALL music-type items are automatically included regardless of their saved category. This applies in `MyProductsPage.tsx` and any other pages using this filter.

### Problem 2: Category Buttons All Look The Same
The active/selected button is not visually distinct because the `className` styling (`bg-white/20`) overrides the variant-based highlighting. All buttons appear the same whether selected or not.

**Fix:** Restyle the category buttons so the selected one has a bold, solid background (e.g., teal/amber) while unselected ones remain subtle/outline. This makes it immediately clear which filter is active.

---

### Technical Details

**File: `src/pages/MyProductsPage.tsx`** (line ~85)
- Change the `matchesCategory` logic:
  - When `selectedCategory === 'entertainment'`, also match any product where `product.type === 'music'`
  - `const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory || (selectedCategory === 'entertainment' && product.type === 'music');`

**File: `src/components/products/CategoryFilter.tsx`** (lines 118-128)
- Replace the current button styling so the selected button gets a prominent solid background color (e.g., `bg-amber-600 text-white font-bold shadow-lg`) while unselected buttons remain translucent (`bg-white/10 border-white/30 text-white/70`). Remove the conflicting `bg-white/20` from the shared className that was overriding the variant difference.

