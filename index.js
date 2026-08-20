const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

// 🔒 DONOS
const DONOS = new Set(['1527769881326522478', '1533306874513068093']);

// 😼 EMOJIS
const E = {
  edit: '<:edit:1534611988624310272>', ativado: '<a:ativado:1534611985260609607>',
  config: '<:config:1534611990633250937>', proibido: '<:Proibido:1534611991929290877>',
  linkexterno: '<:linkexterno:1539124690709385330>', desativado: '<a:desativado:1534611986539876463>',
  alerta: '<:alerta:1534611993410015456>', user: '<:user:1539125800907968603>'
};

// 📁 BANCO DE DADOS
let config = fs.existsSync('./config.json') ? JSON.parse(fs.readFileSync('./config.json')) : {};
let db = fs.existsSync('./database.json') ? JSON.parse(fs.readFileSync('./database.json')) : {};

const salvarCfg = () => fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
const salvarDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

// PADRÃO DE CONFIGURAÇÃO
const padrao = {
  tipoAbertura: 'botoes', 
  corBotao: 'Primary', 
  criarComo: 'canal',
  cargos: { c1: '', c2: '', c3: '' },
  cats: { suporte: '', denuncia: '', parceria: '', sorteio: '' },
  opcoes: [
    { label: 'Suporte', emoji: '❓', value: 'suporte', cat: 'suporte' },
    { label: 'Denúncia', emoji: '🚨', value: 'denuncia', cat: 'denuncia' },
    { label: 'Parceria', emoji: '🤝', value: 'parceria', cat: 'parceria' },
    { label: 'Sorteio', emoji: '🎁', value: 'sorteio', cat: 'sorteio' }
  ]
};

Object.entries(padrao).forEach(([k, v]) => { if (!config[k]) config[k] = v; });
salvarCfg();

// 🤖 BOT
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ] 
});

// ✅ ONLINE
client.on('ready', async () => {
  console.log(`${E.ativado} Bot Online: ${client.user.tag}`);
  await client.application.commands.set([
    { name: 'config', description: 'Configurar painel de tickets' },
    { name: 'enviar', description: 'Enviar painel de atendimento no canal' }
  ]);
});

// 🔐 HELPER FUNCTIONS
const eDono = id => DONOS.has(id);
const eStaff = m => eDono(m.id) || Object.values(config.cargos).some(r => r && m.roles.cache.has(r));
const corBtn = c => ButtonStyle[c] || ButtonStyle.Primary;

// 🎨 PAINEL DE CONFIGURAÇÃO
const painel = () => {
  const tipo = config.tipoAbertura === 'selectmenu' ? `Menu Seleção` : `Botões`;
  const criacao = config.criarComo === 'canal' ? '📂 Canal' : '🧵 Tópico';
  const cor = { Primary: '🔵 Azul', Success: '🟢 Verde', Danger: '🔴 Vermelho', Secondary: '⚫ Cinza' }[config.corBotao];
  
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`${E.config} PAINEL DE CONFIGURAÇÃO`)
        .addFields(
          { name: 'Modo de Criação', value: criacao, inline: true },
          { name: 'Tipo de Exibição', value: tipo, inline: true },
          { name: 'Cor dos Botões', value: cor, inline: true },
          { name: 'Cargo 1', value: config.cargos.c1 ? `<@&${config.cargos.c1}>` : '❌ Não definido', inline: true },
          { name: 'Cargo 2', value: config.cargos.c2 ? `<@&${config.cargos.c2}>` : '❌ Não definido', inline: true },
          { name: 'Cargo 3', value: config.cargos.c3 ? `<@&${config.cargos.c3}>` : '❌ Não definido', inline: true },
          { name: 'Opções Cadastradas', value: config.opcoes.map((o, i) => `**${i + 1}.** ${o.emoji} ${o.label} (ID: \`${o.value}\`)`).join('\n') || 'Nenhuma', inline: false }
        )
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg_criar').setLabel('Tipo (Canal/Thread)').setEmoji('📂').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg_tipo').setLabel('Modo (Botão/Menu)').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_cor').setLabel('Cor Botão').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_add').setLabel('Nova Opção').setEmoji('➕').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg_del').setLabel('Remover Opção').setEmoji('➖').setStyle(ButtonStyle.Danger)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg_cargo').setLabel('Ajuda Cargos').setEmoji('👤').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_cat').setLabel('Ajuda Categoria').setEmoji('📁').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_salvar').setLabel('Salvar e Fechar').setEmoji('💾').setStyle(ButtonStyle.Success)
      )
    ]
  };
};

// ⚡ TRATAMENTO DE INTERAÇÕES
client.on(Events.InteractionCreate, async int => {

  // 1️⃣ COMANDOS SLASH (/config e /enviar)
  if (int.isChatInputCommand()) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Você não tem permissão para usar este comando!`, ephemeral: true });

    if (int.commandName === 'config') {
      return int.reply({ ...painel(), ephemeral: true });
    }

    if (int.commandName === 'enviar') {
      const emb = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle('🎫 CENTRAL DE ATENDIMENTO')
        .setDescription('Clique no botão correspondente abaixo ou selecione no menu para abrir um ticket.');

      let components = [];

      if (config.tipoAbertura === 'selectmenu') {
        const select = new StringSelectMenuBuilder()
          .setCustomId('menu_abrir')
          .setPlaceholder('Selecione uma categoria de atendimento...')
          .addOptions(config.opcoes.map(op => ({
            label: op.label,
            emoji: op.emoji,
            value: op.value
          })));

        components.push(new ActionRowBuilder().addComponents(select));
      } else {
        let row = new ActionRowBuilder();
        config.opcoes.forEach((op, index) => {
          if (index > 0 && index % 5 === 0) {
            components.push(row);
            row = new ActionRowBuilder();
          }
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`btn_${op.value}`)
              .setLabel(op.label)
              .setEmoji(op.emoji)
              .setStyle(corBtn(config.corBotao))
          );
        });
        if (row.components.length > 0) components.push(row);
      }

      await int.channel.send({ embeds: [emb], components });
      return int.reply({ content: '✅ Painel de atendimento enviado!', ephemeral: true });
    }
  }

  // 2️⃣ BOTOES DO PAINEL DE CONFIGURAÇÃO
  if (int.isButton() && int.customId.startsWith('cfg_')) {
    if (!eDono(int.user.id)) return int.reply({ content: `${E.proibido} Sem permissão!`, ephemeral: true });

    if (int.customId === 'cfg_criar') config.criarComo = config.criarComo === 'canal' ? 'thread' : 'canal';
    if (int.customId === 'cfg_tipo') config.tipoAbertura = config.tipoAbertura === 'selectmenu' ? 'botoes' : 'selectmenu';
    if (int.customId === 'cfg_cor') {
      const cores = ['Primary', 'Success', 'Danger', 'Secondary'];
      config.corBotao = cores[(cores.indexOf(config.corBotao) + 1) % cores.length];
    }
    if (int.customId === 'cfg_add') {
      const idUnica = `op_${Date.now().toString().slice(-4)}`;
      config.opcoes.push({ label: 'Novo Atendimento', emoji: '❓', value: idUnica, cat: 'suporte' });
    }
    if (int.customId === 'cfg_del' && config.opcoes.length > 1) {
      config.opcoes.pop();
    }
    if (int.customId === 'cfg_cargo') return int.reply({ content: 'Use os comandos no chat:\n`!cargo1 @Cargo`\n`!cargo2 @Cargo`\n`!cargo3 @Cargo`', ephemeral: true });
    if (int.customId === 'cfg_cat') return int.reply({ content: 'Use o comando no chat:\n`!setcat suporte #canal-ou-categoria`', ephemeral: true });
    if (int.customId === 'cfg_salvar') {
      salvarCfg();
      return int.update({ content: '✅ Configurações salvas!', embeds: [], components: [] });
    }

    salvarCfg();
    return int.update(painel());
  }

  // 3️⃣ ABRIR TICKET (VIA BOTÃO OU MENU)
  if ((int.isStringSelectMenu() && int.customId === 'menu_abrir') || (int.isButton() && int.customId.startsWith('btn_'))) {
    const valor = int.isStringSelectMenu() ? int.values[0] : int.customId.replace('btn_', '');
    
    db.userTickets = db.userTickets || {};
    db.tickets = db.tickets || {};

    if (db.userTickets[int.user.id]) {
      return int.reply({ content: `${E.alerta} Você já possui um ticket aberto: <#${db.userTickets[int.user.id]}>`, ephemeral: true });
    }

    const op = config.opcoes.find(o => o.value === valor);
    const catId = config.cats[op?.cat] || null;
    const num = Object.keys(db.tickets).length + 1;
    const nome = `ticket-${num}-${int.user.username}`;
    let canal;

    try {
      if (config.criarComo === 'canal') {
        const permissionOverwrites = [
          { id: int.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: int.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] }
        ];

        Object.values(config.cargos).forEach(rId => {
          if (rId) permissionOverwrites.push({ id: rId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        });

        canal = await int.guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: catId,
          permissionOverwrites
        });
      } else {
        canal = await int.channel.threads.create({
          name,
          type: ChannelType.PrivateThread,
          autoArchiveDuration: 10080
        });
        await canal.members.add(int.user.id).catch(() => {});
      }

      db.tickets[canal.id] = { id: canal.id, dono: int.user.id, categoria: op?.label || 'Atendimento' };
      db.userTickets[int.user.id] = canal.id;
      salvarDB();

      const emb = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`🎫 ATENDIMENTO - ${op?.label || 'Geral'}`)
        .setDescription(`Olá <@${int.user.id}>, aguarde o atendimento da equipe.\nDescreva o seu problema detalhadamente.`);

      const btnFechar = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
      );

      await canal.send({ content: `<@${int.user.id}>`, embeds: [emb], components: [btnFechar] });
      return int.reply({ content: `✅ Ticket criado com sucesso: ${canal}`, ephemeral: true });

    } catch (err) {
      console.error(err);
      return int.reply({ content: `❌ Erro ao criar ticket. Verifique as permissões de criação de canais/tópicos do bot.`, ephemeral: true });
    }
  }

  // 4️⃣ FECHAR TICKET
  if (int.isButton() && int.customId === 'fechar_ticket') {
    const t = db.tickets?.[int.channel.id];
    if (!t) return int.reply({ content: 'Este canal não é um ticket registrado.', ephemeral: true });
    if (!eStaff(int.member) && t.dono !== int.user.id) return int.reply({ content: `${E.proibido} Permissão negada.`, ephemeral: true });

    delete db.tickets[int.channel.id];
    delete db.userTickets[t.dono];
    salvarDB();

    await int.reply('🔒 Encerrando o ticket em instantes...');
    setTimeout(async () => {
      try {
        if (int.channel.isThread()) {
          await int.channel.setArchived(true);
        } else {
          await int.channel.delete();
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);
  }
});

// ⌨️ COMANDOS DE PREFIXO PARA CONFIGURAÇÃO
client.on(Events.MessageCreate, async m => {
  if (!m.guild || m.author.bot || !eDono(m.author.id)) return;

  if (m.content.startsWith('!cargo1')) {
    const r = m.mentions.roles.first();
    if (!r) return m.reply('Mencione um cargo válido.');
    config.cargos.c1 = r.id; salvarCfg();
    return m.reply(`✅ Cargo 1 alterado para: ${r}`);
  }

  if (m.content.startsWith('!cargo2')) {
    const r = m.mentions.roles.first();
    if (!r) return m.reply('Mencione um cargo válido.');
    config.cargos.c2 = r.id; salvarCfg();
    return m.reply(`✅ Cargo 2 alterado para: ${r}`);
  }

  if (m.content.startsWith('!cargo3')) {
    const r = m.mentions.roles.first();
    if (!r) return m.reply('Mencione um cargo válido.');
    config.cargos.c3 = r.id; salvarCfg();
    return m.reply(`✅ Cargo 3 alterado para: ${r}`);
  }

  if (m.content.startsWith('!setcat')) {
    const [, cat] = m.content.split(' ');
    const ch = m.mentions.channels.first();
    if (!ch || !config.cats.hasOwnProperty(cat)) return m.reply('Uso correto: `!setcat suporte #canal`');
    config.cats[cat] = ch.id; salvarCfg();
    return m.reply(`✅ Categoria \`${cat}\` vinculada ao canal: ${ch}`);
  }

  if (m.content.startsWith('!editar')) {
    const p = m.content.split(' ');
    const idx = parseInt(p[1]) - 1;
    const nome = p.slice(2).join(' ');
    if (isNaN(idx) || !config.opcoes[idx] || !nome) return m.reply('Uso correto: `!editar 1 Novo Nome`');
    config.opcoes[idx].label = nome;
    salvarCfg();
    return m.reply(`✅ Opção ${idx + 1} alterada para: **${nome}**`);
  }
});

client.login(process.env.TOKEN);
