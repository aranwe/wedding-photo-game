"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { clearIdentity, type Identity } from "@/lib/identity";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SettingsPanel({
  identity,
  onLeave,
}: {
  identity: Identity;
  onLeave: () => void;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex h-full flex-col gap-6 pt-2">
      <div className="rounded-2xl border bg-card p-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("settings.loggedAs")}
        </p>
        <p className="text-lg font-semibold">{identity.playerName}</p>
        <p className="text-sm text-secondary-foreground">
          {identity.solo
            ? t("settings.solo")
            : `${t("settings.team")}: ${identity.teamName}`}
        </p>
      </div>

      <Button
        variant="outline"
        className="border-destructive text-destructive hover:bg-destructive/10"
        onClick={() => setConfirming(true)}
      >
        <LogOut size={16} className="mr-2" />
        {t("settings.leaveTeam")}
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.leaveTeam")}</DialogTitle>
            <DialogDescription>{t("settings.leaveConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t("settings.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearIdentity();
                onLeave();
              }}
            >
              {t("settings.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
