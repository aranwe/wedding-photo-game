"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { saveIdentity, type Identity } from "@/lib/identity";
import { useT } from "@/lib/i18n";
import { useConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingForm({
  onRegistered,
}: {
  onRegistered: (identity: Identity) => void;
}) {
  const t = useT();
  const { event } = useConfig();
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [solo, setSolo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register() {
    const trimmedName = name.trim();
    const trimmedTeam = teamName.trim();
    if (!trimmedName) return setError(t("onboarding.nameRequired"));
    if (!solo && !trimmedTeam) return setError(t("onboarding.teamRequired"));

    setBusy(true);
    setError(null);
    try {
      let teamId: string | null = null;
      if (!solo) {
        const { data: team, error: teamErr } = await supabase
          .from("teams")
          .upsert({ name: trimmedTeam }, { onConflict: "name" })
          .select("id")
          .single();
        if (teamErr) throw teamErr;
        teamId = team.id;
      }

      const { data: player, error: playerErr } = await supabase
        .from("players")
        .insert({ name: trimmedName, team_id: teamId, solo })
        .select("id")
        .single();
      if (playerErr) throw playerErr;

      const identity: Identity = {
        playerId: player.id,
        playerName: trimmedName,
        teamId,
        teamName: solo ? null : trimmedTeam,
        solo,
      };
      saveIdentity(identity);
      onRegistered(identity);
    } catch {
      setError(t("onboarding.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center max-w-sm mx-auto w-full px-6">
      <picture>
        <source srcSet="/logo.webp" type="image/webp" />
        <img
          src="/logo.png"
          alt={`${event.partner1} ${event.and} ${event.partner2}`}
          className="mb-6 h-28 w-auto rounded-full"
        />
      </picture>
      <h1 className="text-2xl font-bold text-primary text-center">
        {t("onboarding.title")}
      </h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground text-center">
        {event.partner1} {event.and} {event.partner2} · {t("onboarding.subtitle")}
      </p>

      <div className="w-full space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("onboarding.nameLabel")}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("onboarding.namePlaceholder")}
            autoComplete="given-name"
          />
        </div>

        {!solo && (
          <div className="space-y-1.5">
            <Label htmlFor="team">{t("onboarding.teamLabel")}</Label>
            <Input
              id="team"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t("onboarding.teamPlaceholder")}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          className="w-full"
          size="lg"
          disabled={busy}
          onClick={register}
        >
          {t("onboarding.joinButton")}
        </Button>
        <Button
          className="w-full"
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => setSolo((s) => !s)}
        >
          {t("onboarding.soloButton")}
        </Button>
      </div>
    </div>
  );
}
