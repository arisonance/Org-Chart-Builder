import NextAuth from 'next-auth'
import type { Provider } from '@auth/core/providers'
import Okta from 'next-auth/providers/okta'
import Credentials from 'next-auth/providers/credentials'

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

const providers: Provider[] = [
  Okta({
    clientId: process.env.OKTA_CLIENT_ID ?? "",
    clientSecret: process.env.OKTA_CLIENT_SECRET ?? "",
    issuer: `https://${process.env.OKTA_DOMAIN ?? ""}`,
  }),
]

// Dev bypass — only available when AUTH_BYPASS=true and not in production
if (process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
  providers.push(
    Credentials({
      id: 'dev-bypass',
      name: 'Dev Bypass',
      credentials: {},
      authorize: () => ({
        id: 'dev-user',
        name: 'Dev User',
        email: 'dev@sonance.com',
        image: null,
      }),
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: authSecret,
  trustHost: true,
  pages: { signIn: '/signin' },
  callbacks: {
    authorized: ({ auth }) => {
      if (process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') return true
      return !!auth
    },
  },
})
