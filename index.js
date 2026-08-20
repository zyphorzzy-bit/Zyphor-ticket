const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

// 🔒 DONOS
const DONOS = new Set(['1527769881326522478', '1533306874513068093']);

// 😼 SEUS EMOJIS
const E = {
  edit: '<:edit:1534611988624310272>', ID: '<:ID:1534611999085039786>',
  ativado: '<a:ativado:1534611985260609607>', config: '<:config:1534611990633250937>',
  proibido: '<:Proibido:1534611991929290877>', linkexterno: '<:linkexterno:1539124690709385330>',
  desativado: '<a:desativado:1534611986539876463>', alerta: '<:alerta:1534611993410015456>',
  user: '<:user:1539125800907968603>'
};

// 📁 BANCO
let config = require('./config.json');
let db = require('./database.json');
const salvarCfg = () => fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
const salvarDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

// PADRÃO
const padrao = {
  tipoAbertura: 'botoes', corBotao: 'Primary', criarComo: 'thread',
  cargos: { c1: '', c2: '', c3: '' },
  cats: { suporte: '', denuncia: '', parceria: '', sorteio: '' },
  opcoes: [
    { label: 'Suporte', emoji: '❓', value: 'suporte', cat: 'suporte' },
    { label: 'Denúncia', emoji: '🚨', value: 'denuncia', cat: 'denuncia' },
    { label: 'Parceria', emoji: '🤝', value: 'parceria', cat: 'parceria' },
    { label: 'Sorteio', emoji: '🎁', value: 'sorteio', cat: 'sorteio' }
  ]
};
Object.entries(padrao).forEach(([k,v]) => { if (!config[k]) config[k] = v; });

// 🤖 BOT
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// ✅ ONLINE
client.on('ready', async () => {
  console.log(`${E.ativado} Online: ${client.user.tag}`);
  await client.application.commands.set([
    { name: 'config', description: `${E.config} Configurar tickets`, options: [{ name: 'ticket', type: 1, description: 'Abrir painel' }] },
    { name: 'enviar', description: 'Enviar painel de atendimento' }
  ]);
});

// 🔐 PERMISSÕES
const eDono = id => DONOS.has(id);
const eStaff = m => eDono(m.id) || Object.values(config.cargos).some(r => r && m.roles.cache.has(r));
const corBtn = c => ({ Primary:ButtonStyle.Primary, Success:ButtonStyle.Success, Danger:ButtonStyle.Danger, Secondary:ButtonStyle.Secondary }[c]);

// 🎨 PAINEL DE CONFIG
const painel = () => {
  const tipo = config.tipoAbertura === 'selectmenu' ? `${E.ativado} Menu` : `${E.desativado} Botões`;
  const criacao = config.criarComo === 'canal' ? '📂 Canal' : '🧵 Tópico';
  const cor = { Primary:'🔵', Success:'🟢', Danger:'🔴', Secondary:'⚫' }[config.corBotao];
  return {
    embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} CONFIGURAÇÃO`)
      .addFields(
        { name: 'Criação', value: criacao, inline: true },
        { name: `${E.alerta} Tipo`, value: tipo, inline: true },
        { name: `${E.edit} Cor Botão`, value: cor, inline: true },
        { name: `${E.user} Cargo 1`, value: config.cargos.c1?`<@&${config.cargos.c1}>`:'❌', inline: true },
        { name: `${E.user} Cargo 2`, value: config.cargos.c2?`<@&${config.cargos.c2}>`:'❌', inline: true },
        { name: `${E.user} Cargo 3`, value: config.cargos.c3?`<@&${config.cargos.c3}>`:'❌', inline: true },
        { name: `${E.linkexterno} Suporte`, value: config.cats.suporte?`<#${config.cats.suporte}>`:'❌', inline: true },
        { name: `${E.linkexterno} Denúncia`, value: config.cats.denuncia?`<#${config.cats.denuncia}>`:'❌', inline: true },
        { name: `${E.linkexterno} Parceria`, value: config.cats.parceria?`<#${config.cats.parceria}>`:'❌', inline: true },
        { name: `${E.linkexterno} Sorteio`, value: config.cats.sorteio?`<#${config.cats.sorteio}>`:'❌', inline: true },
        { name: `${E.edit} Opções (${config.opcoes.length})`, value: config.opcoes.map(o => `${o.emoji} ${o.label}`).join('\n'), inline: false }
      )],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfg_criar').setLabel('Canal/Thread').setEmoji('📂').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfg_tipo').setLabel('Tipo').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_cor').setLabel('Cor').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_add').setLabel('+Opção').setEmoji('➕').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cfg_del').setLabel('-Opção').setEmoji('➖').setStyle(ButtonStyle.Danger)
    ), new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfg_cargo').setLabel('Cargos').setEmoji(E.user).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfg_cat').setLabel('Categorias').setEmoji(E.linkexterno).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_editar').setLabel('Editar').setEmoji(E.edit).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_salvar').setLabel('Salvar').setEmoji(E.ativado).setStyle(ButtonStyle.Success)
    )]
  };
};

// ⚡ INTERAÇÕES
client.on(Events.InteractionCreate, async int => {
  // 🛠️ /config ticket
  if (int.isChatInputCommand()) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    if (int.commandName === 'config') return int.reply({ ...painel(), ephemeral: false });
    
    // 📤 /enviar
    if (int.commandName === 'enviar') {
      const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle('🎫 ATENDIMENTO').setDescription('Escolha uma opção:');
      const comp = config.tipoAbertura === 'selectmenu'
        ? [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('menu_abrir').setPlaceholder('Selecione...').addOptions(config.opcoes))]
        : config.opcoes.map(op => new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel(`${op.emoji} ${op.label}`).setStyle(corBtn(config.corBotao)).setCustomId(`btn_${op.value}`)));
      await int.channel.send({ embeds: [emb], components: comp });
      return int.reply({ content: '✅ Enviado!', ephemeral: true });
    }
  }

  // 🎯 BOTÕES DE CONFIG
  if (int.isButton() && int.customId.startsWith('cfg_')) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    if (int.customId === 'cfg_criar') config.criarComo = config.criarComo === 'canal' ? 'thread' : 'canal';
    if (int.customId === 'cfg_tipo') config.tipoAbertura = config.tipoAbertura === 'selectmenu' ? 'botoes' : 'selectmenu';
    if (int.customId === 'cfg_cor') { const c = ['Primary','Success','Danger','Secondary']; config.corBotao = c[(c.indexOf(config.corBotao)+1)%4]; }
    if (int.customId === 'cfg_add') config.opcoes.push({ label:'Nova', emoji:'🔹', value:`op_${Date.now()}`, cat:'suporte' });
    if (int.customId === 'cfg_del' && config.opcoes.length>1) config.opcoes.pop();
    if (int.customId === 'cfg_editar') return int.reply({ content: `${E.alerta} Use: !editar 1 NovoNome`, ephemeral: true });
    if (int.customId === 'cfg_cargo') return int.reply({ content: `${E.alerta} Use: !cargo1 @Cargo`, ephemeral: true });
    if (int.customId === 'cfg_cat') return int.reply({ content: `${E.alerta} Use: !setcat suporte #Canal`, ephemeral: true });
    if (int.customId === 'cfg_salvar') { salvarCfg(); return int.update({ content: `${E.ativado} Salvo! Use /enviar`, components: [] }); }
    salvarCfg(); return int.update(painel());
  }

  // 🎫 CRIAR TICKET DE VERDADE!!!
  if ((int.isStringSelectMenu() && int.customId === 'menu_abrir') || (int.isButton() && int.customId.startsWith('btn_'))) {
    const valor = int.values ? int.values[0] : int.customId.slice(4);
    if (db.userTickets?.[int.user.id]) return int.reply({ content: `${E.alerta} Você já tem um ticket aberto!`, ephemeral: true });
    
    const op = config.opcoes.find(o => o.value === valor);
    const catId = config.cats[op?.cat] || null;
    const num = Object.keys(db.tickets||{}).length + 1;
    const nome = `ticket-${num}-${int.user.username}`;
    let canal;

    if (config.criarComo === 'canal') {
      canal = await int.guild.channels.create({
        name, type: ChannelType.GuildText, parent: catId,
        permissionOverwrites: [
          { id: int.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: int.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });
    } else {
      canal = await int.channel.threads.create({ name, type: ChannelType.PrivateThread, autoArchiveDuration: 10080 });
      await canal.members.add(int.user.id).catch(() => {});
    }

    db.tickets = db.tickets || {}; db.userTickets = db.userTickets || {};
    db.tickets[canal.id] = { id: canal.id, dono: int.user.id, categoria: op?.label };
    db.userTickets[int.user.id] = canal.id;
    salvarDB();

    const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle('🎫 ATENDIMENTO').setDescription(`Bem-vindo!\n📌 Categoria: ${op?.label}`);
    const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar').setLabel('Finalizar').setEmoji('📁').setStyle(ButtonStyle.Danger));
    await canal.send({ content: `<@${int.user.id}>`, embeds: [emb], components: [btn] });
    return int.reply({ content: `✅ Ticket criado: ${canal}`, ephemeral: true });
  }

  // 📁 FECHAR TICKET
  if (int.isButton() && int.customId === 'fechar') {
    const t = db.tickets?.[int.channel.id];
    if (!t || (!eStaff(int.member) && t.dono !== int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    delete db.tickets[int.channel.id]; delete db.userTickets[t.dono]; salvarDB();
    await int.reply('✅ Fechando...');
    setTimeout(() => int.channel.isThread() ? int.channel.setArchived(true) : int.channel.delete(), 1500);
  }
});

// ⌨️ COMANDOS PREFIXO
client.on(Events.MessageCreate, async m => {
  if (!m.guild || m.author.bot || !eDono(m.author.id)) return;
  if (m.content.startsWith('!cargo1')) { const r = m.mentions.roles.first(); if(!r)return; config.cargos.c1=r.id; salvarCfg(); m.reply(`${E.ativado} Cargo 1: ${r}`); }
  if (m.content.startsWith('!cargo2')) { const r = m.mentions.roles.first(); if(!r)return; config.cargos.c2=r.id; salvarCfg(); m.reply(`${E.ativado} Cargo 2: ${r}`); }
  if (m.content.startsWith('!cargo3')) { const r = m.mentions.roles.first(); if(!r)return; config.cargos.c3=r.id; salvarCfg(); m.reply(`${E.ativado} Cargo 3: ${r}`); }
  if (m.content.startsWith('!setcat')) { const [,cat] = m.content.split(' '); const ch = m.mentions.channels.first(); if(!ch||!config.cats.hasOwnProperty(cat))return; config.cats[cat]=ch.id; salvarCfg(); m.reply(`${E.ativado} Categoria ${cat}: ${ch}`); }
  if (m.content.startsWith('!editar')) { const p = m.content.split(' '); const idx = parseInt(p[1])-1; const nome = p.slice(2).join(' '); if(isNaN(idx)||!config.opcoes[idx]||!nome)return; config.opcoes[idx].label=nome; salvarCfg(); m.reply(`${E.edit} Alterado: ${nome}`); }
  if (['.f','.fechar'].includes(m.content.trim().toLowerCase())) {
    const t = db.tickets?.[m.channel.id];
    if (!t || (!eStaff(m.member) && t.dono !== m.author.id)) return m.reply(`${E.proibido} Sem permissão!`);
    delete db.tickets[m.channel.id]; delete db.userTickets[t.dono]; salvarDB();
    await m.reply('✅ Fechando...');
    setTimeout(() => m.channel.isThread() ? m.channel.setArchived(true) : m.channel.delete(), 1500);
  }
});

client.login(process.env.TOKEN);
