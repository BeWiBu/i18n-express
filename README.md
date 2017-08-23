# i18n-express-4plugin

This repository is based on [Facu ZAK's 'i18n-express'](https://github.com/koalazak/i18n-express).
The difference is the option, to add further translation paths.
This was necessary for me in a plug-in system, since additional modules had to be dynamically loaded there.

Now in the running system, you can add more translation paths.

In your post-loaded module...
```javascript
var i18n=require('i18n-express-4plugin');

i18n.addTranslationsPath(path.join(__dirname,"i18n"));

```

## Requirements

  - Node >= 0.12
  - Express.js

## Installation

```bash
$ npm install i18n-express-4plugin
```

## Usage

```js
var i18n=require("i18n-express-4plugin");

app.use( i18n(options).express );
```

## Options

- `translationsPath` : *(default: `i18n`)* The path where you store translations json files.
- `cookieLangName` : *(default: `ulang`)* If you provide a cookie name, try to get user lang from this cookie.
- `browserEnable` : *(default: `true`)* If enabled, try to get user lang from browser headers.
- `defaultLang` :  *(default: `en`)* If all others methods fail, use this lang.
- `paramLangName` :  *(default: `clang`)* Get param to change user lang. ej: visiting 'example.com?clang=es' the lang switchs to 'es'
- `siteLangs` :  *(default: `['en']`)* Array of supported langs. (posbile values for clang and json files)
- `textsVarName` : *(default: `texts`)* Name of variable which holds the loaded translations.

## Example


 Create a directory "i18n" with .json files for each lang. Ej:
 - en.json
 - es.json
 - en\-us.json
 
 With translations like this (en.json):

 ```json
 {
 "WELCOME_MSG": "Hi! Welcome!",
 "CONTACT_TEXT": "More bla"
 }
 ```
 

 In your Express app.js:

```javascript
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var i18n=require("i18n-express-4plugin"); // <-- require the module

var indexRoutes = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secret',
  saveUninitialized: true,
  resave: true
}));

app.use(i18n({
  translationsPath: path.join(__dirname, 'i18n'), // <--- use here. Specify translations files path.
  siteLangs: ["en","es"],
  textsVarName: 'translation'
}).express);
...

app.use('/', indexRoutes);

module.exports = app;

...

```
Within your plugin, you can add another translation paths...

```javascript
i18n.addTranslationsPath(path.join(__dirname,"i18n"));
```


Now in your ejs view you have `texts` object and `lang` variable with the active language:

```html
<div>
  Choose your language:
  <ul>
    <li><a class="<%=(lang=="es"?"active":"")%>" href="/?clang=es">Spanish</a></li>
    <li><a class="<%=(lang=="en"?"active":"")%>" href="/?clang=en">English</a></li>
  </ul> 

	<p><%=translation.WELCOME_MSG%></p>
  
</div>
```

Or in your handlebars view:

```html
<div>
  Choose your language:
  <ul>
    <li><a href="/?clang=es">Spanish</a></li>
    <li><a href="/?clang=en">English</a></li>
  </ul> 

	<p>{{translation.WELCOME_MSG}}</p>

</div>
```

## License

MIT

## Author

  - [bewibu](https://github.com/bewibu) 
