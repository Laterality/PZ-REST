var crypto = require("crypto");

function encryption(rawPassword, salt, saltLength)
{
	var _salt = crypto.randomBytes(saltLength ? saltLength : 16).toString("hex");
	var pw_hashed = crypto.createHmac("sha1", salt ? salt : _salt)
	.update(rawPassword)
	.digest("hex");
	var res = 
		{
			password : pw_hashed,
			salt : salt ? salt : _salt
		};
	return res;
}

function responseWithJson(req, res, json, code)
{
	res.type("json");
	res.status(code || 200).send(json);
}




module.exports.encryption = encryption;
module.exports.responseWithJson = responseWithJson;