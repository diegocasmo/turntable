import { once } from 'node:events'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Register } from '@tanstack/react-router'
import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from '@tanstack/react-start/server'
import { loadConfig, productionEnvironment, readPort } from './config.server'
import { createNonce, createSecurityHeaders } from './security-headers'

const config = loadConfig(import.meta.env.PROD ? productionEnvironment(process.env) : process.env)
const fetch = createStartHandler(defaultStreamHandler)

export default { fetch } satisfies { fetch: RequestHandler<Register> }

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startProductionServer()
}

function startProductionServer() {
  const clientRoot = resolve(fileURLToPath(new URL('../client/', import.meta.url)))
  createServer(async (nodeRequest, nodeResponse) => {
    try {
      const request = await createWebRequest(nodeRequest)

      if (await serveStaticFile(request, nodeResponse, clientRoot)) {
        return
      }

      const response = await fetch(request)
      nodeResponse.statusCode = response.status
      nodeResponse.setHeaders(withSecurityHeaders(response.headers))

      if (response.body === null) {
        nodeResponse.end()
        return
      }

      await writeResponseBody(response.body, nodeResponse)
    } catch {
      if (!nodeResponse.headersSent) {
        nodeResponse.statusCode = 500
        nodeResponse.setHeaders(withSecurityHeaders(new Headers()))
      }

      nodeResponse.end()
    }
  }).listen(readPort(process.env.PORT), '0.0.0.0')
}

async function createWebRequest(nodeRequest: IncomingMessage) {
  const headers = new Headers()

  for (const [name, value] of Object.entries(nodeRequest.headers)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      headers.append(name, item)
    }
  }

  const parsedUrl = new URL(nodeRequest.url ?? '/', config.appOrigin)
  const requestUrl = new URL(`${parsedUrl.pathname}${parsedUrl.search}`, config.appOrigin)
  const method = nodeRequest.method ?? 'GET'
  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await readRequestBody(nodeRequest)

  return new Request(requestUrl, { headers, method, ...(body === undefined ? {} : { body }) })
}

async function readRequestBody(request: IncomingMessage) {
  let body = ''

  for await (const chunk of request) {
    body += chunk
    if (Buffer.byteLength(body) > 65_536) throw new Error('Request body is too large.')
  }

  return body
}

async function writeResponseBody(body: ReadableStream<Uint8Array>, response: ServerResponse) {
  const reader = body.getReader()
  response.on('close', () => void reader.cancel())
  let result = await reader.read()

  while (!result.done) {
    if (!response.write(result.value)) {
      await once(response, 'drain')
    }

    result = await reader.read()
  }

  response.end()
}

async function serveStaticFile(request: Request, response: ServerResponse, root: string) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false

  const path = resolve(root, `.${new URL(request.url).pathname}`)

  if (!path.startsWith(`${root}${sep}`)) return false

  const file = await stat(path).catch(() => null)

  if (file === null || !file.isFile()) return false

  const headers = withSecurityHeaders(new Headers())
  const cache = path.includes(`${sep}assets${sep}`)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache'
  headers.set('Cache-Control', cache)
  headers.set('Content-Length', String(file.size))
  headers.set('Content-Type', contentTypes[extname(path)] ?? 'application/octet-stream')
  response.setHeaders(headers)

  if (request.method === 'HEAD') response.end()
  else
    createReadStream(path)
      .on('error', () => response.destroy())
      .pipe(response)

  return true
}

function withSecurityHeaders(source: Headers) {
  const headers = new Headers(createSecurityHeaders(createNonce()))

  for (const [name, value] of source) {
    headers.set(name, value)
  }

  return headers
}

const contentTypes: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}
