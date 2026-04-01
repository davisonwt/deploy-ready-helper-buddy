

# Unified "Services" Section — Merged Layout

Keep the image-card style from the screenshot for all rows. One single section replaces both GigActionCards and ProviderActionCard.

## Layout

```text
┌─────────────────────────────────────────┐
│ 🤝 Services                            │
│    Book, connect, or become a provider  │
├─────────────────────────────────────────┤
│ 📅 BOOK A SERVICE                       │
│ [Ride img] [Service img] [Whisperer img]│
├─────────────────────────────────────────┤
│ 🌿 CONNECT WITH PROVIDERS              │
│ [Farmer img] [Homesteader] [Manufactur] │
│  (links to /providers?type=farmer etc.) │
├─────────────────────────────────────────┤
│ 🌱 BECOME A PROVIDER                    │
│ [Driver img] [Services img] [Whisp img] │
│ [Farmer img] [Homest img] [Manuf img]   │
│  (2 rows of 3, all image-backed cards)  │
├─────────────────────────────────────────┤
│ [ Register as Provider ]                │
│ [ Browse All Providers → ]              │
│ 🔒 Escrow badge                        │
└─────────────────────────────────────────┘
```

Every row uses the same image-card style (h-[100px], rounded-2xl, photo background + dark gradient overlay + icon + title + subtitle) — exactly like the screenshot.

## Changes

### 1. Edit `GigActionCards.tsx`
- Rename header: "Gig Services" → "Services"
- Keep "Book a Service" row (Ride, Service, Whisperer) as-is
- Add "Connect with Providers" row: 3 image cards (Farmer/Homesteader/Manufacturer) linking to `/providers?type=farmer` etc.
- Expand "Become a Provider" row: 6 image cards in 2 rows of 3 (Driver, Services, Whisperer + Farmer, Homesteader, Manufacturer)
- Add Register/Browse buttons and EscrowBadge at bottom
- Import provider images from `public/images/providers/`

### 2. Delete `ProviderActionCard.tsx`
Content absorbed into GigActionCards.

### 3. Edit `InlineMemryFeed.tsx`
Remove ProviderActionCard import and rendering.

### 4. Edit `MemrySection.tsx`
No changes needed — already renders GigActionCards.

