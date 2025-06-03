const chalk = require('chalk');
const inquirer = require('inquirer');
const { showProgress } = require('../ui/animations');
const { SetupAgent } = require('./setupAgent');
const { UIAgent } = require('./uiAgent');
const { BackendAgent } = require('./backendAgent');
const { AssemblerAgent } = require('./assemblerAgent');

class CodeGenerationOrchestrator {
    constructor() {
        this.agents = {
            setup: new SetupAgent(),
            ui: new UIAgent(),
            backend: new BackendAgent(),
            assembler: new AssemblerAgent()
        };
        this.projectContext = null;
        this.generatedFiles = [];
    }

    async start(refinedProject, executionPlan) {
        console.log(chalk.blue('\n🚀 Iniciando geração de código!\n'));
        
        this.projectContext = {
            project: refinedProject,
            plan: executionPlan,
            files: []
        };

        await this.executeSteps(executionPlan);
    }

    async executeSteps(executionPlan) {
        for (let i = 0; i < executionPlan.length; i++) {
            const step = executionPlan[i];
            
            console.log(chalk.cyan(`\n📍 Executando: ${step.name}`));
            console.log(chalk.gray(`   ${step.description}\n`));

            try {
                await this.executeStep(step, i + 1, executionPlan.length);
            } catch (error) {
                console.error(chalk.red(`❌ Erro no passo ${i + 1}:`), error.message);
                
                const { continue_ } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'continue_',
                        message: 'Deseja continuar mesmo com o erro?',
                        default: false
                    }
                ]);

                if (!continue_) {
                    console.log(chalk.yellow('🛑 Processo interrompido pelo usuário'));
                    return;
                }
            }
        }

        await this.showFinalResult();
    }

    async executeStep(step, currentStep, totalSteps) {
        const progressMessage = `Processando (${currentStep}/${totalSteps}): ${step.name}`;
        
        switch (step.agent) {
            case 'setup':
                await showProgress(progressMessage, 1000);
                const setupResult = await this.agents.setup.execute(step, this.projectContext);
                this.updateContext(setupResult);
                break;

            case 'backend':
                await showProgress(progressMessage, 2000);
                const backendResult = await this.agents.backend.execute(step, this.projectContext);
                this.updateContext(backendResult);
                break;

            case 'ui':
                await showProgress(progressMessage, 2500);
                const uiResult = await this.agents.ui.execute(step, this.projectContext);
                this.updateContext(uiResult);
                break;

            case 'shared':
                await showProgress(progressMessage, 1500);
                // Usar backend agent para módulos compartilhados
                const sharedResult = await this.agents.backend.execute(step, this.projectContext);
                this.updateContext(sharedResult);
                break;

            case 'assembler':
                await showProgress(progressMessage, 3000);
                const finalResult = await this.agents.assembler.execute(step, this.projectContext);
                this.updateContext(finalResult);
                break;

            default:
                console.log(chalk.yellow(`⚠️  Agente não encontrado: ${step.agent}`));
        }
    }

    updateContext(result) {
        if (result && result.files) {
            this.projectContext.files.push(...result.files);
            this.generatedFiles.push(...result.files);
        }
    }

    async showFinalResult() {
        console.log(chalk.green('\n🎉 Projeto gerado com sucesso!\n'));
        
        console.log(chalk.cyan('📁 Arquivos criados:'));
        this.generatedFiles.forEach(file => {
            console.log(chalk.white(`  ✓ ${file.path}`));
        });

        console.log(chalk.cyan('\n📊 Estatísticas:'));
        console.log(chalk.white(`  Total de arquivos: ${this.generatedFiles.length}`));
        console.log(chalk.white(`  Linhas de código: ${this.calculateTotalLines()}`));

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'O que deseja fazer agora?',
                choices: [
                    { name: '📂 Ver estrutura do projeto', value: 'structure' },
                    { name: '🔍 Visualizar um arquivo', value: 'view' },
                    { name: '💾 Salvar projeto em disco', value: 'save' },
                    { name: '🏠 Voltar ao menu', value: 'menu' }
                ]
            }
        ]);

        switch (action) {
            case 'structure':
                await this.showProjectStructure();
                break;
            case 'view':
                await this.viewFile();
                break;
            case 'save':
                await this.saveProject();
                break;
            case 'menu':
                const { showMenu } = require('../ui/menu');
                await showMenu();
                break;
        }
    }

    calculateTotalLines() {
        return this.generatedFiles.reduce((total, file) => {
            return total + (file.content ? file.content.split('\n').length : 0);
        }, 0);
    }

    async showProjectStructure() {
        console.log(chalk.cyan('\n🗂️  Estrutura do Projeto:\n'));
        
        // Organizar arquivos por pasta
        const structure = {};
        this.generatedFiles.forEach(file => {
            const parts = file.path.split('/');
            let current = structure;
            
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }
            
            current[parts[parts.length - 1]] = file;
        });

        this.printStructure(structure, 0);
        
        const { back } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'back',
                message: 'Pressione Enter para voltar'
            }
        ]);
        
        await this.showFinalResult();
    }

    printStructure(obj, indent) {
        const spacing = '  '.repeat(indent);
        
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object' && !obj[key].path) {
                console.log(chalk.blue(`${spacing}📁 ${key}/`));
                this.printStructure(obj[key], indent + 1);
            } else {
                console.log(chalk.white(`${spacing}📄 ${key}`));
            }
        });
    }

    async viewFile() {
        if (this.generatedFiles.length === 0) {
            console.log(chalk.yellow('Nenhum arquivo para visualizar'));
            return;
        }

        const { selectedFile } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedFile',
                message: 'Selecione um arquivo para visualizar:',
                choices: this.generatedFiles.map(file => ({
                    name: file.path,
                    value: file
                }))
            }
        ]);

        console.log(chalk.cyan(`\n📄 ${selectedFile.path}:\n`));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(selectedFile.content || 'Arquivo vazio');
        console.log(chalk.gray('─'.repeat(50)));

        await this.showFinalResult();
    }

    async saveProject() {
        const { ProjectSaver } = require('../utils/projectSaver');
        const saver = new ProjectSaver();
        
        try {
            const projectPath = await saver.save(this.projectContext, this.generatedFiles);
            console.log(chalk.green(`\n✅ Projeto salvo em: ${projectPath}\n`));
        } catch (error) {
            console.error(chalk.red('❌ Erro ao salvar projeto:'), error.message);
        }

        await this.showFinalResult();
    }
}

async function startCodeGeneration(refinedProject, executionPlan) {
    const orchestrator = new CodeGenerationOrchestrator();
    await orchestrator.start(refinedProject, executionPlan);
}

module.exports = { startCodeGeneration, CodeGenerationOrchestrator };