/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var _ = require('lodash');
var BaseSupplier = require('../proto').factory;
var Container = require('../../container/proto').factory;
var async = require('async');
var fs = require('fs');

module.exports = factory;

function factory(options){
  
  var supplier = BaseSupplier(options);

  if(!supplier.settings.attr('filepath')){
    throw new Error('filepath requiired for simpledb');
  }

  var filepath = supplier.settings.attr('filepath');
  var autocreate = supplier.settings.attr('autocreate');

  /*
  
    the in-memory container that holds our data

    this will be some slow-ass shiiiiiiiit but it's bootstrap (again)
    
  */
  var rootcontainer = Container();

  function buildsupplier(){

    /*
    

      ----------------------------------------------
      SELECT
      ----------------------------------------------
      
    */
    supplier.select(function(select_query, promise){

      var context = rootcontainer;

      if(select_query.context && select_query.context.length>0){

        var models = _.filter(_.map(select_query.context, function(skeleton){
          return rootcontainer.find('=' + skeleton.diggerid).get(0);
        }), function(model){
          return model!==null;
        })

        context = rootcontainer.spawn(models);
        
      }
      else{
        context = rootcontainer;
      }

      var results = context.find({string:'', phases:[[select_query.selector]]});

      //results
      promise.resolve(results.toJSON());
    })

    /*
    
      ----------------------------------------------
      APPEND
      ----------------------------------------------
      
    */
    supplier.append(function(append_query, promise){

      var append_to = append_query.target ? rootcontainer.spawn(append_query.target) : rootcontainer;
      var append_what = rootcontainer.spawn(append_query.body);

      /*
      
        add one to the top level path number
        
      */
      if(!append_query.target){
       
        /*
        
          it's a root append
          
        */
        append_what.inject_paths([append_what.get_next_child_path_index()]);
      }
      else{

        var append_count = append_to.digger('append_count') || 0;

        append_what.inject_paths(([]).concat(append_to.diggerpath(), [append_count]))
        append_count++;

        /*
        
          save the append count for next time
          
        */
        append_to.digger('append_count', append_count);
      }

      append_what.diggerparentid(append_to.diggerid());
      append_to.append(append_what);

      /*
      
        we save the file and wait for confirmation before returning
        
      */
      supplier.savefile(function(error){
        if(error){
          promise.reject(error);
        }
        else{
          promise.resolve(append_what.toJSON());  
        }
      })

    })

    /*
    
      ----------------------------------------------
      SAVE
      ----------------------------------------------
      
    */

    supplier.save(function(save_query, promise){

      var data = save_query.body;
      /*
      
        update the in-memory model
        
      */
      _.each(data, function(val, key){
        save_query.target[key] = data[key];
      })

      supplier.savefile(function(error){
        if(error){
          promise.reject(error);
        }
        else{
          promise.resolve(data);  
        }
      })

    })

    /*
    
      ----------------------------------------------
      REMOVE
      ----------------------------------------------
      
    */

    supplier.remove(function(remove_query, promise){

      var target = rootcontainer.spawn(remove_query.target);
      var parent = rootcontainer;

      if(target.diggerparentid()){
        parent = rootcontainer.find('=' + target.diggerparentid());
      }

      parent.get(0)._children = _.filter(parent.get(0)._children, function(model){
        return model._digger.diggerid!=target.diggerid();
      })

      supplier.savefile(function(error){
        if(error){
          promise.reject(error);
        }
        else{
          promise.resolve();  
        }
      })

    })    

  }

  supplier.savefile = function(done){
    done();
  }

  /*
  
    PREPARE FILE
    
  */
  supplier.prepare(function(finished){
    var filedata = null;
    async.series([
      function(next){

        fs.readFile(filepath, 'utf8', function(error, content){

          if((error || !content) && !autocreate){
            supplier = function(req, res){
              res.error('file: ' + filepath + ' does not exist');
            }
          }
          else{

            var issaving = false;
            var save_callbacks = [];

            supplier.savefile = function(done){
              save_callbacks.push(done);
              if(issaving){
                return;
              }
              issaving = true;
              fs.writeFile(filepath, JSON.stringify(rootcontainer.toJSON(), null, 4), 'utf8', function(error){
                _.each(save_callbacks, function(fn){
                  fn(error);
                })
                save_callbacks = [];
                issaving = false;
              })
            }

            filedata = content;
            next();
          }
        })
      },

      function(next){
        rootcontainer = Container(filedata);

        rootcontainer.ensure_meta();

        supplier.savefile(function(){
          buildsupplier();
          next();  
        })
        
      }
    ], finished)
  })

  return supplier;
}