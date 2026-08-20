const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

// 🔒 DONOS
const DONOS = new Set(['1527769881326522478', '1533306874513068093']);

// 😼 EMOJIS PERSONALIZADOS
const E = {
  edit: '<:edit:1534611988624310272>',
  id: '<:ID:1534611999085039786>',
  horario: '<:horrio:1534611997335883886>',
  ativado: '<a:ativado:1534611985260609607>',
  config: '<:config:1534611990633250937>',
  proibido: '<:Proibido:1534611991929290877>',
  linkexterno: '<:linkexterno:1539124690709385330>',
  desativado: '<a:desativado:1534611986539876463>',
  alerta: '<:alerta:1534611993410015456>',
  user: '<:user:1539125800907968603>'
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
  const tipo = config.tipoAbertura === 'selectmenu' ? `${E.ativado} Menu Seleção` : `${E.desativado} Botões`;
  const criacao = config.criarComo === 'canal' ? '📂 Canal' : '🧵 Tópico';
  const cor = { Primary: '🔵 Azul', Success: '🟢 Verde', Danger: '🔴 Vermelho', Secondary: '⚫ Cinza' }[config.corBotao];
  
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`${E.config} CENTRAL DE CONFIGURAÇÃO`)
        .addFields(
          { name: `${E.id} Modo de Criação`, value: criacao, inline: true },
          { name: `${E.alerta} Tipo de Exibição`, value: tipo, inline: true },
          { name: `${E.edit} Cor dos Botões`, value: cor, inline: true },
          { name: `${E.user} Cargo 1`, value: config.cargos.c1 ? `<@&${config.cargos.c1}>` : '❌ Não definido', inline: true },
          { name: `${E.user} Cargo 2`, value: config.cargos.c2 ? `<@&${config.cargos.c2}>` : '❌ Não definido', inline: true },
          { name: `${E.user} Cargo 3`, value: config.cargos.c3 ? `<@&${config.cargos.c3}>` : '❌ Não definido', inline: true },
          { name: `${E.linkexterno} Opções Cadastradas`, value: config.opcoes.map((o, i) => `**${i + 1}.** ${o.emoji} ${o.label} (ID: \`${o.value}\`)`).join('\n') || 'Nenhuma', inline: false }
        )
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg_criar').setLabel('Tipo (Canal/Thread)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg_tipo').setLabel('Modo (Botão/Menu)').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_cor').setLabel('Cor Botão').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_add').setLabel('Nova Opção').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg_del').setLabel('Remover Opção').setStyle(ButtonStyle.Danger)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg_cargo').setLabel('Ajuda Cargos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_cat').setLabel('Ajuda Categoria').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg_salvar').setLabel('Salvar e Fechar').setStyle(ButtonStyle.Success)
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
        .setTitle(`${E.config} CENTRAL DE ATENDIMENTO`)
        .setDescription('Selecione uma opção abaixo para iniciar seu atendimento.');

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
      return int.reply({ content: `${E.ativado} Painel enviado com sucesso!`, ephemeral: true });
    }
  }

  // 2️⃣ BOTÕES DO PAINEL DE CONFIGURAÇÃO
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
    if (int.customId === 'cfg_cargo') return int.reply({ content: `${E.alerta} Use no chat:\n\`!cargo1 @Cargo\`\n\`!cargo2 @Cargo\`\n\`!cargo3 @Cargo\``, ephemeral: true });
    if (int.customId === 'cfg_cat') return int.reply({ content: `${E.alerta} Use no chat:\n\`!setcat suporte ID_DA_CATEGORIA\``, ephemeral: true });
    if (int.customId === 'cfg_salvar') {
      salvarCfg();
      return int.update({ content: `${E.ativado} Configurações salvas!`, embeds: [], components: [] });
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
    
    // Tratamento e limpeza da ID da categoria
    let catId = config.cats[op?.cat] || null;
    if (catId) {
      catId = catId.replace(/\D/g, '');
      if (!catId) catId = null;
    }

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
          if (rId && rId.trim() !== '') {
            const cleanRoleId = rId.replace(/\D/g, '');
            if (cleanRoleId) {
              permissionOverwrites.push({ id: cleanRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
            }
          }
        });

        const channelData = {
          name,
          type: ChannelType.GuildText,
          permissionOverwrites
        };

        if (catId) channelData.parent = catId;

        canal = await int.guild.channels.create(channelData);
      } else {
        // Tópicos só podem ser criados em canais de texto
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
        .setTitle(`${E.config} ATENDIMENTO - ${op?.label || 'Geral'}`)
        .setDescription(`${E.user} Usuário: <@${int.user.id}>\n${E.id} Ticket ID: \`${canal.id}\`\n\nDescreva seu problema com detalhes e aguarde o suporte.`)
        .setFooter({ text: `Aberto em` })
        .setTimestamp();

      const btnFechar = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
      );

      await canal.send({ content: `<@${int.user.id}>`, embeds: [emb], components: [btnFechar] });
      return int.reply({ content: `${E.ativado} Ticket criado: ${canal}`, ephemeral: true });

    } catch (err) {
      console.error('ERRO DETALHADO:', err);
      return int.reply({ content: `${E.proibido} Erro ao criar o ticket! Verifique se a ID informada em \`!setcat\` é o ID de uma **Categoria** (e não de um canal comum).`, ephemeral: true });
    }
  }

  // 4️⃣ FECHAR TICKET
  if (int.isButton() && int.customId === 'fechar_ticket') {
    const t = db.tickets?.[int.channel.id];
    if (!t) return int.reply({ content: `${E.alerta} Este canal não é um ticket registrado.`, ephemeral: true });
    if (!eStaff(int.member) && t.dono !== int.user.id) return int.reply({ content: `${E.proibido} Você não tem permissão para fechar este ticket!`, ephemeral: true });

    delete db.tickets[int.channel.id];
    delete db.userTickets[t.dono];
    salvarDB();

    await int.reply(`${E.ativado} Encerrando o ticket em instantes...`);
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

// ⌨️ COMANDOS DE PREFIXO PARA MENSAGENS E CONFIGURAÇÃO
client.on(Events.MessageCreate, async m => {
  if (!m.guild || m.author.bot) return;

  const args = m.content.trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (['.f', '.fechar'].includes(cmd)) {
    const t = db.tickets?.[m.channel.id];
    if (!t) return m.reply(`${E.alerta} Este canal não é um ticket registrado.`);
    if (!eStaff(m.member) && t.dono !== m.author.id) return m.reply(`${E.proibido} Sem permissão para fechar este ticket!`);

    delete db.tickets[m.channel.id];
    delete db.userTickets[t.dono];
    salvarDB();

    await m.reply(`${E.ativado} Encerrando o ticket...`);
    setTimeout(() => m.channel.isThread() ? m.channel.setArchived(true) : m.channel.delete(), 1500);
  }

  if (cmd === '.not') {
    if (!eStaff(m.member)) return;
    const t = db.tickets?.[m.channel.id];
    if (!t) return m.reply(`${E.alerta} Este canal não é um ticket.`);
    return m.channel.send({ content: `${E.alerta} <@${t.dono}>, você tem uma nova resposta no seu ticket!` });
  }

  if (cmd === '.nm') {
    if (!eStaff(m.member)) return;
    return m.channel.send({ content: `${E.horario} Por favor, aguarde o atendimento da equipe sem enviar mensagens repetidas.` });
  }

  if (!eDono(m.author.id)) return;

  if (cmd === '!cargo1') {
    const r = m.mentions.roles.first();
    if (!r) return m.reply(`${E.alerta} Mencione um cargo válido.`);
    config.cargos.c1 = r.id; salvarCfg();
    return m.reply(`${E.ativado} Cargo 1 configurado: ${r}`);
  }

  if (cmd === '!cargo2') {
    const r = m.mentions.roles.first();
    if (!r) return m.reply(`${E.alerta} Mencione um cargo válido.`);
    config.cargos.c2 = r.id; salvarCfg();
    return m.reply(`${E.ativado} Cargo 2 configurado: ${r}`);
  }

  if (cmd === '!cargo3') {
    const r = m.mentions.roles.first();
    if (!r) return m.reply(`${E.alerta} Mencione um cargo válido.`);
    config.cargos.c3 = r.id; salvarCfg();
    return m.reply(`${E.ativado} Cargo 3 configurado: ${r}`);
  }

  if (cmd === '!setcat') {
    const cat = args[0];
    const catId = args[1];
    if (!cat || !config.cats.hasOwnProperty(cat)) return m.reply(`${E.alerta} Uso correto: \`!setcat suporte ID_DA_CATEGORIA\``);
    config.cats[cat] = catId || m.channel.parentId;
    salvarCfg();
    return m.reply(`${E.ativado} Categoria \`${cat}\` configurada!`);
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
