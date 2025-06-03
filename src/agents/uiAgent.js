const chalk = require('chalk');
const { ArceeClient } = require('../api/arceeClient');

const UI_AGENT_PROMPT = `
Você é o Agente de UI/Frontend do Hermes. Especialista em criar interfaces de usuário funcionais e bem estruturadas.

Sua função é criar:
1. Componentes React/Vue/HTML conforme a tecnologia escolhida
2. Estilos CSS/SCSS/Tailwind
3. Lógica de estado e interação
4. Roteamento se necessário
5. Integração com APIs

Sempre crie código funcional, limpo e bem comentado.
Use boas práticas da tecnologia escolhida.

Retorne um JSON com esta estrutura:
{
  "files": [
    {
      "path": "caminho/do/arquivo",
      "content": "conteúdo do arquivo",
      "type": "component|style|config|page"
    }
  ]
}

Seja criativo mas mantenha funcionalidade.
`;

class UIAgent {
    constructor() {
        this.client = new ArceeClient();
    }

    async execute(step, projectContext) {
        const project = projectContext.project;
        
        const prompt = `${UI_AGENT_PROMPT}

Projeto: ${JSON.stringify(project, null, 2)}

Módulo atual: ${step.name}
Descrição: ${step.description}
Tipo: ${step.type}
Prioridade: ${step.priority}

Arquivos já criados: ${JSON.stringify(projectContext.files.map(f => f.path), null, 2)}

Crie os componentes e arquivos de UI para este módulo.`;

        try {
            const response = await this.client.sendMessage(prompt);
            const result = JSON.parse(response);
            
            // Adicionar arquivos base se for o primeiro módulo de UI
            if (this.isFirstUIModule(projectContext)) {
                const baseFiles = this.getBaseUIFiles(project);
                result.files.unshift(...baseFiles);
            }
            
            return result;
        } catch (error) {
            console.error(chalk.red('❌ Erro no UI Agent:'), error.message);
            return { files: this.getFallbackUIFiles(step, project) };
        }
    }

    isFirstUIModule(projectContext) {
        return !projectContext.files.some(f => 
            f.type === 'component' || f.path.includes('src/components')
        );
    }

    getBaseUIFiles(project) {
        const isReact = project.tecnologias?.frontend?.includes('react');
        const isVue = project.tecnologias?.frontend?.includes('vue');
        
        if (isReact) {
            return this.getReactBaseFiles(project);
        } else if (isVue) {
            return this.getVueBaseFiles(project);
        } else {
            return this.getHTMLBaseFiles(project);
        }
    }

    getReactBaseFiles(project) {
        const appJs = `
import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>${project.nome || 'Projeto Hermes'}</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
`;

        const indexJs = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

        const appCss = `
.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
}

.App-header h1 {
  margin: 0;
  font-size: 2rem;
}

main {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Estilos base */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #0056b3;
}

input, textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  width: 100%;
  margin-bottom: 10px;
}
`;

        const indexHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="${project.descricao || 'Projeto criado com Hermes'}" />
    <title>${project.nome || 'Projeto Hermes'}</title>
  </head>
  <body>
    <noscript>Você precisa habilitar JavaScript para executar esta aplicação.</noscript>
    <div id="root"></div>
  </body>
</html>
`;

        return [
            {
                path: 'src/App.js',
                content: appJs.trim(),
                type: 'component'
            },
            {
                path: 'src/index.js',
                content: indexJs.trim(),
                type: 'config'
            },
            {
                path: 'src/App.css',
                content: appCss.trim(),
                type: 'style'
            },
            {
                path: 'public/index.html',
                content: indexHtml.trim(),
                type: 'page'
            }
        ];
    }

    getVueBaseFiles(project) {
        const appVue = `
<template>
  <div id="app">
    <header class="app-header">
      <h1>${project.nome || 'Projeto Hermes'}</h1>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.app-header {
  background-color: #42b983;
  padding: 20px;
  color: white;
}

.app-header h1 {
  margin: 0;
  font-size: 2rem;
}

main {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
`;

        const mainJs = `
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './components/Home.vue'

const routes = [
  { path: '/', component: Home }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
`;

        return [
            {
                path: 'src/App.vue',
                content: appVue.trim(),
                type: 'component'
            },
            {
                path: 'src/main.js',
                content: mainJs.trim(),
                type: 'config'
            }
        ];
    }

    getHTMLBaseFiles(project) {
        const indexHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.nome || 'Projeto Hermes'}</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="header">
        <h1>${project.nome || 'Projeto Hermes'}</h1>
    </header>
    
    <main class="main">
        <div id="app">
            <!-- Conteúdo será inserido aqui -->
        </div>
    </main>
    
    <script src="js/app.js"></script>
</body>
</html>
`;

        const styleCss = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
}

.header {
    background-color: #007bff;
    color: white;
    padding: 1rem;
    text-align: center;
}

.main {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

button:hover {
    background-color: #0056b3;
}

input, textarea {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    width: 100%;
    margin-bottom: 1rem;
}
`;

        const appJs = `
// Aplicação JavaScript
class App {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('${project.nome || 'Projeto Hermes'} iniciado');
        this.render();
    }
    
    render() {
        const app = document.getElementById('app');
        app.innerHTML = \`
            <div class="welcome">
                <h2>Bem-vindo ao ${project.nome || 'Projeto Hermes'}!</h2>
                <p>Aplicação criada com Hermes CLI</p>
            </div>
        \`;
    }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
`;

        return [
            {
                path: 'index.html',
                content: indexHtml.trim(),
                type: 'page'
            },
            {
                path: 'css/style.css',
                content: styleCss.trim(),
                type: 'style'
            },
            {
                path: 'js/app.js',
                content: appJs.trim(),
                type: 'component'
            }
        ];
    }

    getFallbackUIFiles(step, project) {
        // Arquivo de fallback simples
        const componentName = step.name.replace(/\s+/g, '');
        
        if (project.tecnologias?.frontend?.includes('react')) {
            return [{
                path: `src/components/${componentName}.js`,
                content: `
import React from 'react';

const ${componentName} = () => {
    return (
        <div className="${componentName.toLowerCase()}">
            <h2>${step.name}</h2>
            <p>${step.description}</p>
        </div>
    );
};

export default ${componentName};
                `.trim(),
                type: 'component'
            }];
        }
        
        return [{
            path: `src/components/${componentName}.html`,
            content: `
<div class="${componentName.toLowerCase()}">
    <h2>${step.name}</h2>
    <p>${step.description}</p>
</div>
            `.trim(),
            type: 'component'
        }];
    }
}

module.exports = { UIAgent };