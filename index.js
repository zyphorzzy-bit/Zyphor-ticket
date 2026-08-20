const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

// 🔒 SÓ ESSES DOIS USAM COMANDOS DE CONFIG
const DONOS = new Set(['1527769881326522478', '1533306874513068093']);

// 😼 SEUS EMOJIS
const E = {
  aceito: '<:aceito:1539124707222093915>', pendente: '<:pendente:1539124705167147059>',
  proibido: '<:Proibido:1534611991929290877>', warn: '<:warn:1539125781320433724>',
  alerta: '<:alerta:1534611993410015456>', arquivo: '<:arquivo:1539124693460713552>',
  aceitar: '<:aceitar:1539124696912756767>', config: '<:config:1534611990633250937>',
  ativado: '<a:ativado:1534611985260609607>', desativado: '<a:desativado:1534611986539876463>',
  loading: '<a:loanding:1534612861211377868>', seta: '<:seta:1539785898693234700>',
  horario: '<:horrio:1534611997335883886>'
};

// 📁 ARQUIVOS
let config = require('./config.json');
let db = require('./database.json');
const salvarConfig = () => fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
const salvarDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

// Garantir dados padrão
const defaults = {
  tipoAbertura: 'selectmenu', criarComo: 'thread',
  supportRoles: { cargo1: '', cargo2: '', cargo3: '' },
  opcoesTicket: [{ label: 'Reembolso', emoji: '💰', value: 'reembolso' }, { label: 'Suporte', emoji: '❓', value: 'suporte' }]
};
Object.keys(defaults).forEach(k => { if (!config[k]) config[k] = defaults[k]; });

// 🤖 BOT
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// ✅ ONLINE
client.on('ready', async () => {
  console.log(`${E.loading} Carregando...\n${E.aceito} Bot online: ${client.user.tag}`);
  client.user.setActivity({ name: `${E.pendente} Configurável`, type: 3 });
  await client.application.commands.set([
    { name: 'config', description: `${E.config} Painel de configuração`, options: [{ name: 'ticket', type: 1, description: 'Abrir painel de config' }] },
    { name: 'enviar', description: 'Enviar painel de tickets' }
  ]);
  console.log(`${E.aceito} Comandos prontos!`);
});

// 🔐 PERMISSÕES
const eDono = id => DONOS.has(id);
const eStaff = m => eDono(m.id) || Object.values(config.supportRoles).some(r => r && m.roles.cache.has(r));

// 🎨 PAINEL DE CONFIG
const painelConfig = () => {
  const tipo = config.tipoAbertura === 'selectmenu' ? `${E.ativado} Menu` : `${E.desativado} Botões`;
  return {
    embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`${E.config} CONFIGURAÇÃO`)
      .addFields(
        { name: 'Abertura', value: tipo, inline: true },
        { name: 'Opções', value: `${config.opcoesTicket.length} opções`, inline: true },
        { name: 'Criação', value: config.criarComo === 'canal' ? '📂 Canal' : '🧵 Tópico', inline: true }
      )],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cfg_tipo').setLabel('Trocar Tipo').setEmoji('🔄').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cfg_add').setLabel('+ Opção').setEmoji('➕').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cfg_del').setLabel('- Opção').setEmoji('➖').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cfg_tipoCria').setLabel('Canal/Tópico').setEmoji('📂').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cfg_salvar').setLabel('Salvar').setEmoji(E.aceito).setStyle(ButtonStyle.Success)
    )]
  };
};

// ⚡ INTERAÇÕES
client.on(Events.InteractionCreate, async int => {
  // 🛠️ /config ticket — ABRE O PAINEL COM BOTÕES!
  if (int.isChatInputCommand()) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    
    if (int.commandName === 'config') return int.reply({ ...painelConfig(), ephemeral: false });

    // 📤 /enviar
    if (int.commandName === 'enviar') {
      const emb = new EmbedBuilder().setColor(0x5865F2).setTitle(`${E.pendente} ATENDIMENTO`).setDescription(`${E.alerta} Escolha:`);
      const comp = config.tipoAbertura === 'selectmenu' 
        ? [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('abrir_ticket').setPlaceholder(`${E.seta} Selecione...`).addOptions(config.opcoesTicket))]
        : config.opcoesTicket.map((op, i) => new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`ticket_${i}`).setLabel(`${op.emoji} ${op.label}`).setStyle(ButtonStyle.Primary)));
      await int.channel.send({ embeds: [emb], components: comp });
      return int.reply({ content: `${E.aceito} Enviado!`, ephemeral: true });
    }
  }

  // 🎯 BOTÕES DO PAINEL DE CONFIG
  if (int.isButton() && int.customId.startsWith('cfg_')) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    
    if (int.customId === 'cfg_tipo') config.tipoAbertura = config.tipoAbertura === 'selectmenu' ? 'botoes' : 'selectmenu';
    if (int.customId === 'cfg_add') config.opcoesTicket.push({ label: `Opção ${config.opcoesTicket.length+1}`, emoji: '🔹', value: `op_${Date.now()}` });
    if (int.customId === 'cfg_del' && config.opcoesTicket.length > 1) config.opcoesTicket.pop();
    if (int.customId === 'cfg_tipoCria') config.criarComo = config.criarComo === 'canal' ? 'thread' : 'canal';
    if (int.customId === 'cfg_salvar') return int.update({ content: `${E.aceito} Salvo! Use /enviar`, components: [], embeds: painelConfig().embeds });
    
    salvarConfig();
    return int.update(painelConfig());
  }

  // 🎫 CRIAR TICKET — MENU
  if (int.isStringSelectMenu() && int.customId === 'abrir_ticket') criarTicket(int, int.values[0]);
  
  // 🎫 CRIAR TICKET — BOTÃO
  if (int.isButton() && int.customId.startsWith('ticket_')) {
    const op = config.opcoesTicket[parseInt(int.customId.split('_')[1])];
    if (op) criarTicket(int, op.label);
  }

  // 📁 FECHAR TICKET
  if (int.isButton() && int.customId === 'fechar') {
    const t = db.tickets?.[int.channel.id];
    if (!t) return int.reply({ content: `${E.proibido} Não é ticket!`, ephemeral: true });
    if (!eStaff(int.member) && t.donoId !== int.user.id) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    delete db.tickets[int.channel.id]; delete db.userTickets[t.donoId]; salvarDB();
    await int.reply(`${E.arquivo} Fechando em 3s...`);
    setTimeout(() => int.channel.isThread() ? int.channel.setArchived(true) : int.channel.delete(), 3000);
  }
});

// 🎫 FUNÇÃO CRIAR TICKET
async function criarTicket(int, cat) {
  if (db.userTickets?.[int.user.id]) return int.reply({ content: `${E.warn} Já tem ticket aberto!`, ephemeral: true });
  const num = Object.keys(db.tickets||{}).length + 1;
  const nome = `ticket-${num}-${int.user.username.toLowerCase()}`;
  let canal;

  if (config.criarComo === 'canal') {
    canal = await int.guild.channels.create({
      name, type: ChannelType.GuildText, parent: config.categoriaId || null,
      permissionOverwrites: [{ id: int.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: int.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }]
    });
  } else {
    const painel = config.canalPainelId ? await int.guild.channels.fetch(config.canalPainelId) : int.channel;
    canal = await painel.threads.create({ name, type: ChannelType.PrivateThread, autoArchiveDuration: 10080 });
    await canal.members.add(int.user.id, { silent: true }).catch(() => {});
  }

  db.tickets = db.tickets || {}; db.userTickets = db.userTickets || {};
  db.tickets[canal.id] = { id: canal.id, donoId: int.user.id, numero: num };
  db.userTickets[int.user.id] = canal.id;
  salvarDB();

  const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.pendente} ATENDIMENTO`)
    .setDescription(`Bem-vindo! Motivo:\n📌 ${cat}\n${E.horario} ${new Date().toLocaleString('pt-BR')}`);
  const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar').setLabel('Finalizar').setEmoji(E.arquivo).setStyle(ButtonStyle.Danger));
  
  await canal.send({ content: `<@${int.user.id}>`, embeds: [emb], components: [btn] });
  return int.reply({ content: `${E.aceito} ${canal}`, ephemeral: true });
}

// ⌨️ .f pra fechar
client.on(Events.MessageCreate, async m => {
  if (!m.guild || m.author.bot) return;
  if (['.f', '.fechar'].includes(m.content.trim().toLowerCase())) {
    const t = db.tickets?.[m.channel.id];
    if (!t) return m.reply(`${E.proibido} Não é ticket!`);
    if (!eStaff(m.member) && t.donoId !== m.author.id) return m.reply(`${E.proibido} Sem permissão!`);
    delete db.tickets[m.channel.id]; delete db.userTickets[t.donoId]; salvarDB();
    await m.reply(`${E.arquivo} Fechando...`);
    setTimeout(() => m.channel.isThread() ? m.channel.setArchived(true) : m.channel.delete(), 3000);
  }
});

client.login(process.env.TOKEN);
