const chalk = require('chalk');
const inquirer = require('inquirer');
const { ArceeClient } = require('../api/arceeClient');
const { showProgress } = require('../ui/animations');
const { startArchitecture } = require('./architectAgent');

const REFINER_AGENT_PROMPT = `
Você é o Agente Refinador do Hermes. Sua função é pegar o escopo inicial e refiná-lo tecnicamente.

Você deve:
1. Analisar o escopo fornecido
2. Definir a arquitetura do projeto
3. Identificar tecnologias necessárias
4. Dividir o projeto em módulos/componentes
5. Definir estrutura de pastas
6. Especificar dependências

Retorne sua análise no seguinte formato JSON:
{
  "arquitetura": "tipo de arquitetura (SPA, API REST, Full-stack, etc)",
  "tecnologias": {
    "frontend": ["tecnologia1", "tecnologia2"],
    "backend": ["tecnologia1"],
    "database": "tipo do banco",
    "outros": ["ferramenta1", "ferramenta2"]
  },
  "modulos": [
    {
      "nome": "Nome do Módulo",
      "descricao": "Descrição",
      "tipo": "frontend/backend/shared",
      "prioridade": "alta/media/baixa"
    }
  ],
  "estrutura": {
    "pastas": ["pasta1", "pasta2"],
    "arquivos_principais": ["arquivo1.js", "arquivo2.js"]
  },
  "dependencias": ["dep1", "dep2"]
}

Seja preciso e técnico, mas mantenha praticidade.
`;

class RefinerAgent {
    constructor() {
        this.client = new ArceeClient();
        this.refinedProject = null;
    }

    async start(projectScope, previousConversation) {
        console.log(chalk.blue('\n🔧 Agente Refinador ativado!\n'));
        
        try {
            await showProgress('Refinando e estruturando o projeto...', 2000);
            
            const prompt = `${REFINER_AGENT_PROMPT}\n\nEscopo do projeto:\n${projectScope}`;
            
            const response = await this.client.sendMessage(prompt);
            
            // Tentar parsear JSON
            try {
                this.refinedProject = JSON.parse(response);
                await this.showRefinedProject();
            } catch (jsonError) {
                console.log(chalk.yellow('⚠️  Resposta não estava em JSON, processando como texto...\n'));
                console.log(chalk.white(response));
                await this.handleNonJsonResponse(response);
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Erro no Agente Refinador:'), error.message);
        }
    }

    async showRefinedProject() {
        console.log(chalk.green('✅ Projeto refinado com sucesso!\n'));
        
        console.log(chalk.cyan('🏗️  Arquitetura: ') + chalk.white(this.refinedProject.arquitetura));
        
        console.log(chalk.cyan('\n💻 Tecnologias:'));
        if (this.refinedProject.tecnologias.frontend?.length > 0) {
            console.log(chalk.white('  Frontend: ') + this.refinedProject.tecnologias.frontend.join(', '));
        }
        if (this.refinedProject.tecnologias.backend?.length > 0) {
            console.log(chalk.white('  Backend: ') + this.refinedProject.tecnologias.backend.join(', '));
        }
        if (this.refinedProject.tecnologias.database) {
            console.log(chalk.white('  Database: ') + this.refinedProject.tecnologias.database);
        }
        
        console.log(chalk.cyan('\n📦 Módulos:'));
        this.refinedProject.modulos?.forEach((modulo, index) => {
            const prioColor = modulo.prioridade === 'alta' ? chalk.red : 
                            modulo.prioridade === 'media' ? chalk.yellow : chalk.green;
            console.log(chalk.white(`  ${index + 1}. ${modulo.nome}`) + 
                       ` ${prioColor(`[${modulo.prioridade}]`)}`);
            console.log(chalk.gray(`     ${modulo.descricao}`));
        });

        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Prosseguir para a geração de código?',
                default: true
            }
        ]);

        if (proceed) {
            await startArchitecture(this.refinedProject);
        } else {
            const { showMenu } = require('../ui/menu');
            await showMenu();
        }
    }

    async handleNonJsonResponse(response) {
        console.log(chalk.yellow('🔄 Tentando reprocessar a resposta...\n'));
        
        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Deseja tentar novamente com o refinamento?',
                default: true
            }
        ]);

        if (proceed) {
            const retryPrompt = `${REFINER_AGENT_PROMPT}\n\nATENÇÃO: Retorne APENAS o JSON válido, sem texto adicional.\n\nResposta anterior:\n${response}`;
            
            try {
                await showProgress('Reprocessando...', 1500);
                const retryResponse = await this.client.sendMessage(retryPrompt);
                this.refinedProject = JSON.parse(retryResponse);
                await this.showRefinedProject();
            } catch (error) {
                console.log(chalk.red('❌ Erro persistente. Voltando ao menu...'));
                const { showMenu } = require('../ui/menu');
                await showMenu();
            }
        }
    }
}

async function startRefinement(projectScope, previousConversation) {
    const refiner = new RefinerAgent();
    await refiner.start(projectScope, previousConversation);
}

module.exports = { startRefinement, RefinerAgent };