const vscode = require('vscode');
var path = require("path");

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

/**
  * @param {vscode.ExtensionContext} context
  */
var Application = function (context) {

	var self = this;

	Extend(this, EventHandler);

	var cache = {};

	//editor
	this.editor = function () {
		return typeof vscode.window.activeTextEditor !== 'undefined' ? vscode.window.activeTextEditor : null;
	}
	this.editorCursorPosition = function () {
		return typeof vscode.window.activeTextEditor !== 'undefined' ? vscode.window.activeTextEditor.selection.active : null;
	}
	this.editorCursorNewPosition = function (lineNumber, charNumber) {
		var pos = self.editorCursorPosition();
		return pos !== null ? pos.with(lineNumber, charNumber) : null;
	}
	//editor actions
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
		await self.executeCommand('editor.fold');
	}
	this.editorFoldLines = async function (lineNumbers) {
		await vscode.commands.executeCommand('editor.fold', { selectionLines: lineNumbers });
	}
	this.editorUnFoldSelectedLines = async function () {
		await self.executeCommand('editor.unfold');
	}
	this.editorUnFoldLines = async function (lineNumbers) {
		await vscode.commands.executeCommand('editor.unfold', { selectionLines: lineNumbers });
	}
	this.editorFormatDocument = async function () {
		await vscode.commands.executeCommand('editor.action.formatDocument');
	}

	//document
	this.document = function () {
		var editor = self.editor();
		if (editor !== null) {
			return editor.document;
		}
		return null;
	}
	this.documentPath = function () {
		var document = self.document();
		return document !== null ? document.fileName : "";
	}
	this.documentName = function () {
		return path.basename(self.documentPath());
	}
	this.documentType = function () {
		return str_replace('.', '', path.extname(self.documentPath()));
	}
	this.documentLines = function () {
		var document = self.document();
		let text = document !== null ? document.getText() : null;
		return text !== null ? text.split(/\r?\n/) : []; //zero index
	}
	this.documentLineCount = function () {
		var document = self.document();
		return document !== null ? document.lineCount : -1;
	}

	let nextLineId = 0;
	var elementVoids = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'path', 'source', 'track', 'wbr'];
	var getLineInfo = function (fileType, fileName, syntax, line_x, documentLines, cacheLine) {

		if (isset(cache.match_lock) == false) {
			cache.match_lock = "";
		}

		line_x = parseInt(line_x);
		let text = documentLines[line_x]; //store original line

		let line = text;
		line = str_replace("\t", " ", line); //make sure key words have spaces around them
		line = " " + line + " ~"; //add leading ws and eol

		line = str_replace("(", " ( ", line); //make sure key words have spaces around them
		line = str_replace(")", " ) ", line); //make sure key words have spaces around them
		line = str_replace("{", " { ", line); //make sure key words have spaces around them
		line = str_replace("}", " } ", line); //make sure key words have spaces around them
		line = str_replace("[", " [ ", line); //make sure key words have spaces around them
		line = str_replace("]", " ] ", line); //make sure key words have spaces around them
		line = str_replace("=", " = ", line); //make sure key words have spaces around them
		line = str_replace(";", " ; ", line); //make sure key words have spaces around them
		line = str_replace(":", " : ", line); //make sure key words have spaces around them
		line = str_replace("!", " ! ", line); //make sure key words have spaces around them

		var textFormatted = "";
		var match_length = 0;
		var in_quote_str = false;

		if (cacheDocumentLines) {
			if (isset(self.documents[fileName]['lines'][line_x - 1])) {
				let _cache = self.documents[fileName]['lines'][line_x - 1]['cache'];
				for (var i in _cache) {
					cache[i] = _cache[i]; //reload cache state
				}
			}
		}

		if (cache.php_open) {
			syntax = 'php';
			cache.php_syntax = '';
		}
		if (cache.php_js_open) {
			cache.php_syntax = 'js';
		}
		if (cache.php_css_open) {
			cache.php_syntax = 'css';
		}

		var php_open_line = false;

		if (cache.match_lock == "in_comment_line") {
			cache.match_lock = ""; //reset for next line
		}
		if (cache.match_lock == "in_reg_str") {
			cache.match_lock = ""; //reset for next line
		}

		for (var char_x in line) {
			char_x = parseInt(char_x);
			var char = line[char_x];
			var prev_char = char_x > 0 ? line[char_x - 1] : '';
			var prev2_char = char_x > 1 ? line[char_x - 2] : '';
			var next_char = char_x < line.length ? line[char_x + 1] : '';

			if (fileType == 'php') {
				if (line.indexOf('<?', char_x) == char_x) {
					cache.php_open = true;
					php_open_line = true;
					if (cache.match_lock != "") {
						cache.match_lock_push = cache.match_lock;
						cache.match_lock = "";
					}
				}
				if (cache.php_open == true && line.indexOf('?>', char_x) == char_x) {
					cache.php_open = false;
					php_open_line = false;
					if (cache.match_lock_push != "") {
						cache.match_lock = cache.match_lock_push;
						cache.match_lock_push = "";
					}
				}
				if (php_open_line) {
					continue;
				}
			}

			//in line comment
			if (cache.match_lock == "" || cache.match_lock == "in_comment_line") {
				if (cache.match_lock == "" && line.indexOf('//', char_x) == char_x && prev_char != "\\") {
					match_length = 2;
					cache.match_lock = "in_comment_line";
				}
				if (cache.match_lock == "in_comment_line") {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
			}

			//block comment
			if (cache.match_lock == "" || cache.match_lock == "in_comment_block" || cache.match_lock == "in_comment_block_end") {
				if (cache.match_lock == "" && line.indexOf('/*', char_x) == char_x && prev_char != "\\") {
					if (line.indexOf('*/') > -1) {
						//same line;
					} else {
						match_length = 2;
					}
					cache.match_lock = "in_comment_block";
					cache.commentBlockLine = line_x;
					cache.commentBlockChar = char_x;
				}
				if (cache.match_lock == "in_comment_block" && line.indexOf('*/', char_x) == char_x) {

					cache.match_lock = "in_comment_block_end";
					continue;
				}
				if (cache.match_lock == "in_comment_block_end") {
					cache.match_lock = "";
					continue;
				}
				if (cache.match_lock == "in_comment_block") {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
			}

			//quote
			if (cache.match_lock == "" || cache.match_lock == "in_quote_str") {
				if (char == "`" && (prev_char != "\\" || prev2_char == "\\")) {
					match_length = 1;
					in_quote_str = !in_quote_str;
					cache.match_lock = in_quote_str ? "in_quote_str" : "";
				}
				if (in_quote_str == true) {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
			}

			//single quote
			if (cache.match_lock == "" || cache.match_lock == "in_single_quote_str") {
				if (char == "'" && (prev_char != "\\" || prev2_char == "\\")) {
					match_length = 1;
					cache.match_lock = cache.match_lock == "" ? "in_single_quote_str" : "";
				}
				if (cache.match_lock == "in_single_quote_str") {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
			}

			//double quote
			if (cache.match_lock == "" || cache.match_lock == "in_double_quote_str") {
				if (char == '"' && (prev_char != "\\" || prev2_char == "\\")) {
					match_length = 1;
					cache.match_lock = cache.match_lock == "" ? "in_double_quote_str" : "";
				}
				if (cache.match_lock == "in_double_quote_str") {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
			}

			//reg string
			if (cache.match_lock == "" || cache.match_lock == "in_reg_str") {
				if (cache.match_lock == "" && char == "/") {
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
						cache.match_lock = "in_reg_str";
						cache.match_lock_close = regClosePos;
						match_length = 1;
					}

				} else if (cache.match_lock == "in_reg_str" && char_x == cache.match_lock_close) {
					cache.match_lock = "";
				}
				if (cache.match_lock == "in_reg_str") {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
			}

			if (cache.php_open == false && (fileType == 'html' || fileType == 'php')) {

				let html_open_tag_start = false

				if (cache.html_open_tag == true && line.indexOf('>', char_x) == char_x) {
					//php opened inside the attributes of a tag
					cache.php_syntax = 'html'; //put it back
					cache.html_open_tag = false;
				}
				if (cache.html_open_tag == false && (cache.php_syntax === '' || cache.php_syntax === 'html') && line.indexOf('<', char_x) == char_x && /[a-zA-Z]/.test(line[char_x + 1])) {
					cache.php_syntax = 'html'
					cache.html_open_tag = true;
					html_open_tag_start = true;
					cache.html_in_tag = true;
				}
				if ((cache.php_syntax === '' || cache.php_syntax === 'html') && line.indexOf('<!--', char_x) == char_x) {
					cache.php_syntax = 'html'
					cache.html_open_comment = true;
					match_length = 4;
					cache.match_lock = "in_html_comment"
				}
				if ((cache.php_syntax === '' || cache.php_syntax === 'html') && line.indexOf('-->', char_x) == char_x) {
					cache.php_syntax = 'html'
					cache.html_open_comment = false;
					cache.match_lock = ""
				}
				if (cache.html_open_comment == true) {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
				if (cache.php_syntax == 'html' && html_open_tag_start && line.indexOf('<script', char_x) == char_x) {
					cache.php_js_open = true;
				}
				if (cache.php_syntax == 'html' && html_open_tag_start && line.indexOf('<style', char_x) == char_x) {
					cache.php_css_open = true;
				}
				if (cache.php_js_open && line.indexOf('</script', char_x) == char_x) {
					cache.php_js_open = false;
					cache.php_syntax = 'html'
				}
				if (cache.php_css_open && line.indexOf('</style', char_x) == char_x) {
					cache.php_css_open = false;
					cache.php_syntax = 'html'
				}
				if (cache.html_in_tag == true && (cache.php_syntax === '' || cache.php_syntax === 'html')) {
					cache.php_syntax = 'html'
					if (line.indexOf('</', char_x) == char_x) {
						cache.html_in_tag = false;
					}
				}
			}

			//white space
			if (char === " ") {
				if (prev_char == " ") {
					continue;
				}
			}

			textFormatted += char;

			if ((fileType == 'html' || fileType == 'php')) {
				if (cache.php_syntax != '') {
					syntax = cache.php_syntax;
				}
			}
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
		lineData['id'] = isset(cacheLine) ? cacheLine['id'] : nextLineId++;

		if (cacheDocumentLines) {
			lineData['cache'] = {};
			for (var i in cache) {
				lineData['cache'][i] = cache[i]; //store line state
			}
		}

		return lineData;

	}
	var cacheHtmlElements = function (fileName, line_x, cacheLines) {

		if (cacheLines[line_x]['syntax'] == "html") {

			let text = cacheLines[line_x]['text'];

			self.documents[fileName]['lines'][line_x]['html'] = {
				'elements': {}
			}
			let lineHasElements = false;
			let isComment = false;
			let charX = 0;
			let elements = [];
			let openElementKeys = [];

			try {
				let nextAttributeId = 1;
				let phpOpen = false;
				while (charX < text.length) {

					if (text.indexOf('<!--', charX) == charX) {
						self.documents[fileName]['lines'][line_x]['lineType'] = 'comment';
						isComment = true;
					} else if (isComment == true) {
						if (text.indexOf('-->', charX) == charX) {
							isComment = false;
							self.documents[fileName]['lines'][line_x]['lineType'] = '';
						}
					}
					if (text.indexOf('<?', charX) == charX) {
						phpOpen = true;
					} else if (phpOpen == true) {
						if (text.indexOf('?>', charX) == charX) {
							isComment = false;
							phpOpen = false;
							charX++;
							charX++;
						}
					}

					if (isComment == false && phpOpen == false) {
						let elementStartPos = 0;
						if (text[charX] == '<' && /[a-zA-Z]/.test(text[charX + 1])) {
							lineHasElements = true;
							var charXX = charX + 1;
							let elementTag = "";
							while (/[a-zA-Z0-9_.:-]/.test(text[charXX]) == true) {
								if (charXX >= text.length) {
									throw 'invalid';
								}
								elementTag += text[charXX];
								charXX++;
							}
							elementStartPos = charX;
							let elementStartLine = line_x;
							let key = elementTag + '_L' + elementStartLine + '_C' + elementStartPos;
							let isVoidElement = in_array(elementTag, elementVoids);
							elements[key] = cache.elementStore[key] = {
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
							cache.lastOpenElementKey = key;
							openElementKeys.push(key);
						}


						if (cache.lastOpenElementKey !== null) {
							if (text[charX] == ">") {
								cache.elementStore[cache.lastOpenElementKey]['endPos'] = charX + 1;
								cache.elementStore[cache.lastOpenElementKey]['endLine'] = parseInt(line_x);

								//build attributes
								let element = cache.elementStore[cache.lastOpenElementKey];

								let nextLine = element['startLine'];
								while (nextLine <= element['endLine']) {
									if (cacheLines[nextLine]['syntax'] !== 'html') {
										nextLine++;
										continue;
									}


									let lineText = cacheLines[nextLine]['text'];
									let startPos = nextLine == element['startLine'] ? element['startPos'] + element['tag'].length + 1 : 0;
									let endPos = nextLine == element['endLine'] ? element['endPos'] : lineText.length;
									let attrName = "";
									let attrValue = "";
									let x = startPos;
									let start;

									while (x < endPos && x > -1) {
										x = lineText.indexOf(/[a-zA-Z_.:-]/, x);
										if (x > -1 && x < endPos) {
											start = x
											x = lineText.indexOf(/[=> ]/, x);
											if (x > -1) {
												attrName = trim(lineText.substring(start, (x > -1 ? x : lineText.length)));
												element['attributes'][attrName] = {
													id: nextAttributeId++,
													value: '',
													valueStartPos: null,
													valueEndPos: null,
													line: nextLine
												}
												//nextAttributeId = round((nextAttributeId + 0.001), 3);
												x = lineText.indexOf(/('|")/, x);
												if (x > -1) {
													let openQuote = lineText[x];
													x++;
													start = x;
													x = lineText.indexOf(openQuote, start);
													attrValue = trim(lineText.substring(start, x > -1 ? x : lineText.length));
													element['attributes'][attrName]['value'] = attrValue;
													element['attributes'][attrName]['valueStartPos'] = start;
													element['attributes'][attrName]['valueEndPos'] = x > -1 ? x : lineText.length;
													element['attributes'][attrName]['line'] = nextLine;
													//element['attributes'][attrName]['lineText'] = lineText;
													// element['attributes'][attrName] = {
													// 	value: attrValue,
													// 	valueStartPos: start,
													// 	valueEndPos: x > -1 ? x : lineText.length,
													// 	line: nextLine,
													// 	lineText: lineText
													// };
												}
											}

										}
									}

									nextLine++;
								}

								cache.lastOpenElementKey = null;
							}
						}

						if (lineHasElements == true && text[charX] == "<" && text[charX + 1] == "/") {
							//close tag
							let key = openElementKeys.pop();
							elements[key]['isLastOpen'] = false;
						}
					}

					charX++;
				}
				if (isset(cache.lastOpenElementKey)) {
					cache.elementStore[cache.lastOpenElementKey]['lineCount']++;
				}
				self.documents[fileName]['lines'][line_x]['html']['elements'] = elements;
			} catch (e) {
				//console.log(e);
				self.documents[fileName]['lines'][line_x]['html']['elements'] = {};
				self.documents[fileName]['lines'][line_x]['html']['elementsError'] = true;
			}

		}
	}
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
	var cacheDocumentLines = function () {

		var fileName = self.document().fileName;
		var fileType = self.documentType();

		var lines = self.documentLines();
		var syntax = fileSyntax(fileType);

		self.documents[fileName]['lines'] = [];

		if (syntax === null) {
			return; //unsupported file type
		}

		cache.php_open = false;
		cache.html_open_tag = false;
		cache.html_in_tag = false;
		cache.html_open_script = false;
		cache.html_open_style = false;
		cache.html_open_comment = false;
		cache.php_js_open = false;
		cache.php_css_open = false;
		cache.php_syntax = ''

		for (var line_x in lines) {
			try {
				self.documents[fileName]['lines'][line_x] = getLineInfo(fileType, fileName, syntax, line_x, lines);
			} catch (e) {
				console.log(e)
			}
		}

		cache.elementStore = {}
		cache.lastOpenElementKey = null;
		//post process html elements
		if (fileType == 'html' || fileType == 'php') {
			//catalog elements in row and attributes
			let lines = self.documents[fileName]['lines'];
			for (var line_x in lines) {
				try {
					cacheHtmlElements(fileName, line_x, lines);
				} catch (e) {
					console.log(e);
				}
			}
		}

		console.log(self.documents[fileName]['lines']);
	}
	var shiftCacheLineValues = function (fileName, line_x) {
		let diff = line_x - self.documents[fileName]['lines'][line_x]['line'];
		self.documents[fileName]['lines'][line_x]['line'] = line_x;
		if (isset(self.documents[fileName]['lines'][line_x]['html']) && isset(self.documents[fileName]['lines'][line_x]['html']['elements'])) {
			for (var i in self.documents[fileName]['lines'][line_x]['html']['elements']) {
				self.documents[fileName]['lines'][line_x]['html']['elements'][i]['startLine'] += diff;
				self.documents[fileName]['lines'][line_x]['html']['elements'][i]['endLine'] += diff;
				for (var o in self.documents[fileName]['lines'][line_x]['html']['elements'][i]['attributes']) {
					self.documents[fileName]['lines'][line_x]['html']['elements'][i]['attributes'][o]['line'] += diff;
				}
			}
		}
	}
	var updateCacheDocumentLines = function (startLine, endLine) {

		let fileName = self.document().fileName;
		let cacheLines = self.documents[fileName]['lines'];
		let fileType = self.documentType();
		let lines = self.documentLines();
		let diff = lines.length - cacheLines.length;

		try {

			self.documents[fileName]['lines'] = [];

			var syntax = fileSyntax(); //starting syntax
			let changedLines = [];
			for (var line_x in lines) {
				line_x = parseInt(line_x);
				if (line_x < startLine) {
					//keep all lines until line change found
					self.documents[fileName]['lines'][line_x] = cacheLines[line_x]; //keep old line
				} else if (diff < 0) {
					if (line_x <= (endLine + diff)) {
						self.documents[fileName]['lines'][line_x] = getLineInfo(fileType, fileName, syntax, line_x, lines);
						changedLines.push(line_x);
					} else {
						//shift cache lines
						let line_x_diff = line_x - diff;
						self.documents[fileName]['lines'][line_x] = cacheLines[line_x_diff];
						shiftCacheLineValues(fileName, line_x);
					}
				} else if (diff == 0) {
					if (line_x >= startLine || line_x <= endLine) {
						self.documents[fileName]['lines'][line_x] = getLineInfo(fileType, fileName, syntax, line_x, lines, cacheLines[line_x]);
						changedLines.push(line_x);
					} else {
						self.documents[fileName]['lines'][line_x] = cacheLines[line_x];
					}
				} else if (diff > 0) {
					//LINES ADDED
					if (line_x <= endLine) {
						//new lines
						self.documents[fileName]['lines'][line_x] = getLineInfo(fileType, fileName, syntax, line_x, lines);
						changedLines.push(line_x);
					} else {
						//old lines
						let line_x_diff = line_x - diff;
						self.documents[fileName]['lines'][line_x] = cacheLines[line_x_diff];
						shiftCacheLineValues(fileName, line_x);
					}
				}
			}

			for (var i in changedLines) {
				let line_x = changedLines[i];
				try {
					cacheHtmlElements(fileName, line_x, self.documents[fileName]['lines']);
				} catch (e) {
					console.log(e);
				}
			}


		} catch (e) {
			console.log(e);
			return false;
		}

		//console.log(self.documents[fileName]['lines']);

		return true;
	}

	//get
	this.getDocumentLinesInfo = function () {
		var fileName = self.document().fileName;
		if (is_true(self.documentCacheEnabled) && self.documentIsValidType() && isset(self.documents[fileName]['lines']) == true) {
			return self.documents[fileName]['lines'];
		}
		cacheDocumentLines();
		return self.documents[fileName]['lines'];
	}
	this.getConfiguration = function () {
		if(isset(self.extensionName)){
			return vscode.workspace.getConfiguration(self.extensionName);
		}
		return null;
	}
	this.getConfigurationSetting = function (key, default_value) {
		var subKey = null;
		if (key.indexOf('.') > -1) {
			var list = key.split('.');
			subKey = list[0];
			key = list[1];
		}
		var config = self.getConfiguration();
		if(config===null){
			return (isset(default_value) ? default_value : null);
		}
		var value = null;
		if (subKey) {
			value = isset(config[subKey][key]) ? config[subKey][key] : null;
		} else {
			value = config[key];
		}
		return isset(value) ? value : (isset(default_value) ? default_value : null);
	}

	//set
	this.setValidDocTypes = function (types) {
		self.validDocTypes = types
	}
	this.setDocumentCacheEnabled = function () {
		self.documentCacheEnabled = true;
	}
	this.setExtensionName = function(name){
		self.extensionName = name;
	}

	//helpers
	this.documentIsValidType = function(){
		if (isset(self.validDocTypes) && in_array(self.documentType(), self.validDocTypes) == false) {
			return false;
		}
		return true;
	}

	//actions
	this.executeCommand = async function (command) {
		await vscode.commands.executeCommand(command);
	}
	this.registerCommand = function (command, callback) {
		context.subscriptions.push(vscode.commands.registerCommand(command, function () {
			cache = {}; //clear cache
			if (typeof callback == "function") {
				callback();
			}
		}));
	}
	this.registerMenuCommand = function (command, callback) {
		const disposable = vscode.commands.registerTextEditorCommand(command, callback);
		context.subscriptions.push(disposable);
	}
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

	//system events
	let textDocumentChangeQueue = [];
	this.documents = {};
	var documentOpen = function (document) {
		self.documents[document.fileName] = {
			lines: null,
			lineCount: self.document().lineCount
		};
		self.emit('documentOpen', document);
	}
	var documentFocus = function (document) {
		if (isset(self.documents[document.fileName]) == false) {
			documentOpen(document);
		}
		self.emit('documentFocus', document);
	}
	var textDocumentChange = function () {
		try {
			if (textDocumentChangeQueue.length > 0) {

				let queue = textDocumentChangeQueue.shift();
				let fileType = queue.fileType;
				let fileName = queue.fileName;
				let event = queue.event;
				let change = queue.change;
				let startLine = queue.startLine;
				let endLine = queue.endLine;
				let diff = queue.diff;

				if (is_true(self.documentCacheEnabled) && self.documentIsValidType()) {
					let success = updateCacheDocumentLines(startLine, endLine);
					if (!success) {
						//if it fails cache entire list again
						cacheDocumentLines();
						startLine = 0;
						endLine = self.documents[fileName]['lines'].length - 1; //inclusive;
						diff = startLine - endLine;
					}
					self.emit('documentTextChange', change, startLine, endLine, diff);
					textDocumentChange();
				} else {
					self.emit('documentTextChange', change, startLine, endLine, diff);
					textDocumentChange();
				}
			}
		} catch (e) {
			console.log(e);
		}

	}
	vscode.window.onDidChangeActiveTextEditor(function (textEditor) {
		if(self.documentIsValidType()==false){
			return;
		}
		let document = textEditor.document;
		if (document.uri.scheme === 'file') {
			documentFocus(textEditor.document);
		}
	});
	vscode.workspace.onDidCloseTextDocument(function (document) {
		if(self.documentIsValidType()==false){
			return;
		}
		if (document.uri.scheme == 'file') {
			if (isset(self.documents[document.fileName]) == true) {
				delete self.documents[document.fileName];
			}
			setTimeout(function () {
				self.emit('documentClose', document);
			})
		}
	});
	vscode.workspace.onDidChangeTextDocument(function (event) {

		if(self.documentIsValidType()==false){
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
					let lineCount = self.document().lineCount;
					let fileName = self.document().fileName;
					let diff = lineCount - self.documents[fileName]['lineCount'];

					if (diff > 0) {
						endLine = startLine + (event.contentChanges[i]['text'].match(/\r\n/g) || []).length; //calculate real endLine
					}

					let queue = {
						fileName: fileName,
						fileType: self.documentType(),
						event: event,
						change: event.contentChanges[i],
						startLine: startLine,
						endLine: endLine,
						diff: diff,
						newLineCount: lineCount,
						lastLineCount: self.documents[fileName]['lineCount']
					};

					//eliminate race conditions
					textDocumentChangeQueue.push(queue);
					self.documents[fileName]['lineCount'] = lineCount;
					if (textDocumentChangeQueue.length == 1) {
						textDocumentChange();
					}
				}

			}
		}
	});
}

module.exports = Application