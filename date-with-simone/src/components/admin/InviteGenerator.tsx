"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowSquareOut, Check, Copy, ShareNetwork } from "@phosphor-icons/react";
import { createInviteAction, type CreateInviteState } from "@/app/admin/actions";
import { NAME_MAX, NOTE_MAX } from "@/lib/limits";
import { btnPrimary, btnSecondary, field, help, label } from "../styles";

export function InviteGenerator() {
  const [state, action, pending] = useActionState<CreateInviteState, FormData>(createInviteAction, {
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);

  // Dopo un link creato, svuota il modulo per il prossimo invito
  const nonce = state.status === "ok" ? state.nonce : 0;
  useEffect(() => {
    if (nonce) formRef.current?.reset();
  }, [nonce]);

  return (
    <div>
      <form ref={formRef} action={action} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="name" className={label}>
            Il suo nome
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={NAME_MAX}
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Alessandra"
            className={field}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="note" className={label}>
            Una nota per lei
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            maxLength={NOTE_MAX}
            placeholder="Conosco un posto con la miglior carbonara di Milano."
            className={`${field} resize-none`}
            aria-describedby="note-help"
          />
          <p id="note-help" className={help}>
            Facoltativa. Lei la legge nell&apos;invito, sotto il saluto, e finisce anche nella descrizione
            dell&apos;evento. Non scriverci niente di privato: il contenuto del link è leggibile.
          </p>
        </div>
        {state.status === "error" && (
          <p role="alert" className="text-[14px] text-danger">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Creo il link..." : "Crea il link"}
        </button>
      </form>

      {state.status === "ok" && (
        <LinkResult
          key={state.nonce}
          url={`${window.location.origin}/i/${state.token}`}
          name={state.name}
          expiresLabel={state.expiresLabel}
        />
      )}
    </div>
  );
}

/** Mostrato solo lato client, dopo che l'azione ha restituito il token */
function LinkResult({ url, name, expiresLabel }: { url: string; name: string; expiresLabel: string }) {
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  const canShare = typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback per browser senza Clipboard API
      linkRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  async function share() {
    try {
      await navigator.share({ url });
    } catch {
      // Condivisione annullata: nessun problema
    }
  }

  return (
    <div className="pop mt-8 rounded-2xl border border-line bg-raised p-5" aria-live="polite">
      <p className="text-[13px] text-ink-soft">Link per {name}</p>
      <input
        ref={linkRef}
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 w-full truncate rounded-2xl border border-line bg-paper px-4 py-3 font-mono text-[13px] text-ink outline-none"
        aria-label="Link dell'invito"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={btnPrimary}>
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {copied ? "Copiato" : "Copia link"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className={btnSecondary}>
            <ShareNetwork size={18} aria-hidden="true" />
            Condividi
          </button>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
          <ArrowSquareOut size={18} aria-hidden="true" />
          Anteprima
        </a>
      </div>
      <p className={`${help} mt-4`}>
        Valido fino a {expiresLabel.toLowerCase()}. Funziona per una sola prenotazione.
      </p>
    </div>
  );
}
