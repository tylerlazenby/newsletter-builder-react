import net from 'node:net'
import tls from 'node:tls'
import { randomBytes } from 'node:crypto'
import type { CompiledEmail } from './types'

/**
 * Options for {@link sendDevEmail}.
 *
 * @remarks
 * **DEVELOPMENT ONLY.** See {@link sendDevEmail} for the deliverability warning.
 */
export interface SendDevEmailOptions {
  /** Recipient address or addresses. */
  to: string | string[]
  /** Sender address, e.g. `"Acme <hello@example.com>"` or `hello@example.com`. */
  from: string
  /** The compiled email from {@link compileNewsletter}. */
  email: Pick<CompiledEmail, 'html' | 'text' | 'subject'>
  /** SMTP server connection details. For local testing use Mailpit, MailHog or Mailtrap. */
  smtp: {
    host: string
    /** @defaultValue 587 (or 465 when `secure` is true) */
    port?: number
    /** Use implicit TLS from the first byte (usually port 465). @defaultValue false */
    secure?: boolean
    /** Upgrade the connection with STARTTLS when the server offers it. @defaultValue true */
    startTls?: boolean
    auth?: { user: string; pass: string }
    /** Skip certificate validation. Only for self-signed local servers. @defaultValue false */
    allowSelfSigned?: boolean
    /** Socket timeout in milliseconds. @defaultValue 15000 */
    timeoutMs?: number
  }
  /** Optional `Reply-To` header. */
  replyTo?: string
  /** Extra headers, for example `{ 'List-Unsubscribe': '<mailto:unsub@example.com>' }`. */
  headers?: Record<string, string>
}

/**
 * Result of {@link sendDevEmail}.
 */
export interface SendDevEmailResult {
  /** The `Message-ID` header that was generated. */
  messageId: string
  /** Addresses the server accepted. */
  accepted: string[]
  /** The server's final response to the message body, e.g. `250 OK queued`. */
  response: string
}

function bareAddress(value: string): string {
  const open = value.indexOf('<')
  if (open !== -1) {
    const close = value.indexOf('>', open + 1)
    if (close > open + 1) return value.slice(open + 1, close).trim()
  }
  return value.trim()
}

function assertNoLineBreaks(label: string, value: string): void {
  if (/[\r\n]/.test(value)) throw new Error(`sendDevEmail: ${label} must not contain line breaks.`)
}

function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function wrapBase64(text: string): string {
  return (Buffer.from(text, 'utf8').toString('base64').match(/.{1,76}/g) ?? []).join('\r\n')
}

function buildMessage(options: SendDevEmailOptions, messageId: string): string {
  const { email, from } = options
  const to = Array.isArray(options.to) ? options.to : [options.to]
  const boundary = `nb_${randomBytes(12).toString('hex')}`
  const headers: string[] = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${encodeHeader(email.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
  if (options.replyTo) headers.push(`Reply-To: ${options.replyTo}`)
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    assertNoLineBreaks(`header "${name}"`, name + value)
    headers.push(`${name}: ${value}`)
  }
  const part = (type: string, body: string) =>
    [`--${boundary}`, `Content-Type: ${type}; charset=UTF-8`, 'Content-Transfer-Encoding: base64', '', wrapBase64(body)].join('\r\n')
  return [headers.join('\r\n'), '', part('text/plain', email.text), part('text/html', email.html), `--${boundary}--`, ''].join('\r\n')
}

class SmtpConnection {
  private socket: net.Socket | tls.TLSSocket
  private buffer = ''
  private waiting: Array<{ resolve: (reply: string) => void; reject: (error: Error) => void }> = []
  private replies: string[] = []
  private failure: Error | null = null

  constructor(socket: net.Socket | tls.TLSSocket, private readonly timeoutMs: number) {
    this.socket = socket
    this.attach(socket)
  }

  private attach(socket: net.Socket | tls.TLSSocket): void {
    socket.setTimeout(this.timeoutMs, () => this.fail(new Error('SMTP connection timed out.')))
    socket.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8')
      let index: number
      while ((index = this.buffer.indexOf('\r\n')) !== -1) {
        const line = this.buffer.slice(0, index)
        this.buffer = this.buffer.slice(index + 2)
        this.lines.push(line)
        if (/^\d{3} /.test(line)) {
          const reply = this.lines.join('\n')
          this.lines = []
          this.deliver(reply)
        }
      }
    })
    socket.on('error', (error) => this.fail(error))
    socket.on('close', () => this.fail(new Error('SMTP connection closed unexpectedly.')))
  }

  private lines: string[] = []

  private deliver(reply: string): void {
    const next = this.waiting.shift()
    if (next) next.resolve(reply)
    else this.replies.push(reply)
  }

  private fail(error: Error): void {
    if (this.failure) return
    this.failure = error
    for (const waiter of this.waiting.splice(0)) waiter.reject(error)
  }

  read(): Promise<string> {
    const queued = this.replies.shift()
    if (queued !== undefined) return Promise.resolve(queued)
    if (this.failure) return Promise.reject(this.failure)
    return new Promise((resolve, reject) => this.waiting.push({ resolve, reject }))
  }

  async command(line: string, expect: number[]): Promise<string> {
    this.socket.write(`${line}\r\n`)
    return this.expect(expect)
  }

  async expect(codes: number[]): Promise<string> {
    const reply = await this.read()
    const code = Number(reply.slice(0, 3))
    if (!codes.includes(code)) throw new Error(`SMTP error: ${reply}`)
    return reply
  }

  writeRaw(data: string): void {
    this.socket.write(data)
  }

  upgrade(host: string, allowSelfSigned: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.removeAllListeners('data')
      this.socket.removeAllListeners('close')
      this.socket.removeAllListeners('error')
      const secure = tls.connect({ socket: this.socket as net.Socket, servername: host, rejectUnauthorized: !allowSelfSigned }, () => {
        this.socket = secure
        this.buffer = ''
        this.lines = []
        this.attach(secure)
        resolve()
      })
      secure.once('error', reject)
    })
  }

  close(): void {
    this.socket.destroy()
  }
}

/**
 * **DEVELOPMENT ONLY.** Sends a compiled email through a plain SMTP server using
 * only Node built-ins (`node:net`, `node:tls`).
 *
 * @param options - Sender, recipients, compiled email and SMTP connection details.
 * @returns The generated message id, accepted recipients and the final server response.
 * @throws When a header contains line breaks, the connection fails, authentication fails
 * or any recipient is rejected.
 *
 * @remarks
 * This helper exists so you can see a template arrive in a local inbox such as
 * Mailpit, MailHog or Mailtrap while you build. It is **not** a production
 * mailer: no queue, retries, pooling, bounce handling, DKIM signing or rate limiting.
 *
 * **Warning - production deliverability.** Sending real email from your own
 * server without a matching reverse DNS (PTR) record, correct SPF, DKIM and
 * DMARC DNS TXT records, and a properly warmed-up IP address and domain will
 * place your messages in spam folders or get them rejected outright. Use a
 * transactional provider (SMTP2GO, Bird, Postmark, SES and similar) for
 * production traffic and pass them the same `{ html, text, subject }` payload.
 *
 * Import it from `newsletter-builder-react/node` in server code only. It is
 * deliberately not exported from the main entry so browser bundles never see
 * Node modules.
 *
 * @example
 * ```ts
 * import { compileNewsletter, createWelcomeTemplate } from 'newsletter-builder-react'
 * import { sendDevEmail } from 'newsletter-builder-react/node'
 *
 * const email = compileNewsletter(createWelcomeTemplate(), { variables: { firstName: 'Ada' } })
 * await sendDevEmail({
 *   from: 'Acme <dev@localhost>',
 *   to: 'ada@example.com',
 *   email,
 *   smtp: { host: 'localhost', port: 1025, startTls: false }, // Mailpit
 * })
 * ```
 */
export async function sendDevEmail(options: SendDevEmailOptions): Promise<SendDevEmailResult> {
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[newsletter-builder] sendDevEmail() is for development only. Configure PTR, SPF, DKIM, DMARC and IP warm-up and use a transactional provider in production.',
    )
  }
  const { smtp } = options
  const recipients = (Array.isArray(options.to) ? options.to : [options.to]).map((entry) => entry.trim()).filter(Boolean)
  if (recipients.length === 0) throw new Error('sendDevEmail: at least one recipient is required.')
  for (const value of [options.from, options.email.subject, options.replyTo ?? '', ...recipients]) assertNoLineBreaks('address or subject', value)

  const timeoutMs = smtp.timeoutMs ?? 15000
  const port = smtp.port ?? (smtp.secure ? 465 : 587)
  const domain = bareAddress(options.from).split('@')[1] ?? 'localhost'
  const messageId = `<${randomBytes(12).toString('hex')}@${domain}>`
  const message = buildMessage(options, messageId)

  const socket = await new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
    const connection = smtp.secure
      ? tls.connect({ host: smtp.host, port, servername: smtp.host, rejectUnauthorized: !smtp.allowSelfSigned }, () => resolve(connection))
      : net.connect({ host: smtp.host, port }, () => resolve(connection))
    connection.once('error', reject)
  })

  const smtpConnection = new SmtpConnection(socket, timeoutMs)
  try {
    await smtpConnection.expect([220])
    let hello = await smtpConnection.command('EHLO localhost', [250])
    if (!smtp.secure && smtp.startTls !== false && /STARTTLS/i.test(hello)) {
      await smtpConnection.command('STARTTLS', [220])
      await smtpConnection.upgrade(smtp.host, smtp.allowSelfSigned ?? false)
      hello = await smtpConnection.command('EHLO localhost', [250])
    }
    if (smtp.auth) {
      const credentials = Buffer.from(`\0${smtp.auth.user}\0${smtp.auth.pass}`, 'utf8').toString('base64')
      await smtpConnection.command(`AUTH PLAIN ${credentials}`, [235])
    }
    await smtpConnection.command(`MAIL FROM:<${bareAddress(options.from)}>`, [250])
    const accepted: string[] = []
    for (const recipient of recipients) {
      await smtpConnection.command(`RCPT TO:<${bareAddress(recipient)}>`, [250, 251])
      accepted.push(recipient)
    }
    await smtpConnection.command('DATA', [354])
    const stuffed = message.replace(/^\./gm, '..')
    smtpConnection.writeRaw(`${stuffed}\r\n.\r\n`)
    const response = await smtpConnection.expect([250])
    await smtpConnection.command('QUIT', [221]).catch(() => undefined)
    return { messageId, accepted, response }
  } finally {
    smtpConnection.close()
  }
}
