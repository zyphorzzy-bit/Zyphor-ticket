const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
require('dotenv').config();
const fs = require('fs');

// ========== 🔒 DONOS DO BOT — SÓ ELES USAM COMANDOS DE BARRA ==========
const DONOS_PERMITIDOS = new Set([
  '1527769881326522478',   // ID 1
  '1533306874513068093'    // ID 2
]);

// ========== EMOJIS ==========
const E = {
  aceito: '<:aceito:1539124707222093915>',
  pendente: '<:pendente:1539124705167147059>',
  proibido: '<:Proibido:1534611991929290877>',
  warn: '<:warn:1539125781320433724>',
  alerta: '<:alerta:1534611993410015456>',
  arquivo: '<:arquivo:1539124693460713552>',
  aceitar: '<:aceitar:1539124696912756767>',
  config: '<:config:1534611990633250937>',
  loading: '<a:loanding:1534612861211377868>'
};

// ========== CARREGAR ARQUIVOS ==========
let config = require('./config.json');
let db = require('./database.json');

const saveConfig = () => fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
const saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

if (!db.logs) db.logs = [];
if (!db.userTickets) db.userTickets = {};
if (!db.tickets) db.tickets = {};

// ========== INICIALIZAR BOT ==========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.login(process.env.TOKEN);

// ========== BOT ONLINE ==========
client.on('ready', async () => {
  console.log(`${E.loading} Carregando...`);
  console.log(`${E.aceito} ✅ Bot online: ${client.user.tag}`);
  client.user.setActivity({ name: '🎫 Sistema de Tickets', type: 3 });

  // Registrar Comandos
  const commands = [
    {
      name: 'config',
      description: `${E.config} Configurar o sistema de tickets`,
      options: [
        {
          name: 'ticket',
          description: 'Configurar todos os ajustes de tickets',
          type: 1,
          options: [
            { name: 'cargo_suporte_1', description: 'Primeiro cargo de suporte', type: 8, required: false },
            { name: 'cargo_suporte_2', description: 'Segundo cargo de suporte', type: 8, required: false },
            { name: 'cargo_suporte_3', description: 'Terceiro cargo de suporte', type: 8, required: false },
            { name: 'tipo_abertura', description: 'Como abrir tickets', type: 3, required: false, choices: [
              { name: '📋 Menu de Seleção', value: 'select' },
              { name: '🔘 Botões', value: 'button' }
            ]},
            { name: 'criar_como', description: 'Criar ticket como canal ou tópico', type: 3, required: false, choices: [
              { name: '#️⃣ Canal → Categoria', value: 'channel' },
              { name: '💬 Tópico → Canal do Painel', value: 'thread' }
            ]},
            { name: 'categoria', description: 'Categoria para canais de ticket', type: 7, required: false },
            { name: 'canal_logs', description: 'Canal de logs', type: 7, required: false }
          ]
        }
      ]
    },
    {
      name: 'enviar',
      description: '📤 Enviar o painel de tickets',
      options: [
        {
          name: 'painel',
          description: 'Envia o painel de abertura de tickets',
          type: 1,
          options: [
            { name: 'canal', description: 'Canal para enviar o painel', type: 7, required: true }
          ]
        }
      ]
    }
  ];

  await client.application.commands.set(commands);
  console.log(`${E.aceito} ✅ Comandos registrados!`);
});

// ========== FUNÇÃO: VERIFICAR SE É DONO ==========
const isDono = (userId) => DONOS_PERMITIDOS.has(userId);

// ========== FUNÇÕES AUXILIARES ==========
const isStaff = (member) => {
  // Donos também são staff
  if (isDono(member.id)) return true;
  const roles = [config.supportRoles.cargo1, config.supportRoles.cargo2, config.supportRoles.cargo3];
  return roles.some(id => id && member.roles.cache.has(id));
};

// Limite: 1 ticket ABERTO por pessoa
const canOpenTicket = (userId) => {
  if (db.userTickets[userId]) {
    return { 
      ok: false, 
      reason: `${E.warn} Você já tem um ticket aberto: <#${db.userTickets[userId]}>\nFeche-o antes de abrir um novo!` 
    };
  }
  return { ok: true };
};

// Adicionar membros em SILÊNCIO
const addMembersToTicket = async (ticketChannel, user, guild) => {
  const supportRoleIds = Object.values(config.supportRoles).filter(Boolean);
  if (ticketChannel.isThread()) {
    await ticketChannel.members.add(user.id, { silent: true }).catch(() => {});
    for (const roleId of supportRoleIds) {
      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (role) {
        for (const [_, member] of role.members) {
          await ticketChannel.members.add(member.id, { silent: true }).catch(() => {});
        }
      }
    }
  }
};

// ========== CRIAR TICKET ==========
const createTicket = async (interaction, categoryLabel) => {
  const guild = interaction.guild;
  const user = interaction.user;

  const check = canOpenTicket(user.id);
  if (!check.ok) return interaction.reply({ content: check.reason, ephemeral: true });

  const ticketNumber = Object.keys(db.tickets).length + 1;
  const name = `ticket-${ticketNumber}-${user.username}`.toLowerCase().replace(/\s+/g, '-');
  let ticketChannel;

  // 📝 CANAL → Categoria
  if (config.createAs === 'channel') {
    ticketChannel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: config.categoryId || null,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ...Object.values(config.supportRoles).filter(Boolean).map(roleId => ({
          id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }))
      ]
    });
  } 
  // 🧵 TÓPICO → Canal do Painel
  else {
    const panelChannel = config.panelChannelId 
      ? (await guild.channels.fetch(config.panelChannelId).catch(() => null)) 
      : interaction.channel;
    if (!panelChannel) {
      return interaction.reply({ content: `${E.proibido} Canal do painel não encontrado! Use /enviar painel primeiro.`, ephemeral: true });
    }
    ticketChannel = await panelChannel.threads.create({
      name, type: ChannelType.PrivateThread, invitable: false, autoArchiveDuration: 10080
    });
  }

  // Adicionar membros em silêncio
  await addMembersToTicket(ticketChannel, user, guild);

  // Salvar ticket
  db.tickets[ticketChannel.id] = {
    id: ticketChannel.id, ownerId: user.id, ownerTag: user.tag,
    category: categoryLabel, number: ticketNumber, openAt: Date.now()
  };
  db.userTickets[user.id] = ticketChannel.id;

  // Log de abertura
  db.logs.push({
    type: 'open', ticketId: ticketChannel.id, ticketNumber,
    userId: user.id, userTag: user.tag, category: categoryLabel, timestamp: Date.now()
  });
  saveDB();

  // Embed de boas-vindas
  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`${E.pendente} Atendimento`)
    .setDescription(
      `Seja bem-vindo(a) ao painel de atendimento! Por favor informe o motivo de estar abrindo esse ticket.\n\n` +
      `<:horrio:1534611997335883886> **Horário de Abertura:**\n` +
      new Date().toLocaleString('pt-BR')
    )
    .setTimestamp();

  const pingRoles = Object.values(config.supportRoles).filter(Boolean).map(id => `<@&${id}>`).join(' ');
  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_atender').setEmoji(E.aceitar).setLabel('Atender').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_painel').setEmoji(E.config).setLabel('Painel Sup').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close').setEmoji(E.arquivo).setLabel('Finalizar Ticket').setStyle(ButtonStyle.Danger)
  );

  await ticketChannel.send({ content: `${pingRoles} | ${user}`, embeds: [embed], components: [botoes] });
  return interaction.reply({ content: `${E.aceito} Ticket criado: ${ticketChannel}`, ephemeral: true });
};

// ========== INTERAÇÕES ==========
client.on(Events.InteractionCreate, async interaction => {
  // ========== COMANDOS DE BARRA — SÓ OS DONOS ==========
  if (interaction.isChatInputCommand()) {
    const { commandName, options } = interaction;

    // Verificar permissão — SÓ DONOS
    if (!isDono(interaction.user.id)) {
      return interaction.reply({ 
        content: `${E.proibido} Apenas os donos do bot podem usar comandos de configuração!`, 
        ephemeral: true 
      });
    }

    // ⚙️ /config ticket
    if (commandName === 'config' && options.getSubcommand() === 'ticket') {
      if (options.get('cargo_suporte_1')) config.supportRoles.cargo1 = options.get('cargo_suporte_1').value;
      if (options.get('cargo_suporte_2')) config.supportRoles.cargo2 = options.get('cargo_suporte_2').value;
      if (options.get('cargo_suporte_3')) config.supportRoles.cargo3 = options.get('cargo_suporte_3').value;
      if (options.get('tipo_abertura')) config.ticketType = options.get('tipo_abertura').value;
      if (options.get('criar_como')) config.createAs = options.get('criar_como').value;
      if (options.get('categoria')) config.categoryId = options.get('categoria').value;
      if (options.get('canal_logs')) config.logChannelId = options.get('canal_logs').value;
      saveConfig();
      
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x00ff88).setTitle(`${E.aceito} Configuração Salva!`).setDescription(`
${E.config} **Cargos de Suporte:**
> Cargo 1: ${config.supportRoles.cargo1 ? `<@&${config.supportRoles.cargo1}>` : '❌ Não definido'}
> Cargo 2: ${config.supportRoles.cargo2 ? `<@&${config.supportRoles.cargo2}>` : '❌ Não definido'}
> Cargo 3: ${config.supportRoles.cargo3 ? `<@&${config.supportRoles.cargo3}>` : '❌ Não definido'}

📍 **Tipo:** ${config.createAs === 'channel' ? 'Canal → Categoria' : 'Tópico → Canal do Painel'}
📋 **Abertura:** ${config.ticketType === 'select' ? 'Menu de Seleção' : 'Botões'}
🔒 **Limite:** 1 ticket aberto por pessoa
        `)],
        ephemeral: true
      });
    }

    // 📤 /enviar painel
    if (commandName === 'enviar' && options.getSubcommand() === 'painel') {
      const targetChannel = options.get('canal').channel;
      config.panelChannelId = targetChannel.id;
      saveConfig();

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('CENTRAL DE ATENDIMENTO')
        .setDescription('Para obter atendimento, abra um ticket selecionando uma opção no menu abaixo.\nFique à vontade para escolher de acordo com sua necessidade.')
        .setThumbnail(interaction.guild.iconURL({ size: 1024 }))
        .setFooter({ text: interaction.guild.name });

      let components = [];
      if (config.ticketType === 'select') {
        const menu = new StringSelectMenuBuilder()
          .setCustomId('ticket_select')
          .setPlaceholder('📋 Selecione o tipo de ticket...')
          .addOptions(config.ticketCategories.map(cat => ({
            label: cat.label, description: cat.description, emoji: cat.emoji, value: cat.label
          })));
        components.push(new ActionRowBuilder().addComponents(menu));
      } else {
        components.push(new ActionRowBuilder().addComponents(
          config.ticketCategories.map((cat, i) =>
            new ButtonBuilder().setCustomId(`ticket_btn_${i}`).setLabel(`${cat.emoji} ${cat.label}`).setStyle(ButtonStyle.Primary)
          )
        ));
      }
      await targetChannel.send({ embeds: [embed], components });
      return interaction.reply({ content: `${E.aceito} Painel enviado para ${targetChannel}!`, ephemeral: true });
    }
  }

  // ─── MENUS E BOTÕES ───
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
    await createTicket(interaction, interaction.values[0]);
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith('ticket_btn_')) {
      const idx = parseInt(interaction.customId.split('_')[2]);
      await createTicket(interaction, config.ticketCategories[idx].label);
    }

    if (interaction.customId === 'ticket_atender') {
      if (!isStaff(interaction.member)) return interaction.reply({ content: `${E.proibido} Apenas suporte!`, ephemeral: true });
      await interaction.reply(`${E.aceitar} ${interaction.user} assumiu o atendimento!`);
    }

    if (interaction.customId === 'ticket_painel') {
      if (!isStaff(interaction.member)) return interaction.reply({ content: `${E.proibido} Apenas suporte!`, ephemeral: true });
      await interaction.reply({ content: `${E.config} Painel de opções do suporte...`, ephemeral: true });
    }

    if (interaction.customId === 'ticket_close') {
      const ticket = db.tickets[interaction.channel.id];
      if (!ticket) return interaction.reply({ content: `${E.proibido} Não é um ticket!`, ephemeral: true });
      if (!isStaff(interaction.member) && ticket.ownerId !== interaction.user.id) {
        return interaction.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
      }

      // Log de fechamento
      db.logs.push({
        type: 'close', ticketId: interaction.channel.id, ticketNumber: ticket.number,
        userId: ticket.ownerId, userTag: ticket.ownerTag, closedBy: interaction.user.tag,
        category: ticket.category, openedAt: ticket.openAt, closedAt: Date.now(),
        duration: Date.now() - ticket.openAt, timestamp: Date.now()
      });
      delete db.tickets[interaction.channel.id];
      delete db.userTickets[ticket.ownerId];
      saveDB();

      await interaction.reply(`${E.arquivo} Ticket finalizado por ${interaction.user}`);
      setTimeout(() => {
        if (interaction.channel.isThread()) interaction.channel.setArchived(true).catch(() => {});
        else interaction.channel.delete().catch(() => {});
      }, 3000);
    }
  }
});

// ========== COMANDOS DE PREFIXO (.logs, .f, .not, .nm) ==========
client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();
  const ticket = db.tickets[message.channel.id];

  // 🔒 .f — Fechar Ticket
  if (cmd === 'f' || cmd === 'fechar') {
    if (!ticket) return message.reply(`${E.proibido} Esse canal não é um ticket!`);
    if (!isStaff(message.member) && ticket.ownerId !== message.author.id) return message.reply(`${E.proibido} Sem permissão!`);

    db.logs.push({
      type: 'close', ticketId: message.channel.id, ticketNumber: ticket.number,
      userId: ticket.ownerId, userTag: ticket.ownerTag, closedBy: message.author.tag,
      category: ticket.category, openedAt: ticket.openAt, closedAt: Date.now(),
      duration: Date.now() - ticket.openAt, timestamp: Date.now()
    });
    delete db.tickets[message.channel.id];
    delete db.userTickets[ticket.ownerId];
    saveDB();

    await message.reply(`${E.arquivo} **Ticket finalizado!** Fechando em 3s...`);
    setTimeout(() => {
      if (message.channel.isThread()) message.channel.setArchived(true).catch(() => {});
      else message.channel.delete().catch(() => {});
    }, 3000);
  }

  // 🔔 .not @user — Notificar Usuário
  if (cmd === 'not' || cmd === 'notificar') {
    if (!ticket) return message.reply(`${E.proibido} Não é um ticket!`);
    if (!isStaff(message.member)) return message.reply(`${E.proibido} Apenas suporte!`);
    const user = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;
    if (!user) return message.reply(`${E.warn} Use: \`.not @Usuario\``);

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle(`${E.alerta} Notificação de Ticket`)
      .setDescription(`Olá! Seu ticket foi atualizado!\n📌 Canal: ${message.channel}\n👤 Por: ${message.author}`)
      .setTimestamp();
    await user.send({ embeds: [embed] }).catch(() => {});
    message.reply(`${E.aceito} Notificação enviada para ${user}`);
  }

  // ✏️ .nm — Renomear
  if (cmd === 'nm' || cmd === 'renomear') {
    if (!ticket) return message.reply(`${E.proibido} Não é um ticket!`);
    if (!isStaff(message.member)) return message.reply(`${E.proibido} Apenas suporte!`);
    const newName = args.join(' ');
    if (!newName) return message.reply(`${E.warn} Use: \`.nm novo-nome\``);
    await message.channel.setName(newName).catch(() => {});
    message.reply(`${E.aceito} Renomeado para: **${newName}**`);
  }

  // 📜 .logs @user — Histórico últimos 10 dias
  if (cmd === 'logs' || cmd === 'historico') {
    if (!isStaff(message.member)) return message.reply(`${E.proibido} Apenas suporte!`);
    const targetUser = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user;
    if (!targetUser) return message.reply(`${E.warn} Mencione um usuário! Exemplo: \`.logs @Usuario\``);

    const tenDaysAgo = Date.now() - (10 * 24 * 60 * 60 * 1000);
    const userLogs = db.logs.filter(l => l.userId === targetUser.id && l.timestamp >= tenDaysAgo);
    const openTickets = Object.values(db.tickets).filter(t => t.ownerId === targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`<:ID:1534611999085039786> Histórico — ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setDescription(`
<:pendente:1539124705167147059> **Tickets Abertos:** ${openTickets.length}
<:aceito:1539124707222093915> **Nos últimos 10 dias:** ${userLogs.length} registros

**Abertos:**
${openTickets.length > 0 ? openTickets.map(t => `> #${t.number} — <#${t.id}> — ${t.category}`).join('\n') : '> Nenhum ticket aberto'}

**Recentes:**
${userLogs.slice(0, 10).map(l => {
  const data = new Date(l.timestamp).toLocaleString('pt-BR');
  return l.type === 'open' 
    ? `<:pendente:1539124705167147059> Aberto — #${l.ticketNumber} — ${data}`
    : `<:arquivo:1539124693460713552> Finalizado — #${l.ticketNumber} — ${data} — por ${l.closedBy}`;
}).join('\n') || '> Nenhum registro'}
      `)
      .setTimestamp();
    
    message.reply({ embeds: [embed] });
  }
});
