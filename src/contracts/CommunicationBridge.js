class CommunicationBridge {
	constructor() {
		this.bridge = null
	}

	getBridge() {
		return this.bridge
	}

	setBridge(bridge) {
		this.bridge = bridge
	}

	broadcastMessage(event) {
		return this.bridge.onBroadcast(event)
	}

	guildOnline(event) {
		return this.bridge.guildOnline(event)
	}

	guildList(event) {
		return this.bridge.guildList(event)
	}

	memberInformation(event) {
		return this.bridge.memberInformation(event)
	}

	friendList(event) {
		return this.bridge.friendList(event)
	}


	broadcastPlayerToggle(event) {
		return this.bridge.onPlayerToggle(event)
	}

	broadcastCleanEmbed(event) {
		return this.bridge.onBroadcastCleanEmbed(event)
	}

	broadcastHeadedEmbed(event) {
		return this.bridge.onBroadcastHeadedEmbed(event)
	}

	connect() {
		throw new Error('Communication bridge connection is not implemented yet!')
	}

	onBroadcast(event) {
		
		throw new Error('Communication bridge broadcast handling is not implemented yet!')
	}
}

module.exports = CommunicationBridge
