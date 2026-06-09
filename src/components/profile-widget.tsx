"use client";

import { signOut, useSession } from "next-auth/react";

export function ProfileWidget() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  const displayName = user.name || user.email || "User";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
        {user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : initials}
      </div>
      <div className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="max-w-40 truncate font-semibold text-slate-900 dark:text-white">{displayName}</span>
        <span className="max-w-40 truncate text-xs text-slate-500 dark:text-slate-400">Signed in with Cortex</span>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/signin" })}
        className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
