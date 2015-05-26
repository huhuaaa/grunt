module.exports = function(grunt) {
  //nodejs path 库函数
  var lib_path = require('path');
  var lib_fs = require('fs');

  //数组推入数组
  var array_push = function(array,data){
    for(var i in data){
      array.push(data[i]);
    }
  }
  //搜索数组
  var array_search = function(array,key){
    return array.toString().indexOf(key) != -1;
  };

  var config = grunt.file.readJSON('config.json');
  /*var config = {
    root:'code/', //项目根目录
    src:'', //需要处理的资源文件夹，相对于项目根目录
    needRegExp:'js/pages', //需要处理的js正则表达式
    voidRegExp:'', //不需要处理的js正则表达式
    //voidModule:[], //不需要处理的模块
    baseUrl:'js/', //模块根目录
    paths:{
      'template':'amd/template',
      'jquery':'amd/jquery',
      'underscore':'amd/underscore',
      'backbone':'amd/backbone',
      'zepto':'amd/zepto',
      'helper':'lib/helper'
    }, //模块指定路径
    dest:'build/', //目标文件夹
    less: true, //是否开启less编译功能
    lessSrc: '', //less相对目录
    lessRegExp: '' //less文件需要的正则表达式
  };*/

  var handle = function(config){
    this.fs = lib_fs;
    this.path = lib_path;
    var dir = (__dirname + '/').replace(/\\/g,'/'); //统一路径的\\为/
    this.rootpath = dir + (config.root || '');
    this.needDir = this.rootpath + (config.src || '');
    this.regExp = new RegExp(config.needRegExp || '', 'g');
    this.voidRegExp = config.voidRegExp ? new RegExp(config.voidRegExp, 'g') : null;
    this.files = {}; //需要处理的js
    this.defined = {}; //已经加载的模块
    this.destpath = dir + config.dest; //构建的目标目录
    this.rootpathReg = new RegExp('^' + this.rootpath); //根目录正则表达式
    this.concatFiles = {}; //需要合并的文件数组
    this.staticFiles = {}; //读取并处理过的文件
    this.paths = config.paths || {};
    this.baseUrl = config.baseUrl || '';
    this.min = config.min || false; //输出文件是否添加.min，默认true

    this.less = config.less || false; //是否开启less编译功能
    this.lessFiles = {}; //需要编译的less文件
    this.lessRegExp = new RegExp(config.lessRegExp || ''); //需要满足的less文件正则规则
    this.lessDir = this.rootpath + (config.lessSrc || '');
  };
  handle.prototype = {
    //读取文件夹内符合要求的文件
    readdir : function(dir){
      if(this.fs.existsSync(dir)){
        var array = this.fs.readdirSync(dir);
        for(var i in array){
          var path = dir.match(/\/$/) ? (dir + array[i]) : (dir + '/' + array[i]);
          var stats = this.fs.statSync(path);
          if(stats.isFile()){
            if(path.match(this.regExp) && (!this.voidRegExp || !path.match(this.voidRegExp))){
              var key = path.replace(this.rootpathReg,'');
              //fs.readFileSync 添加第二参数并且指定格式返回字符串，否则返回buffer
              this.files[key] = this.fs.readFileSync(path,{encoding:'utf8'});
            }
          }
          if(stats.isDirectory()){
            this.readdir(path);
          }
        }
      }
    },
    do:function(){
      //读取需要编译的js文件
      this.readdir(this.needDir);
      //对需要编译的文件进行处理
      this.compile();
    },
    //编译文件
    compile:function(){
      for(var i in this.files){
        var filepath = this.destpath + i;
        var dir = this.path.dirname(filepath);
        //文件夹不存在，创建文件夹
        if(!this.fs.existsSync(dir)){
          this.mkdir(dir, 0777);
        }
        var filedata = this.files[i];
        //var matchs = filedata.match(/define\s*\(\s*\[[^\])]*\]/g);
        var matchs = filedata.match(/require\s*\(\s*\[[^\])]*\]/g);
        for(var j in matchs){
            var modules = matchs[j].replace(/require\s*\(\s*\[|[\'\"\s\]]/g,'').split(',');
            this.analyzeConcat(filepath,modules);
        }
        if(typeof this.concatFiles[filepath] != 'undefined'){
          this.concatFiles[filepath].push(this.rootpath + i);
        }else{
          this.concatFiles[filepath] = [this.rootpath + i];
        }
        //this.analyzeConcat(filepath,[this.rootpath + i]);
        //this.fs.writeFileSync(filepath, this.files[i], {encoding:'utf8'});
        //异步没写文件
        /*this.fs.writeFileSync(filepath, this.files[i], {encoding:'utf8'}, function(err){
          if (err) throw err;
          console.log('saved!');
        });*/
      }
    },
    analyzeConcat:function(filepath,modules){
      if(filepath == '') return;
      if(typeof this.concatFiles[filepath] == 'undefined'){
        this.concatFiles[filepath] = [];
      }
      for(var i in modules){
        var path = '';
        if(typeof this.paths[modules[i]] != 'undefined'){
          path += this.rootpath + this.baseUrl + this.paths[modules[i]];
        }else{
          path += this.rootpath + this.baseUrl + modules[i];
        }
        //console.log(path);
        if(this.fs.existsSync(path + '.js')){
          path += '.js';
        }
        else if(this.fs.existsSync(path + '/index.js')){
          path += '/index.js';
        }
        if(this.fs.existsSync(path) && !array_search(this.concatFiles[filepath],path)){
          var stats = this.fs.statSync(path);
          if(stats.isFile()){
            this.concatFiles[filepath].push(path);
            //查找文件内部是否还有依赖
            var getInner = this.staticFile(path);
            if(getInner.length > 0){
              this.analyzeConcat(filepath,getInner);
            }
          }
        }
      }
      //console.log(this.concatFiles[filepath]);
    },
    //获取依赖关系，并存储如staticFiles数组重复利用
    staticFile:function(filepath,hadfiles){
      if(this.fs.existsSync(filepath) && typeof this.staticFiles[filepath] == 'undefined'){
        this.staticFiles[filepath] = [];
        var filedata = this.fs.readFileSync(filepath,{encoding:'utf8'});
        var matchs = filedata.match(/define\s*\(\s*\[[^\])]*\]/g);
        for(var j in matchs){
          var modules = matchs[j].replace(/define\s*\(\s*\[|[\'\"\s\]]/g,'').split(',');
          array_push(this.staticFiles[filepath],modules);
        }
      }
      return this.staticFiles[filepath];
    },
    //循环创建文件夹
    mkdir:function(dir, mode){
      var d = this.path.dirname(dir);
      //创建父目录
      if(!this.fs.existsSync(dir)){
        this.mkdir(d, mode);
      }
      //文件夹不存在，创建文件夹
      if(!this.fs.existsSync(dir)){
        this.fs.mkdirSync(dir, mode);
      }
    },
    //获取需要合并文件的配置数组
    getConcatFiles:function(){
      if(this.min){
        var result = {};
        for(var i in this.concatFiles){
          result[i.replace(/\.js$/g,'.min.js')] = this.concatFiles[i];
        }
        return result;
      }else{
        return this.concatFiles;
      }
    },
    //读取需要编译的less文件
    readdirLess:function(dir){
        //存在文件夹才读取
        if(this.fs.existsSync(dir)){
            var array = this.fs.readdirSync(dir);
            for(var i in array){
              var path = dir.match(/\/$/) ? (dir + array[i]) : (dir + '/' + array[i]);
              var stats = this.fs.statSync(path);
              if(stats.isFile()){
                if(path.match(this.lessRegExp)){
                  this.lessFiles[path.replace(this.rootpathReg, this.destpath).replace('.less', '.css')] = path;
                }
              }
              if(stats.isDirectory()){
                this.readdirLess(path);
              }
            }
        }
    },
    //获取需要编译的less文件
    getLessFiles:function(){
      if(this.less){
        this.readdirLess(this.lessDir);
      }
      return this.lessFiles;
    }
  };

  //执行解析
  var my_handle = new handle(config);
  my_handle.do();
  //待合并文件
  var concatFiles = my_handle.getConcatFiles();
  //需要处理的less文件
  var lessFiles = my_handle.getLessFiles();
  //console.log(concatFiles);return;
  var __templates = [];
  //var concatFiles = {'build/js/pages/index.js':['code/js/amd/backbone.js','code/js/amd/zepto.js']};

  // Project configuration.
  grunt.initConfig({
    //文件合并配置
    concat:{
      options:{
        //定义一个用于插入合并输出文件直接的字符
        separator:'',
        //读取文件时处理
        process:function(src, filepath){
            var result = src;
            var module = lib_path.basename(filepath,'.js');
            if(config.paths && typeof config.paths[module] == 'undefined'){
                var reg = new RegExp((__dirname + '/' + config.root + config.baseUrl).replace(/\\/g,'/') + '|.js','g'); 
                module = filepath.replace(reg,'');
                //console.log(module);
            }
            return result.replace(/define\s*\(\s*\[/g,'define("'+module+'",[');
        }
      },
      bar:{
        files:concatFiles
      }
    },
    //文件压缩配置
    uglify: {
      options: {
        banner: '/*! <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        //多文件方式
        files:[{
          expand: true,cwd: config.dest,src: '**/*.js', dest: config.dest
        }]
      }
    },
    //less配置
    less: {
      development:{
        options:{
          //rootpath: __dirname + '/' + config.root,
          //paths:[''],
          compress: true, //去除空格
          ieCompat: true, //兼容ie8
          relativeUrls: false, //是否使用相对路径
          customFunctions: {} //自定义方法
        },
        files:lessFiles //样式文件
      }
    }
  });
  
  //解析模版的方法
  var myParseTemplate = function(result){
      var template_htmls = [];
      var templates = result.match(/__template__\s*\([^\)]*\)/g);
      for(var i in templates){
        if(typeof __templates[i] == 'undefined'){
          var tplpath = templates[i].replace(/__template__\s*\(\s*[\'\"]?|[\'\"]\)$/g,'');
          tplpath = lib_path.join(__dirname,config.root,tplpath);
          if(typeof __templates[tplpath] == 'undefined' && lib_fs.existsSync(tplpath)){
            __templates[tplpath] = lib_fs.readFileSync(tplpath,{encoding:'utf8'});
          }
          if(typeof __templates[tplpath] != 'undefined'){
            var front = templates[i].replace(/\)/g,'');
            var html = __templates[tplpath].replace(/\'/g,'\\\'');
            html = html.replace(/[\n\r]/g,'');
            html = front + ',\'' + html + '\')';
            template_htmls.push(html);
          }
        }
      }
      if(template_htmls.length > 0){
          var html = '\n\rrequire([\'template\'], function(){';
          for(var i in template_htmls){
              html += template_htmls[i] + ';';
          }
          result = html + '});\n\r' + result;
      }
      return result;
  }
  
  //注册模版解析任务
  grunt.registerTask('tpl', function(){
      for(var i in concatFiles){
          var filepath = i;
          if(lib_fs.existsSync(filepath)){
              console.log('File ' + filepath);
              var src = lib_fs.readFileSync(filepath, {encoding: 'utf8'});
              src = myParseTemplate(src, filepath); //解析需要的模版
              lib_fs.writeFileSync(filepath, src);
          }
      }
  });

  //加载包含 “concat” 任务的插件
  grunt.loadNpmTasks('grunt-contrib-concat');
 
  //加载包含 "uglify" 任务的插件。
  grunt.loadNpmTasks('grunt-contrib-uglify');

  //加载less插件
  grunt.loadNpmTasks('grunt-contrib-less');

  //执行任务
  grunt.registerTask('default', ['concat','tpl','uglify','less']);

};