"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDinner } from "@/context/DinnerContext";

function formatPlanAheadSummary(planAhead) {
  if (!planAhead?.enabled || !planAhead?.location) {
    return { active: false, label: "No Plan Ahead override active.", detail: null };
  }
  const locationLabel =
    planAhead.label ||
    planAhead.location?.description ||
    planAhead.location?.structured_formatting?.main_text ||
    "Custom location";
  let whenPart = "";
  if (planAhead.isoString) {
    const dt = new Date(planAhead.isoString);
    if (!Number.isNaN(dt.getTime())) {
      whenPart = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(dt);
    }
  } else if (planAhead.date && Number.isFinite(planAhead.hour24)) {
    const hourValue = ((planAhead.hour24 % 12) + 12) % 12 || 12;
    const meridiem = planAhead.hour24 >= 12 ? "PM" : "AM";
    whenPart = `${planAhead.date} at ${hourValue}:00 ${meridiem}`;
  }
  const detailParts = [];
  if (planAhead.timeCategory) detailParts.push(planAhead.timeCategory);
  if (whenPart) detailParts.push(whenPart);
  if (planAhead.timeZoneId) detailParts.push(planAhead.timeZoneId);
  return {
    active: true,
    label: locationLabel,
    detail: detailParts.length ? detailParts.join(" • ") : null,
  };
}

export default function ProfilePage() {
  const {
    savedRestaurants,
    authUser,
    authReady,
    supabaseProfile: profile,
    planAhead,
    supabaseConfigured,
    updateProfile,
    updateAuthUser,
    signOut,
  } = useDinner();
  const savedRef = useRef(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authUser) {
      setDisplayName("");
      setPhone("");
      setEmailOptIn(true);
      setSmsOptIn(false);
      return;
    }
    const nextName =
      profile?.username ||
      authUser?.user_metadata?.full_name ||
      authUser?.email?.split("@")[0] ||
      "";
    setDisplayName(nextName);
    const prefs = profile?.preferences || {};
    const notifications = prefs.notifications || {};
    const storedPhone = prefs.phoneNumber || authUser?.phone || "";
    setPhone(storedPhone || "");
    setEmailOptIn(notifications.email ?? true);
    setSmsOptIn(notifications.phone ?? Boolean(storedPhone));
  }, [authUser, profile]);

  const planAheadSummary = useMemo(() => formatPlanAheadSummary(planAhead), [planAhead]);
  const savedCount = Array.isArray(savedRestaurants) ? savedRestaurants.length : 0;
  const membershipTier = profile?.tier || "free";
  const isPremium = membershipTier !== "free";
  const lastUpdated = useMemo(() => {
    if (!profile?.updatedAt) return null;
    const dt = new Date(profile.updatedAt);
    return Number.isNaN(dt.getTime())
      ? null
      : new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(dt);
  }, [profile?.updatedAt]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!authUser) return;
    if (!supabaseConfigured) {
      setError("Supabase is not configured. Add environment variables to enable profile updates.");
      return;
    }
    setSaving(true);
    setFeedback("");
    setError("");
    const notifications = {
      email: emailOptIn,
      phone: smsOptIn && Boolean(phone?.trim()),
    };
    const payload = {
      userId: authUser.id,
      username: displayName?.trim() || authUser.email?.split("@")[0] || "Foodie",
      tier: membershipTier,
      preferences: {
        ...(profile?.preferences || {}),
        notifications,
        phoneNumber: phone?.trim() || null,
      },
      insights: profile?.insights || null,
      aiSummary: profile?.aiSummary || null,
    };
    try {
      if (updateProfile) {
        await updateProfile({
          username: payload.username,
          tier: payload.tier,
          preferences: payload.preferences,
          insights: payload.insights,
          aiSummary: payload.aiSummary,
        });
      }
      if (updateAuthUser) {
        try {
          await updateAuthUser({ data: { full_name: payload.username } });
        } catch (updateErr) {
          console.warn("supabase_metadata_update_failed", updateErr);
        }
      }
      setFeedback("Profile updated successfully.");
    } catch (err) {
      setError(err?.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!supabaseConfigured) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 pt-24 pb-16 text-slate-100">
        <div className="mx-auto max-w-xl rounded-3xl border border-emerald-400/30 bg-slate-900/70 p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-bold text-emerald-300">Auth is disabled</h1>
          <p className="mt-2 text-sm text-emerald-100/80">
            Configure <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and
            <code className="font-mono"> NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable the profile dashboard.
          </p>
          <Link
            href="/dinnerdecider"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-emerald-400/30 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 pt-24 pb-16 text-slate-100">
        <div className="mx-auto max-w-sm rounded-3xl border border-emerald-400/30 bg-slate-900/70 p-8 text-center shadow-2xl">
          <div className="text-sm text-emerald-100/80">Loading your account…</div>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 pt-24 pb-16 text-slate-100">
        <div className="mx-auto max-w-xl rounded-3xl border border-emerald-400/30 bg-slate-900/70 p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-emerald-300">Sign in to access your profile</h1>
          <p className="mt-2 text-sm text-emerald-100/80">
            Sync Plan Ahead overrides, saved restaurants, and premium membership across your devices.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dinnerdecider/login"
              className="flex-1 rounded-full bg-emerald-500 px-5 py-2 text-center text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Sign In / Create Account
            </Link>
            <Link
              href="/dinnerdecider"
              className="flex-1 rounded-full border border-emerald-400/30 px-5 py-2 text-center text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 pt-24 pb-16 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <section className="rounded-3xl border border-emerald-400/30 bg-slate-900/70 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-emerald-300">Account Overview</h1>
              <p className="mt-1 text-sm text-emerald-100/80">
                Manage notifications, premium perks, and Plan Ahead overrides.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  isPremium ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-emerald-200"
                }`}
              >
                {isPremium ? "Premium Tier" : "Free Tier"}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await signOut?.();
                }}
                className="rounded-full border border-emerald-400/30 px-4 py-1.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
              >
                Sign Out
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
            <div className="rounded-2xl bg-slate-900/80 p-4">
              <div className="text-emerald-200/80">Email</div>
              <div className="mt-1 font-semibold text-emerald-100">{authUser.email}</div>
            </div>
            <div className="rounded-2xl bg-slate-900/80 p-4">
              <div className="text-emerald-200/80">Plan Ahead</div>
              <div className="mt-1 font-semibold text-emerald-100">{planAheadSummary.label}</div>
              {planAheadSummary.detail ? (
                <div className="mt-1 text-xs text-emerald-200/70">{planAheadSummary.detail}</div>
              ) : null}
            </div>
            <div className="rounded-2xl bg-slate-900/80 p-4">
              <div className="text-emerald-200/80">Saved restaurants</div>
              <div className="mt-1 font-semibold text-emerald-100">{savedCount}</div>
              <button
                type="button"
                onClick={() => savedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="mt-2 text-xs font-semibold text-emerald-300 underline-offset-2 hover:underline"
              >
                Jump to list
              </button>
            </div>
            <div className="rounded-2xl bg-slate-900/80 p-4">
              <div className="text-emerald-200/80">Last updated</div>
              <div className="mt-1 font-semibold text-emerald-100">{lastUpdated || "Just synced"}</div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-400/30 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-emerald-200">Profile & Notifications</h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-emerald-200">Display name</label>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How should we greet you?"
                className="mt-1 w-full rounded-xl border border-emerald-400/30 bg-slate-900/70 px-4 py-2 text-sm text-emerald-100 outline-none transition focus:border-emerald-300 focus:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-emerald-200">Phone (optional)</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555-123-4567"
                className="mt-1 w-full rounded-xl border border-emerald-400/30 bg-slate-900/70 px-4 py-2 text-sm text-emerald-100 outline-none transition focus:border-emerald-300 focus:bg-slate-900"
              />
              <p className="mt-1 text-xs text-emerald-200/70">We’ll use this for SMS reminders when you opt in.</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-slate-900/60 p-4 text-sm text-emerald-100/80">
              <div className="font-semibold text-emerald-200">Notification preferences</div>
              <label className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(event) => setEmailOptIn(event.target.checked)}
                  className="size-4 rounded border-emerald-400/40 bg-slate-900"
                />
                Email me Plan Ahead reminders and reroll summaries.
              </label>
              <label className="mt-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(event) => setSmsOptIn(event.target.checked)}
                  className="size-4 rounded border-emerald-400/40 bg-slate-900"
                />
                Send last-minute SMS nudges (requires phone number).
              </label>
            </div>
            {error ? (
              <div className="rounded-2xl border border-red-400/40 bg-red-900/40 px-4 py-2 text-sm text-red-100">{error}</div>
            ) : null}
            {feedback ? (
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-900/40 px-4 py-2 text-sm text-emerald-100">{feedback}</div>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-emerald-400/30 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-emerald-200">Membership & Billing</h2>
          <p className="mt-2 text-sm text-emerald-100/80">
            Stripe handles upgrades and renewals. While the flow is being wired up, use this section to see what you’ll manage soon.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-slate-900/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">Current plan</div>
              <div className="mt-2 text-lg font-semibold text-emerald-100">{isPremium ? "Premium" : "Free"}</div>
              <div className="mt-2 text-xs text-emerald-200/70">Manage billing in Stripe once the portal link is live.</div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-slate-900/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">Next steps</div>
              <ul className="mt-2 space-y-1 text-sm text-emerald-100/80">
                <li>• Review perks and upgrades</li>
                <li>• Manage saved payment methods</li>
                <li>• Download receipts</li>
              </ul>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dinnerdecider/upgrade"
              className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Explore Premium
            </Link>
            <Link
              href="/dinnerdecider/refer"
              className="rounded-full border border-emerald-400/30 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
            >
              Refer friends
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-400/30 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-emerald-200">AI summary</h2>
          <div className="mt-2 rounded-2xl border border-emerald-400/20 bg-slate-900/60 px-4 py-3 text-sm text-emerald-100/80">
            {profile?.aiSummary
              ? profile.aiSummary
              : "We’ll populate this with personalized dining insights once you’ve logged a few more sessions."}
          </div>
        </section>

        <section ref={savedRef} className="rounded-3xl border border-emerald-400/30 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-emerald-200">Saved restaurants</h2>
          {savedCount === 0 ? (
            <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-slate-900/60 px-4 py-4 text-sm text-emerald-100/70">
              You haven’t saved any spots yet. Pin favorites from the dashboard to build your collection.
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {savedRestaurants.map((restaurant, index) => (
                <div key={`${restaurant.name}-${index}`} className="flex gap-4 rounded-2xl border border-emerald-400/20 bg-slate-900/80 p-4">
                  <Image
                    src={restaurant.photo || "/placeholder.jpg"}
                    alt={restaurant.name}
                    width={72}
                    height={72}
                    className="h-18 w-18 rounded-xl object-cover"
                    unoptimized
                  />
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-emerald-100">{restaurant.name}</div>
                    <div className="text-sm text-emerald-200/80">⭐ {restaurant.rating || "N/A"}</div>
                    <div className="text-sm text-emerald-200/70">{restaurant.address}</div>
                  </div>
                  {restaurant.website ? (
                    <a
                      href={restaurant.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start rounded-full border border-emerald-400/30 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
                    >
                      View site
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

