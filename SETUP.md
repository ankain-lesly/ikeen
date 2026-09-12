- Database
- Zod schemas
- Types
- ui
- API
- lib
- auth

- tests

---

Here is a concise breakdown of the shared packages (packages/*) for your 5-app ecosystem:
## 🎨 Design & Presentation

* @workspace/theme: Brand tokens like colors, typography scales, spacing, and dark mode maps.
* @workspace/ui: Universal component primitives (Buttons, Inputs, Cards) powered by NativeWind v4 or Tamagui.
* @workspace/assets: Unified storage for raw SVGs, company logos, Lottie animations, and app store icons.

## 🛡️ Data & Database

* @workspace/db: Houses your schema.prisma file, database migration history, and the compiled Prisma Client engine.
* @workspace/validation: Centralized Zod schemas used for Express request validation and frontend form checks.
* @workspace/types: Static TypeScript definitions generated from your Prisma models and API payloads.

## 🌐 Communication & Logic

* @workspace/api-client: Configured TanStack Query hooks and HTTP client instances to call your Express backend.
* @workspace/auth-shared: Shared authentication logic, JWT token decoders, and user permission checkers.
* @workspace/utils: Pure helper functions for formatting dates, handling currency, and mutating arrays.

## ⚙️ Infrastructure & Tooling

* @workspace/tsconfig: Base TypeScript configurations extended by your apps (nextjs.json, react-native.json).
* @workspace/eslint-config: Standardized linting and formatting rules to keep the entire monorepo code clean.

------------------------------
Would you like to generate the package.json configurations to wire these packages together, or should we draft the packages/db layout with Prisma?



---

# ## Packages

svg zustand