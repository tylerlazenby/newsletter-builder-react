# newsletter-builder-react

A **free, open-source (MIT)** visual email newsletter builder for React.

Drag blocks onto a canvas, edit rich text, preview light and dark mode, and export **email-safe, table-based HTML with inlined CSS** plus a plain-text fallback. It is a template and HTML generator only. It never sends email, so there is **no vendor lock-in**: pass `{ html, text, subject }` to SMTP2GO, Bird, Mailchimp, HubSpot, ActiveCampaign, Nodemailer or anything else.

## Features

- Drag-and-drop canvas with multi-column rows, headings, rich text, buttons, dividers, spacers, images (URL or upload, alt text, width) and a configurable unsubscribe and compliance footer
- Compiler output uses nested `<table>` layouts and inline CSS. No Flexbox, Grid or external stylesheets
- Plain-text generator and a built-in linter (alt text, unsubscribe link, Gmail 102 KB clipping and more)
- Colour schemes, email-safe font stacks, and light/dark preview with `<meta name="color-scheme">` and `prefers-color-scheme` rules
- Merge tags such as `{{firstName}}` with runtime `variables` and preview-only `previewData`
- Guided UI: tooltips, empty-state hints and a dismissible quick-start walkthrough
- Strict TypeScript and TypeDoc comments on every export

## Install

```bash
npm install newsletter-builder-react
```

## Usage

```tsx
'use client'
import { NewsletterBuilder, createWelcomeTemplate } from 'newsletter-builder-react'
import 'newsletter-builder-react/styles.css'

export default function Editor() {
  return (
    <div style={{ height: '100vh' }}>
      <NewsletterBuilder
        initialDocument={createWelcomeTemplate()}
        variables={{ unsubscribeUrl: 'https://example.com/u/123' }}
        onChange={(doc) => save(doc)}
      />
    </div>
  )
}
```

Compile anywhere (server, edge, scripts):

```ts
import { compileNewsletter } from 'newsletter-builder-react'

const { html, text, subject } = compileNewsletter(doc, {
  variables: { firstName: 'Ada' },
})
```

Preview with sample data:

```tsx
<NewsletterRenderer document={doc} previewData={{ firstName: 'Ada' }} colorMode="dark" device="mobile" />
```

## Development-only SMTP helper

```ts
import { sendDevEmail } from 'newsletter-builder-react/node'
```

> **Development only.** `sendDevEmail()` is for local inboxes such as Mailpit, MailHog or Mailtrap. Sending production email without reverse DNS (PTR), SPF, DKIM and DMARC DNS TXT records, and server/IP warm-up will put your messages in spam. Use a transactional provider in production.

## Documentation for AI assistants

See [`llms.txt`](./llms.txt) for a compact Markdown reference of the full API.

## Publishing

Update the version in `package.json` and `package-lock.json`, then create and
publish a GitHub Release with a matching `vX.Y.Z` tag. The GitHub Actions
workflow checks the tag against `package.json`, runs the type check and build,
and publishes the package to npm. Prereleases are not published.

Add an npm publishing token as the repository's `NPM_TOKEN` Actions secret
before publishing a release.

## Publishing this folder

This directory is self-contained. Copy it into its own repository, move the sources into `src/` (the `exports` map in `package.json` assumes `dist/`), add a `tsconfig.json` with `"strict": true`, and run `npm run build`.

## License

MIT
