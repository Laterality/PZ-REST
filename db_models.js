var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var UserSchema = new Schema(
	{
		email : 
		{
			type : String, 
			unique : true
		},
		login_type : String,
		external_id : 
		{
			type : String,
			default : null
		},
		username : 
		{
			type : String,
			index : true
		},
		password : String,
		salt : String,
		profile_img : String,
		gender : 
		{
			type : String,
			enum : ["FEMALE", "MALE"]
		},
		skin_type : {type : Schema.Types.ObjectId, ref : "SkinType"},
		regDate : Number,
		push : 
		{
			device_id : String,
			grant : 
			{
				type : Boolean,
				default : true
			}
		}
	}
);

var SkinTypeSchema = new Schema(
	{
		name : String
	}
);

var PostSchema = new Schema(
	{
		author : {type : Schema.Types.ObjectId, ref : "User"},
		board_id : {type : Schema.Types.ObjectId, ref : "Board"},
		skinType_id : {type : Schema.Types.ObjectId, ref : "SkinType"},
		regDate : Number,
		lastModDate : Number,
		title : String,
		content : 
		[
			{
				_index : Number,
				_type : String,
				content : String
			}
		],
		count_replies : 
		{
			type : Number,
			default : 0
		},
		count_recommend : 
		{
			type : Number,
			default : 0
		},
		count_view : 
		{
			type : Number,
			default : 0
		}
	}
)
.index({title : "text", content : "text"});


var BoardSchema = new Schema(
	{
		name : String,
	}
);

var NotificationSchema = new Schema(
	{
		user_id : 
		{
			type : Schema.Types.ObjectId, 
			ref : "User", 
			index : true
		},
		code : Number,
		text : String
	}
);


var ReplySchema = new Schema(
	{
		user_id : 
		{
			type : Schema.Types.ObjectId, 
			ref : "User",
			index : true
		},
		post_id : 
		{
			type : Schema.Types.ObjectId, 
			ref : "User",
			index : true
		},
		text : String,
		rereply : 
		{
			type : Boolean,
			default : false
		}, // 답글 여부
		_ref : [{type : Schema.Types.ObjectId, ref : "Reply"}], // 덧글 id 리스트
		regDate : Number
	}
);

var FootStepSchema = new Schema(
	{
		user_id : 
		{
			type : Schema.Types.ObjectId, 
			ref : "User",
			index : true
		},
		post_id : 
		{
			type : Schema.Types.ObjectId, 
			ref : "User",
			index : true
		},
		read : 
		{
			type : Boolean,
			default : false
		},
		recommend : 
		{
			type : Boolean,
			default : false
		},
		bookmark : 
		{
			type : Boolean,
			default : false
		},
		readDate : Number,
		recommendDate : Number,
		bookmarkDate : Number
	}
);


var PoolScheduleSchema = new Schema(
	{
		skinType_id : 
		{
			type : Schema.Types.ObjectId,
			ref : "SkinType",
		},
		period : 
		{
			type : String,
			enum : ["MORNING", "NOON", "EVENING"]
		},
		dayOfWeek :
		{
			type : Number,
			min : 1, // Monday
			max : 7 // Sunday
		},
		text :
		{
			type : String
		}
	}
);

var ScheduleSchema = new Schema(
	{
		user_id : 
		{
			type : Schema.Types.ObjectId,
			ref : "User",
			default : null
		},
		period : 
		{
			type : String,
			enum : ["MORNING", "NOON", "EVENING"]
		},
		date : Number,
		text : String,
		fulfilled : 
		{
			type : Boolean,
			default : false
		}
	}
);


var MonthlyScheduleSetSchema = new Schema(
	{
		user_id :
		{
			type : Schema.Types.ObjectId,
			ref : "User"
		},
		date :
		{
			year : Number,
			month : Number
		},
		day_entire : 
		{
			type : Number,
			default : 0
		},
		day_fulfilled : 
		{
			type : Number,
			default : 0
		},
		schedules :
		[
			{
				type : Schema.Types.ObjectId,
				ref : "DailyScheduleSet"
			}
		]
	}
);


var DailyScheduleSetSchema = new Schema(
	{
		user_id : 
		{
			type : Schema.Types.ObjectId, 
			ref : "User"
		},
		date : Number, // time 00:00:00
		schedules : 
		[
			{
				type : Schema.Types.ObjectId,
				ref : "Schedule"
			}
		]
	}
);

module.exports.UserSchema = UserSchema;
module.exports.SkinTypeSchema = SkinTypeSchema;
module.exports.PostSchema = PostSchema;
module.exports.BoardSchema = BoardSchema;
module.exports.NotificationSchema = NotificationSchema;
module.exports.ReplySchema = ReplySchema;
module.exports.FootStepSchema = FootStepSchema;
module.exports.PoolScheduleSchema = PoolScheduleSchema;
module.exports.ScheduleSchema = ScheduleSchema;
module.exports.MonthlyScheduleSetSchema = MonthlyScheduleSetSchema;
module.exports.DailyScheduleSetSchema = DailyScheduleSetSchema;