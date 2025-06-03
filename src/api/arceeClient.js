const axios = require('axios');
const chalk = require('chalk');
const { getConfig } = require('../config/settings');

class ArceeClient {
    constructor() {
        this.baseURL = 'https://conductor.arcee.ai/v1';
        this.maxRetries = 2;
        this.timeout = 30000; // 30 segundos
    }

    async makeRequest(messages, model = null, retries = null) {
        const config = await getConfig();
        
        if (!config || !config.arceeToken) {
            throw new Error('Token da API não configurado');
        }

        const requestData = {
            model: model || config.defaultModel,
            messages: messages,
            temperature: 0.1, // Mais determinístico para reduzir variações
            max_tokens: 1500   // Limite para evitar respostas muito longas
        };

        const maxRetries = retries !== null ? retries : this.maxRetries;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                
                const response = await axios.post(
                    `${this.baseURL}/chat/completions`,
                    requestData,
                    {
                        headers: {
                            'Authorization': `Bearer ${config.arceeToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: this.timeout
                    }
                );
                return response.data.choices[0].message.content;
                
            } catch (error) {
                const isLastAttempt = attempt === maxRetries;
                
                if (error.code === 'ECONNABORTED') {
                    console.log(chalk.yellow(`⏱️  Timeout na tentativa ${attempt + 1}`));
                } else if (error.response?.status === 429) {
                    console.log(chalk.yellow(`🚦 Rate limit atingido na tentativa ${attempt + 1}`));
                } else if (error.response?.status >= 500) {
                    console.log(chalk.yellow(`🔧 Erro do servidor na tentativa ${attempt + 1}`));
                } else {
                    console.log(chalk.yellow(`❗ Erro na tentativa ${attempt + 1}: ${error.message}`));
                }
                
                if (isLastAttempt) {
                    console.error(chalk.red(`[${new Date().toISOString()}] ERROR: Todas as tentativas falharam`));
                    console.error('Detalhes:', error.response?.data || error.message);
                    throw error;
                }
                
                // Delay progressivo entre tentativas
                const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s...
                console.log(chalk.gray(`⏳ Aguardando ${delay/1000}s antes da próxima tentativa...`));
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    async sendMessage(content, role = 'user', model = null) {
        const messages = [{ role, content }];
        return await this.makeRequest(messages, model);
    }

    async sendConversation(conversation, model = null) {
        // Limitar o tamanho da conversa para economizar tokens
        const maxMessages = 6; // Últimas 6 mensagens
        const limitedConversation = conversation.slice(-maxMessages);
        
        return await this.makeRequest(limitedConversation, model);
    }

    // Método para verificar saúde da API
    async healthCheck() {
        try {
            const response = await this.sendMessage('teste', 'user');
            return true;
        } catch (error) {
            return false;
        }
    }

    // Método para estimar tokens (aproximação)
    estimateTokens(text) {
        // Aproximação: 1 token ≈ 4 caracteres para português
        return Math.ceil(text.length / 4);
    }

    // Método para logs detalhados (desenvolvimento)
    async sendMessageWithLogs(content, role = 'user', model = null) {
        const estimatedTokens = this.estimateTokens(content);
        console.log(chalk.gray(`📊 Tokens estimados: ${estimatedTokens}`));
        
        const startTime = Date.now();
        const response = await this.sendMessage(content, role, model);
        const endTime = Date.now();
        
        console.log(chalk.gray(`⏱️  Tempo de resposta: ${endTime - startTime}ms`));
        console.log(chalk.gray(`📤 Tokens de resposta: ~${this.estimateTokens(response)}`));
        
        return response;
    }
}

module.exports = { ArceeClient };