import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const backend = resolve('../5-3-backend-implementation')
const auth = readFileSync(resolve(backend, 'src/lib/auth/index.ts'), 'utf8')
const route = readFileSync(resolve(backend, 'src/app/api/chat/route.ts'), 'utf8')
console.log(JSON.stringify({
  check: 'Read-only source and installed binary checks; no .env or credentials read',
  backend,
  nextBinaryExists: existsSync(resolve(backend, 'node_modules/.bin/next')),
  authUsesDevelopmentPlaceholder: auth.includes('const devId = process.env.DEV_AUTH_USER_ID'),
  authSourceStatesSupabaseNotConnected: auth.includes('Supabase 项目 env 也未接通'),
  requestFields: ['knowledgeBaseId', 'sessionId', 'question', 'conversationId?'],
  customSSEEvents: ['token', 'meta', 'done', 'error'].filter(event => route.includes(`sseFrame("${event}"`)),
  realBackendRun: false,
  externalDatabaseAndModelConfigChecked: false,
  upstreamCancellationVerified: false,
  status: 'Not integrated; frontend Mock verification does not establish backend success',
}, null, 2))
