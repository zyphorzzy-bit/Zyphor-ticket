const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");
require("dotenv").config();

// ==============================
// DONOS
// ==============================

const DONOS = new Set([
  "1527769881326522478",
  "1533306874513068093"
]);

// ==============================
// BANCO
// ==============================

function carregar(nome) {
  try {
    if (!fs.existsSync(nome)) {
      fs.writeFileSync(nome, "{}");
      return {};
    }

    return JSON.parse(fs.readFileSync(nome, "utf8"));
  } catch {
    return {};
  }
}

const config = carregar("./config.json");
const db = carregar("./database.json");

config.tipo ??= "botoes";
config.cor ??= "Primary";

config.cargos ??= {
  c1: "",
  c2: "",
  c3: ""
};

config.categorias ??= {
  suporte: "",
  denuncia: "",
  parceria: "",
  sorteio: ""
};

config.opcoes ??= [
  {
    label: "Suporte",
    emoji: "❓",
    value: "suporte",
    categoria: "suporte"
  },
  {
    label: "Denúncia",
    emoji: "🚨",
    value: "denuncia",
    categoria: "denuncia"
  },
  {
    label: "Parceria",
    emoji: "🤝",
    value: "parceria",
    categoria: "parceria"
  },
  {
    label: "Sorteio",
    emoji: "🎁",
    value: "sorteio",
    categoria: "sorteio"
  }
];

db.tickets ??= {};
db.usuarios ??= {};

function salvar() {
  fs.writeFileSync(
    "./config.json",
    JSON.stringify(config, null, 2)
  );

  fs.writeFileSync(
    "./database.json",
    JSON.stringify(db, null, 2)
  );
}

salvar();

// ==============================
// BOT
// ==============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==============================
// FUNÇÕES
// ==============================

function dono(id) {
  return DONOS.has(id);
}

function staff(member) {
  if (!member) return false;

  if (dono(member.id)) return true;

  return Object.values(config.cargos).some(
    id => id && member.roles.cache.has(id)
  );
}

function estiloCor() {
  const cores = {
    Primary: ButtonStyle.Primary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger,
    Secondary: ButtonStyle.Secondary
  };

  return cores[config.cor] || ButtonStyle.Primary;
}

// ==============================
// PAINEL
// ==============================

function painel() {
  const categorias = Object.entries(config.categorias)
    .map(([nome, id]) =>
      id
        ? `**${nome}:** <#${id}>`
        : `**${nome}:** ❌`
    )
    .join("\n");

  const cargos = Object.values(config.cargos)
    .filter(Boolean)
    .map(id => `<@&${id}>`)
    .join("\n") || "❌ Nenhum";

  const opcoes = config.opcoes
    .map((o, i) =>
      `${i + 1}. ${o.emoji} ${o.label}`
    )
    .join("\n");

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("⚙️ CONFIGURAÇÃO DE TICKETS")
        .addFields(
          {
            name: "🎫 Tipo",
            value:
              config.tipo === "menu"
                ? "Menu"
                : "Botões",
            inline: true
          },
          {
            name: "🎨 Cor",
            value: config.cor,
            inline: true
          },
          {
            name: "👥 Cargos",
            value: cargos,
            inline: true
          },
          {
            name: "📂 Categorias",
            value: categorias
          },
          {
            name: "📋 Opções",
            value: opcoes
          }
        )
    ],

    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("config_tipo")
          .setLabel("Tipo")
          .setEmoji("🔄")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("config_cor")
          .setLabel("Cor")
          .setEmoji("🎨")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("config_add")
          .setLabel("Adicionar")
          .setEmoji("➕")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("config_del")
          .setLabel("Remover")
          .setEmoji("➖")
          .setStyle(ButtonStyle.Danger)
      )
    ]
  };
}

// ==============================
// ONLINE
// ==============================

client.once(Events.ClientReady, async bot => {
  console.log(`✅ Bot online: ${bot.user.tag}`);

  await bot.application.commands.set([
    {
      name: "config",
      description: "Configurar tickets",
      options: [
        {
          name: "ticket",
          description: "Abrir configuração",
          type: 1
        }
      ]
    },
    {
      name: "enviar",
      description: "Enviar painel de tickets"
    }
  ]);

  console.log("✅ Comandos registrados.");
});

// ==============================
// INTERAÇÕES
// ==============================

client.on(Events.InteractionCreate, async interaction => {

  // ============================
  // COMANDOS
  // ============================

  if (interaction.isChatInputCommand()) {

    if (!dono(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Você não tem permissão.",
        ephemeral: true
      });
    }

    // /config ticket
    if (interaction.commandName === "config") {
      return interaction.reply({
        ...painel(),
        ephemeral: true
      });
    }

    // /enviar
    if (interaction.commandName === "enviar") {

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("🎫 ATENDIMENTO")
        .setDescription(
          "Selecione abaixo o tipo de atendimento que deseja abrir."
        );

      if (config.tipo === "menu") {

        const menu = new StringSelectMenuBuilder()
          .setCustomId("abrir_ticket")
          .setPlaceholder("Selecione uma opção")
          .addOptions(
            config.opcoes.map(o => ({
              label: o.label,
              emoji: o.emoji,
              value: o.value
            }))
          );

        await interaction.channel.send({
          embeds: [embed],
          components: [
            new ActionRowBuilder().addComponents(menu)
          ]
        });

      } else {

        const botoes = config.opcoes.map(o =>
          new ButtonBuilder()
            .setCustomId(`abrir_${o.value}`)
            .setLabel(o.label)
            .setEmoji(o.emoji)
            .setStyle(estiloCor())
        );

        const linhas = [];

        for (let i = 0; i < botoes.length; i += 5) {
          linhas.push(
            new ActionRowBuilder().addComponents(
              botoes.slice(i, i + 5)
            )
          );
        }

        await interaction.channel.send({
          embeds: [embed],
          components: linhas
        });
      }

      return interaction.reply({
        content: "✅ Painel enviado!",
        ephemeral: true
      });
    }
  }

  // ============================
  // CONFIGURAÇÃO
  // ============================

  if (
    interaction.isButton() &&
    interaction.customId.startsWith("config_")
  ) {

    if (!dono(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Sem permissão.",
        ephemeral: true
      });
    }

    const id = interaction.customId;

    if (id === "config_tipo") {

      config.tipo =
        config.tipo === "menu"
          ? "botoes"
          : "menu";

      salvar();

      return interaction.update(painel());
    }

    if (id === "config_cor") {

      const cores = [
        "Primary",
        "Success",
        "Danger",
        "Secondary"
      ];

      const atual = cores.indexOf(config.cor);

      config.cor =
        cores[(atual + 1) % cores.length];

      salvar();

      return interaction.update(painel());
    }

    if (id === "config_add") {

      config.opcoes.push({
        label: `Opção ${config.opcoes.length + 1}`,
        emoji: "🔹",
        value: `op_${Date.now()}`,
        categoria: "suporte"
      });

      salvar();

      return interaction.update(painel());
    }

    if (id === "config_del") {

      if (config.opcoes.length <= 1) {
        return interaction.reply({
          content: "❌ Você precisa ter pelo menos uma opção.",
          ephemeral: true
        });
      }

      config.opcoes.pop();

      salvar();

      return interaction.update(painel());
    }
  }

  // ============================
  // ABRIR TICKET
  // ============================

  if (
    (
      interaction.isButton() &&
      interaction.customId.startsWith("abrir_")
    ) ||
    (
      interaction.isStringSelectMenu() &&
      interaction.customId === "abrir_ticket"
    )
  ) {

    try {

      const valor =
        interaction.isStringSelectMenu()
          ? interaction.values[0]
          : interaction.customId.replace("abrir_", "");

      const opcao = config.opcoes.find(
        o => o.value === valor
      );

      if (!opcao) {
        return interaction.reply({
          content: "❌ Opção inválida.",
          ephemeral: true
        });
      }

      // =========================
      // TICKET EXISTENTE
      // =========================

      const ticketAntigo =
        db.usuarios[interaction.user.id];

      if (ticketAntigo) {

        const canalAntigo =
          interaction.guild.channels.cache.get(
            ticketAntigo
          );

        if (canalAntigo) {
          return interaction.reply({
            content:
              `⚠️ Você já possui um ticket aberto: ${canalAntigo}`,
            ephemeral: true
          });
        }

        delete db.usuarios[
          interaction.user.id
        ];

        salvar();
      }

      // =========================
      // CATEGORIA
      // =========================

      const categoriaId =
        config.categorias[opcao.categoria];

      let categoria;

      if (categoriaId) {

        categoria =
          interaction.guild.channels.cache.get(
            categoriaId
          );

        if (
          !categoria ||
          categoria.type !== ChannelType.GuildCategory
        ) {
          return interaction.reply({
            content:
              `❌ A categoria de **${opcao.label}** está configurada incorretamente.`,
            ephemeral: true
          });
        }
      }

      // =========================
      // NOME
      // =========================

      const numero =
        Object.keys(db.tickets).length + 1;

      const nome =
        `ticket-${numero}-${interaction.user.username}`
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, "")
          .slice(0, 90);

      // =========================
      // PERMISSÕES
      // =========================

      const permissoes = [
        {
          id: interaction.guild.id,
          deny: [
            PermissionsBitField.Flags.ViewChannel
          ]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ];

      for (const cargo of Object.values(config.cargos)) {

        if (!cargo) continue;

        permissoes.push({
          id: cargo,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      // =========================
      // CRIAR CANAL
      // =========================

      const canal =
        await interaction.guild.channels.create({
          name: nome,
          type: ChannelType.GuildText,
          parent: categoria?.id || undefined,
          permissionOverwrites: permissoes
        });

      // =========================
      // SALVAR
      // =========================

      db.tickets[canal.id] = {
        dono: interaction.user.id,
        categoria: opcao.label,
        criado: Date.now()
      };

      db.usuarios[
        interaction.user.id
      ] = canal.id;

      salvar();

      // =========================
      // MENSAGEM
      // =========================

      const embed =
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle("🎫 ATENDIMENTO")
          .setDescription(
            `Olá <@${interaction.user.id}>!\n\n` +
            `📌 **Categoria:** ${opcao.label}\n\n` +
            `Aguarde um membro da equipe.`
          )
          .setTimestamp();

      const botoes =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("fechar_ticket")
            .setLabel("Finalizar")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
        );

      await canal.send({
        content: `<@${interaction.user.id}>`,
        embeds: [embed],
        components: [botoes]
      });

      return interaction.reply({
        content:
          `✅ Ticket criado com sucesso: ${canal}`,
        ephemeral: true
      });

    } catch (erro) {

      console.error(
        "❌ ERRO AO CRIAR TICKET:",
        erro
      );

      if (!interaction.replied) {
        return interaction.reply({
          content:
            "❌ Não consegui criar o ticket. Verifique as permissões do bot.",
          ephemeral: true
        });
      }
    }
  }

  // ============================
  // FECHAR TICKET
  // ============================

  if (
    interaction.isButton() &&
    interaction.customId === "fechar_ticket"
  ) {

    const ticket =
      db.tickets[interaction.channel.id];

    if (!ticket) {
      return interaction.reply({
        content: "❌ Este canal não é um ticket.",
        ephemeral: true
      });
    }

    if (
      !staff(interaction.member) &&
      ticket.dono !== interaction.user.id
    ) {
      return interaction.reply({
        content: "❌ Você não pode fechar este ticket.",
        ephemeral: true
      });
    }

    delete db.tickets[
      interaction.channel.id
    ];

    delete db.usuarios[
      ticket.dono
    ];

    salvar();

    await interaction.reply(
      "🔒 Ticket sendo fechado..."
    );

    setTimeout(async () => {

      try {
        await interaction.channel.delete();
      } catch (erro) {
        console.log(
          "Erro ao apagar ticket:",
          erro.message
        );
      }

    }, 1500);
  }
});

// ==============================
// ERROS
// ==============================

process.on("unhandledRejection", erro => {
  console.error("❌ Promise:", erro);
});

process.on("uncaughtException", erro => {
  console.error("❌ Exception:", erro);
});

// ==============================
// LOGIN
// ==============================

if (!process.env.TOKEN) {
  console.error("❌ TOKEN não encontrado nas Variables do Railway.");
  process.exit(1);
}

client.login(process.env.TOKEN);
