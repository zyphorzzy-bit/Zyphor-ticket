const {
  Client, GatewayIntentBits, Events,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, ChannelType, PermissionsBitField
} = require("discord.js");
require("dotenv").config();
const fs = require("fs");

const DONOS = new Set([
  "1527769881326522478",
  "1533306874513068093"
]);

const FILE = "./database.json";

const DEFAULT = {
  categorias: {
    suporte: "",
    denuncia: "",
    parceria: "",
    sorteio: ""
  },
  cargos: [],
  tickets: {}
};

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    fs.writeFileSync(FILE, JSON.stringify(DEFAULT, null, 2));
    return structuredClone(DEFAULT);
  }
}

let db = load();

function save() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

const opcoes = [
  ["suporte", "❓", "Suporte"],
  ["denuncia", "🚨", "Denúncia"],
  ["parceria", "🤝", "Parceria"],
  ["sorteio", "🎁", "Sorteio"]
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const dono = id => DONOS.has(id);

function staff(member) {
  return dono(member.id) ||
    db.cargos.some(id => member.roles.cache.has(id));
}

client.once(Events.ClientReady, async () => {
  console.log(`✅ Online: ${client.user.tag}`);

  await client.application.commands.set([
    {
      name: "enviar",
      description: "Enviar painel de tickets"
    },
    {
      name: "config",
      description: "Configurar tickets",
      options: [
        {
          name: "categoria",
          description: "Categoria do ticket",
          type: 3,
          required: true,
          choices: [
            { name: "Suporte", value: "suporte" },
            { name: "Denúncia", value: "denuncia" },
            { name: "Parceria", value: "parceria" },
            { name: "Sorteio", value: "sorteio" }
          ]
        },
        {
          name: "canal",
          description: "Categoria do Discord",
          type: 7,
          required: true,
          channel_types: [ChannelType.GuildCategory]
        }
      ]
    },
    {
      name: "cargo",
      description: "Adicionar cargo da equipe",
      options: [{
        name: "cargo",
        description: "Cargo que poderá atender tickets",
        type: 8,
        required: true
      }]
    }
  ]);

  console.log("✅ Comandos registrados.");
});

client.on(Events.InteractionCreate, async i => {

  if (!i.isChatInputCommand()) return;

  if (!dono(i.user.id)) {
    return i.reply({
      content: "❌ Você não tem permissão.",
      ephemeral: true
    });
  }

  if (i.commandName === "config") {
    const tipo = i.options.getString("categoria");
    const canal = i.options.getChannel("canal");

    db.categorias[tipo] = canal.id;
    save();

    return i.reply({
      content:
        `✅ Categoria **${tipo}** configurada em ${canal}.`,
      ephemeral: true
    });
  }

  if (i.commandName === "cargo") {
    const cargo = i.options.getRole("cargo");

    if (!db.cargos.includes(cargo.id))
      db.cargos.push(cargo.id);

    save();

    return i.reply({
      content: `✅ Cargo ${cargo} adicionado à equipe.`,
      ephemeral: true
    });
  }

  if (i.commandName === "enviar") {

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🎫 CENTRAL DE ATENDIMENTO")
      .setDescription(
        "Selecione abaixo o tipo de atendimento que deseja abrir."
      );

    const row = new ActionRowBuilder();

    for (const [value, emoji, label] of opcoes) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_${value}`)
          .setLabel(label)
          .setEmoji(emoji)
          .setStyle(ButtonStyle.Primary)
      );
    }

    await i.channel.send({
      embeds: [embed],
      components: [row]
    });

    return i.reply({
      content: "✅ Painel enviado.",
      ephemeral: true
    });
  }
});

client.on(Events.InteractionCreate, async i => {

  if (!i.isButton()) return;
  if (!i.customId.startsWith("ticket_")) return;

  try {

    const tipo = i.customId.replace("ticket_", "");

    const opcao = opcoes.find(x => x[0] === tipo);

    if (!opcao) {
      return i.reply({
        content: "❌ Ticket inválido.",
        ephemeral: true
      });
    }

    if (db.tickets[i.user.id]) {

      const antigo =
        i.guild.channels.cache.get(
          db.tickets[i.user.id]
        );

      if (antigo) {
        return i.reply({
          content:
            `⚠️ Você já possui um ticket aberto: ${antigo}`,
          ephemeral: true
        });
      }

      delete db.tickets[i.user.id];
      save();
    }

    const categoriaId =
      db.categorias[tipo];

    if (!categoriaId) {
      return i.reply({
        content:
          `❌ A categoria de **${opcao[2]}** ainda não foi configurada.`,
        ephemeral: true
      });
    }

    const categoria =
      i.guild.channels.cache.get(categoriaId);

    if (
      !categoria ||
      categoria.type !== ChannelType.GuildCategory
    ) {
      return i.reply({
        content:
          "❌ A categoria configurada não existe mais.",
        ephemeral: true
      });
    }

    const numero =
      Object.keys(db.tickets).length + 1;

    const nome =
      `ticket-${numero}-${i.user.username}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 90);

    const overwrites = [
      {
        id: i.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: i.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ];

    for (const cargo of db.cargos) {
      overwrites.push({
        id: cargo,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      });
    }

    const canal =
      await i.guild.channels.create({
        name: nome,
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites: overwrites,
        reason: `Ticket de ${i.user.tag}`
      });

    db.tickets[i.user.id] = canal.id;
    save();

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🎫 TICKET ABERTO")
      .setDescription(
        `Olá ${i.user}!\n\n` +
        `📌 **Categoria:** ${opcao[2]}\n\n` +
        `Aguarde um membro da equipe.`
      );

    const fechar =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("fechar_ticket")
          .setLabel("Fechar")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

    await canal.send({
      content: `${i.user}`,
      embeds: [embed],
      components: [fechar]
    });

    return i.reply({
      content: `✅ Ticket criado: ${canal}`,
      ephemeral: true
    });

  } catch (err) {

    console.error("❌ ERRO:", err);

    if (!i.replied) {
      return i.reply({
        content:
          "❌ Não consegui criar o ticket. Verifique as permissões do bot.",
        ephemeral: true
      });
    }
  }
});

client.on(Events.InteractionCreate, async i => {

  if (!i.isButton()) return;
  if (i.customId !== "fechar_ticket") return;

  const canal = i.channel;
  const donoId =
    Object.keys(db.tickets).find(
      id => db.tickets[id] === canal.id
    );

  if (!donoId) {
    return i.reply({
      content: "❌ Este canal não é um ticket.",
      ephemeral: true
    });
  }

  if (
    !staff(i.member) &&
    i.user.id !== donoId
  ) {
    return i.reply({
      content: "❌ Você não pode fechar este ticket.",
      ephemeral: true
    });
  }

  delete db.tickets[donoId];
  save();

  await i.reply("🔒 Fechando ticket...");

  setTimeout(() => {
    canal.delete().catch(() => {});
  }, 1500);
});

process.on("unhandledRejection", err =>
  console.error("❌", err)
);

if (!process.env.TOKEN) {
  console.error("❌ TOKEN não configurado no Railway.");
  process.exit(1);
}

client.login(process.env.TOKEN);
