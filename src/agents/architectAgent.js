const chalk = require('chalk');
const inquirer = require('inquirer');
const { showProgress } = require('../ui/animations');
const { startCodeGeneration } = require('./codeGenerationOrchestrator');

class ArchitectAgent {
    constructor() {
        this.projectPlan = null;
    }

    async start(refinedProject) {
        console.log(chalk.blue('\n🏛️  Agente Arquiteto ativado!\n'));
        
        await this.planExecution(refinedProject);
    }

    async planExecution(refinedProject) {
        await showProgress('Planejando execução do projeto...', 1500);
        
        // Organizar módulos por tipo e prioridade
        const frontendModules = refinedProject.modulos?.filter(m => m.tipo === 'frontend') || [];
        const backendModules = refinedProject.modulos?.filter(m => m.tipo === 'backend') || [];
        const sharedModules = refinedProject.modulos?.filter(m => m.tipo === 'shared') || [];
        
        // Definir ordem de execução
        const executionPlan = this.createExecutionPlan(frontendModules, backendModules, sharedModules);
        
        console.log(chalk.green('✅ Plano de execução criado!\n'));
        console.log(chalk.cyan('📋 Ordem de desenvolvimento:'));
        
        executionPlan.forEach((step, index) => {
            const stepColor = step.type === 'setup' ? chalk.blue :
                            step.type === 'backend' ? chalk.green :
                            step.type === 'frontend' ? chalk.yellow :
                            chalk.cyan;
            
            console.log(`${chalk.white(`${index + 1}.`)} ${stepColor(step.name)}`);
            console.log(chalk.gray(`   ${step.description}`));
        });

        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Iniciar geração de código?',
                default: true
            }
        ]);

        if (proceed) {
            await startCodeGeneration(refinedProject, executionPlan);
        } else {
            const { showMenu } = require('../ui/menu');
            await showMenu();
        }
    }

    createExecutionPlan(frontendModules, backendModules, sharedModules) {
        const plan = [];
        
        // 1. Setup inicial
        plan.push({
            name: 'Configuração Inicial',
            type: 'setup',
            description: 'Criar estrutura de pastas e arquivos de configuração',
            agent: 'setup'
        });

        // 2. Módulos compartilhados primeiro
        sharedModules.forEach(module => {
            plan.push({
                name: module.nome,
                type: 'shared',
                description: module.descricao,
                agent: 'shared',
                priority: module.prioridade
            });
        });

        // 3. Backend (alta prioridade primeiro)
        const sortedBackend = backendModules.sort((a, b) => {
            const priorities = { 'alta': 3, 'media': 2, 'baixa': 1 };
            return priorities[b.prioridade] - priorities[a.prioridade];
        });

        sortedBackend.forEach(module => {
            plan.push({
                name: module.nome,
                type: 'backend',
                description: module.descricao,
                agent: 'backend',
                priority: module.prioridade
            });
        });

        // 4. Frontend
        const sortedFrontend = frontendModules.sort((a, b) => {
            const priorities = { 'alta': 3, 'media': 2, 'baixa': 1 };
            return priorities[b.prioridade] - priorities[a.prioridade];
        });

        sortedFrontend.forEach(module => {
            plan.push({
                name: module.nome,
                type: 'frontend',
                description: module.descricao,
                agent: 'ui',
                priority: module.prioridade
            });
        });

        // 5. Integração final
        plan.push({
            name: 'Integração e Testes',
            type: 'integration',
            description: 'Conectar todos os módulos e configurar testes',
            agent: 'assembler'
        });

        return plan;
    }
}

async function startArchitecture(refinedProject) {
    const architect = new ArchitectAgent();
    await architect.start(refinedProject);
}

module.exports = { startArchitecture, ArchitectAgent };