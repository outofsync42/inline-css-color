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
				_cbs[tag] = {};
			}

			var index = length(_cbs[tag]);

			if (is_bool(runOnce) == false) {
				runOnce = false;
			}
			_cbs[tag][index] = {
				'enabled': true,
				'runOnce': runOnce,
				'callback': callback
			};
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

	var getLineInfo = function (fileType, fileName, syntax, line_x, lines) {



		line_x = parseInt(line_x);
		let text = lines[line_x]; //store original line

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

		var textFormatted = "";
		var match_length = 0;
		var in_comment_line = false;
		var in_quote_str = false;
		var in_reg_str = false;
		var in_reg_str_start = false;

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
				if (in_comment_line == false && char == "/" && next_char == "/") {
					in_comment_line = true;
					match_length = 2;
					cache.match_lock = "in_comment_line"; //resets on next line
				}
				if (in_comment_line == true) {
					if (match_length > 0) {
						match_length--;
					} else {
						continue;
					}
				}
			}

			//block comment
			if (cache.match_lock == "" || cache.match_lock == "in_comment_block" || cache.match_lock == "in_comment_block_end") {
				if (cache.match_lock == "" && line.indexOf('/*', char_x) == char_x) {
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
				//detecting regex is hard... this will likely need to be updated
				if (in_reg_str_start == false && char == "/" && (is_array(next_char.match(/[a-zA-Z0-9^+\[\\(<]/)) || (prev_char == " " && in_array(prev2_char, ['(', ',', '=', '[', ':']))) && prev_char != "*" && prev_char != "\\" && prev_char != "<") {
					match_length = 1;
					in_reg_str = true;
					cache.match_lock = in_reg_str ? "in_reg_str" : "";
					in_reg_str_start = true;
				} else if (in_reg_str_start && char == "/" && prev_char != "\\" && prev_char != "*") {
					in_reg_str = false;
					in_reg_str_start = false;
				}
				if (in_reg_str == true) {
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
				while (x < lines.length) {
					var next_line = lines[x];
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
		if (cacheDocumentLines) {
			lineData['cache'] = {};
			for (var i in cache) {
				lineData['cache'][i] = cache[i]; //store line state
			}
		}

		return lineData;

	}
	var elementVoids = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'path', 'source', 'track', 'wbr'];
	var cacheHtmlElements = function (fileName, line_x, lines) {

		if (lines[line_x]['syntax'] == "html") {

			let text = lines[line_x]['text'];

			self.documents[fileName]['lines'][line_x]['html'] = {
				'elements': {}
			}
			let lineHasElements = false;
			let isComment = false;
			let charX = 0;
			let elements = [];
			let openElementKeys = [];

			try {
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

					if (isComment == false) {
						let elementStartPos = 0;
						if (text[charX] == '<' && /[a-zA-Z]/.test(text[charX + 1])) {
							lineHasElements = true;
							var charXX = charX + 1;
							let elementTag = "";
							while (/[a-zA-Z0-9_.:-]/.test(text[charXX]) == true) {
								if(charXX >= text.length){
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
									if (lines[nextLine]['syntax'] !== 'html') {
										nextLine++;
										continue;
									}


									let lineText = lines[nextLine]['text'];
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
													value: '',
													valueStartPos: null,
													valueEndPos: null,
													line: nextLine
												}
												x = lineText.indexOf(/('|")/, x);
												if (x > -1) {
													let openQuote = lineText[x];
													x++;
													start = x;
													x = lineText.indexOf(openQuote, start);
													attrValue = trim(lineText.substring(start, x > -1 ? x : lineText.length));
													element['attributes'][attrName] = {
														value: attrValue,
														valueStartPos: start,
														valueEndPos: x > -1 ? x : lineText.length,
														line: nextLine
													};
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
		//console.log(self.documents[fileName]['lines']);
	}

	/**
	 * @param {vscode.TextDocumentChangeEvent} event 
	 */
	var updateCacheDocumentLines = function (event) {
		console.log('updateCacheDocumentLines');

		let start = event.contentChanges[0]['range']['start'];
		let end = event.contentChanges[0]['range']['end'];
		console.log(start);
		console.log(end);

		let fileName = self.document().fileName;
		let cacheLines = self.documents[fileName]['lines'];

		self.documents[fileName]['lines'] = [];

		let lines = self.documentLines();
		let diff = start.line - end.line;
		var syntax = fileSyntax(); //starting syntax

		console.log(diff);

		//getLineInfo(fileType, syntax, line_x, lines);
		for (var line_x in lines) {
			line_x = parseInt(line_x);
			if (line_x < start.line) {
				self.documents[fileName]['lines'][line_x] = cacheLines[line_x]; //keep old line
			} else {
				if (diff < 0) {
					//lines removed
					if (start.character === 0 && end.character == 0) {
						//full line removal
						//the start line needs to be recached
					} else {
						//highlight delete
						//remove lines only
					}



					//if (cacheLines[cache_line_x]['text'])
					//let matchText = cacheLines[line_x+(-diff)]['text'];
					//console.log(line_xx);
					// if(matchText != lines[line_xx]){
					// 	line_xx++;
					// }

					// while(lines[line_xx] != matchText){
					// 	line_xx++;
					// }

					//console.log(diff);
					break;
					//lines deleted
					// self.documents[fileName]['lines'][line_x]
				}
			}

		}



	}

	this.getDocumentLinesInfo = function () {
		var fileName = self.document().fileName;
		cacheDocumentLines();
		//console.log(self.documents[fileName]['lines']);
		return self.documents[fileName]['lines'];
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

	let updateCacheOnTextChange = false;
	this.updateCacheOnTextChange = function () {
		updateCacheOnTextChange = true;
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
	this.documents = {};
	var documentOpen = function (document) {
		self.documents[document.fileName] = {
			lines: null
		};
		self.emit('documentOpen', document);
	}
	var documentFocus = function (document) {
		if (isset(self.documents[document.fileName]) == false) {
			documentOpen(document);
		}
		self.emit('documentFocus', document);
	}

	vscode.window.onDidChangeActiveTextEditor(function (textEditor) {
		let document = textEditor.document;
		if (document.uri.scheme === 'file') {
			documentFocus(textEditor.document);
		}
	});
	vscode.workspace.onDidCloseTextDocument(function (document) {
		if (document.uri.scheme == 'file') {
			if (isset(self.documents[document.fileName]) == true) {
				delete self.documents[document.fileName];
			}
			setTimeout(function () {
				self.emit('documentClose', document);
			})
		}
	});
	vscode.workspace.onDidChangeTextDocument(function (e) {
		let document = e.document;
		if (document.uri.scheme == 'file') {
			if (e.contentChanges.length > 0) {
				for (var i in e.contentChanges) {
					if (updateCacheOnTextChange) {
						try {
							updateCacheDocumentLines(e);
						} catch (e) {
							console.log(e);
						}
					}
					self.emit('documentTextChange', e, e.contentChanges[i].range.start.line, e.contentChanges[i].range.end.line);
				}
			}
		}
	});
}

module.exports = Application