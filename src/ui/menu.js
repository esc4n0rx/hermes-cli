const inquirer = require('inquirer');
const chalk = require('chalk');
const { startDevelopment } = require('../agents/ideaAgent');
const { showRecentProjects } = require('../utils/helpers');
const { showSettings } = require('../config/settings');

async function showMenu() {
    const choices = [
        {
            name: chalk.green('🔨 1. Desenvolvimento'),
            value: 'development'
        },
        {
            name: chalk.blue('🔍 2. Code Review'),
            value: 'review'
        },
        {
            name: chalk.yellow('📁 3. Projetos Recentes'),
            value: 'recent'
        },
        {
            name: chalk.magenta('⚙️  4. Configurações'),
            value: 'settings'
        },
        {
            name: chalk.cyan('ℹ️  5. Sobre'),
            value: 'about'
        },
        {
            name: chalk.red('🚪 6. Sair'),
            value: 'exit'
        }
    ];

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: chalk.bold('Selecione uma opção:'),
            choices,
            pageSize: 6
        }
    ]);

    switch (action) {
        case 'development':
            await startDevelopment();
            break;
        case 'review':
            console.log(chalk.yellow('🚧 Code Review em desenvolvimento...'));
            await showMenu();
            break;
        case 'recent':
            await showRecentProjects();
            await showMenu();
            break;
        case 'settings':
            await showSettings();
            await showMenu();
            break;
        case 'about':
            showAbout();
            await showMenu();
            break;
        case 'exit':
            console.log(chalk.green('👋 Até logo!'));
            process.exit(0);
            break;
    }
}

function showAbout() {
    console.log(chalk.cyan('\n📖 Sobre o Hermes'));
    console.log(chalk.white('Versão: 1.0.0'));
    console.log(chalk.white('CLI de desenvolvimento com IA que transforma ideias em projetos funcionais'));
    console.log(chalk.white('Desenvolvido com Node.js e integração com Arcee Conductor\n'));
}

module.exports = { showMenu };