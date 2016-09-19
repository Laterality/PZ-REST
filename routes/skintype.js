var mongoose = require("mongoose");

var schemas = require("../db_models");
var util = require("./utils");

var SkinType = mongoose.model("SkinType", schemas.SkinTypeSchema);


/**
 * 피부 타입 생성 API
 * 
 * Request
 * @method : POST
 * @path : /api/skintype
 * @body.name : String, 피부 타입명
 * 
 * Response
 * @body.result : String, 결과
 * @body.skintype : SkinType, 생성된 피부 타입
 */
function createSkinType(req, res)
{
	var name = req.body.name;
	var skin = new SkinType(
		{
			name : name
		}
	);

	var result = {};

	skin.save((_err, _result)=>
	{
		if(_err)
		{
			console.log("save skin type error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		result["result"] = "success";
		result["skintype"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}

/**
 * 피부 타입 조회 API
 * 
 * Request
 * @method : GET
 * @path : /api/skintype
 * 
 * Response
 * @body.result : String, 요청 결과
 * @body.skintypes : 피부 타입 리스트
 */
function retrieveSkinTypes(req, res) 
{
	var result = {};
	SkinType.find({}, (_err, _result)=>
	{
		result["result"] = "success";
		result["skintypes"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}

/**
 * 피부 타입 조회 API
 * 
 * Request
 * @method : GET
 * @path : /api/skintype/{id}
 * @path.id : ObjectId, 조회할 피부 타입 id
 * 
 * Response
 * @body.result : String, 요청 결과
 * @body.skintype : 조회한 피부 타입
 */
function retrieveSkinType(req, res)
{
	var id = req.params.param;
	var result = {};

	SkinType.findById(id, (_err, _result)=>
	{
		result["result"] = "success";
		result["skintype"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}


/**
 * 피부 타입 갱신 API
 * 
 * Request
 * @method : PUT
 * @path : /api/skintype/{id}
 * @path.id : 갱신할 피부타입 id
 * @body.name : String, 갱신할 이름
 * 
 * Response
 * @body.result : String, 요청 결과
 * @body.skintype : 갱신된 피부 타입
 */
function updateSkinType(req, res)
{
	var result = {};
	SkinType.findByIdAndUpdate(req.body._id,
		{
			$set :
			{
				name : req.body.name
			}
		},
	{new : true},
	(_err, _result)=>
	{
		if(_err)
		{
			console.log("update skin type error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		result["result"] = "success";
		result["skintype"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}


/**
 * 피부 타입 삭제 API
 * 
 * Request
 * @method : DELETE
 * @path : /api/skintype/{id}
 * @path.id : ObjectId, 삭제할 피부 타입 id
 * 
 * Response
 * @body.result : String, 요청 결과
 */
function deleteSkinType(req, res)
{
	var result = {};
	SkinType.removeById(req.params.param, (_err, _result)=>
	{
		if(_err)
		{
			console.log("remove skin type error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		result["result"] = "success";
		util.responseWithJson(req, res, result, 200);
	});
}


module.exports.createSkinType = createSkinType;
module.exports.retrieveSkinTypes = retrieveSkinTypes;
module.exports.retrieveSkinType = retrieveSkinType;
module.exports.updateSkinType = updateSkinType;
module.exports.deleteSkinType = deleteSkinType;