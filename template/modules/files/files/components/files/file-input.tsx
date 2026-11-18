/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { purposeSpec } from "@/lib/files/blob";
import { limitsText, uploadProblemText } from "@/lib/files/problems";
import { labels } from "@/lib/i18n/labels";
import { SizedFileInput } from "./sized-file-input";

/**
 * Een bestandsveld dat de regels van het doel kent: de toegestane types als `accept`, de grens als
 * regel eronder, en een controle in de browser die een te groot bestand tegenhoudt vóór het
 * versturen (`SizedFileInput`). In een formulier van het project, naast een server action die
 * `uploadFile` aanroept; die toetst alles opnieuw.
 */
export function FileInput({ purpose, name = "file", label = labels.files.chooseFile }: { purpose: string; name?: string; label?: string }) {
  const spec = purposeSpec(purpose);
  return (
    <label className="text-[12px]">
      {label}
      <SizedFileInput
        name={name}
        accept={[...spec.types.keys()].join(",")}
        maxBytes={spec.maxBytes}
        tooLargeText={uploadProblemText(purpose, "tooLarge")}
        className="file:bg-muted file:text-foreground mt-1 block w-full text-[13px] file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5"
      />
      <span className="text-muted-foreground mt-1 block text-[11.5px]">{limitsText(purpose)}</span>
    </label>
  );
}
