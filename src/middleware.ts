import { auth } from '@/lib/auth'
export default auth

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
