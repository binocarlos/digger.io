var digger = require('../src');
var data = require('./fixtures/data');
var async = require('async');
var Bridge = require('digger-bridge');

describe('supplier', function(){

  it('should be a function', function(done) {
    var supplier = digger.supplier();
    supplier.should.be.a('function');
    done();
  })

  it('should emit events', function(done) {
    var supplier = digger.supplier();
    supplier.on('hello', done);
    supplier.emit('hello');
  })

  it('should provide a flag for being a supplier function', function() {
    var supplier = digger.supplier();
    supplier._diggertype.should.equal('supplier');
  })

  it('should extract the context for GET requests', function(done) {

    function runrequest(req, throwfn, callbackfn){
      
      var supplier = digger.supplier();

      supplier.select(function(select_query, promise){
        throwfn(select_query);
        process.nextTick(function(){
          promise.resolve({
            ok:true
          })  
        })
      })

      req = Bridge.request(req);
      var res = Bridge.response(true);

      res.on('success', callbackfn);
      res.on('failure', function(error){
        throw new Error('request error: ' + error);
      })

      supplier(req, res);
    }

    async.series([

      function(next){
        runrequest({
          method:'get',
          url:'/12313'
        }, function(select_query){
          var selector = select_query.selector;
          selector.diggerid.should.equal('12313');
        }, function(result){
          result[0].ok.should.equal(true);
          next();
        })
      },

      function(next){
        runrequest({
          method:'get',
          url:'/_12313'
        }, function(select_query){
          var selector = select_query.selector;
          selector.id.should.equal('12313');
        }, function(result){

          result[0].ok.should.equal(true);
          next();
        })
      },

      function(next){
        runrequest({
          method:'get',
          url:'/product'
        }, function(select_query){
          var selector = select_query.selector;
          selector.tag.should.equal('product');
        }, function(result){
          result[0].ok.should.equal(true);
          next();
        })
      },

      function(next){
        runrequest({
          method:'get',
          url:'/product.onsale.red'
        }, function(select_query){
          var selector = select_query.selector;
          selector.tag.should.equal('product');
          selector.class.onsale.should.equal(true);
          selector.class.red.should.equal(true);
        }, function(result){
          result[0].ok.should.equal(true);
          next();
        })
      },

      function(next){
        runrequest({
          method:'get',
          url:'/.red'
        }, function(select_query){
          var selector = select_query.selector;
          selector.class.red.should.equal(true);
        }, function(result){
          result[0].ok.should.equal(true);

          next();
        })
      }

    ], done)

  })

  it('should run contracts from multiple selectors', function(done) {
    function runrequest(req, throwfn, callbackfn){
      
      var supplier = digger.supplier();

      supplier.select(function(select_query, promise){
        throwfn(select_query);
        process.nextTick(function(){
          promise.resolve({
            ok:true
          })
        })
      })

      req = Bridge.request(req);
      var res = Bridge.response(true);

      res.on('success', callbackfn);
      res.on('failure', function(error){
        throw new Error('request error: ' + error);
      })

      supplier(req, res);
    }

    var hit = {};

    var throwfns = [
      function(select_query){
        var selector = select_query.selector;
        selector.tag.should.equal('product');
        selector.class.onsale.should.equal(true);
        hit.first = true;
      },

      function(select_query){
        var selector = select_query.selector;
        selector.tag.should.equal('caption');
        selector.class.red.should.equal(true);
        hit.second = true;
      }

    ]

    runrequest({
      method:'get',
      url:'/product.onsale/caption.red'
    }, function(select_query){
      var fn = throwfns.shift();
      fn(select_query);
    }, function(result){
      hit.first.should.equal(true);
      hit.second.should.equal(true);
      done();
    })
      
  })

  it('should make creating different suppliers easy', function(done) {

    var supplier = digger.supplier();

    supplier.select(function(select_query, promise){
      throw new Error('wrong routing');
    })

    supplier.specialize('product.onsale', function(select_query, promise){
      select_query.selector.tag.should.equal('product');
      select_query.selector.class.onsale.should.equal(true);
      promise.resolve({
        answer:10
      })
    })

    req = Bridge.request({
      url:'/product.onsale.test',
      method:'get'
    })

    var res = Bridge.response(true);

    res.on('success', function(){
      res.body.should.be.a('array');
      res.body[0].answer.should.equal(10);
      done();
    })

    res.on('failure', function(error){
      throw new Error('request error: ' + error);
    })

    supplier(req, res);
  })

  it('should accept a stack location as an argument', function() {
    var supplier = digger.supplier('warehouse:/api/products');

    supplier.url().should.equal('warehouse:/api/products');
    supplier.settings.attr('url').should.equal('warehouse:/api/products');
  })

  it('should stamp the stack locations as the diggerwarehouse for container data returned', function(done) {

    var supplier = digger.supplier('warehouse:/api/products');

    supplier.select(function(select_query, promise){
      promise.resolve({
        name:'test'
      })
    })

    req = Bridge.request({
      url:'/product.onsale.test',
      method:'get'
    })

    var res = Bridge.response(true);

    res.on('success', function(){
      res.getHeader('content-type').should.equal('digger/containers');
      res.body.should.be.a('array');
      res.body[0]._digger.diggerwarehouse.should.equal('warehouse:/api/products');
      res.body[0]._digger.diggerwarehouse.should.equal(supplier.url());
      done();
    })

    supplier(req, res);

  })

  it('should pass the request as part of the query and emit events for each', function(done) {

    var supplier = digger.supplier();
    var supplychain = Bridge(supplier).connect();

    var hitevents = {};

    supplier.select(function(select_query, promise){

      /*
      
        send a single container on purpose

        the supplier should turn it into an array
        
      */
      promise.resolve({
        name:'test',
        _digger:{
          diggerid:123
        }
      })
    })


    supplier.on('switchboard', function(message){
      hitevents[message.action] = true;
    })

    supplier.append(function(append_query, promise){
      var req = append_query.req;
      append_query.body[0]._digger.tag.should.equal('appendtest');
      req.method.should.equal('post');
      req.url.should.equal('/');
      promise.resolve(append_query.body);
    })

    supplier.save(function(save_query, promise){
      var req = save_query.req;
      req.method.should.equal('put');
      req.url.should.equal('/123');

      promise.resolve({
        name:'test'
      })
    })

    supplier.remove(function(remove_query, promise){
      var req = remove_query.req;
      req.method.should.equal('delete');
      req.url.should.equal('/123');
      promise.resolve({
        name:'test'
      })
    })

    var loadedproduct = null;
    async.series([
      function(next){
        supplychain('product').ship(function(product){
          
          product.attr('name').should.equal('test');
          product.diggerwarehouse().should.equal('/');
          product.diggerurl().should.equal('/123');

          loadedproduct = product;
          next();
        })
      },

      function(next){

        var appendcontainer = Bridge.container('appendtest', {
          title:'test'
        })

        supplychain.append(appendcontainer).ship(function(){
          
          next();
        })
      },

      function(next){
        loadedproduct.attr('price', 456).save().ship(function(){
          next();
        })
      },

      function(next){
        loadedproduct.remove().ship(function(){
          next();
        })
      }
    ], function(error){
      if(error){
        throw new Error(error);
      }

      setTimeout(function(){
        hitevents.append.should.equal(true);
        hitevents.save.should.equal(true);
        hitevents.remove.should.equal(true);  
        done();
      }, 10)
      

      
    })

  })


  it('should return container data', function(done) {

    var supplier = digger.supplier();

    supplier.select(function(select_query, promise){
      promise.resolve({
        name:'test'
      })
    })

    req = Bridge.request({
      url:'/product.onsale.test',
      method:'get'
    })

    var res = Bridge.response(true);

    res.on('success', function(){
      res.getHeader('content-type').should.equal('digger/containers');
      res.body.should.be.a('array');
      done();
    })

    supplier(req, res);

  })



  it('should handle append operations', function(done) {

    var supplier = digger.supplier({
      
    })

    /*
    
      the select is needed to deal with the auto-skeleton
      
    */
    supplier.select(function(select_query, promise){
      promise.resolve({
        name:'test',
        _digger:{
          tag:'test',
          diggerid:'12345'
        }
      })
    })

    supplier.append(function(append_query, promise, next){

      append_query.target._digger.diggerid.should.equal('12345');
      append_query.target._digger.tag.should.equal('test');

      promise.resolve(45);
    })

    req = Bridge.request({
      method:'post',
      url:'/12345',
      body:20
    })

    var res = Bridge.response(true);
    res.on('success', function(answer){
      answer.should.equal(45);
      done();
    })

    supplier(req, res);
  })

  it('should handle save operations', function(done) {
    var supplier = digger.supplier({
      
    })

    /*
    
      the select is needed to deal with the auto-skeleton
      
    */
    supplier.select(function(select_query, promise){
      promise.resolve({
        name:'test',
        _digger:{
          tag:'test',
          diggerid:'12345'
        }
      })
    })

    supplier.save(function(save_query, promise, next){

      save_query.target._digger.diggerid.should.equal('12345');
      save_query.target._digger.tag.should.equal('test');
      save_query.body.should.equal(20);

      promise.resolve(45);      
    })

    req = Bridge.request({
      method:'put',
      url:'/12345',
      body:20
    })

    req.setHeader('x-debug', true);

    var res = Bridge.response(true);
    res.on('success', function(answer){
      answer.should.equal(45);
      done();
    })

    supplier(req, res);
  })

  it('should handle delete operations', function(done) {
    var supplier = digger.supplier({
      
    })

    supplier.select(function(select_query, promise){
      promise.resolve({
        name:'test',
        _digger:{
          tag:'test',
          diggerid:'12345'
        }
      })
    })

    supplier.remove(function(remove_query, promise, next){

      remove_query.target._digger.diggerid.should.equal('12345');
      remove_query.body.should.equal(20);
      
      promise.resolve(45);
    })

    req = Bridge.request({
      method:'delete',
      url:'/12345',
      body:20
    })

    var res = Bridge.response(true);
    res.on('success', function(answer){
      answer.should.equal(45);
      done();
    })

    supplier(req, res);
  })

  it('should emit append / save and remove events', function(done) {

    var hit = {};
    var supplier = digger.supplier({
      
    })

    supplier.select(function(select_query, promise){
      promise.resolve({
        test:10
      })
    })

    supplier.append(function(append_query, promise, next){
      promise.resolve(45);
    })
    supplier.save(function(append_query, promise, next){
      promise.resolve(46);
    })
    supplier.remove(function(append_query, promise, next){
      promise.resolve(47);
    })

    supplier.on('switchboard', function(message){
      if(message.action==='append'){
        hit.append = true;
        message.body.should.equal(20);
        message.result.should.equal(45);
      }
      else if(message.action==='save'){
        hit.save = true;
        message.body.should.equal(20);
        message.result.should.equal(46);
      }
      else if(message.action==='remove'){
        hit.remove = true;
        message.result.should.equal(47);
      }
      
    })

    async.series([
      function(next){
        var req = Bridge.request({
          method:'post',
          url:'/12345',
          body:20
        })

        var res = Bridge.response(true);
        res.on('success', function(answer){
          answer.should.equal(45);
          next();
        })

        supplier(req, res);
      },

      function(next){

        var req = Bridge.request({
          method:'put',
          url:'/12345',
          body:20
        })

        var res = Bridge.response(true);
        res.on('success', function(answer){
          answer.should.equal(46);
          next();
        })

        supplier(req, res);
      },

      function(next){

        var req = Bridge.request({
          method:'delete',
          url:'/12345'
        })

        var res = Bridge.response(true);
        res.on('success', function(answer){

          answer.should.equal(47);

          setTimeout(function(){
            next();
          }, 10);
        })

        supplier(req, res);
      }
    ], function(){

      hit.append.should.equal(true);
      hit.save.should.equal(true);
      hit.remove.should.equal(true);

      done();
    })
  })

  it('should pipe specialized selectors to each other', function(done) {

    var supplier = digger.supplier();

    supplier.specialize('product', function(select_query, promise){
      promise.resolve({
        name:'product',
        _digger:{
          diggerid:2323,
          left:10,
          right:12          
        }
      })
    })

    supplier.specialize('caption', function(select_query, promise){      

      select_query.context.should.be.a('array');
      select_query.context.length.should.equal(1);


      var parentmeta = select_query.context[0];
      parentmeta.diggerid.should.equal(2323);
      parentmeta.left.should.equal(10);

      promise.resolve({
        name:'caption'
      })
    })

    req = Bridge.request({
      url:'/product/caption',
      method:'get'
    })

    var res = Bridge.response(true);

    res.on('success', function(){
      res.getHeader('content-type').should.equal('digger/containers');
      res.body.should.be.a('array');
      res.body[0].name.should.equal('caption');
      done();
    })

    supplier(req, res);

  })

  it('should deal with the URL of the supplier and still match requests', function(done) {

    var supplier = digger.supplier({
      url:'/some/place'
    })

    supplier.specialize('apples', function(select_query, promise){
      promise.resolve({
        title:'hello'
      })
    })

    var supplychain = Bridge(supplier).connect('/some/place');

    supplychain('apples.test').ship(function(apples, res){
      apples.count().should.equal(1);
      apples.attr('title').should.equal('hello');
      apples.diggerwarehouse().should.equal('/some/place');
      done();
    })

  })

  it('should return appended data and inject it before returning the contract', function(done) {

    var supplier = digger.supplier({
      url:'/some/place'
    })

    supplier.select(function(select_query, promise){
      promise.resolve({
        title:'apple',
        _digger:{
          tag:'fruit'
        }
      })
    })

    supplier.append(function(append_query, promise){
      var target = append_query.target;
      var data = append_query.body;
      data[0].fromdb = 3435;
      promise.resolve(data);
    })

    var supplychain = Bridge(supplier).connect();
    var test = Bridge.container('thing');
    supplychain.append(test).ship(function(){
      test.attr('fromdb').should.equal(3435);
      done()
    })

  })

  it('should run in provision mode and process the path presenting the chunks as a names object', function(done){
    
    var supplier = digger.supplier({
      url:'/api/database'
    })

    supplier.provision('database', 'resource', function(names, callback){
      names.database.should.equal('binocarlos');
      names.resource.should.equal('hello');
      done();
    })

    supplier.select(function(select_query, promise){
      
    })

    var supplychain = Bridge(supplier).connect('/api/database/binocarlos/hello');

    supplychain('thing').debug().ship(function(things){

    })


  })

  it('emit a branch event and return the branch in the response', function(done){
    
    var supplier = digger.supplier({
      url:'/api/database'
    })

    supplier.select(function(select_query, promise){

      var selector = select_query.selector;

      if(selector.tag=='this'){
        promise.resolve([{
          _digger:{
            diggerid:4345,
            tag:'thing',
            diggerbranch:['/api/database/4534346']
          },
          name:'Test'
        }])  
      }
      else{
        promise.resolve([{
          _digger:{
            diggerid:123,
            tag:'thingy'
          },
          name:'Test2'
        }])
      }
      
    })

    supplier.on('branch', function(branch, req){
      branch.headers['x-branch-from'].should.equal('/api/database/4345');
      branch.headers['x-branch-to'].should.equal('/api/database/4534346');
    })

    var supplychain = Bridge(supplier).connect('/api/database');

    supplychain('this that').ship(function(things, res){


      var branches = res.success[0].headers['x-json-branches'];

      branches.length.should.equal(1);
      branches[0].headers['x-branch-from'].should.equal('/api/database/4345');
      branches[0].headers['x-branch-to'].should.equal('/api/database/4534346');
      branches[0].body.selectors[0].phases[0][0].tag.should.equal('that');
      done();

    })


  })

})