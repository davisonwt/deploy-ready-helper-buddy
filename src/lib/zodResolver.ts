/**
 * Custom Zod v4 compatible resolver for react-hook-form.
 * The default @hookform/resolvers/zod doesn't work with Zod v4 because
 * ZodError.errors was removed (only .issues exists now).
 */
import type { FieldErrors, FieldValues, ResolverResult } from 'react-hook-form';
import { z } from 'zod';

export function zodResolver<T extends z.ZodType>(schema: T) {
  return async (values: FieldValues): Promise<ResolverResult<z.infer<T>>> => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data, errors: {} as FieldErrors };
    }

    const errors: Record<string, { message: string; type: string }> = {};
    
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = {
          message: issue.message,
          type: issue.code,
        };
      }
    }

    // Convert flat errors to nested structure for react-hook-form
    const nestedErrors: FieldErrors = {};
    for (const [key, value] of Object.entries(errors)) {
      const parts = key.split('.');
      let current: any = nestedErrors;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    }

    return { values: {} as any, errors: nestedErrors };
  };
}
