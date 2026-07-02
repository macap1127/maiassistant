import { useState } from "react";
import { Plus, Phone, X, Pencil, Crown, Check } from "lucide-react";
import { useFamilyData, genId, type FamilyMember } from "@/lib/store";
import HouseholdLogins from "@/components/HouseholdLogins";

const AVATAR_CHOICES = [
  "👤", "🧑", "👩", "👨", "👧", "👦", "👶", "👵", "👴",
  "🧑‍🦱", "👩‍🦰", "👨‍🦳", "🐶", "🐱", "🦊", "🐻", "🐼", "🦁",
];

const ROLES = ["Parent", "Child", "Member", "Caregiver", "Other"];

const ROLE_TONE: Record<string, string> = {
  Parent: "bg-primary/15 text-primary",
  Child: "bg-accent text-accent-foreground",
  Member: "bg-secondary text-secondary-foreground",
  Caregiver: "bg-info/15 text-info",
  Other: "bg-muted text-muted-foreground",
};

const Family = () => {
  const { data, update } = useFamilyData();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    role: string;
    phone: string;
    avatar: string;
  }>({ name: "", role: "Member", phone: "", avatar: "👤" });

  const resetForm = () =>
    setForm({ name: "", role: "Member", phone: "", avatar: "👤" });

  const addMember = () => {
    if (!form.name.trim()) return;
    update((d) => ({
      ...d,
      members: [
        ...d.members,
        {
          id: genId(),
          name: form.name.trim(),
          role: form.role,
          phone: form.phone.trim(),
          avatar: form.avatar,
        },
      ],
    }));
    resetForm();
    setShowAdd(false);
  };

  const removeMember = (id: string) =>
    update((d) => ({ ...d, members: d.members.filter((m) => m.id !== id) }));

  const startEdit = (m: FamilyMember) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      role: m.role,
      phone: m.phone,
      avatar: m.avatar || "👤",
    });
    setShowAdd(false);
  };

  const saveEdit = () => {
    if (!editingId || !form.name.trim()) return;
    update((d) => ({
      ...d,
      members: d.members.map((m) =>
        m.id === editingId
          ? {
              ...m,
              name: form.name.trim(),
              role: form.role,
              phone: form.phone.trim(),
              avatar: form.avatar,
            }
          : m
      ),
    }));
    setEditingId(null);
    resetForm();
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Family</h1>
          <p className="text-sm text-muted-foreground">
            {data.members.length}{" "}
            {data.members.length === 1 ? "member" : "members"} ·{" "}
            {data.members.filter((m) => m.phone).length} phones linked
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAdd(true);
            setEditingId(null);
          }}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="Add member"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <HouseholdLogins />

      {showAdd && (
        <MemberForm
          form={form}
          setForm={setForm}
          onCancel={() => {
            setShowAdd(false);
            resetForm();
          }}
          onSubmit={addMember}
          submitLabel="Add Member"
        />
      )}

      {/* Empty state */}
      {!showAdd && data.members.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-5xl mb-3">👨‍👩‍👧</div>
          <p className="text-sm text-muted-foreground">
            No members yet. Tap + to add the first one.
          </p>
        </div>
      )}

      {/* Members */}
      <div className="space-y-3">
        {data.members.map((member, i) => {
          const isOwner = i === 0;
          const isEditing = editingId === member.id;
          if (isEditing) {
            return (
              <MemberForm
                key={member.id}
                form={form}
                setForm={setForm}
                onCancel={() => {
                  setEditingId(null);
                  resetForm();
                }}
                onSubmit={saveEdit}
                submitLabel="Save"
              />
            );
          }
          return (
            <div
              key={member.id}
              className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4 animate-slide-up group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-2xl shrink-0">
                {member.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-medium truncate">{member.name}</p>
                  {isOwner && (
                    <span
                      className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-warning/15 text-warning-foreground"
                      title="Household owner"
                    >
                      <Crown className="w-2.5 h-2.5" />
                      Owner
                    </span>
                  )}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      ROLE_TONE[member.role] || ROLE_TONE.Other
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3 text-primary" />
                    <p className="text-xs text-primary">{member.phone}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(member)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {!isOwner && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    aria-label="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function MemberForm({
  form,
  setForm,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  form: { name: string; role: string; phone: string; avatar: string };
  setForm: (
    f: { name: string; role: string; phone: string; avatar: string }
  ) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border mb-4 animate-slide-up space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{submitLabel}</p>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Avatar picker */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
          Avatar
        </p>
        <div className="grid grid-cols-9 gap-1">
          {AVATAR_CHOICES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setForm({ ...form, avatar: a })}
              className={`h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${
                form.avatar === a
                  ? "bg-primary/15 ring-1 ring-primary"
                  : "bg-background hover:bg-secondary"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <input
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <select
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {ROLES.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <input
        placeholder="Phone (e.g. +16465551234)"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        onClick={onSubmit}
        disabled={!form.name.trim()}
        className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        <Check className="w-4 h-4" />
        {submitLabel}
      </button>
    </div>
  );
}

export default Family;
