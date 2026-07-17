import { ApplicationCommandType, PermissionFlagsBits, SlashCommandBuilder, } from "discord.js";
export const commands = [
    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Bannit un membre du serveur")
        .addUserOption((o) => o.setName("membre").setDescription("Membre à bannir").setRequired(true))
        .addStringOption((o) => o.setName("raison").setDescription("Motif du bannissement").setMaxLength(512))
        .addStringOption((o) => o.setName("duree").setDescription("Durée facultative : 30m, 12h, 7j (sans durée = permanent)").setMaxLength(20))
        .addIntegerOption((o) => o.setName("supprimer_messages").setDescription("Heures de messages à supprimer").setMinValue(0).setMaxValue(168))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Débannit un utilisateur")
        .addStringOption((o) => o.setName("utilisateur_id").setDescription("Identifiant Discord de l'utilisateur").setRequired(true))
        .addStringOption((o) => o.setName("raison").setDescription("Motif du débannissement").setMaxLength(512))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName("testmp")
        .setDescription("Teste l'envoi d'un message privé de modération sans sanctionner")
        .addUserOption((o) => o.setName("membre").setDescription("Membre qui recevra le message").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder()
        .setName("expulser")
        .setDescription("Expulse un membre du serveur")
        .addUserOption((o) => o.setName("membre").setDescription("Membre à expulser").setRequired(true))
        .addStringOption((o) => o.setName("raison").setDescription("Motif de l'expulsion").setMaxLength(512))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder()
        .setName("exclu")
        .setDescription("Exclut temporairement un membre des discussions (timeout)")
        .addUserOption((o) => o.setName("membre").setDescription("Membre à exclure").setRequired(true))
        .addStringOption((o) => o.setName("duree").setDescription("Durée : 10m, 2h, 7j (maximum 28j)").setRequired(true).setMaxLength(20))
        .addStringOption((o) => o.setName("raison").setDescription("Motif de l'exclusion").setMaxLength(512))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName("unexclu")
        .setDescription("Retire l'exclusion temporaire d'un membre")
        .addUserOption((o) => o.setName("membre").setDescription("Membre à réintégrer").setRequired(true))
        .addStringOption((o) => o.setName("raison").setDescription("Motif de la réintégration").setMaxLength(512))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName("publier")
        .setDescription("Publie une annonce sous l'identité du bot")
        .addStringOption((o) => o.setName("message").setDescription("Contenu de l'annonce").setRequired(true).setMaxLength(4000))
        .addChannelOption((o) => o.setName("salon").setDescription("Salon cible (par défaut : salon actuel)")
        .addChannelTypes(0, 5))
        .addAttachmentOption((o) => o.setName("image").setDescription("Image jointe à l'annonce"))
        .addStringOption((o) => o.setName("image_url").setDescription("URL HTTPS d'une image"))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder()
        .setName("lockdown")
        .setDescription("Verrouille ou déverrouille les salons texte du serveur")
        .addStringOption((o) => o.setName("action").setDescription("Action").setRequired(true)
        .addChoices({ name: "Activer", value: "on" }, { name: "Désactiver", value: "off" }))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName("antiraid")
        .setDescription("Affiche l'état de la protection anti-raid")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    {
        name: "Informations du compte",
        type: ApplicationCommandType.User,
        default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
    },
].map((command) => "toJSON" in command ? command.toJSON() : command);
