var digger = require('../src');
var data = require('./fixtures/data');

describe('container', function(){

  it('should create an empty container', function() {
    var container = digger.create();

    container.length.should.equal(0);
  })

  it('should be a function', function() {
    var container = digger.create();

    container.should.be.a('function');
  })

  it('should create an empty container with no models', function() {
    var container = digger.create();

    container.models.length.should.equal(0);
  })

  it('should build from basic data', function() {

    var test = digger.create('product', {
      price:100,
      address:{
        postcode:'apples'
      }
    })

    test.count().should.equal(1);
    test.attr('price').should.equal(100);
    test.attr('address.postcode').should.equal('apples');
    test.tag().should.equal('product');

  })

  it('should not obliterate the tag if _digger data is given also', function() {

    var test = digger.create('product', {
      price:100,
      _digger:{
        id:'test'
      }
    })

    test.tag().should.equal('product');
  })


  it('should run the is() function and return the right result', function() {

    var test = digger.create('product', {
      price:100,
      _digger:{
        id:'test'
      }
    })

    test.is('product').should.equal(true);
    test.is('product2').should.equal(false);
  })

  it('should ensure a digger id', function() {
    var test = digger.create('product', {
      price:100,
      address:{
        postcode:'apples'
      }
    })

    test.tag().should.equal('product');
    test.diggerid().should.be.a('string');
    test.diggerid().length.should.equal(32);
  })

  it('should ensure a digger path', function() {
    var test = digger.create('product', {
      price:100,
      address:{
        postcode:'apples'
      }
    })

    test.diggerpath().should.be.a('array');
  })

  it('should have the correct underlying model structure', function() {

    var test = digger.create('product', {
      price:100,
      address:{
        postcode:'apples'
      }
    })

    test.models.should.be.a('array');
    test.models[0].should.be.a('object');
    test.models[0].price.should.equal(100);
    test.models[0]._digger.should.be.a('object');
    test.models[0]._digger.class.should.be.a('array');
    test.models[0]._children.should.be.a('array');

  })

  it('should clone another container and have changed the ids', function() {

    var test = digger.create('product', {
      price:100,
      address:{
        postcode:'apples'
      }
    })

    var copy = test.clone();

    copy.attr('price').should.equal(100);
    copy.diggerid().should.not.equal(test.diggerid());
    

  })


  it('XML should have the correct underlying model structure', function() {

    var test = digger.create('<product price="100" class="red" />');

    test.models.should.be.a('array');
    test.models[0].should.be.a('object');
    test.models[0].price.should.equal("100");
    test.models[0]._digger.should.be.a('object');
    test.models[0]._digger.class.should.be.a('array');
    test.models[0]._children.should.be.a('array');
    test.hasClass('red').should.equal(true);

  })

  it('should allow the manipulation of the underlying data', function(){

    var test = digger.create('product', {
      price:100,
      address:{
        postcode:'apples'
      }
    })

    test.addClass('apples');
    test.classnames().length.should.equal(1);
    test.hasClass('apples').should.equal(true);
    test.hasClass('oranges').should.equal(false);
    test.addClass('oranges');
    test.classnames().length.should.equal(2);
    test.hasClass('oranges').should.equal(true);
    test.removeClass('apples');

    test.classnames().length.should.equal(1);
    test.hasClass('apples').should.equal(false);

    test.id('hello');
    test.id().should.equal('hello');
    test.get(0)._digger.id.should.equal('hello');

    test.tag().should.equal('product');

    test.attr('some.deep.attr', 23);

    test.attr('some').should.be.a('object');
    test.attr('some.deep').should.be.a('object');
    test.attr('some.deep.attr').should.equal(23);

    var deep = test.attr('some.deep');
    deep.attr.should.be.a('number');
    deep.attr.should.equal(23);
  })  

  it('should allow access to diggerurl', function(){
    var test = digger.container('test');
    test.diggerid('123');
    test.diggerwarehouse('/testapi');

    test.diggerurl().should.equal('/testapi/123');
  })

  it('should build from XML', function(){
    var test = digger.create(data.simplexml);

    test.count().should.equal(1);
    test.tag().should.equal('folder');
  })

  it('should export to JSON and XML', function(){
    var test = digger.create(data.simplexml);

    test.toJSON().should.be.a('array');
    test.toJSON().length.should.equal(1);
    test.toJSON()[0]._digger.should.be.a('object');

    var xml = test.toXML();
    xml.should.be.a('string');
    xml.charAt(0).should.equal('<');
  })

  it('should be able to access single containers via eq', function(){
    var test = digger.create(data.citiesxml);

    test.count().should.equal(1);
    test.eq(0).should.be.a('function');
    test.eq(0).count().should.equal(1);
    test.eq(0).tag().should.equal('folder');

  })

  it('should be able to access single models via get', function(){
    var test = digger.create(data.citiesxml);

    test.count().should.equal(1);
    test.get(0).should.be.a('object');
    test.get(0)._digger.id.should.equal('places');

  })


  it('should change the attributes of all models', function(){

    var test = digger.create(data.citiesxml);

    test.children().attr('test', 23);


    test.children().eq(0).attr('test').should.equal(23);
    test.children().eq(1).attr('test').should.equal(23);
  })


  it('should allow arrays to be set as the value', function(){

    var test = digger.create('test');

    test.attr('arr', [1,2,3]);

    test.attr('arr').should.be.a('array');

  })

  it('should allow objects to be set as the value', function(){

    var test = digger.create('test');

    test.attr('obj', {
      fruit:'apple'
    })

    test.attr('obj').should.be.a('object');
    test.attr('obj.fruit').should.equal('apple');

  })

  it('should allow booleans to be set as the value', function(){

    var test = digger.create('test');

    test.attr('bool', false);

    test.attr('bool').should.be.a('boolean');
    test.attr('bool').should.equal(false);

  })

  it('should get the attribute for the first model', function(){

    var test = digger.create(data.citiesxml);

    var uk = test.children();
    var name = uk.attr('name');

    name.should.be.a('string');
    name.should.equal('UK');
  })

  it('should pass the supplychain down to children and descendents', function(){
    var test = digger.create(data.citiesxml);

    test.supplychain = 34;

    var children = test.children();
    var descendents = test.descendents();
    children.supplychain.should.equal(34);
    descendents.supplychain.should.equal(34);
  })

  it('should be able access children', function(){

    var test = digger.create(data.citiesxml);

    test.children().count().should.equal(2);
    test.children().eq(1).hasClass('big').should.equal(true);
  })

  it('should be able iterate models', function(){

    var test = digger.create(data.citiesxml);
    var childcounter = 0;
    test.children().each(function(container){
      childcounter++;
    })

    childcounter.should.equal(2);
  })

  it('should be able to map containers', function(){

    var test = digger.create(data.citiesxml);

    var values = test.children().map(function(container){
      return container.attr('name');
    })

    values.length.should.equal(2);
    values[0].should.equal('UK');
    values[1].should.equal('Scotland');
  })

  it('should append and find children', function() {
    var parent = digger.create('product', {
      price:100,
      address:{
        postcode:'apples'
      }
    })

    var child1 = digger.create('caption', {
      test:'hello1'
    }).addClass('apples')

    var child2 = digger.create('caption', {
      test:'hello2'
    }).addClass('oranges')

    parent.append([child1, child2]);

    parent.children().count().should.equal(2);
    parent.first().tag().should.equal('product');
    parent.find('.apples').tag().should.equal('caption');
    parent.find('.oranges').attr('test').should.equal('hello2');
  })

  it('should run selectors on local data', function() {

    var test = digger.create(data.citiesxml);

    test.find('city.south').count().should.equal(3);
    test.find('country[name^=U] > city.south area.poor').count().should.equal(3);

  })
  
  it('should apply limit and first and last modifiers', function() {
    var test = digger.create(data.citiesxml);
    test.find('city.south').count().should.equal(3);    
    test.find('city.south:first').count().should.equal(1);
    test.find('city.south:last').count().should.equal(1);
    test.find('city.south:limit(2)').count().should.equal(2);
  })

  it('should emit events', function(done) {
    var test = digger.create();

    test.on('hello', done);
    test.emit('hello');
  })


  it('should extract a meta skeleton', function() {

    var test = digger.create(data.citiesxml);

    var cities = test.find('city.south');

    var skeleton = cities.skeleton();

    skeleton.length.should.equal(3);
    skeleton[0].tag.should.equal('city');
    
  })

  it('should provide a summary', function() {

    var test = digger.create('product', {
      name:'test'
    }).addClass('thing').id('45')

    test.summary().should.equal('test: product#45.thing');
    
  })
})
