"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Send, Paperclip } from "lucide-react"

import { Button, Card, TextInput, Textarea, Checkbox, Text, Group } from "@mantine/core"

interface DirigeantRole {
  role: {
    id: string
    name: string
  }
}

interface Dirigeant {
  id: string
  firstName: string
  lastName: string
  email: string | null
  roles: DirigeantRole[]
}

interface Attachment {
  filename: string
  content: string
}

export default function EmailDirigeantsPage() {
  const router = useRouter()
  const [dirigeants, setDirigeants] = useState<Dirigeant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Form
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    async function fetchDirigeants() {
      try {
        const res = await fetch("/api/dirigeants")
        if (!res.ok) throw new Error("Erreur lors du chargement des dirigeants")
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.dirigeants ?? []
        setDirigeants(list)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue")
      } finally {
        setLoading(false)
      }
    }
    fetchDirigeants()
  }, [])

  const dirigeantsWithEmail = dirigeants.filter((d) => d.email)
  const allSelected = selectedIds.length === dirigeantsWithEmail.length && dirigeantsWithEmail.length > 0

  function selectAll() {
    setSelectedIds(dirigeantsWithEmail.map((d) => d.id))
  }

  function deselectAll() {
    setSelectedIds([])
  }

  function toggleDirigeant(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setAttachment(null)
      return
    }
    try {
      const content = await fileToBase64(file)
      setAttachment({ filename: file.name, content })
    } catch {
      setError("Erreur lors de la lecture du fichier")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.length === 0) {
      setError("Veuillez sélectionner au moins un destinataire")
      return
    }
    if (!subject.trim()) {
      setError("Veuillez saisir un sujet")
      return
    }
    if (!body.trim()) {
      setError("Veuillez saisir un message")
      return
    }
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      const payload: {
        recipientIds: string[]
        subject: string
        body: string
        attachment?: Attachment
      } = {
        recipientIds: selectedIds,
        subject: subject.trim(),
        body: body.trim(),
      }
      if (attachment) {
        payload.attachment = attachment
      }
      const res = await fetch("/api/dirigeants/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur lors de l'envoi")
      }
      setSuccess(`Email envoyé avec succès à ${selectedIds.length} dirigeant(s)`)
      setSubject("")
      setBody("")
      setAttachment(null)
      setSelectedIds([])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/dirigeants")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Envoyer un email</h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-2xl">
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Destinataires</h2>
          <p className="text-sm text-gray-500">
            Sélectionnez les dirigeants à qui envoyer l&apos;email.
          </p>
        </Card.Section>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" size="compact-sm" onClick={selectAll}>
              Tout sélectionner
            </Button>
            <Button variant="outline" size="compact-sm" onClick={deselectAll}>
              Tout désélectionner
            </Button>
            <Text size="sm" c="dimmed" ml="auto">
              {selectedIds.length} dirigeant(s) sélectionné(s)
            </Text>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {dirigeantsWithEmail.length === 0 ? (
              <Text c="dimmed" size="sm">Aucun dirigeant avec email</Text>
            ) : (
              dirigeantsWithEmail.map((d) => (
                <div key={d.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={selectedIds.includes(d.id)}
                    onChange={() => toggleDirigeant(d.id)}
                    label={`${d.firstName} ${d.lastName} — ${d.email}`}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder className="max-w-2xl">
        <Card.Section withBorder inheritPadding py="sm">
          <h2 className="text-xl font-semibold">Message</h2>
        </Card.Section>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <TextInput
            label="Sujet"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Sujet de l'email"
            required
          />

          <Textarea
            label="Corps du message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Écrivez votre message ici..."
            minRows={6}
            required
          />

          <div>
            <Text fw={500} size="sm" mb="xs">Pièce jointe</Text>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  component="span"
                  leftSection={<Paperclip className="h-4 w-4" />}
                >
                  Ajouter une pièce jointe
                </Button>
              </label>
              {attachment && (
                <Text size="sm" c="dimmed">{attachment.filename}</Text>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              loading={sending}
              disabled={selectedIds.length === 0}
            >
              <Send className="mr-2 h-4 w-4" />
              {sending
                ? "Envoi..."
                : `Envoyer à ${selectedIds.length} dirigeant(s)`
              }
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dirigeants")}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}