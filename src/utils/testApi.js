const chalk = require('chalk');
const { ArceeClient } = require('../api/arceeClient');
const { getConfig } = require('../config/settings');

async function testApiConnection() {
    console.log(chalk.blue('\n🔍 Testando conexão com API Arcee...\n'));
    
    const config = await getConfig();
    
    if (!config || !config.arceeToken) {
        console.log(chalk.red('❌ Token não configurado'));
        return;
    }
    
    console.log(chalk.gray(`Token: ${config.arceeToken.substring(0, 8)}...`));
    console.log(chalk.gray(`Modelo: ${config.defaultModel}`));
    
    const client = new ArceeClient();
    const result = await client.testConnection();
    
    if (result.success) {
        console.log(chalk.green('✅ Conexão bem-sucedida!'));
        console.log(chalk.white('Resposta:', result.response.substring(0, 200) + '...'));
    } else {
        console.log(chalk.red('❌ Falha na conexão:', result.error));
    }
    
    console.log(chalk.blue('\n📝 Logs detalhados salvos em: hermes-api.log'));
}

module.exports = { testApiConnection };