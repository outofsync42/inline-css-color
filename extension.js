const vscode = require('vscode');

//include Application/Document which optimizes event handling and exposes wrapper functions for ease of use in vscode
const custom = require('./lib/custom.js');

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
		let results = findStyleRanges(lines);

		//if no ranges found return
		if (results.length == 0) {
			return;
		}

		//clear all previously sent ranges
		for (let type in _decorations) {
			_decorations[type]['ranges'] = [];
		}

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

		//for each decoration type apply ranges found
		for (let type in _decorations) {
			vscode.window.activeTextEditor.setDecorations(_decorations[type]['decoration'], _decorations[type]['ranges']);
		}
	}

	function findStyleRanges(lines) {

		let result = [];
		let insidePHP = false;
		let insideComment = false;
		let inStyleQuote = false;

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
					//start: htmlStart,
					//end: htmlEnd,
					//style: line.slice(styleStart, styleEnd > -1 ? styleEnd : htmlEnd),
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

				//if found php or comment open tag
				if (insidePHP || insideComment) {

					//check which came first
					if (insidePHP && insideComment) {
						if (openCommentPos < openPHPPos) {
							insidePHP = false;
						} else {
							insideComment = false;
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
	app.setValidDocTypes(['html', 'php']);

	//check when tab is focused and reapply decorations.
	app.onDocumentFocus(function (document) {
		ext.applyDecorations(document);
	})

	//when ever text is changed reapply decorations.
	app.onDocumentTextChange(function (event) {
		ext.applyDecorations(event.document)
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

