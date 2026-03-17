import { Button } from '@openlocus/ui/components/button'
import { Input } from '@openlocus/ui/components/input'
import { createFileRoute, Link } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main>
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Open Locus</h1>
        <Link to="/notes">Edit notes</Link>
      </div>
    </main>
  )
}
