## Agent Rule: Feature Development Standards

### Type Safety & Validation

- **Strictly Prohibit Ad Hoc Argument Types for Services**  
  Service-layer function arguments (including params, bodies, or options) **must always** be typed by inferring directly from Zod validation schemas defined in `feature.validator.ts` (`z.infer<typeof someSchema>`).  
  - *Do not* create or export hand-written "FooInput" or "BarParams" types—keep argument types always 100% aligned to the source-of-truth Zod validator.
  - If a shape needs to be reused in multiple service functions, compose it from Zod schemas and infer its type.

### Features Directory Canonical Structure

Every new feature module **must** follow this structure, with all filenames lowercased for consistency:

```
features/
  index.ts               // Barrel export: export all module pieces (controller, service, etc.)
  feature.routes.ts      // Express route bindings for this feature's API endpoints
  feature.validator.ts   // Zod schemas for validating all request bodies, params, and queries
  feature.controller.ts  // Route handler/controller functions, express-style signatures
  feature.service.ts     // All domain logic and database access for feature (never HTTP code)
  feature.actions.ts     // Internal utilities, queuable side effects, and all non-HTTP actions
```

#### Additional Guidance

- **Never duplicate type logic**—Zod schemas are always the single source of truth.
- **Controllers** handle parsing/validating inputs (using Zod schemas), pass parsed data to services, and format output.
- **Services** are pure: do not reference HTTP request objects, always receive well-typed inputs from controllers.
- **Actions** are for background jobs, integrations, or other business logic not suitable for direct HTTP route handling.
- If you extend or fork this pattern, document changes in this guideline file.

> **Agent Enforcement**: All PRs introducing or modifying feature service logic will be automatically validated for Zod-derived types and correct source structure.