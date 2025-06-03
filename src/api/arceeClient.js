const axios = require('axios');
const { getConfig } = require('../config/settings');

class ArceeClient {
    constructor() {
        this.baseURL = 'https://conductor.arcee.ai/v1';
    }

    async makeRequest(messages, model = null) {
        const config = await getConfig();
        
        if (!config || !config.arceeToken) {
            throw new Error('Token da API não configurado');
        }

        const requestData = {
            model: model || config.defaultModel,
            messages: messages
        };

        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${config.arceeToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Erro na API:', error.response?.data || error.message);
            throw error;
        }
    }

    async sendMessage(content, role = 'user', model = null) {
        const messages = [{ role, content }];
        return await this.makeRequest(messages, model);
    }

    async sendConversation(conversation, model = null) {
        return await this.makeRequest(conversation, model);
    }
}

module.exports = { ArceeClient };