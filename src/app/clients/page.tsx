"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";
import ConfirmDialog from "@/components/ConfirmDialog";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
        },
      })
    : null;

type LocationRow = {
  id: string;
  name: string;
  client_id: string;
};

type ClientRow = {
  id: string;
  name: string;
  email: string;
  locations: LocationRow[] | null;
};

type ClientLocation = {
  id: string;
  name: string;
  client_id: string;
};

type Client = {
  id: string;
  name: string;
  email: string;
  locations: ClientLocation[];
};

type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

function locationCountLabel(count: number): string {
  if (count === 0) return "No locations yet";
  return count === 1 ? "1 location" : `${count} locations`;
}

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
  const [draftLocationNames, setDraftLocationNames] = useState<string[]>([""]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const [addingLocationClientId, setAddingLocationClientId] = useState<string | null>(null);
  const [inlineLocationName, setInlineLocationName] = useState("");
  const [isSavingInlineLocation, setIsSavingInlineLocation] = useState(false);

  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingLocationName, setEditingLocationName] = useState("");
  const [isSavingLocationEdit, setIsSavingLocationEdit] = useState(false);

  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);

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
      .select("id, name, email, locations(id, name, client_id)")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      setLoadError(error.message);
      setIsLoading(false);
      return;
    }

    const mappedClients: Client[] = ((data as ClientRow[]) ?? []).map((row) => {
      const locations = Array.isArray(row.locations) ? row.locations : [];
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        locations: [...locations].sort((a, b) => a.name.localeCompare(b.name)),
      };
    });

    setClients(mappedClients);
    setIsLoading(false);
  }, [router, isAuthChecked]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  const resetDraftLocations = () => {
    setDraftLocationNames([""]);
  };

  const openAddForm = () => {
    setEditingClientId(null);
    setName("");
    setEmail("");
    resetDraftLocations();
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClientId(client.id);
    setName(client.name);
    setEmail(client.email);
    resetDraftLocations();
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingClientId(null);
    setName("");
    setEmail("");
    resetDraftLocations();
    setFormError(null);
  };

  const updateDraftLocationName = (index: number, value: string) => {
    setDraftLocationNames((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addDraftLocationField = () => {
    setDraftLocationNames((prev) => [...prev, ""]);
  };

  const removeDraftLocationField = (index: number) => {
    setDraftLocationNames((prev) =>
      prev.length === 1 ? [""] : prev.filter((_, i) => i !== index),
    );
  };

  const getTrimmedDraftLocationNames = () =>
    draftLocationNames.map((item) => item.trim()).filter(Boolean);

  const insertLocationsForClient = async (
    userId: string,
    clientId: string,
    locationNames: string[],
  ) => {
    if (!supabase || locationNames.length === 0) return null;

    const { error } = await supabase.from("locations").insert(
      locationNames.map((locationName) => ({
        user_id: userId,
        client_id: clientId,
        name: locationName,
      })),
    );

    return error;
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

    const newLocationNames = getTrimmedDraftLocationNames();

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

      const locationError = await insertLocationsForClient(
        user.id,
        editingClientId,
        newLocationNames,
      );

      if (locationError) {
        setFormError(locationError.message);
        setIsSubmitting(false);
        return;
      }
    } else {
      const { data: insertedClient, error } = await supabase
        .from("clients")
        .insert({
          user_id: user.id,
          name: name.trim(),
          email: email.trim(),
        })
        .select("id")
        .single();

      if (error || !insertedClient) {
        setFormError(error?.message ?? "Could not create client.");
        setIsSubmitting(false);
        return;
      }

      const locationError = await insertLocationsForClient(
        user.id,
        insertedClient.id,
        newLocationNames,
      );

      if (locationError) {
        setFormError(locationError.message);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    closeForm();
    await fetchClients();
  };

  const deleteClient = async (clientId: string) => {
    if (!supabase) return;

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

  const onDeleteClient = (clientId: string) => {
    setPendingConfirm({
      title: "Delete client",
      message: "Delete this client? Any locations linked to this client will also be deleted.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => void deleteClient(clientId),
    });
  };

  const cancelInlineAdd = () => {
    setAddingLocationClientId(null);
    setInlineLocationName("");
  };

  const saveInlineLocation = async (clientId: string) => {
    if (!supabase) return;

    const trimmedName = inlineLocationName.trim();
    if (!trimmedName) return;

    setIsSavingInlineLocation(true);
    setLoadError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoadError(userError?.message ?? "Could not verify authenticated user.");
      setIsSavingInlineLocation(false);
      return;
    }

    const { error } = await supabase.from("locations").insert({
      user_id: user.id,
      client_id: clientId,
      name: trimmedName,
    });

    setIsSavingInlineLocation(false);

    if (error) {
      setLoadError(error.message);
      return;
    }

    cancelInlineAdd();
    await fetchClients();
  };

  const startEditLocation = (location: ClientLocation) => {
    setEditingLocationId(location.id);
    setEditingLocationName(location.name);
    setAddingLocationClientId(null);
  };

  const cancelEditLocation = () => {
    setEditingLocationId(null);
    setEditingLocationName("");
  };

  const saveLocationRename = async () => {
    if (!supabase || !editingLocationId) return;

    const trimmedName = editingLocationName.trim();
    if (!trimmedName) return;

    setIsSavingLocationEdit(true);
    setLoadError(null);

    const { error } = await supabase
      .from("locations")
      .update({ name: trimmedName })
      .eq("id", editingLocationId);

    setIsSavingLocationEdit(false);

    if (error) {
      setLoadError(error.message);
      return;
    }

    cancelEditLocation();
    await fetchClients();
  };

  const deleteLocation = async (locationId: string) => {
    if (!supabase) return;

    setDeletingLocationId(locationId);

    const { error } = await supabase.from("locations").delete().eq("id", locationId);

    if (error) {
      setLoadError(error.message);
      setDeletingLocationId(null);
      return;
    }

    setDeletingLocationId(null);
    await fetchClients();
  };

  const onDeleteLocation = (locationId: string) => {
    setPendingConfirm({
      title: "Delete location",
      message: "Delete this location?",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => void deleteLocation(locationId),
    });
  };

  if (!isAuthChecked) {
    return <div className="min-h-screen bg-[#f7fafa]" />;
  }

  return (
    <AppShell>
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

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {editingClientId ? "Add locations" : "Locations (optional)"}
              </label>
              <button
                type="button"
                onClick={addDraftLocationField}
                className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                + Add another location
              </button>
            </div>
            <div className="space-y-2">
              {draftLocationNames.map((locationName, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={locationName}
                    onChange={(event) => updateDraftLocationName(index, event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Main Office"
                  />
                  {draftLocationNames.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeDraftLocationField(index)}
                      className="shrink-0 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {editingClientId ? (
              <p className="mt-2 text-xs text-slate-500">
                Existing locations can be edited or removed below. New names here will be added
                when you save.
              </p>
            ) : null}
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
              No clients yet. Click{" "}
              <span className="font-semibold text-slate-900">+ Add Client</span> to add your first
              one.
            </p>
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    {client.name}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{client.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      client.locations.length >= 1
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {locationCountLabel(client.locations.length)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditForm(client)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClient(client.id)}
                    disabled={deletingClientId === client.id}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingClientId === client.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Locations
                  </p>
                  {addingLocationClientId !== client.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingLocationClientId(client.id);
                        setInlineLocationName("");
                        cancelEditLocation();
                      }}
                      className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700"
                    >
                      + Add location
                    </button>
                  ) : null}
                </div>

                {client.locations.length === 0 && addingLocationClientId !== client.id ? (
                  <p className="text-sm text-slate-500">No locations yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {client.locations.map((location) => (
                      <li
                        key={location.id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-[#f7fafa] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        {editingLocationId === location.id ? (
                          <>
                            <input
                              type="text"
                              value={editingLocationName}
                              onChange={(event) => setEditingLocationName(event.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void saveLocationRename()}
                                disabled={isSavingLocationEdit || !editingLocationName.trim()}
                                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {isSavingLocationEdit ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditLocation}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-900">{location.name}</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditLocation(location)}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-700 transition hover:text-slate-900"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteLocation(location.id)}
                                disabled={deletingLocationId === location.id}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingLocationId === location.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {addingLocationClientId === client.id ? (
                  <div className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-[#f7fafa] p-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={inlineLocationName}
                      onChange={(event) => setInlineLocationName(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Location name"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void saveInlineLocation(client.id)}
                        disabled={isSavingInlineLocation || !inlineLocationName.trim()}
                        className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSavingInlineLocation ? "Adding..." : "Add"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelInlineAdd}
                        className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:text-slate-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={pendingConfirm !== null}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => pendingConfirm?.onConfirm()}
        title={pendingConfirm?.title ?? ""}
        message={pendingConfirm?.message ?? ""}
        confirmLabel={pendingConfirm?.confirmLabel}
        destructive={pendingConfirm?.destructive}
      />
    </AppShell>
  );
}
