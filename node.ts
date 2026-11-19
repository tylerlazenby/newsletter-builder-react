/**
 * Server-only entry point (`newsletter-builder-react/node`).
 *
 * @remarks
 * Contains the **development-only** {@link sendDevEmail} helper, which depends on
 * Node built-ins. It is kept out of the main barrel so client bundles stay clean.
 *
 * @packageDocumentation
 */
export { sendDevEmail } from './send-dev-email'
export type { SendDevEmailOptions, SendDevEmailResult } from './send-dev-email'
export { compileNewsletter } from './compiler'
