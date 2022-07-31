const { start } = require('repl');
const vscode = require('vscode');
const Application = require('./lib/application');

require('./lib/functions')();

/**
 * @param {Application} application
 */
var InlineCssColor = function (application) {

	var self = this;

	//create new types so old ones are not overwritten
	let colorKeyWord = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.keyword'),
	})
	let colorPunctuation = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.punctuation'),
	})
	let colorValueConstant = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.valueConstant'),
	})
	let colorSupportFunction = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.supportFunction'),
	})
	let colorValueNumeric = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.valueNumeric'),
	})
	let colorString = vscode.window.createTextEditorDecorationType({
		color: new vscode.ThemeColor('inline.css.string'),
	})

	let ranges = {
		keywords: {},
		punctuation: {},
		supportFunction: {},
		valueConstant: {},
		valueNumeric: {},
		string: {},
	}

	this.setLineRanges = function (lines, i) {

		let line_id = lines[i]['id'];

		for (var type in ranges) {
			ranges[type][line_id] = [];
		}

		let elements = lines[i]['html']['elements'];

		for (var element_id in elements) {
			let style = elements[element_id]['attributes']['style'];
			if (style) {
				for (var index in style) {
					let line = style[index]['line'];
					let text = lines[line]['text'];
					let start = style[index]['start'];
					let end = style[index]['end'];
					//console.log(lines[line]);
					if (start === null || end === null) {
						continue;
					}

					let x = start;
					let numericStart = null;
					let constStart = null;
					let stringStart = null;
					let phpOpen = false;
					let inMatch = false;

					while (x <= end) {

						if (text.indexOf(/<\?/, x) === x) {
							phpOpen = true;
						} else if (text.indexOf(/\?>/, x) === x) {
							phpOpen = false;
						}

						if (phpOpen == false) {
							let valueEnd = false;
							let supportFunction = false;
							if (text.indexOf(/:| :|  :/, x) == x) {
								if (constStart !== null) {
									ranges['keywords'][line_id].push(new vscode.Range(line, constStart, line, x));
									inMatch = false;
									constStart = null;
								}
								ranges['punctuation'][line_id].push(new vscode.Range(line, x, line, x + 1));
							} else if (text.indexOf(/[),=]/, x) == x) {
								ranges['punctuation'][line_id].push(new vscode.Range(line, x, line, x + 1));
								valueEnd = true;
							} else if (text.indexOf(/[\(]/, x) == x) {
								ranges['punctuation'][line_id].push(new vscode.Range(line, x, line, x + 1));
								valueEnd = true;
								supportFunction = true;
							} else if (text.indexOf(/[;]/, x) == x) {
								ranges['punctuation'][line_id].push(new vscode.Range(line, x, line, x + 1));
								valueEnd = true;
							} else if (text.indexOf(/[ ]/, x) == x) {
								valueEnd = true;
							} else if (x == end) {
								valueEnd = true;
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

							if (valueEnd) {
								inMatch = false;
								if (stringStart) {
									ranges['string'][line_id].push(new vscode.Range(line, stringStart, line, x));
									stringStart = null;
								}
								if (numericStart !== null) {
									ranges['valueNumeric'][line_id].push(new vscode.Range(line, numericStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									numericStart = null;
								}
								if (constStart !== null) {
									if (supportFunction) {
										supportFunction = false;
										ranges['supportFunction'][line_id].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									} else {
										ranges['valueConstant'][line_id].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									}
									constStart = null;
								}
							}
						}
						x++;
					}

				}

			}
		}
	}

	this.colorLines = function (startLine, endLine, diff) {

		let editor = application.editor();

		let lines = application.getDocumentLinesInfo();
		diff = isset(diff) ? diff : 0;
		startLine = is_int(startLine) ? startLine : 0
		endLine = is_int(endLine) ? endLine : lines.length - 1; //inclusive



		let validIds = {};
		let isSingleLine = diff == 0 && startLine == endLine;

		if (isSingleLine) {
			if (lines[startLine]['syntax'] == 'html') {
				if (isset(lines[startLine]['line_links'])) {
					for (var i in lines[startLine]['line_links']) {
						self.setLineRanges(lines, lines[startLine]['line_links'][i]);
					}
				}
				self.setLineRanges(lines, startLine);
			}
		} else {

			for (var i in lines) {
				i = parseInt(i)
				let line_id = lines[i]['id'];
				validIds[line_id] = 0;
				if (lines[i]['syntax'] == 'html') {
					if ((i >= startLine && i <= endLine)) {
						self.setLineRanges(lines, i);
					}
				}
				if (i > endLine) {
					if (diff !== 0) {
						for (var type in ranges) {
							for (var o in ranges[type][line_id]) {
								ranges[type][line_id][o]['_start']['_line'] += diff;
								ranges[type][line_id][o]['_end']['_line'] += diff;
							}
						}
					}
				}
			}
		}

		let decorationRanges = {};

		for (var type in ranges) {
			decorationRanges[type] = [];
			for (var line_id in ranges[type]) {
				if (isSingleLine == false && isset(validIds[line_id]) == false) {
					delete ranges[type][line_id];
				} else {
					for (let i in ranges[type][line_id]) {
						decorationRanges[type].push(ranges[type][line_id][i]);
					}
				}
			}
		}

		editor.setDecorations(colorKeyWord, decorationRanges['keywords']);
		editor.setDecorations(colorPunctuation, decorationRanges['punctuation']);
		editor.setDecorations(colorSupportFunction, decorationRanges['supportFunction']);
		editor.setDecorations(colorValueConstant, decorationRanges['valueConstant']);
		editor.setDecorations(colorValueNumeric, decorationRanges['valueNumeric']);
		editor.setDecorations(colorString, decorationRanges['string']);

	}

}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	var application = new Application(context);

	application.setExtensionName('inline-css-color');
	application.setValidDocTypes(['html', 'php']);
	application.setDocumentCacheEnabled(); //cache only php and html files

	let controls = {}
	application.on('documentOpen', function () {
		controls[application.documentPath()] = new InlineCssColor(application);
	});
	application.on('documentFocus', function () {
		try {
			controls[application.documentPath()].colorLines();
		} catch (e) {
			console.log(e);
		}
	})
	application.on('documentTextChange', function (startLine, endLine, diff) {
		try {
			controls[application.documentPath()].colorLines(startLine, endLine, diff);
		} catch (e) {
			console.log(e);
		}
	})
	application.activate();
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

