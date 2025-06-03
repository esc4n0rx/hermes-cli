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

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, texto adicional ou explicações.

Formato JSON obrigatório:
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
      "descricao": "Descrição concisa",
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

Seja preciso, técnico e retorne apenas o JSON.
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
            
            const prompt = `${REFINER_AGENT_PROMPT}

Escopo do projeto:
${projectScope}`;
            
            const response = await this.client.sendMessage(prompt);
            
            // Limpar resposta de markdown e extrair JSON
            const cleanedResponse = this.extractJSON(response);
            
            try {
                this.refinedProject = JSON.parse(cleanedResponse);
                // Validar estrutura básica
                if (!this.validateProjectStructure(this.refinedProject)) {
                    throw new Error('Estrutura JSON inválida');
                }
                await this.showRefinedProject();
            } catch (jsonError) {
                console.log(chalk.yellow('⚠️  Erro no parsing JSON, tentando novamente...\n'));
                await this.retryWithBetterPrompt(response, projectScope);
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Erro no Agente Refinador:'), error.message);
            console.log(chalk.yellow('🔄 Usando estrutura de fallback...\n'));
            await this.useFallbackStructure(projectScope);
        }
    }

    extractJSON(response) {
        // Remover blocos de código markdown
        let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Remover texto antes e depois do JSON
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        
        // Limpar caracteres problemáticos
        cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        
        return cleaned.trim();
    }

    validateProjectStructure(project) {
        return project && 
               project.arquitetura && 
               project.tecnologias && 
               project.modulos && 
               Array.isArray(project.modulos) &&
               project.modulos.length > 0;
    }

    async retryWithBetterPrompt(previousResponse, projectScope) {
        const retryPrompt = `RETORNE APENAS JSON VÁLIDO. Nenhum texto adicional.

Baseado no projeto: ${projectScope}

Crie um JSON com esta estrutura exata:
{
  "arquitetura": "string",
  "tecnologias": {
    "frontend": ["array"],
    "backend": ["array"], 
    "database": "string",
    "outros": ["array"]
  },
  "modulos": [
    {
      "nome": "string",
      "descricao": "string",
      "tipo": "frontend/backend/shared",
      "prioridade": "alta/media/baixa"
    }
  ],
  "estrutura": {
    "pastas": ["array"],
    "arquivos_principais": ["array"]
  },
  "dependencias": ["array"]
}`;

        try {
            await showProgress('Reprocessando resposta...', 1000);
            const retryResponse = await this.client.sendMessage(retryPrompt);
            const cleanedRetry = this.extractJSON(retryResponse);
            
            this.refinedProject = JSON.parse(cleanedRetry);
            
            if (!this.validateProjectStructure(this.refinedProject)) {
                throw new Error('Estrutura ainda inválida');
            }
            
            await this.showRefinedProject();
        } catch (error) {
            console.log(chalk.red('❌ Erro persistente no JSON. Usando fallback...'));
            await this.useFallbackStructure(projectScope);
        }
    }

    async useFallbackStructure(projectScope) {
        // Analisar o escopo para determinar tecnologias mais apropriadas
        const scopeLower = projectScope.toLowerCase();
        
        // Detectar tipo de aplicação
        const isWeb = scopeLower.includes('web') || scopeLower.includes('site') || scopeLower.includes('página');
        const isMobile = scopeLower.includes('mobile') || scopeLower.includes('app');
        const isAPI = scopeLower.includes('api') || scopeLower.includes('backend') || scopeLower.includes('servidor');
        
        // Detectar tecnologias mencionadas
        const hasReact = scopeLower.includes('react');
        const hasVue = scopeLower.includes('vue');
        const hasNext = scopeLower.includes('next');
        const hasNode = scopeLower.includes('node');
        const hasExpress = scopeLower.includes('express');
        
        // Estrutura de fallback baseada no escopo
        this.refinedProject = {
            arquitetura: isAPI ? "API REST" : isMobile ? "Aplicação Mobile" : "Single Page Application (SPA)",
            tecnologias: {
                frontend: hasReact || hasNext ? ["React"] : hasVue ? ["Vue.js"] : isWeb ? ["React"] : [],
                backend: hasNode || hasExpress ? ["Node.js", "Express"] : isAPI || isWeb ? ["Node.js", "Express"] : [],
                database: scopeLower.includes('postgres') ? "PostgreSQL" : scopeLower.includes('mysql') ? "MySQL" : "MongoDB",
                outros: ["Jest", "ESLint"]
            },
            modulos: [
                {
                    nome: "Interface Principal",
                    descricao: "Componente principal da aplicação",
                    tipo: "frontend",
                    prioridade: "alta"
                },
                {
                    nome: "API Backend", 
                    descricao: "Serviços e rotas da aplicação",
                    tipo: "backend",
                    prioridade: "alta"
                },
                {
                    nome: "Configuração e Setup",
                    descricao: "Arquivos de configuração e inicialização",
                    tipo: "shared",
                    prioridade: "alta"
                }
            ],
            estrutura: {
                pastas: ["src", "public", "api", "components", "utils"],
                arquivos_principais: ["index.js", "App.js", "server.js", "package.json"]
            },
            dependencias: hasReact ? ["react", "react-dom"] : hasVue ? ["vue"] : ["react", "react-dom"]
        };

        console.log(chalk.green('✅ Estrutura padrão criada baseada no escopo. Prosseguindo...\n'));
        await this.showRefinedProject();
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
                message: 'Prosseguir para a arquitetura e geração de código?',
                default: true
            }
        ]);

        if (proceed) {
            await startArchitecture(this.refinedProject);
        } else {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'O que deseja fazer?',
                    choices: [
                        { name: '🔄 Tentar refinamento novamente', value: 'retry' },
                        { name: '🏠 Voltar ao menu', value: 'menu' }
                    ]
                }
            ]);

            if (action === 'retry') {
                // Reiniciar processo
                const { startRefinement } = require('./refinerAgent');
                await startRefinement(this.projectScope, []);
            } else {
                const { showMenu } = require('../ui/menu');
                await showMenu();
            }
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
            await this.retryWithBetterPrompt(response);
        } else {
            const { showMenu } = require('../ui/menu');
            await showMenu();
        }
    }
}

async function startRefinement(projectScope, previousConversation) {
    const refiner = new RefinerAgent();
    await refiner.start(projectScope, previousConversation);
}

module.exports = { startRefinement, RefinerAgent };