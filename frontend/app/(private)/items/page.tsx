"use client";
import { useAuth } from "@/store/auth";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Item = {
  _id: string;
  title: string;
  content: string;
};

export default function ItemsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // 🚫 Prevent super admin from accessing CRUD
  if (user?.isSuper) {
    return (
      <section className="page center">
        <p>Super admin cannot manage todos.</p>
      </section>
    );
  }

  // 🔁 Load items
  const load = async () => {
    try {
      setItems(await api("/items"));
    } catch (e: any) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ➕ Add new item
  const add = async (e: any) => {
    e.preventDefault();
    try {
      await api("/items", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
      setTitle("");
      setContent("");
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  // ✏️ Start editing
  const startEdit = (item: Item) => {
    setEditingId(item._id);
    setEditTitle(item.title);
    setEditContent(item.content);
  };

  // 💾 Save update
  const saveEdit = async (id: string) => {
    try {
      await api(`/items/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      setEditingId(null);
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  // ❌ Delete item
  const del = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await api(`/items/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <section className="stack">
      <h1>Todos</h1>

      {!!err && <p className="error">{err}</p>}

      {/* ➕ Add Form */}
      <form onSubmit={add} className="row gap">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <input
          className="input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content"
        />
        <button className="btn">Add</button>
      </form>

      {/* 🗒 List */}
      <ul className="list">
        {items.map((it) =>
          editingId === it._id ? (
            <li key={it._id} className="item stack">
              <input
                className="input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <input
                className="input"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="row gap">
                <button className="btn small" onClick={() => saveEdit(it._id)}>
                  Save
                </button>
                <button
                  className="btn small muted"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </button>
              </div>
            </li>
          ) : (
            <li key={it._id} className="item row" style={{ justifyContent: "space-between" }}>
              <div>
                <b>{it.title}</b> - {it.content}
              </div>
              <div className="row gap">
                <button className="btn small" onClick={() => startEdit(it)}>
                  Edit
                </button>
                <button className="btn small danger" onClick={() => del(it._id)}>
                  Delete
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </section>
  );
}
