fs = require('fs');
let json = require('./Embeds_Discord_List.json')
const empty=" "
module.exports = {
    get: function(embed_content){
        return json[embed_content]
    },
    addit: function(embed_content,embed_message_id){
        
        json[embed_content] = embed_message_id
        var json_str = JSON.stringify(json)
        fs.writeFile("thread_manager.json", json_str, function (err) {
            if (err) return console.log(err);
        });
        return "200";
    },
    delete: function(embed_content) {
        delete json[embed_content];
        var json_str = JSON.stringify(json)
        fs.writeFile("thread_manager.json", json_str, function (err) {
            if (err) return console.log(err);
        });
        return "200";
    },
    includes: function(embed_content) {
        if(json[embed_content]!== undefined){
            return true
        }
        else{
            return false
        }
    }
}
