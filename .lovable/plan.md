

## Add Two Required Preference Questions to Tribal Hearts Onboarding

Add **Complexion preference** and **Physical preferences** as two new required questions in the Tribal Hearts onboarding flow, positioned where they read naturally alongside existing partner-preference questions.

### Where they fit in the flow

Today's question order (in `src/lib/heartsAgentLines.ts`):
1. first_name → 2. gender → 3. birthdate → 4. country → 5. region → 6. faith → 7. values → 8. family_goals → 9. lifestyle → 10. interests → 11. **looking_for** → 12. **deal_makers** → 13. distance

The new questions belong with the partner-preference cluster (looking_for / deal_makers), so the new order becomes:

```
… → looking_for → deal_makers → complexion_pref (NEW) → physical_prefs (NEW) → distance
```

This keeps "distance" as the closing logistical question and groups all "what kind of partner" prompts together.

### The two new questions

**1. Complexion preference** (`complexion_pref`)
- Prompt: *"When you picture a partner, do you have a complexion preference?"*
- Helper text shown in the question card: *"This only softly broadens or focuses your matches — no one is ever excluded based on appearance."*
- Single-select chip choices (one must be picked):
  - Open to all
  - No strong preference
  - Prefer similar to mine
  - Prefer to describe in my own words → reveals a small free-text input

**2. Physical preferences** (`physical_prefs`)
- Prompt: *"Are there any physical qualities that draw you in?"*
- Helper text: *"Pick any that resonate, or describe in your own words. All optional in spirit — choose what feels true."*
- Multi-select chips: **Height · Build · Style · Energy (calm / outgoing)**
- Plus a short free-text field: *"Describe in your own words (optional)"*
- Required = at least one chip selected OR the free-text filled in.

Both questions live in the same warm fireside card style as the rest of the wizard (gold-on-walnut, `th-serif`, `GlowButton` nav).

### How answers are stored

- The two answers are added to the existing `answers` map in `HeartsOnboardingWizard.tsx` and submitted to the `tribal-hearts-onboard` edge function as part of the standard `payload` array (no schema change — `tribal_hearts_answers` already accepts arbitrary `question_key` rows).
- On `commit()`, the structured values are also folded into `lifestyle` jsonb on `tribal_hearts_profiles` so they're available to matching:
  ```
  lifestyle: {
    …existing,
    complexion_pref: { choice: 'prefer_similar' | 'open_all' | …, custom?: string },
    physical_prefs:  { tags: ['height','build',…], custom?: string },
  }
  ```
- No DB migration required.

### Files to change

| File | Change |
|---|---|
| `src/lib/heartsAgentLines.ts` | Add the two question entries to `onboardingQuestions` in the new positions |
| `src/components/hearts/HeartsOnboardingWizard.tsx` | Render chip-style UI for these two `question_key`s instead of the default `<Input>`; update `next()` validation; pass structured shapes into `lifestyle` on commit |
| `src/components/hearts/ProfileEditor.tsx` | Add read/edit of `lifestyle.complexion_pref` and `lifestyle.physical_prefs` so members can change them later |

### Validation rules (required, per your choice)

- Complexion: a chip must be selected; if "Prefer to describe" is chosen, the free-text must be non-empty (zod-style trim + max 200 chars).
- Physical: at least one chip selected OR the free-text non-empty (max 250 chars).
- Errors show inline via the existing `toast.error` pattern (same UX as today's "Please share a quick answer 🌱").

### Out of scope

- No matching algorithm changes in this pass — answers are stored and shown on profiles only. Wiring them into the match scorer can be a separate task once you've seen real answers come in.

