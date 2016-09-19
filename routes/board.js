var mongoose = require("mongoose");

var schemas = require("../db_models");
var util = require("./utils");

var Board = mongoose.model("Board", schemas.BoardSchema);


/**
 * 게시판 생성 API
 * 
 * Request
 * @method : POST
 * @path : /api/board/
 * @body.name : String, 게시판명
 * 
 * Response
 * @body.result : String, 결과
 * @body.Board : Board, 생성된 게시판
 */
function createBoard(req, res)
{
	var name = req.body.name;
	var board = new Board(
		{
			name : name
		}
	);

	var result = {};

	board.save((_err, _result)=>
	{
		if(_err)
		{
			console.log("save skin type error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		result["result"] = "success";
		result["board"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}

/**
 * 게시판 조회 API
 * 
 * Request
 * @method : GET
 * @path : /api/board/
 * 
 * Response
 * @body.result : String, 요청 결과
 * @body.boards : 게시판 리스트
 */
function retrieveBoards(req, res) 
{
	var result = {};
	Board.find({}, (_err, _result)=>
	{
		result["result"] = "success";
		result["boards"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}

/**
 * 게시판 조회 API
 * 
 * Request
 * @method : GET
 * @path : /api/board/{id}
 * @path.id : ObjectId, 조회할 게시판 id
 * 
 * Response
 * @body.result : String, 요청 결과
 * @body.board : 조회한 게시판
 */
function retrieveBoard(req, res)
{
	var id = req.params.param;
	var result = {};

	Board.findById(id, (_err, _result)=>
	{
		result["result"] = "success";
		result["board"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}


/**
 * 게시판 갱신 API
 * 
 * Request
 * @method : PUT
 * @path : /api/board/{id}
 * @path.id : 갱신할 피부타입 id
 * @body.name : String, 갱신할 이름
 * 
 * Response
 * @body.result : String, 요청 결과
 * @body.board : 갱신된 게시판
 */
function updateBoard(req, res)
{
	var result = {};
	Board.findByIdAndUpdate(req.body._id,
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
		result["board"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}


/**
 * 게시판 삭제 API
 * 
 * Request
 * @method : DELETE
 * @path : /api/board/{id}
 * @path.id : ObjectId, 삭제할 게시판 id
 * 
 * Response
 * @body.result : String, 요청 결과
 */
function deleteBoard(req, res)
{
	var result = {};
	Board.removeById(req.params.param, (_err, _result)=>
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


module.exports.createBoard = createBoard;
module.exports.retrieveBoards = retrieveBoards;
module.exports.retrieveBoard = retrieveBoard;
module.exports.updateBoard = updateBoard;
module.exports.deleteBoard = deleteBoard;