const fs = require('fs')
const FILE_PATH = './Embeds_Discord_List.json'

function loadJson() {
    try {
        const data = fs.readFileSync(FILE_PATH, 'utf8')
        return JSON.parse(data)
    } catch {
        return {}
    }
}

function saveJson(json) {
    fs.writeFileSync(
        FILE_PATH,
        JSON.stringify(json, null, 2)
    )
}

module.exports = {

    get(embed_content) {
        const json = loadJson()
        return json[embed_content]
    },

    addit(embed_content, embed_message_id) {
        const json = loadJson()
        json[embed_content] = embed_message_id
        saveJson(json)
        return "200"
    },

    delete(embed_content) {
        const json = loadJson()
        delete json[embed_content]
        saveJson(json)
        return "200"
    },

    includes(embed_content) {
        const json = loadJson()
        return json[embed_content] !== undefined
    }

}