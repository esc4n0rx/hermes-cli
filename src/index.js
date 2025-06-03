import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import { showMenu } from './ui/menu.js';
import { checkConfig, createConfig } from './config/settings.js';

async function init() {
    console.clear();
    
    // Mostrar logo Hermes sem efeito de digitação
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
    // Logo simples e direto
    console.log(chalk.cyan.bold('\n  ██╗  ██╗███████╗██████╗ ███╗   ███╗███████╗███████╗'));
    console.log(chalk.cyan.bold('  ██║  ██║██╔════╝██╔══██╗████╗ ████║██╔════╝██╔════╝'));
    console.log(chalk.cyan.bold('  ███████║█████╗  ██████╔╝██╔████╔██║█████╗  ███████╗'));
    console.log(chalk.cyan.bold('  ██╔══██║██╔══╝  ██╔══██╗██║╚██╔╝██║██╔══╝  ╚════██║'));
    console.log(chalk.cyan.bold('  ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║███████╗███████║'));
    console.log(chalk.cyan.bold('  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝'));
    
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
