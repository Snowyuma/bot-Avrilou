# Bot Avrilou

Bot Discord de modération avec commandes slash, annonces illustrées et protection anti-raid.

## Fonctions

- `/ban` : bannissement permanent ou temporaire (`30m`, `12h`, `7j`), avec motif et suppression optionnelle des messages récents.
- `/unban` : débannissement manuel à partir de l'identifiant Discord.
- `/expulser` : exclusion d'un membre.
- `/exclu` : exclusion temporaire des discussions (timeout Discord, maximum 28 jours).
- `/unexclu` : retrait anticipé d'une exclusion temporaire.
- `/publier` : annonce envoyée par le bot dans le salon dédié, avec image jointe ou URL HTTPS.
- `/lockdown` : verrouillage/déverrouillage des salons texte.
- `/antiraid` : état de la protection.
- Menu clic droit sur un membre → **Applications → Informations du compte**.
- Détection des arrivées en rafale, lockdown automatique et quarantaine optionnelle des comptes récents.

## Installation

1. Installe Node.js 20 ou plus récent.
2. Dans le [portail développeur Discord](https://discord.com/developers/applications), crée une application et un bot.
3. Dans **Bot → Privileged Gateway Intents**, active **Server Members Intent**.
4. Invite le bot avec les scopes `bot` et `applications.commands`. Accorde-lui au minimum : voir les salons, envoyer des messages, intégrer des liens, gérer les rôles, gérer les salons, expulser et bannir des membres.
5. Copie `.env.example` vers `.env`, puis remplis les identifiants. Ne publie jamais le token.
6. Installe et lance :

```powershell
npm install
npm run deploy:commands
npm start
```

Les commandes sont déployées uniquement dans `GUILD_ID`, ce qui est idéal pour un serveur privé et rend leur mise à jour immédiate.

## Configuration anti-raid conseillée

Crée un rôle `Quarantaine` sans droit d'écrire ni de rejoindre les salons vocaux, place le rôle du bot au-dessus, puis renseigne son identifiant dans `QUARANTINE_ROLE_ID`. Le rôle du bot doit également être au-dessus des membres qu'il doit modérer.

Le lockdown automatique retire temporairement à `@everyone` le droit d'envoyer des messages. `/lockdown action:Désactiver` remet ces permissions à leur état hérité. Après un redémarrage pendant un lockdown, utilise cette commande pour rouvrir le serveur.

Important : aucun anti-raid automatique n'est infaillible. Conserve le niveau de vérification Discord, l'AutoMod natif et l'authentification à deux facteurs pour les modérateurs.
