

## Problem

When you share a link to your app on social media (Telegram, Facebook, etc.), the link preview shows **"Lovable Generated Project"** with Lovable's logo instead of your Sow2Grow branding. This happens because the Open Graph and Twitter Card meta tags in `index.html` (lines 31-38) still contain Lovable's default values.

## What Will Change

Update `index.html` to replace all Lovable branding with your Sow2Grow branding:

| Meta Tag | Current (Lovable) | Updated (Sow2Grow) |
|---|---|---|
| `og:title` | "deploy-ready-helper-buddy" | "Sow2Grow - Community Powered Growth" |
| `og:description` | "Lovable Generated Project" | Your app description |
| `og:image` | Lovable's image | Your app's logo/image (from your public folder) |
| `og:url` | (missing) | `https://sow2growapp.com` |
| `twitter:site` | `@lovable_dev` | Your Twitter/X handle or removed |
| `twitter:image` | Lovable's image | Your app's logo/image |

## Technical Details

**File:** `index.html` (lines 31-38)

Replace the existing meta tags with Sow2Grow-branded values. I will also add `og:url` for better SEO and social sharing. For the preview image, I will check your `public` folder for an existing logo to use -- if none is suitable, I will use a placeholder path you can update later.

After publishing, social platforms may cache old previews for a while. You can force a refresh using tools like Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/) or Telegram's bot (`@WebpageBot`).

