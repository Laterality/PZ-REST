"use strict";

var mongoose = require("mongoose");
var fs = require("fs");
var path = require("path");
var schemas = require("../db_models");
var config = require("../config");
var util = require("./utils");

mongoose.Promise = global.Promise;

var Post = mongoose.model("Post", schemas.PostSchema);

/**
 * 게시물 이미지 업로드 API
 * 
 * Path : /upload/board
 * Method : POST
 * 
 * Request
 * @body.id : 게시물 id
 * @body.no : 이미지 번호
 * @body.boardimg : 이미지
 * 
 * Response
 * @body.result : 결과 문자열
 * @body.src : 이미지 url
 */
function uploadBoardImage(req, res)
{
	console.log("req.file\n", req.file);
	console.log("body\n", req.body);
	var description = JSON.parse(req.body.description);
	console.log("description\n", description);
	var result = {};
	var post_id = description.id;
	var no = description.no;
	var ext = description.ext;
	var filename = post_id + "_" + no + "." + ext;
	var path_home = path.join(__dirname, "..");
	var path_public = path.join(__dirname, "..", "public");
	var path_img = path.join(path_home, config.imgFarm_board);
	var path_rel = path.relative(path_public, path_img);

	

	fs.rename(path.join(path_img, req.file.filename),
	path.join(path_img, filename) , 
	(err)=>
	{
		if(err)
		{
			console.log("fs error\n", err);
			result["result"] = "error";
			result["error"] = err;
			return util.responseWithJson(req, res, result, 500);
		}
		result["path"] = path.join(path_rel, filename);

		Post.findById(post_id)
		.then((_result)=>
		{
			_result.content[no].content = result.path;
			_result.save()
			.then((_result)=>
			{
				result["result"] = "success";
				util.responseWithJson(req, res, result, 200);
			});
		},
		(_err)=>
		{
			console.log("retrieve post error");
			result["result"] = "error";
			result["error"] = _err;
		});

		
	});
}


function uploadProfileImage(req, res)
{

}


module.exports.uploadBoardImage = uploadBoardImage;
module.exports.uploadProfileImage = uploadProfileImage;