var fs = require('fs');
var extend = require('extend');

function getLangFromHeaders (req) {
  var languagesRaw = req.headers['accept-language'] || 'NONE';
  var lparts = languagesRaw.split(',');
  var languages = [];

  for (var x = 0; x < lparts.length; x++) {
    var unLangParts = lparts[x].split(';');
    languages.push(unLangParts[0]);
  }

  return languages;
}

function getLangFromCookie (req, cookieName) {
  if (cookieName && req.session && req.session[cookieName]) {
    return req.session[cookieName];
  } else {
    if (cookieName in req.cookies) {
      return req.cookies[cookieName].toString();
    } else {
      return '';
    }
  }
}

//Making deep objects from dotted key's 
//e.g.  
//  "meter.1.power":"Meter 1 power" 
//will changed to...
//  "meter":{ "1":{"power":"Meter 1 power"}}
function resolveObjects(content)
{
  Object.keys(content).forEach(function(key){
    var tokens=key.split(".");
    if(tokens.length>1){
      var value=content[key];
      var newOb={};
      var tmpOb=newOb;
      var lastVal=newOb;
      tokens.forEach(function(key){
        tmpOb[key]={};
        lastVal=tmpOb;
        tmpOb=tmpOb[key];
      });
      lastVal[tokens[tokens.length-1]]=value;
      delete content[key];
      extend(true,content,newOb);
    }
    else if(typeof content[key] =="object")
      resolveObjects(content[key]);
  });
}


function loadLangJSONFiles (langPath, defaultLang) {
  var i18n = [];
  i18n[defaultLang] = [];

  var files = fs.readdirSync(langPath);

  if (files) {
    for (var i = 0; i < files.length; i++) {
      if (files[i].split('.').pop() === 'json' && files[i].substr(0, 1) !== '.' && files[i].split('.').shift()) {
        try {
          delete require.cache[require.resolve(langPath + '/' + files[i])];
        } catch (e) {}

        var content=require(langPath + '/' + files[i]);
        resolveObjects(content);

        i18n[files[i].split('.').shift().toLowerCase()] = content;
      }
    }
  } else {
    console.log('[i18n] No files in ' + langPath);
  }
  return i18n;
}

exports = module.exports = function (opts) {
  var i18nTranslations = [];
  var translationsPath = opts.translationsPath || 'i18n';
  var cookieLangName = opts.cookieLangName || 'ulang';
  var browserEnable = opts.browserEnable !== false;
  var defaultLang = opts.defaultLang || 'en';
  var paramLangName = opts.paramLangName || 'clang';
  var siteLangs = opts.siteLangs || ['en'];
  var textsVarName = opts.textsVarName || 'texts';

  if (siteLangs.constructor !== Array) {
    throw new Error('siteLangs must be an Array with supported langs.');
  }

  var computedLang = '';

  var translationPaths=[];

  function addTranslationsPath(path){
    // if this path allways exists, don't use it
    if(translationPaths.indexOf(path)>=0)
      return;
    translationPaths.push(path);

    // loading the translations of this path...
    var thisTranslations = loadLangJSONFiles(path, defaultLang);
    // ...and extend the whole translations with it...
    i18nTranslations=extend(true,{},thisTranslations,i18nTranslations);
    
    // wait for any file changes in this path...
    fs.watch(path, function (event, filename) {
      if (filename) {
        try {

          //re-translate all paths
          i18nTranslations=[];
          translationPaths.forEach(function(path){
            var thisTranslations = loadLangJSONFiles(path, defaultLang);
            i18nTranslations=extend(true,{},thisTranslations,i18nTranslations);
          })
          
        } catch (ee) {
          // Some editors first empty the file and then save the content. This generate a "Unexpected end of input" error
        }
      }
    });
  }

  // add the main translation path 
  addTranslationsPath(translationsPath);

  function express (req, res, next) {
    var alreadyTryCookie = false;
    var alreadyBrowser = false;
    // set textsVarName value for tests and variable recovery
    req.app.locals.textsVarName = textsVarName;

    while (1) {
      if (cookieLangName && alreadyTryCookie === false) {
        var cLang = getLangFromCookie(req, cookieLangName);
        if (cLang) {
          computedLang = cLang;
          break;
        } else {
          alreadyTryCookie = true;
          continue;
        }
      } else if (browserEnable && alreadyBrowser === false) {
        var wLang = getLangFromHeaders(req);

        if (wLang.length) {
          computedLang = wLang[0];
          break;
        } else {
          alreadyBrowser = true;
          continue;
        }
      } else {
        computedLang = defaultLang;
      }
      if (computedLang !== '') {
        break;
      }
    }

      // User is setting a lang via get param. Store and use it.
    if (paramLangName in req.query) {
      if (siteLangs.indexOf(req.query[paramLangName]) > -1) {
        if (cookieLangName && req.session) {
          req.session[cookieLangName] = req.query[paramLangName].toString();
        }
        computedLang = req.query[paramLangName].toString();
      }
    }

    function setDefaulti18n () {
      req.app.locals[textsVarName] = i18nTranslations[defaultLang];
      req.app.locals.lang = defaultLang;
    }

    computedLang = computedLang.toLowerCase();

    // setting translations to views

    if (computedLang in i18nTranslations) {
      req.app.locals[textsVarName] = i18nTranslations[computedLang];
      req.app.locals.lang = computedLang;
    } else {
      if (computedLang.indexOf('-') > -1) {
          // try extract "en" from "en-US"
        var soloLang = computedLang.split('-')[0];
        if (soloLang in i18nTranslations) {
          req.app.locals[textsVarName] = i18nTranslations[soloLang];
          req.app.locals.lang = soloLang;
        } else {
          setDefaulti18n();
        }
      } else {
        setDefaulti18n();
      }
    }

    // req.i18n_all_texts=i18nTranslations;
    req.i18n_texts = req.app.locals[textsVarName];
    req.i18n_lang = req.app.locals.lang;

    next();
  };

  return{
    express:express,
    addTranslationsPath:addTranslationsPath   
  }
};
