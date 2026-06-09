'use client'

import { Suspense } from 'react'
import { SonanceSignIn } from '@danainnovations/sonance-auth'

function SignInContent() {
  return <SonanceSignIn appName="Sonance Org Matrix Builder" />
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  )
}
