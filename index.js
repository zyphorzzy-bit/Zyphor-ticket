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
  tipoAbertura: 'botoes', corBotao: 'Primary', criarComo: 'canal',
  cargos: { c1: '', c2: '', c3: '' }, cats: { suporte: '', denuncia: '', parceria: '', sorteio: '' },
  opcoes: [
    { label: 'Suporte', emoji: '❓', value: 'suporte', cat: 'suporte' },
    { label: 'Denúncia', emoji: '🚨', value: 'denuncia', cat: 'denuncia' },
    { label: 'Parceria', emoji: '🤝', value: 'parceria', cat: 'parceria' },
    { label: 'Sorteio', emoji: '🎁', value: 'sorteio', cat: 'sorteio' }
  ]
};
Object.entries(padrao).forEach(([k, v]) => { if (!config[k]) config[k] = v; });
salvarCfg();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

client.on('ready', async () => {
  console.log(`${E.ativado} Bot Online: ${client.user.tag}`);
  await client.application.commands.set([
    { name: 'config', description: 'Configurar painel de tickets' },
    { name: 'enviar', description: 'Enviar painel de atendimento no canal' }
  ]);
});

const eDono = id => DONOS.has(id);
const eStaff = m => eDono(m.id) || Object.values(config.cargos).some(r => r && m.roles.cache.has(r));
const corBtn = c => ButtonStyle[c] || ButtonStyle.Primary;

const painel = () => ({
  embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} CENTRAL DE CONFIGURAÇÃO`).addFields(
    { name: `${E.id} Criar Como`, value: config.criarComo === 'canal' ? '📂 Canal' : '🧵 Tópico', inline: true },
    { name: `${E.alerta} Exibição`, value: config.tipoAbertura === 'selectmenu' ? `${E.ativado} Menu` : `${E.desativado} Botões`, inline: true },
    { name: `${E.edit} Cor Botão`, value: config.corBotao, inline: true },
    { name: `${E.user} Cargo 1`, value: config.cargos.c1 ? `<@&${config.cargos.c1}>` : '❌', inline: true },
    { name: `${E.user} Cargo 2`, value: config.cargos.c2 ? `<@&${config.cargos.c2}>` : '❌', inline: true },
    { name: `${E.user} Cargo 3`, value: config.cargos.c3 ? `<@&${config.cargos.c3}>` : '❌', inline: true },
    { name: `${E.linkexterno} Opções Cadastradas`, value: config.opcoes.map((o, i) => `**${i + 1}.** ${o.emoji} ${o.label}`).join('\n') || 'Nenhuma', inline: false }
  )],
  components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfg_criar').setLabel('Canal/Tópico').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfg_tipo').setLabel('Modo').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_cor').setLabel('Cor').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_add').setLabel('+ Opção').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cfg_del').setLabel('- Opção').setStyle(ButtonStyle.Danger)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfg_cargo').setLabel('Cargos').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_cat').setLabel('Categorias').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_salvar').setLabel('Salvar').setStyle(ButtonStyle.Success)
    )
  ]
});

client.on(Events.InteractionCreate, async int => {
  if (int.isChatInputCommand()) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    if (int.commandName === 'config') return int.reply({ ...painel(), ephemeral: true });
    if (int.commandName === 'enviar') {
      const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} CENTRAL DE ATENDIMENTO`).setDescription('Selecione uma opção para iniciar o atendimento.');
      let components = [];
      if (config.tipoAbertura === 'selectmenu') {
        components = [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('menu_abrir').setPlaceholder('Selecione...').addOptions(config.opcoes.map(op => ({ label: op.label, emoji: op.emoji, value: op.value }))))];
      } else {
        let row = new ActionRowBuilder();
        config.opcoes.forEach((op, i) => {
          if (i > 0 && i % 5 === 0) { components.push(row); row = new ActionRowBuilder(); }
          row.addComponents(new ButtonBuilder().setCustomId(`btn_${op.value}`).setLabel(op.label).setEmoji(op.emoji).setStyle(corBtn(config.corBotao)));
        });
        if (row.components.length > 0) components.push(row);
      }
      await int.channel.send({ embeds: [emb], components });
      return int.reply({ content: `${E.ativado} Painel enviado!`, ephemeral: true });
    }
  }

  if (int.isButton() && int.customId.startsWith('cfg_')) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    if (int.customId === 'cfg_criar') config.criarComo = config.criarComo === 'canal' ? 'thread' : 'canal';
    if (int.customId === 'cfg_tipo') config.tipoAbertura = config.tipoAbertura === 'selectmenu' ? 'botoes' : 'selectmenu';
    if (int.customId === 'cfg_cor') { const c = ['Primary', 'Success', 'Danger', 'Secondary']; config.corBotao = c[(c.indexOf(config.corBotao) + 1) % c.length]; }
    if (int.customId === 'cfg_add') config.opcoes.push({ label: 'Novo Atendimento', emoji: '❓', value: `op_${Date.now().toString().slice(-4)}`, cat: 'suporte' });
    if (int.customId === 'cfg_del' && config.opcoes.length > 1) config.opcoes.pop();
    if (int.customId === 'cfg_cargo') return int.reply({ content: `${E.alerta} Use no chat: \`!cargo1 @Cargo\``, ephemeral: true });
    if (int.customId === 'cfg_cat') return int.reply({ content: `${E.alerta} Use no chat: \`!setcat suporte ID_CATEGORIA\``, ephemeral: true });
    if (int.customId === 'cfg_salvar') { salvarCfg(); return int.update({ content: `${E.ativado} Configurações salvas!`, embeds: [], components: [] }); }
    salvarCfg();
    return int.update(painel());
  }

  if ((int.isStringSelectMenu() && int.customId === 'menu_abrir') || (int.isButton() && int.customId.startsWith('btn_'))) {
    const valor = int.isStringSelectMenu() ? int.values[0] : int.customId.replace('btn_', '');
    db.userTickets = db.userTickets || {}; db.tickets = db.tickets || {};
    if (db.userTickets[int.user.id]) return int.reply({ content: `${E.alerta} Você já possui um ticket aberto: <#${db.userTickets[int.user.id]}>`, ephemeral: true });

    const op = config.opcoes.find(o => o.value === valor);
    let catId = (config.cats[op?.cat] || '').replace(/\D/g, '') || null;
    const num = Object.keys(db.tickets).length + 1;
    const nome = `ticket-${num}-${int.user.username}`;
    let canal;

    try {
      if (config.criarComo === 'canal') {
        const permissionOverwrites = [
          { id: int.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: int.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
        ];
        Object.values(config.cargos).forEach(r => {
          const cR = (r || '').replace(/\D/g, '');
          if (cR) permissionOverwrites.push({ id: cR, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        });
        canal = await int.guild.channels.create({ name, type: ChannelType.GuildText, parent: catId, permissionOverwrites });
      } else {
        canal = await int.channel.threads.create({ name, type: ChannelType.PrivateThread, autoArchiveDuration: 10080 });
        await canal.members.add(int.user.id).catch(() => {});
      }

      db.tickets[canal.id] = { id: canal.id, dono: int.user.id, categoria: op?.label || 'Atendimento' };
      db.userTickets[int.user.id] = canal.id;
      salvarDB();

      const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} ATENDIMENTO - ${op?.label || 'Geral'}`)
        .setDescription(`${E.user} Usuário: <@${int.user.id}>\n${E.id} Ticket ID: \`${canal.id}\`\n\nDescreva seu problema com detalhes.`).setTimestamp();
      const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger));

      await canal.send({ content: `<@${int.user.id}>`, embeds: [emb], components: [btn] });
      return int.reply({ content: `${E.ativado} Ticket criado: ${canal}`, ephemeral: true });
    } catch (err) {
      console.error(err);
      return int.reply({ content: `${E.proibido} Erro ao criar ticket. Verifique a categoria no \`!setcat\`.`, ephemeral: true });
    }
  }

  if (int.isButton() && int.customId === 'fechar_ticket') {
    const t = db.tickets?.[int.channel.id];
    if (!t) return int.reply({ content: `${E.alerta} Não é um ticket válido.`, ephemeral: true });
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
    return t ? m.channel.send(`${E.alerta} <@${t.dono}>, você tem uma nova resposta!`) : m.reply(`${E.alerta} Canal inválido.`);
  }

  if (cmd === '.nm') {
    if (!eStaff(m.member)) return;
    return m.channel.send(`${E.horario} Aguarde o atendimento sem enviar mensagens repetidas.`);
  }

  if (!eDono(m.author.id)) return;
  if (['!cargo1', '!cargo2', '!cargo3'].includes(cmd)) {
    const r = m.mentions.roles.first(); if (!r) return m.reply(`${E.alerta} Mencione um cargo.`);
    config.cargos[`c${cmd.slice(-1)}`] = r.id; salvarCfg();
    return m.reply(`${E.ativado} Cargo configurado: ${r}`);
  }

  if (cmd === '!setcat') {
    const [cat, catId] = args; if (!cat || !config.cats.hasOwnProperty(cat)) return m.reply(`${E.alerta} Use: \`!setcat suporte ID_CATEGORIA\``);
    config.cats[cat] = catId || m.channel.parentId; salvarCfg();
    return m.reply(`${E.ativado} Categoria \`${cat}\` salva!`);
  }

  if (cmd === '!editar') {
    const idx = parseInt(args[0]) - 1; const nome = args.slice(1).join(' ');
    if (isNaN(idx) || !config.opcoes[idx] || !nome) return m.reply(`${E.alerta} Use: \`!editar 1 Nome\``);
    config.opcoes[idx].label = nome; salvarCfg();
    return m.reply(`${E.edit} Opção alterada: **${nome}**`);
  }
});

client.login(process.env.TOKEN);
