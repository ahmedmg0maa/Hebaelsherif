// Run locally. Passwords are never printed or saved by this script.
import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'

const email = process.env.OWNER_ADMIN_EMAIL?.trim().toLowerCase()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const secret =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!email || !url || !secret) {
  throw Error(
    'Configure OWNER_ADMIN_EMAIL, NEXT_PUBLIC_SUPABASE_URL and the server key in .env.local.'
  )
}

if (!process.argv.includes('--apply')) {
  console.log('Configuration loaded. No changes made. Run with --apply to continue.')
  process.exit(0)
}

const client = createClient(url, secret, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

let user = null

for (let page = 1; page <= 100; page++) {
  const { data, error } = await client.auth.admin.listUsers({
    page,
    perPage: 1000,
  })

  if (error) {
    throw Error('Cannot read Auth users. Check the project URL and server key.')
  }

  user = data.users.find(
    (item) => item.email?.toLowerCase() === email
  )

  if (user || data.users.length < 1000) break

  if (page === 100) {
    throw Error('User search limit reached. No account changes made.')
  }
}

if (!user) {
  const { data: owners, error } = await client
    .from('admin_roles')
    .select('user_id')
    .eq('role', 'owner')
    .limit(1)

  if (error) {
    throw Error(`Cannot check existing owner [${error.code}]: ${error.message}`)
  }

  if (owners?.length) {
    throw Error('An owner already exists. Use the existing owner identity.')
  }

  if (!process.stdin.isTTY) {
    throw Error('Run directly in an interactive terminal to enter the password.')
  }

  let muted = false

  const sink = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding)
      callback()
    },
  })

  const rl = createInterface({
    input: process.stdin,
    output: sink,
    terminal: true,
  })

  let password
  let confirmation

  try {
    process.stdout.write('New owner password (hidden, 14-128 characters): ')
    muted = true
    password = await rl.question('')

    process.stdout.write('\nConfirm password (hidden): ')
    confirmation = await rl.question('')
  } finally {
    rl.close()
    muted = false
    process.stdout.write('\n')
  }

  if (
    password !== confirmation ||
    password.length < 14 ||
    password.length > 128
  ) {
    throw Error('Passwords must match and contain 14-128 characters.')
  }

  const { data, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !data.user) {
    throw Error('Owner account creation failed. No permission grant attempted.')
  }

  user = data.user
  console.log('Auth account created. Enabling owner access...')
} else {
  console.log('Existing Auth account found. Password will remain unchanged.')
}

if (
  !user.email_confirmed_at ||
  (user.banned_until && Date.parse(user.banned_until) > Date.now())
) {
  throw Error('The account must be confirmed and not banned before enrollment.')
}

const { error } = await client.rpc('enroll_password_owner', {
  p_user: user.id,
})

if (error) {
  throw Error(`Owner enrollment failed [${error.code}]: ${error.message}`)
}

console.log('Owner password access enabled.')
console.log('Configure OWNER_ADMIN_EMAIL on the Worker before testing /auth/admin.')