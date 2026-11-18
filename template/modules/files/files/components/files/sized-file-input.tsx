/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useState } from "react";

/**
 * Het bestandsveld zelf, met de grens van het doel al in de browser getoetst. Zie besluit F1 in
 * docs/modules/files.md.
 *
 * **Waarom in de browser.** De host weigert een verzoek boven 4,5 MB voordat onze code het ziet, met
 * een fout waar de server action niets van merkt: de gebruiker krijgt dan een kale foutpagina in
 * plaats van de zin die zegt wat er mis is. Een bestand boven de grens van het doel houdt deze
 * controle daarom tegen vóór het versturen, met dezelfde tekst als de server zou geven. De controle
 * op de server blijft de grens die telt: deze is er voor de melding, niet voor de veiligheid.
 *
 * Een eigen geldigheidsmelding (`setCustomValidity`) houdt het formulier tegen: de browser verstuurt
 * niets zolang het veld ongeldig is.
 */
export function SizedFileInput({ name, accept, maxBytes, tooLargeText, className }: { name: string; accept: string; maxBytes: number; tooLargeText: string; className?: string }) {
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <>
      <input
        name={name}
        type="file"
        required
        accept={accept}
        className={className}
        aria-invalid={problem !== null}
        onChange={(event) => {
          const input = event.currentTarget;
          const tooLarge = Array.from(input.files ?? []).some((file) => file.size > maxBytes);
          input.setCustomValidity(tooLarge ? tooLargeText : "");
          setProblem(tooLarge ? tooLargeText : null);
        }}
      />
      {problem !== null && (
        <span role="alert" className="text-destructive mt-1 block text-[12px]">
          {problem}
        </span>
      )}
    </>
  );
}
