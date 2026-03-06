

## Problem
The `AdminButton` (gosat's dropdown) currently renders for **any authenticated user with any role**, including `admin`. It should only appear for users with the `gosat` role.

## Fix
In `src/components/AdminButton.jsx`, change the visibility condition on line 54 from:

```js
{auth?.isAuthenticated && (userRoles?.length > 0) && (
```

to:

```js
{auth?.isAuthenticated && userRoles.includes('gosat') && (
```

This ensures only users with the `gosat` role see the button. Admins without the `gosat` role will not see it.

