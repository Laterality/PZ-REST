"use strict";

var config = require("../config");
var express = require("express");
var multer = require("multer");
var rest_user = require("./user");
var rest_post = require("./post");
var rest_skintype = require("./skintype");
var rest_board = require("./board");
var rest_upload = require("./farm");
var rest_schedule = require("./schedule");
var upload_board = multer(
	{
		dest: config.imgFarm_board,
		onError : (err, next)=>
		{
			console.log("multer error\n", err);
			next(err);
		}
	});
var upload_profile = multer(
	{
		dest: config.imgFarm_profile,
		onError : (err, next)=>
		{
			console.log("multer error\n", err);
			next(err);
		}
	});

var router = express.Router();
module.exports = router;



router.use(function(req, res, next)
{
	console.log("request url path : ", req.path, "- ", Date.now());
	next();
});

router
.get("/:path", function(req, res, next)
{
	var path = req.params.path.toLowerCase();

	switch (path) {
	case "user":
		rest_user.retrieveUsers(req, res);
		break;
	case "post":
		rest_post.retrievePosts(req, res);
		break;
	case "skintype":
		rest_skintype.retrieveSkinTypes(req, res);
		break;
	case "board":
		rest_board.retrieveBoards(req, res);
		break;
	case "schedule":
		rest_schedule.pullSchedule(req, res);
		break;
	default:
		next();
		break;
	}
})
.get("/:path/:param", function(req, res, next)
{
	var path = req.params.path.toLowerCase();
	var param = req.params.param;

	switch (path) 
	{
	case "user":
		rest_user.retrieveUser(req, res);
		break;
	case "post":
		if(param == "search")
		{
			rest_post.searchPosts(req, res);
		}
		else
		{
			rest_post.retrievePost(req, res);
		}
		break;
	case "schedule":
		if(param == "monthly")
		{
			rest_schedule.retrieveMonthlyScheduleSet(req, res);
		}
		else if(param == "pool")
		{
			rest_schedule.retrievePoolSchedules(req, res);
		}
		break;
	case "skintype":
		rest_skintype.retrieveSkinType(req, res);
		break;
	case "board":
		rest_board.retrieveBoard(req, res);
		break;
	default:
		next();
		break;
	}
})
.get("/:path/:param1/:param2", function(req, res, next)
{
	var path = req.params.path.toLowerCase();
	var param1 = req.params.param1.toLowerCase();

	switch (path) {
	case "post":
		if(param1 == "recommend")
		{
			rest_post.recommendPost(req, res);
		}
		else if(param1 == "bookmark")
		{
			rest_post.bookmarkPost(req ,res);
		}
		else if(param1 == "reply")
		{
			rest_post.retrieveReply(req, res);
		}
		break;
	default:
		next();
		break;
	}
})
.post("/:path", function(req, res, next)
{
	var path = req.params.path.toLowerCase();

	switch(path)
	{
	case "post":
		rest_post.createPost(req, res);
		break;
	case "skintype":
		rest_skintype.createSkinType(req, res);
		break;
	case "board":
		rest_board.createBoard(req, res);
		break;
	default:
		next();
		break;
	}
})
.post("/:path/:param", function(req, res, next)
{
	var path = req.params.path.toLowerCase();
	var param = req.params.param;

	switch(path)
	{
	case "user":
		switch (param) 
		{
		case "register":
			rest_user.registerUser(req, res);
			break;
		case "login":
			var login_type = req.body.login_type.toLowerCase();
			if(login_type == "native")
			{
				rest_user.loginNativeUser(req, res);
			}
			else if(login_type == "google")
			{
				rest_user.loginGoogleUser(req, res);
			}
			break;
		default:
			next();
			break;
		}
		break;
	case "schedule":
		switch(param)
		{
		case "pool":
			rest_schedule.createPoolSchedule(req, res);
			break;
		default:
			next();
			break;
		}
		break;
	default:
		next();
		break;
	}
})
.post("/:path/:param1/:param2", function(req, res, next)
{
	var path = req.params.path.toLowerCase();
	var param1 = req.params.param1.toLowerCase();

	switch (path) {
	case "post":
		if(param1 == "reply")
		{
			rest_post.createReply(req, res);
		}
		break;
	default:
		next();
		break;
	}
})
.put("/:path/:param", function(req, res, next)
{
	var path = req.params.path;

	switch(path)
	{
	case "user":
		rest_user.updateUser(req, res);
		break;
	default:
		next();
	}
})
.post("/upload/board", upload_board.single("boardimg"), function(req, res, next)
{
	rest_upload.uploadBoardImage(req, res);
})
.post("/upload/profile", upload_profile.single("profileimg"), function(req, res, next)
{
	rest_upload.uploadProfileImage(req, res);
});