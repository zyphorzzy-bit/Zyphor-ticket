const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  ChannelType, 
  PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Arquivo de configuração
const CONFIG_FILE = './config.json';
let config = {
  categoria: null,
  cargos: { cargo1: null, cargo2: null, cargo3: null, cargo4: null },
  embedTitle: "Atendimento Zyphor",
  embedDesc: "Selecione a opção abaixo para abrir um ticket.",
  embedBanner: null,
  embedThumb: null
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (err) {
    console.error("Erro ao carregar config.json:", err);
  }
}

function salvarConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// =========================================================
// 🎯 EMOJIS PERSONALIZADOS CONFIGURADOS
// =========================================================
const E = {
  aceito: "<:aceito:1539124707222093915>",
  pendente: "<:pendente:1539124705167147059>",
  recusado: "<:recusado:1539124703992614912>",
  horario: "<:horrio:1534611997335883886>",
  id: "<:ID:1534611999085039786>",
  user: "<:user:1539125800907968603>",
  proibido: "<:Proibido:1534611991929290877>",
  protecao: "<:proteo:1534611994353602732>",
  warn: "<:warn:1539125781320433724>",
  alerta: "<:alerta:1534611993410015456>",
  arquivo: "<:arquivo:1539124693460713552>",
  aceitar: "<:aceitar:1539124696912756767>",
  recusar: "<:recusar:1539124698338566257>",
  link: "<:linkexterno:1539124690709385330>",
  config: "<:config:1534611990633250937>",
  ativado: "<a:ativado:1534611985260609607>",
  desativado: "<a:desativado:1534611986539876463>",
  loading: "<a:loanding:1534612861211377868>",
  seta: "<:seta:1539785898693234700>",
  pingBom: "<a:pingbom:1539786201551077386>",
  pingRuim: "<a:pingruim:1539786202822217731>"
};

// IDs numéricos para Botões e Select Menu
const EMOJI_IDS = {
  aceitar: "1539124696912756767",
  recusar: "1539124698338566257",
  arquivo: "1539124693460713552",
  config: "1534611990633250937"
};

client.once('ready', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// Comandos de Configuração por Prefixo
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  const args = message.content.split(' ');
  const cmd = args[0].toLowerCase();

  if (cmd === '!setup') {
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`${E.arquivo} ${config.embedTitle}`)
      .setDescription(`${config.embedDesc}`);

    if (config.embedBanner) embed.setImage(config.embedBanner);
    if (config.embedThumb) embed.setThumbnail(config.embedThumb);

    const select = new StringSelectMenuBuilder()
      .setCustomId('abrir_ticket_menu')
      .setPlaceholder('Selecione uma categoria para atendimento...')
      .addOptions([
        { label: 'Suporte Geral', value: 'geral', description: 'Atendimento e dúvidas gerais', emoji: EMOJI_IDS.config },
        { label: 'Financeiro / Compras', value: 'financeiro', description: 'Assuntos sobre pagamentos', emoji: EMOJI_IDS.aceitar },
        { label: 'Denúncias', value: 'denuncia', description: 'Denunciar infrações', emoji: EMOJI_IDS.recusar }
      ]);

    const row = new ActionRowBuilder().addComponents(select);

    await message.channel.send({ embeds: [embed], components: [row] });
    return message.reply(`${E.aceito} Painel de tickets enviado com sucesso!`);
  }

  if (cmd === '!categoria') {
    const catId = args[1];
    if (!catId) return message.reply(`${E.warn} Informe o ID da categoria. Ex: \`!categoria 123456789\``);
    config.categoria = catId;
    salvarConfig();
    return message.reply(`${E.aceito} Categoria de tickets salva: <#${catId}>`);
  }

  if (['!cargo1', '!cargo2', '!cargo3', '!cargo4'].includes(cmd)) {
    const num = cmd.replace('!cargo', '');
    const cargo = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
    if (!cargo) return message.reply(`${E.warn} Marque ou informe o ID do cargo. Ex: \`${cmd} @Suporte\``);
    config.cargos[`cargo${num}`] = cargo.id;
    salvarConfig();
    return message.reply(`${E.aceito} Cargo ${num} configurado para: ${cargo}`);
  }
});

// Manipulação de Interações (Menu Select e Botões)
client.on('interactionCreate', async (int) => {
  if (int.isStringSelectMenu() && int.customId === 'abrir_ticket_menu') {
    const guild = int.guild;

    const canalExistente = guild.channels.cache.find(c => c.name === `ticket-${int.user.username.toLowerCase()}`);
    if (canalExistente) {
      return int.reply({ content: `${E.proibido} Você já possui um ticket aberto em ${canalExistente}!`, ephemeral: true });
    }

    await int.deferReply({ ephemeral: true });

    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: int.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ];

    const cargosMencao = [];
    Object.values(config.cargos).forEach(cargoId => {
      if (cargoId && guild.roles.cache.has(cargoId)) {
        permissionOverwrites.push({
          id: cargoId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory
          ]
        });
        cargosMencao.push(`<@&${cargoId}>`);
      }
    });

    const canal = await guild.channels.create({
      name: `ticket-${int.user.username}`,
      type: ChannelType.GuildText,
      parent: config.categoria || null,
      permissionOverwrites
    });

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`${E.arquivo} ATENDIMENTO INICIADO`)
      .setDescription(
        `${E.seta} Olá <@${int.user.id}>, bem-vindo ao seu ticket!\n\n` +
        `${E.user} **Usuário:** <@${int.user.id}>\n` +
        `${E.id} **ID do Usuário:** \`${int.user.id}\`\n\n` +
        `${E.alerta} Por favor, descreva detalhadamente seu problema para a equipe.`
      )
      .setTimestamp();

    if (config.embedThumb) embed.setThumbnail(config.embedThumb);

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('atender_ticket')
        .setLabel('Assumir Ticket')
        .setEmoji(EMOJI_IDS.aceitar)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('fechar_ticket')
        .setLabel('Fechar Ticket')
        .setEmoji(EMOJI_IDS.recusar)
        .setStyle(ButtonStyle.Danger)
    );

    // MENSAGEM DO TICKET (Força o Ping no Usuário e nos Cargos):
    const listaPings = [`<@${int.user.id}>`, ...cargosMencao].join(' ');
    await canal.send({
      content: `👋 ${listaPings}`,
      embeds: [embed],
      components: [botoes]
    });

    await int.editReply({ content: `${E.aceito} Seu ticket foi criado com sucesso em: ${canal}` });
  }

  // Ação do Botão Assumir Ticket
  if (int.isButton() && int.customId === 'atender_ticket') {
    const embedAtendido = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`${E.aceito} O atendimento deste ticket foi assumido por ${int.user}.`);

    await int.reply({ embeds: [embedAtendido] });
  }

  // Ação do Botão Fechar Ticket
  if (int.isButton() && int.customId === 'fechar_ticket') {
    await int.reply(`${E.loading} O ticket será fechado e apagado em 5 segundos...`);
    setTimeout(async () => {
      try {
        await int.channel.delete();
      } catch (e) {
        console.error("Erro ao deletar canal:", e);
      }
    }, 5000);
  }
});

client.login(process.env.TOKEN);
