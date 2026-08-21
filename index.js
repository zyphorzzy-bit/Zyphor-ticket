const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits, 
  ChannelType, 
  AttachmentBuilder,
  ActivityType
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ==================== CONFIGURAÇÕES ====================
const TOKEN = 'SEU_BOT_TOKEN_AQUI';
const CATEGORY_ID = 'ID_DA_CATEGORIA';
const LOG_CHANNEL_ID = 'ID_DO_CANAL_DE_LOGS';
const STAFF_ROLE_IDS = ['ID_CARGO_STAFF']; 
const OWNER_IDS = ['ID_SEU_1', 'ID_SEU_2']; // <--- IDS DOS DONOS AQUI
// =======================================================

// Emojis Personalizados
const E = {
  aceitar: "<:aceitar:1539124696912756767>",
  recusar: "<:recusar:1539124698338566257>",
  loading: "<a:loanding:1534612861211377868>",
  config: "<:config:1534611990633250937>",
  seta: "<:seta:1539785898693234700>"
};

client.once('ready', () => {
  // Status de Streaming (Roxo)
  client.user.setActivity("Suporte Zyphor", {
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/twitch" 
  });
  console.log(`✅ Bot online e em modo Streaming.`);
});

// Comandos Administrativos (Apenas Donos)
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;
  
  // Verifica se é um dos donos
  if (!OWNER_IDS.includes(message.author.id)) return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'setup') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_ticket')
        .setLabel('Abrir Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📩')
    );

    await message.channel.send({
      content: `${E.config} **CENTRAL DE SUPORTE**\nClique abaixo para iniciar seu atendimento.`,
      components: [row]
    });
    message.delete();
  }
});

// Manipulador de Interações
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const { customId, guild, member, channel } = interaction;

  // ABRIR TICKET
  if (customId === 'open_ticket') {
    const existingChannel = guild.channels.cache.find(c => c.name === `ticket-${member.user.username.toLowerCase()}`);
    if (existingChannel) return interaction.reply({ content: `Você já tem um ticket aberto: ${existingChannel}`, ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const ticketChannel = await guild.channels.create({
      name: `ticket-${member.user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ...STAFF_ROLE_IDS.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }))
      ]
    });

    const ticketRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumir').setStyle(ButtonStyle.Success).setEmoji(E.aceitar),
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger).setEmoji(E.recusar)
    );

    await ticketChannel.send({
      content: `👋 <@${member.id}> ${STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ')}`,
      embeds: [{
        color: 0x2b2d31,
        description: `${E.seta} **Ticket de Atendimento**\nUsuário: <@${member.id}>\n\nDescreva seu problema abaixo.`
      }],
      components: [ticketRow]
    });

    await interaction.editReply({ content: `Ticket criado: ${ticketChannel}` });
  }

  // ASSUMIR TICKET
  if (customId === 'claim_ticket') {
    if (!member.roles.cache.some(r => STAFF_ROLE_IDS.includes(r.id))) return interaction.reply({ content: 'Apenas Staff.', ephemeral: true });

    const closeOnlyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger).setEmoji(E.recusar)
    );

    await interaction.message.edit({ components: [closeOnlyRow] });
    await interaction.reply({ content: `✅ Atendimento assumido por ${member}` });
  }

  // FECHAR TICKET
  if (customId === 'close_ticket') {
    if (!member.roles.cache.some(r => STAFF_ROLE_IDS.includes(r.id))) return interaction.reply({ content: 'Apenas Staff.', ephemeral: true });

    await interaction.reply(`${E.loading} Fechando...`);
    
    const messages = await channel.messages.fetch({ limit: 100 });
    let transcript = `LOG DE TICKET: ${channel.name}\nData: ${new Date().toLocaleString()}\n\n`;
    messages.reverse().forEach(m => transcript += `[${m.author.tag}]: ${m.content}\n`);

    const attachment = new AttachmentBuilder(Buffer.from(transcript), { name: `log.txt` });
    await guild.channels.cache.get(LOG_CHANNEL_ID).send({ files: [attachment] });
    
    setTimeout(() => channel.delete(), 3000);
  }
});

client.login(TOKEN);
