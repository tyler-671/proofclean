"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type ClientOption = {
  id: string;
  name: string;
};

type LocationRow = {
  id: string;
  name: string;
  client_id: string;
  clients: { name: string } | { name: string }[] | null;
};

type Location = {
  id: string;
  name: string;
  client_id: string;
  client_name: string;
};

export default function LocationsPage() {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
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

    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (clientsError) {
      setLoadError(clientsError.message);
      setIsLoading(false);
      return;
    }

    const clientOptions = (clientsData as ClientOption[]) ?? [];
    setClients(clientOptions);

    const { data, error } = await supabase
      .from("locations")
      .select("id, name, client_id, clients(name)")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      setLoadError(error.message);
      setIsLoading(false);
      return;
    }

    const mappedLocations: Location[] = ((data as LocationRow[]) ?? []).map((location) => ({
      id: location.id,
      name: location.name,
      client_id: location.client_id,
      client_name: Array.isArray(location.clients)
        ? (location.clients[0]?.name ?? "Unknown client")
        : (location.clients?.name ?? "Unknown client"),
    }));

    setLocations(mappedLocations);
    setIsLoading(false);
  }, [router, isAuthChecked]);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const onSignOut = async () => {
    if (!supabase) return;
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/");
  };

  const openAddForm = () => {
    if (clients.length === 0) return;
    setEditingLocationId(null);
    setName("");
    setClientId(clients[0].id);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (location: Location) => {
    setEditingLocationId(location.id);
    setName(location.name);
    setClientId(location.client_id);
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingLocationId(null);
    setName("");
    setClientId("");
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

    if (editingLocationId) {
      const { error } = await supabase
        .from("locations")
        .update({ name: name.trim(), client_id: clientId })
        .eq("id", editingLocationId);

      if (error) {
        setFormError(error.message);
        setIsSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase.from("locations").insert({
        user_id: user.id,
        client_id: clientId,
        name: name.trim(),
      });

      if (error) {
        setFormError(error.message);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    closeForm();
    await fetchLocations();
  };

  const onDelete = async (locationId: string) => {
    if (!supabase) return;

    const confirmed = window.confirm("Delete this location?");
    if (!confirmed) return;

    setDeletingLocationId(locationId);

    const { error } = await supabase.from("locations").delete().eq("id", locationId);

    if (error) {
      setLoadError(error.message);
      setDeletingLocationId(null);
      return;
    }

    setDeletingLocationId(null);
    await fetchLocations();
  };

  if (!isAuthChecked) {
    return <div className="min-h-screen bg-[#f7fafa]" />;
  }

  return (
    <div className="min-h-screen bg-[#f7fafa] font-[family-name:var(--font-geist-sans)] text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-3 transition hover:opacity-80">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight text-slate-900">ProofClean</p>
              <p className="text-xs font-medium text-slate-500">Locations</p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/clients"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Clients
            </Link>
            <Link
              href="/locations"
              className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700"
            >
              Locations
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              disabled={!supabase || isSigningOut}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Locations
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
              The places you service for each client.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            disabled={clients.length === 0}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            + Add Location
          </button>
        </section>

        {isFormOpen ? (
          <form
            onSubmit={onSubmit}
            className="mb-6 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <p className="mb-4 text-sm font-semibold text-slate-900">
              {editingLocationId ? "Edit location" : "Add location"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Location Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Main Office"
                />
              </div>
              <div>
                <label
                  htmlFor="clientId"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Client
                </label>
                <select
                  id="clientId"
                  name="clientId"
                  required
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
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
                  : editingLocationId
                    ? "Save changes"
                    : "Add location"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-4">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600">
              Loading locations...
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
              Could not load locations: {loadError}
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                Add a client first before adding locations.{" "}
                <Link href="/clients" className="font-semibold text-emerald-700 hover:text-emerald-800">
                  Go to Clients
                </Link>
                .
              </p>
            </div>
          ) : locations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                No locations yet. Click{" "}
                <span className="font-semibold text-slate-900">+ Add Location</span> to add your
                first one.
              </p>
            </div>
          ) : (
            locations.map((location) => (
              <div
                key={location.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    {location.name}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    Client: <span className="text-slate-900">{location.client_name}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openEditForm(location)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(location.id)}
                    disabled={deletingLocationId === location.id}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingLocationId === location.id ? "Deleting..." : "Delete"}
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
