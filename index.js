const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActivityType } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

const DONOS = new Set(['1527769881326522478', '1533306874513068093']);

// Seus emojis personalizados restaurados aqui:
const E = {
  edit: '<:edit:1534611988624310272>', id: '<:ID:1534611999085039786>', horario: '<:horrio:1534611997335883886>',
  ativado: '<a:ativado:1534611985260609607>', config: '<:config:1534611990633250937>', proibido: '<:Proibido:1534611991929290877>',
  linkexterno: '<:linkexterno:1539124690709385330>', desativado: '<a:desativado:1534611986539876463>',
  alerta: '<:alerta:1534611993410015456>', user: '<:user:1539125800907968603>',
  fechar: '<:fechar:1539890262690758666>', atender: '<:atender:1539890260761382944>'
};

let config = fs.existsSync('./config.json') ? JSON.parse(fs.readFileSync('./config.json')) : {};
let db = fs.existsSync('./database.json') ? JSON.parse(fs.readFileSync('./database.json')) : {};
const salvarCfg = () => fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
const salvarDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

const padrao = { tipoAbertura: 'botoes', corBotao: 'Primary', criarComo: 'canal', catId: '', logChannelId: '', embedTitulo: 'CENTRAL DE ATENDIMENTO', embedDesc: 'Selecione uma opção abaixo.', cargos: { c1: '', c2: '', c3: '' }, opcoes: [{ label: 'Suporte', emoji: '❓', value: 'suporte' }, { label: 'Denúncia', emoji: '🚨', value: 'denuncia' }] };
Object.entries(padrao).forEach(([k, v]) => { if (!config[k]) config[k] = v; });
salvarCfg();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

const eStaff = m => DONOS.has(m.id) || Object.values(config.cargos).some(r => r && m.roles.cache.has(r));

const painel = () => ({
  embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} PAINEL DE CONFIGURAÇÃO`).addFields(
    { name: `${E.id} Modo`, value: config.criarComo === 'canal' ? '📂 Canal' : '🧵 Tópico', inline: true },
    { name: `${E.alerta} Tipo`, value: config.tipoAbertura === 'selectmenu' ? `${E.ativado} Menu` : `${E.desativado} Botões`, inline: true },
    { name: `${E.edit} Categoria ID`, value: config.catId ? `\`${config.catId}\`` : `${E.proibido} Nenhuma`, inline: true },
    { name: `${E.edit} Canal Logs`, value: config.logChannelId ? `<#${config.logChannelId}>` : `${E.proibido} Nenhum`, inline: true },
    { name: `${E.user} Cargos Suporte`, value: Object.values(config.cargos).filter(Boolean).map(c => `<@&${c}>`).join(', ') || 'Nenhum', inline: false }
  )],
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfg_criar').setLabel('Canal/Tópico').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfg_tipo').setLabel('Botão/Menu').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_embed_modal').setLabel('Textos').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfg_salvar').setLabel('Salvar').setStyle(ButtonStyle.Success)
    )
  ]
});

client.on('ready', async () => {
  console.log(`${E.ativado} Bot Online: ${client.user.tag}`);
  client.user.setPresence({ activities: [{ name: 'Atendimento On-line', type: ActivityType.Streaming, url: 'https://twitch.tv/discord' }], status: 'online' });
  await client.application.commands.set([
    { name: 'config', description: 'Painel de configuração' },
    { name: 'enviar', description: 'Enviar painel de atendimento' }
  ]);
});

client.on(Events.InteractionCreate, async int => {
  if (int.isChatInputCommand()) {
    if (!eStaff(int.member)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    if (int.commandName === 'config') return int.reply({ ...painel(), ephemeral: true });
    if (int.commandName === 'enviar') {
      const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle(config.embedTitulo).setDescription(config.embedDesc);
      let components = [];
      if (config.tipoAbertura === 'selectmenu') {
        const menu = new StringSelectMenuBuilder().setCustomId('menu_abrir').setPlaceholder('Selecione uma categoria...');
        config.opcoes.forEach(o => menu.addOptions({ label: o.label, emoji: o.emoji, value: o.value }));
        components.push(new ActionRowBuilder().addComponents(menu));
      } else {
        let row = new ActionRowBuilder();
        config.opcoes.forEach(o => row.addComponents(new ButtonBuilder().setCustomId(`btn_${o.value}`).setLabel(o.label).setEmoji(o.emoji).setStyle(ButtonStyle[config.corBotao] || ButtonStyle.Primary)));
        components.push(row);
      }
      await int.channel.send({ embeds: [emb], components });
      return int.reply({ content: `${E.ativado} Enviado!`, ephemeral: true });
    }
  }

  if (int.isButton() && int.customId.startsWith('cfg_')) {
    if (!eStaff(int.member)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    if (int.customId === 'cfg_criar') config.criarComo = config.criarComo === 'canal' ? 'thread' : 'canal';
    if (int.customId === 'cfg_tipo') config.tipoAbertura = config.tipoAbertura === 'selectmenu' ? 'botoes' : 'selectmenu';
    if (int.customId === 'cfg_salvar') { salvarCfg(); return int.update({ content: `${E.ativado} Salvo com sucesso!`, embeds: [], components: [] }); }
    if (int.customId === 'cfg_embed_modal') {
      const modal = new ModalBuilder().setCustomId('modal_embed').setTitle('Textos da Embed');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t').setLabel('Título').setStyle(TextInputStyle.Short).setValue(config.embedTitulo)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('d').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setValue(config.embedDesc))
      );
      return int.showModal(modal);
    }
    salvarCfg(); return int.update(painel());
  }

  if (int.isModalSubmit() && int.customId === 'modal_embed') {
    config.embedTitulo = int.fields.getTextInputValue('t');
    config.embedDesc = int.fields.getTextInputValue('d');
    salvarCfg(); return int.update(painel());
  }

  if ((int.isStringSelectMenu() && int.customId === 'menu_abrir') || (int.isButton() && int.customId.startsWith('btn_'))) {
    db.userTickets = db.userTickets || {}; db.tickets = db.tickets || {}; db.historicoLogs = db.historicoLogs || [];
    if (db.userTickets[int.user.id]) return int.reply({ content: `${E.alerta} Você já tem um ticket: <#${db.userTickets[int.user.id]}>`, ephemeral: true });

    const valor = int.isStringSelectMenu() ? int.values[0] : int.customId.replace('btn_', '');
    const op = config.opcoes.find(o => o.value === valor);
    const name = `🎫-${(op?.label || 'ticket').toLowerCase()}-${int.user.username}`;
    let canal;

    if (config.criarComo === 'canal') {
      const permissionOverwrites = [
        { id: int.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: int.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ];
      Object.values(config.cargos).forEach(r => { if (r) permissionOverwrites.push({ id: r, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }); });
      canal = await int.guild.channels.create({ name, type: ChannelType.GuildText, parent: config.catId || null, permissionOverwrites });
    } else {
      canal = await int.channel.threads.create({ name, type: ChannelType.PrivateThread });
    }

    const now = Date.now();
    db.tickets[canal.id] = { id: canal.id, dono: int.user.id, categoria: op?.label || 'Geral', criadoEm: now };
    db.userTickets[int.user.id] = canal.id;
    db.historicoLogs.push({ userId: int.user.id, canalId: canal.id, categoria: op?.label || 'Geral', criadoEm: now });
    salvarDB();

    const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} ATENDIMENTO - ${op?.label || 'Geral'}`).setDescription(`${E.user} Usuário: <@${int.user.id}>\n\nAguarde a equipe de suporte.`);
    const btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('atender_ticket').setLabel('Assumir').setEmoji(E.atender).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setEmoji(E.fechar).setStyle(ButtonStyle.Secondary)
    );
    await canal.send({ embeds: [emb], components: [btns] });
    return int.reply({ content: `${E.ativado} Ticket criado: ${canal}`, ephemeral: true });
  }

  if (int.isButton()) {
    if (int.customId === 'atender_ticket') {
      if (!eStaff(int.member)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
      return int.reply({ content: `${E.atender} O atendente <@${int.user.id}> assumiu este ticket!` });
    }
    if (int.customId === 'fechar_ticket') {
      const t = db.tickets?.[int.channel.id];
      if (!t || (!eStaff(int.member) && t.dono !== int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
      delete db.tickets[int.channel.id]; delete db.userTickets[t.dono]; salvarDB();
      await int.reply(`${E.fechar} Encerrando atendimento...`);
      setTimeout(() => int.channel.isThread() ? int.channel.setArchived(true) : int.channel.delete(), 1500);
    }
  }
});

client.on(Events.MessageCreate, async m => {
  if (!m.guild || m.author.bot) return;
  const t = db.tickets?.[m.channel.id];
  const args = m.content.trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (['.f', '.fechar'].includes(cmd) && t) {
    if (!eStaff(m.member) && t.dono !== m.author.id) return;
    delete db.tickets[m.channel.id]; delete db.userTickets[t.dono]; salvarDB();
    await m.reply(`${E.fechar} Encerrando atendimento...`);
    return setTimeout(() => m.channel.isThread() ? m.channel.setArchived(true) : m.channel.delete(), 1500);
  }

  if (cmd === '.not' && eStaff(m.member) && t) return m.channel.send(`${E.alerta} <@${t.dono}>, você recebeu uma nova resposta da equipe!`);
  
  if (cmd === '.nm' && eStaff(m.member) && t) {
    const n = args.join('-');
    if (n) { await m.channel.setName(`🎫-${n}`); return m.reply(`${E.edit} Nome do ticket alterado!`); }
  }

  // Comando .adc
  if (cmd === '.adc' && eStaff(m.member) && t) {
    const alvo = m.mentions.members.first() || await m.guild.members.fetch(args[0]).catch(() => null);
    if (!alvo) return m.reply(`${E.alerta} Use: \`.adc @user\` ou \`.adc ID\``);
    if (m.channel.isThread()) await m.channel.members.add(alvo.id);
    else await m.channel.permissionOverwrites.edit(alvo.id, { ViewChannel: true, SendMessages: true });
    return m.reply(`${E.ativado} O usuário <@${alvo.id}> foi adicionado ao ticket!`);
  }

  if (cmd === '.logs' && eStaff(m.member)) {
    const u = m.mentions.users.first();
    if (!u || !config.logChannelId) return m.reply(`${E.alerta} Uso: \`.logs @user\` (Com canal de logs configurado)`);
    const logs = (db.historicoLogs || []).filter(h => h.userId === u.id && h.criadoEm >= Date.now() - 864000000);
    const txt = logs.map((h, i) => `${i + 1}. \`${h.categoria}\` - <t:${Math.floor(h.criadoEm/1000)}:R>`).join('\n') || 'Nenhum ticket recente.';
    const logChan = m.guild.channels.cache.get(config.logChannelId);
    if (logChan) await logChan.send({ embeds: [new EmbedBuilder().setTitle(`${E.config} Logs - ${u.tag}`).setDescription(txt)] });
    return m.reply(`${E.ativado} Relatório de logs enviado!`);
  }

  if (!eStaff(m.member)) return;
  if (['!cargo1', '!cargo2', '!cargo3'].includes(cmd)) {
    const r = m.mentions.roles.first(); if (r) { config.cargos[`c${cmd.slice(-1)}`] = r.id; salvarCfg(); m.reply(`${E.ativado} Cargo ${cmd.slice(-1)} definido!`); }
  }
  if (cmd === '!setcat') { config.catId = args[0] ? args[0].replace(/\D/g, '') : m.channel.parentId; salvarCfg(); m.reply(`${E.ativado} Categoria configurada!`); }
  if (cmd === '!setlogs') { const c = m.mentions.channels.first(); if (c) { config.logChannelId = c.id; salvarCfg(); m.reply(`${E.ativado} Canal de logs configurado!`); } }
});

client.login(process.env.TOKEN);
