var mongoose = require("mongoose");

var schemas = require("../db_models");
var util = require("./utils");

var User = mongoose.model("User", schemas.UserSchema);

/**
 * 사용자 등록 API
 * 
 * Path : /api/user/
 * Method : POST
 * 
 * Request
 * 
 * @body.email : 이메일
 * @body.password : 패스워드(raw)
 * @body.login_type : 로그인 유형["NATIVE", "GOOGLE"]
 * @body.external_id : 외부 플랫폼 로그인인 경우, 해당 플랫폼 상 사용자 id
 * @body.username : 유저네임
 * 
 * Response
 * 
 * @code.200 : 정상 처리
 * @code.403 : 이미 사용중인 이메일
 * @code.500 : 서버 에러
 * 
 * @body.result : 결과 문자열
 * @body.user : 등록된 사용자 정보
 */
function registerUser(req, res)
{
	var hpw = util.encryption(req.body.password);
	var result = {};

	User.findOne({email : req.body.email}, (_err, _result)=>
	{
		if(_err)
		{
			console.log("email reiteration check error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		if(_result)
		{
			// email already exists
			result["result"] = "fail";
			result["message"] = "이미 사용중인 이메일";
			return util.responseWithJson(req, res, result, 403);
		}

		console.log("@body : \n", req.body);

		var user = new User(
			{
				email : req.body.email.toLowerCase(),
				login_type : req.body.login_type.toUpperCase(),
				external_id : req.body.external_id,
				username : req.body.username,
				password : hpw.password,
				salt : hpw.salt,
				regDate : (new Date()).getTime(),
				profile_img : null,
				push :
				{
					device_id : null,
					grant : true
				}
			}
		);

		user.save((__err, __result)=>
		{
			if(__err)
			{
				console.log("user registration error\n", __err);
				result["result"] = "error";
				result["error"] = __err;
				return util.responseWithJson(req, res, result, 500);
			}

			if(!__result)
			{
				console.log("user not registered");
				result["result"] = "fail";
				return util.responseWithJson(req, res, result, 404);
			}

			result["result"] = "success";
			result["user"] = __result;
			util.responseWithJson(req, res, result, 200);
		});

		// email available
	});
}


function retrieveUsers(req, res)
{
	var result = {};
	User.find({})
	.populate("skin_type")
	.exec((_err, _result)=>
	{
		if(_err)
		{
			console.log("retrieve user list error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		result["result"] = "success";
		result["users"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}

function retrieveUser(req, res)
{
	var id = req.params.param;
	var result = {};

	User.findById(id)
	.populate("skin_type")
	.exec((_err, _result)=>
	{
		if(_err)
		{
			console.log("db query error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		if(!_result)
		{
			console.log("user not found : ", id);
			result["result"] = "not found";
			return util.responseWithJson(req, res, result, 404);
		}

		result["result"] = "success";
		result["user"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}

/**
 * Native 로그인 API
 * 
 * Path : /api/user/login
 * Method : POST
 * 
 * Request
 * 
 * @body.email : 사용자 이메일
 * @body.password : 사용자 비밀번호(raw)
 * 
 * Response
 * 
 * @body.result : 결과 문자열["error", "not found", "success", "fail"]
 * @body.user : 사용자 정보
 * 
 */
function loginNativeUser(req, res)
{

	var email = req.body.email.toLowerCase();
	var pw = req.body.password;
	var result = {};

	User.findOne({email : email}, (_err, _result) =>
	{
		if(_err)
		{
			console.log("db query error");
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		if(!_result)
		{
			console.log("user not found : ", req.body.email);
			result["result"] = "not found";
			return util.responseWithJson(req, res, result, 404);
		}

		var hpw_input = util.encryption(pw, _result.salt).password;

		if(hpw_input == _result.password)
		{
			// login success
			result["result"] = "success";
			result["user"] = 
			{
				_id : _result._id,
				email : _result.email,
				username : _result.username,
				bookmarks : _result.bookmarks
			};
			return util.responseWithJson(req, res, result, 200);
		}
		else
		{
			// login fail
			result["result"] = "fail";
			result["message"] = "이메일 혹은 비밀번호가 일치하지 않습니다";
			return util.responseWithJson(req, res, result, 403);
		}
	});
}

/**
 * Google 로그인 API
 * 
 * Path : /api/user/login
 * Method : POST
 * 
 * Request
 * 
 * @body.external_id : 구글 사용자 id
 * 
 * Response
 * 
 * @body.result : 결과 문자열["error", "register", "success"]
 * @body.user : 사용자 정보
 * 
 */
function loginGoogleUser(req, res)
{
	var ext_id = req.body.external_id;
	var result = {};

	User.findOne({external_id : ext_id}, (_err, _result)=>
	{
		if(_err)
		{
			console.log("query error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		if(!_result)
		{
			console.log("unregistered google user : ", req.body.email);
			result["result"] = "register";
			return util.responseWithJson(req, res, result, 200);
		}

		result["result"] = "success";
		result["user"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}

/**
 * 사용자 갱신 API
 * 
 * Path : /api/user/{id}
 * Method : PUT
 * 
 * Request
 * @path.id : 갱신할 사용자 id
 * 
 * @body.email : (Option) 사용자 이메일
 * @body.username : (Option) 사용자 유저네임
 * @body.skin_type : (Option) 사용자 피부 타입 id
 * @body.password : (Option) 사용자 비밀번호(raw)
 * 
 * Response
 * 
 * @body.result : 요청 결과 문자열
 * @body.user : 갱신된 사용자 정보
 */

function updateUser(req, res)
{
	var id = req.params.param;
	var result = {};

	var set = {$set:{}};

	if(req.body.email){set.$set["email"] = req.body.email;}
	if(req.body.username){set.$set["username"] = req.body.username;}
	if(req.body.skin_type){set.$set["skin_type"] = req.body.skin_type._id;}
	if(req.body.password)
	{
		var pw = util.encryption(req.body.password);
		set.$set["password"] = pw.password;
		set.$set["salt"] = pw.salt;
	}

	console.log("$set : \n", set);

	User.findOneAndUpdate({_id : id},
		set,
		{new : true},
		(_err, _result) =>
		{
			if(_err)
			{
				console.log("user update error\n", _err);
				result["result"] = "error";
				result["error"] = _err;
				return util.responseWithJson(req, res, result, 500);
			}

			else
			{
				result["result"] = "success";
				console.log("result\n", _result);
				result["user"] = 
				{
					_id : _result._id,
					email : _result.email,
					username : _result.username,
					login_type : _result.login_type,
					external_id : _result.external_id,
					skin_type : _result.skin_type,
					gender : _result.gender,
				};
				util.responseWithJson(req, res, result, 200);
			}
		}
	);
}


module.exports.retrieveUsers = retrieveUsers;
module.exports.retrieveUser = retrieveUser;
module.exports.updateUser = updateUser;
module.exports.loginGoogleUser = loginGoogleUser;
module.exports.loginNativeUser = loginNativeUser;
module.exports.registerUser = registerUser;