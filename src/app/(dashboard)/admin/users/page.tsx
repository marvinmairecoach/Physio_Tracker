"use client"

import { useEffect, useState } from "react"
import { Shield, Trash2, Plus, X, Pencil } from "lucide-react"

import { Button, Card, Table, Badge, TextInput, Modal, Checkbox } from "@mantine/core"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "admin" | "coach" | "athlete"
  phone: string | null
  isActive: boolean
  createdAt: string
  roleAssignments?: Array<{ role: { id: string; name: string } }>
  _count: { athletes: number; teams: number }
}

interface UserRole {
  id: string
  name: string
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

  // Flexible role management
  const [allRoles, setAllRoles] = useState<UserRole[]>([])
  const [roleEditTarget, setRoleEditTarget] = useState<User | null>(null)
  const [roleEditCheckedIds, setRoleEditCheckedIds] = useState<string[]>([])
  const [savingRoles, setSavingRoles] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchRoles()
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

  async function fetchRoles() {
    try {
      const res = await fetch("/api/users/roles")
      if (res.ok) {
        const data = await res.json()
        setAllRoles(data ?? [])
      }
    } catch {
      // silently ignore
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

  async function handleSaveRoles() {
    if (!roleEditTarget) return
    setSavingRoles(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${roleEditTarget.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds: roleEditCheckedIds }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Erreur")
      }
      setRoleEditTarget(null)
      fetchUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSavingRoles(false)
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
                <Table.Th>Rôles</Table.Th>
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
                      <div className="flex items-center gap-1 flex-wrap">
                        {(u.roleAssignments ?? []).length > 0
                          ? u.roleAssignments!.map((ra) => (
                              <Badge key={ra.role.id} color="blue" size="sm" variant="light">
                                {ra.role.name}
                              </Badge>
                            ))
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
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
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="compact-sm"
                          onClick={() => {
                            setRoleEditTarget(u)
                            setRoleEditCheckedIds(
                              (u.roleAssignments ?? []).map((ra) => ra.role.id)
                            )
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="compact-sm"
                          className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Edit roles dialog */}
      <Modal
        opened={!!roleEditTarget}
        onClose={() => setRoleEditTarget(null)}
        title={`Rôles de ${roleEditTarget?.firstName ?? ""} ${roleEditTarget?.lastName ?? ""}`}
        size="md"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Sélectionnez les rôles attribués à cet utilisateur.
        </p>
        <div className="space-y-2">
          {allRoles.map((r) => (
            <Checkbox
              key={r.id}
              label={r.name}
              checked={roleEditCheckedIds.includes(r.id)}
              onChange={(e) => {
                setRoleEditCheckedIds((prev) =>
                  e.currentTarget.checked
                    ? [...prev, r.id]
                    : prev.filter((id) => id !== r.id)
                )
              }}
            />
          ))}
          {allRoles.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun rôle défini.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setRoleEditTarget(null)}>
            Annuler
          </Button>
          <Button onClick={handleSaveRoles} disabled={savingRoles}>
            {savingRoles ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}