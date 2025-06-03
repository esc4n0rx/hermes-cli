const chalk = require('chalk');
const { ArceeClient } = require('../api/arceeClient');

const ASSEMBLER_AGENT_PROMPT = `
Você é o Agente Montador do Hermes. Sua função é integrar todos os componentes criados pelos outros agentes.

Suas responsabilidades:
1. Conectar frontend com backend
2. Configurar roteamento completo
3. Criar testes de integração
4. Configurar scripts de build/deploy
5. Documentar APIs
6. Configurar ambiente de desenvolvimento
7. Criar arquivos de exemplo/seed

Analise todos os arquivos criados e faça as integrações necessárias.

Retorne um JSON com esta estrutura:
{
  "files": [
    {
      "path": "caminho/do/arquivo",
      "content": "conteúdo do arquivo",
      "type": "integration|test|config|documentation"
    }
  ],
  "instructions": [
    "Instrução de setup 1",
    "Instrução de setup 2"
  ]
}

Garanta que tudo funcione em conjunto perfeitamente.
`;

class AssemblerAgent {
    constructor() {
        this.client = new ArceeClient();
    }

    async execute(step, projectContext) {
        const project = projectContext.project;
        const existingFiles = projectContext.files;
        
        const prompt = `${ASSEMBLER_AGENT_PROMPT}

Projeto: ${JSON.stringify(project, null, 2)}

Arquivos existentes:
${existingFiles.map(f => `- ${f.path} (${f.type})`).join('\n')}

Passo: ${step.name}
Descrição: ${step.description}

Integre todos os componentes e crie os arquivos finais necessários.`;

        try {
            const response = await this.client.sendMessage(prompt);
            const result = JSON.parse(response);
            
            // Adicionar arquivos de integração padrão
            const integrationFiles = this.getIntegrationFiles(project, existingFiles);
            result.files.push(...integrationFiles);
            
            return result;
        } catch (error) {
            console.error(chalk.red('❌ Erro no Assembler Agent:'), error.message);
            return { 
                files: this.getIntegrationFiles(project, existingFiles),
                instructions: this.getDefaultInstructions(project)
            };
        }
    }

    getIntegrationFiles(project, existingFiles) {
        const files = [];
        
        // Verificar se há frontend e backend
        const hasFrontend = existingFiles.some(f => f.type === 'component' || f.path.includes('src/components'));
        const hasBackend = existingFiles.some(f => f.type === 'route' || f.path.includes('server'));
        
        if (hasFrontend && hasBackend) {
            files.push(...this.getFullStackIntegration(project, existingFiles));
        }
        
        // Testes
        files.push(...this.getTestFiles(project, existingFiles));
        
        // Documentação
        files.push(...this.getDocumentationFiles(project, existingFiles));
        
        // Scripts e configurações
        files.push(...this.getBuildConfig(project, existingFiles));
        
        return files;
    }

    getFullStackIntegration(project, existingFiles) {
        const files = [];
        
        // API Service para o frontend
        const apiService = `
class ApiService {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    }

    async request(endpoint, options = {}) {
        const url = \`\${this.baseURL}\${endpoint}\`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(\`HTTP error! status: \${response.status}\`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Métodos de conveniência
    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: data
        });
    }

    put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: data
        });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}

export default new ApiService();
`;

        files.push({
            path: 'src/services/api.js',
            content: apiService.trim(),
            type: 'integration'
        });

        // Environment files
        const envDevelopment = `
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENV=development
`;

        const envProduction = `
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_ENV=production
`;

        files.push(
            {
                path: '.env.development',
                content: envDevelopment.trim(),
                type: 'config'
            },
            {
                path: '.env.production',
                content: envProduction.trim(),
                type: 'config'
            }
        );

        return files;
    }

    getTestFiles(project, existingFiles) {
        const files = [];
        
        // Jest config
        const jestConfig = `
module.exports = {
    testEnvironment: 'node',
    collectCoverageFrom: [
        'src/**/*.{js,jsx}',
        '!src/index.js',
        '!src/serviceWorker.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
        '<rootDir>/src/**/?(*.)(spec|test).{js,jsx}'
    ],
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};
`;

        const setupTests = `
// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Global test setup
beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
});
`;

        // Teste de exemplo
        const exampleTest = `
const request = require('supertest');
const app = require('../server');

describe('API Tests', () => {
    test('GET / should return welcome message', async () => {
        const response = await request(app)
            .get('/')
            .expect(200);
        
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('funcionando');
    });
    
    test('GET /nonexistent should return 404', async () => {
        await request(app)
            .get('/nonexistent')
            .expect(404);
    });
});
`;

        files.push(
            {
                path: 'jest.config.js',
                content: jestConfig.trim(),
                type: 'config'
            },
            {
                path: 'src/setupTests.js',
                content: setupTests.trim(),
                type: 'test'
            },
            {
                path: 'tests/api.test.js',
                content: exampleTest.trim(),
                type: 'test'
            }
        );

        return files;
    }

    getDocumentationFiles(project, existingFiles) {
        const files = [];
        
        // API Documentation
        const apiDocs = `
# API Documentation

## Base URL
\`\`\`
${project.nome ? `https://${project.nome.toLowerCase().replace(/\s+/g, '-')}.com/api` : 'http://localhost:3000'}
\`\`\`

## Authentication
This API uses JWT tokens for authentication.

Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Endpoints

### Health Check
- **GET** \`/\`
- **Description**: Check if API is running
- **Response**:
\`\`\`json
{
  "message": "API funcionando!",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

${this.generateEndpointDocs(existingFiles)}

## Error Responses
All endpoints may return these error responses:

### 400 Bad Request
\`\`\`json
{
  "error": "Dados inválidos",
  "details": [
    {
      "field": "email",
      "message": "Email é obrigatório"
    }
  ]
}
\`\`\`

### 401 Unauthorized
\`\`\`json
{
  "error": "Token de acesso requerido"
}
\`\`\`

### 500 Internal Server Error
\`\`\`json
{
  "error": "Algo deu errado!",
  "message": "Erro interno do servidor"
}
\`\`\`
`;

        // Development Guide
        const devGuide = `
# Development Guide

## Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
${project.tecnologias?.database?.includes('mongodb') ? '- MongoDB' : ''}
${project.tecnologias?.database?.includes('postgres') ? '- PostgreSQL' : ''}

## Setup

1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd ${project.nome?.toLowerCase().replace(/\s+/g, '-') || 'projeto-hermes'}
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Environment setup
\`\`\`bash
cp .env.example .env
# Edit .env with your configurations
\`\`\`

4. Database setup
${this.getDatabaseSetupInstructions(project)}

5. Start development server
\`\`\`bash
npm run dev
\`\`\`

## Available Scripts

- \`npm start\` - Start production server
- \`npm run dev\` - Start development server with hot reload
- \`npm test\` - Run tests
- \`npm run build\` - Build for production
- \`npm run lint\` - Run linter

## Project Structure

\`\`\`
${this.generateProjectStructure(existingFiles)}
\`\`\`

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Run tests and linting
5. Submit a pull request
`;

        files.push(
            {
                path: 'docs/API.md',
                content: apiDocs.trim(),
                type: 'documentation'
            },
            {
                path: 'docs/DEVELOPMENT.md',
                content: devGuide.trim(),
                type: 'documentation'
            }
        );

        return files;
    }

    getBuildConfig(project, existingFiles) {
        const files = [];
        
        // Docker configuration
        const dockerfile = `
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
`;

        const dockerCompose = `
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      ${project.tecnologias?.database?.includes('mongodb') ? '- mongodb' : ''}
      ${project.tecnologias?.database?.includes('postgres') ? '- postgres' : ''}

${project.tecnologias?.database?.includes('mongodb') ? `
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
` : ''}

${project.tecnologias?.database?.includes('postgres') ? `
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=hermes_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
` : ''}
`;

        // GitHub Actions
        const githubActions = `
name: CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    - run: npm run lint
    - run: npm test
    
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: echo "Add your deployment steps here"
`;

        files.push(
            {
                path: 'Dockerfile',
                content: dockerfile.trim(),
                type: 'config'
            },
            {
                path: 'docker-compose.yml',
                content: dockerCompose.trim(),
                type: 'config'
            },
            {
                path: '.github/workflows/ci.yml',
                content: githubActions.trim(),
                type: 'config'
            }
        );

        return files;
    }

    generateEndpointDocs(existingFiles) {
        const routeFiles = existingFiles.filter(f => f.type === 'route');
        
        if (routeFiles.length === 0) {
            return '### No custom endpoints defined yet';
        }

        return routeFiles.map(file => {
            const routeName = file.path.split('/').pop().replace('.js', '');
            return `
### ${routeName.charAt(0).toUpperCase() + routeName.slice(1)}
- **GET** \`/${routeName}\`
- **POST** \`/${routeName}\`
- **Description**: Auto-generated endpoint for ${routeName}
`;
        }).join('\n');
    }

    getDatabaseSetupInstructions(project) {
        const dbType = project.tecnologias?.database;
        
        if (dbType?.includes('mongodb')) {
            return `\`\`\`bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongo mongo:latest
# or install locally and start mongod
\`\`\``;
        } else if (dbType?.includes('postgres')) {
            return `\`\`\`bash
# Start PostgreSQL
docker run -d -p 5432:5432 --name postgres -e POSTGRES_PASSWORD=password postgres:15
# Create database
createdb hermes_db
\`\`\``;
        }
        
        return '# No database setup required';
    }

    generateProjectStructure(existingFiles) {
        const structure = {};
        
        existingFiles.forEach(file => {
            const parts = file.path.split('/');
            let current = structure;
            
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }
            
            current[parts[parts.length - 1]] = true;
        });

        return this.structureToString(structure, 0);
    }

    structureToString(obj, indent) {
        const spacing = '│   '.repeat(indent);
        let result = '';
        
        Object.keys(obj).forEach((key, index, array) => {
            const isLast = index === array.length - 1;
            const prefix = isLast ? '└── ' : '├── ';
            
            if (typeof obj[key] === 'object') {
                result += `${spacing}${prefix}${key}/\n`;
                result += this.structureToString(obj[key], indent + 1);
            } else {
                result += `${spacing}${prefix}${key}\n`;
            }
        });
        
        return result;
    }

    getDefaultInstructions(project) {
        return [
            '1. Execute npm install para instalar dependências',
            '2. Configure as variáveis de ambiente no arquivo .env',
            '3. Configure o banco de dados se necessário',
            '4. Execute npm run dev para iniciar o desenvolvimento',
            '5. Execute npm test para rodar os testes',
            '6. Consulte docs/DEVELOPMENT.md para mais informações'
        ];
    }
}

module.exports = { AssemblerAgent };