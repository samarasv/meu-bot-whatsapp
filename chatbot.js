const express = require('express');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Inicia servidor Express para manter o Railway ativo
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 Bot WhatsApp está rodando com sucesso!');
});

app.listen(port, () => {
  console.log(`🌐 Servidor Express rodando na porta ${port}`);
});

// Inicia o cliente do WhatsApp com sessão salva em ".wwebjs_auth"
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

const estados = new Map();
const delay = ms => new Promise(res => setTimeout(res, ms));

// Mostra o QR code no terminal
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('📲 Escaneie o QR Code acima para conectar ao WhatsApp.');
});

// Confirmação de conexão
client.on('ready', () => {
  console.log('✅ WhatsApp conectado com sucesso!');
});

client.initialize();

// Lógica de atendimento automatizado
client.on('message', async msg => {
  const numero = msg.from;

  if (!estados.has(numero)) {
    if (/menu|oi|olá|ola|bom dia|boa tarde|boa noite/i.test(msg.body)) {
      const chat = await msg.getChat();
      const contact = await msg.getContact();
      const nome = contact.pushname?.split(" ")[0] || "cliente";

      await delay(2000);
      await chat.sendStateTyping();
      await delay(2000);

      await client.sendMessage(numero,
        `Olá, ${nome}! Sou a assistente virtual da empresa Assessoria Villani.\n\nComo posso te ajudar?\n\n` +
        `1 - Cidadania Italiana\n2 - Cidadania Portuguesa\n3 - Conversão de CNH\n4 - Tradução juramentada\n5 - Outros serviços`);

      estados.set(numero, 'menu_principal');
      return;
    }
  }

  const estado = estados.get(numero);
  const body = msg.body.trim();

  // MENU PRINCIPAL
  if (estado === 'menu_principal') {
    switch (body) {
      case '1':
        await client.sendMessage(numero,
          'Você escolheu *Cidadania Italiana*.\nAgora selecione:\n1 - Busca de documentos\n2 - Emissão de certidões\n3 - Cidadania Judicial\n4 - Outros serviços');
        estados.set(numero, 'cidadania_italiana');
        break;
      case '2':
        await client.sendMessage(numero,
          'Você escolheu *Cidadania Portuguesa*. Um atendente vai te chamar em breve.');
        estados.delete(numero);
        break;
      case '3':
        await client.sendMessage(numero,
          'Você escolheu *Conversão de CNH*. Um atendente vai te chamar em breve.');
        estados.delete(numero);
        break;
      case '4':
        await client.sendMessage(numero,
          'Você escolheu *Tradução juramentada*. Em que podemos ajudar?');
        estados.set(numero, 'traducao');
        break;
      case '5':
        await client.sendMessage(numero,
          'Por favor, descreva o serviço que você deseja.');
        estados.set(numero, 'outros');
        break;
      default:
        await client.sendMessage(numero,
          'Opção inválida. Por favor, digite um número de 1 a 5.');
    }
    return;
  }

  // SUBMENU CIDADANIA ITALIANA
  if (estado === 'cidadania_italiana') {
    const opcoes = {
      '1': 'Busca de documentos',
      '2': 'Emissão de certidões',
      '3': 'Cidadania Judicial',
      '4': 'Outros serviços'
    };

    const escolha = opcoes[body] || 'o serviço escolhido';
    await client.sendMessage(numero,
      `Entendido! Em breve um de nossos atendentes entrará em contato com você sobre *${escolha}*. Obrigado!`);
    estados.delete(numero);
    return;
  }

  // OUTROS SERVIÇOS
  if (estado === 'outros' || estado === 'traducao') {
    await client.sendMessage(numero,
      'Obrigado! Um atendente irá te chamar em breve.');
    estados.delete(numero);
    return;
  }

  // Fallback
  if (!estados.has(numero)) {
    await client.sendMessage(numero,
      'Digite "menu" para começar o atendimento.');
  }
});