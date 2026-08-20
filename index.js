const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

// 🔒 SÓ ESSES DOIS USAM COMANDOS DE CONFIG
const DONOS = new Set(['1527769881326522478', '1533306874513068093']);

// 😼 SEUS EMOJIS PERSONALIZADOS — TODOS ADICIONADOS!
const E = {
  aceito: '<:aceito:1539124707222093915>',
  pendente: '<:pendente:1539124705167147059>',
  recusado: '<:recusado:1539124703992614912>',
  horario: '<:horrio:1534611997335883886>',
  ID: '<:ID:1534611999085039786>',
  user: '<:user:1539125800907968603>',
  proibido: '<:Proibido:1534611991929290877>',
  proteo: '<:proteo:1534611994353602732>',
  warn: '<:warn:1539125781320433724>',
  alerta: '<:alerta:1534611993410015456>',
  arquivo: '<:arquivo:1539124693460713552>',
  aceitar: '<:aceitar:1539124696912756767>',
  recusar: '<:recusar:1539124698338566257>',
  linkexterno: '<:linkexterno:1539124690709385330>',
  config: '<:config:1534611990633250937>',
  ativado: '<a:ativado:1534611985260609607>',
  desativado: '<a:desativado:1534611986539876463>',
  loading: '<a:loanding:1534612861211377868>',
  seta: '<:seta:1539785898693234700>',
  pingbom: '<a:pingbom:1539786201551077386>',
  pingruim: '<a:pingruim:1539786202822217731>'
};

// 📁 Arquivos
let config = require('./config.json');
let db = require('./database.json');
const salvarConfig = () => fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
const salvarDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

// 🤖 Inicializar
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

// ✅ Bot Online
client.on('ready', async () => {
  console.log(`${E.loading} Carregando...`);
  console.log(`${E.aceito} ✅ Bot online: ${client.user.tag}`);
  client.user.setActivity({ name: `${E.pendente} Sistema de Tickets`, type: 3 });

  // ⚠️ COMANDOS CORRIGIDOS — TODOS com description obrigatória!
  await client.application.commands.set([
    {
      name: 'config',
      description: `${E.config} Configurar o sistema de tickets`,
      options: [
        {
          name: 'ticket',
          type: 1,
          description: `${E.config} Abrir painel de configuração completo`,
          options: [
            { name: 'cargo_suporte_1', type: 8, description: `${E.user} Primeiro cargo de suporte`, required: false },
            { name: 'cargo_suporte_2', type: 8, description: `${E.user} Segundo cargo de suporte`, required: false },
            { name: 'cargo_suporte_3', type: 8, description: `${E.user} Terceiro cargo de suporte`, required: false },
            { name: 'categoria_canais', type: 7, description: `${E.proteo} Categoria onde os tickets serão criados`, required: false },
            { name: 'canal_painel', type: 7, description: `${E.linkexterno} Canal onde o painel ficará`, required: false },
            { name: 'tipo_criacao', type: 3, description: `${E.seta} Como criar os tickets`, required: false, choices: [
              { name: '📂 Canal', value: 'canal' },
              { name: '🧵 Tópico', value: 'thread' }
            ]}
          ]
        }
      ]
    },
    {
      name: 'enviar',
      description: `${E.linkexterno} Enviar o painel de abertura de tickets`
    }
  ]);
  console.log(`${E.aceito} ✅ Comandos registrados!`);
});

// 🔐 Verificações
const eDono = (id) => DONOS.has(id);
const eStaff = (member) => eDono(member.id) || Object.values(config.supportRoles).some(r => r && member.roles.cache.has(r));

// ⚡ INTERAÇÕES
client.on(Events.InteractionCreate, async (int) => {
  // 🛠️ /config ticket — PAINEL DE CONFIGURAÇÃO COMPLETO
  if (int.isChatInputCommand()) {
    if (!eDono(int.user.id)) 
      return int.reply({ content: `${E.proibido} Apenas os donos podem configurar!`, ephemeral: true });

    if (int.commandName === 'config' && int.options.getSubcommand() === 'ticket') {
      // Salva cada opção se foi preenchida
      if (int.options.get('cargo_suporte_1')) config.supportRoles.cargo1 = int.options.get('cargo_suporte_1').value;
      if (int.options.get('cargo_suporte_2')) config.supportRoles.cargo2 = int.options.get('cargo_suporte_2').value;
      if (int.options.get('cargo_suporte_3')) config.supportRoles.cargo3 = int.options.get('cargo_suporte_3').value;
      if (int.options.get('categoria_canais')) config.categoriaId = int.options.get('categoria_canais').value;
      if (int.options.get('canal_painel')) config.canalPainelId = int.options.get('canal_painel').value;
      if (int.options.get('tipo_criacao')) config.criarComo = int.options.get('tipo_criacao').value;
      
      salvarConfig();

      // 📊 PAINEL COM TUDO CONFIGURADO — COM EMOJIS!
      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle(`${E.aceito} PAINEL DE CONFIGURAÇÃO — SALVO!`)
        .setDescription(`${E.ativado} Todas as configurações foram atualizadas:`)
        .addFields(
          { name: `${E.user} Cargo Suporte 1`, value: config.supportRoles.cargo1 ? `<@&${config.supportRoles.cargo1}> ${E.ativado}` : `❌ Não definido ${E.desativado}`, inline: true },
          { name: `${E.user} Cargo Suporte 2`, value: config.supportRoles.cargo2 ? `<@&${config.supportRoles.cargo2}> ${E.ativado}` : `❌ Não definido ${E.desativado}`, inline: true },
          { name: `${E.user} Cargo Suporte 3`, value: config.supportRoles.cargo3 ? `<@&${config.supportRoles.cargo3}> ${E.ativado}` : `❌ Não definido ${E.desativado}`, inline: true },
          { name: `${E.proteo} Categoria de Canais`, value: config.categoriaId ? `<#${config.categoriaId}> ${E.ativado}` : `❌ Não definido ${E.desativado}`, inline: true },
          { name: `${E.linkexterno} Canal do Painel`, value: config.canalPainelId ? `<#${config.canalPainelId}> ${E.ativado}` : `❌ Não definido ${E.desativado}`, inline: true },
          { name: `${E.seta} Tipo de Criação`, value: config.criarComo === 'canal' ? `📂 Canal ${E.ativado}` : `🧵 Tópico ${E.ativado}`, inline: true }
        )
        .setTimestamp();

      return int.reply({ embeds: [embed], ephemeral: true });
    }

    // 📤 /enviar — Envia o painel de tickets
    if (int.commandName === 'enviar') {
      const canal = int.channel;
      
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${E.pendente} CENTRAL DE ATENDIMENTO`)
        .setDescription(`${E.alerta} Selecione uma opção abaixo para abrir seu ticket:`);
      
      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('abrir_ticket')
          .setPlaceholder(`${E.seta} Selecione o tipo de atendimento...`)
          .addOptions(
            { label: 'Reembolso', emoji: '💰', value: 'Reembolso' },
            { label: 'Evento', emoji: '📅', value: 'Evento' },
            { label: 'Mediador', emoji: '👮', value: 'Mediador' },
            { label: 'Suporte Geral', emoji: '❓', value: 'Suporte' }
          )
      );

      await canal.send({ embeds: [embed], components: [menu] });
      return int.reply({ content: `${E.aceito} Painel enviado!`, ephemeral: true });
    }
  }

  // 🎫 Criar Ticket pelo Menu
  if (int.isStringSelectMenu() && int.customId === 'abrir_ticket') {
    const user = int.user;
    const categoria = int.values[0];

    if (db.userTickets[user.id]) 
      return int.reply({ content: `${E.warn} Você já tem um ticket aberto! Feche antes de abrir outro.`, ephemeral: true });

    const num = Object.keys(db.tickets).length + 1;
    const nome = `ticket-${num}-${user.username.toLowerCase()}`;
    let canal;

    if (config.criarComo === 'canal') {
      canal = await int.guild.channels.create({
        name, type: ChannelType.GuildText, parent: config.categoriaId || null,
        permissionOverwrites: [
          { id: int.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          ...Object.values(config.supportRoles).filter(Boolean).map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }))
        ]
      });
    } else {
      const canalPainel = config.canalPainelId ? await int.guild.channels.fetch(config.canalPainelId) : int.channel;
      if (!canalPainel) return int.reply({ content: `${E.proibido} Canal do painel não encontrado! Configure com /config ticket.`, ephemeral: true });
      canal = await canalPainel.threads.create({ name, type: ChannelType.PrivateThread, invitable: false, autoArchiveDuration: 10080 });
      await canal.members.add(user.id, { silent: true }).catch(() => {});
    }

    // Salvar
    db.tickets[canal.id] = { id: canal.id, donoId: user.id, donoTag: user.tag, categoria, numero: num };
    db.userTickets[user.id] = canal.id;
    salvarDB();

    // Embed com emoji de horário
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`${E.pendente} Atendimento`)
      .setDescription(`${E.user} Bem-vindo! Por favor, informe o motivo.\n${E.horario} **Horário:** ${new Date().toLocaleString('pt-BR')}\n📌 **Categoria:** ${categoria}`)
      .setTimestamp();

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_atender').setLabel('Atender').setEmoji(E.aceitar).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ticket_fechar').setLabel('Finalizar').setEmoji(E.arquivo).setStyle(ButtonStyle.Danger)
    );

    await canal.send({ content: `${E.alerta} ${user}`, embeds: [embed], components: [botoes] });
    await int.reply({ content: `${E.aceito} Ticket criado: ${canal}`, ephemeral: true });
  }

  // 📁 Fechar Ticket
  if (int.isButton() && int.customId === 'ticket_fechar') {
    const ticket = db.tickets[int.channel.id];
    if (!ticket) return int.reply({ content: `${E.proibido} Não é um ticket!`, ephemeral: true });
    if (!eStaff(int.member) && ticket.donoId !== int.user.id) 
      return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });

    delete db.tickets[int.channel.id];
    delete db.userTickets[ticket.donoId];
    salvarDB();

    await int.reply(`${E.arquivo} Ticket finalizado por ${int.user}! Fechando em 3s...`);
    setTimeout(() => int.channel.isThread() ? int.channel.setArchived(true) : int.channel.delete(), 3000);
  }

  // ✅ Atender Ticket
  if (int.isButton() && int.customId === 'ticket_atender') {
    if (!eStaff(int.member)) return int.reply({ content: `${E.proibido} Apenas suporte!`, ephemeral: true });
    await int.reply(`${E.aceitar} ${int.user} assumiu o atendimento! ${E.pendente}`);
  }
});

// ⌨️ Comando .f pra fechar
client.on(Events.MessageCreate, async (msg) => {
  if (!msg.guild || msg.author.bot || !msg.content.startsWith('.')) return;
  const cmd = msg.content.slice(1).trim().toLowerCase().split(' ')[0];
  const ticket = db.tickets[msg.channel.id];

  if (cmd === 'f' || cmd === 'fechar') {
    if (!ticket) return msg.reply(`${E.proibido} Esse canal não é um ticket!`);
    if (!eStaff(msg.member) && ticket.donoId !== msg.author.id) return msg.reply(`${E.proibido} Sem permissão!`);
    delete db.tickets[msg.channel.id];
    delete db.userTickets[ticket.donoId];
    salvarDB();
    await msg.reply(`${E.arquivo} Ticket finalizado! Fechando em 3s...`);
    setTimeout(() => msg.channel.isThread() ? msg.channel.setArchived(true) : msg.channel.delete(), 3000);
  }
});

client.login(process.env.TOKEN);
