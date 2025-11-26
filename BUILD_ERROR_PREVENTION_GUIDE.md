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

## Summary

**The Golden Rule:** 
> If you use it in your code, you MUST import it at the top of the file.

**Quick Fix Pattern:**
1. See build error → "Cannot find name 'Package'"
2. Search file for `<Package` or `Package`
3. Check imports → Missing `Package` from lucide-react
4. Add `Package` to import statement
5. Rebuild → Should work!

