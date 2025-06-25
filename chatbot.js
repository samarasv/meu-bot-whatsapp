const fs = require('fs');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
    authStrategy: new LocalAuth(), // Salva sessão localmente
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Necessário para hospedagem online
    }
});

const estados = new Map();
const delay = ms => new Promise(res => setTimeout(res, ms));

// Endpoint simples para manter servidor vivo
app.get('/', (req, res) => res.send('🤖 Bot WhatsApp está rodando!'));
app.listen(PORT, () => {
    console.log(`🌐 Servidor web ativo em http://localhost:${PORT}`);
});

// Exibe QR Code
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📲 Escaneie o QR Code acima com seu WhatsApp.');
});

// Conectado
client.on('ready', () => {
    console.log('✅ WhatsApp conectado com sucesso!');
});

// Inicializa o cliente
client.initialize();

// Fluxo de mensagens
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

    // Menu principal
    if (estado === 'menu_principal') {
        switch (texto) {
            case '1':
                await client.sendMessage(numero, '🇮🇹 Você escolheu *Cidadania Italiana*. Agora selecione:\n\n1 - Busca de documentos\n2 - Emissão de certidões\n3 - Cidadania Judicial\n4 - Outros serviços');
                estados.set(numero, 'cidadania_italiana');
                break;
            case '2':
                await client.sendMessage(numero, '🇵🇹 Você escolheu *Cidadania Portuguesa*. Um atendente entrará em contato com você em breve.');
                estados.delete(numero);
                break;
            case '3':
                await client.sendMessage(numero, '🚗 Você escolheu *Conversão de CNH*. Um atendente irá te chamar em breve.');
                estados.delete(numero);
                break;
            case '4':
                await client.sendMessage(numero, '📝 Você escolheu *Tradução juramentada*. Em que podemos ajudar?');
                estados.set(numero, 'traducao');
                break;
            case '5':
                await client.sendMessage(numero, '🛠️ Por favor, descreva o serviço desejado.');
                estados.set(numero, 'outros');
                break;
            default:
                await client.sendMessage(numero, '❌ Opção inválida. Por favor, digite um número de 1 a 5.');
        }
        return;
    }

    // Submenu Cidadania Italiana
    if (estado === 'cidadania_italiana') {
        const opcoes = {
            '1': 'Busca de documentos',
            '2': 'Emissão de certidões',
            '3': 'Cidadania Judicial',
            '4': 'Outros serviços'
        };

        const escolha = opcoes[texto] || null;
        if (escolha) {
            await client.sendMessage(numero, `✅ Entendido! Em breve um de nossos atendentes entrará em contato com você referente a *${escolha}*.`);
            estados.delete(numero);
        } else {
            await client.sendMessage(numero, '❌ Opção inválida. Escolha de 1 a 4.');
        }
        return;
    }

    // Outros serviços ou tradução
    if (estado === 'outros' || estado === 'traducao') {
        await client.sendMessage(numero, '📩 Obrigado! Um atendente irá te chamar em breve.');
        estados.delete(numero);
        return;
    }

    // Se estiver fora de fluxo
    if (!estados.has(numero)) {
        await client.sendMessage(numero, '⚠️ Digite "menu" para iniciar o atendimento.');
    }
});
