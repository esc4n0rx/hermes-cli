import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';

const CONFIG_PATH = path.join(os.homedir(), '.hermes-config.json');

async function checkConfig() {
    return await fs.pathExists(CONFIG_PATH);
}

async function createConfig(config) {
    await fs.writeJson(CONFIG_PATH, config, { spaces: 2 });
}

async function getConfig() {
    if (await checkConfig()) {
        return await fs.readJson(CONFIG_PATH);
    }
    return null;
}

export async function showSettings() {
    const config = await getConfig();
    
    console.log(chalk.cyan('\n⚙️  Configurações Atuais'));
    console.log(chalk.white(`Token API: ${config.arceeToken ? '***configurado***' : 'não configurado'}`));
    console.log(chalk.white(`Modelo: ${config.defaultModel}`));
    console.log(chalk.white(`Caminho de Projetos: ${config.projectsPath}\n`));
    
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'O que deseja fazer?',
            choices: [
                { name: '✏️  Editar Token API', value: 'token' },
                { name: '🔧 Editar Modelo', value: 'model' },
                { name: '📁 Editar Caminho de Projetos', value: 'path' },
                { name: '🔙 Voltar', value: 'back' }
            ]
        }
    ]);
    
    if (action !== 'back') {
        await editConfig(action, config);
    }
}

async function editConfig(field, config) {
    switch (field) {
        case 'token':
            const { token } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'token',
                    message: 'Novo token API:'
                }
            ]);
            config.arceeToken = token;
            break;
        case 'model':
            const { model } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'model',
                    message: 'Novo modelo:',
                    default: config.defaultModel
                }
            ]);
            config.defaultModel = model;
            break;
        case 'path':
            const { projectPath } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'projectPath',
                    message: 'Novo caminho para projetos:',
                    default: config.projectsPath
                }
            ]);
            config.projectsPath = projectPath;
            break;
    }
    
    await createConfig(config);
    console.log(chalk.green('✅ Configuração atualizada!\n'));
}