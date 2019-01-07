var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

const axios = require("axios");
const parser = require('xml2json');


app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization, Accept,X-Requested-With,x-csrf-token');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', true);
  // 這裡不能用 * 號, 要改成 domain 的方式才能設置 cookies
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  if (req.method === 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
});

app.get("/bus",function(req,res,next){
  var busLine = req.query.line;
  axios.get("http://ibus.tbkc.gov.tw/xmlbus/StaticData/GetRoute.xml").then((response)=>{
    let temp = parser.toJson(response.data,{object:true});
    if(busLine == null){
      res.send(temp);
    }else if(busLine == 'all'){
      res.send(temp.BusDynInfo.BusInfo.Route);
    }else if(busLine == '黃'){
      let result = temp.BusDynInfo.BusInfo.Route.filter((bus)=>{
        return bus['nameZh'].includes("黃1") || bus['nameZh'].includes("黃2");
      })
      res.send(result);
    }else{
      let result = temp.BusDynInfo.BusInfo.Route.filter((bus)=>{
        return bus['nameZh'].includes(busLine);
      })
      res.send(result);
    }
  })
})

app.get("/station",function(req,res,next){
  let stationID = req.query.id;
  axios.get(`http://ibus.tbkc.gov.tw/xmlbus/StaticData/GetStop.xml?routeIds=${stationID}`).then((response)=>{
    let temp = parser.toJson(response.data,{object:true});
    res.send(temp);
  })
})

app.get("/route",function(req,res,next){
  let stationID = req.query.id;
  let isFlutter = req.query.isFlutter;
  axios.get(`http://ibus.tbkc.gov.tw/xmlbus/GetEstimateTime.xml?routeIds=${stationID}`).then((response)=>{
    let temp = parser.toJson(response.data,{object:true,arrayNotation:true});
    if(isFlutter==null){
      res.send(temp);
    }else{  
      let data = temp.BusDynInfo[0].BusInfo[0].Route[0].EstimateTime;
      data.map((item)=>{
        if(Object.keys(item.ests[0]).length!=0 && item.comeTime!=''){
          item["lastTime"] = item.ests[0].est[0].est;
          item["nextTime"] = item.comeTime;
          item["nextBus"] = item.carId;
        }else if(item.comeTime!=''){
          item["nextTime"] = item.comeTime;
          item["lastTime"] = item.comeTime;
          item["nextBus"] = item.comeCarid;
        }else{
          item["nextTime"] = "末班車已發";
          item["lastTime"] = "";
          item["nextBus"] = "";
        }
      });
      res.send(data);
    }
  })
})

app.get("/busData",function(req,res,next){
  let id = req.query.id;
  axios.get(`http://ibus.tbkc.gov.tw/xmlbus/GetBusData.xml?routeids=${id}`).then((response)=>{
    let temp = parser.toJson(response.data,{object:true,arrayNotation:true});
    res.send(temp);
  })
})

app.get("/getLastTime",function(req,res,next){
  let RID = req.query.RID;
  let BID = req.query.BID;
  axios.get(`http://ibus.tbkc.gov.tw/xmlbus/GetEstimateTime.xml?routeIds=${RID}`).then((response)=>{
    let temp  = parser.toJson(response.data,{object:true});
    let Route = temp.BusDynInfo.BusInfo.Route.EstimateTime;
    let data = {};
    Route.forEach((item,index)=>{
      if(item.SID == BID){
        data = item;
      }
    })
    res.send(data);
  })
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
