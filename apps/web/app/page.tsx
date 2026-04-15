'use client';

import { ability } from '@/lib/ability';
import { useGetUsers } from '@/services/users/hooks';

export default function Home() {
  const { data: users, isLoading, error } = useGetUsers();

  return (
    <div className="min-h-screen p-8">
      <main className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-lg font-semibold">CASL Permission Demo (role: user)</h3>
          <p>Can read users: {ability.can('read', 'User') ? 'Yes' : 'No'}</p>
          <p>Can create users: {ability.can('create', 'User') ? 'Yes' : 'No'}</p>
          <p>Can manage all: {ability.can('manage', 'all') ? 'Yes' : 'No'}</p>
          {ability.can('manage', 'all') && (
            <p className="mt-2 font-bold">Admin panel visible</p>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-lg font-semibold">Users from API</h3>
          {isLoading && <p className="text-muted-foreground">Loading users...</p>}
          {error && <p className="text-destructive">Error: {error.message}</p>}
          {users && users.length === 0 && <p className="text-muted-foreground">No users yet.</p>}
          {users && users.length > 0 && (
            <ul className="space-y-2">
              {users.map((user) => (
                <li key={user.id} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <span className="font-medium">{user.name ?? user.email}</span>
                    <span className="ml-2 text-sm text-muted-foreground">{user.email}</span>
                  </div>
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs">{user.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
