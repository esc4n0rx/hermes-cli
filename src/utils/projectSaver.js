const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { getConfig } = require('../config/settings');

class ProjectSaver {
    constructor() {
        this.config = null;
    }

    async save(projectContext, generatedFiles) {
        this.config = await getConfig();
        
        const projectName = await this.getProjectName(projectContext.project);
        const projectPath = await this.getProjectPath(projectName);
        
        console.log(chalk.blue(`\n💾 Salvando projeto em: ${projectPath}\n`));
        
        await this.createProjectStructure(projectPath, generatedFiles);
        await this.saveProjectMetadata(projectPath, projectContext);
        
        console.log(chalk.green('✅ Projeto salvo com sucesso!'));
        
        return projectPath;
    }

    async getProjectName(project) {
        const suggestedName = project.nome || 
                             project.arquitetura?.toLowerCase().replace(/\s+/g, '-') || 
                             'projeto-hermes';

        const { projectName } = await inquirer.prompt([
            {
                type: 'input',
                name: 'projectName',
                message: 'Nome do projeto (pasta):',
                default: suggestedName,
                validate: (input) => {
                    if (!input.trim()) return 'Nome é obrigatório';
                    if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
                        return 'Nome deve conter apenas letras, números, hífens e underscores';
                    }
                    return true;
                }
            }
        ]);

        return projectName;
    }

    async getProjectPath(projectName) {
        const defaultPath = path.join(this.config.projectsPath || './hermes-projects', projectName);
        
        const { useDefault } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'useDefault',
                message: `Salvar em: ${defaultPath}?`,
                default: true
            }
        ]);

        if (useDefault) {
            return defaultPath;
        }

        const { customPath } = await inquirer.prompt([
            {
                type: 'input',
                name: 'customPath',
                message: 'Caminho personalizado:',
                validate: (input) => input.trim().length > 0 || 'Caminho é obrigatório'
            }
        ]);

        return path.resolve(customPath, projectName);
    }

    async createProjectStructure(projectPath, generatedFiles) {
        // Verificar se já existe
        if (await fs.pathExists(projectPath)) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Pasta já existe. Sobrescrever?',
                    default: false
                }
            ]);

            if (!overwrite) {
                throw new Error('Operação cancelada pelo usuário');
            }

            await fs.remove(projectPath);
        }

        // Criar estrutura de pastas
        await fs.ensureDir(projectPath);

        // Salvar arquivos
        for (const file of generatedFiles) {
            const filePath = path.join(projectPath, file.path);
            
            // Garantir que o diretório existe
            await fs.ensureDir(path.dirname(filePath));
            
            // Escrever arquivo
            await fs.writeFile(filePath, file.content || '', 'utf8');
            
            console.log(chalk.gray(`  ✓ ${file.path}`));
        }
    }

    async saveProjectMetadata(projectPath, projectContext) {
        const metadata = {
            name: projectContext.project.nome || 'Projeto Hermes',
            description: projectContext.project.descricao || '',
            architecture: projectContext.project.arquitetura || '',
            technologies: projectContext.project.tecnologias || {},
            modules: projectContext.project.modulos || [],
            generatedAt: new Date().toISOString(),
            hermesVersion: '1.0.0',
            files: projectContext.files.map(f => ({
                path: f.path,
                type: f.type
            }))
        };

        const metadataPath = path.join(projectPath, '.hermes-metadata.json');
        await fs.writeJson(metadataPath, metadata, { spaces: 2 });

        // Adicionar ao histórico de projetos recentes
        await this.addToRecentProjects(projectPath, metadata);
    }

    async addToRecentProjects(projectPath, metadata) {
        const recentProjectsPath = path.join(require('os').homedir(), '.hermes-recent-projects.json');
        
        let recentProjects = [];
        
        if (await fs.pathExists(recentProjectsPath)) {
            recentProjects = await fs.readJson(recentProjectsPath);
        }

        // Remover projeto se já existe
        recentProjects = recentProjects.filter(p => p.path !== projectPath);

        // Adicionar no início
        recentProjects.unshift({
            name: metadata.name,
            path: projectPath,
            createdAt: metadata.generatedAt,
            technologies: metadata.technologies
        });

        // Manter apenas os 10 mais recentes
        recentProjects = recentProjects.slice(0, 10);

        await fs.writeJson(recentProjectsPath, recentProjects, { spaces: 2 });
    }
}

module.exports = { ProjectSaver };