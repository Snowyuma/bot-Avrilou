import {
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { config } from "./config.js";
import { formatDuration, parseDuration } from "./durations.js";
import { cancelScheduledBan, loadScheduledBans, scheduleBan, takeExpiredBans } from "./scheduled-bans.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const recentJoins = new Map<string, number[]>();
const lockedGuilds = new Set<string>();

async function log(guild: Guild, title: string, description: string, color = 0xf59e0b) {
  if (!config.modLogChannelId) return;
  const channel = await guild.channels.fetch(config.modLogChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  await channel.send({ embeds: [new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp()] }).catch(console.error);
}

async function setLockdown(guild: Guild, enabled: boolean): Promise<number> {
  const channels = await guild.channels.fetch();
  let changed = 0;
  for (const channel of channels.values()) {
    if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) continue;
    if (channel.id === config.modLogChannelId) continue;
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: enabled ? false : null }, { reason: "Protection anti-raid" }).catch(() => undefined);
    changed++;
  }
  enabled ? lockedGuilds.add(guild.id) : lockedGuilds.delete(guild.id);
  return changed;
}

function safeHttpsUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch { return undefined; }
}

async function handleCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return interaction.reply({ content: "Commande utilisable uniquement sur un serveur.", ephemeral: true });

  if (interaction.commandName === "ban") {
    const user = interaction.options.getUser("membre", true);
    const reason = interaction.options.getString("raison") ?? `Banni par ${interaction.user.tag}`;
    const hours = interaction.options.getInteger("supprimer_messages") ?? 0;
    const durationInput = interaction.options.getString("duree");
    const duration = durationInput ? parseDuration(durationInput) : null;
    if (durationInput && !duration) return interaction.reply({ content: "Durée invalide. Utilise par exemple `30m`, `12h` ou `7j`.", ephemeral: true });
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && !member.bannable) return interaction.reply({ content: "Je ne peux pas bannir ce membre (rôle trop élevé ou permission manquante).", ephemeral: true });
    await interaction.guild.members.ban(user, { reason, deleteMessageSeconds: hours * 3600 });
    if (duration) await scheduleBan({ guildId: interaction.guild.id, userId: user.id, expiresAt: Date.now() + duration });
    else await cancelScheduledBan(interaction.guild.id, user.id);
    const durationLabel = duration ? formatDuration(duration) : "permanent";
    await interaction.reply({ content: `🔨 **${user.tag}** a été banni (${durationLabel}).`, ephemeral: true });
    return log(interaction.guild, "Membre banni", `${user.tag} (${user.id})\nDurée : ${durationLabel}\nMotif : ${reason}`, 0xef4444);
  }

  if (interaction.commandName === "unban") {
    const userId = interaction.options.getString("utilisateur_id", true).trim();
    const reason = interaction.options.getString("raison") ?? `Débanni par ${interaction.user.tag}`;
    if (!/^\d{17,20}$/.test(userId)) return interaction.reply({ content: "L'identifiant Discord est invalide.", ephemeral: true });
    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) return interaction.reply({ content: "Cet utilisateur n'est pas banni sur ce serveur.", ephemeral: true });
    await interaction.guild.members.unban(userId, reason);
    await cancelScheduledBan(interaction.guild.id, userId);
    await interaction.reply({ content: `✅ **${ban.user.tag}** a été débanni.`, ephemeral: true });
    return log(interaction.guild, "Membre débanni", `${ban.user.tag} (${userId})\nMotif : ${reason}`, 0x22c55e);
  }

  if (interaction.commandName === "expulser") {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    const reason = interaction.options.getString("raison") ?? `Expulsé par ${interaction.user.tag}`;
    if (!member?.kickable) return interaction.reply({ content: "Je ne peux pas expulser ce membre.", ephemeral: true });
    await member.kick(reason);
    await interaction.reply({ content: `👢 **${member.user.tag}** a été expulsé.`, ephemeral: true });
    return log(interaction.guild, "Membre expulsé", `${member.user.tag} (${member.id})\nMotif : ${reason}`, 0xf97316);
  }

  if (interaction.commandName === "exclu") {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    const durationInput = interaction.options.getString("duree", true);
    const duration = parseDuration(durationInput);
    const reason = interaction.options.getString("raison") ?? `Exclu par ${interaction.user.tag}`;
    if (!duration) return interaction.reply({ content: "Durée invalide. Utilise par exemple `10m`, `2h` ou `7j`.", ephemeral: true });
    if (duration > 28 * 86_400_000) return interaction.reply({ content: "Discord limite une exclusion temporaire à 28 jours.", ephemeral: true });
    if (!member?.moderatable) return interaction.reply({ content: "Je ne peux pas exclure ce membre (rôle trop élevé ou permission manquante).", ephemeral: true });
    await member.timeout(duration, reason);
    await interaction.reply({ content: `🔇 **${member.user.tag}** est exclu pour ${formatDuration(duration)}.`, ephemeral: true });
    return log(interaction.guild, "Membre exclu temporairement", `${member.user.tag} (${member.id})\nDurée : ${formatDuration(duration)}\nMotif : ${reason}`, 0xf97316);
  }

  if (interaction.commandName === "unexclu") {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    const reason = interaction.options.getString("raison") ?? `Exclusion retirée par ${interaction.user.tag}`;
    if (!member?.moderatable) return interaction.reply({ content: "Je ne peux pas modifier ce membre.", ephemeral: true });
    if (!member.isCommunicationDisabled()) return interaction.reply({ content: "Ce membre n'est pas actuellement exclu.", ephemeral: true });
    await member.timeout(null, reason);
    await interaction.reply({ content: `🔊 L'exclusion de **${member.user.tag}** a été retirée.`, ephemeral: true });
    return log(interaction.guild, "Exclusion retirée", `${member.user.tag} (${member.id})\nMotif : ${reason}`, 0x22c55e);
  }

  if (interaction.commandName === "publier") {
    if (interaction.channelId !== config.announcementChannelId) return interaction.reply({ content: `Cette commande est réservée au salon <#${config.announcementChannelId}>.`, ephemeral: true });
    const message = interaction.options.getString("message", true);
    const attachment = interaction.options.getAttachment("image");
    const urlInput = interaction.options.getString("image_url");
    if (attachment && !attachment.contentType?.startsWith("image/")) return interaction.reply({ content: "Le fichier joint doit être une image.", ephemeral: true });
    const imageUrl = attachment?.url ?? safeHttpsUrl(urlInput);
    if (urlInput && !imageUrl) return interaction.reply({ content: "L'URL de l'image doit être une URL HTTPS valide.", ephemeral: true });
    const embed = new EmbedBuilder().setDescription(message).setColor(0x8b5cf6).setTimestamp();
    if (imageUrl) embed.setImage(imageUrl);
    await (interaction.channel as TextChannel).send({ embeds: [embed] });
    return interaction.reply({ content: "Annonce publiée.", ephemeral: true });
  }

  if (interaction.commandName === "lockdown") {
    await interaction.deferReply({ ephemeral: true });
    const enabled = interaction.options.getString("action", true) === "on";
    const count = await setLockdown(interaction.guild, enabled);
    await interaction.editReply(`${enabled ? "🔒 Serveur verrouillé" : "🔓 Serveur déverrouillé"} (${count} salons traités).`);
    return log(interaction.guild, enabled ? "Lockdown activé" : "Lockdown désactivé", `Action manuelle par ${interaction.user.tag}.`, enabled ? 0xef4444 : 0x22c55e);
  }

  if (interaction.commandName === "antiraid") {
    return interaction.reply({ content: [`Protection : **${config.antiRaidEnabled ? "active" : "inactive"}**`, `Seuil : **${config.raidJoinLimit} arrivées / ${config.raidWindowMs / 1000}s**`, `Âge minimal : **${config.minAccountAgeMs / 3_600_000}h**`, `Lockdown : **${lockedGuilds.has(interaction.guild.id) ? "actif" : "inactif"}**`].join("\n"), ephemeral: true });
  }
}

client.once(Events.ClientReady, async (ready) => {
  await loadScheduledBans();
  console.log(`Connecté en tant que ${ready.user.tag}.`);
  setInterval(async () => {
    for (const ban of await takeExpiredBans()) {
      const guild = ready.guilds.cache.get(ban.guildId);
      if (!guild) continue;
      const user = await guild.bans.fetch(ban.userId).catch(() => null);
      if (!user) continue;
      await guild.members.unban(ban.userId, "Fin du bannissement temporaire").catch(console.error);
      await log(guild, "Bannissement temporaire terminé", `${user.user.tag} (${ban.userId}) a été débanni automatiquement.`, 0x22c55e);
    }
  }, 30_000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) await handleCommand(interaction);
    else if (interaction.isUserContextMenuCommand() && interaction.commandName === "Informations du compte") {
      const ageDays = Math.floor((Date.now() - interaction.targetUser.createdTimestamp) / 86_400_000);
      await interaction.reply({ content: `Compte : **${interaction.targetUser.tag}**\nIdentifiant : \`${interaction.targetId}\`\nÂge : **${ageDays} jours**\nCréé : <t:${Math.floor(interaction.targetUser.createdTimestamp / 1000)}:F>`, ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    const payload = { content: "Une erreur est survenue. Vérifie mes permissions et les logs.", ephemeral: true };
    if (interaction.isRepliable()) interaction.replied || interaction.deferred ? await interaction.followUp(payload).catch(() => undefined) : await interaction.reply(payload).catch(() => undefined);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (!config.antiRaidEnabled) return;
  const now = Date.now();
  const joins = (recentJoins.get(member.guild.id) ?? []).filter((time) => now - time <= config.raidWindowMs);
  joins.push(now);
  recentJoins.set(member.guild.id, joins);

  const accountAge = now - member.user.createdTimestamp;
  if (config.quarantineRoleId && accountAge < config.minAccountAgeMs) {
    await member.roles.add(config.quarantineRoleId, "Compte récent : quarantaine anti-raid").catch(() => undefined);
    await log(member.guild, "Compte récent mis en quarantaine", `${member.user.tag} (${member.id}) — compte âgé de ${Math.floor(accountAge / 3_600_000)}h.`, 0xf59e0b);
  }

  if (joins.length >= config.raidJoinLimit && !lockedGuilds.has(member.guild.id)) {
    const count = await setLockdown(member.guild, true);
    await log(member.guild, "🚨 Raid potentiel détecté", `${joins.length} arrivées en ${config.raidWindowMs / 1000}s. Lockdown automatique activé sur ${count} salons.`, 0xdc2626);
  }
});

process.on("unhandledRejection", console.error);
await client.login(config.token);
