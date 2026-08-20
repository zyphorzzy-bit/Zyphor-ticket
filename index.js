const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

// 🔒 SÓ ESSES DOIS USAM COMANDOS DE BARRA
const DONOS = new Set(['1527769881326522478', '1533306874513068093']);

// 📁 Carregar arquivos
const config = require('./config.json');
let db = require('./database.json');
const salvarDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

// 🤖 Inicializar
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

// ✅ Bot Online
client.on('ready', async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
  client.user.setActivity({ name: '🎫 Tickets', type: 3 });

  // Registrar comandos
  await client.application.commands.set([
    {
      name: 'enviar', description: '📤 Enviar painel de tickets',
      options: [{ name: 'painel', type: 1, description: 'Enviar painel', options: [{ name: 'canal', type: 7, required: true }] }]
    }
  ]);
});

// 🔐 Verificar permissões
const eDono = (id) => DONOS.has(id);
const eStaff = (member) => eDono(member.id) || Object.values(config.supportRoles).some(r => r && member.roles.cache.has(r));

// 🎫 Criar Ticket
const criarTicket = async (interaction, categoria) => {
  const user = interaction.user;
  if (db.userTickets[user.id]) return interaction.reply({ content: `⚠️ Você já tem ticket aberto! Feche antes de abrir outro.`, ephemeral: true });

  const num = Object.keys(db.tickets).length + 1;
  const nome = `ticket-${num}-${user.username.toLowerCase()}`;
  let canal;

  if (config.criarComo === 'canal') {
    canal = await interaction.guild.channels.create({
      name, type: ChannelType.GuildText, parent: config.categoriaId || null,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ...Object.values(config.supportRoles).filter(Boolean).map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }))
      ]
    });
  } else {
    const canalPainel = config.canalPainelId ? await interaction.guild.channels.fetch(config.canalPainelId) : interaction.channel;
    if (!canalPainel) return interaction.reply({ content: '❌ Canal do painel não encontrado!', ephemeral: true });
    canal = await canalPainel.threads.create({ name, type: ChannelType.PrivateThread, invitable: false, autoArchiveDuration: 10080 });
    await canal.members.add(user.id, { silent: true }).catch(() => {});
  }

  // Salvar no banco
  db.tickets[canal.id] = { id: canal.id, donoId: user.id, donoTag: user.tag, categoria, numero: num, abertoEm: Date.now() };
  db.userTickets[user.id] = canal.id;
  salvarDB();

  // Embed e botões
  const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle('🎫 Atendimento').setDescription(`Bem-vindo! Por favor, informe o motivo.\n📌 **Categoria:** ${categoria}`).setTimestamp();
  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_fechar').setLabel('Finalizar').setEmoji('📁').setStyle(ButtonStyle.Danger)
  );

  await canal.send({ content: `<@${user.id}>`, embeds: [embed], components: [botoes] });
  await interaction.reply({ content: `✅ Ticket criado: ${canal}`, ephemeral: true });
};

// ⚡ Interações
client.on(Events.InteractionCreate, async (int) => {
  // Comandos de barra — SÓ DONOS
  if (int.isChatInputCommand()) {
    if (!eDono(int.user.id)) return int.reply({ content: '❌ Sem permissão!', ephemeral: true });
    if (int.commandName === 'enviar' && int.options.getSubcommand() === 'painel') {
      const canal = int.options.get('canal').channel;
      config.canalPainelId = canal.id;
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

      const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('🎫 CENTRAL DE ATENDIMENTO').setDescription('Selecione uma opção abaixo para abrir seu ticket.');
      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('abrir_ticket').setPlaceholder('📋 Selecione o tipo...').addOptions(
          { label: 'Reembolso', emoji: '💰', value: 'Reembolso' },
          { label: 'Evento', emoji: '📅', value: 'Evento' },
          { label: 'Mediador', emoji: '👮', value: 'Mediador' },
          { label: 'Suporte', emoji: '❓', value: 'Suporte' }
        )
      );
      await canal.send({ embeds: [embed], components: [menu] });
      return int.reply({ content: `✅ Painel enviado!`, ephemeral: true });
    }
  }

  // Menu de seleção
  if (int.isStringSelectMenu() && int.customId === 'abrir_ticket') await criarTicket(int, int.values[0]);

  // Botões
  if (int.isButton() && int.customId === 'ticket_fechar') {
    const ticket = db.tickets[int.channel.id];
    if (!ticket) return int.reply({ content: '❌ Não é um ticket!', ephemeral: true });
    if (!eStaff(int.member) && ticket.donoId !== int.user.id) return int.reply({ content: '❌ Sem permissão!', ephemeral: true });

    delete db.tickets[int.channel.id];
    delete db.userTickets[ticket.donoId];
    salvarDB();

    await int.reply('📁 Ticket finalizado! Fechando em 3s...');
    setTimeout(() => int.channel.isThread() ? int.channel.setArchived(true) : int.channel.delete(), 3000);
  }
});

// ⌨️ Comandos de prefixo
client.on(Events.MessageCreate, async (msg) => {
  if (!msg.guild || msg.author.bot || !msg.content.startsWith(config.prefix)) return;
  const cmd = msg.content.slice(config.prefix.length).trim().split(/\s+/)[0].toLowerCase();
  const ticket = db.tickets[msg.channel.id];

  if (cmd === 'f' || cmd === 'fechar') {
    if (!ticket) return msg.reply('❌ Esse canal não é um ticket!');
    if (!eStaff(msg.member) && ticket.donoId !== msg.author.id) return msg.reply('❌ Sem permissão!');
    delete db.tickets[msg.channel.id];
    delete db.userTickets[ticket.donoId];
    salvarDB();
    await msg.reply('📁 Ticket finalizado! Fechando em 3s...');
    setTimeout(() => msg.channel.isThread() ? msg.channel.setArchived(true) : msg.channel.delete(), 3000);
  }
});

client.login(process.env.TOKEN);
