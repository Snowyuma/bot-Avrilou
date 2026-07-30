import { AuditLogEvent, ChannelType, Client, EmbedBuilder, Events, GatewayIntentBits, Partials, PermissionFlagsBits, } from "discord.js";
import { config, getGuildConfig } from "./config.js";
import { getDueBirthdays, loadBirthdays, markBirthdayCelebrated, saveBirthday } from "./birthdays.js";
import { formatDuration, parseDuration } from "./durations.js";
import { cancelScheduledBan, loadScheduledBans, scheduleBan, takeExpiredBans } from "./scheduled-bans.js";
import { addWarning, getWarnings, loadWarnings, removeLatestWarning } from "./warnings.js";
const client = new Client({
    partials: [Partials.Channel, Partials.Message, Partials.User],
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
});
const recentJoins = new Map();
const lockedGuilds = new Set();
const chatReplies = {
    greetings: [
        "Salut ! Comment ça va ?",
        "Coucou ! Tu voulais me parler ?",
        "Bonjour humain, je suis tout ouïe.",
        "Salut ! J'espère que ta journée se passe bien.",
    ],
    wellbeing: [
        "Ça va très bien, mes circuits sont de bonne humeur.",
        "Impeccable ! Aucun bug à signaler… pour le moment.",
        "Ça roule, merci ! Et toi ?",
        "Toujours en ligne, donc plutôt bien.",
    ],
    activity: [
        "Je surveille le serveur en faisant semblant d'être très occupé.",
        "J'attends qu'on me donne du travail… ou une part de pizza.",
        "Je compte les messages. J'en étais à beaucoup.",
        "Je médite sur la différence entre un bug et une fonctionnalité.",
    ],
    thanks: [
        "Avec plaisir !",
        "De rien, c'est mon métier numérique.",
        "Toujours là pour aider !",
        "Pas de souci !",
    ],
    jokes: [
        "Toto demande à sa maîtresse : « On peut être puni pour quelque chose qu'on n'a pas fait ? » Elle répond non. Toto dit : « Super, je n'ai pas fait mes devoirs ! »",
        "Pourquoi Toto met-il son réveil dans le réfrigérateur ? Pour se lever de bonne heure… bien fraîche.",
        "La maîtresse demande à Toto de conjuguer « marcher ». Toto répond : « Je marche, tu marches… » Elle dit : « Plus vite ! » Toto répond : « Je cours, tu cours… »",
        "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tombent dans le bateau.",
        "Quel est le comble pour un électricien ? De ne pas être au courant.",
        "Que dit une imprimante dans l'eau ? J'ai papier.",
    ],
    farewells: [
        "À bientôt ! Prends soin de toi.",
        "Salut, reviens vite !",
        "À plus tard, humain.",
        "Bonne continuation et à la prochaine !",
    ],
    goodnight: [
        "Bonne nuit, fais de beaux rêves ! 🌙",
        "Dors bien, je surveille le serveur pendant ce temps.",
        "Bonne nuit ! Recharge bien tes batteries.",
        "À demain, repose-toi bien !",
    ],
    affection: [
        "Bien sûr que je t'aime, à ma façon de petit bot. 💜",
        "Je t'apprécie énormément, mais garde-moi une place dans ton processeur.",
        "Oui ! Même quand tu me poses des questions bizarres.",
        "Tu fais partie de mes humains préférés.",
    ],
    compliments: [
        "Tu es incroyable, ne laisse personne te dire le contraire.",
        "Aujourd'hui, je te donne officiellement la note de 20/20.",
        "Tu as beaucoup de style, c'est validé par mes circuits.",
        "Franchement ? Tu gères.",
    ],
    status: [
        "Oui, je fonctionne ! Tous mes circuits sont réveillés.",
        "Présente et opérationnelle.",
        "Je suis bien en ligne et prête à aider.",
        "Tout va bien de mon côté !",
    ],
    bored: [
        "On peut discuter, faire pile ou face, ou demander une blague.",
        "Je te propose une activité révolutionnaire : embêter gentiment les modérateurs.",
        "Demande-moi une blague, ça ne guérira peut-être pas l'ennui mais ça aidera.",
        "Profites-en pour dire quelque chose de gentil à quelqu'un sur le serveur.",
    ],
};
function randomReply(replies) {
    return replies[Math.floor(Math.random() * replies.length)];
}
function getMentionReply(content, botId, randomMember) {
    const text = content
        .replace(new RegExp(`<@!?${botId}>`, "g"), " ")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase("fr")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (/\b(blague|vanne|rire|rigoler)\b/.test(text))
        return randomReply(chatReplies.jokes);
    if (/\b(qui est|c est qui|parle moi de).*\b(snow|yuma|snowyuma)\b/.test(text)) {
        return "C'est mon papa, le plus fort et le plus beau de l'univers. 💜";
    }
    if (/\b(qui|quelle personne|lequel|laquelle).*\b(plus nul|plus nulle)\b/.test(text) && randomMember) {
        return `Après une analyse totalement scientifique et absolument pas truquée… je choisis **${randomMember}** ! C'est pour rire, évidemment.`;
    }
    if (/\b(ca va|comment vas tu|comment tu vas|tu vas bien)\b/.test(text))
        return randomReply(chatReplies.wellbeing);
    if (/\b(tu fais quoi|que fais tu|qu est ce que tu fais|quoi de neuf)\b/.test(text))
        return randomReply(chatReplies.activity);
    if (/\b(merci|thanks)\b/.test(text))
        return randomReply(chatReplies.thanks);
    if (/\b(au revoir|a plus|a bientot|salut bye|bye)\b/.test(text))
        return randomReply(chatReplies.farewells);
    if (/\b(bonne nuit|je vais dormir|dodo|vais me coucher)\b/.test(text))
        return randomReply(chatReplies.goodnight);
    if (/\b(tu m aime|tu nous aime|je t aime|bisou|calin)\b/.test(text))
        return randomReply(chatReplies.affection);
    if (/\b(dis moi quelque chose de gentil|complimente moi|remonte moi le moral|je suis nul|je suis nulle)\b/.test(text))
        return randomReply(chatReplies.compliments);
    if (/\b(tu fonctionne|tu marches|tu es en ligne|t es en ligne|ping|tu es la)\b/.test(text))
        return randomReply(chatReplies.status);
    if (/\b(je m ennuie|on s ennuie|quoi faire|ennui)\b/.test(text))
        return randomReply(chatReplies.bored);
    if (/\b(pile ou face)\b/.test(text))
        return Math.random() < 0.5 ? "🪙 Pile !" : "🪙 Face !";
    if (/\b(aide|help|que peux tu faire|tes commandes)\b/.test(text)) {
        return "Je peux discuter, raconter une blague, faire pile ou face, répondre à quelques questions et réagir à certains mots. Pour les outils du serveur, tape `/` pour voir mes commandes.";
    }
    if (!text || /\b(salut|bonjour|bonsoir|coucou|hello|hey)\b/.test(text))
        return randomReply(chatReplies.greetings);
    if (/\b(qui es tu|t es qui|ton nom)\b/.test(text))
        return "Je suis Avrilou Bot, gardien du serveur et raconteur officiel de blagues nulles.";
    return "Je n'ai pas encore compris cette question, mais tu peux me demander comment je vais, ce que je fais ou une petite vanne.";
}
function currentParisDate() {
    const parts = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris",
        day: "numeric",
        month: "numeric",
        year: "numeric",
    }).formatToParts(new Date());
    const value = (type) => Number(parts.find((part) => part.type === type)?.value);
    return { day: value("day"), month: value("month"), year: value("year") };
}
async function celebrateBirthdays() {
    const { day, month, year } = currentParisDate();
    for (const guildConfig of config.guilds.values()) {
        const guild = client.guilds.cache.get(guildConfig.guildId);
        if (!guild)
            continue;
        const channel = await guild.channels.fetch(guildConfig.birthdayChannelId).catch(() => null);
        if (!channel?.isTextBased() || !("send" in channel))
            continue;
        for (const birthday of getDueBirthdays(guild.id, day, month, year)) {
            const member = await guild.members.fetch(birthday.userId).catch(() => null);
            if (!member)
                continue;
            const sent = await channel.send({
                content: `🎂 Joyeux anniversaire ${member} ! Toute l'équipe te souhaite une excellente journée ! 🎉`,
                allowedMentions: { users: [member.id] },
            }).then(() => true).catch((error) => {
                console.error(`Impossible de souhaiter l'anniversaire de ${member.user.tag} :`, error);
                return false;
            });
            if (sent)
                await markBirthdayCelebrated(guild.id, member.id, year);
        }
    }
}
async function log(guild, title, description, color = 0xf59e0b) {
    const guildConfig = getGuildConfig(guild.id);
    if (!guildConfig)
        return;
    const channel = await guild.channels.fetch(guildConfig.modLogChannelId).catch(() => null);
    if (!channel?.isTextBased())
        return;
    await channel.send({ embeds: [new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp()] }).catch(console.error);
}
function clipped(value, limit = 1500) {
    const text = value?.trim() || "(vide ou indisponible)";
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
async function activityLog(guild, title, description, color = 0x64748b) {
    const guildConfig = getGuildConfig(guild.id);
    if (!guildConfig)
        return;
    const channel = await guild.channels.fetch(guildConfig.activityLogChannelId).catch(() => null);
    if (!channel?.isTextBased() || !("send" in channel))
        return;
    await channel.send({
        embeds: [new EmbedBuilder().setTitle(title).setDescription(description.slice(0, 4096)).setColor(color).setTimestamp()],
        allowedMentions: { parse: [] },
    }).catch((error) => console.error("Impossible d'envoyer un journal d'activité :", error));
}
async function auditExecutor(guild, action, targetId) {
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog))
        return null;
    await new Promise((resolve) => setTimeout(resolve, 750));
    const audit = await guild.fetchAuditLogs({ type: action, limit: 5 }).catch(() => null);
    const entry = audit?.entries.find((item) => item.targetId === targetId && Date.now() - item.createdTimestamp < 5_000);
    return entry?.executor ? `${entry.executor} (${entry.executor.id})` : null;
}
function permissionSnapshot(channel) {
    return [...channel.permissionOverwrites.cache.values()]
        .map((overwrite) => `${overwrite.id}:${overwrite.type}:${overwrite.allow.bitfield}:${overwrite.deny.bitfield}`)
        .sort()
        .join("|");
}
function channelChanges(oldChannel, newChannel) {
    const changes = [];
    if (oldChannel.name !== newChannel.name)
        changes.push(`Nom : **${oldChannel.name}** → **${newChannel.name}**`);
    if (oldChannel.parentId !== newChannel.parentId) {
        changes.push(`Catégorie : ${oldChannel.parentId ? `<#${oldChannel.parentId}>` : "aucune"} → ${newChannel.parentId ? `<#${newChannel.parentId}>` : "aucune"}`);
    }
    if (oldChannel.rawPosition !== newChannel.rawPosition)
        changes.push(`Position : **${oldChannel.rawPosition}** → **${newChannel.rawPosition}**`);
    if ("topic" in oldChannel && "topic" in newChannel && oldChannel.topic !== newChannel.topic) {
        changes.push(`Sujet : ${clipped(String(oldChannel.topic ?? "(aucun)"), 300)} → ${clipped(String(newChannel.topic ?? "(aucun)"), 300)}`);
    }
    if ("nsfw" in oldChannel && "nsfw" in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
        changes.push(`NSFW : **${oldChannel.nsfw ? "oui" : "non"}** → **${newChannel.nsfw ? "oui" : "non"}**`);
    }
    if ("rateLimitPerUser" in oldChannel && "rateLimitPerUser" in newChannel && oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push(`Mode lent : **${oldChannel.rateLimitPerUser}s** → **${newChannel.rateLimitPerUser}s**`);
    }
    if ("bitrate" in oldChannel && "bitrate" in newChannel && oldChannel.bitrate !== newChannel.bitrate) {
        changes.push(`Débit vocal : **${oldChannel.bitrate}** → **${newChannel.bitrate}**`);
    }
    if ("userLimit" in oldChannel && "userLimit" in newChannel && oldChannel.userLimit !== newChannel.userLimit) {
        changes.push(`Limite d'utilisateurs : **${oldChannel.userLimit || "aucune"}** → **${newChannel.userLimit || "aucune"}**`);
    }
    if (permissionSnapshot(oldChannel) !== permissionSnapshot(newChannel))
        changes.push("Permissions du salon modifiées.");
    return changes;
}
function commandOptions(interaction) {
    if (!interaction.options.data.length)
        return "(aucune)";
    return interaction.options.data.map((option) => {
        if (option.name === "message")
            return `**${option.name}** : (contenu masqué)`;
        if (option.user)
            return `**${option.name}** : ${option.user.tag} (${option.user.id})`;
        if (option.channel)
            return `**${option.name}** : <#${option.channel.id}> (${option.channel.id})`;
        if (option.attachment)
            return `**${option.name}** : ${option.attachment.name}`;
        return `**${option.name}** : ${clipped(option.value === undefined ? "(non renseigné)" : String(option.value), 500)}`;
    }).join("\n");
}
async function setLockdown(guild, enabled) {
    const guildConfig = getGuildConfig(guild.id);
    if (!guildConfig)
        return 0;
    const channels = await guild.channels.fetch();
    let changed = 0;
    for (const channel of channels.values()) {
        if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement))
            continue;
        if (channel.id === guildConfig.modLogChannelId)
            continue;
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: enabled ? false : null }, { reason: "Protection anti-raid" }).catch(() => undefined);
        changed++;
    }
    enabled ? lockedGuilds.add(guild.id) : lockedGuilds.delete(guild.id);
    return changed;
}
function safeHttpsUrl(value) {
    if (!value)
        return undefined;
    try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.toString() : undefined;
    }
    catch {
        return undefined;
    }
}
async function notifySanction(member, sanction, reason, duration) {
    const lines = [
        `Tu as reçu une sanction sur **${member.guild.name}**.`,
        `Sanction : **${sanction}**`,
        `Raison : **${reason}**`,
    ];
    if (duration)
        lines.push(`Durée : **${duration}**`);
    lines.push("Si tu penses qu'il s'agit d'une erreur, contacte l'équipe de modération du serveur.");
    try {
        await member.user.send({ embeds: [new EmbedBuilder().setTitle("Notification de modération").setDescription(lines.join("\n")).setColor(0xef4444).setTimestamp()] });
        return { sent: true };
    }
    catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : undefined;
        console.error(`Impossible d'envoyer un MP à ${member.user.tag}${code ? ` (code Discord ${code})` : ""}.`);
        return { sent: false, error: code };
    }
}
async function handleCommand(interaction) {
    if (!interaction.guild)
        return interaction.reply({ content: "Commande utilisable uniquement sur un serveur.", ephemeral: true });
    const guildConfig = getGuildConfig(interaction.guild.id);
    if (!guildConfig)
        return interaction.reply({ content: "Ce bot n'est pas configuré pour ce serveur.", ephemeral: true });
    if (interaction.commandName === "ban") {
        const user = interaction.options.getUser("membre", true);
        const reason = interaction.options.getString("raison") ?? `Banni par ${interaction.user.tag}`;
        const hours = interaction.options.getInteger("supprimer_messages") ?? 0;
        const durationInput = interaction.options.getString("duree");
        const duration = durationInput ? parseDuration(durationInput) : null;
        if (durationInput && !duration)
            return interaction.reply({ content: "Durée invalide. Utilise par exemple `30m`, `12h` ou `7j`.", ephemeral: true });
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member && !member.bannable)
            return interaction.reply({ content: "Je ne peux pas bannir ce membre (rôle trop élevé ou permission manquante).", ephemeral: true });
        const durationLabel = duration ? formatDuration(duration) : "permanent";
        const dmResult = member ? await notifySanction(member, "Bannissement", reason, durationLabel) : { sent: false };
        await interaction.guild.members.ban(user, { reason, deleteMessageSeconds: hours * 3600 });
        if (duration)
            await scheduleBan({ guildId: interaction.guild.id, userId: user.id, expiresAt: Date.now() + duration });
        else
            await cancelScheduledBan(interaction.guild.id, user.id);
        await interaction.reply({ content: `🔨 **${user.tag}** a été banni (${durationLabel}). Message privé : ${dmResult.sent ? "envoyé" : "refusé par Discord"}.`, ephemeral: true });
        return log(interaction.guild, "Membre banni", `${user.tag} (${user.id})\nDurée : ${durationLabel}\nMotif : ${reason}\nMessage privé : ${dmResult.sent ? "envoyé" : "non envoyé"}`, 0xef4444);
    }
    if (interaction.commandName === "testmp") {
        const member = interaction.options.getMember("membre");
        if (!member)
            return interaction.reply({ content: "Ce membre est introuvable sur le serveur.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        const result = await notifySanction(member, "Test de message privé", "Ceci est un test, aucune sanction n'a été appliquée.");
        if (result.sent)
            return interaction.editReply(`✅ Le message privé a bien été envoyé à **${member.user.tag}**.`);
        return interaction.editReply(`❌ Discord a refusé le message privé à **${member.user.tag}**${result.error ? ` (code ${result.error})` : ""}. La personne doit autoriser les MP des membres du serveur et ne pas avoir bloqué le bot.`);
    }
    if (interaction.commandName === "mp") {
        const user = interaction.options.getUser("membre", true);
        const message = interaction.options.getString("message", true).trim();
        if (user.bot)
            return interaction.reply({ content: "Tu ne peux pas envoyer ce message privé à un bot.", ephemeral: true });
        if (!message)
            return interaction.reply({ content: "Le message privé ne peut pas être vide.", ephemeral: true });
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member)
            return interaction.reply({ content: "Ce membre est introuvable sur le serveur.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        try {
            await user.send(message);
            const loggedMessage = message.length > 3200 ? `${message.slice(0, 3200)}…` : message;
            await log(interaction.guild, `Message privé envoyé à ${user.tag}`, `Destinataire : ${user} (${user.id})\nEnvoyé par : ${interaction.user} (${interaction.user.id})\nMessage : ${loggedMessage}`, 0x8b5cf6);
            return interaction.editReply(`✉️ Le message privé a bien été envoyé à **${user.tag}**.`);
        }
        catch (error) {
            const code = typeof error === "object" && error && "code" in error ? String(error.code) : undefined;
            console.error(`Impossible d'envoyer un MP à ${user.tag}${code ? ` (code Discord ${code})` : ""}.`);
            return interaction.editReply(`❌ Discord a refusé le message privé à **${user.tag}**${code ? ` (code ${code})` : ""}. La personne doit autoriser les MP des membres du serveur et ne pas avoir bloqué le bot.`);
        }
    }
    if (interaction.commandName === "avertissement") {
        const user = interaction.options.getUser("membre", true);
        const reason = interaction.options.getString("raison", true).trim();
        if (user.bot)
            return interaction.reply({ content: "Tu ne peux pas donner un avertissement à un bot.", ephemeral: true });
        if (user.id === interaction.user.id)
            return interaction.reply({ content: "Tu ne peux pas te donner un avertissement à toi-même.", ephemeral: true });
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member)
            return interaction.reply({ content: "Ce membre est introuvable sur le serveur.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        const dmResult = await notifySanction(member, "Avertissement", reason);
        const warningCount = await addWarning({
            guildId: interaction.guild.id,
            userId: user.id,
            moderatorId: interaction.user.id,
            reason,
            createdAt: Date.now(),
        });
        await log(interaction.guild, `Avertissement pour ${user.tag}`, `Membre : ${user} (${user.id})\nModérateur : ${interaction.user} (${interaction.user.id})\nRaison : ${reason}\nTotal : ${warningCount}\nMessage privé : ${dmResult.sent ? "envoyé" : "non envoyé"}`, 0xf59e0b);
        return interaction.editReply(`⚠️ Avertissement n°${warningCount} enregistré pour **${user.tag}**. Message privé : ${dmResult.sent ? "envoyé" : "non envoyé (MP fermés ou bot bloqué)"}.`);
    }
    if (interaction.commandName === "avertissements") {
        const user = interaction.options.getUser("membre", true);
        const warnings = getWarnings(interaction.guild.id, user.id);
        if (!warnings.length)
            return interaction.reply({ content: `**${user.tag}** n'a aucun avertissement.`, ephemeral: true });
        const history = warnings.slice(-10).map((warning, index) => `**${warnings.length - Math.min(10, warnings.length) + index + 1}.** <t:${Math.floor(warning.createdAt / 1000)}:d> — ${clipped(warning.reason, 250)} — <@${warning.moderatorId}>`);
        return interaction.reply({
            content: `⚠️ **${warnings.length} avertissement(s) pour ${user.tag}**\n${history.join("\n")}${warnings.length > 10 ? "\n_Les 10 plus récents sont affichés._" : ""}`,
            ephemeral: true,
            allowedMentions: { parse: [] },
        });
    }
    if (interaction.commandName === "retireravertissement") {
        const user = interaction.options.getUser("membre", true);
        const removalReason = interaction.options.getString("raison")?.trim() || "Aucun motif indiqué";
        const removed = await removeLatestWarning(interaction.guild.id, user.id);
        if (!removed)
            return interaction.reply({ content: `**${user.tag}** n'a aucun avertissement à retirer.`, ephemeral: true });
        const remaining = getWarnings(interaction.guild.id, user.id).length;
        await log(interaction.guild, `Avertissement retiré pour ${user.tag}`, `Membre : ${user} (${user.id})\nModérateur : ${interaction.user} (${interaction.user.id})\nAvertissement retiré : ${removed.reason}\nMotif du retrait : ${removalReason}\nTotal restant : ${remaining}`, 0x22c55e);
        return interaction.reply({ content: `✅ Dernier avertissement de **${user.tag}** retiré. Total restant : **${remaining}**.`, ephemeral: true });
    }
    if (interaction.commandName === "unban") {
        const userId = interaction.options.getString("utilisateur_id", true).trim();
        const reason = interaction.options.getString("raison") ?? `Débanni par ${interaction.user.tag}`;
        if (!/^\d{17,20}$/.test(userId))
            return interaction.reply({ content: "L'identifiant Discord est invalide.", ephemeral: true });
        const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!ban)
            return interaction.reply({ content: "Cet utilisateur n'est pas banni sur ce serveur.", ephemeral: true });
        await interaction.guild.members.unban(userId, reason);
        await cancelScheduledBan(interaction.guild.id, userId);
        await interaction.reply({ content: `✅ **${ban.user.tag}** a été débanni.`, ephemeral: true });
        return log(interaction.guild, "Membre débanni", `${ban.user.tag} (${userId})\nMotif : ${reason}`, 0x22c55e);
    }
    if (interaction.commandName === "expulser") {
        const member = interaction.options.getMember("membre");
        const reason = interaction.options.getString("raison") ?? `Expulsé par ${interaction.user.tag}`;
        if (!member?.kickable)
            return interaction.reply({ content: "Je ne peux pas expulser ce membre.", ephemeral: true });
        await member.kick(reason);
        await interaction.reply({ content: `👢 **${member.user.tag}** a été expulsé.`, ephemeral: true });
        return log(interaction.guild, "Membre expulsé", `${member.user.tag} (${member.id})\nMotif : ${reason}`, 0xf97316);
    }
    if (interaction.commandName === "exclu") {
        const member = interaction.options.getMember("membre");
        const durationInput = interaction.options.getString("duree", true);
        const duration = parseDuration(durationInput);
        const reason = interaction.options.getString("raison") ?? `Exclu par ${interaction.user.tag}`;
        if (!duration)
            return interaction.reply({ content: "Durée invalide. Utilise par exemple `10m`, `2h` ou `7j`.", ephemeral: true });
        if (duration > 28 * 86_400_000)
            return interaction.reply({ content: "Discord limite une exclusion temporaire à 28 jours.", ephemeral: true });
        if (!member?.moderatable)
            return interaction.reply({ content: "Je ne peux pas exclure ce membre (rôle trop élevé ou permission manquante).", ephemeral: true });
        await member.timeout(duration, reason);
        await interaction.reply({ content: `🔇 **${member.user.tag}** est exclu pour ${formatDuration(duration)}.`, ephemeral: true });
        return log(interaction.guild, "Membre exclu temporairement", `${member.user.tag} (${member.id})\nDurée : ${formatDuration(duration)}\nMotif : ${reason}`, 0xf97316);
    }
    if (interaction.commandName === "unexclu") {
        const member = interaction.options.getMember("membre");
        const reason = interaction.options.getString("raison") ?? `Exclusion retirée par ${interaction.user.tag}`;
        if (!member?.moderatable)
            return interaction.reply({ content: "Je ne peux pas modifier ce membre.", ephemeral: true });
        if (!member.isCommunicationDisabled())
            return interaction.reply({ content: "Ce membre n'est pas actuellement exclu.", ephemeral: true });
        await member.timeout(null, reason);
        await interaction.reply({ content: `🔊 L'exclusion de **${member.user.tag}** a été retirée.`, ephemeral: true });
        return log(interaction.guild, "Exclusion retirée", `${member.user.tag} (${member.id})\nMotif : ${reason}`, 0x22c55e);
    }
    if (interaction.commandName === "creationanniv") {
        if (interaction.channelId !== guildConfig.birthdayRegistrationChannelId) {
            return interaction.reply({
                content: `Cette commande est utilisable uniquement dans <#${guildConfig.birthdayRegistrationChannelId}>.`,
                ephemeral: true,
            });
        }
        const user = interaction.options.getUser("membre", true);
        const dateInput = interaction.options.getString("date", true).trim();
        if (user.bot)
            return interaction.reply({ content: "Tu ne peux pas enregistrer l'anniversaire d'un bot.", ephemeral: true });
        const match = /^(\d{1,2})\/(\d{1,2})$/.exec(dateInput);
        if (!match)
            return interaction.reply({ content: "Date invalide. Utilise le format `JJ/MM`, par exemple `24/12`.", ephemeral: true });
        const day = Number(match[1]);
        const month = Number(match[2]);
        const testDate = new Date(Date.UTC(2000, month - 1, day));
        if (testDate.getUTCDate() !== day || testDate.getUTCMonth() !== month - 1) {
            return interaction.reply({ content: "Cette date n'existe pas. Vérifie le jour et le mois.", ephemeral: true });
        }
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member)
            return interaction.reply({ content: "Ce membre est introuvable sur le serveur.", ephemeral: true });
        await saveBirthday({ guildId: interaction.guild.id, userId: user.id, day, month });
        const formattedDate = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
        await interaction.reply({ content: `🎂 Anniversaire de **${user.tag}** enregistré pour le **${formattedDate}**.`, ephemeral: true });
        return log(interaction.guild, "Anniversaire enregistré", `${user.tag} (${user.id})\nDate : ${formattedDate}\nEnregistré par : ${interaction.user.tag}`, 0xec4899);
    }
    if (interaction.commandName === "publier") {
        const selectedChannel = interaction.options.getChannel("salon");
        const targetChannel = await interaction.guild.channels.fetch(selectedChannel?.id ?? interaction.channelId).catch(() => null);
        const allowedChannelIds = [...new Set([...guildConfig.announcementChannelIds, guildConfig.modLogChannelId])];
        if (!targetChannel || !allowedChannelIds.includes(targetChannel.id)) {
            const allowed = allowedChannelIds.map((id) => `<#${id}>`).join(", ");
            return interaction.reply({ content: `Ce salon n'est pas autorisé pour les publications.${allowed ? ` Salons autorisés : ${allowed}.` : ""}`, ephemeral: true });
        }
        if (!targetChannel?.isTextBased() || !("send" in targetChannel))
            return interaction.reply({ content: "Le salon sélectionné ne permet pas l'envoi de messages.", ephemeral: true });
        const message = interaction.options.getString("message", true);
        const replyToMessageId = interaction.options.getString("message_id")?.trim();
        const attachment = interaction.options.getAttachment("image");
        const urlInput = interaction.options.getString("image_url");
        if (replyToMessageId && !/^\d{17,20}$/.test(replyToMessageId)) {
            return interaction.reply({ content: "L'identifiant du message est invalide. Active le mode développeur Discord, puis utilise « Copier l'identifiant du message ».", ephemeral: true });
        }
        if (attachment && !attachment.contentType?.startsWith("image/"))
            return interaction.reply({ content: "Le fichier joint doit être une image.", ephemeral: true });
        const imageUrl = attachment?.url ?? safeHttpsUrl(urlInput);
        if (urlInput && !imageUrl)
            return interaction.reply({ content: "L'URL de l'image doit être une URL HTTPS valide.", ephemeral: true });
        const payload = {
            content: message,
            files: imageUrl ? [imageUrl] : [],
        };
        if (replyToMessageId) {
            if (!("messages" in targetChannel))
                return interaction.reply({ content: "Ce salon ne permet pas de répondre à un message.", ephemeral: true });
            const targetMessage = await targetChannel.messages.fetch(replyToMessageId).catch(() => null);
            if (!targetMessage)
                return interaction.reply({ content: "Message introuvable dans le salon sélectionné. Vérifie le salon et l'identifiant.", ephemeral: true });
            await targetMessage.reply(payload);
            return interaction.reply({ content: `Réponse publiée dans <#${targetChannel.id}>.`, ephemeral: true });
        }
        await targetChannel.send(payload);
        return interaction.reply({ content: `Message publié dans <#${targetChannel.id}>.`, ephemeral: true });
    }
    if (interaction.commandName === "lockdown") {
        await interaction.deferReply({ ephemeral: true });
        const enabled = interaction.options.getString("action", true) === "on";
        const count = await setLockdown(interaction.guild, enabled);
        await interaction.editReply(`${enabled ? "🔒 Serveur verrouillé" : "🔓 Serveur déverrouillé"} (${count} salons traités).`);
        return log(interaction.guild, enabled ? "Lockdown activé" : "Lockdown désactivé", `Action manuelle par ${interaction.user.tag}.`, enabled ? 0xef4444 : 0x22c55e);
    }
    if (interaction.commandName === "antiraid") {
        return interaction.reply({ content: [`Protection : **${guildConfig.antiRaidEnabled ? "active" : "inactive"}**`, `Seuil : **${guildConfig.raidJoinLimit} arrivées / ${guildConfig.raidWindowMs / 1000}s**`, `Âge minimal : **${guildConfig.minAccountAgeMs / 3_600_000}h**`, `Lockdown : **${lockedGuilds.has(interaction.guild.id) ? "actif" : "inactif"}**`].join("\n"), ephemeral: true });
    }
}
client.once(Events.ClientReady, async (ready) => {
    await loadScheduledBans();
    await loadBirthdays();
    await loadWarnings();
    console.log(`Connecté en tant que ${ready.user.tag}.`);
    await celebrateBirthdays();
    setInterval(() => void celebrateBirthdays().catch(console.error), 15 * 60_000);
    setInterval(async () => {
        for (const ban of await takeExpiredBans()) {
            const guild = ready.guilds.cache.get(ban.guildId);
            if (!guild)
                continue;
            const user = await guild.bans.fetch(ban.userId).catch(() => null);
            if (!user)
                continue;
            await guild.members.unban(ban.userId, "Fin du bannissement temporaire").catch(console.error);
            await log(guild, "Bannissement temporaire terminé", `${user.user.tag} (${ban.userId}) a été débanni automatiquement.`, 0x22c55e);
        }
    }, 30_000);
});
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.guild && getGuildConfig(interaction.guild.id)) {
                await activityLog(interaction.guild, `Commande /${interaction.commandName}`, `Utilisateur : ${interaction.user} (${interaction.user.tag} — ${interaction.user.id})\nSalon : <#${interaction.channelId}>\nOptions :\n${commandOptions(interaction)}`, 0x8b5cf6);
            }
            await handleCommand(interaction);
        }
        else if (interaction.isUserContextMenuCommand() && interaction.commandName === "Informations du compte") {
            if (interaction.guild && getGuildConfig(interaction.guild.id)) {
                await activityLog(interaction.guild, `Commande ${interaction.commandName}`, `Utilisateur : ${interaction.user} (${interaction.user.tag} — ${interaction.user.id})\nCible : ${interaction.targetUser} (${interaction.targetUser.tag} — ${interaction.targetId})\nSalon : <#${interaction.channelId}>`, 0x8b5cf6);
            }
            const ageDays = Math.floor((Date.now() - interaction.targetUser.createdTimestamp) / 86_400_000);
            await interaction.reply({ content: `Compte : **${interaction.targetUser.tag}**\nIdentifiant : \`${interaction.targetId}\`\nÂge : **${ageDays} jours**\nCréé : <t:${Math.floor(interaction.targetUser.createdTimestamp / 1000)}:F>`, ephemeral: true });
        }
    }
    catch (error) {
        console.error(error);
        const payload = { content: "Une erreur est survenue. Vérifie mes permissions et les logs.", ephemeral: true };
        if (interaction.isRepliable())
            interaction.replied || interaction.deferred ? await interaction.followUp(payload).catch(() => undefined) : await interaction.reply(payload).catch(() => undefined);
    }
});
client.on(Events.ChannelCreate, async (channel) => {
    const guildConfig = getGuildConfig(channel.guild.id);
    if (!guildConfig)
        return;
    const executor = await auditExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    await activityLog(channel.guild, "Salon créé", `Salon : ${channel} (**${channel.name}** — ${channel.id})\nType : **${ChannelType[channel.type] ?? channel.type}**${channel.parentId ? `\nCatégorie : <#${channel.parentId}>` : ""}${executor ? `\nCréé par : ${executor}` : ""}`, 0x22c55e);
});
client.on(Events.ChannelDelete, async (channel) => {
    if (!getGuildConfig(channel.guild.id))
        return;
    const executor = await auditExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    await activityLog(channel.guild, "Salon supprimé", `Salon : **${channel.name}** (${channel.id})\nType : **${ChannelType[channel.type] ?? channel.type}**${channel.parentId ? `\nAncienne catégorie : <#${channel.parentId}>` : ""}${executor ? `\nSupprimé par : ${executor}` : ""}`, 0xef4444);
});
client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    if (!getGuildConfig(newChannel.guild.id))
        return;
    const changes = channelChanges(oldChannel, newChannel);
    if (!changes.length)
        return;
    const executor = await auditExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
    await activityLog(newChannel.guild, "Salon modifié", `Salon : ${newChannel} (**${newChannel.name}** — ${newChannel.id})\n${changes.join("\n")}${executor ? `\nModifié par : ${executor}` : ""}`, 0xf59e0b);
});
client.on(Events.GuildMemberAdd, async (member) => {
    const guildConfig = getGuildConfig(member.guild.id);
    if (!guildConfig)
        return;
    await activityLog(member.guild, "Membre arrivé", `${member} (${member.user.tag} — ${member.id})`, 0x22c55e);
    if (!guildConfig.antiRaidEnabled)
        return;
    const now = Date.now();
    const joins = (recentJoins.get(member.guild.id) ?? []).filter((time) => now - time <= guildConfig.raidWindowMs);
    joins.push(now);
    recentJoins.set(member.guild.id, joins);
    const accountAge = now - member.user.createdTimestamp;
    if (guildConfig.kickYoungAccounts && accountAge < guildConfig.minAccountAgeMs) {
        const ageDays = Math.floor(accountAge / 86_400_000);
        const kicked = await member.kick(`Compte âgé de moins de ${Math.floor(guildConfig.minAccountAgeMs / 86_400_000)} jours`)
            .then(() => true)
            .catch((error) => {
            console.error(`Impossible d'expulser le compte récent ${member.user.tag} :`, error);
            return false;
        });
        await activityLog(member.guild, kicked ? "Compte trop récent expulsé" : "Échec d'expulsion d'un compte récent", `${member.user.tag} (${member.id}) — compte âgé de ${ageDays} jour(s).`, kicked ? 0xef4444 : 0xf59e0b);
    }
    else if (guildConfig.quarantineRoleId && accountAge < guildConfig.minAccountAgeMs) {
        await member.roles.add(guildConfig.quarantineRoleId, "Compte récent : quarantaine anti-raid").catch(() => undefined);
        await log(member.guild, "Compte récent mis en quarantaine", `${member.user.tag} (${member.id}) — compte âgé de ${Math.floor(accountAge / 3_600_000)}h.`, 0xf59e0b);
    }
    if (joins.length >= guildConfig.raidJoinLimit && !lockedGuilds.has(member.guild.id)) {
        const count = await setLockdown(member.guild, true);
        await log(member.guild, "🚨 Raid potentiel détecté", `${joins.length} arrivées en ${guildConfig.raidWindowMs / 1000}s. Lockdown automatique activé sur ${count} salons.`, 0xdc2626);
    }
});
client.on(Events.GuildMemberRemove, async (member) => {
    if (!getGuildConfig(member.guild.id))
        return;
    await activityLog(member.guild, "Membre parti ou expulsé", `${member.user.tag} (${member.id})`, 0xef4444);
});
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    const guildConfig = newMessage.guild ? getGuildConfig(newMessage.guild.id) : undefined;
    if (!newMessage.guild || !guildConfig || newMessage.author?.bot)
        return;
    if (newMessage.channelId === guildConfig.activityLogChannelId || oldMessage.content === newMessage.content)
        return;
    await activityLog(newMessage.guild, "Message modifié", `Auteur : ${newMessage.author ?? "inconnu"} (${newMessage.author?.id ?? "inconnu"})\nSalon : <#${newMessage.channelId}>\n[Accéder au message](${newMessage.url})\n\n**Avant**\n${clipped(oldMessage.content)}\n\n**Après**\n${clipped(newMessage.content)}`, 0xf59e0b);
});
client.on(Events.MessageDelete, async (message) => {
    const guildConfig = message.guild ? getGuildConfig(message.guild.id) : undefined;
    if (!message.guild || !guildConfig || message.author?.bot)
        return;
    if (message.channelId === guildConfig.activityLogChannelId)
        return;
    const attachments = [...message.attachments.values()].map((file) => file.url).join("\n");
    await activityLog(message.guild, "Message supprimé", `Auteur : ${message.author ?? "inconnu"} (${message.author?.id ?? "inconnu"})\nSalon : <#${message.channelId}>\n\n**Contenu**\n${clipped(message.content)}${attachments ? `\n\n**Pièces jointes**\n${clipped(attachments, 1000)}` : ""}`, 0xef4444);
});
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const guild = newState.guild;
    if (!getGuildConfig(guild.id) || newState.member?.user.bot)
        return;
    const member = newState.member ?? oldState.member;
    const identity = member ? `${member} (${member.user.tag} — ${member.id})` : `Membre ${newState.id}`;
    const serverMuteChanged = oldState.serverMute !== newState.serverMute;
    const serverDeafChanged = oldState.serverDeaf !== newState.serverDeaf;
    const selfMuteChanged = oldState.selfMute !== newState.selfMute;
    const selfDeafChanged = oldState.selfDeaf !== newState.selfDeaf;
    const cameraChanged = oldState.selfVideo !== newState.selfVideo;
    const streamChanged = oldState.streaming !== newState.streaming;
    if (serverMuteChanged || serverDeafChanged) {
        const moderator = await auditExecutor(guild, AuditLogEvent.MemberUpdate, newState.id);
        const actions = [
            serverMuteChanged ? `Microphone serveur : **${newState.serverMute ? "coupé" : "réactivé"}**` : null,
            serverDeafChanged ? `Son serveur : **${newState.serverDeaf ? "coupé" : "réactivé"}**` : null,
        ].filter((action) => Boolean(action));
        await activityLog(guild, "Modération vocale", `${identity}\n${actions.join("\n")}${newState.channelId ? `\nSalon : <#${newState.channelId}>` : ""}${moderator ? `\nModérateur : ${moderator}` : ""}`, newState.serverMute || newState.serverDeaf ? 0xef4444 : 0x22c55e);
    }
    if (selfMuteChanged || selfDeafChanged || cameraChanged || streamChanged) {
        const actions = [
            selfMuteChanged ? `Microphone personnel : **${newState.selfMute ? "coupé" : "réactivé"}**` : null,
            selfDeafChanged ? `Casque personnel : **${newState.selfDeaf ? "coupé" : "réactivé"}**` : null,
            cameraChanged ? `Caméra : **${newState.selfVideo ? "activée" : "désactivée"}**` : null,
            streamChanged ? `Partage d'écran : **${newState.streaming ? "démarré" : "arrêté"}**` : null,
        ].filter((action) => Boolean(action));
        await activityLog(guild, "Activité vocale personnelle", `${identity}\n${actions.join("\n")}${newState.channelId ? `\nSalon : <#${newState.channelId}>` : ""}`, newState.selfVideo || newState.streaming ? 0x3b82f6 : 0x64748b);
    }
    if (oldState.channelId === newState.channelId)
        return;
    if (!oldState.channelId && newState.channelId) {
        await activityLog(guild, "Connexion vocale", `${identity}\nSalon : <#${newState.channelId}>`, 0x22c55e);
        return;
    }
    if (oldState.channelId && !newState.channelId) {
        const moderator = await auditExecutor(guild, AuditLogEvent.MemberDisconnect, newState.id);
        await activityLog(guild, moderator ? "Expulsion d'un salon vocal" : "Déconnexion vocale", `${identity}\nAncien salon : <#${oldState.channelId}>${moderator ? `\nModérateur : ${moderator}` : ""}`, moderator ? 0xef4444 : 0x64748b);
        return;
    }
    if (oldState.channelId && newState.channelId) {
        const moderator = await auditExecutor(guild, AuditLogEvent.MemberMove, newState.id);
        await activityLog(guild, moderator ? "Membre déplacé par un modérateur" : "Changement de salon vocal", `${identity}\nDe : <#${oldState.channelId}>\nVers : <#${newState.channelId}>${moderator ? `\nModérateur : ${moderator}` : ""}`, moderator ? 0xf97316 : 0x3b82f6);
    }
});
client.on(Events.MessageCreate, async (message) => {
    const guildConfig = message.guild ? getGuildConfig(message.guild.id) : undefined;
    if (!message.guild || !guildConfig || message.author.bot)
        return;
    const normalized = message.content.normalize("NFKC").toLocaleLowerCase("fr");
    if (/\bcoucou\b/u.test(normalized)) {
        await message.react("🖕").catch((error) => console.error("Impossible de réagir au message « coucou » :", error));
    }
    if (/\bpieds\b/u.test(normalized)) {
        await message.react("👃").catch((error) => console.error("Impossible de réagir au message « pieds » :", error));
    }
    if (guildConfig.snowReaction && /\bneiges?\b/u.test(normalized)) {
        await message.react("❄️").catch((error) => console.error("Impossible de réagir au message parlant de neige :", error));
    }
    if (normalized.trim() === "micode") {
        const hearts = ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "🩷", "🩵", "🩶"];
        for (const heart of hearts) {
            await message.react(heart).catch((error) => console.error(`Impossible de réagir avec ${heart} au message « Micode » :`, error));
        }
    }
    if (normalized.includes("davinci") || normalized.includes("da vinci")) {
        await message.reply("Non, adobe est mieux").catch((error) => console.error("Impossible de répondre au message parlant de DaVinci :", error));
    }
    if (client.user && message.mentions.users.has(client.user.id)) {
        const candidates = message.guild.members.cache
            .filter((member) => !member.user.bot)
            .map((member) => member.displayName);
        const randomMember = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : undefined;
        const reply = getMentionReply(message.content, client.user.id, randomMember);
        await message.reply(reply).catch((error) => console.error("Impossible de répondre à la mention du bot :", error));
    }
    if (!guildConfig.blockedWords.length || message.member?.permissions.has(PermissionFlagsBits.ManageMessages))
        return;
    const blockedWord = guildConfig.blockedWords.find((word) => normalized.includes(word));
    if (!blockedWord)
        return;
    const preview = message.content.length > 300 ? `${message.content.slice(0, 300)}…` : message.content;
    await message.delete().catch(() => undefined);
    const warning = await message.channel.send(`${message.author}, ton message a été supprimé car il contient un terme interdit.`).catch(() => null);
    if (warning)
        setTimeout(() => warning.delete().catch(() => undefined), 8_000);
    await log(message.guild, "Message supprimé par l'AutoMod", `Auteur : ${message.author.tag} (${message.author.id})\nSalon : <#${message.channelId}>\nTerme détecté : ||${blockedWord}||\nMessage : ||${preview || "(vide)"}||`, 0xef4444);
});
process.on("unhandledRejection", console.error);
await client.login(config.token);
