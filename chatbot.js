require('dotenv').config();
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const estados = new Map();
const delay = ms => new Promise(res => setTimeout(res, ms));

// Endpoint para manter vivo
app.get('/', (req, res) => res.send('🤖 Bot WhatsApp está rodando!'));
app.listen(PORT, () => {
    console.log(`🌐 Servidor web em http://localhost:${PORT}`);
});

// QR Code
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📲 Escaneie o QR Code com o WhatsApp');
});

// Conectado
client.on('ready', () => {
    console.log('✅ Bot conectado ao WhatsApp!');
});

// Inicializa o bot
client.initialize();

// Mensagens
client.on('message', async msg => {
    const numero = msg.from;
    const texto = msg.body.trim().toLowerCase();

    if (!estados.has(numero)) {
        if (/menu|oi|olá|ola|bom dia|boa tarde|boa noite/.test(texto)) {
            const chat = await msg.getChat();
            const contact = await msg.getContact();
            const nome = contact.pushname?.split(" ")[0] || "cliente";

            await delay(1000);
            await chat.sendStateTyping();
            await delay(1000);

            await client.sendMessage(numero,
                `Olá, ${nome}! 👋\nSou a assistente virtual da *Assessoria Villani*.\n\n` +
                `Como posso te ajudar hoje?\n\n` +
                `1️⃣ - Cidadania Italiana\n` +
                `2️⃣ - Cidadania Portuguesa\n` +
                `3️⃣ - Conversão de CNH\n` +
                `4️⃣ - Tradução juramentada\n` +
                `5️⃣ - Outros serviços`);

            estados.set(numero, 'menu_principal');
            return;
        }
    }

    const estado = estados.get(numero);

    if (estado === 'menu_principal') {
        switch (texto) {
            case '1':
                await client.sendMessage(numero, '🇮🇹 Você escolheu *Cidadania Italiana*. Agora selecione:\n1 - Busca de documentos\n2 - Emissão de certidões\n3 - Cidadania Judicial\n4 - Outros serviços');
                estados.set(numero, 'cidadania_italiana');
                break;
            case '2':
                await client.sendMessage(numero, '🇵🇹 *Cidadania Portuguesa*. Um atendente falará com você em breve.');
                estados.delete(numero);
                break;
            case '3':
                await client.sendMessage(numero, '🚗 *Conversão de CNH*. Um atendente te chamará em breve.');
                estados.delete(numero);
                break;
            case '4':
                await client.sendMessage(numero, '📝 *Tradução juramentada*. Em que podemos ajudar?');
                estados.set(numero, 'traducao');
                break;
            case '5':
                await client.sendMessage(numero, '🛠️ Descreva o serviço desejado.');
                estados.set(numero, 'outros');
                break;
            default:
                await client.sendMessage(numero, '❌ Opção inválida. Digite um número de 1 a 5.');
        }
        return;
    }

    if (estado === 'cidadania_italiana') {
        const opcoes = {
            '1': 'Busca de documentos',
            '2': 'Emissão de certidões',
            '3': 'Cidadania Judicial',
            '4': 'Outros serviços'
        };

        const escolha = opcoes[texto];
        if (escolha) {
            await client.sendMessage(numero, `✅ Entendido! Um atendente entrará em contato sobre *${escolha}*.`);
            estados.delete(numero);
        } else {
            await client.sendMessage(numero, '❌ Escolha inválida. Responda com um número de 1 a 4.');
        }
        return;
    }

    if (estado === 'traducao' || estado === 'outros') {
        await client.sendMessage(numero, '📩 Obrigado! Um atendente irá te chamar em breve.');
        estados.delete(numero);
        return;
    }

    if (!estados.has(numero)) {
        await client.sendMessage(numero, '⚠️ Digite "menu" para iniciar o atendimento.');
    }
});
