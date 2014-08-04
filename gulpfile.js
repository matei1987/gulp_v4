//Don't fuck with these, you'll break everything.
var gulp = require('gulp'),
	gutil = require('gulp-util'),
	uglify = require('gulp-uglify'),
	sass = require('gulp-ruby-sass'),
	coffee = require('gulp-coffee'),
	concat = require('gulp-concat'),
	livereload = require('gulp-livereload'),
	lr = require('tiny-lr'),
	minifyHTML = require('gulp-minify-html'),
	imagemin = require('gulp-imagemin'),
	pngcrush = require('imagemin-pngcrush'),
	clean = require('gulp-clean'),
	sftp = require('gulp-sftp'),
	ssh = require('gulp-ssh'),
	args   = require('yargs').argv,
	size = require('gulp-size'),
	swig = require('gulp-swig'),
	server = lr();


//CONFIGURE THIS FOR EVERY PROJECT
//This is the sftp folder where the build will end up. 
//You can use gulp createDir --dir 'whatevername' or no arguments by changing 'projectName'. Do the latter!
var dir = args.dir || 'projectName';


//Sftp set up
var dest = {
	host:'mateig.com',
	user:'matei',
	pass:'ghe0rghiu',
	remotePath:'/var/www/html/'+dir+'',
	port: 22 }
//File sources for down the pipe 
var coffeeSources = ['components/coffee/*.coffee'],
	jsSources = ['components/lib/*.js','components/scripts/*.js'],
	sassSources = ['components/sass/*.scss'],
	swigSources = ['components/templates/*.html'];
//JS concat and minify
gulp.task('js',function(){
	//Source of js files to be minified
	gulp.src(jsSources)

			//Using the uglify command to minify
			.pipe(uglify())

			//Using concat to take the two scripts and make them on file
			.pipe(concat('script.js'))//Final JS file name 

			//Save destination of final JS file 
			.pipe(gulp.dest('js'));
});
//Coffee Compiling
gulp.task('coffee', function(){
	gulp.src(coffeeSources)
		.pipe(coffee({ bare : true})
			.on('error', gutil.log))
		.pipe(gulp.dest('components/scripts'));
});
//Sass compiling
gulp.task('sass', function(){
	gulp.src(sassSources)
		//change style to compressed for prod
		.pipe(sass({style:'expanded', lineNumbers: true}))
		.pipe(concat('style.css'))
		.pipe(gulp.dest('css'))
		.pipe(livereload());
});
//Sass compiling without livereload
gulp.task('sass_noLR', function(){
	gulp.src(sassSources)
		//change style to compressed for prod
		.pipe(sass({style:'compressed', lineNumbers: true}))
		.pipe(concat('style.css'))
		.pipe(gulp.dest('css'));
});
//Build production files
gulp.task('build', function(){
	gulp.src('css/*.css')
		.pipe(concat('style.css'))
		.pipe(gulp.dest('build/css/'))
		.pipe(size());
	gulp.src('js/*.js')
		.pipe(gulp.dest('build/js/'))
		.pipe(size());
	gulp.src('*.html')
		.pipe(minifyHTML())	
		.pipe(gulp.dest('build/'))
		.pipe(size());
	gulp.src('img/*')
		.pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngcrush()],
            optimizationLevel: 3
        }))
		.pipe(gulp.dest('build/img'))
		.pipe(size());
});
//Compress Images
gulp.task('crush', function(){
	gulp.src('img/*')
		.pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngcrush()],
            optimizationLevel: 3
        }))
		.pipe(gulp.dest('build/img'));
});
//Setting up the watch task
gulp.task('watch', function(){
	var server = livereload();
	gulp.watch(jsSources, ['js']);
	gulp.watch(coffeeSources, ['coffee']);
	gulp.watch(sassSources, ['sass']);

	//Monitors the minified and concated js file for changes and 
	//pushes to the server when changed 

	//Monitors and changes in any html file
	gulp.watch(['js/script.js', '*.html'], function(e){
		server.changed(e.path);
	});
});
//Destroy the build folder
gulp.task('clean', function () {  
  return gulp.src('build', {read: false})
    .pipe(clean());
});
//Create the right directories on an sftp server | Set by dest
gulp.task('createDir', function () {
  ssh.exec({
    command: ['mkdir '+ dir, 'mkdir '+dir+'/css', 'mkdir '+dir+'/js', 'mkdir '+dir+'/img'],
    sshConfig: {
      host: dest.host,
      port: dest.port,
      username: dest.user,
      password: dest.pass
    }
  })      
});
//Move build folder to server
gulp.task('transfer', function () {
  gulp.src('build/*')
        .pipe(sftp({
            host: dest.host,
            user: dest.user,
            pass: dest.pass,
            remotePath: dest.remotePath
        }));
  gulp.src('build/css/*')
        .pipe(sftp({
            host: dest.host,
            user: dest.user,
            pass: dest.pass,
            remotePath: dest.remotePath+'/css'
        }));
  gulp.src('build/js/*')
        .pipe(sftp({
            host: dest.host,
            user: dest.user,
            pass: dest.pass,
            remotePath: dest.remotePath+'/js'
        })); 
  gulp.src('build/img/*')
        .pipe(sftp({
            host: dest.host,
            user: dest.user,
            pass: dest.pass,
            remotePath: dest.remotePath+'/img'
        }));           
});
//Compile swig html templates
gulp.task('swig', function() {
  gulp.src(swigSources)
    .pipe(swig())
    .pipe(gulp.dest('./'))
});
// Default task
gulp.task('default', ['sass','js','coffee','watch']); 
// Compile - use this for builds just in case you make changes while watch isn't running. 
gulp.task('compile', ['sass_noLR','js','coffee','build']); 







