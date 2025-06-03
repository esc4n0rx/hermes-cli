const chalk = require('chalk');

async function showProgress(message, duration = 2000) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    
    const interval = setInterval(() => {
        process.stdout.write(`\r${chalk.cyan(frames[i])} ${message}`);
        i = (i + 1) % frames.length;
    }, 100);
    
    await sleep(duration);
    clearInterval(interval);
    process.stdout.write(`\r${chalk.green('✅')} ${message}\n`);
}

async function showSimpleProgress(message) {
    process.stdout.write(`${chalk.cyan('⏳')} ${message}...`);
    // Simular pequeno delay para não parecer instantâneo
    await sleep(300);
    process.stdout.write(`\r${chalk.green('✅')} ${message}\n`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { showProgress, showSimpleProgress, sleep };