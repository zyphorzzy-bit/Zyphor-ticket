const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

const DONOS = new Set(['1527769881326522478', '1533306874513068093']);
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

const padrao = {
  tipoAbertura: 'botoes', corBotao: 'Primary', criarComo: 'canal', catId: '',
  embedTitulo: 'CENTRAL DE ATENDIMENTO',
  embedDesc: 'Selecione uma opção abaixo para abrir seu ticket.',
  embedImage: '', embedThumb: '',
  cargos: { c1: '', c2: '', c3: '' },
  opcoes: [
    { label: 'Suporte', emoji: ' <:atendimento:1536408857645940886> ', value: 'suporte' },
    { label: 'Denúncia', emoji: '🚨', value: 'denuncia' }
  ]
};
Object.entries(padrao).forEach(([k, v]) => { if (!config[k]) config[k] = v; });
salvarCfg();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

client.on('ready', async () => {
  console.log(`${E.ativado} Bot Online: ${client.user.tag}`);
  await client.application.commands.set([
    { name: 'config', description: 'Painel completo de configuração' },
    { name: 'enviar', description: 'Enviar painel de atendimento' }
  ]);
});

const eDono = id => DONOS.has(id);
const eStaff = m => eDono(m.id) || Object.values(config.cargos).some(r => r && m.roles.cache.has(r));

const painel = () => {
  const cargosTxt = Object.values(config.cargos).filter(Boolean).map(c => `<@&${c}>`).join(', ') || 'Nenhum';
  const opcoesTxt = config.opcoes.map((o, i) => `**${i + 1}.** ${o.emoji} ${o.label}`).join('\n') || 'Nenhuma';

  return {
    embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} PAINEL DE CONFIGURAÇÃO`).addFields(
      { name: `${E.id} Modo de Criação`, value: config.criarComo === 'canal' ? '📂 Canal' : '🧵 Tópico', inline: true },
      { name: `${E.alerta} Exibição`, value: config.tipoAbertura === 'selectmenu' ? `${E.ativado} Menu` : `${E.desativado} Botões`, inline: true },
      { name: `${E.edit} Cor Botão`, value: config.corBotao, inline: true },
      { name: `${E.edit} Categoria ID`, value: config.catId ? `\`${config.catId}\`` : '❌ Nenhuma', inline: false },
      { name: `${E.user} Cargos Suporte`, value: cargosTxt, inline: false },
      { name: `${E.edit} Embed Banner`, value: config.embedImage ? `[Link](${config.embedImage})` : 'Nenhum', inline: true },
      { name: `${E.edit} Embed Thumbnail`, value: config.embedThumb ? `[Link](${config.embedThumb})` : 'Nenhum', inline: true },
      { name: `${E.linkexterno} Opções do Painel`, value: opcoesTxt, inline: false }
    )],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg_criar').setLabel('Canal/Tópico').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg_tipo').setLabel('Botão/Menu').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_cor').setLabel('Cor Botões').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_add').setLabel('+ Opção').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg_del').setLabel('- Opção').setStyle(ButtonStyle.Danger)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg_embed_modal').setLabel('Editar Textos').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg_midia_modal').setLabel('Editar Fotos/Links').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg_cargo').setLabel('Comandos Cargos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_salvar').setLabel('Salvar').setStyle(ButtonStyle.Success)
      )
    ]
  };
};

client.on(Events.InteractionCreate, async int => {
  if (int.isChatInputCommand()) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    
    if (int.commandName === 'config') return int.reply({ ...painel(), ephemeral: true });

    if (int.commandName === 'enviar') {
      const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle(config.embedTitulo).setDescription(config.embedDesc);
      if (config.embedImage) emb.setImage(config.embedImage);
      if (config.embedThumb) emb.setThumbnail(config.embedThumb);

      let components = [];
      if (config.tipoAbertura === 'selectmenu') {
        const menu = new StringSelectMenuBuilder().setCustomId('menu_abrir').setPlaceholder('Selecione uma categoria...');
        config.opcoes.forEach(o => menu.addOptions({ label: o.label, emoji: o.emoji, value: o.value }));
        components.push(new ActionRowBuilder().addComponents(menu));
      } else {
        let row = new ActionRowBuilder();
        config.opcoes.forEach((o, i) => {
          if (i > 0 && i % 5 === 0) { components.push(row); row = new ActionRowBuilder(); }
          row.addComponents(new ButtonBuilder().setCustomId(`btn_${o.value}`).setLabel(o.label).setEmoji(o.emoji).setStyle(ButtonStyle[config.corBotao] || ButtonStyle.Primary));
        });
        if (row.components.length > 0) components.push(row);
      }

      await int.channel.send({ embeds: [emb], components });
      return int.reply({ content: `${E.ativado} Painel enviado!`, ephemeral: true });
    }
  }

  // Abertura de Modais de Edição no /config
  if (int.isButton() && int.customId.startsWith('cfg_')) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });

    if (int.customId === 'cfg_embed_modal') {
      const modal = new ModalBuilder().setCustomId('modal_embed_textos').setTitle('Editar Embed (Textos)');
      const inTitulo = new TextInputBuilder().setCustomId('input_titulo').setLabel('Título da Embed').setStyle(TextInputStyle.Short).setValue(config.embedTitulo).setRequired(true);
      const inDesc = new TextInputBuilder().setCustomId('input_desc').setLabel('Descrição da Embed').setStyle(TextInputStyle.Paragraph).setValue(config.embedDesc).setRequired(true);
      
      modal.addComponents(new ActionRowBuilder().addComponents(inTitulo), new ActionRowBuilder().addComponents(inDesc));
      return int.showModal(modal);
    }

    if (int.customId === 'cfg_midia_modal') {
      const modal = new ModalBuilder().setCustomId('modal_embed_midia').setTitle('Editar Embed (Imagens/Banner)');
      const inBanner = new TextInputBuilder().setCustomId('input_banner').setLabel('URL da Foto/Banner').setStyle(TextInputStyle.Short).setValue(config.embedImage || '').setRequired(false);
      const inThumb = new TextInputBuilder().setCustomId('input_thumb').setLabel('URL da Thumbnail (Miniatura)').setStyle(TextInputStyle.Short).setValue(config.embedThumb || '').setRequired(false);
      
      modal.addComponents(new ActionRowBuilder().addComponents(inBanner), new ActionRowBuilder().addComponents(inThumb));
      return int.showModal(modal);
    }

    if (int.customId === 'cfg_criar') config.criarComo = config.criarComo === 'canal' ? 'thread' : 'canal';
    if (int.customId === 'cfg_tipo') config.tipoAbertura = config.tipoAbertura === 'selectmenu' ? 'botoes' : 'selectmenu';
    if (int.customId === 'cfg_cor') {
      const cores = ['Primary', 'Success', 'Danger', 'Secondary'];
      config.corBotao = cores[(cores.indexOf(config.corBotao) + 1) % cores.length];
    }
    if (int.customId === 'cfg_add') config.opcoes.push({ label: 'Novo Atendimento', emoji: '❓', value: `op_${Date.now().toString().slice(-4)}` });
    if (int.customId === 'cfg_del' && config.opcoes.length > 1) config.opcoes.pop();
    if (int.customId === 'cfg_cargo') return int.reply({ content: `${E.alerta} Use no chat:\n\`!cargo1 @Cargo\`\n\`!cargo2 @Cargo\`\n\`!cargo3 @Cargo\``, ephemeral: true });
    
    if (int.customId === 'cfg_salvar') { 
      salvarCfg(); 
      return int.update({ content: `${E.ativado} Configurações salvas!`, embeds: [], components: [] }); 
    }

    salvarCfg();
    return int.update(painel());
  }

  // Recebimento das respostas do Modal
  if (int.isModalSubmit()) {
    if (int.customId === 'modal_embed_textos') {
      config.embedTitulo = int.fields.getTextInputValue('input_titulo');
      config.embedDesc = int.fields.getTextInputValue('input_desc');
      salvarCfg();
      return int.update(painel());
    }

    if (int.customId === 'modal_embed_midia') {
      config.embedImage = int.fields.getTextInputValue('input_banner');
      config.embedThumb = int.fields.getTextInputValue('input_thumb');
      salvarCfg();
      return int.update(painel());
    }
  }

  // Sistema de criação de Ticket
  if ((int.isStringSelectMenu() && int.customId === 'menu_abrir') || (int.isButton() && int.customId.startsWith('btn_'))) {
    const valor = int.isStringSelectMenu() ? int.values[0] : int.customId.replace('btn_', '');
    db.userTickets = db.userTickets || {}; db.tickets = db.tickets || {};

    if (db.userTickets[int.user.id]) return int.reply({ content: `${E.alerta} Você já possui um ticket aberto: <#${db.userTickets[int.user.id]}>`, ephemeral: true });

    const op = config.opcoes.find(o => o.value === valor);
    const catNome = (op?.label || 'atendimento').toLowerCase().replace(/[^a-z0-9]/g, '');
    const name = `🎫-${catNome}-${int.user.username}`;
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
      }

      db.tickets[canal.id] = { id: canal.id, dono: int.user.id };
      db.userTickets[int.user.id] = canal.id;
      salvarDB();

      const cargosMencoes = Object.values(config.cargos).filter(Boolean).map(c => `<@&${c}>`).join(' ');
      const mencaoInicial = `<@${int.user.id}> ${cargosMencoes}`.trim();

      const emb = new EmbedBuilder().setColor(0x2b2d31).setTitle(`${E.config} ATENDIMENTO - ${op?.label || 'Geral'}`).setDescription(`${E.user} Usuário: <@${int.user.id}>\n\nDescreva seu problema com detalhes.`).setTimestamp();
      if (config.embedThumb) emb.setThumbnail(config.embedThumb);

      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('atender_ticket').setLabel('Assumir').setEmoji(E.atender).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setEmoji(E.fechar).setStyle(ButtonStyle.Danger)
      );

      await canal.send({ content: mencaoInicial, embeds: [emb], components: [btnRow] });
      return int.reply({ content: `${E.ativado} Ticket criado: ${canal}`, ephemeral: true });
    } catch (err) {
      console.error(err);
      return int.reply({ content: `${E.proibido} Erro ao criar o ticket! Verifique as permissões do bot.`, ephemeral: true });
    }
  }

  if (int.isButton() && int.customId === 'atender_ticket') {
    if (!eStaff(int.member)) return int.reply({ content: `${E.proibido} Apenas membros da equipe podem assumir tickets!`, ephemeral: true });
    await int.reply({ content: `${E.atender} O atendente <@${int.user.id}> assumiu este ticket!` });
  }

  if (int.isButton() && int.customId === 'fechar_ticket') {
    const t = db.tickets?.[int.channel.id];
    if (!t) return int.reply({ content: `${E.alerta} Não é um ticket.`, ephemeral: true });
    if (!eStaff(int.member) && t.dono !== int.user.id) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });
    delete db.tickets[int.channel.id]; delete db.userTickets[t.dono]; salvarDB();
    await int.reply(`${E.fechar} Encerrando atendimento...`);
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
    await m.reply(`${E.fechar} Encerrando atendimento...`);
    setTimeout(() => m.channel.isThread() ? m.channel.setArchived(true) : m.channel.delete(), 1500);
  }

  if (cmd === '.not') {
    if (!eStaff(m.member)) return;
    const t = db.tickets?.[m.channel.id];
    if (!t) return m.reply(`${E.alerta} Este canal não é um ticket.`);
    return m.channel.send(`${E.alerta} <@${t.dono}>, você recebeu uma nova resposta da equipe!`);
  }

  if (cmd === '.nm') {
    if (!eStaff(m.member)) return;
    const t = db.tickets?.[m.channel.id];
    if (!t) return m.reply(`${E.alerta} Este canal não é um ticket.`);
    
    const textoEntrada = args.join('-').toLowerCase();
    if (!textoEntrada) return m.reply(`${E.alerta} Digite o novo nome do ticket! Exemplo: \`.nm suporte silva\``);

    const novoNome = `🎫-${textoEntrada}`;
    try {
      await m.channel.setName(novoNome);
      return m.reply(`${E.edit} Nome do ticket alterado para **${m.channel.name}** com sucesso!`);
    } catch (err) {
      return m.reply(`${E.proibido} Erro ao renomear o canal! Verifique as permissões do bot.`);
    }
  }

  if (!eDono(m.author.id)) return;

  if (['!cargo1', '!cargo2', '!cargo3'].includes(cmd)) {
    const r = m.mentions.roles.first(); if (!r) return m.reply(`${E.alerta} Mencione um cargo válido.`);
    config.cargos[`c${cmd.slice(-1)}`] = r.id; salvarCfg();
    return m.reply(`${E.ativado} Cargo ${cmd.slice(-1)} configurado: ${r}`);
  }

  if (cmd === '!setcat') {
    config.catId = args[0] ? args[0].replace(/\D/g, '') : m.channel.parentId;
    salvarCfg();
    return m.reply(`${E.ativado} Categoria configurada: \`${config.catId || 'Nenhuma (Cria solto)'}\``);
  }

  if (cmd === '!editar') {
    const idx = parseInt(args[0]) - 1;
    const nome = args.slice(1).join(' ');
    if (isNaN(idx) || !config.opcoes[idx] || !nome) return m.reply(`${E.alerta} Uso correto: \`!editar 1 Novo Nome\``);
    config.opcoes[idx].label = nome;
    salvarCfg();
    return m.reply(`${E.edit} Opção ${idx + 1} alterada para: **${nome}**`);
  }
});

client.login(process.env.TOKEN);
