#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

async function install() {
    console.log(chalk.cyan('🚀 Instalando Hermes CLI...\n'));
    
    try {
        // Verificar Node.js
        const nodeVersion = process.version;
        console.log(chalk.green(`✅ Node.js ${nodeVersion} detectado`));
        
        // Instalar dependências
        console.log(chalk.blue('📦 Instalando dependências...'));
        execSync('npm install', { stdio: 'inherit' });
        
        // Tornar executável
        const binPath = path.join(__dirname, 'bin', 'hermes');
        await fs.chmod(binPath, '755');
        
        // Criar link global (opcional)
        try {
            execSync('npm link', { stdio: 'inherit' });
            console.log(chalk.green('\n✅ Hermes instalado globalmente!'));
            console.log(chalk.white('Execute: ') + chalk.cyan('hermes') + chalk.white(' para iniciar'));
        } catch (linkError) {
            console.log(chalk.yellow('\n⚠️  Link global falhou. Execute manualmente:'));
            console.log(chalk.cyan('npm link'));
        }
        
        console.log(chalk.green('\n🎉 Instalação concluída com sucesso!'));
        console.log(chalk.white('Para começar, execute: ') + chalk.cyan('node src/index.js'));
        
    } catch (error) {
        console.error(chalk.red('\n❌ Erro na instalação:'), error.message);
        process.exit(1);
    }
}

install();