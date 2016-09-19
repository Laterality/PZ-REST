var mongoose = require("mongoose");
var async = require("async");

var schemas = require("../db_models");
var util = require("./utils");

mongoose.Promise = global.Promise;

var Post = mongoose.model("Post", schemas.PostSchema);
var FootStep = mongoose.model("FootStep", schemas.FootStepSchema);
var Reply = mongoose.model("Reply", schemas.ReplySchema);

/**
 * 게시물 생성 api
 * 
 * Path : /api/post
 * Medthod : POST
 * 
 * Request
 * @body.author : String, 작성자 id
 * @body.board_id : String, 게시판 id
 * @body.skinType_id : String, 피부타입 id, 전체인경우 null
 * @body.title : 게시물 제목
 * @body.content : 게시물 내용
 * 
 * Response
 * @body.result : 결과 문자열
 * @body.post : 작성된 게시물
 * 
 */
function createPost(req, res)
{
	var result = {};

	var cont = [];
	var bcont = req.body.content;

	for(var i in bcont)
	{
		cont.push(
			{
				_type : bcont[i]._type,
				_index : bcont[i]._index,
				content : bcont[i].content
			}
		);
	}
	
	var post = new Post(
		{
			author : req.body.author,
			board_id : req.body.board_id,
			skinType_id : req.body.skinType_id,
			title : req.body.title,
			content : cont,
			regDate : (new Date()).getTime(),
			lastModDate : (new Date()).getTime(),
			count_replies : 0,
			count_recommend : 0,
			count_view : 0
		}
	);

	post.save((_err, _result) =>
	{
		if(_err)
		{
			console.log("post registration error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}

		if(!_result)
		{
			console.log("post not registered");
			result["result"] = "fail";
			return util.responseWithJson(req, res, result, 500);
		}

		result["result"] = "success";
		result["post"] = _result;
		util.responseWithJson(req, res, result, 200);
	});
}

/**
 * 게시물 제목과 작성자, 작성일자 목록 반환
 * 
 * Path : /api/post
 * Method : GET
 * 
 * Request
 * @query.user : 사용자 id
 * @query.board : 게시판 id
 * @query.skin : 피부 타입 id, 없는 경우 전체
 * @query.before : 기준 시간(unix epoch, before값 이전의 게시물 반환), 기본값 : now
 * @query.limit : 반환할 리스트의 최대 사이즈, 기본값 3
 * @query.sort : 리스트 정렬 기준["date", "recommend"], 기본값 : date
 * @query.content : 게시물 내용 포함 여부["true", "false"], 기본값 : false
 * @query.detail : 조회수, 댓글 포함 여부["true", "false"], 기본값 : false
 * 
 * Response
 * @result.result : 수행 결과 [success, error]
 * @result.posts : 게시물 리스트
 */
function retrievePosts(req, res)
{
	var user_id = req.query.user;
	var before = req.query.before ? req.query.before : (new Date())
	.getTime();
	var skin = req.query.skin;
	var limit = req.query.limit ? Number(req.query.limit) : 3;
	var sort = req.query.sort ? req.query.sort.toLowerCase() : "date";
	var result = {};

	var presentation = 
		{
			_id : 1,
			title : 1,
			regDate : 1,
			count_recommend : 1,
			author : 1
		};

	var content = req.query.content ? req.query.content.toLowerCase() : null;
	var detail = req.query.detail ? req.query.detail.toLowerCase() : null;

	if(content == "true"){presentation["content"] = 1;}
	if(detail == "true"){presentation["count_view"] = 1;}
			

	if(!req.query.before)
	{


		

		Post.find({}, presentation)
		.populate("author", "username")
		.then((_result)=>
		{
			result["result"] = "success";
			result["posts"] = 
			{
				count : _result.length,
				posts : _result
			};

			return util.responseWithJson(req, res, result, 200);
		},
		(_err)=>
		{
			console.log("query error");
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		});
	}
	else
	{
		var tasks = [
			function(callback)
			{

				var query;
				if(!skin)
				{
					query = Post.find({"regDate" :{$lt : before}, board_id : req.query.board}, 
					presentation);
				}
				else
				{
					query = Post.find(
						{
							"regDate" :{$lte : before}, board_id : req.query.board,
							skinType_id : skin
						},
						presentation);
				}
				

				query
				.populate("author", "username")
				.limit(limit);
				if(sort == "date"){query.sort({"regDate" : -1});} // DESC
				else if(sort == "recommend"){query.sort({"count_recommend" : -1});}
				query.then((_result)=>
				{
					// success
					//console.log("retrieve posts result :\n", _result);
					result["posts"] = _result;
					callback();
				},
				(_err)=>
				{
					console.log("retrieve posts error\n", _err);
					result["result"] = "error";
					result["error"] = _err;
					return util.responseWithJson(req, res, result, 500);
				});
			},
			function(callback)
			{
				var _tasks = [];
				for (var i in result.posts)
				{
					_tasks.push(function(callback)
					{
						FootStep.findOne({post_id : result.posts[i]._id, user_id : user_id},
						(__err, __result)=>
						{
							if(__err)
							{
								console.log("retrieve footstep error\n", __err);
								result["result"] = "error";
								result["error"] = __err;
								return util.responseWithJson(req, res, result, 500);
							}
							result.posts[i]["footstep"] = __result;
							callback(null);
						});
					});
				}
				async.parallel(_tasks, (err, results)=>
				{
					if(err)
					{
						console.log("async parallel error\n", err);
						result["result"] = "error";
						result["error"] = err;
						return util.responseWithJson(req, res, result, 500);
					}
					callback(null);
				});
			}
		];

		async.waterfall(tasks,
		(_err)=>
		{
			if(_err)
			{
				console.log("retrieve posts error\n", _err);
				result["result"] = "error";
				result["error"] = _err;
				return util.responseWithJson(req, res, result, 500);
			}
			result["result"] = "success";
			util.responseWithJson(req, res, result, 200);
		});
	}
}



/**
 * 게시물 조회 API
 * 
 * Path : /api/post/{id}
 * Method : GET
 * 
 * Request
 * @path.id : 조회할 게시물 id
 * @query.user : 사용자 id, 해당 사용자에 대한 footstep 남김
 * 
 * Response
 * @body.result : 결과 문자열
 * @body.post : 조회환 게시물
 * @body.footstep : 게시물에 대한 사용자의 읽기/추천/북마크 여부
 * 
 */
function retrievePost(req, res)
{
	var id = req.params.param;
	var user_id = req.query.user;
	var result = {};
	var tasks = 
		[
			function(callback)
			{
				Post.findById(id)
				.populate("author", "username")
				.then((_result)=>
				{
					result["post"] = _result;
					callback();
				},
				(_err)=>
				{
					console.log("query error\n", _err);
					result["result"] = "error";
					result["error"] = _err;
					return util.responseWithJson(req, res, result, 500);
				});
			},
			function(callback)
			{
				Post.update({_id : id},
					{
						$inc :
						{
							count_view : 1
						}
					},
					(_err, _result) =>
					{
						callback();
					}
				);
			}
		];

	if(user_id)
	{
		tasks.push(
			function(callback)
			{
				FootStep.findOne({user_id : user_id, post_id : id}, 
				(_err, _result)=>
				{
					if(_err)
					{
						console.log("find footstep error\n", _err);
						result["result"] = "error";
						result["error"] = _err;
					}

					if(!_result)
					{
						// footstep not exists

						var footstep = new FootStep(
							{
								post_id : id,
								user_id : user_id,
								read : true,
								readDate : (new Date()).getTime()
							}
						);

						footstep.save((__err, __result)=>
						{
							result["footstep"] = __result;
							callback();
						});
					}
					else
					{
						result["footstep"] = _result;
						callback();
					}
				});
			}
		);
	}

	async.parallel(tasks,
	(err, results) =>
	{
		if(err)
		{
			console.log("error\n", err);
			result["result"] = "error";
			result["error"] = err;
			return util.responseWithJson(req, res, result);
		}
		result["result"] = "success";
		util.responseWithJson(req, res, result, 200);
	});
}


function updatePost(req, res)
{
	var id = req.params.param;
	var result = {};

	Post.update(
		{
			_id : id
		},
		{
			$set :
			{
				title : req.body.title,
				content : req.body.content,
				lastModDate : (new Date()).getTime()
			}
		},
		(_err, _result) =>
		{
			if(_err)
			{
				console.log("post update error\n", _err);
				result["result"] = "result";
				result["error"] = _err;
				return util.responseWithJson(req, res, result, 500);
			}

			result["result"] = "success";
			result["post"] = _result;
			util.responseWithJson(req, res, result, 200);
		}
	);
}

/**
 * 게시물 추천 API
 * 
 * Path : /api/post/recommend/{id}
 * Method : GET
 * 
 * Request
 * @path.id : 게시물 id
 * @query.by : 유저 id
 * 
 * Response
 * @body.result : 결과 문자열
 * @body.footstep : 게시물에 대한 수정된 footstep
 */
function recommendPost(req, res)
{
	var post_id = req.params.param2;
	var user_id = req.query.by;

	var result = {};

	FootStep.findOne(
		{
			post_id : post_id,
			user_id : user_id
		})
		.then((_result)=>
		{
			if(!_result)
			{
				console.log("footstep not found");
				result["result"] = "not found";
				return util.responseWithJson(req, res, result, 404);
			}

			if(_result.recommend)
			{
				// 이미 추천 상태인경우
				// 추천 상태를 false로 변경
				_result.recommend = false;

				Post.update({_id : post_id},
					{
						$inc :
						{
							count_recommend : -1
						}
					})
					.then();
			}
			else
			{
				// 추천 상태가 아닌 경우
				// 추천 상태를 true로 변경
				_result.recommend = true;
				_result.recommendDate = (new Date()).getTime();
				Post.update({_id : post_id},
					{
						$inc :
						{
							count_recommend : 1
						}
					})
					.then();
			}

			_result.save((__err, __result)=>
			{
				if(__err)
				{
					console.log("save footstep error\n", __err);
					result["result"] = "error";
					result["error"] = __err;
					return util.responseWithJson(req, res, result, 500);
				}
				result["result"] = "success";
				result["footstep"] = __result;
				util.responseWithJson(req, res, result, 200);
			});

		},
		(_err)=>
		{
			console.log("retrieve footstep error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		});
}

/**
 * 게시물 북마크 API
 * 
 * Path : /api/post/bookmark/{id}
 * Method : GET
 * 
 * Request
 * @path.id : 게시물 id
 * @query.by : 유저 id
 * 
 * Response
 * @body.result : 결과 문자열
 * @body.footstep : 게시물에 대한 수정된 footstep
 */
function bookmarkPost(req, res)
{
	var post_id = req.params.param2;
	var user_id = req.query.by;

	var result = {};

	FootStep.findOne(
		{
			post_id : post_id,
			user_id : user_id
		})
		.then((_result)=>
		{
			if(!_result)
			{
				console.log("footstep not found");
				result["result"] = "not found";
				return util.responseWithJson(req, res, result, 404);
			}

			if(_result.bookmark)
			{
				// 이미 북마크에 추가된 상태인경우
				// 북마크 해제
				_result.bookmark = false;
			}
			else
			{
				// 북마크에 추가하지 않은 경우
				// 북마크 설정
				_result.bookmark = true;
				_result.bookmarkDate = (new Date()).getTime();
			}

			_result.save((__err, __result)=>
			{
				if(__err)
				{
					console.log("save footstep error\n", __err);
					result["result"] = "error";
					result["error"] = __err;
					return util.responseWithJson(req, res, result, 500);
				}
				result["result"] = "success";
				result["footstep"] = __result;
				util.responseWithJson(req, res, result, 200);
			});

		},
		(_err)=>
		{
			console.log("retrieve footstep error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		});
}


/**
 * 게시물 덧글 추가 API
 * 
 * Path : /api/post/reply/{id}
 * Method : POST
 * 
 * Request
 * @path.id : 게시물 id
 * @body.user : 덧글 작성자 id
 * @body.content : 덧글 내용
 * @body.rereply : 답글 여부 [true, false]
 * @body.to : 답글인 경우, 해당 덧글 id
 * 
 * Response
 * @code.500 : 서버 에러
 * @code.404 : 해당 댓글을 찾을 수 없는 경우(삭제된 경우)
 * @code.200 : 정상 수행
 * @body.result : 결과 문자열
 * @body.replies : 해당 게시물에 대한 덧글 리스트
 */
function createReply(req, res)
{
	var post_id = req.params.param2;
	var user_id = req.body.user;
	var content = req.body.content;
	var rereply = req.body.rereply ? req.body.rereply : false;
	var to = req.body.to;
	var result = {};

	var reply = new Reply(
		{
			user_id : user_id,
			post_id : post_id,
			text : content,
			rereply : rereply,
			regDate : (new Date()).getTime()
		}
	);
	var tasks = 
		[
			function(callback)
			{
				// DB에 댓글 추가
				reply.save((_err, _result)=>
				{
					if(_err)
					{
						console.log("save reply error\n", _err);
						result["result"] = "error";
						result["error"] = _err;
						return util.responseWithJson(req, res, result, 500);
					}
					console.log("reply created");
					callback(null, _result);
				});
			},
			function(reply, callback)
			{
				// 게시물 댓글 카운트 +

				Post.findByIdAndUpdate({_id : post_id},
					{
						$inc :
						{
							count_replies : 1
						}
					},
					{new : true}
				)
				.then((_result)=>
				{
					console.log("post updated");
					result["count_replies"] = _result.count_replies;
					callback(null, reply);
				},
				(_err)=>
				{
					console.log("update post error\n",_err);
					result["result"] = "error";
					result["error"] = _err;
					return util.responseWithJson(req, res, result, 500);
				});
			}
		];

	if(rereply)
	{
		// 답글인 경우
		tasks.push(
			function(reply, callback)
			{
				// 해당 댓글에 참조 추가
				Reply.update({_id : to},
					{
						$push :
						{
							_ref : reply._id
						}
					})
				.then((_result)=>
				{
					callback();
				},
				(_err)=>
				{
					console.log("find reply error\n", _err);
					result["result"] = "error";
					result["error"] = _err;
					return util.responseWithJson(req, res, result, 500);
				});
			}
		);
	}

	async.waterfall(tasks,
	()=>
	{
		// retrieve replies
		Reply.find(
			{
				post_id : post_id,
				rereply : false
			})
			.populate("user_id", "_id username profile_img")
			.populate(
			{
				path : "_ref",
				populate : {path : "user_id"}
			})
		.sort({"regDate" : 1}) // ASCENDING SORT BY regDate
		.then((_result)=>
		{
			result["result"] = "success";
			result["replies"] = _result;
			util.responseWithJson(req, res, result, 200);
		},
		(_err)=>
		{
			console.log("retrieve replies error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			util.responseWithJson(req, res, result, 500);
		});
	});
}


/**
 * 덧글 조회 API
 * 
 * 게시물에 대한 덧글 목록을 반환
 * 
 * Path : /api/post/reply/{id}
 * Method : GET
 * 
 * Request
 * @path.id : 게시물 id
 * 
 * Response
 * @body.result : 결과 문자열
 * @body.replies : 덧글 목록(ASCENDING BY regDate)
 */
function retrieveReply(req, res)
{
	var post_id = req.params.param2;
	var result = {};

	// retrieve replies
	Reply.find(
		{
			post_id : post_id,
			rereply : false
		})
		.populate("user_id", "_id username profile_img")
		.populate(
		{
			path : "_ref",
			populate : {path : "user_id"}
		}
	)
	.sort({"regDate" : 1}) // ASCENDING SORT BY regDate
	.then((_result)=>
	{
		result["result"] = "success";
		result["replies"] = _result;
		util.responseWithJson(req, res, result, 200);
	},
	(_err)=>
	{
		console.log("retrieve replies error\n", _err);
		result["result"] = "error";
		result["error"] = _err;
		util.responseWithJson(req, res, result, 500);
	});
}


/**
 * 게시물 검색 API
 * 
 * Path : /api/post/search
 * Method : GET
 * 
 * Request
 * @query.q : 검색 키워드
 * @query.board : 검색할 게시판, 기본값 : 전체
 * @query.skin : 검색할 피부 타입, 기본값 : 전체
 * @query.sort : 정렬 방식, ["date", "recommend"], 기본값 "date"
 * 
 * Response
 * @body.result : 결과 문자열
 * @body.posts : 검색된 게시물 리스트
 * 
 */
function searchPosts(req, res)
{
	var query = req.query.q;
	var board = req.query.board;
	var skin = req.query.skin;
	var _sort = req.query.sort ? req.query.sort.toLowerCase() : "date";
	var result = {};

	var find = 
		{
			$text :
			{
				$search : query
			}
		};
	var findScore = 
		{
			score : {$meta : "textScore"}
		};
	var sort = 
		{
			score : {$meta : "textScore"}
		};

	if(board){find["board_id"] = board;}
	if(skin){find["skinType_id"] = skin;}
	if(_sort == "date"){sort["regDate"] = -1;}
	else if(_sort == "recommend"){sort["count_recommend"] = -1;}

	Post.find(find, findScore)
	.sort(sort)
	.populate("author", "username")
	.then((_result)=>
	{
		result["result"] = "success";
		result["posts"] = _result;
		util.responseWithJson(req, res, result, 200);
	},
	(_err)=>
	{
		console.log("search post error\n", _err);
		result["result"] = "error";
		result["error"] = _err;
		util.responseWithJson(req, res, result, 500);
	});

}


module.exports.createPost = createPost;
module.exports.retrievePosts = retrievePosts;
module.exports.retrievePost = retrievePost;
module.exports.searchPosts = searchPosts;
module.exports.updatePost = updatePost;
module.exports.recommendPost = recommendPost;
module.exports.bookmarkPost = bookmarkPost;
module.exports.createReply = createReply;
module.exports.retrieveReply = retrieveReply;
module.exports.searchPosts = searchPosts;