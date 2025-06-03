const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const inquirer = require('inquirer');
const { showMenu } = require('./ui/menu');
const { checkConfig, createConfig } = require('./config/settings');

async function init() {
    console.clear();
    
    // Mostrar logo Hermes
    await showHermesLogo();
    
    // Verificar configurações
    const configExists = await checkConfig();
    
    if (!configExists) {
        console.log(chalk.yellow('\n⚠️  Primeira execução detectada!'));
        console.log(chalk.blue('Vamos configurar o Hermes para você...\n'));
        await setupInitialConfig();
    }
    
    // Mostrar menu principal
    await showMenu();
}

async function showHermesLogo() {
    console.log(chalk.bold.cyan('\n  ██╗  ██╗███████╗██████╗ ███╗   ███╗███████╗███████╗'));
    console.log(chalk.bold.cyan('  ██║  ██║██╔════╝██╔══██╗████╗ ████║██╔════╝██╔════╝'));
    console.log(chalk.bold.cyan('  ███████║█████╗  ██████╔╝██╔████╔██║█████╗  ███████╗'));
    console.log(chalk.bold.cyan('  ██╔══██║██╔══╝  ██╔══██╗██║╚██╔╝██║██╔══╝  ╚════██║'));
    console.log(chalk.bold.cyan('  ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║███████╗███████║'));
    console.log(chalk.bold.cyan('  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝'));
    
    console.log(chalk.cyan('\n🚀 CLI de Desenvolvimento com IA\n'));
    console.log(chalk.gray('Transformando ideias em código funcional...\n'));
}

async function setupInitialConfig() {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'arceeToken',
            message: 'Digite seu token da API Arcee Conductor:',
            validate: (input) => input.length > 0 || 'Token é obrigatório'
        },
        {
            type: 'input',
            name: 'defaultModel',
            message: 'Modelo padrão:',
            default: 'coder'
        },
        {
            type: 'input',
            name: 'projectsPath',
            message: 'Caminho padrão para projetos:',
            default: './hermes-projects'
        }
    ]);
    
    await createConfig(answers);
    console.log(chalk.green('✅ Configuração salva com sucesso!\n'));
}

// Iniciar aplicação
init().catch(console.error);