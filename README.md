# Bot Avrilou

Bot Discord de modération avec commandes slash, annonces illustrées et protection anti-raid.

## Fonctions

- `/ban` : bannissement permanent ou temporaire (`30m`, `12h`, `7j`), avec motif et suppression optionnelle des messages récents.
- `/unban` : débannissement manuel à partir de l'identifiant Discord.
- `/testmp` : vérification de l'envoi d'un MP par le bot sans appliquer de sanction.
- `/expulser` : exclusion d'un membre.
- `/exclu` : exclusion temporaire des discussions (timeout Discord, maximum 28 jours).
- `/unexclu` : retrait anticipé d'une exclusion temporaire.
- `/publier` : annonce envoyée par le bot dans le salon dédié, avec image jointe ou URL HTTPS.
- `/lockdown` : verrouillage/déverrouillage des salons texte.
- `/antiraid` : état de la protection.
- Menu clic droit sur un membre → **Applications → Informations du compte**.
- Détection des arrivées en rafale, lockdown automatique et quarantaine optionnelle des comptes récents.
- Message privé envoyé avant un bannissement, avec le motif et la durée.
- Suppression automatique des messages contenant les mots configurés dans `BLOCKED_WORDS`.

## Installation

1. Installe Node.js 20 ou plus récent.
2. Dans le [portail développeur Discord](https://discord.com/developers/applications), crée une application et un bot.
3. Dans **Bot → Privileged Gateway Intents**, active **Server Members Intent**.
   Active aussi **Message Content Intent** pour permettre le filtrage des mots.
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

Pour les images explicites, active également dans les paramètres de sécurité du serveur le filtre de médias explicites de Discord. Le bot ne prétend pas analyser visuellement les images sans service spécialisé d'analyse d'images.

## Hébergement Render

Le fichier `render.yaml` décrit un Background Worker avec un disque persistant de 1 Go. Sur Render, crée un **Blueprint** depuis ce dépôt GitHub, saisis `DISCORD_TOKEN` et laisse `QUARANTINE_ROLE_ID` vide si tu n'utilises pas encore ce rôle. Le disque conserve les échéances des bannissements temporaires entre les redéploiements.
