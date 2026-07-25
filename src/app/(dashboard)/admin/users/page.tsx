"use client"

import { useEffect, useState } from "react"
import { Shield, Trash2, Plus, X } from "lucide-react"

import { Button, Card, Table, Badge, TextInput, Modal } from "@mantine/core"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "admin" | "coach" | "athlete"
  phone: string | null
  isActive: boolean
  createdAt: string
  _count: { athletes: number; teams: number }
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  athlete: "Athlète",
}

const ROLE_COLORS: Record<string, "blue" | "green" | "gray"> = {
  admin: "blue",
  coach: "green",
  athlete: "gray",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "coach",
  })
  const [creating, setCreating] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Role change
  const [changingRole, setChangingRole] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch {
      setError("Impossible de charger les utilisateurs")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur")
      }
      setCreateOpen(false)
      setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "coach" })
      fetchUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setCreating(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setChangingRole(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) throw new Error("Erreur")
      fetchUsers()
    } catch {
      // ignore
    } finally {
      setChangingRole(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur")
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground mt-1">
            Administrer les comptes, rôles et permissions
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Card withBorder className="max-w-none">
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold">Utilisateurs ({users.length})</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gère les accès à l&apos;application. Les athlètes voient uniquement leur équipe et leur profil.
          </p>
        </div>
        <div className="px-6 pb-6 overflow-x-auto">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Rôle</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Créé le</Table.Th>
                <Table.Th className="text-right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6} className="text-center text-muted-foreground">
                    Aucun utilisateur
                  </Table.Td>
                </Table.Tr>
              ) : (
                users.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td className="font-medium">
                      {u.firstName} {u.lastName}
                    </Table.Td>
                    <Table.Td className="text-sm text-muted-foreground">{u.email}</Table.Td>
                    <Table.Td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={changingRole === u.id}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="admin">Admin</option>
                        <option value="coach">Coach</option>
                        <option value="athlete">Athlète</option>
                      </select>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={u.isActive ? "green" : "gray"} size="sm">
                        {u.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </Table.Td>
                    <Table.Td className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    </Table.Td>
                    <Table.Td className="text-right">
                      <Button
                        variant="outline"
                        size="compact-sm"
                        className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Card>

      {/* Create user dialog */}
      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel utilisateur" size="md">
        <p className="text-sm text-muted-foreground mb-4">
          Crée un compte pour un coach, admin ou athlète.
        </p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Prénom"
              id="fn"
              value={newUser.firstName}
              onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))}
              required
            />
            <TextInput
              label="Nom"
              id="ln"
              value={newUser.lastName}
              onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))}
              required
            />
          </div>
          <TextInput
            label="Email"
            id="email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <TextInput
            label="Mot de passe"
            id="pwd"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
            placeholder="Minimum 6 caractères"
            required
          />
          <TextInput
            label="Rôle"
            id="role"
            component="select"
            value={newUser.role}
            onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
          >
            <option value="admin">Admin</option>
            <option value="coach">Coach</option>
            <option value="athlete">Athlète</option>
          </TextInput>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete dialog */}
      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer l'utilisateur" size="md">
        <p className="text-sm text-muted-foreground">
          Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> ?
          Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}