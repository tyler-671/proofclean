"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import TopNav from "@/components/TopNav";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type Client = {
  id: string;
  name: string;
  email: string;
};

export default function ClientsPage() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    if (!supabase) {
      setLoadError("Supabase environment variables are missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    const user = session.user;

    if (!isAuthChecked) setIsAuthChecked(true);

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      setLoadError(subscriptionError.message);
      setIsLoading(false);
      return;
    }

    if (subscription?.status !== "active") {
      router.replace("/pricing");
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .select("id, name, email")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      setLoadError(error.message);
      setIsLoading(false);
      return;
    }

    setClients((data as Client[]) ?? []);
    setIsLoading(false);
  }, [router, isAuthChecked]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  const openAddForm = () => {
    setEditingClientId(null);
    setName("");
    setEmail("");
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClientId(client.id);
    setName(client.name);
    setEmail(client.email);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingClientId(null);
    setName("");
    setEmail("");
    setFormError(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setFormError("Supabase environment variables are missing.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFormError(userError?.message ?? "Could not verify authenticated user.");
      setIsSubmitting(false);
      return;
    }

    if (editingClientId) {
      const { error } = await supabase
        .from("clients")
        .update({ name: name.trim(), email: email.trim() })
        .eq("id", editingClientId);

      if (error) {
        setFormError(error.message);
        setIsSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase.from("clients").insert({
        user_id: user.id,
        name: name.trim(),
        email: email.trim(),
      });

      if (error) {
        setFormError(error.message);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    closeForm();
    await fetchClients();
  };

  const onDelete = async (clientId: string) => {
    if (!supabase) return;

    const confirmed = window.confirm(
      "Delete this client? Any locations linked to this client will also be deleted.",
    );
    if (!confirmed) return;

    setDeletingClientId(clientId);

    const { error } = await supabase.from("clients").delete().eq("id", clientId);

    if (error) {
      setLoadError(error.message);
      setDeletingClientId(null);
      return;
    }

    setDeletingClientId(null);
    await fetchClients();
  };

  if (!isAuthChecked) {
    return <div className="min-h-screen bg-[#f7fafa]" />;
  }

  return (
    <div className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      <TopNav />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Clients
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
              The companies and contacts you clean for.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
          >
            + Add Client
          </button>
        </section>

        {isFormOpen ? (
          <form
            onSubmit={onSubmit}
            className="mb-6 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <p className="mb-4 text-sm font-semibold text-slate-900">
              {editingClientId ? "Edit client" : "Add client"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Client Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Contact Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="contact@acme.com"
                />
              </div>
            </div>
            {formError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {formError}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingClientId
                    ? "Save changes"
                    : "Add client"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-4">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600">
              Loading clients...
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
              Could not load clients: {loadError}
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                No clients yet. Click <span className="font-semibold text-slate-900">+ Add Client</span> to add your first one.
              </p>
            </div>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    {client.name}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {client.email}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openEditForm(client)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(client.id)}
                    disabled={deletingClientId === client.id}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingClientId === client.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}