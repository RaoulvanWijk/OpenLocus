import { Button } from '@openlocus/ui/components/button'
import { Input } from '@openlocus/ui/components/input'
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [greetMsg, setGreetMsg] = useState('')
  const [name, setName] = useState('')

  async function greet() {
    setGreetMsg(await invoke('greet', { name }))
  }

  return (
    <main>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          greet()
        }}
      >
        <Input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <Button type="submit">Greet</Button>
      </form>
      <p>{greetMsg}</p>
    </main>
  )
}
