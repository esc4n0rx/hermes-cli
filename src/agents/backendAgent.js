const chalk = require('chalk');
const { ArceeClient } = require('../api/arceeClient');

const BACKEND_AGENT_PROMPT = `
Você é o Agente de Backend do Hermes. Especialista em criar APIs, serviços e infraestrutura backend.

Sua função é criar:
1. APIs REST/GraphQL
2. Middleware e autenticação
3. Modelos de dados
4. Serviços e controladores
5. Configuração de banco de dados
6. Validação e tratamento de erros

Sempre crie código robusto, escalável e com boas práticas de segurança.

Retorne um JSON com esta estrutura:
{
  "files": [
    {
      "path": "caminho/do/arquivo",
      "content": "conteúdo do arquivo",
      "type": "route|model|service|config|middleware"
    }
  ]
}

Use as melhores práticas da tecnologia escolhida.
`;

class BackendAgent {
    constructor() {
        this.client = new ArceeClient();
    }

    async execute(step, projectContext) {
        const project = projectContext.project;
        
        const prompt = `${BACKEND_AGENT_PROMPT}

Projeto: ${JSON.stringify(project, null, 2)}

Módulo atual: ${step.name}
Descrição: ${step.description}
Tipo: ${step.type}
Prioridade: ${step.priority}

Arquivos já criados: ${JSON.stringify(projectContext.files.map(f => f.path), null, 2)}

Crie o backend para este módulo.`;

        try {
            const response = await this.client.sendMessage(prompt);
            const result = JSON.parse(response);
            
            // Adicionar arquivos base se for o primeiro módulo de backend
            if (this.isFirstBackendModule(projectContext)) {
                const baseFiles = this.getBaseBackendFiles(project);
                result.files.unshift(...baseFiles);
            }
            
            return result;
        } catch (error) {
            console.error(chalk.red('❌ Erro no Backend Agent:'), error.message);
            return { files: this.getFallbackBackendFiles(step, project) };
        }
    }

    isFirstBackendModule(projectContext) {
        return !projectContext.files.some(f => 
            f.type === 'route' || f.path.includes('server') || f.path.includes('api')
        );
    }

    getBaseBackendFiles(project) {
        const isExpress = project.tecnologias?.backend?.includes('express');
        const isFastify = project.tecnologias?.backend?.includes('fastify');
        
        if (isExpress) {
            return this.getExpressBaseFiles(project);
        } else if (isFastify) {
            return this.getFastifyBaseFiles(project);
        } else {
            return this.getNodeBaseFiles(project);
        }
    }

    getExpressBaseFiles(project) {
        const serverJs = `
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.get('/', (req, res) => {
    res.json({
        message: 'API ${project.nome || 'Hermes'} funcionando!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Algo deu errado!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
    });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada'
    });
});

app.listen(PORT, () => {
    console.log(\`🚀 Servidor rodando na porta \${PORT}\`);
    console.log(\`📍 Acesse: http://localhost:\${PORT}\`);
});

module.exports = app;
`;

        const middlewareAuth = `
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
    );
};

module.exports = {
    authenticateToken,
    generateToken
};
`;

        const validationMiddleware = `
const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }
    next();
};

// Validações comuns
const validateEmail = body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido');

const validatePassword = body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres');

const validateRequired = (field) => 
    body(field)
        .notEmpty()
        .withMessage(\`\${field} é obrigatório\`);

module.exports = {
    handleValidationErrors,
    validateEmail,
    validatePassword,
    validateRequired
};
`;

        const databaseConfig = this.getDatabaseConfig(project);

        return [
            {
                path: 'server.js',
                content: serverJs.trim(),
                type: 'config'
            },
            {
                path: 'middleware/auth.js',
                content: middlewareAuth.trim(),
                type: 'middleware'
            },
            {
                path: 'middleware/validation.js',
                content: validationMiddleware.trim(),
                type: 'middleware'
            },
            ...databaseConfig
        ];
    }

    getFastifyBaseFiles(project) {
        const serverJs = `
const fastify = require('fastify')({ logger: true });

// Registrar plugins
fastify.register(require('@fastify/cors'), {
    origin: true
});

fastify.register(require('@fastify/helmet'));

// Rota raiz
fastify.get('/', async (request, reply) => {
    return {
        message: 'API ${project.nome || 'Hermes'} funcionando!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    };
});

// Tratamento de erros
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply.status(500).send({
        error: 'Algo deu errado!',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor'
    });
});

// Iniciar servidor
const start = async () => {
    try {
        const PORT = process.env.PORT || 3000;
        await fastify.listen({ port: PORT });
        console.log(\`🚀 Servidor rodando na porta \${PORT}\`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
`;

        return [
            {
                path: 'server.js',
                content: serverJs.trim(),
                type: 'config'
            }
        ];
    }

    getNodeBaseFiles(project) {
        const serverJs = `
const http = require('http');
const url = require('url');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;

// Roteador simples
const router = {
    'GET /': (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'API ${project.nome || 'Hermes'} funcionando!',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        }));
    }
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;
    const route = \`\${method} \${path}\`;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Buscar rota
    const handler = router[route];
    
    if (handler) {
        handler(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Rota não encontrada' }));
    }
});

server.listen(PORT, () => {
    console.log(\`🚀 Servidor rodando na porta \${PORT}\`);
    console.log(\`📍 Acesse: http://localhost:\${PORT}\`);
});
`;

        return [
            {
                path: 'server.js',
                content: serverJs.trim(),
                type: 'config'
            }
        ];
    }

    getDatabaseConfig(project) {
        const dbType = project.tecnologias?.database;
        
        if (dbType?.includes('mongodb')) {
            return this.getMongoConfig();
        } else if (dbType?.includes('postgres')) {
            return this.getPostgresConfig();
        } else if (dbType?.includes('mysql')) {
            return this.getMySQLConfig();
        }
        
        return [];

    }

    getMongoConfig() {
        const mongoConfig = `
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hermes_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(\`📊 MongoDB conectado: \${conn.connection.host}\`);
    } catch (error) {
        console.error('❌ Erro ao conectar com MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
`;

        const baseModel = `
const mongoose = require('mongoose');

const baseSchema = {
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
};

// Middleware para atualizar updatedAt
const updateTimestamp = function(next) {
    this.updatedAt = Date.now();
    next();
};

module.exports = {
    baseSchema,
    updateTimestamp
};
`;

        return [
            {
                path: 'config/database.js',
                content: mongoConfig.trim(),
                type: 'config'
            },
            {
                path: 'models/base.js',
                content: baseModel.trim(),
                type: 'model'
            }
        ];
    }

    getPostgresConfig() {
        const pgConfig = `
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hermes_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log('📊 PostgreSQL conectado');
        client.release();
    } catch (error) {
        console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
        process.exit(1);
    }
};

module.exports = {
    pool,
    connectDB
};
`;

        const migrations = `
-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE
    ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

        return [
            {
                path: 'config/database.js',
                content: pgConfig.trim(),
                type: 'config'
            },
            {
                path: 'migrations/001_initial.sql',
                content: migrations.trim(),
                type: 'config'
            }
        ];
    }

    getMySQLConfig() {
        const mysqlConfig = `
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hermes_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('📊 MySQL conectado');
        connection.release();
    } catch (error) {
        console.error('❌ Erro ao conectar com MySQL:', error.message);
        process.exit(1);
    }
};

module.exports = {
    pool,
    connectDB
};
`;

        return [
            {
                path: 'config/database.js',
                content: mysqlConfig.trim(),
                type: 'config'
            }
        ];
    }

    getFallbackBackendFiles(step, project) {
        const routeName = step.name.toLowerCase().replace(/\s+/g, '-');
        
        const routeFile = `
const express = require('express');
const router = express.Router();

// GET /${routeName}
router.get('/', async (req, res) => {
    try {
        res.json({
            message: '${step.name} funcionando',
            description: '${step.description}'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /${routeName}
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        
        // Implementar lógica aqui
        
        res.status(201).json({
            message: '${step.name} criado com sucesso',
            data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
`;

        return [
            {
                path: `routes/${routeName}.js`,
                content: routeFile.trim(),
                type: 'route'
            }
        ];
    }
}

module.exports = { BackendAgent };