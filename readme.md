# grunt 编译工具使用 #
### 1、使用前配置 ###
	1）安装nodejs和npm包管理工具
	2）安装grunt-cli，安装命令为 npm install -g grunt-cli
	3）安装grunt包到构建目录，进入目录执行安装命令 npm install grunt --save-dev
	4）改写Gruntfile.js内任务配置，并安装需要的扩展包
	5）使用grunt命令进行代码构建


### 2、目录和文件说明 ###
	1）code文件夹为开发的源代码目录(可在配置中修改)
	2）build文件夹为工具构建后代码存储目录(可在配置中修改)
	3）config.json为编译的配置文件
	4）Gruntfile.js为编译处理程序

### 3、配置参数说明 ###
	{
	    "root":"code/", //项目根目录
	    "src":"", //需要处理的资源文件夹，相对于项目根目录
	    "needRegExp":"js/pages", //需要处理的js正则表达式
	    "voidRegExp":"", //不需要处理的js正则表达式
	    //voidModule:[], //不需要处理的模块，次参数暂时未起作用
	    "baseUrl":"js/", //模块根目录
	    "paths":{
		    "template":"amd/template",
		    "jquery":"amd/jquery",
		    "underscore":"amd/underscore",
		    "backbone":"amd/backbone",
		    "zepto":"amd/zepto",
		    "helper":"lib/helper"
		}, //模块指定路径
	    "dest":"build/" //目标文件夹
		"less":true, //是否开启less编译功能
		"lessSrc":"", //less文件相对目录
		"lessRegExp":"" //less需要编译的文件正则表达式
	  }