/**
 * Created by Kevin Khantzis
 * kevinkhantzis@outlook.com
 * License: You may use this code in your extensions so long as you keep this created by comment. Thank you
 */

const vscode = require('vscode');
const path = require("path");

require('./functions')();

function Extend(self, parent, p1, p2, p3) {
	//because prototype is ugly
	if (is_function(parent)) {
		parent.call(self, p1, p2, p3);
	} else {
		for (var i in parent) {
			self[i] = parent[i];
		}
	}
}

let fullDebug = false;
let debug = function (message, m1, m2) {
	if (false) {
		console.log(message + (fullDebug && isset(m1) ? ' :' + m1 : '') + (fullDebug && isset(m2) ? ' :' + m2 : ''));
	}
};

function EventHandler() {

	var self = this;

	var _cbs = {}; //callbacks

	this.on = function (tag, callback, runOnce) {
		if (is_string(tag) && is_function(callback)) {
			if (isset(_cbs[tag]) == false) {
				_cbs[tag] = [];
			}
			if (is_bool(runOnce) == false) {
				runOnce = false;
			}
			_cbs[tag].push({
				'enabled': true,
				'runOnce': runOnce,
				'callback': callback
			});
		}
	};
	this.once = function (tag, callback) {
		self.on(tag, callback, true);
	};
	this.emit = function (tag, param1, param2, param3, param4, param5) {
		_wc = 0;
		if (isset(_cbs[tag]) == true) {
			for (var i in _cbs[tag]) {
				if (is_function(_cbs[tag][i]['callback']) && _cbs[tag][i]['enabled'] == true) {
					var callback = _cbs[tag][i]['callback'];
					var response = callback.call(this, param1, param2, param3, param4, param5);
					if (isset(_cbs[tag]) == true && isset(_cbs[tag][i]) == true && _cbs[tag][i]['runOnce'] == true) {
						delete _cbs[tag][i];
					}
					if (_cbs[tag].length == 0) {
						delete _cbs[tag];
					}
					if (isset(_cbs[tag])) {
						_cbs[tag] = _cbs[tag].filter(() => true); //return reordered list
					}
					if (isset(response)) {
						return response;
					}
				}
			}
		}
		return self;
	};
	this.isEnabledEvent = function (tag, bool) {
		if (isset(_cbs[tag])) {
			for (var i in _cbs[tag]) {
				_cbs[tag][i]['enabled'] = bool;
			}
		}
	};
	this.clearEvent = function (tag) {
		if (isset(tag)) {
			_cbs[tag] = {};
		} else {
			_cbs = {};
		}
	};
	this.eventIsRegistered = function (tag) {
		return isset(_cbs[tag]);
	}

	//READY
	var _orcb = new Array; //onmreadycallback
	var _wc = 0; //waitcount
	var _ri = 0; //readyindex
	var _continue = function () {
		if (_wc == 0) {
			if (isset(_orcb[_ri])) {
				_orcb[_ri]();
			}
			_ri++;
			self.resetReady();
		}
	};
	this.wait = function () {
		_wc++;
		_wc = _wc > 0 ? _wc : 0;
	};
	this.continue = function () {
		_wc--;
		_wc = _wc > 0 ? _wc : 0;
		_continue();
	};
	this.ready = function (callback) {
		_orcb.push(callback);
		//give one interval incase wait is called
		setTimeout(function () {
			_continue();
		});
	};
	this.resetReady = function () {
		if (_ri == length(_orcb) || length(_orcb) == 0) {
			_orcb = new Array;
			_wc = 0;
			_ri = 0;
		}
	};

};

var ConfigSettings = function (config) {

	var self = this;

	this.getConfiguration = function () {
		return vscode.workspace.getConfiguration(config);
	}

	this.getValue = function (key, default_value) {
		let config = self.getConfiguration();
		var subKey = null;
		if (key.indexOf('.') > -1) {
			var list = key.split('.');
			subKey = list[0];
			key = list[1];
		}
		default_value = (isset(default_value) ? default_value : null);
		if (config === null) {
			return default_value;
		}
		var value = null;
		if (subKey) {
			value = isset(config[subKey][key]) ? config[subKey][key] : default_value;
		} else {
			value = config[key];
		}
		return isset(value) ? value : default_value;
	}
}

var Document = new function () {

	var self = this;

	/**
	 * @param {vscode.TextDocument} document 
	 * @returns string
	 */
	this.filePath = function (document) {
		return isset(document) ? document.uri.path : "";
	}

	/**
	 * @param {vscode.TextDocument | string} document
	 * @returns string
	 */
	this.fileType = function (document) {
		if (typeof document == "string") {
			return str_replace('.', '', path.extname(document));
		}
		return str_replace('.', '', path.extname(self.filePath(document)));
	}

	/**
	 * @param {vscode.TextDocument} document 
	 * @returns string
	 */
	this.fileName = function (document) {
		return path.basename(self.filePath(document));
	}

	/**
	 * @param {vscode.TextDocument} document 
	 * @returns string[]
	 */
	this.lines = function (document) {
		let text = document !== null ? document.getText() : null;
		return text !== null ? text.split(/\r?\n/) : []; //zero index
	}

	/**
	 * @param {vscode.Uri} uri 
	 * @returns string
	 */
	this.workspaceFolderPath = function (uri) {
		let workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
		if (!workspaceFolder) {
			return "";
		}
		let workSpaceFolderPath = Document.filePath(workspaceFolder);
		return workSpaceFolderPath;
	}
}

var Application = function () {

	var self = this;

	Extend(this, EventHandler);

	let _documents = {};
	let _cache = {};
	let _validDocTypes = {};
	let _textDocumentChangeQueue = [];
	let _decorations = [];
	let _lineDecorationCallback = [];
	let _documentCacheParams = {
		enabled: false,
		lineCount: null
	};
	let _elementVoids = {
		area: true,
		base: true,
		br: true,
		col: true,
		command: true,
		embed: true,
		hr: true,
		img: true,
		input: true,
		keygen: true,
		link: true,
		meta: true,
		param: true,
		path: true,
		source: true,
		track: true,
		wbr: true
	};

	let cacheFoldInfo = false;

	var fileSyntax = function (fileType) {
		var syntax = null;
		if (in_array(fileType, ['js', 'ts', 'jsx', 'tsx']) == true) {
			syntax = 'js';
		}
		if (in_array(fileType, ['css']) == true) {
			syntax = 'css';
		}
		if (in_array(fileType, ['htm', 'html']) == true) {
			syntax = 'html';
		}
		if (in_array(fileType, ['php']) == true) {
			syntax = ''; //set later
		}
		return syntax;
	}
	var shiftCacheLineValues = function (filePath, line_x) {

		if (isset(_documents[filePath]['lines'][line_x]) == false) {
			throw 'Invalid line number';
		}

		let diff = line_x - _documents[filePath]['lines'][line_x]['line'];
		_documents[filePath]['lines'][line_x]['line'] = line_x;
		if (isset(_documents[filePath]['lines'][line_x]['html']) && isset(_documents[filePath]['lines'][line_x]['html']['elements'])) {
			for (var i in _documents[filePath]['lines'][line_x]['html']['elements']) {
				_documents[filePath]['lines'][line_x]['html']['elements'][i]['startLine'] += diff;
				_documents[filePath]['lines'][line_x]['html']['elements'][i]['endLine'] += diff;
				let attributes = _documents[filePath]['lines'][line_x]['html']['elements'][i]['attributes'];
				for (var o in attributes) {
					let attr = attributes[o];
					for (var q in attr) {
						attr[q]['line'] += diff;
					}
				}
			}
		}
		if (_documents[filePath]['decorationEnabled'] == true) {
			if (diff !== 0) {
				let line_id = _documents[filePath]['lines'][line_x]['id'];
				for (var type in _documents[filePath]['decorations']) {
					if (isset(_documents[filePath]['decorations'][type]['ranges'][line_id])) {
						for (var i in _documents[filePath]['decorations'][type]['ranges'][line_id]) {
							_documents[filePath]['decorations'][type]['ranges'][line_id][i]['_start']['_line'] += diff;
							_documents[filePath]['decorations'][type]['ranges'][line_id][i]['_end']['_line'] += diff;
						}
					}
				}
			}
		}

	}
	var getLineInfo = function (fileType, filePath, syntax, line_x, documentLines, cacheLine) {

		if (isset(_cache.match_lock) == false) {
			_cache.match_lock = "";
		}

		line_x = parseInt(line_x);
		let text = documentLines[line_x]; //store original line

		let line = text;
		line = str_replace("\t", " ", line); //make sure key words have spaces around them
		line = " " + line + " ~"; //add leading ws and eol

		var textFormatted = "";
		var match_length = 0;
		var in_quote_str = false;

		if (_documents[filePath]['cacheEnabled'] && is_true(self.fullCache) != true) {
			if (isset(_documents[filePath]['lines'][line_x - 1])) {
				let cache = _documents[filePath]['lines'][line_x - 1]['cache'];
				for (var i in cache) {
					_cache[i] = cache[i]; //reload cache state
				}
			} else if (line_x == 0) {
				//default cache
				_cache.php_open = false;
				_cache.html_open_tag = false;
				_cache.html_in_tag = false;
				_cache.html_open_script = false;
				_cache.html_open_style = false;
				_cache.html_open_comment = false;
				_cache.php_js_open = false;
				_cache.php_css_open = false;
				_cache.php_syntax = 'html'
			}
		}

		if (_cache.php_open) {
			syntax = 'php';
			_cache.php_syntax = '';
		}
		if (_cache.php_js_open) {
			_cache.php_syntax = 'js';
		}
		if (_cache.php_css_open) {
			_cache.php_syntax = 'css';
		}

		var php_open_line = false;

		if (_cache.match_lock == "in_comment_line") {
			_cache.match_lock = ""; //reset for next line
		}
		if (_cache.match_lock == "in_reg_str") {
			_cache.match_lock = ""; //reset for next line
		}

		//get formatted line and line syntax
		for (var char_x in line) {
			char_x = parseInt(char_x);
			var char = line[char_x];
			var prev_char = char_x > 0 ? line[char_x - 1] : '';
			var prev2_char = char_x > 1 ? line[char_x - 2] : '';

			if (fileType == 'php') {
				if (_cache.php_open == false && line[char_x] == '<' && (/<\?/).test(line.substring(char_x, char_x + 2))) {
					_cache.php_open = true;
					php_open_line = true;
					if (_cache.match_lock != "") {
						_cache.match_lock_push = _cache.match_lock;
						_cache.match_lock = "";
					}
				}
				if (_cache.php_open == true && line[char_x] == '?' && (/\?>/).test(line.substring(char_x, char_x + 2))) {
					_cache.php_open = false;
					php_open_line = false;
					if (_cache.match_lock_push != "") {
						_cache.match_lock = _cache.match_lock_push;
						_cache.match_lock_push = "";
					}
				}
				if (php_open_line) {
					continue;
				}
			}

			//in line comment
			if (_cache.match_lock == "" || _cache.match_lock == "in_comment_line") {
				if (_cache.match_lock == "" && line[char_x] == '/' && prev_char != "\\" && (/\/\//).test(line.substring(char_x, char_x + 2))) {
					match_length = 2;
					_cache.match_lock = "in_comment_line";
				}
				if (_cache.match_lock == "in_comment_line") {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
			}

			//block comment
			if (_cache.match_lock == "" || _cache.match_lock == "in_comment_block" || _cache.match_lock == "in_comment_block_end") {
				if (_cache.match_lock == "" && line[char_x] == '/' && prev_char != "\\" && (/\/\*/).test(line.substring(char_x, char_x + 2))) {
					if (line.indexOf('*/') > -1) {
						//same line;
					} else {
						match_length = 2;
					}
					_cache.match_lock = "in_comment_block";
					_cache.commentBlockLine = line_x;
					_cache.commentBlockChar = char_x;
				}
				if (_cache.match_lock == "in_comment_block" && line[char_x] == '*' && (/\*\//).test(line.substring(char_x, char_x + 2))) {

					_cache.match_lock = "in_comment_block_end";
					continue;
				}
				if (_cache.match_lock == "in_comment_block_end") {
					_cache.match_lock = "";
					continue;
				}
				if (_cache.match_lock == "in_comment_block") {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
			}

			//quote
			if (_cache.match_lock == "" || _cache.match_lock == "in_quote_str") {
				if (_cache.php_syntax != "html" || _cache.html_open_tag == true) {
					if (char == "`" && (prev_char != "\\" || prev2_char == "\\")) {
						match_length = 1;
						in_quote_str = !in_quote_str;
						_cache.match_lock = in_quote_str ? "in_quote_str" : "";
					}
					if (in_quote_str == true) {
						if (match_length > 0) {
							match_length--;
						} else {
							continue;
						}
					}
				}
			}

			//single quote
			if (_cache.match_lock == "" || _cache.match_lock == "in_single_quote_str") {
				if (fileType != 'php' || _cache.php_syntax != "html" || _cache.html_open_tag == true) {
					if (char == "'" && (prev_char != "\\" || prev2_char == "\\")) {
						match_length = 1;
						_cache.match_lock = _cache.match_lock == "" ? "in_single_quote_str" : "";
					}
					if (_cache.match_lock == "in_single_quote_str") {
						if (match_length > 0) {
							match_length--;
						} else {
							continue;
						}
					}
				}
			}

			//double quote
			if (_cache.match_lock == "" || _cache.match_lock == "in_double_quote_str") {
				if (fileType != 'php' || _cache.php_syntax != "html" || is_true(_cache.html_open_tag) == true) {
					if (char == '"' && (prev_char != "\\" || prev2_char == "\\")) {
						match_length = 1;
						_cache.match_lock = _cache.match_lock == "" ? "in_double_quote_str" : "";
					}
					if (_cache.match_lock == "in_double_quote_str") {
						if (match_length > 0) {
							match_length--;
						} else {
							continue;
						}
					}
				}
			}

			//reg string
			if (_cache.match_lock == "" || _cache.match_lock == "in_reg_str") {
				if (fileType != 'php' || _cache.php_syntax != "html" || _cache.html_open_tag == true) {
					if (_cache.match_lock == "" && char == "/") {
						let nextPos = char_x + 1;
						let regClosePos = line.indexOf('/', nextPos);
						let isValid = false;
						while (regClosePos > -1) {
							let regString = line.substring(char_x, regClosePos);
							try {
								new RegExp(regString);
								isValid = true;
								break;
							} catch (e) {
								regClosePos = line.indexOf('/', regClosePos + 1);
							}
						}
						if (isValid) {
							_cache.match_lock = "in_reg_str";
							_cache.match_lock_close = regClosePos;
							match_length = 1;
						}

					} else if (_cache.match_lock == "in_reg_str" && char_x == _cache.match_lock_close) {
						_cache.match_lock = "";
					}
					if (_cache.match_lock == "in_reg_str") {
						if (match_length > 0) {
							match_length--;
						} else {
							continue;
						}
					}
				}
			}

			if (_cache.php_open == false && (fileType == 'html' || fileType == 'php')) {

				let html_open_tag_start = false

				if (_cache.html_open_tag == true && line.indexOf('>', char_x) == char_x) {
					//php opened inside the attributes of a tag
					_cache.php_syntax = 'html'; //put it back
					_cache.html_open_tag = false;
				}
				if (_cache.html_open_tag == false && (_cache.php_syntax === '' || _cache.php_syntax === 'html') && /</.test(line[char_x]) && /[a-zA-Z]/.test(line[char_x + 1])) {
					_cache.php_syntax = 'html'
					_cache.html_open_tag = true;
					html_open_tag_start = true;
					_cache.html_in_tag = true;
				}
				if ((_cache.php_syntax === '' || _cache.php_syntax === 'html') && line[char_x] == "<" && (/<!--/).test(line.substring(char_x, char_x + 4))) {
					_cache.php_syntax = 'html'
					_cache.html_open_comment = true;
					match_length = 4;
					_cache.match_lock = "in_html_comment"
				}
				if ((_cache.php_syntax === '' || _cache.php_syntax === 'html') && line.indexOf('-->', char_x) == char_x) {
					_cache.php_syntax = 'html'
					_cache.html_open_comment = false;
					_cache.match_lock = ""
				}
				if (_cache.html_open_comment == true) {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
				if (_cache.php_syntax == 'html' && html_open_tag_start && line.indexOf('<script', char_x) == char_x) {
					_cache.php_js_open = true;
				}
				if (_cache.php_syntax == 'html' && html_open_tag_start && line.indexOf('<style', char_x) == char_x) {
					_cache.php_css_open = true;
				}
				if (_cache.php_js_open && line.indexOf('</script', char_x) == char_x) {
					_cache.php_js_open = false;
					_cache.php_syntax = 'html'
				}
				if (_cache.php_css_open && line.indexOf('</style', char_x) == char_x) {
					_cache.php_css_open = false;
					_cache.php_syntax = 'html'
				}
				if (_cache.html_in_tag == true && (_cache.php_syntax === '' || _cache.php_syntax === 'html')) {
					_cache.php_syntax = 'html'
					if (line.indexOf('</', char_x) == char_x) {
						_cache.html_in_tag = false;
					}
				}
			}

			// //white space
			// if (char === " ") {
			// 	if (prev_char == " ") {
			// 		continue;
			// 	}
			// }

			textFormatted += char;

			if ((fileType == 'html' || fileType == 'php')) {
				if (_cache.php_syntax != '') {
					syntax = _cache.php_syntax;
				}
			}
		}

		if (cacheFoldInfo) {
			textFormatted = str_replace("(", " ( ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace(")", " ) ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace("{", " { ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace("}", " } ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace("[", " [ ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace("]", " ] ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace("=", " = ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace(";", " ; ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace(":", " : ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace("!", " ! ", textFormatted); //make sure key words have spaces around them
			textFormatted = str_replace("  ", " ", textFormatted); //clean up white spaces
		}

		if (syntax == 'php') {
			//php is weird and requires well formed where as javascript and css do not
			if (textFormatted.indexOf("/*") > -1) {
				//found comment line.. check raw text for well formatted
				//if not well formatted then remove it from textFormatted
				let well_formed_comment_block = true;
				var comment_star_pos = text.indexOf("*"); //make sure all stars are on sam char
				var x = line_x + 1;
				while (x < documentLines.length) {
					var next_line = documentLines[x];
					if (next_line.indexOf('*') !== comment_star_pos) {
						well_formed_comment_block = false;
						break;
					}
					if (next_line.indexOf("*/") > -1) {
						break;
					}
					x++;
				}

				if (well_formed_comment_block == false) {
					textFormatted = str_replace('/*', '', textFormatted);
				}
			}
		}

		let lineData = {};
		lineData['syntax'] = syntax;
		lineData['line'] = line_x;
		lineData['level'] = 0;
		lineData['lineType'] = "";
		lineData['textFormatted'] = textFormatted;
		lineData['text'] = text;
		lineData['id'] = isset(cacheLine) ? cacheLine['id'] : _documents[filePath]['nextLineId']++;

		if (_documents[filePath]['cacheEnabled']) {
			lineData['cache'] = {};
			for (var i in _cache) {
				lineData['cache'][i] = _cache[i]; //store line state
			}
		}

		return lineData;

	}
	var cacheHtmlElements = function (filePath, line_x) {

		if (_documents[filePath]['lines'][line_x]['syntax'] == "html") {

			//reset elements
			_documents[filePath]['lines'][line_x]['html'] = {
				'elements': {}
			}

			let html_element_comment_open = false;
			let html_element_php_open = false;

			let elements = {};
			let openElementKeys = [];
			let inElement = false;
			let inAttribute = false;
			let attributeQuoteChar = '';
			let complete = false;
			let attributeRange = null;
			let attrName = '';
			let isFirstLine = true;
			let lineNumber = line_x;
			let element = null;

			try {
				let lineHasElements = false;
				while (complete == false) {
					if (isset(_documents[filePath]['lines'][line_x]) == false) {
						break;
					}
					let charX = 0;
					let text = _documents[filePath]['lines'][line_x]['text'];

					//parse string
					while (charX < text.length) {

						//ignore comments
						if (text.indexOf('<!--', charX) == charX) {
							_documents[filePath]['lines'][line_x]['lineType'] = 'comment';
							html_element_comment_open = true;
						} else if (html_element_comment_open == true) {
							if (text.indexOf('-->', charX) == charX) {
								html_element_comment_open = false;
								_documents[filePath]['lines'][line_x]['lineType'] = '';
							}
						}
						//ignore php syntax
						if (text.indexOf('<?', charX) == charX) {
							html_element_php_open = true;
						} else if (html_element_php_open == true) {
							if (text.indexOf('?>', charX) == charX) {
								html_element_comment_open = false;
								html_element_php_open = false;
								charX++;
								charX++;
							}
						}

						if (html_element_comment_open == true || html_element_php_open == true) {
							charX++;
							continue;
						}

						//look for open element tag
						if (inElement == false && inAttribute == false && text[charX] == '<' && /[a-zA-Z]/.test(text[charX + 1])) {
							lineHasElements = true;
							complete = false;
							let elementStartPos = charX;
							let elementStartLine = line_x;
							let elementTag = "";
							let isValid = true;
							charX++;
							//get tag characters
							while (/[a-zA-Z0-9_.:-]/.test(text[charX]) == true) {
								if (charX >= text.length) {
									isValid = false;
									break;
								}
								elementTag += text[charX];
								charX++;
							}
							if (isValid == false) {
								break;
							}

							//generate unique id for element
							let key = elementTag + '_L' + elementStartLine + '_C' + elementStartPos;
							let isVoidElement = isset(_elementVoids[elementTag]);
							//store element known data
							elements[key] = element = {
								tag: elementTag,
								isVoidElement: isVoidElement,
								startLine: parseInt(elementStartLine),
								startPos: parseInt(elementStartPos),
								endLine: null,
								endPos: null,
								lineCount: 1,
								isLastOpen: isVoidElement == false,
								attributes: {},
							}
							inElement = true;
							openElementKeys.push(key);
						}

						//inside element tag
						if (inElement == true && inAttribute == false) {

							//look for next attribute
							if (text[charX] == " ") {
								charX++;
								continue;
							}

							if (/[a-zA-Z]/.test(text[charX]) == true) {
								//found new attribute
								attrName = '';
								let endOfLine = false;
								//get attribute characters
								while (/[ =><]/.test(text[charX]) == false) {
									if (charX >= text.length) {
										endOfLine = true;
										break;
									}
									attrName += text[charX];
									charX++;
								}

								if (endOfLine == true) {
									break;
								}

								//find equal
								let valid = true;

								while (text[charX] != "=") {
									if (/[a-zA-Z<>]/.test(text[charX]) == true) {
										valid = false;
										break;
									}
									charX++;
									if (charX == text.length) {
										endOfLine = true;
										break;
									}
								}

								//valid attribute
								element['attributes'][attrName] = [];

								if (valid == false) {
									//store attr with no equals
									element['attributes'][attrName].push({
										line: parseInt(line_x),
										start: charX,
										end: charX,
									})
									continue;
								}

								if (endOfLine == true) {
									break; //end of line
								}

								let equalPos = charX;

								while (text[charX] != "'" && text[charX] != '"') {
									if (/[a-zA-Z<>]/.test(text[charX]) == true) {
										valid = false;
										break;
									}
									charX++;
									if (charX == text.length) {
										endOfLine = true;
										element['attributes'][attrName].push({
											line: parseInt(line_x),
											start: equalPos,
											end: equalPos,
										})
										break;
									}
								}

								if (endOfLine == true) {
									break; //end of line
								}

								if (valid == false) {
									element['attributes'][attrName].push({
										line: parseInt(line_x),
										start: equalPos,
										end: equalPos,
									})
									charX = equalPos + 1;
									continue; //end of line
								}

								attributeQuoteChar = text[charX];

								inAttribute = true;

								charX++;
								continue;// go to next char
							}

						}

						//inside attribute
						if (inElement == true && inAttribute == true) {

							if (attributeRange == null) {
								attributeRange = {
									line: parseInt(line_x),
									start: charX,
									end: null
								}
							}

							if (text[charX] == ">" || text[charX] == "<") {
								element['attributes'][attrName].push({
									line: attributeRange['line'],
									start: attributeRange['start'],
									end: charX,
									//text: text.substring(attributeRange['start'], attributeRange['end']), //for debuging
								})
								attributeRange = null;
								inAttribute = false;
							} else if (text[charX] == attributeQuoteChar || (charX == text.length - 1)) {
								element['attributes'][attrName].push({
									line: attributeRange['line'],
									start: attributeRange['start'],
									end: charX,
									//text: text.substring(attributeRange['start'], attributeRange['end']), //for debuging
								})
								attributeRange = null;
								inAttribute = text[charX] != attributeQuoteChar;
							}
						}

						if (inElement == true && inAttribute == false) {
							if (text[charX] == ">" || text[charX] == "<") {
								inElement = false;
								complete = true;
								let key = openElementKeys[openElementKeys.length - 1];
								elements[key]['endLine'] = parseInt(line_x);
								elements[key]['endPos'] = charX;
								if (isFirstLine == false) {
									break;
								}
							}
						}

						if (isFirstLine == true && inElement == false && inAttribute == false && lineHasElements == true && text.indexOf('</', charX) == charX) {
							//close tag //needs to account for voids
							let key = openElementKeys.pop();
							elements[key]['isLastOpen'] = false;
						}


						charX++;
					}


					if (complete == false && lineHasElements == false) {
						complete = true;
					}

					if (complete == false) {
						line_x++;
					}
					isFirstLine = false;
				}

				_documents[filePath]['lines'][lineNumber]['html']['elements'] = elements;

				for (let line_x in _documents[filePath]['line_links']) {
					if (_documents[filePath]['line_links'][line_x] == lineNumber) {
						delete _documents[filePath]['line_links'][line_x];
					}
				}

				while (line_x > lineNumber) {

					_documents[filePath]['line_links'][line_x] = lineNumber;

					line_x--;
				}


			} catch (e) {
				console.log(e);
				_documents[filePath]['lines'][lineNumber]['html']['elements'] = {};
				_documents[filePath]['lines'][lineNumber]['html']['elementsError'] = true;
			}

		}
	}
	var applyLineDecorations = function (filePath, line_x) {

		if (_documents[filePath]['decorationEnabled'] == false) {
			return;
		}

		let fileDecorations = _documents[filePath]['decorations'];
		let line_id = _documents[filePath]['lines'][line_x]['id'];

		let ranges = {}
		for (var type in fileDecorations) {
			fileDecorations[type]['ranges'][line_id] = [];
			ranges[type] = fileDecorations[type]['ranges'][line_id];
		}

		if (_lineDecorationCallback.length > 0) {
			for (var i in _lineDecorationCallback) {
				_lineDecorationCallback[i](_documents[filePath]['lines'], line_x, ranges);
			}
		}

		for (var type in fileDecorations) {
			if (fileDecorations[type]['ranges'][line_id].length == 0) {
				delete fileDecorations[type]['ranges'][line_id];
			}
		}

	}
	var setDecorations = function (filePath) {

		if (_documents[filePath]['decorationEnabled'] == false) {
			return;
		}

		let fileDecorations = _documents[filePath]['decorations'];

		for (var type in fileDecorations) {
			let ranges = [];
			for (var line_id in fileDecorations[type]['ranges']) {
				if (isset(_documents[filePath]['lineIds'][line_id]) == false) {
					delete fileDecorations[type]['ranges'][line_id];
				} else {
					for (var i in fileDecorations[type]['ranges'][line_id]) {
						ranges.push(fileDecorations[type]['ranges'][line_id][i]);
					}
				}
			}
			vscode.window.activeTextEditor.setDecorations(fileDecorations[type]['decoration'], ranges);
		}
	}

	//####################################################
	//CACHE DOCUMENTS

	/**
	 * @param {vscode.TextDocument} document 
	 */
	function cacheDocumentLines(document) {

		var filePath = Document.filePath(document);
		var fileType = Document.fileType(document);
		var lines = Document.lines(document);

		var syntax = fileSyntax(fileType);

		_documents[filePath]['lines'] = [];

		if (syntax === null) {
			return; //unsupported file type
		}

		//change to row cache later
		_cache.php_open = false;
		_cache.html_open_tag = false;
		_cache.html_in_tag = false;
		_cache.html_open_script = false;
		_cache.html_open_style = false;
		_cache.html_open_comment = false;
		_cache.php_js_open = false;
		_cache.php_css_open = false;
		_cache.php_syntax = 'html'

		_documents[filePath]['lineIds'] = {};
		_documents[filePath]['line_links'] = {};
		_documents[filePath]['nextLineId'] = 0;

		self.fullCache = true;
		try {
			for (var line_x in lines) {
				_documents[filePath]['lines'][line_x] = getLineInfo(fileType, filePath, syntax, line_x, lines);
				_documents[filePath]['lineIds'][_documents[filePath]['lines'][line_x]['id']] = line_x;
			}
		} catch (e) {
			console.log(e)
		}
		self.fullCache = false;

		_cache.elementStore = {}
		_cache.lastOpenElementKey = null;
		//post process html elements
		//catalog elements in row and attributes
		for (var line_x in _documents[filePath]['lines']) {
			try {
				if (fileType == 'html' || fileType == 'php') {
					cacheHtmlElements(filePath, line_x);
				}
				applyLineDecorations(filePath, line_x);
			} catch (e) {
				console.log(e);
			}
		}

		setDecorations(filePath);

	}

	function cacheDocumentJsLineFoldData(filePath, line_x) {

		let cacheLines = _documents[filePath]['lines'];

		//application already flags and clears comment start and stops.
		//only need to check for open chars to know if well formed comment exists as line
		//no need to set levels
		if (cacheLines[line_x]['textFormatted'].lastIndexOf('/*') > -1) {
			cacheLines[line_x]['lineType'] = 'comment';
			//setFoldInfo(line_x);
			return;
		}

		var bracketStart = cacheLines[line_x]['textFormatted'].lastIndexOf("{");
		var braceStart = cacheLines[line_x]['textFormatted'].lastIndexOf("[");
		var lineCount = 0;
		var parens = 0;
		var is_parens = false;
		var found_key_line = false;

		if (braceStart > -1 && braceStart > bracketStart) {
			//found array start
			let line_xx = line_x;
			let max_lines = 10; //looking up the bracket should be either on same line or 1 below. check 10 just to be thorough
			let start = true;
			let isParam = false;
			//look backwards until finding operator
			while (line_xx > -1 && max_lines > 0) {
				var text = cacheLines[line_xx]['textFormatted'];
				let char_x = start ? braceStart - 1 : text.length - 1;

				while (char_x > 0) {

					if (text[char_x].match(/[a-zA-Z0-9\]]/) !== null) {
						//found previous block so this is a param key
						isParam = true;
						break;
					}

					if (text[char_x - 1] == "=" && text[char_x] == ">") {
						cacheLines[line_xx]['lineType'] = "arrayFunctionParam"; //arrayFunctionParam
						break;
					}
					if (text[char_x] == "=" || ((text[char_x] == ":" || text[char_x] == "?") && text.indexOf(":") > -1 && text.indexOf("?") > -1)) {
						cacheLines[line_xx]['lineType'] = "array";
						break;
					}
					if (text[char_x] == "|" || text[char_x - 1] == "|") {
						cacheLines[line_xx]['lineType'] = "array";
						break;
					}
					if (text[char_x] == "&" || text[char_x - 1] == "&") {
						cacheLines[line_xx]['lineType'] = "array";
						break;
					}
					if (text[char_x] == "(" || text[char_x] == ",") {
						cacheLines[line_xx]['lineType'] = "arrayFunctionParam"; //arrayFunctionParam
						break;
					}
					if (text[char_x] == ":" || text[char_x] == "[") {
						cacheLines[line_xx]['lineType'] = "arrayObjectParam"; //arrayObjectParam
						break;
					}
					char_x--;
				}

				if (cacheLines[line_xx]['lineType'] !== "") {
					break;
				}

				if (isParam) {
					break;
				}

				start = false; //first line flag
				line_xx--;
				max_lines--;
				lineCount++;
			}

			//get total lines
			let foldStartLine = line_xx + 1;
			let line_xxx = line_x;
			let char_x = braceStart;
			let braceCount = 0;
			// while (line_xxx < cacheLines.length && lineCount < 3) {
			while (line_xxx < cacheLines.length) {
				lineCount++;
				if (cacheLines[line_xxx]['syntax'] == 'js') {
					let text = cacheLines[line_xxx]['textFormatted'];
					while (char_x < text.length) {
						if (text[char_x] == "[") {
							braceCount++;
						}
						if (text[char_x] == "]") {
							braceCount--;
						}
						if (braceCount == 0) {
							break;
						}
						char_x++;
					}
					if (braceCount == 0) {
						break;
					}
					char_x = 0;
				}
				line_xxx++;
			}

			let foldEndLine = line_xxx;

			if (lineCount < 3) {
				cacheLines[line_xx]['lineType'] = "";
			} else {
				while (foldStartLine < foldEndLine) {
					if (cacheLines[foldStartLine]['syntax'] == 'js') {
						cacheLines[foldStartLine]['level']++;
					}
					foldStartLine++;
				}
			}

			//setFoldInfo(line_xx);

		} else if (bracketStart > -1) {
			//get type
			let line_xx = line_x;
			let max_lines = 10; //looking up the bracket should be either on same line or 1 below. check 10 just to be thorough
			let start = true;
			while (line_xx > -1 && max_lines > 0) {

				var text = cacheLines[line_xx]['textFormatted'];
				let char_x = start ? bracketStart : text.length;

				var check_line = text;

				while (char_x > 0) {

					if (text[char_x] == ")") {
						is_parens = true;
						parens++;
					}

					//check for types related to matching operators
					if (is_parens == false) {
						if (char_x > 0 && text[char_x - 1] == "=" && text[char_x] == ">") {
							cacheLines[line_xx]['lineType'] = "method"; //method
							break;
						}
						if (text[char_x] == "=" || ((text[char_x] == ":" || text[char_x] == "?") && text.indexOf(":") > -1 && text.indexOf("?") > -1)) {
							cacheLines[line_xx]['lineType'] = "object"; //object
							break;
						}
						if (text[char_x] == "(" || text[char_x] == ",") {
							cacheLines[line_xx]['lineType'] = "objectFunctionParam"; //objectParam
							break;
						}
						if (text[char_x] == ":" || text[char_x] == "[") {
							cacheLines[line_xx]['lineType'] = "objectObjectParam"; //objectParam
							break;
						}
					}

					//found parens which means we should have a keyword after it closes
					if (is_parens) {
						//searching for key word
						if (text[char_x] == "(") {
							parens--;
						}
						if (parens == 0) {
							found_key_line = true; //if key word not wound then will be marked as other
							check_line = text.slice(0, char_x);
							break;
						}
					}
					char_x--;
				}

				if (cacheLines[line_xx]['lineType'] !== "") {
					break;
				}

				//check line should contain one of these key words. if not goes to next line
				if (check_line.indexOf(" if ") > -1 || check_line.indexOf(" elseif ") > -1) {
					cacheLines[line_xx]['lineType'] = "if";
					break;
				} else if (check_line.indexOf(" else ") > -1) {
					cacheLines[line_xx]['lineType'] = "else";
					break;
				} else if (check_line.indexOf(" for ") > -1) {
					// } else if (check_line.indexOf(" for ") > -1 || check_line.indexOf(" foreach ") > -1) {
					cacheLines[line_xx]['lineType'] = "for";
					break;
				} else if (check_line.indexOf(" function ") > -1 || check_line.indexOf(" get ") > -1 || check_line.indexOf(" set ") > -1) {
					cacheLines[line_xx]['lineType'] = "method";
					break;
				} else if (check_line.indexOf(" do ") > -1) {
					cacheLines[line_xx]['lineType'] = "while";
					break;
				} else if (check_line.indexOf(" while ") > -1) {
					cacheLines[line_xx]['lineType'] = "while";
					break;
				} else if (check_line.indexOf(" try ") > -1) {
					cacheLines[line_xx]['lineType'] = "try";
					break;
				} else if (check_line.indexOf(" catch ") > -1) {
					cacheLines[line_xx]['lineType'] = "tryCatch";
					break;
				} else if (check_line.indexOf(" finally ") > -1) {
					cacheLines[line_xx]['lineType'] = "tryFinally";
					break;
				} else if (check_line.indexOf(" class ") > -1) {
					cacheLines[line_xx]['lineType'] = "class";
					break;
				} else if (check_line.indexOf(" return ") > -1) {
					cacheLines[line_xx]['lineType'] = "object";
					break;
				} else if (check_line.indexOf(" switch ") > -1) {
					cacheLines[line_xx]['lineType'] = "switch";
					break;
				} else if (check_line.indexOf(" const ") > -1) {
					cacheLines[line_xx]['lineType'] = "object";
					break;
				} else if (check_line.indexOf(" interface ") > -1) {
					cacheLines[line_xx]['lineType'] = "interface";
					break;
				} else if (found_key_line) {
					cacheLines[line_xx]['lineType'] = "method"; //default to method
					break;
				}

				start = false; //first line flag
				line_xx--;
				max_lines--;
				lineCount++;
			}

			//get total lines
			var foldStartLine = line_xx + 1;
			var line_xxx = line_x;
			let char_x = bracketStart;
			var bracketCount = 0;
			var code_data = new RegExp('[^\\{\\}\\ ~]', 'g');
			var hasData = false; //default behavior requires data to fold
			// while (line_xxx < cacheLines.length && (lineCount < 3 || hasData == false)) {
			while (line_xxx < cacheLines.length) {
				lineCount++;
				if (cacheLines[line_xxx]['syntax'] == 'js') {
					let text = cacheLines[line_xxx]['textFormatted'];
					while (char_x < text.length) {
						if (text[char_x] == "{") {
							bracketCount++;
						}
						if (text[char_x] == "}") {
							bracketCount--;
						}
						if (bracketCount == 0) {
							break;
						}
						char_x++;
					}

					if (bracketCount == 0) {
						break;
					}

					hasData = hasData || (lineCount > 1 && (text.match(code_data) || []).length > 0);

					char_x = 0;
				}
				line_xxx++;
			}

			let foldEndLine = line_xxx;

			//js does not require hasData to fold
			if (lineCount < 3 || cacheLines[line_x]['lineType'] == "other") {
				cacheLines[line_x]['lineType'] = cacheLines[line_x]['lineType'] == "other" ? cacheLines[line_x]['lineType'] : "";
			} else {
				while (foldStartLine < foldEndLine) {
					if (cacheLines[foldStartLine]['syntax'] == 'js') {
						cacheLines[foldStartLine]['level']++;
					}
					foldStartLine++;
				}
			}

			//setFoldInfo(line_xx);
		}

	}

	/**
	 * @param {vscode.TextDocument} document 
	 * @param {number} startLine 
	 * @param {number} endLine 
	 */
	function updateCacheDocumentLines(document, startLine, endLine) {

		let filePath = Document.filePath(document);
		let fileType = Document.fileType(document);
		let lines = Document.lines(document);

		let cacheLines = _documents[filePath]['lines'];
		let diff = lines.length - cacheLines.length;

		var syntax = fileSyntax(fileType); //starting syntax

		var changedLines = {};

		var updateLinkedLines = function (line_x) {

			if (isset(cacheLines[line_x]) == false) {
				return null;
			}

			let line_links = _documents[filePath]['line_links'];
			if (isset(line_links[line_x])) {
				let linkLineNum = line_links[line_x];
				changedLines[linkLineNum] = true;
				_documents[filePath]['lines'][linkLineNum] = getLineInfo(fileType, filePath, syntax, linkLineNum, lines);
				return linkLineNum;
			}
			return null;
		}

		try {

			if (diff == 0 && startLine == endLine) {
				//inline change
				updateLinkedLines(startLine);
				_documents[filePath]['lines'][startLine] = getLineInfo(fileType, filePath, syntax, startLine, lines, cacheLines[startLine]);
				changedLines[startLine] = true;
			} else {

				_documents[filePath]['lines'] = [];
				let line_ids = {};

				for (var line_x in lines) {
					line_x = parseInt(line_x);

					if (line_x < startLine) {
						//keep all lines until line change found
						_documents[filePath]['lines'][line_x] = cacheLines[line_x]; //keep old line
						line_ids[_documents[filePath]['lines'][line_x]['id']] = line_x;
					} else if (diff < 0) {
						if (line_x <= (endLine + diff)) {
							let lineNum = updateLinkedLines(line_x);
							if (lineNum !== null) {
								line_ids[_documents[filePath]['lines'][lineNum]['id']] = lineNum;
							}
							_documents[filePath]['lines'][line_x] = getLineInfo(fileType, filePath, syntax, line_x, lines);
							line_ids[_documents[filePath]['lines'][line_x]['id']] = line_x;
							changedLines[line_x] = true;
						} else {
							//shift cache lines
							let line_x_diff = line_x - diff;
							_documents[filePath]['lines'][line_x] = cacheLines[line_x_diff];
							line_ids[_documents[filePath]['lines'][line_x]['id']] = line_x;
							shiftCacheLineValues(filePath, line_x);
						}
					} else if (diff == 0) {
						if (line_x >= startLine || line_x <= endLine) {
							let lineNum = updateLinkedLines(line_x);
							if (lineNum !== null) {
								line_ids[_documents[filePath]['lines'][lineNum]['id']] = lineNum;
							}
							_documents[filePath]['lines'][line_x] = getLineInfo(fileType, filePath, syntax, line_x, lines, cacheLines[line_x]);
							line_ids[_documents[filePath]['lines'][line_x]['id']] = line_x;
							changedLines[line_x] = true;
						} else {
							_documents[filePath]['lines'][line_x] = cacheLines[line_x];
							line_ids[_documents[filePath]['lines'][line_x]['id']] = line_x;
						}
					} else if (diff > 0) {
						//LINES ADDED
						if (line_x <= endLine) {
							//new lines

							let lineNum = updateLinkedLines(line_x);
							if (lineNum !== null) {
								line_ids[_documents[filePath]['lines'][lineNum]['id']] = lineNum;
							}
							_documents[filePath]['lines'][line_x] = getLineInfo(fileType, filePath, syntax, line_x, lines);
							line_ids[_documents[filePath]['lines'][line_x]['id']] = line_x;
							changedLines[line_x] = true;
						} else {
							//old lines
							let line_x_diff = line_x - diff;
							_documents[filePath]['lines'][line_x] = cacheLines[line_x_diff];
							line_ids[_documents[filePath]['lines'][line_x]['id']] = line_x;
							shiftCacheLineValues(filePath, line_x);
						}
					}
				}
				_documents[filePath]['lineIds'] = line_ids;
			}

			try {

				for (var line_x in changedLines) {
					line_x = parseInt(line_x);
					cacheHtmlElements(filePath, line_x);
					applyLineDecorations(filePath, line_x);
				}

				setDecorations(filePath);
			} catch (e) {
				console.log(e);
			}
			//console.log(_documents[fileName]);
		} catch (e) {
			console.log(e);
			return false;
		}
		let changeLinesNumber = Object.keys(changedLines).map(function (value) {
			return parseInt(value);
		});

		let output = {
			startLine: changeLinesNumber.length > 0 ? array_min(changeLinesNumber) : startLine,
			endLine: changeLinesNumber.length > 0 ? array_max(changeLinesNumber) : endLine
		};

		return output;
	}

	/**
	 * @param {vscode.DocumentSelector} language 
	 * @returns vscode.DocumentSelector
	 */
	var getProviderLanguage = function (language) {
		language = is_array(language) ? language.slice(0) : [language]; //copy
		if (in_array('html', language) && in_array('php', language) == false) {
			language.push('php'); //need to add php files so html lines in them can be checked
		}
		language = language.map(function (value) {
			return value == 'js' ? 'javascript' : value;
		});
		return language;
	}

	//####################################################
	//EDITOR
	/**
	 * @returns vscode.TextEditor
	 */
	this.editor = function () {
		return typeof vscode.window.activeTextEditor !== 'undefined' ? vscode.window.activeTextEditor : null;
	}
	/**
	 * @returns vscode.Position
	 */
	this.editorCursorPosition = function () {
		return typeof vscode.window.activeTextEditor !== 'undefined' ? vscode.window.activeTextEditor.selection.active : null;
	}
	/**
	 * @returns vscode.Position
	 */
	this.editorCursorNewPosition = function (lineNumber, charNumber) {
		var pos = self.editorCursorPosition();
		return pos !== null ? pos.with(lineNumber, charNumber) : null;
	}

	/**
	 * @returns vscode.TextDocument
	 */
	this.document = function () {
		var editor = self.editor();
		if (editor !== null) {
			return editor.document;
		}
		return null;
	}

	//####################################################
	//EDITOR ACTIONS
	this.editorSelectLines = function (lineNumbers) {
		if ((is_int(lineNumbers) == false && is_array(lineNumbers) == false) || (is_array(lineNumbers) && lineNumbers.length == 0)) {
			return;
		}
		lineNumbers = is_array(lineNumbers) ? lineNumbers : [lineNumbers];
		let selections = new Array;
		for (var i in lineNumbers) {
			var linePosition = self.editorCursorNewPosition(lineNumbers[i], 0);
			if (linePosition !== null) {
				selections.push(new vscode.Selection(linePosition, linePosition));
			}
		}
		var editor = self.editor();
		if (editor !== null) {
			editor.selections = selections;
		}
	}
	this.editorUnSelectAll = function () {
		var editor = self.editor();
		if (editor !== null) {
			var linePosition = self.editorCursorNewPosition(editor.selection.start.line, editor.selection.start.character);
			if (linePosition !== null) {
				var cursor = new vscode.Selection(linePosition, linePosition);
				editor.selections = [cursor];
			}
		}
	}
	this.editorSetCursorPosition = function (lineNumber, charNumber) {
		var editor = self.editor();
		if (editor !== null) {
			if (isset(editor.selection)) {
				lineNumber = is_int(lineNumber) ? lineNumber : 0;
				charNumber = is_int(charNumber) ? charNumber : 0;
				var linePosition = self.editorCursorNewPosition(lineNumber, charNumber);
				if (linePosition !== null) {
					editor.selection = new vscode.Selection(linePosition, linePosition);
				}
			}
		}
	}
	this.editorFoldSelectedLines = async function () {
		await vscode.commands.executeCommand('editor.fold');
	}
	this.editorFoldLines = async function (lineNumbers) {
		await vscode.commands.executeCommand('editor.fold', { selectionLines: lineNumbers });
	}
	this.editorUnFoldSelectedLines = async function () {
		await vscode.commands.executeCommand('editor.unfold');
	}
	this.editorUnFoldLines = async function (lineNumbers) {
		await vscode.commands.executeCommand('editor.unfold', { selectionLines: lineNumbers });
	}
	this.editorFormatDocument = async function () {
		await vscode.commands.executeCommand('editor.action.formatDocument');
	}
	this.editorInsertText = function (line, char, text) {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.edit(function (editBuilder) {
				editBuilder.insert(new vscode.Position(line, char), text);
			});
		}
	}
	this.editorDeleteText = function (line, charStart, charEnd) {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.edit(function (editBuilder) {
				let range = new vscode.Range(line, charStart, line, charEnd);
				editBuilder.delete(range);
			});
		}
	}

	//####################################################
	//DECORATIONS
	this.editorCreateDecoration = function (key, decoration) {

		let decInfo = {
			key,
			decoration
		};
		_decorations.push(decInfo);

		//apply to any already open documents
		for (var filePath in _documents) {
			_documents[filePath]['cacheEnabled'] = true; //caching enabled by default
			_documents[filePath]['decorationEnabled'] = true;
			_documents[filePath]['decorations'][decInfo['key']] = {
				decoration: vscode.window.createTextEditorDecorationType(decInfo['decoration']),
				ranges: {}
			}
		}

	}
	this.addDecorationLineRanges = function (callback) {
		_lineDecorationCallback.push(callback);
	}

	//####################################################
	//PUBLIC METHODS
	/**
	 * @param {vscode.TextDocument} document 
	 */
	this.getDocumentLinesInfo = function (document = null) {
		document = isset(document) ? document : self.document();
		var filePath = Document.filePath(document);
		if (_documents[filePath]['cacheEnabled'] == true && isset(_documents[filePath]['lines']) == true) {
			return _documents[filePath]['lines'];
		}
		cacheDocumentLines(document);
		return _documents[filePath]['lines'];
	}
	this.setValidDocTypes = function (types) {
		for (var i in types) {
			_validDocTypes[types[i]] = true;
			_validDocTypes['.' + types[i]] = true;
		}
	}
	this.setDocumentCacheEnabled = function (params) {
		if (is_object(params)) {
			_documentCacheParams['enabled'] = true;
			for (var i in params) {
				_documentCacheParams[i] = params[i];
			}
		} else {
			_documentCacheParams['enabled'] = is_bool(params) ? params : true;
		}
	}
	this.documentIsValidType = function (document) {
		document = isset(document) ? document : self.document();
		if (isset(_validDocTypes[Document.fileType(document)]) == false) {
			return false;
		}
		return true;
	}
	this.getDocuments = function () {
		return _documents;
	}

	//####################################################
	//REGISTERS
	this.registerCommand = function (command, callback) {
		_context.subscriptions.push(vscode.commands.registerCommand(command, function () {
			_cache = {}; //clear cache
			if (typeof callback == "function") {
				callback();
			}
		}));

	}
	this.registerMenuCommand = function (command, callback) {
		const disposable = vscode.commands.registerTextEditorCommand(command, callback);
		_context.subscriptions.push(disposable);
	}

	/**
	 * @param {vscode.DocumentSelector} language 
	 * @param {providerCallback} callback 
	 */
	this.registerHoverProvider = function (language, callback) {

		language = is_array(language) ? language : [language];

		var HoverProvider = function () {
			/**
			 * @param {vscode.TextDocument} document 
			 * @param {vscode.Position} position 
			 * @param {vscode.CancellationToken} token 
			 */
			this.provideHover = function (document, position, token) {
				let lines = self.getDocumentLinesInfo(document);
				if (isset(lines[position.line]) && in_array(lines[position.line]['syntax'], language)) {
					try {
						return callback(document, position, token)
					} catch (e) {
						console.log(e)
					}
				}
			}
		}
		vscode.languages.registerHoverProvider(getProviderLanguage(language), new HoverProvider());
	}

	/**
	 * @param {vscode.DocumentSelector} language 
	 * @param {registerCompletionProviderCallback} callback 
	 * @param {Array} chars 
	 */
	this.registerCompletionProvider = function (language, callback, ...chars) {

		self.setDocumentCacheEnabled(true); //required

		language = is_array(language) ? language : [language];

		var CompletionProvider = function () {
			/**
			 * @param {vscode.TextDocument} document 
			 * @param {vscode.Position} position 
			 * @param {vscode.CancellationToken} token 
			 * @param {vscode.CompletionContext} context 
			 */
			this.provideCompletionItems = function (document, position, token, context) {
				let lines = self.getDocumentLinesInfo(document);
				if (isset(lines[position.line]) && in_array(lines[position.line]['syntax'], language)) {
					return callback(document, position, token, context)
				}
			}
		}
		vscode.languages.registerCompletionItemProvider(getProviderLanguage(language), new CompletionProvider(), ...chars);

	}

	/**
	 * @param {vscode.DocumentSelector} language 
	 * @param {registerDefinitionProviderCallback} callback 
	 */
	this.registerDefinitionProvider = function (language, callback) {

		language = is_array(language) ? language : [language];

		var DefinitionProvider = function () {

			/**
			 * 
			 * @param {vscode.TextDocument} document 
			 * @param {vscode.Position} position 
			 * @param {vscode.CancellationToken} token 
			 * @returns vscode.Location
			 */
			this.provideDefinition = function (document, position, token) {
				let lines = self.getDocumentLinesInfo(document);
				if (isset(lines[position.line]) && in_array(lines[position.line]['syntax'], language)) {
					return callback(document, position, token)
				}
			}

		}

		vscode.languages.registerDefinitionProvider(getProviderLanguage(language), new DefinitionProvider());
	}

	//####################################################
	//EVENTS
	/**
	 * @param {onDocumentTextChangeCallback} callback 
	 */
	this.onDocumentTextChange = function (language, callback) {

		language = is_array(language) ? language : [language];

		self.on('documentTextChange', function (event) {
			let lines = self.getDocumentLinesInfo(event.document);
			if (in_array(lines[event.startLine]['syntax'], language)) {
				callback(event);
			}
		});
	}

	/**
	 * @param {onDocumentTextChangeCallback} callback 
	 */
	this.onDocumentInlineTextChange = function (language, callback) {

		language = is_array(language) ? language : [language];

		self.on('documentTextChange', function (event) {
			if (event.diff == 0 && event.startLine == event.endLine) {
				let lines = self.getDocumentLinesInfo(event.document);
				if (in_array(lines[event.startLine]['syntax'], language)) {
					callback(event);
				}
			}
		});
	}

	/**
	 * @param {onDocumentOpenCallback} callback 
	 */
	this.onDocumentOpen = function (callback) {
		self.on('documentOpen', callback);
	}

	/**
	* @param {onDocumentCloseCallback} callback 
	*/
	this.onDocumentClose = function (callback) {
		self.on('documentClose', callback);
	}

	//####################################################

	/**
	 * @param {vscode.TextDocument} document 
	 */
	var documentOpen = function (document) {
		if (self.documentIsValidType(document) == false) {
			return;
		}

		let filePath = Document.filePath(document);

		_documents[filePath] = {
			lines: null,
			lineCount: document.lineCount,
			nextLineId: 0,
			lineIds: {},
			line_links: {},
			decorations: {},
			decorationEnabled: false,
			cacheEnabled: false,
			updateDocumentOnChange: false,
			isOpen: true,
		};


		if (_decorations.length > 0) {
			_documents[filePath]['cacheEnabled'] = true; //on by default when decorations are set
			for (var i in _decorations) {
				_documents[filePath]['decorationEnabled'] = true;
				_documents[filePath]['decorations'][_decorations[i]['key']] = {
					decoration: vscode.window.createTextEditorDecorationType(_decorations[i]['decoration']),
					ranges: {}
				}
			}
		}

		//overrides
		if (_documents[filePath]['cacheEnabled'] == false && _documentCacheParams['enabled']) {
			if (isset(_documentCacheParams.lineCount)) {
				_documents[filePath]['cacheEnabled'] = document.lineCount >= _documentCacheParams.lineCount
			} else {
				_documents[filePath]['cacheEnabled'] = true;
			}
		}

		//run document commands
		self.getDocumentLinesInfo();

		self.emit('documentOpen', document);
	}
	/**
	 * @param {vscode.TextDocument} document 
	 */
	var documentFocus = function (document) {

		if (self.documentIsValidType(document) == false) {
			return;
		}

		let filePath = Document.filePath(document);

		if (isset(_documents[filePath]) == false) {
			documentOpen(document);
		} else {
			setDecorations(filePath)
		}
		self.emit('documentFocus', document);
	}
	var textDocumentChange = function () {
		try {
			if (_textDocumentChangeQueue.length > 0) {

				let event = _textDocumentChangeQueue.shift();
				let filePath = event.filePath;
				let startLine = event.startLine;
				let endLine = event.endLine;
				let diff = event.diff;

				//optimize: group text change events
				while (true) {
					if (_textDocumentChangeQueue.length > 0 && _textDocumentChangeQueue[0].filePath == filePath) {
						event = _textDocumentChangeQueue.shift();
						let nextStartLine = event.startLine;
						let nextEndLine = event.endLine;
						let nextDiff = event.diff;
						startLine = nextStartLine < startLine ? nextStartLine : startLine;
						endLine = nextEndLine > endLine ? nextEndLine : endLine;
						diff = diff + nextDiff;
					} else {
						break;
					}
				}

				event.startLine = startLine;
				event.endLine = endLine;
				event.diff = diff;

				if (_documentCacheParams['enabled'] && isset(_documentCacheParams.lineCount)) {
					_documents[filePath]['cacheEnabled'] = _documents[filePath]['lineCount'] >= _documentCacheParams.lineCount
				}

				if (_documents[filePath]['cacheEnabled'] == true) {

					if (event.endLine - event.startLine > event.document.lineCount / 2) {
						//if it fails cache entire list again
						cacheDocumentLines(event.document);
						startLine = 0;
						endLine = _documents[filePath]['lines'].length - 1; //inclusive;
						diff = startLine - endLine;
						event.startLine = startLine;
						event.endLine = endLine;
						event.diff = diff;
					} else {

						let success = updateCacheDocumentLines(event.document, startLine, endLine);
						if (!success) {
							//if it fails cache entire list again
							cacheDocumentLines(event.document);
							startLine = 0;
							endLine = _documents[filePath]['lines'].length - 1; //inclusive;
							diff = startLine - endLine;
							event.startLine = startLine;
							event.endLine = endLine;
							event.diff = diff;
						} else {
							event.startLine = success.startLine;
							event.endLine = success.endLine;
						}
					}
					self.emit('documentTextChange', event);
					textDocumentChange();
				} else {
					if (_documents[filePath]['decorationEnabled'] == true) {
						self.getDocumentLinesInfo(); //reload
					}
					self.emit('documentTextChange', event);
					textDocumentChange();
				}
			}
		} catch (e) {
			console.log(e);
		}

	}

	vscode.window.onDidChangeActiveTextEditor(function (textEditor) {
		let document = textEditor.document;
		if (document.uri.scheme === 'file') {
			try {
				documentFocus(textEditor.document);
			} catch (e) {
				console.log(e);
			}
		}
	});
	vscode.workspace.onDidCloseTextDocument(function (document) {
		if (self.documentIsValidType(document) == false) {
			return;
		}
		if (document.uri.scheme == 'file') {
			let filePath = Document.filePath(document);
			if (isset(_documents[filePath]) == true) {
				delete _documents[filePath];
				setTimeout(function () {
					self.emit('documentClose', document);
				})
			}

		}
	});
	vscode.workspace.onDidChangeTextDocument(function (event) {

		if (self.documentIsValidType(event.document) == false) {
			return;
		}

		let document = event.document;

		if (document.uri.scheme == 'file') {
			if (event.contentChanges.length > 0) {

				for (var i in event.contentChanges) {
					let start = event.contentChanges[i]['range']['start'];
					let end = event.contentChanges[i]['range']['end'];
					let startLine = start.line;
					let endLine = end.line;
					let lineCount = event.document.lineCount;
					let filePath = Document.filePath(document);
					let diff = lineCount - _documents[filePath]['lineCount'];

					if (diff > 0) {
						let lineX = 0;
						let text = event.contentChanges[i]['text'] ? event.contentChanges[i]['text'] : '';
						let charX = text.indexOf("\n", 0) > -1;
						while (charX > -1) {
							lineX++;
							charX = text.indexOf("\n", charX + 1);
						}
						endLine = startLine + lineX; //calculate real endLine
					}

					let textChangeEvent = new TextChangeEventArgs();
					textChangeEvent.document = event.document;
					textChangeEvent.filePath = filePath;
					textChangeEvent.startLine = startLine;
					textChangeEvent.endLine = endLine;
					textChangeEvent.diff = diff;
					textChangeEvent.text = event.contentChanges[i]['text'];

					_documents[filePath]['lineCount'] = lineCount;

					//eliminate race conditions
					_textDocumentChangeQueue.push(textChangeEvent);
					if (_textDocumentChangeQueue.length == 1) {
						let lastLength = _textDocumentChangeQueue.length;
						if (isset(self.isRunning) == false) {
							self.isRunning = true;
							//cursor position not updated until next loop 
							//changes for none delete keys should call immediately so we get the cursor original position before the keypress
							//do not call immediately for inline delete changes so we know if backspace or delete was pressed based on new cursor position
							if (event.contentChanges.length == 1 && (event.contentChanges[i]['text'] !== '' || diff !== 0 || (startLine != endLine))) {
								textDocumentChange();
							}
							setTimeout(function () {
								textDocumentChange();
							})
						}

						let lastLengthInterval = setInterval(function () {
							if (lastLength != _textDocumentChangeQueue.length) {
								lastLength = _textDocumentChangeQueue.length;
							} else {
								clearInterval(lastLengthInterval);
								textDocumentChange();
							}
						}, 30);
					}
				}
				setTimeout(function () {
					self.isRunning = null;
				}, 100)

			}
		}
	});

	//ACTIVATE
	this.activate = function () {
		//if activated by file open we need to manually trigger on document open
		var document = self.document();
		if (document !== null) {
			if (document.uri.scheme === 'file') {
				//need to wait one interval for activeEditor to be valid
				setTimeout(function () {
					documentFocus(document); //triggers open event
				})
			}
		}
	}

	/**
	 * @type {vscode.ExtensionContext}
	 */
	var _context;

	/**
	* @param {vscode.ExtensionContext} context
	*/
	this.setContext = function (context) {
		_context = context;
	}
}

function TextChangeEventArgs() {
	/**
	 * @type {vscode.TextDocument}
	 */
	this.document = null;
	this.fileName = null;
	this.startLine = null;
	this.endLine = null;
	this.diff = null;
	this.text = null;
}

module.exports = {
	Application,
	Document,
	ConfigSettings
}

/**
 * @callback onDocumentTextChangeCallback
 * @param {TextChangeEventArgs} event 
 */

/**
 * @callback onDocumentOpenCallback
 * @param {vscode.TextDocument} document 
 */

/**
 * @callback onDocumentCloseCallback
 * @param {vscode.TextDocument} document 
 */

/**
 * @callback providerCallback
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @param {vscode.CancellationToken} token 
 */

/**
 * @callback registerCompletionProviderCallback
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @param {vscode.CancellationToken} token 
 * @param {vscode.CompletionContext} context 
 */

/**
 * @callback registerDefinitionProviderCallback
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @param {vscode.CancellationToken} token
 * @returns vscode.Location 
 */