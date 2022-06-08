const chalk = require('chalk')

class Logger {
	discord(message) {
		return console.log(chalk.bgMagenta.black(`[${this.getCurrentTime()}] Discord >`) + ' ' + chalk.magenta(message))
	}

	minecraft(message) {
		return console.log(chalk.bgGreenBright.black(`[${this.getCurrentTime()}] Minecraft >`) + ' ' + chalk.greenBright(message))
	}

	warn(message) {
		return console.log(chalk.bgYellow.black(`[${this.getCurrentTime()}] Warning >`) + ' ' + chalk.yellow(message))
	}

	error(message) {
		return console.log(chalk.bgRedBright.black(`[${this.getCurrentTime()}] Error >`) + ' ' + chalk.redBright(message))
	}

	broadcast(message, location) {
		if (location == "Guild"){
			return console.log(chalk.bgHex('00AA00').black(`[${this.getCurrentTime()}] ${location} Broadcast >`) + ' ' + message)
		}
		else if (location == "Officer"){
			return console.log(chalk.bgHex('00AAAA').black(`[${this.getCurrentTime()}] ${location} Broadcast >`) + ' ' + message)
		}
		else if (location == "Discord"){
			return console.log(chalk.bgHex('0000AA').black(`[${this.getCurrentTime()}] ${location} Broadcast >`) + ' ' + message)
		}
		else if (location == "DM"){
			return console.log(chalk.bgHex('FF55FF').black(`[${this.getCurrentTime()}] ${location} Broadcast >`) + ' ' + message)
		}
		else{
		return console.log(chalk.inverse(`[${this.getCurrentTime()}] ${location} Broadcast >`) + ' ' + message)}
	}

	getCurrentTime() {
		return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
	}
}

module.exports = Logger
