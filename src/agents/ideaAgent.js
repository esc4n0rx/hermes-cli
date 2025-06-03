const inquirer = require('inquirer');
const chalk = require('chalk');
const { ArceeClient } = require('../api/arceeClient');
const { showProgress } = require('../ui/animations');
const { startRefinement } = require('./refinerAgent');

const IDEA_AGENT_PROMPT = `
Você é o Agente de Ideias do Hermes. Sua função é extrair rapidamente as informações essenciais do projeto.

SEJA DIRETO E EFICIENTE:
- Faça no máximo 3 perguntas estratégicas
- Capture apenas informações cruciais para desenvolvimento
- Evite perguntas óbvias ou detalhes secundários
- Use perguntas objetivas que geram respostas práticas

Informações OBRIGATÓRIAS para capturar:
1. Tipo de aplicação (web app, mobile, desktop, API)
2. Funcionalidades principais (máximo 3-5)
3. Tecnologias preferidas (se houver)

Quando tiver essas informações essenciais, responda: "ESCOPO_COMPLETO: [resumo conciso e técnico]"

NUNCA faça mais de 3 perguntas. Seja assertivo, prático e vá direto ao ponto.
`;

class IdeaAgent {
    constructor() {
        this.client = new ArceeClient();
        this.conversation = [];
        this.questionCount = 0;
        this.maxQuestions = 3;
        this.projectScope = null;
    }

    async start(initialIdea) {
        console.log(chalk.blue('\n🧠 Agente de Ideias ativado!\n'));
        console.log(chalk.gray('⚡ Modo eficiente: máximo 3 perguntas estratégicas\n'));
        
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
            await showProgress('Analisando sua ideia...', 1000);
            
            const response = await this.client.sendConversation(this.conversation);
            
            // Verificar se o escopo está completo
            if (response.includes('ESCOPO_COMPLETO:')) {
                this.projectScope = response.replace('ESCOPO_COMPLETO:', '').trim();
                await this.finishIdeaPhase();
                return;
            }

            // Forçar conclusão se atingir limite de perguntas
            if (this.questionCount >= this.maxQuestions) {
                console.log(chalk.yellow('\n⚡ Limite de perguntas atingido. Finalizando com informações coletadas...\n'));
                this.projectScope = this.generateScopeFromConversation();
                await this.finishIdeaPhase();
                return;
            }

            this.questionCount++;
            console.log(chalk.cyan('🤖 Agente: ') + response + '\n');
            console.log(chalk.gray(`(Pergunta ${this.questionCount}/${this.maxQuestions})\n`));
            
            const { userResponse } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'userResponse',
                    message: chalk.green('Você: '),
                    validate: (input) => input.trim().length > 0 || 'Resposta é obrigatória'
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
            
            // Tentar usar informações já coletadas
            if (this.conversation.length > 2) {
                console.log(chalk.yellow('🔄 Tentando finalizar com informações parciais...'));
                this.projectScope = this.generateScopeFromConversation();
                await this.finishIdeaPhase();
            } else {
                const { showMenu } = require('../ui/menu');
                await showMenu();
            }
        }
    }

    generateScopeFromConversation() {
        // Extrair informações básicas da conversa se não obteve escopo completo
        const userMessages = this.conversation
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content)
            .join(' ');
        
        // Tentar identificar elementos básicos
        const hasWeb = /web|site|página|frontend|react|vue|html/i.test(userMessages);
        const hasMobile = /mobile|app|android|ios|react native/i.test(userMessages);
        const hasAPI = /api|backend|servidor|database|banco/i.test(userMessages);
        
        let projectType = 'Aplicação Web';
        if (hasMobile && !hasWeb) projectType = 'Aplicação Mobile';
        if (hasAPI && !hasWeb && !hasMobile) projectType = 'API/Backend';
        if (hasWeb && hasMobile) projectType = 'Aplicação Full-stack';
        
        return `${projectType} baseado em: ${userMessages}. Funcionalidades a serem refinadas no próximo agente.`;
    }

    async finishIdeaPhase() {
        console.log(chalk.green('\n✅ Escopo da ideia capturado com sucesso!\n'));
        console.log(chalk.white('📋 Resumo do Projeto:'));
        console.log(chalk.gray(this.projectScope));
        console.log(chalk.cyan(`\n💡 Total de interações: ${this.questionCount}/${this.maxQuestions}\n`));
        
        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Deseja prosseguir para o refinamento técnico?',
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
            validate: (input) => {
                if (input.length < 10) return 'Descreva sua ideia com mais detalhes (mínimo 10 caracteres)';
                return true;
            }
        }
    ]);

    const ideaAgent = new IdeaAgent();
    await ideaAgent.start(idea);
}

module.exports = { startDevelopment, IdeaAgent };