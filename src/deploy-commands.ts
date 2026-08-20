import { REST, Routes } from "discord.js";
import { commands } from "./commands.js";
import { config } from "./config.js";

const rest = new REST({ version: "10" }).setToken(config.token);
const DEPLOY_TIMEOUT_MS = 30_000;

async function deployCommands(guildId: string): Promise<void> {
  console.log(`Début du déploiement de ${commands.length} commandes sur le serveur ${guildId}...`);
  let timeout: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body: commands }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Délai de ${DEPLOY_TIMEOUT_MS / 1_000} secondes dépassé`)),
          DEPLOY_TIMEOUT_MS,
        );
      }),
    ]);
    console.log(`${commands.length} commandes déployées sur le serveur ${guildId}.`);
  } catch (error) {
    console.error(`Impossible de déployer les commandes sur le serveur ${guildId} :`, error);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

for (const guildId of config.guilds.keys()) {
  await deployCommands(guildId);
}

console.log("Déploiement des commandes terminé. Démarrage du bot...");
process.exit(0);
