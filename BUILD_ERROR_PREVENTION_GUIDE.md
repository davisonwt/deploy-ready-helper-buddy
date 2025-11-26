# Build Error Prevention Guide

## Common Build Error Pattern

**Problem:** Missing imports cause build failures when pushing updates.

**Root Cause:** When you use a component, icon, or function in JSX/TSX code, you MUST also import it at the top of the file.

## The Pattern to Watch For

### ❌ **WRONG** - Missing Import
```tsx
import { Loader2, TrendingUp, Sparkles, Upload } from 'lucide-react';

// Later in the code...
<Package className='w-16 h-16 text-white' />  // ❌ Package not imported!
```

### ✅ **CORRECT** - All Used Icons Imported
```tsx
import { Loader2, TrendingUp, Sparkles, Upload, Package } from 'lucide-react';

// Later in the code...
<Package className='w-16 h-16 text-white' />  // ✅ Package is imported!
```

## How to Prevent This in Your Backend

### 1. **Before Pushing Code, Always Check:**

```bash
# Run TypeScript/ESLint checks locally
npm run build
# or
npm run lint
```

### 2. **Create a Pre-Push Hook** (Recommended)

Create `.git/hooks/pre-push` (or use husky):

```bash
#!/bin/sh
# Run build check before pushing
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed! Fix errors before pushing."
  exit 1
fi
```

### 3. **Common Missing Import Patterns:**

#### Icons from lucide-react
- ✅ Check: Every `<IconName />` in JSX has matching import
- ✅ Pattern: `import { IconName } from 'lucide-react'`

#### Components
- ✅ Check: Every `<ComponentName />` has matching import
- ✅ Pattern: `import ComponentName from '@/components/...'`

#### Hooks
- ✅ Check: Every `useHookName()` has matching import
- ✅ Pattern: `import { useHookName } from '@/hooks/...'`

#### Utilities
- ✅ Check: Every `functionName()` has matching import
- ✅ Pattern: `import { functionName } from '@/utils/...'`

## Quick Checklist Before Pushing

- [ ] Run `npm run build` locally - does it succeed?
- [ ] Run `npm run lint` - any errors?
- [ ] Check all JSX elements have corresponding imports
- [ ] Check all icons used have lucide-react imports
- [ ] Check all components have component imports
- [ ] Check all hooks have hook imports

## Example: What Just Happened

**File:** `src/pages/ProductsPage.tsx`
**Error:** Used `<Package />` icon but didn't import it
**Fix:** Added `Package` to the import statement:
```tsx
// Before (❌)
import { Loader2, TrendingUp, Sparkles, Upload } from 'lucide-react';

// After (✅)
import { Loader2, TrendingUp, Sparkles, Upload, Package } from 'lucide-react';
```

## Automated Solution

Add this to your `package.json` scripts:
```json
{
  "scripts": {
    "pre-push": "npm run build && npm run lint",
    "check-imports": "tsc --noEmit"
  }
}
```

Then run `npm run pre-push` before every git push.

## Common Build Error #2: Unclosed HTML/JSX Tags

**Problem:** Missing closing tags cause build failures.

**Root Cause:** Every opening tag (`<div>`, `<span>`, `<Card>`, etc.) must have a matching closing tag (`</div>`, `</span>`, `</Card>`, etc.).

### ❌ **WRONG** - Missing Closing Tag
```tsx
<div className='container mx-auto px-4 py-8'>
  {/* Content */}
  {/* Missing </div> here! */}
</div>
```

### ✅ **CORRECT** - All Tags Properly Closed
```tsx
<div className='container mx-auto px-4 py-8'>
  {/* Content */}
</div> {/* ✅ Properly closed */}
```

### How to Prevent Unclosed Tags:

1. **Use a Code Formatter:**
   ```bash
   npm install -D prettier
   npx prettier --write "src/**/*.{js,jsx,ts,tsx}"
   ```

2. **Use VS Code Extensions:**
   - "Auto Rename Tag" - automatically closes tags
   - "Bracket Pair Colorizer" - visual tag matching
   - "HTML End Tag Labels" - shows which tag you're closing

3. **Check Before Pushing:**
   ```bash
   # Count opening vs closing divs
   grep -c "<div" src/pages/MyOrchardsPage.jsx
   grep -c "</div" src/pages/MyOrchardsPage.jsx
   # These should match!
   ```

4. **Use ESLint:**
   ```json
   {
     "rules": {
       "react/jsx-closing-tag-location": "error",
       "react/jsx-closing-bracket-location": "error"
     }
   }
   ```

## Summary

**The Two Golden Rules:** 
1. **If you use it in your code, you MUST import it at the top of the file.**
2. **Every opening tag MUST have a matching closing tag.**

**Quick Fix Patterns:**

### Missing Import:
1. See build error → "Cannot find name 'Package'"
2. Search file for `<Package` or `Package`
3. Check imports → Missing `Package` from lucide-react
4. Add `Package` to import statement
5. Rebuild → Should work!

### Unclosed Tag:
1. See build error → "Expected corresponding JSX closing tag"
2. Find the opening tag mentioned in error
3. Count opening vs closing tags in that section
4. Add missing closing tag
5. Rebuild → Should work!

