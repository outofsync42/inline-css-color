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

var Helpers = new function () {

	/**
	 * @param {vscode.TextDocument} document 
	 * @returns 
	 */
	this.documentFileType = function (document) {
		return str_replace('.', '', path.extname(document.fileName));
	}

}

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
	/**
	 * 
	 * @returns vscode.window.activeTextEditor
	 */
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

	//editor decorations
	let decorations = [];
	let lineDecorationCallback = [];
	this.editorCreateDecoration = function (key, decoration) {
		//requires caching
		self.setDocumentCacheEnabled();
		let decInfo = {
			key,
			decoration
		};
		decorations.push(decInfo);

		//apply to any already open documents
		for (var fileName in self.documents) {
			self.documents[fileName]['decorationKeys'].push(decInfo['key']);
			self.documents[fileName]['decorations'][decInfo['key']] = {
				decoration: vscode.window.createTextEditorDecorationType(decInfo['decoration']),
				ranges: {}
			}
		}

	}
	this.addDecorationLineRanges = function (callback) {
		//requires caching
		self.setDocumentCacheEnabled();
		lineDecorationCallback.push(callback);
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

	let validDocTypes = {};
	let documentCacheEnabled = false;
	let elementVoids = {
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
	var shiftCacheLineValues = function (fileName, line_x) {

		if (isset(self.documents[fileName]['lines'][line_x]) == false) {
			throw 'Invalid line number';
		}

		let diff = line_x - self.documents[fileName]['lines'][line_x]['line'];
		self.documents[fileName]['lines'][line_x]['line'] = line_x;
		if (isset(self.documents[fileName]['lines'][line_x]['html']) && isset(self.documents[fileName]['lines'][line_x]['html']['elements'])) {
			for (var i in self.documents[fileName]['lines'][line_x]['html']['elements']) {
				self.documents[fileName]['lines'][line_x]['html']['elements'][i]['startLine'] += diff;
				self.documents[fileName]['lines'][line_x]['html']['elements'][i]['endLine'] += diff;
				let attributes = self.documents[fileName]['lines'][line_x]['html']['elements'][i]['attributes'];
				for (var o in attributes) {
					let attr = attributes[o];
					for (var q in attr) {
						attr[q]['line'] += diff;
					}
				}
			}
		}
		if (self.documents[fileName]['decorationKeys'].length > 0) {
			if (diff !== 0) {
				let line_id = self.documents[fileName]['lines'][line_x]['id'];
				for (var type in self.documents[fileName]['decorations']) {
					if (isset(self.documents[fileName]['decorations'][type]['ranges'][line_id])) {
						for (var i in self.documents[fileName]['decorations'][type]['ranges'][line_id]) {
							self.documents[fileName]['decorations'][type]['ranges'][line_id][i]['_start']['_line'] += diff;
							self.documents[fileName]['decorations'][type]['ranges'][line_id][i]['_end']['_line'] += diff;
						}
					}
				}
			}
		}

	}
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
				if (cache.php_syntax != "html" || cache.html_open_tag == true) {
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
			}

			//single quote
			if (cache.match_lock == "" || cache.match_lock == "in_single_quote_str") {
				if (cache.php_syntax != "html" || cache.html_open_tag == true) {
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
			}

			//double quote
			if (cache.match_lock == "" || cache.match_lock == "in_double_quote_str") {
				if (cache.php_syntax != "html" || is_true(cache.html_open_tag) == true) {
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
			}

			//reg string

			if (cache.match_lock == "" || cache.match_lock == "in_reg_str") {
				if (cache.php_syntax != "html" || cache.html_open_tag == true) {
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
		lineData['id'] = isset(cacheLine) ? cacheLine['id'] : self.documents[fileName]['nextLineId']++;

		if (cacheDocumentLines) {
			lineData['cache'] = {};
			for (var i in cache) {
				lineData['cache'][i] = cache[i]; //store line state
			}
		}

		return lineData;

	}
	var cacheHtmlElements = function (fileName, line_x) {

		if (self.documents[fileName]['lines'][line_x]['syntax'] == "html") {

			//reset elements
			self.documents[fileName]['lines'][line_x]['html'] = {
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
					if (isset(self.documents[fileName]['lines'][line_x]) == false) {
						break;
					}
					let charX = 0;
					let text = self.documents[fileName]['lines'][line_x]['text'];

					//parse string
					while (charX < text.length) {

						//ignore comments
						if (text.indexOf('<!--', charX) == charX) {
							self.documents[fileName]['lines'][line_x]['lineType'] = 'comment';
							html_element_comment_open = true;
						} else if (html_element_comment_open == true) {
							if (text.indexOf('-->', charX) == charX) {
								html_element_comment_open = false;
								self.documents[fileName]['lines'][line_x]['lineType'] = '';
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
							let isVoidElement = isset(elementVoids[elementTag]);
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
							}

							if (text[charX] == attributeQuoteChar || (charX == text.length - 1)) {
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

				self.documents[fileName]['lines'][lineNumber]['html']['elements'] = elements;
				while (line_x != lineNumber) {
					if (isset(self.documents[fileName]['lines'][line_x]) == false) {
						break;
					}
					//link lines
					if (isset(self.documents[fileName]['lines'][line_x]['line_links']) == false) {
						self.documents[fileName]['lines'][line_x]['line_links'] = []
					}
					self.documents[fileName]['lines'][line_x]['line_links'].push(parseInt(lineNumber));
					line_x--;
				}
			} catch (e) {
				console.log(e);
				self.documents[fileName]['lines'][lineNumber]['html']['elements'] = {};
				self.documents[fileName]['lines'][lineNumber]['html']['elementsError'] = true;
			}

		}
	}
	var applyLineDecorations = function (fileName, line_x) {

		if (self.documents[fileName]['decorationKeys'].length == 0) {
			return;
		}

		let fileDecorations = self.documents[fileName]['decorations'];
		let line_id = self.documents[fileName]['lines'][line_x]['id'];

		let ranges = {}
		for (var type in fileDecorations) {
			fileDecorations[type]['ranges'][line_id] = [];
			ranges[type] = fileDecorations[type]['ranges'][line_id];
		}

		if (lineDecorationCallback.length > 0) {
			for (var i in lineDecorationCallback) {
				lineDecorationCallback[i](self.documents[fileName]['lines'], line_x, ranges);
			}
		}

		for (var type in fileDecorations) {
			if (fileDecorations[type]['ranges'][line_id].length == 0) {
				delete fileDecorations[type]['ranges'][line_id];
			}
		}

	}
	var setDecorations = function (fileName) {

		if (self.documents[fileName]['decorationKeys'].length == 0) {
			return;
		}
		let fileDecorations = self.documents[fileName]['decorations'];

		for (var type in fileDecorations) {
			let ranges = [];
			for (var line_id in fileDecorations[type]['ranges']) {
				if (isset(self.documents[fileName]['lineIds'][line_id]) == false) {
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

		self.documents[fileName]['lineIds'] = {};
		for (var line_x in lines) {
			try {
				self.documents[fileName]['lines'][line_x] = getLineInfo(fileType, fileName, syntax, line_x, lines);
				self.documents[fileName]['lineIds'][self.documents[fileName]['lines'][line_x]['id']] = true;
			} catch (e) {
				console.log(e)
			}
		}

		cache.elementStore = {}
		cache.lastOpenElementKey = null;
		//post process html elements
		//catalog elements in row and attributes
		for (var line_x in self.documents[fileName]['lines']) {
			try {
				if (fileType == 'html' || fileType == 'php') {
					cacheHtmlElements(fileName, line_x);
				}
				applyLineDecorations(fileName, line_x);
			} catch (e) {
				console.log(e);
			}
		}

		setDecorations(fileName);

		//console.log(self.documents[fileName]['lines']);
	}
	var updateCacheDocumentLines = function (startLine, endLine) {

		let fileName = self.document().fileName;
		let cacheLines = self.documents[fileName]['lines'];

		let fileType = self.documentType();
		let lines = self.documentLines();
		let diff = lines.length - cacheLines.length;

		var syntax = fileSyntax(fileType); //starting syntax

		var updateLinkedLines = function (line_x) {

			if (isset(cacheLines[line_x]) == false) {
				throw 'Invalid cache line number';
			}

			let changedLines = [];
			if (isset(cacheLines[line_x]['line_links'])) {
				for (var i in cacheLines[line_x]['line_links']) {
					let linkLineNum = cacheLines[line_x]['line_links'][i];
					changedLines.push(linkLineNum);
					self.documents[fileName]['lines'][linkLineNum] = getLineInfo(fileType, fileName, syntax, linkLineNum, lines, cacheLines[linkLineNum]);
				}
			}
			return changedLines;
		}

		let changedLines = [];
		try {

			if (diff == 0 && startLine == endLine) {
				//inline change
				changedLines = array_merge(changedLines, updateLinkedLines(startLine));
				self.documents[fileName]['lines'][startLine] = getLineInfo(fileType, fileName, syntax, startLine, lines, cacheLines[startLine]);
				changedLines.push(startLine);
			} else {

				self.documents[fileName]['lines'] = [];
				self.documents[fileName]['lineIds'] = {};
				
				for (var line_x in lines) {
					line_x = parseInt(line_x);

					if (line_x < startLine) {
						//keep all lines until line change found
						self.documents[fileName]['lines'][line_x] = cacheLines[line_x]; //keep old line
					} else if (diff < 0) {
						if (line_x <= (endLine + diff)) {
							changedLines = array_merge(changedLines, updateLinkedLines(line_x));
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
							changedLines = array_merge(changedLines, updateLinkedLines(line_x));
							self.documents[fileName]['lines'][line_x] = getLineInfo(fileType, fileName, syntax, line_x, lines, cacheLines[line_x]);
							changedLines.push(line_x);
						} else {
							self.documents[fileName]['lines'][line_x] = cacheLines[line_x];
						}
					} else if (diff > 0) {
						//LINES ADDED
						if (line_x <= endLine) {
							//new lines
							changedLines = array_merge(changedLines, updateLinkedLines(line_x));
							self.documents[fileName]['lines'][line_x] = getLineInfo(fileType, fileName, syntax, line_x, lines);
							changedLines.push(line_x);
						} else {
							//old lines
							let line_x_diff = line_x - diff;
							self.documents[fileName]['lines'][line_x] = cacheLines[line_x_diff];
							shiftCacheLineValues(fileName, line_x);
						}
					}

					self.documents[fileName]['lineIds'][self.documents[fileName]['lines'][line_x]['id']] = true;
				}

			}
			try {
				for (var i in changedLines) {
					let line_x = changedLines[i];
					cacheHtmlElements(fileName, line_x);
					applyLineDecorations(fileName, line_x);
				}
				setDecorations(fileName);
			} catch (e) {
				console.log(e);
			}

		} catch (e) {
			console.log(e);
			return false;
		}

		return {
			startLine: changedLines.length > 0 ? array_min(changedLines) : startLine,
			endLine: changedLines.length > 0 ? array_max(changedLines) : endLine
		};
	}

	//get
	this.getDocumentLinesInfo = function () {
		let document = self.document();
		var fileName = document.fileName;
		if (documentCacheEnabled == true && self.documentIsValidType(document) && isset(self.documents[fileName]['lines']) == true) {
			return self.documents[fileName]['lines'];
		}
		cacheDocumentLines();
		return self.documents[fileName]['lines'];
	}

	//set
	this.setValidDocTypes = function (types) {
		for (var i in types) {
			validDocTypes[types[i]] = true;
			validDocTypes['.' + types[i]] = true;
		}
	}
	this.setDocumentCacheEnabled = function () {
		documentCacheEnabled = true;
	}

	//helpers
	this.documentIsValidType = function (document) {
		document = typeof document != 'undefined' ? document : self.document();
		let type = path.extname(document.fileName);
		if (isset(validDocTypes[type]) == false) {
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
	/**
	 * 
	 * @param {vscode.TextDocument} document 
	 * @returns 
	 */
	var documentOpen = function (document) {
		if (self.documentIsValidType(document) == false) {
			return;
		}
		self.documents[document.fileName] = {
			lines: null,
			lineCount: self.document().lineCount,
			nextLineId: 0,
			lineIds: {},
			decorations: {},
			decorationKeys: []
		};


		if (decorations.length > 0) {
			for (var i in decorations) {
				self.documents[document.fileName]['decorationKeys'].push(decorations[i]['key']);
				self.documents[document.fileName]['decorations'][decorations[i]['key']] = {
					decoration: vscode.window.createTextEditorDecorationType(decorations[i]['decoration']),
					ranges: {}
				}
			}
		}

		if (documentCacheEnabled == true) {
			cacheDocumentLines();
		}

		self.emit('documentOpen', document);
	}
	/**
	 * 
	 * @param {vscode.TextDocument} document 
	 * @returns 
	 */
	var documentFocus = function (document) {
		if (self.documentIsValidType(document) == false) {
			return;
		}
		if (isset(self.documents[document.fileName]) == false) {
			documentOpen(document);
		} else {

			setDecorations(document.fileName)
		}
		self.emit('documentFocus', document);
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
			if (isset(self.documents[document.fileName]) == true) {
				delete self.documents[document.fileName];
			}
			setTimeout(function () {
				self.emit('documentClose', document);
			})
		}
	});

	var textDocumentChange = function () {
		try {
			if (textDocumentChangeQueue.length > 0) {

				let event = textDocumentChangeQueue.shift();
				let fileName = event.fileName;
				let startLine = event.startLine;
				let endLine = event.endLine;
				let diff = event.diff;

				//optimize: group text change events
				while (true) {
					if (textDocumentChangeQueue.length > 0 && textDocumentChangeQueue[0].fileName == fileName) {
						event = textDocumentChangeQueue.shift();
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

				// console.log('-------');
				// console.log(queue);
				// console.log(startLine);
				// console.log(endLine);
				// console.log(diff);
				if (documentCacheEnabled == true) {
					let success = updateCacheDocumentLines(startLine, endLine);
					if (!success) {
						//if it fails cache entire list again
						cacheDocumentLines();
						startLine = 0;
						endLine = self.documents[fileName]['lines'].length - 1; //inclusive;
						diff = startLine - endLine;
						event.startLine = startLine;
						event.endLine = endLine;
						event.diff = diff;
					}
					self.emit('documentTextChange', event);
					textDocumentChange();
				} else {
					self.emit('documentTextChange', event);
					textDocumentChange();
				}
			}
		} catch (e) {
			console.log(e);
		}

	}
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
					let fileName = event.document.fileName;
					let diff = lineCount - self.documents[fileName]['lineCount'];

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

					let queue = {
						document: event.document,
						fileName: fileName,
						startLine: startLine,
						endLine: endLine,
						diff: diff,
						text: event.contentChanges[i]['text']
					};

					self.documents[fileName]['lineCount'] = lineCount;

					//eliminate race conditions
					textDocumentChangeQueue.push(queue);
					if (textDocumentChangeQueue.length == 1) {
						if (isset(self.isRunning) == false) {
							self.isRunning = true;
							textDocumentChange();
						}
						let lastLength = textDocumentChangeQueue.length;
						let lastLengthInterval = setInterval(function () {
							if (lastLength != textDocumentChangeQueue.length) {
								lastLength = textDocumentChangeQueue.length;
							} else {
								clearInterval(lastLengthInterval);
								textDocumentChange();
							}
						}, 15);
					}
				}
				setTimeout(function () {
					self.isRunning = null;
				}, 100)

			}
		}
	});

}

module.exports = {
	Application,
	Helpers,
	ConfigSettings
}