

## Plan: Add Background Images to Gig Service Cards

### Why This Is a Good Idea
The current cards use small abstract Lucide icons that don't communicate the breadth of each service. Real photos as card backgrounds will make the purpose instantly clear at a glance.

### Approach
Use **AI-generated images** (via Nano banana) to create 6 compact, visually rich illustrations for each card, then store them in the project's `public/` folder. Each card gets a background image with a dark gradient overlay to keep white text readable.

### Images to Generate
| Card | Image Description |
|------|-------------------|
| **Ride** (Book) | Bakkie, delivery van, truck with trailer — transport/logistics feel |
| **Service** (Book) | Collage of domestic worker, gardener, plumber, electrician — hands-on skilled work |
| **Whisperer** (Book) | Person on phone/laptop with social media icons — content creator/marketer vibe |
| **Driver** (Become) | Person standing next to their vehicle, keys in hand — "register your vehicle" |
| **Services** (Become) | Skilled worker with tools ready — "offer your skills" |
| **Whisperer** (Become) | Creative person with camera/laptop — "become a content creator" |

### Card Layout Change
Each card will shift from the current small-icon style to:
- **Background image** covering the full card
- **Dark gradient overlay** (`linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.2))`) for text contrast
- **Text positioned at the bottom** over the overlay
- Small icon badge retained in the top-left corner for quick recognition
- Card height increased slightly (~100px) to give the image breathing room

### Files Changed
1. **Generate 6 images** → save to `public/images/gig/`
2. **`src/components/dashboard/sections/GigActionCards.tsx`** — Update all 6 Book cards to use background images with overlay
3. **`src/components/dashboard/sections/GradientGatewayCard.tsx`** — Add optional `backgroundImage` prop, render as `backgroundImage` CSS with gradient overlay when provided

### Technical Detail
- Cards use `style={{ backgroundImage: 'linear-gradient(...), url(/images/gig/ride.webp)', backgroundSize: 'cover' }}`
- Images generated at ~400x300px, compressed WebP for fast loading
- Fallback: gradient still shows if image fails to load

