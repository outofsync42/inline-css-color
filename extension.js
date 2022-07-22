const vscode = require('vscode');
const Application = require('./lib/application');

require('./lib/functions')();

/**
 * @param {Application} application
 */
var InlineCssColor = function (application) {

	var self = this;

	this.isValidDocType = function () {
		var validDocTypes = ['php', 'html', 'htm']
		return in_array(application.documentType(), validDocTypes);
	}

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

	this.colorLines = function () {

		let lines = application.getDocumentLinesInfo();

		let editor = application.editor();
		let keyWordRanges = [];
		let punctuationRanges = [];
		let supportFunctionRanges = [];
		let valueConstantRanges = [];
		let valueNumericRanges = [];
		let stringRanges = [];

		for (var i in lines) {
			if (lines[i]['syntax'] == 'html') {
				let elements = lines[i]['html']['elements'];
				for (var o in elements) {
					let style = elements[o]['attributes']['style'];
					if (style) {

						let line = style['line'];
						let text = lines[line]['text'];
						let startPos = style['valueStartPos'];
						let endPos = style['valueEndPos'];
						if (startPos === null || endPos === null) {
							continue;
						}

						let x = startPos;
						let numericStart = null;
						let constStart = null;
						let stringStart = null;
						let phpOpen = false;
						let inMatch = false;
						let openQuote = '';
						while (openQuote == '' && x > -1) {
							x--;
							if (text[x] == '"' || text[x] == "'") {
								openQuote = text[x];
							}
						}
						if (x == -1) {
							console.log('error finding opening quote on line ' + line);
							continue;
						}
						x++;
						let openString = openQuote == "'" ? '"' : "'";

						while (x < endPos + 1 && x < text.length) {

							if (text.indexOf(/<\?/, x) === x) {
								phpOpen = true;
							} else if (text.indexOf(/\?>/, x) === x) {
								phpOpen = false;
							}

							if (phpOpen == false) {
								let valueEnd = false;
								let supportFunction = false;

								if (text.indexOf(/:| :|  :/, x) == x) {
									if (constStart) {
										keyWordRanges.push(new vscode.Range(line, constStart, line, x));
										inMatch = false;
										constStart = null;
									}
									punctuationRanges.push(new vscode.Range(line, x, line, x + 1));
								} else if (text.indexOf(/[),=]/, x) == x) {
									punctuationRanges.push(new vscode.Range(line, x, line, x + 1));
									valueEnd = true;
								} else if (text.indexOf(/[\(]/, x) == x) {
									punctuationRanges.push(new vscode.Range(line, x, line, x + 1));
									valueEnd = true;
									supportFunction = true;
								} else if (text.indexOf(/[;]/, x) == x) {
									punctuationRanges.push(new vscode.Range(line, x, line, x + 1));
									valueEnd = true;
								} else if (text.indexOf(/[ ]/, x) == x) {
									valueEnd = true;
								} else if (text.indexOf(openQuote, x) == x) {
									valueEnd = true;
								} else if (inMatch == false && text.indexOf(openString, x) == x) {
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
										stringRanges.push(new vscode.Range(line, stringStart, line, x));
										stringStart = null;
									}
									if (numericStart) {
										valueNumericRanges.push(new vscode.Range(line, numericStart, line, x));
										numericStart = null;
									}
									if (constStart) {
										if (supportFunction) {
											supportFunction = false;
											supportFunctionRanges.push(new vscode.Range(line, constStart, line, x));
										} else {
											valueConstantRanges.push(new vscode.Range(line, constStart, line, x));
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

		if (keyWordRanges.length > 0) {
			editor.setDecorations(colorKeyWord, keyWordRanges);
		}
		if (punctuationRanges.length > 0) {
			editor.setDecorations(colorPunctuation, punctuationRanges);
		}
		if (supportFunctionRanges.length > 0) {
			editor.setDecorations(colorSupportFunction, supportFunctionRanges);
		}
		if (valueConstantRanges.length > 0) {
			editor.setDecorations(colorValueConstant, valueConstantRanges);
		}
		if (valueNumericRanges.length > 0) {
			editor.setDecorations(colorValueNumeric, valueNumericRanges);
		}
		if (stringRanges.length > 0) {
			editor.setDecorations(colorString, stringRanges);
		}
	}

}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	var application = new Application(context);
	var inlineCssColor = new InlineCssColor(application);
	//application.updateCacheOnTextChange();
	application.on('documentFocus', function () {
		if (inlineCssColor.isValidDocType()) {
			inlineCssColor.colorLines();
		}
	})
	application.on('documentTextChange', function () {
		if (inlineCssColor.isValidDocType()) {
			inlineCssColor.colorLines();
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
