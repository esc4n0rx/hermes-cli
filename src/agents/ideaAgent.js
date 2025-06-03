const inquirer = require('inquirer');
const chalk = require('chalk');
const { ArceeClient } = require('../api/arceeClient');
const { showProgress } = require('../ui/animations');
const { startRefinement } = require('./refinerAgent');

const IDEA_AGENT_PROMPT = `
Você é o Agente de Ideias do Hermes, especialista em capturar e estruturar ideias de desenvolvimento.

Sua função é:
1. Analisar a ideia inicial do usuário
2. Fazer perguntas inteligentes para entender melhor o escopo
3. Capturar requisitos funcionais e não funcionais
4. Definir regras de negócio
5. Entender o público-alvo e contexto de uso

Sempre faça perguntas uma de cada vez, de forma conversacional e amigável.
Após cada resposta do usuário, analise se precisa de mais informações ou se já tem o suficiente.

Quando tiver informações suficientes, responda com: "ESCOPO_COMPLETO: [resumo detalhado do projeto]"

Seja conversational, técnico quando necessário, mas sempre acessível.
`;

class IdeaAgent {
    constructor() {
        this.client = new ArceeClient();
        this.conversation = [];
        this.projectScope = null;
    }

    async start(initialIdea) {
        console.log(chalk.blue('\n🧠 Agente de Ideias ativado!\n'));
        
        // Adicionar contexto inicial
        this.conversation.push({
            role: 'system',
            content: IDEA_AGENT_PROMPT
        });

        this.conversation.push({
            role: 'user',
            content: `Minha ideia inicial: ${initialIdea}`
        });

        await this.processConversation();
    }

    async processConversation() {
        try {
            await showProgress('Analisando sua ideia...', 1500);
            
            const response = await this.client.sendConversation(this.conversation);
            
            // Verificar se o escopo está completo
            if (response.includes('ESCOPO_COMPLETO:')) {
                this.projectScope = response.replace('ESCOPO_COMPLETO:', '').trim();
                await this.finishIdeaPhase();
                return;
            }

            // Continuar conversa
            console.log(chalk.cyan('🤖 Agente: ') + response + '\n');
            
            const { userResponse } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'userResponse',
                    message: chalk.green('Você: ')
                }
            ]);

            if (userResponse.toLowerCase() === 'sair') {
                console.log(chalk.yellow('🔙 Voltando ao menu principal...\n'));
                const { showMenu } = require('../ui/menu');
                await showMenu();
                return;
            }

            this.conversation.push({
                role: 'user',
                content: userResponse
            });

            await this.processConversation();

        } catch (error) {
            console.error(chalk.red('❌ Erro no Agente de Ideias:'), error.message);
        }
    }

    async finishIdeaPhase() {
        console.log(chalk.green('\n✅ Escopo da ideia capturado com sucesso!\n'));
        console.log(chalk.white('📋 Resumo do Projeto:'));
        console.log(chalk.gray(this.projectScope));
        
        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Deseja prosseguir para o refinamento?',
                default: true
            }
        ]);

        if (proceed) {
            // Passar para o agente refinador
            await startRefinement(this.projectScope, this.conversation);
        } else {
            const { showMenu } = require('../ui/menu');
            await showMenu();
        }
    }
}

async function startDevelopment() {
    console.log(chalk.cyan('\n🚀 Iniciando Desenvolvimento\n'));
    
    const { idea } = await inquirer.prompt([
        {
            type: 'input',
            name: 'idea',
            message: 'Descreva sua ideia de projeto:',
            validate: (input) => input.length > 0 || 'Por favor, descreva sua ideia'
        }
    ]);

    const ideaAgent = new IdeaAgent();
    await ideaAgent.start(idea);
}

module.exports = { startDevelopment, IdeaAgent };