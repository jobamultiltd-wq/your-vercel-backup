# Replicate Vercel project from GitHub

## Goal
Replicate the private GitHub repository `jobamultiltd-wq/jobaacadportal` inside this Lovable project, preserving the original design, pages, content, and behavior as closely as possible.

## Important constraint
The source is a Vercel project (most likely Next.js). Lovable projects run on **TanStack Start**, not Next.js. An exact framework clone is not possible, but I will match the original UI pixel-for-pixel by:
- Recreating every page/route in `src/routes/`
- Copying over components, hooks, and utilities
- Preserving fonts, colors, spacing, and assets
- Replacing Next.js-specific APIs (`getServerSideProps`, `getStaticProps`, App Router patterns, `next/image`, `next/head`, etc.) with TanStack Start equivalents (`createFileRoute`, `head()`, `createServerFn`, standard `<img>`/`<link>`).

## Steps

### 1. Connect GitHub
- Use the GitHub connector to access the private repo `jobamultiltd-wq/jobaacadportal`.
- Verify the connection can read repository contents.

### 2. Inspect the source repo
- Fetch the root file tree and `package.json` to confirm the framework (Next.js version, routing mode, UI libraries, styling approach).
- Identify all routes, components, public assets, and dependencies.

### 3. Port the project
- Install any required npm dependencies that are compatible with the Lovable edge runtime.
- Copy/rewrite components and pages into `src/routes/` and `src/components/`.
- Migrate styles (CSS modules, Tailwind config, global CSS, styled-components, etc.) into `src/styles.css` and theme tokens.
- Recreate `public/` assets (images, fonts, favicon, etc.).
- Replace Next.js-specific imports and APIs with TanStack Start patterns.

### 4. Validate and test
- Run the build/typecheck to catch missing imports or incompatible packages.
- Open the live preview and compare key pages against the original.
- Fix any runtime errors or visual mismatches.

## Out of scope (unless you ask)
- Backend/database logic that depends on Vercel-specific features (e.g., Vercel KV, Edge Config) will be stubbed or discussed before replacement.
- Environment variables/secrets will be listed for you to re-enter, not auto-migrated.
