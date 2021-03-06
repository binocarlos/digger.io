var digger = require('../src');
var async = require('async');
var _ = require('lodash');

var Bridge = require('digger-bridge');

describe('contractresolver', function(){


  it('should run a basic pipe contract', function(done){

    var warehouse = digger.warehouse();

    warehouse.use(digger.middleware.contractresolver(warehouse));
    
    warehouse.use('/apples', function(req, res){
      res.send([1,2]);
    })

    warehouse.use('/oranges', function(req, res){
      var answer = _.map(req.body, function(digit){
        return digit*2;
      })
      res.send(answer);
    })

    var contract = Bridge.contract('pipe');

    var req1 = Bridge.request({
      method:'post',
      url:'/apples'
    })

    var req2 = Bridge.request({
      method:'post',
      url:'/oranges'
    })

    contract.add(req1);
    contract.add(req2);

    var res = Bridge.response(function(){
      res.statusCode.should.equal(200);
      res.body.length.should.equal(2);
      res.body[0].should.equal(2);
      res.body[1].should.equal(4);
      done();
    })
    warehouse(contract, res);
  })

  it('should run a basic merge contract', function(done){

    var warehouse = digger.warehouse();

    warehouse.use(digger.middleware.contractresolver(warehouse));

    warehouse.use('/apples', function(req, res){
      res.send([1,2]);
    })

    warehouse.use('/oranges', function(req, res){
      res.send([3,4]);
    })

    var contract = Bridge.contract('merge');

    var req1 = Bridge.request({
      method:'get',
      url:'/apples'
    })

    var req2 = Bridge.request({
      method:'get',
      url:'/oranges'
    })

    contract.add(req1);
    contract.add(req2);

    var res = Bridge.response(true);

    res.on('success', function(results){
      res.statusCode.should.equal(200);
      results.length.should.equal(4);
      results[1].should.equal(2);
      results[3].should.equal(4);
      done();
    })

    warehouse(contract, res);
  })

  it('should run a basic sequence contract', function(done){

    var warehouse = digger.warehouse();

    warehouse.use(digger.middleware.contractresolver(warehouse));

    var starttime = new Date().getTime();

    warehouse.use('/apples', function(req, res){
      setTimeout(function(){
        res.send([1,2]);  
      }, 50)
    })

    warehouse.use('/oranges', function(req, res){
      req.body.should.equal(123);
      var nowtime = new Date().getTime();

      var timegap = nowtime-starttime;

      var isless = timegap<50;

      isless.should.equal(false);

      res.send([3,4]);
    })

    var contract = Bridge.contract('sequence');

    var req1 = Bridge.request({
      method:'get',
      url:'/apples'
    })

    var req2 = Bridge.request({
      method:'post',
      url:'/oranges',
      body:123
    })

    contract.add(req1);
    contract.add(req2);

    var res = Bridge.response(true);

    res.on('success', function(results){
      res.statusCode.should.equal(200);
      results.length.should.equal(2);
      results[0].should.equal(3);
      results[1].should.equal(4);
      done();
    })
    
    warehouse(contract, res);
  })
 
})


