import { useState } from "react";
import { Plus, Phone, X } from "lucide-react";
import { useFamilyData, genId } from "@/lib/store";

const Family = () => {
  const { data, update } = useFamilyData();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Member", phone: "" });

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
          avatar: "👤",
        },
      ],
    }));
    setForm({ name: "", role: "Member", phone: "" });
    setShowAdd(false);
  };

  const removeMember = (id: string) =>
    update((d) => ({ ...d, members: d.members.filter((m) => m.id !== id) }));

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-serif font-semibold">Family Members</h1>
          <p className="text-sm text-muted-foreground">
            {data.members.length} members · {data.members.filter((m) => m.phone).length} phones linked
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card rounded-2xl p-4 border border-border mb-6 animate-slide-up space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Add Member</p>
            <button onClick={() => setShowAdd(false)} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
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
            <option>Parent</option>
            <option>Child</option>
            <option>Member</option>
          </select>
          <input
            placeholder="Phone (e.g. +16465551234)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addMember}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Add Member
          </button>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-3">
        {data.members.map((member, i) => (
          <div
            key={member.id}
            className="bg-card rounded-2xl p-4 border border-border flex items-center gap-4 animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl">
              {member.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{member.name}</p>
              <p className="text-xs text-muted-foreground">{member.role}</p>
              {member.phone && (
                <div className="flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3 text-primary" />
                  <p className="text-xs text-primary">{member.phone}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => removeMember(member.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Family;
