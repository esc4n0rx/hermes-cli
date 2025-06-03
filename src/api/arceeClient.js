const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { getConfig } = require('../config/settings');

class ArceeClient {
    constructor() {
        this.baseURL = 'https://conductor.arcee.ai/v1';
        this.logFile = path.join(__dirname, '..', '..', 'hermes-api.log');
        this.initLogger();
    }

    async initLogger() {
        try {
            await fs.ensureFile(this.logFile);
        } catch (error) {
            console.warn('Não foi possível criar arquivo de log:', error.message);
        }
    }

    async log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`;
        const detailedLog = JSON.stringify(logEntry, null, 2) + '\n' + '-'.repeat(80) + '\n';

        // Log no console
        console.log(logLine.trim());

        // Log no arquivo
        try {
            await fs.appendFile(this.logFile, detailedLog);
        } catch (error) {
            console.warn('Erro ao escrever no log:', error.message);
        }
    }

    async makeRequest(messages, model = null) {
        await this.log('info', 'Iniciando requisição para API Arcee');
        
        const config = await getConfig();
        
        if (!config || !config.arceeToken) {
            await this.log('error', 'Token da API não configurado', { config });
            throw new Error('Token da API não configurado');
        }

        // Log da configuração (sem expor o token completo)
        await this.log('info', 'Configuração carregada', {
            hasToken: !!config.arceeToken,
            tokenLength: config.arceeToken ? config.arceeToken.length : 0,
            tokenPrefix: config.arceeToken ? config.arceeToken.substring(0, 8) + '...' : 'N/A',
            defaultModel: config.defaultModel,
            baseURL: this.baseURL
        });

        const requestData = {
            model: model || config.defaultModel,
            messages: messages
        };

        await this.log('info', 'Dados da requisição preparados', {
            model: requestData.model,
            messagesCount: messages.length,
            firstMessageRole: messages[0]?.role,
            firstMessageLength: messages[0]?.content?.length
        });

        const requestConfig = {
            headers: {
                'Authorization': `Bearer ${config.arceeToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 segundos
        };

        const fullURL = `${this.baseURL}/chat/completions`;
        
        await this.log('info', 'Enviando requisição HTTP', {
            url: fullURL,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.arceeToken.substring(0, 8)}...`,
                'Content-Type': requestConfig.headers['Content-Type']
            },
            timeout: requestConfig.timeout
        });

        const startTime = Date.now(); // DECLARAR AQUI, ANTES DO TRY

        try {
            const response = await axios.post(
                fullURL,
                requestData,
                requestConfig
            );

            const duration = Date.now() - startTime;

            await this.log('success', 'Resposta recebida com sucesso', {
                status: response.status,
                statusText: response.statusText,
                duration: `${duration}ms`,
                responseData: {
                    hasChoices: !!response.data?.choices,
                    choicesLength: response.data?.choices?.length,
                    firstChoiceRole: response.data?.choices?.[0]?.message?.role,
                    contentLength: response.data?.choices?.[0]?.message?.content?.length
                },
                headers: response.headers
            });

            return response.data.choices[0].message.content;

        } catch (error) {
            const duration = Date.now() - startTime;
            
            await this.log('error', 'Erro na requisição API', {
                duration: `${duration}ms`,
                errorType: error.constructor.name,
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                requestData: {
                    url: fullURL,
                    model: requestData.model,
                    messagesCount: requestData.messages.length
                },
                headers: error.response?.headers,
                config: {
                    timeout: requestConfig.timeout,
                    hasAuth: !!requestConfig.headers.Authorization
                }
            });

            // Log específico para erros de autenticação
            if (error.response?.status === 401) {
                await this.log('error', 'Erro de autenticação detectado', {
                    possibleCauses: [
                        'Token inválido ou expirado',
                        'Token mal formatado',
                        'Problema com Bearer prefix',
                        'Conta sem créditos'
                    ],
                    tokenInfo: {
                        length: config.arceeToken.length,
                        startsWithBearer: config.arceeToken.startsWith('Bearer'),
                        prefix: config.arceeToken.substring(0, 10) + '...'
                    }
                });
            }

            console.error('Erro na API:', error.response?.data || error.message);
            throw error;
        }
    }

    async sendMessage(content, role = 'user', model = null) {
        await this.log('info', 'Enviando mensagem simples', {
            role,
            contentLength: content.length,
            model
        });
        
        const messages = [{ role, content }];
        return await this.makeRequest(messages, model);
    }

    async sendConversation(conversation, model = null) {
        await this.log('info', 'Enviando conversa', {
            conversationLength: conversation.length,
            model
        });
        
        return await this.makeRequest(conversation, model);
    }

    async testConnection() {
        await this.log('info', 'Testando conexão com API');
        
        try {
            const testMessage = "Hello, this is a test message.";
            const response = await this.sendMessage(testMessage);
            
            await this.log('success', 'Teste de conexão bem-sucedido', {
                responseLength: response.length,
                responsePreview: response.substring(0, 100) + '...'
            });
            
            return { success: true, response };
        } catch (error) {
            await this.log('error', 'Teste de conexão falhou', {
                error: error.message
            });
            
            return { success: false, error: error.message };
        }
    }
}

module.exports = { ArceeClient };