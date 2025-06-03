const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

async function showRecentProjects() {
    const recentProjectsPath = path.join(require('os').homedir(), '.hermes-recent-projects.json');
    
    if (!await fs.pathExists(recentProjectsPath)) {
        console.log(chalk.yellow('📁 Nenhum projeto recente encontrado\n'));
        return;
    }

    const recentProjects = await fs.readJson(recentProjectsPath);
    
    if (recentProjects.length === 0) {
        console.log(chalk.yellow('📁 Nenhum projeto recente encontrado\n'));
        return;
    }

    console.log(chalk.cyan('\n📁 Projetos Recentes:\n'));

    const choices = recentProjects.map((project, index) => {
        const techs = Object.values(project.technologies || {}).flat().join(', ');
        const date = new Date(project.createdAt).toLocaleDateString('pt-BR');
        
        return {
            name: `${chalk.white(project.name)} ${chalk.gray(`(${date})`)}
                   ${chalk.blue(techs)}
                   ${chalk.gray(project.path)}`,
            value: project
        };
    });

    choices.push({
        name: chalk.red('🔙 Voltar'),
        value: 'back'
    });

    const { selectedProject } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedProject',
            message: 'Selecione um projeto:',
            choices,
            pageSize: 10
        }
    ]);

    if (selectedProject === 'back') {
        return;
    }

    await showProjectActions(selectedProject);
}

async function showProjectActions(project) {
    const projectExists = await fs.pathExists(project.path);
    
    if (!projectExists) {
        console.log(chalk.red('\n❌ Projeto não encontrado no caminho especificado'));
        console.log(chalk.gray(`Caminho: ${project.path}\n`));
        
        const { removeFromList } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'removeFromList',
                message: 'Remover da lista de projetos recentes?',
                default: true
            }
        ]);

        if (removeFromList) {
            await removeProjectFromRecents(project.path);
            console.log(chalk.green('✅ Projeto removido da lista'));
        }
        
        return;
    }

    console.log(chalk.cyan(`\n📋 Projeto: ${project.name}`));
    console.log(chalk.gray(`Caminho: ${project.path}`));
    console.log(chalk.gray(`Criado: ${new Date(project.createdAt).toLocaleString('pt-BR')}\n`));

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'O que deseja fazer?',
            choices: [
                { name: '📂 Abrir pasta do projeto', value: 'open' },
                { name: '📄 Ver estrutura do projeto', value: 'structure' },
                { name: '📊 Ver metadados', value: 'metadata' },
                { name: '🗑️  Remover da lista', value: 'remove' },
                { name: '🔙 Voltar', value: 'back' }
            ]
        }
    ]);

    switch (action) {
        case 'open':
            await openProjectFolder(project.path);
            break;
        case 'structure':
            await showProjectStructure(project.path);
            await showProjectActions(project);
            break;
        case 'metadata':
            await showProjectMetadata(project.path);
            await showProjectActions(project);
            break;
        case 'remove':
            await removeProjectFromRecents(project.path);
            console.log(chalk.green('✅ Projeto removido da lista'));
            break;
        case 'back':
            await showRecentProjects();
            break;
    }
}

async function openProjectFolder(projectPath) {
    const { exec } = require('child_process');
    const os = require('os');

    let command;
    
    switch (os.platform()) {
        case 'darwin': // macOS
            command = `open "${projectPath}"`;
            break;
        case 'win32': // Windows
            command = `explorer "${projectPath}"`;
            break;
        default: // Linux
            command = `xdg-open "${projectPath}"`;
            break;
    }

    exec(command, (error) => {
        if (error) {
            console.log(chalk.red('❌ Erro ao abrir pasta:'), error.message);
            console.log(chalk.blue(`📁 Caminho: ${projectPath}`));
        } else {
            console.log(chalk.green('✅ Pasta aberta no explorador de arquivos'));
        }
    });
}

async function showProjectStructure(projectPath) {
    console.log(chalk.cyan('\n🗂️  Estrutura do Projeto:\n'));
    
    try {
        await printDirectoryTree(projectPath, '', true);
    } catch (error) {
        console.log(chalk.red('❌ Erro ao ler estrutura:'), error.message);
    }
}

async function printDirectoryTree(dirPath, prefix = '', isRoot = false) {
    const items = await fs.readdir(dirPath);
    const filteredItems = items.filter(item => !item.startsWith('.') || item === '.env.example');
    
    for (let i = 0; i < filteredItems.length; i++) {
        const item = filteredItems[i];
        const itemPath = path.join(dirPath, item);
        const isLast = i === filteredItems.length - 1;
        const stats = await fs.stat(itemPath);
        
        const connector = isLast ? '└── ' : '├── ';
        const newPrefix = isLast ? '    ' : '│   ';
        
        if (stats.isDirectory()) {
            console.log(chalk.blue(`${prefix}${connector}📁 ${item}/`));
            await printDirectoryTree(itemPath, prefix + newPrefix);
        } else {
            const icon = getFileIcon(item);
            console.log(chalk.white(`${prefix}${connector}${icon} ${item}`));
        }
    }
}

function getFileIcon(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    const icons = {
        '.js': '📄',
        '.jsx': '⚛️',
        '.ts': '📘',
        '.tsx': '⚛️',
        '.vue': '💚',
        '.css': '🎨',
        '.scss': '🎨',
        '.json': '📋',
        '.md': '📝',
        '.html': '🌐',
        '.env': '🔐',
        '.gitignore': '🚫',
        '.yml': '⚙️',
        '.yaml': '⚙️',
        '.dockerfile': '🐳',
        '.sql': '🗄️'
    };
    
    return icons[ext] || '📄';
}

async function showProjectMetadata(projectPath) {
    const metadataPath = path.join(projectPath, '.hermes-metadata.json');
    
    if (!await fs.pathExists(metadataPath)) {
        console.log(chalk.yellow('\n⚠️  Metadados não encontrados'));
        return;
    }

    try {
        const metadata = await fs.readJson(metadataPath);
        
        console.log(chalk.cyan('\n📊 Metadados do Projeto:\n'));
        console.log(chalk.white(`Nome: ${metadata.name}`));
        console.log(chalk.white(`Descrição: ${metadata.description || 'N/A'}`));
        console.log(chalk.white(`Arquitetura: ${metadata.architecture || 'N/A'}`));
        console.log(chalk.white(`Gerado em: ${new Date(metadata.generatedAt).toLocaleString('pt-BR')}`));
        console.log(chalk.white(`Versão Hermes: ${metadata.hermesVersion}`));
        
        if (metadata.technologies) {
            console.log(chalk.cyan('\n💻 Tecnologias:'));
            Object.entries(metadata.technologies).forEach(([category, techs]) => {
                if (Array.isArray(techs) && techs.length > 0) {
                    console.log(chalk.white(`  ${category}: ${techs.join(', ')}`));
                } else if (typeof techs === 'string') {
                    console.log(chalk.white(`  ${category}: ${techs}`));
                }
            });
        }

        if (metadata.modules && metadata.modules.length > 0) {
            console.log(chalk.cyan('\n📦 Módulos:'));
            metadata.modules.forEach((module, index) => {
                const prioColor = module.prioridade === 'alta' ? chalk.red : 
                               module.prioridade === 'media' ? chalk.yellow : chalk.green;
                console.log(chalk.white(`  ${index + 1}. ${module.nome}`) + 
                           ` ${prioColor(`[${module.prioridade}]`)}`);
            });
        }

        if (metadata.files && metadata.files.length > 0) {
            console.log(chalk.cyan(`\n📁 Arquivos gerados: ${metadata.files.length}`));
            
            const filesByType = metadata.files.reduce((acc, file) => {
                acc[file.type] = (acc[file.type] || 0) + 1;
                return acc;
            }, {});

            Object.entries(filesByType).forEach(([type, count]) => {
                console.log(chalk.white(`  ${type}: ${count} arquivo(s)`));
            });
        }

    } catch (error) {
        console.log(chalk.red('❌ Erro ao ler metadados:'), error.message);
    }
}

async function removeProjectFromRecents(projectPath) {
    const recentProjectsPath = path.join(require('os').homedir(), '.hermes-recent-projects.json');
    
    if (await fs.pathExists(recentProjectsPath)) {
        const recentProjects = await fs.readJson(recentProjectsPath);
        const filteredProjects = recentProjects.filter(p => p.path !== projectPath);
        await fs.writeJson(recentProjectsPath, filteredProjects, { spaces: 2 });
    }
}

function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function sanitizePath(input) {
    return input.replace(/[<>:"|?*]/g, '_').replace(/\s+/g, '-');
}

async function validateProjectName(name) {
    if (!name || !name.trim()) {
        return 'Nome do projeto é obrigatório';
    }
    
    if (!/^[a-zA-Z0-9-_\s]+$/.test(name)) {
        return 'Nome deve conter apenas letras, números, hífens, underscores e espaços';
    }
    
    if (name.length > 50) {
        return 'Nome deve ter no máximo 50 caracteres';
    }
    
    return true;
}

async function checkDiskSpace(projectPath) {
    try {
        const stats = await fs.statSync(path.dirname(projectPath));
        // Implementação básica - pode ser expandida
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    showRecentProjects,
    showProjectActions,
    openProjectFolder,
    showProjectStructure,
    showProjectMetadata,
    removeProjectFromRecents,
    formatFileSize,
    sanitizePath,
    validateProjectName,
    checkDiskSpace,
    getFileIcon,
    printDirectoryTree
};