const vscode = require('vscode');

//include Application/Document which optimizes event handling and exposes wrapper functions for ease of use in vscode
const custom = require('./lib/custom.js');
const { log } = require('console');

//custom objects
const app = new custom.application();

//extension object
var Extension = function () {

	//build decoration colors and range arrays to be associated
	let _decorations = {}
	_decorations['propertyName'] = { decoration: vscode.window.createTextEditorDecorationType({ color: new vscode.ThemeColor('inline.css.propertyName') }), ranges: [] }
	_decorations['punctuation'] = { decoration: vscode.window.createTextEditorDecorationType({ color: new vscode.ThemeColor('inline.css.punctuation') }), ranges: [] }
	_decorations['valueNumeric'] = { decoration: vscode.window.createTextEditorDecorationType({ color: new vscode.ThemeColor('inline.css.valueNumeric') }), ranges: {} }
	_decorations['valueNumericUnit'] = { decoration: vscode.window.createTextEditorDecorationType({ color: new vscode.ThemeColor('inline.css.valueNumericUnit') }), ranges: [] }
	_decorations['valueConstant'] = { decoration: vscode.window.createTextEditorDecorationType({ color: new vscode.ThemeColor('inline.css.valueConstant') }), ranges: [] }
	_decorations['supportFunction'] = { decoration: vscode.window.createTextEditorDecorationType({ color: new vscode.ThemeColor('inline.css.supportFunction') }), ranges: [] }
	_decorations['keywordImportant'] = { decoration: vscode.window.createTextEditorDecorationType({ color: new vscode.ThemeColor('inline.css.keywordImportant') }), ranges: [] }
	_decorations['string'] = { decoration: vscode.window.createTextEditorDecorationType({ color: new vscode.ThemeColor('inline.css.string') }), ranges: [] }

	//build config object for getting settings
	let config = new app.configuration('inline-css-color');

	/**
	 * @param {vscode.TextDocument} document 
	 */
	this.applyDecorations = function (document) {

		//get document lines array
		let lines = app.document.lines(document);

		//find all ranges for style attributes
		let styleRangeList = [];

		if (app.editorDocumentFileType() == 'svelte') {
			styleRangeList = findSvelteStyleRanges(lines);
		} else {
			//default html php
			styleRangeList = findStyleRanges(lines);
		}

		//if no ranges found return
		if (styleRangeList.length == 0) {
			return;
		}

		//clear all previously sent ranges
		for (let type in _decorations) {
			_decorations[type]['ranges'] = [];
		}

		//support for svelte added in V2
		setDecorationsV2(styleRangeList, lines);

		//for each decoration type apply ranges found
		for (let type in _decorations) {
			vscode.window.activeTextEditor.setDecorations(_decorations[type]['decoration'], _decorations[type]['ranges']);
		}
	}

	function setDecorationsV2(results, lines) {

		//find all properties in style ranges and add decoration

		let rangeType = 'propertyName'; // isPropertyName is default true as the first thing you should find is a property name


		let data = {
			propertyName: {
				pos: null,
				line: null
			},
			valueConstant: {
				pos: null,
				line: null
			},
			supportFunction: {
				pos: null,
				line: null
			},
			valueNumeric: {
				pos: null,
				line: null
			},
			valueNumeric: {
				pos: null,
				line: null
			},
			valueNumericUnit: {
				pos: null,
				line: null
			},
			string: {
				pos: null,
				line: null,
				quote: null
			},
			punctuation: {
				pos: null,
				line: null
			}
		}

		let isSvelteDocument = app.editorDocumentFileType() == 'svelte';
		let svelteLastType = null;
		let svelteRangeZone = null;

		results.forEach(function (row) {

			let lineNumber = row['line'];
			let text = lines[row['line']];
			let x = row['styleStart'];
			let end = row['styleEnd'];
			let styleBlockEnd = row['styleBlockEnd'];

			while (x <= end) {

				let isEnd = styleBlockEnd && x == end;

				//############################################
				//check for end conditions

				if (rangeType == 'propertyName' && data.propertyName.pos !== null && (text.indexOf(/[a-zA-Z-]/, x) !== x || isEnd)) {
					_decorations['propertyName']['ranges'].push(new vscode.Range(data.propertyName.line, data.propertyName.pos, lineNumber, x));
					data.propertyName.pos = null;
					data.propertyName.line = null;
					rangeType = 'valueRange';
				} else if (rangeType == 'valueConstant' && (text.indexOf(/[!a-zA-Z_-]/, x) !== x || isEnd)) {
					if (text[x] == "(") {
						_decorations['supportFunction']['ranges'].push(new vscode.Range(data.valueConstant.line, data.valueConstant.pos, lineNumber, x));
					} else {
						//for now this catches !important.
						if(text.substring(data.valueConstant.pos,x)=='!important'){
							_decorations['keywordImportant']['ranges'].push(new vscode.Range(data.valueConstant.line, data.valueConstant.pos, lineNumber, x));
						} else {
							_decorations['valueConstant']['ranges'].push(new vscode.Range(data.valueConstant.line, data.valueConstant.pos, lineNumber, x));
						}
					}
					data.valueConstant.pos = null;
					data.valueConstant.line = null;
					rangeType = 'valueRange';
				} else if (rangeType == 'valueNumeric' && (text.indexOf(/[0-9.]/, x) !== x || isEnd)) {
					_decorations['valueNumeric']['ranges'].push(new vscode.Range(data.valueNumeric.line, data.valueNumeric.pos, lineNumber, x));
					data.valueNumeric.pos = null;
					data.valueNumeric.line = null;
					rangeType = 'valueNumericEnd'; //special status to cause start condition check for value numeric
				} else if (rangeType == 'valueNumericUnitPct') {
					//special.. always causes an end condition
					_decorations['valueNumericUnit']['ranges'].push(new vscode.Range(data.valueNumericUnit.line, data.valueNumericUnit.pos, lineNumber, x));
					data.valueNumericUnit.pos = null;
					data.valueNumericUnit.line = null;
					rangeType = 'valueRange';
				} else if (rangeType == 'valueNumericUnit' && (text.indexOf(/[a-zA-Z]/, x) !== x || isEnd)) {
					_decorations['valueNumericUnit']['ranges'].push(new vscode.Range(data.valueNumericUnit.line, data.valueNumericUnit.pos, lineNumber, x));
					data.valueNumericUnit.pos = null;
					data.valueNumericUnit.line = null;
					rangeType = 'valueRange';
				} else if (rangeType == 'string' && (text[x] == data.string.quote && text[x - 1] != '\\' || isEnd)) {
					_decorations['string']['ranges'].push(new vscode.Range(data.string.line, data.string.pos, lineNumber, x + 1));
					data.string.pos = null;
					data.string.line = null;
					data.string.quote = null;
					rangeType = 'valueRange';
					x++;
				} else if (isSvelteDocument) {

					let isSvelteEnd = false;

					//check for end of svelte range
					if (svelteRangeZone != null && text[x] == "}") {
						isSvelteEnd = true;
					}

					//if svelte range is ended
					if (isSvelteEnd) {
						x++;
						svelteRangeZone = null;
						rangeType = svelteLastType;
						continue;
					}
				}

				//############################################
				//check for start conditions
				if (rangeType == 'propertyName' && data.propertyName.pos == null && text.indexOf(/[a-zA-Z-]/, x) == x) {
					data.propertyName.pos = x;
					data.propertyName.line = lineNumber;
				} else if (rangeType == 'valueRange' && data.valueConstant.pos == null && text.indexOf(/[!a-zA-Z_]/, x) == x) {
					//for now this catches !important
					rangeType = 'valueConstant'
					data.valueConstant.pos = x;
					data.valueConstant.line = lineNumber;
				} else if (rangeType == 'valueRange' && data.valueNumeric.pos == null && text.indexOf(/[0-9#.]/, x) == x) {
					rangeType = 'valueNumeric'
					data.valueNumeric.pos = x;
					data.valueNumeric.line = lineNumber;
				} else if (rangeType == 'valueRange' && text[x] == '-') {
					//special case. could either start constant or numeric
					if (typeof text[x + 1] !== 'undefined' && text.indexOf(/[0-9.]/, x + 1) == x + 1) {
						rangeType = 'valueNumeric'
						data.valueNumeric.pos = x;
						data.valueNumeric.line = lineNumber;
					} else {
						rangeType = 'valueConstant'
						data.valueConstant.pos = x;
						data.valueConstant.line = lineNumber;
					}
				} else if (rangeType == 'valueNumericEnd' && data.valueNumericUnit.pos == null) {
					if (text[x] == "%") {
						rangeType = 'valueNumericUnitPct' //special type. ends after 1 char
						data.valueNumericUnit.pos = x;
						data.valueNumericUnit.line = lineNumber;
					} else if (text.indexOf(/[a-zA-Z]/, x) == x) {
						rangeType = 'valueNumericUnit'
						data.valueNumericUnit.pos = x;
						data.valueNumericUnit.line = lineNumber;
					} else {
						rangeType = 'valueRange';
					}
				} else if (rangeType == 'valueRange' && (text[x] == "'" || text[x] == '"' || text[x] == '`') && isEnd == false) {
					rangeType = 'string'
					data.string.pos = x;
					data.string.line = lineNumber;
					data.string.quote = text[x];
				} else if (isSvelteDocument) {
					// svelte handles its own coloring so i dot have to do anything
					// later may add code to check value side strings and colorize but for now ill leave it alone
				}

				//############################################
				//check punctuation (last)
				if (rangeType == 'valueRange' && text[x] == ";") {
					_decorations['punctuation']['ranges'].push(new vscode.Range(lineNumber, x, lineNumber, x + 1));
					rangeType = 'propertyName'; //always starts a new property name
				} else if (rangeType == 'valueRange' && text.indexOf(/[\(),=:]/, x) == x) {
					_decorations['punctuation']['ranges'].push(new vscode.Range(lineNumber, x, lineNumber, x + 1));
				} else if (isSvelteDocument) {

					//check if starting svelte range
					if (rangeType != 'string' && text[x] == "{") {

						//close last type 
						if (typeof data[rangeType] != 'undefined' && data[rangeType].pos !== null) {
							_decorations[rangeType]['ranges'].push(new vscode.Range(data[rangeType].line, data[rangeType].pos, lineNumber, x));
							data[rangeType].pos = null;
							data[rangeType].line = null;
							svelteLastTypeIsOpen = true;
							break;
						}

						//store last type so it may be restored when svelte range ends
						svelteLastType = rangeType;
						//set to default range so var checking can begin
						rangeType = 'svelteRange';
						//set to condition zone
						svelteRangeZone = 'condition'; //unused but may expand later
					}

					if (svelteRangeZone == 'condition' && text[x] == "?") {
						//set to default range so var checking can begin
						rangeType = "svelteRange";
						//switch to value zone
						svelteRangeZone = 'value'; //unused but may expand later
					} 
				}

				x++;
			}

			if (styleBlockEnd) {
				rangeType = 'propertyName'
			}

		})

	}
	function setDecorations(results, lines) {
		//find all properties in style ranges and add decoration
		results.forEach(function (row) {

			let line = row['line'];
			let text = lines[row['line']];
			let x = row['styleStart'];
			let end = row['styleEnd'];
			let propertyNameStart = true;
			let numericStart = null;
			let numericUnitStart = null;
			let constStart = null;
			let stringStart = null;
			let keyWordStart = null;
			let keyWordImportantStart = null;
			let inMatch = false;
			while (x <= end) {

				let valueEnd = false;
				let supportFunction = false;
				let propertyName = false;
				if (text.indexOf(/:| :|  :/, x) == x) {
					if (constStart !== null) {
						_decorations['propertyName']['ranges'].push(new vscode.Range(line, constStart, line, x));
						inMatch = false;
						constStart = null;
						propertyNameStart = false;
					}
					_decorations['punctuation']['ranges'].push(new vscode.Range(line, x, line, x + 1));
				} else if (text.indexOf(/[),=]/, x) == x) {
					_decorations['punctuation']['ranges'].push(new vscode.Range(line, x, line, x + 1));
					valueEnd = true;
				} else if (text.indexOf(/[\(]/, x) == x) {
					_decorations['punctuation']['ranges'].push(new vscode.Range(line, x, line, x + 1));
					valueEnd = true;
					supportFunction = true;
				} else if (text.indexOf(/[;]/, x) == x) {
					_decorations['punctuation']['ranges'].push(new vscode.Range(line, x, line, x + 1));
					valueEnd = true;
					propertyNameStart = true;
				} else if (text.indexOf(/[ ]/, x) == x) {
					valueEnd = true;
					if (propertyNameStart) {
						propertyName = true;
					}
				} else if (x == end) {
					valueEnd = true;
					if (propertyNameStart) {
						propertyName = true;
					}
				} else if (inMatch == false && text.indexOf(/['"]/, x) == x) {
					if (stringStart === null) {
						stringStart = x;
						inMatch = true;
					}
				} else if (inMatch == false && text.indexOf(/[0-9#]/, x) == x) {
					if (numericStart === null) {
						numericStart = x;
						inMatch = true;
					}
				} else if (inMatch == false && text.indexOf(/[a-zA-Z]/, x) == x) {
					if (constStart === null) {
						constStart = x;
						inMatch = true
					}
				} else if (inMatch == false && text.indexOf(/!/, x) == x) {
					if (keyWordStart === null) {
						keyWordStart = x;
						inMatch = true
					}
				} else if (inMatch == false && text.indexOf(/[-]/, x) == x && text.indexOf(/[0-9]/, x + 1) == x + 1) {
					if (numericStart === null) {
						numericStart = x;
						inMatch = true;
					}
				} else if (inMatch == false && text.indexOf(/[-]/, x) == x && text.indexOf(/[a-zA-Z]/, x + 1) == x + 1) {
					if (constStart === null) {
						constStart = x;
						inMatch = true;
					}
				}

				if (numericStart !== null && text.indexOf(/[^0-9\(),=; ]/, x) == x) {
					_decorations['valueNumeric']['ranges'].push(new vscode.Range(line, numericStart, line, x));
					numericStart = null;
					numericUnitStart = x;
				}

				if (valueEnd) {
					inMatch = false;
					if (keyWordStart) {
						if (text.substring(keyWordStart, x) == "!important") {
							_decorations['keywordImportant']['ranges'].push(new vscode.Range(line, keyWordStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
						} else {
							_decorations['valueConstant']['ranges'].push(new vscode.Range(line, keyWordStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
						}
						keyWordStart = null;
					}
					if (stringStart) {
						_decorations['string']['ranges'].push(new vscode.Range(line, stringStart, line, x));
						stringStart = null;
					}
					if (numericStart !== null) {
						_decorations['valueNumeric']['ranges'].push(new vscode.Range(line, numericStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
						numericStart = null;
					}
					if (numericUnitStart !== null) {
						_decorations['valueNumericUnit']['ranges'].push(new vscode.Range(line, numericUnitStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
						numericUnitStart = null;
					}
					if (keyWordImportantStart !== null) {
						_decorations['keywordImportant']['ranges'].push(new vscode.Range(line, keyWordImportantStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
						keyWordImportantStart = null;
					}
					if (constStart !== null) {
						if (supportFunction) {
							supportFunction = false;
							_decorations['supportFunction']['ranges'].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
						} else if (propertyName) {
							_decorations['propertyName']['ranges'].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
						} else {
							_decorations['valueConstant']['ranges'].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
						}
						constStart = null;
					}
				}

				x++;
			}
		})
	}
	function findSvelteStyleRanges(lines) {

		let result = [];
		let inStyleQuote = false;
		let inStyleBrace = false;
		let insideComment = false;
		let insideScript = false;
		const htmlCommentEnabled = config.get('enableHtmlCommentStyle', false);

		function addStyleRangeToResult(lineText, htmlStart, htmlEnd, lineIndex) {
			//get the position of style attribute. can be 0 if still inside style (eigth broken up by php on same line or if on multiple lines)
			//inStyleQuote if set means we are still in the style tag from previous find
			let styleStart = inStyleQuote !== false ? htmlStart : findStyleAttribute(lineText, htmlStart, htmlEnd);

			//while inside style tag
			while (styleStart > -1) {

				//get the quote type
				let styleQuote = inStyleQuote !== false ? inStyleQuote : lineText[styleStart - 1];

				let styleOpenBrace = inStyleBrace ? htmlStart : lineText.indexOf('{', styleStart);
				let endOfLineStart = styleStart;

				//we have to do this becuase based on the example single quotes can both be used as the opening quote and inside brackets as delimiters with no escape chars
				while (styleOpenBrace > -1) {
					inStyleBrace = true;
					//look for closing brace on same line. if there is no closing brace, then set flag to wait for closing brace before you can detect end of style
					let styleCloseBrace = lineText.indexOf('}', styleOpenBrace);
					if (styleCloseBrace == -1) {
						//no closing brace found. line is open
						break;
					} else {
						endOfLineStart = styleCloseBrace
						inStyleBrace = false;
						styleOpenBrace = lineText.indexOf('{', styleCloseBrace);
					}
					//if there is more than one open and close set on the same line we need to parse them all before we check for end
				}

				let styleEnd = -1;
				if (inStyleBrace == false) {
					//look for end of style
					styleEnd = lineText.indexOf(styleQuote, endOfLineStart);
					while (styleEnd > -1 && lineText[styleEnd - 1] == '\\') {
						styleEnd = lineText.indexOf(styleQuote, styleEnd + 1);
					}
					if (styleEnd > htmlEnd) {
						styleEnd = -1;
					}
				}

				if (styleEnd > -1) {
					//end of style found
					inStyleQuote = false;
				} else {
					//style is broken up
					inStyleQuote = styleQuote;
				}

				//store current range for style
				result.push({
					line: lineIndex,
					styleStart: styleStart,
					styleEnd: styleEnd > -1 ? styleEnd : htmlEnd,
					inStyleBrace: inStyleBrace,
					//start: htmlStart,
					//end: htmlEnd,
					//style: lineText.slice(styleStart, styleEnd > -1 ? styleEnd : htmlEnd),
					//_styleEnd: styleEnd,
					//_inStyleQuote: inStyleQuote,
					//html: line.slice(htmlStart, htmlEnd)
				});

				//check if any more style tags exist on same line
				styleStart = findStyleAttribute(lineText, (styleEnd > -1 ? styleEnd : htmlEnd), htmlEnd);
			}
		}

		lines.forEach(function (lineText, lineIndex) {

			let offset = 0;

			while (offset < lineText.length - 1) {

				//look for php open tag
				let openScriptPos = insideScript ? 0 : findScriptOpen(lineText, offset);

				if (openScriptPos > -1) {
					insideScript = true;
				}

				//look for comment open tag
				let openCommentPos = insideComment ? 0 : findCommentOpen(lineText, offset);

				//disable finding comment open tags
				if (htmlCommentEnabled == true) {
					openCommentPos = -1;
				}
				if (openCommentPos > -1) {
					insideComment = true;
				}

				//if found php or comment open tag
				if (insideScript || insideComment) {

					//check which came first
					if (insideScript && insideComment) {
						if (openCommentPos < openScriptPos) {
							insideScript = false;
						} else {
							insideComment = false;
						}
					}

					//if found script open tag first or still inside script
					if (insideScript) {

						//capture any html that comes before script open
						if (offset != openScriptPos) {
							addStyleRangeToResult(lineText, offset, openScriptPos, lineIndex)
						}

						//look for php close tag
						let closeScriptPos = findScriptClose(lineText, openScriptPos);

						if (closeScriptPos != -1) {
							//end of PHP
							insideScript = false;
							offset = closeScriptPos;
						} else {
							//end of line.. still insidePHP
							offset = lineText.length - 1
						}
					}

					//if found comment open tag first or still inside comment
					if (insideComment) {

						//capture any html that comes before comment open
						if (offset != openCommentPos) {
							//found HTML code
							addStyleRangeToResult(lineText, offset, openCommentPos, lineIndex)
						}

						//look for comment close tag
						let closeCommentPos = findCommentClose(lineText, openCommentPos);
						if (closeCommentPos != -1) {
							//end of Comment
							insideComment = false;
							offset = closeCommentPos;
						} else {
							//end of line.. still insideComment
							offset = lineText.length - 1
						}
					}

					continue;

				} else {

					addStyleRangeToResult(lineText, offset, lineText.length, lineIndex)
					offset = lineText.length
				}
			}
		})

		return result;
	}
	function findStyleRanges(lines) {

		let result = [];
		let insidePHP = false;
		let insideComment = false;
		let inStyleQuote = false;
		let insideScript = false;

		//get style control settings
		const phpEnabled = config.get('enablePhpStyle', false);
		const htmlCommentEnabled = config.get('enableHtmlCommentStyle', false);

		function addStyleRangeToResult(lineText, htmlStart, htmlEnd, lineIndex) {

			//get the position of style attribute. can be 0 if still inside style (eigth broken up by php on same line or if on multiple lines)
			//inStyleQuote if set means we are still in the style tag from previous find
			let styleStart = inStyleQuote !== false ? htmlStart : findStyleAttribute(lineText, htmlStart, htmlEnd);

			//while inside style tag
			while (styleStart > -1) {

				//get the quote type
				let styleQuote = inStyleQuote !== false ? inStyleQuote : lineText[styleStart - 1];

				//look for end of style
				let styleEnd = lineText.indexOf(styleQuote, styleStart);

				while (styleEnd > -1 && lineText[styleEnd - 1] == '\\') {
					styleEnd = lineText.indexOf(styleQuote, styleEnd + 1);
				}

				if (styleEnd > htmlEnd) {
					styleEnd = -1;
				}

				if (styleEnd > -1) {
					//end of style found
					inStyleQuote = false;
				} else {
					//style is broken up
					inStyleQuote = styleQuote;
				}

				//store current range for style
				result.push({
					line: lineIndex,
					styleStart: styleStart,
					styleEnd: styleEnd > -1 ? styleEnd : htmlEnd,
					styleBlockEnd: !inStyleQuote,
					//start: htmlStart,
					//end: htmlEnd,
					//style: lineText.slice(styleStart, styleEnd > -1 ? styleEnd : htmlEnd),
					//_styleEnd: styleEnd,
					//_inStyleQuote: inStyleQuote,
					//html: line.slice(htmlStart, htmlEnd)
				});

				//check if any more style tags exist on same line
				styleStart = findStyleAttribute(lineText, (styleEnd > -1 ? styleEnd : htmlEnd), htmlEnd);

			}
		}

		lines.forEach(function (lineText, lineIndex) {

			let offset = 0;

			while (offset < lineText.length - 1) {

				//look for php open tag
				let openPHPPos = insidePHP ? 0 : findPHPOpen(lineText, offset);

				//disable finding php open tags
				if (phpEnabled == true) {
					openPHPPos = -1;
				}

				if (openPHPPos > -1) {
					insidePHP = true;
				}

				//look for comment open tag
				let openCommentPos = insideComment ? 0 : findCommentOpen(lineText, offset);

				//disable finding comment open tags
				if (htmlCommentEnabled == true) {
					openCommentPos = -1;
				}
				if (openCommentPos > -1) {
					insideComment = true;
				}

				//look for php open tag
				let openScriptPos = insideScript ? 0 : findScriptOpen(lineText, offset);

				if (openScriptPos > -1) {
					insideScript = true;
				}

				//if found php or comment open tag
				if (insidePHP || insideComment || insideScript) {

					//check which came first
					if (insidePHP && insideComment) {
						if (openCommentPos < openPHPPos) {
							insidePHP = false;
						} else {
							insideComment = false;
						}
					}

					if (insidePHP && insideScript) {
						if (openScriptPos < openPHPPos) {
							insidePHP = false;
						} else {
							insideScript = false;
						}
					}

					if (insideComment && insideScript) {
						if (openScriptPos < openCommentPos) {
							insideComment = false;
						} else {
							insideScript = false;
						}
					}



					//if found php open tag first or still inside php
					if (insidePHP) {

						//capture any html that comes before php open
						if (offset != openPHPPos) {
							//found HTML code
							addStyleRangeToResult(lineText, offset, openPHPPos, lineIndex)
						}

						//look for php close tag
						let closePHPPos = findPHPClose(lineText, openPHPPos);
						if (closePHPPos != -1) {
							//end of PHP
							insidePHP = false;
							offset = closePHPPos;
						} else {
							//end of line.. still insidePHP
							offset = lineText.length - 1
						}
					}

					//if found comment open tag first or still inside comment
					if (insideComment) {

						//capture any html that comes before comment open
						if (offset != openCommentPos) {
							//found HTML code
							addStyleRangeToResult(lineText, offset, openCommentPos, lineIndex)
						}

						//look for comment close tag
						let closeCommentPos = findCommentClose(lineText, openCommentPos);
						if (closeCommentPos != -1) {
							//end of Comment
							insideComment = false;
							offset = closeCommentPos;
						} else {
							//end of line.. still insideComment
							offset = lineText.length - 1
						}
					}

					//if found script open tag first or still inside script
					if (insideScript) {

						//capture any html that comes before script open
						if (offset != openScriptPos) {
							//found HTML code
							addStyleRangeToResult(lineText, offset, openScriptPos, lineIndex)
						}

						//look for script close tag
						let closeScriptPos = findScriptClose(lineText, openScriptPos);
						if (closeScriptPos != -1) {
							//end of script
							insideScript = false;
							offset = closeScriptPos;
						} else {
							//end of line.. still insideScript
							offset = lineText.length - 1
						}
					}

					continue;
				} else {
					//every thing else is valid html
					addStyleRangeToResult(lineText, offset, lineText.length, lineIndex)
					offset = lineText.length
				}

			}

		});

		return result;
	}
	function findStyleAttribute(text, startIndex = 0, endIndex = text.length) {
		//find any valid variation of style tag in line
		const match = text.slice(startIndex, endIndex).match(/['"\s]style\s*=\s*['"]/);
		if (match) {
			//return the position of the first character in the style tag
			return startIndex + match.index + match[0].length;
		}

		//return not found
		return -1;
	}
	function findCommentOpen(text, startIndex = 0) {
		//return the first position of the open tag if found
		return text.indexOf("<!--", startIndex);
	}
	function findCommentClose(text, startIndex = 0) {
		//find close comment tag
		let match = text.indexOf("-->", startIndex);
		if (match != -1) {
			//return the last position of the close tag
			match += 3;
		}
		return match;
	}
	function findScriptOpen(text, startIndex = 0) {
		return text.indexOf("<script", startIndex);
	}
	function findScriptClose(text, startIndex = 0) {
		return text.indexOf("</script", startIndex);
	}
	function findPHPOpen(text, startIndex = 0) {
		//return the first position of the open tag if found
		return text.indexOf("<?", startIndex);
	}
	function findPHPClose(text, startIndex = 0) {
		let match = text.indexOf("?>", startIndex);
		if (match != -1) {
			//return the last position of the close tag
			match += 2;
		}
		return match;
	}

}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	//init extension
	let ext = new Extension();

	//init application
	app.setContext(context);

	//set file types that should trigger events
	app.setValidDocTypes(['html', 'php', 'svelte']);

	//check when tab is focused and reapply decorations.
	app.onDocumentFocus(function (document) {
		try {
			ext.applyDecorations(document);
		} catch (ex) {
			console.log(ex);
		}
	})

	//when ever text is changed reapply decorations.
	app.onDocumentTextChange(function (event) {
		try {
			ext.applyDecorations(event.document)
		} catch (ex) {
			console.log(ex);
		}
	})

	//activate application.
	app.activate();
}

































// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

