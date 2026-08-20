const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

const DONOS = new Set(['1527769881326522478', '1533306874513068093']);
const E = {
  edit: '<:edit:1534611988624310272>', id: '<:ID:1534611999085039786>', horario: '<:horrio:1534611997335883886>',
  ativado: '<a:ativado:1534611985260609607>', config: '<:config:1534611990633250937>', proibido: '<:Proibido:1534611991929290877>',
  linkexterno: '<:linkexterno:1539124690709385330>', desativado: '<a:desativado:1534611986539876463>',
  alerta: '<:alerta:1534611993410015456>', user: '<:user:1539125800907968603>'
};

let config = fs.existsSync('./config.json') ? JSON.parse(fs.readFileSync('./config.json')) : {};
let db = fs.existsSync('./database.json') ? JSON.parse(fs.readFileSync('./database.json')) : {};

const salvarCfg = () => fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
const salvarDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

const padrao = {
  tipoAbertura: 'botoes', corBotao: 'Primary', criarComo: 'canal', catId: '',
  cargos: { c1: '', c2: '', c3: '' },
  opcoes: [{ label: 'Suporte', emoji: '❓', value: 'suporte' }, { label: 'Denúncia', emoji: '🚨', value: 'denuncia' }]
};
Object.entries(padrao).forEach(([k, v]) => { if (!config[k]) config[k] = v; });
salvarCfg();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

client.on('ready', async () => {
  console.log(`${E.ativado} Bot Online: ${client.user.tag}`);
  await client.application.commands.set([
    { name: 'config', description: 'Painel de configuração de tickets' },
    { name: 'enviar', description: 'Enviar o painel de atendimento' }
  ]);
});

const eDono = id => DONOS.has(id);
const eStaff = m => eDono(m.id) || Object.values(config.cargos).some(r => r && m.roles.cache.has(r));

const painel = () => ({
  embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} PAINEL DE CONFIGURAÇÃO`).addFields(
    { name: `${E.id} Criar Como`, value: config.criarComo === 'canal' ? '📂 Canal' : '🧵 Tópico', inline: true },
    { name: `${E.alerta} Modo`, value: config.tipoAbertura === 'selectmenu' ? `${E.ativado} Menu` : `${E.desativado} Botões`, inline: true },
    { name: `${E.edit} Categoria ID`, value: config.catId ? `\`${config.catId}\`` : 'Nenhuma', inline: true },
    { name: `${E.user} Cargos`, value: Object.values(config.cargos).filter(Boolean).map(c => `<@&${c}>`).join(', ') || 'Nenhum', inline: false }
  )],
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfg_criar').setLabel('Canal/Tópico').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfg_tipo').setLabel('Botão/Menu').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_salvar').setLabel('Salvar').setStyle(ButtonStyle.Success)
    )
  ]
});

client.on(Events.InteractionCreate, async int => {
  if (int.isChatInputCommand()) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    
    if (int.commandName === 'config') return int.reply({ ...painel(), ephemeral: true });

    if (int.commandName === 'enviar') {
      const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} ATENDIMENTO`).setDescription('Clique ou selecione uma opção para abrir seu ticket.');
      let row = new ActionRowBuilder();
      
      if (config.tipoAbertura === 'selectmenu') {
        const menu = new StringSelectMenuBuilder().setCustomId('menu_abrir').setPlaceholder('Selecione...');
        config.opcoes.forEach(o => menu.addOptions({ label: o.label, emoji: o.emoji, value: o.value }));
        row.addComponents(menu);
      } else {
        config.opcoes.forEach(o => row.addComponents(new ButtonBuilder().setCustomId(`btn_${o.value}`).setLabel(o.label).setEmoji(o.emoji).setStyle(ButtonStyle.Primary)));
      }

      await int.channel.send({ embeds: [emb], components: [row] });
      return int.reply({ content: `${E.ativado} Painel enviado!`, ephemeral: true });
    }
  }

  if (int.isButton() && int.customId.startsWith('cfg_')) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    if (int.customId === 'cfg_criar') config.criarComo = config.criarComo === 'canal' ? 'thread' : 'canal';
    if (int.customId === 'cfg_tipo') config.tipoAbertura = config.tipoAbertura === 'selectmenu' ? 'botoes' : 'selectmenu';
    if (int.customId === 'cfg_salvar') { salvarCfg(); return int.update({ content: `${E.ativado} Salvo!`, embeds: [], components: [] }); }
    salvarCfg();
    return int.update(painel());
  }

  if ((int.isStringSelectMenu() && int.customId === 'menu_abrir') || (int.isButton() && int.customId.startsWith('btn_'))) {
    db.userTickets = db.userTickets || {}; db.tickets = db.tickets || {};
    if (db.userTickets[int.user.id]) return int.reply({ content: `${E.alerta} Você já possui um ticket aberto: <#${db.userTickets[int.user.id]}>`, ephemeral: true });

    const num = Object.keys(db.tickets).length + 1;
    const name = `ticket-${num}-${int.user.username}`;
    let canal;

    try {
      if (config.criarComo === 'canal') {
        const permissionOverwrites = [
          { id: int.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: int.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
        ];
        Object.values(config.cargos).forEach(r => {
          if (r) permissionOverwrites.push({ id: r, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        });

        canal = await int.guild.channels.create({ name, type: ChannelType.GuildText, parent: config.catId || null, permissionOverwrites });
      } else {
        canal = await int.channel.threads.create({ name, type: ChannelType.PrivateThread, autoArchiveDuration: 10080 });
        await canal.members.add(int.user.id).catch(() => {});
      }

      db.tickets[canal.id] = { id: canal.id, dono: int.user.id };
      db.userTickets[int.user.id] = canal.id;
      salvarDB();

      const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} ATENDIMENTO`).setDescription(`${E.user} Usuário: <@${int.user.id}>\n\nAguarde a equipe de suporte.`).setTimestamp();
      const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger));

      await canal.send({ content: `<@${int.user.id}>`, embeds: [emb], components: [btn] });
      return int.reply({ content: `${E.ativado} Ticket criado: ${canal}`, ephemeral: true });
    } catch (err) {
      console.error(err);
      return int.reply({ content: `${E.proibido} Erro ao criar o ticket! Verifique as permissões do bot.`, ephemeral: true });
    }
  }

  if (int.isButton() && int.customId === 'fechar_ticket') {
    const t = db.tickets?.[int.channel.id];
    if (!t) return int.reply({ content: `${E.alerta} Não é um ticket.`, ephemeral: true });
    if (!eStaff(int.member) && t.dono !== int.user.id) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    delete db.tickets[int.channel.id]; delete db.userTickets[t.dono]; salvarDB();
    await int.reply(`${E.ativado} Encerrando...`);
    setTimeout(() => int.channel.isThread() ? int.channel.setArchived(true) : int.channel.delete(), 1500);
  }
});

client.on(Events.MessageCreate, async m => {
  if (!m.guild || m.author.bot) return;
  const args = m.content.trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (['.f', '.fechar'].includes(cmd)) {
    const t = db.tickets?.[m.channel.id];
    if (!t || (!eStaff(m.member) && t.dono !== m.author.id)) return m.reply(`${E.proibido} Sem permissão!`);
    delete db.tickets[m.channel.id]; delete db.userTickets[t.dono]; salvarDB();
    await m.reply(`${E.ativado} Encerrando...`);
    setTimeout(() => m.channel.isThread() ? m.channel.setArchived(true) : m.channel.delete(), 1500);
  }

  if (cmd === '.not') {
    if (!eStaff(m.member)) return;
    const t = db.tickets?.[m.channel.id];
    return t ? m.channel.send(`${E.alerta} <@${t.dono}>, você recebeu uma resposta!`) : m.reply(`${E.alerta} Canal inválido.`);
  }

  if (cmd === '.nm') {
    if (!eStaff(m.member)) return;
    return m.channel.send(`${E.horario} Por favor, aguarde o atendimento sem enviar mensagens repetidas.`);
  }

  if (!eDono(m.author.id)) return;

  if (cmd === '!setcat') {
    config.catId = args[0] ? args[0].replace(/\D/g, '') : m.channel.parentId;
    salvarCfg();
    return m.reply(`${E.ativado} Categoria configurada: \`${config.catId || 'Nenhuma (Cria solto)'}\``);
  }
});

client.login(process.env.TOKEN);
