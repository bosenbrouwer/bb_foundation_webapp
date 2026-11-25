## Inloggen met Microsoft Entra (module auth-entra)

- **Rollen komen uit de `roles`-claim van het token** en nergens anders. Toekennen gebeurt in het
  Entra-beheercentrum, als app roles op de enterprise application; de tool toont alleen wie wat heeft.
  Een rol die niet in `project.config.json` staat, valt weg bij het inlezen.
- **De identiteit van een gebruiker is de `oid` uit het profiel**, met de `sub` van het account als
  terugval. Het `user.id` dat Auth.js aanlevert is per login een willekeurige UUID en wordt nooit
  opgeslagen of vergeleken.
- **Een nieuwe rol** staat eerst in `project.config.json`, dan in de tenant als app role met exact
  dezelfde waarde. De twee lijsten horen gelijk te zijn.
- **Een deploy start niet zonder de uitgever van de eigen tenant.** Ontbreekt
  `AUTH_MICROSOFT_ENTRA_ID_ISSUER` in een preview of in productie, of staat er `common`,
  `organizations` of `consumers` in, dan gooit de provider bij het opstarten
  (`lib/auth/providers/entra-issuer.ts`). Haal dat slot nooit weg om een build te laten slagen: zet
  de variabele.
