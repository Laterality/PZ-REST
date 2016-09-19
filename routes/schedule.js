var mongoose = require("mongoose");
var async = require("async");
var moment = require("moment");

var schemas = require("../db_models");
var util = require("./utils");

mongoose.Promise = global.Promise;

var User = mongoose.model("User", schemas.UserSchema);
var PoolSchedule = mongoose.model("PoolSchedule", schemas.PoolScheduleSchema);
var Schedule = mongoose.model("Schedule", schemas.ScheduleSchema);
var MonthlyScheduleSet = mongoose.model("MonthlyScheduleSet", schemas.MonthlyScheduleSetSchema);
var DailyScheduleSet = mongoose.model("DailyScheduleSet", schemas.DailyScheduleSetSchema);


/**
 * 피부타입 별 스케줄 생성 API
 * 
 * Path : /api/schedule/pool
 * Method : POST
 * 
 * Request
 * @body.skinType_id : 스케줄을 적용할 피부 타입(전체 타입에 적용할 경우 null, 기본값 null)
 * @body.text : 스케줄 내용
 * @body.period : 스케줄을 적용할 시간 (["MORNING", "NOON", "EVENING"])
 * @body.dayOfWeek : 스케줄을 적용할 요일(1(월요일) ~ 7(일요일))
 * 
 * Response
 * @body.result : 결과 문자열
 * @body.poolSchedule : 생성된 스케줄
 */
function createPoolSchedule(req, res)
{
	var skinType_id = req.body.skinType_id ? req.body.skinType_id : null;
	var text = req.body.text;
	var period = req.body.period.toUpperCase();
	var dow = req.body.dayOfWeek;
	var result = {};

	var poolSchedule = new PoolSchedule(
		{
			skinType_id : skinType_id,
			period : period,
			dayOfWeek : dow,
			text : text
		}
	);

	poolSchedule.save()
	.then(
		(_result)=>
		{
			result["result"] = "success";
			result["poolSchedule"] = _result;
			util.responseWithJson(req, res, result, 200);
		},
		(_err)=>
		{
			console.log("pool schedule save error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			util.responseWithJson(req, res, result, 500);
		}
	);
}

/**
 * 풀 스케줄 조회 API
 * 
 * Path : /api/schedule/pool
 * Method : GET
 * 
 * Request
 * @query.period : 시간대 필터(["MORNING", "NOON", "EVENING"], 기본값 전체)
 * @query.skintype : 피부 타입 id(기본값 전체)
 */
function retrievePoolSchedules(req, res)
{
	var period = req.query.period ? req.query.period.toUpperCase() : null;
	var skintype = req.query.skintype ? req.query.skintype : null;
	var find = {};
	var result = {};
	if(period){find["period"] = period;}
	if(skintype){find["skinType_id"] = skintype;}

	PoolSchedule.find(find)
	.then(
		(_result)=>
		{
			result["result"] = "success";
			result["poolschedules"] = _result;
			util.responseWithJson(req, res, result, 200);
		},
		(_err)=>
		{
			result["result"] = "error";
			result["error"] = _err;
			util.responseWithJson(req, res, result, 500);
		}
	);
}

/**
 * 스케줄 Pulling API
 * 
 * Path : /api/schedule/
 * Method : GET
 * 
 * Request
 * @query.user : 유저 id
 * 
 * Response
 * @body.result : 요청 결과 문자열
 * @body.schedule : Pulled 된 스케줄 
 * 
 * Note : date.month 는 0부터 시작함, 즉 1월 = 0
 */
function pullSchedule(req, res)
{
	var user = req.query.user;
	var result = {};
	var date = moment(); // 00:00:00 of today
	date.millisecond(0);
	date.second(0);
	date.minute(0);
	date.hour(0);

	var monthly;
	var daily;
	var user_info;

	var find = 
		{
			user_id : user,
			"date.year" : date.year(),
			"date.month" : date.month()
		};


	function fetchMonthly(callback)
	{
		// 월간 스케줄 인출
		MonthlyScheduleSet.findOne(find)
		.populate("schedules")
		.populate(
			{
				path : "schedules",
				populate : {path : "schedules"}
			})
		.then(
			(_result)=>
			{
				monthly = _result;
				callback(null, _result);
			},
			(_err)=>
			{
				console.log("retrieve monthly schedule set error\n",_err);
				callback(_err);
			}
		);
	}

	function fetchDaily(callback)
	{
		// 일간 스케줄 인출
		var find = 
			{
				user_id : user,
				date : date.valueOf()
			};
		DailyScheduleSet.findOne(find)
		.populate("schedules")
		.then(
			(_result)=>
			{
				daily = _result;
				callback(null, _result);
			},
			(_err)=>
			{
				console.log("retrieve daily schedule set error\n", _err);
				callback(_err);
			}
		);
	}

	function fetchUser(callback)
	{
		// 피부유형 파악을 위해 유저 정보 인출
		User.findById(user)
		.populate("skin_type")
		.then(
			(_result)=>
			{
				user_info = _result;
				callback(null, _result);
			},
			(_err)=>
			{
				callback(_err);
			}
		);
	}

	function fetchPoolSchedule(callback)
	{
		// 사용자의 피부 유형에 따른 schedule을 PoolSchedule에서 인출한 뒤 이를 Schedule에 저장
		// 당일의 요일도 고려해서 인출
		PoolSchedule.find(
			{
				skinType_id : user_info.skin_type,
				dayOfWeek : date.isoWeekday()
			}
		)
		.then(
			(_result)=>
			{
				var toSave = [];
				var saved = [];
				for(var i in _result)
				{
					toSave.push(
						new Schedule(
							{
								user_id : user,
								period : _result[i].period,
								date : date.valueOf(),
								text : _result[i].text
							}
						)
					);
				}
				
				async.eachSeries(toSave, 
				(_item, _callback)=>
				{
					_item.save()
					.then(
						(__result)=>
						{
							console.log("schedule saved\n", __result);
							saved.push(__result);
							_callback();
						},
						(__err)=>
						{
							_callback(__err);
						});
				},
				(__err)=>
				{
					// schedule 생성이 완료되면 DailyScheduleSet을 생성하고 schedule을 추가
					// dss 생성 task로 이행
					callback(__err, saved);
				});
			},
			(_err)=>
			{
				callback(_err);
			}
		);
	}

	function createMss(dss, callback)
	{
		var mss = new MonthlyScheduleSet(
			{
				user_id : user,
				date :
				{
					year : date.year(),
					month : date.month()
				},
				day_entire : 1,
				schedules :
				[
					dss
				]
			}
		);

		mss.save()
		.then(
			(_result)=>
			{
				callback(null, _result);
			},
			(_err)=>
			{
				callback(null);
			}
		);
	}

	function pushDssToMss(dss)
	{
		var update = 
			{
				$push :
				{
					schedules : 
					{
						dss
					}
				},
				$inc :
				{
					day_entire : 1
				}
			};

		MonthlyScheduleSet.findAndUpdate(find, update)
		.then(
			(_result)=>
			{
				result["result"] = "success";
				result["monthlyscheduleset"] = _result;
			}
		);
	}

	function createDailyScheduleSet(saved, callback)
	{
		// 전달받은 schedule로 dss 생성
		var dss = new DailyScheduleSet(
			{
				user_id : user,
				date : date.valueOf(),
				schedules : saved
			}
		);
		dss.save()
		.then(
			(_result)=>
			{
				// 생성된 dss를 전달
				callback(null, _result);
			},
			(_err)=>
			{
				console.log("create daily schedule set error\n", _err);
				callback(_err);
			}
		);
	}

	var tasks_1 = [fetchDaily, fetchMonthly, fetchUser];
	var tasks_2 = [fetchPoolSchedule, createDailyScheduleSet, pushDssToMss];
	var tasks_3 = [fetchPoolSchedule, createDailyScheduleSet, createMss];

	function cb2(_err, _result)
	{
		if(_err)
		{
			console.log("error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			return util.responseWithJson(req, res, result, 500);
		}
		MonthlyScheduleSet.findOne(find)
		.populate("schedules")
		.populate(
			{
				path : "schedules",
				populate : {path : "schedules"}
			})
		.then(
			(_result)=>
			{
				result["result"] = "success";
				result["monthlyscheduleset"] = _result;
				util.responseWithJson(req, res, result, 200);
			},
			(_err)=>
			{
				console.log("retrieve monthly schedule set error\n", _err);
				result["result"] = "error";
				result["error"] = _err;
				util.responseWithJson(req, res, result, 500);
			}
		);
	}

	function cb1(_err, _results)
	{
		// daily가 존재하는지 먼저 검사한 후 생성 여부 결정
		if(daily)
		{
			// daily가 존재하는 경우, 이미 당일 schedule을 pull한 이력이 있으므로, monthly의 존재가 보장됨. monthly를 반환
			result["result"] = "success";
			result["monthlyscheduleset"] = monthly;
			util.responseWithJson(req, res, result, 200);
		}
		else
		{
			// daily가 존재하지 않는 경우, 별도 task로 이행
			if(monthly)
			{
				async.waterfall(tasks_2, cb2);
			}
			else
			{
				async.waterfall(tasks_3, cb2);
			}
		}
	}
	async.parallel(tasks_1, cb1);
}

/**
 * 스케줄 조회 API
 * 
 * Path : /api/schedule/monthly
 * Method : GET
 * 
 * Request
 * @query.user : 사용자 id
 * @query.year : 조회할 연도(1 부터 시작)
 * @query.month : 조회할 월
 * 
 * Response
 * @body.result : 요청 결과 문자열
 * @body.monthlyscheduleset : 월 단위 스케줄
 */
function retrieveMonthlyScheduleSet(req, res)
{
	var result = {};
	var user = req.query.user;
	var year = req.query.year;
	var month = req.query.month;
	var find = 
		{
			user_id : user,
			year : year,
			month : month
		};
	MonthlyScheduleSet.findOne(find)
	.populate("schedules")
	.then(
		(_result)=>
		{
			result["result"] = "success";
			result["monthlyscheduleset"] = _result;
			util.responseWithJson(req, res, result, 200);
		},
		(_err)=>
		{
			console.log("retrieve monthly schedule set error\n", _err);
			result["result"] = "error";
			result["error"] = _err;
			util.responseWithJson(req, res, result, 500);
		}
	);
}


/**
 * 스케줄 상태 변경 API
 * 
 * Path : /api/schedule/fulfill/{id}
 * Method : GET
 * 
 * Request
 * @path.id : 스케줄 id
 * 
 * Response
 * @body.result : 결과 문자열
 * @body.schedule : 변경된 스케줄
 */
function toggleScheduleFulfillState(req ,res)
{
	
}




module.exports.createPoolSchedule = createPoolSchedule;
module.exports.retrievePoolSchedules = retrievePoolSchedules;
module.exports.pullSchedule = pullSchedule;
module.exports.retrieveMonthlyScheduleSet = retrieveMonthlyScheduleSet;
