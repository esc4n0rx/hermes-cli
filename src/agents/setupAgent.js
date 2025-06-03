const chalk = require('chalk');
const { ArceeClient } = require('../api/arceeClient');

const SETUP_AGENT_PROMPT = `
Você é o Agente de Setup do Hermes. Sua função é criar a estrutura inicial do projeto.

Com base no projeto fornecido, você deve criar:
1. package.json com dependências corretas
2. Estrutura de pastas
3. Arquivos de configuração (eslint, prettier, etc.)
4. README.md
5. .gitignore
6. Arquivos de ambiente (.env.example)
7. Scripts de desenvolvimento

Retorne um JSON com esta estrutura:
{
  "files": [
    {
      "path": "caminho/do/arquivo",
      "content": "conteúdo do arquivo",
      "type": "config|setup|documentation"
    }
  ]
}

Seja preciso e crie arquivos funcionais e bem estruturados.
`;

class SetupAgent {
    constructor() {
        this.client = new ArceeClient();
    }

    async execute(step, projectContext) {
        const project = projectContext.project;
        
        const prompt = `${SETUP_AGENT_PROMPT}

Projeto: ${JSON.stringify(project, null, 2)}

Passo atual: ${step.name}
Descrição: ${step.description}

Crie a estrutura inicial completa do projeto.`;

        try {
            const response = await this.client.sendMessage(prompt);
            const result = JSON.parse(response);
            
            // Adicionar arquivos padrão se não foram criados
            const defaultFiles = this.getDefaultFiles(project);
            const existingPaths = result.files.map(f => f.path);
            
            defaultFiles.forEach(file => {
                if (!existingPaths.includes(file.path)) {
                    result.files.push(file);
                }
            });

            return result;
        } catch (error) {
            console.error(chalk.red('❌ Erro no Setup Agent:'), error.message);
            return { files: this.getDefaultFiles(project) };
        }
    }

    getDefaultFiles(project) {
        const packageJson = {
            name: project.nome || 'projeto-hermes',
            version: '1.0.0',
            description: 'Projeto gerado pelo Hermes CLI',
            main: 'index.js',
            scripts: {
                start: 'node index.js',
                dev: 'nodemon index.js',
                test: 'jest',
                build: 'npm run build:prod'
            },
            dependencies: this.getDependencies(project),
            devDependencies: this.getDevDependencies(project)
        };

        const gitignore = `
node_modules/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
dist/
build/
coverage/
.DS_Store
*.log
`;

        const readme = `
# ${project.nome || 'Projeto Hermes'}

${project.descricao || 'Projeto gerado automaticamente pelo Hermes CLI'}

## Tecnologias Utilizadas

${this.getTechList(project)}

## Instalação

\`\`\`bash
npm install
\`\`\`

## Desenvolvimento

\`\`\`bash
npm run dev
\`\`\`

## Produção

\`\`\`bash
npm run build
npm start
\`\`\`

## Estrutura do Projeto

\`\`\`
${this.getProjectStructure(project)}
\`\`\`

---
*Gerado por Hermes CLI*
`;

        const envExample = `
# Configurações da aplicação
NODE_ENV=development
PORT=3000

# Banco de dados
DATABASE_URL=

# APIs externas
API_KEY=
`;

        return [
            {
                path: 'package.json',
                content: JSON.stringify(packageJson, null, 2),
                type: 'config'
            },
            {
                path: '.gitignore',
                content: gitignore.trim(),
                type: 'config'
            },
            {
                path: 'README.md',
                content: readme.trim(),
                type: 'documentation'
            },
            {
                path: '.env.example',
                content: envExample.trim(),
                type: 'config'
            }
        ];
    }

    getDependencies(project) {
        const deps = {};
        
        // Dependências baseadas nas tecnologias
        if (project.tecnologias?.backend?.includes('express')) {
            deps.express = '^4.18.0';
            deps.cors = '^2.8.5';
            deps.helmet = '^7.0.0';
        }
        
        if (project.tecnologias?.backend?.includes('fastify')) {
            deps.fastify = '^4.21.0';
        }
        
        if (project.tecnologias?.database?.includes('mongodb')) {
            deps.mongoose = '^7.4.0';
        }
        
        if (project.tecnologias?.database?.includes('postgres')) {
            deps.pg = '^8.11.0';
        }
        
        if (project.tecnologias?.frontend?.includes('react')) {
            deps.react = '^18.2.0';
            deps['react-dom'] = '^18.2.0';
        }
        
        if (project.tecnologias?.frontend?.includes('vue')) {
            deps.vue = '^3.3.0';
        }
        
        return deps;
    }

    getDevDependencies(project) {
        const devDeps = {
            nodemon: '^3.0.0',
            jest: '^29.6.0',
            eslint: '^8.45.0',
            prettier: '^3.0.0'
        };
        
        if (project.tecnologias?.frontend?.includes('react')) {
            devDeps['@vitejs/plugin-react'] = '^4.0.0';
            devDeps.vite = '^4.4.0';
        }
        
        return devDeps;
    }

    getTechList(project) {
        const techs = [];
        
        if (project.tecnologias?.frontend?.length > 0) {
            techs.push(`**Frontend:** ${project.tecnologias.frontend.join(', ')}`);
        }
        
        if (project.tecnologias?.backend?.length > 0) {
            techs.push(`**Backend:** ${project.tecnologias.backend.join(', ')}`);
        }
        
        if (project.tecnologias?.database) {
            techs.push(`**Database:** ${project.tecnologias.database}`);
        }
        
        return techs.join('\n');
    }

    getProjectStructure(project) {
        let structure = `
├── src/
│   ├── components/
│   ├── services/
│   ├── utils/
│   └── index.js
├── public/
├── tests/
├── package.json
├── README.md
└── .gitignore
`;
        
        return structure.trim();
    }
}

module.exports = { SetupAgent };