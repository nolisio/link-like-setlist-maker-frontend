import { Suspense } from 'react'
import { SetlistMaker } from '@/features/setlist/components/SetlistMaker'

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center text-zinc-600">
          読み込み中
        </main>
      }
    >
      <SetlistMaker />
    </Suspense>
  )
}
