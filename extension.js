const vscode = require('vscode');
const app = require('./lib/application');
const Application = app.Application;
const Helpers = app.Helpers;
const ConfigSettings = app.ConfigSettings;

require('./lib/functions')();

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	var application = new Application(context);

	application.setValidDocTypes(['html', 'php']);

	application.editorCreateDecoration('keywords', { color: new vscode.ThemeColor('inline.css.keyword') });
	application.editorCreateDecoration('punctuation', { color: new vscode.ThemeColor('inline.css.punctuation') });
	application.editorCreateDecoration('valueNumeric', { color: new vscode.ThemeColor('inline.css.valueNumeric') });
	application.editorCreateDecoration('valueConstant', { color: new vscode.ThemeColor('inline.css.valueConstant') });
	application.editorCreateDecoration('supportFunction', { color: new vscode.ThemeColor('inline.css.supportFunction') });
	application.editorCreateDecoration('string', { color: new vscode.ThemeColor('inline.css.string') });

	application.addDecorationLineRanges(function (lines, line_x, ranges) {

		if (lines[line_x]['syntax'] !== 'html') {
			return;
		}

		let elements = lines[line_x]['html']['elements'];

		for (var element_id in elements) {
			let style = elements[element_id]['attributes']['style'];
			if (style) {
				for (var index in style) {

					let line = style[index]['line'];
					let text = lines[line]['text'];

					let start = style[index]['start'];
					let end = style[index]['end'];

					if (start === null || end === null) {
						continue;
					}

					let x = start;
					let numericStart = null;
					let constStart = null;
					let stringStart = null;
					let phpOpen = false;
					let inMatch = false;
					let keyWordStart = true;
					while (x <= end) {

						if (text.indexOf(/<\?/, x) === x) {
							phpOpen = true;
						} else if (text.indexOf(/\?>/, x) === x) {
							phpOpen = false;
						}

						if (phpOpen == false) {
							let valueEnd = false;
							let supportFunction = false;
							let keyword = false;
							if (text.indexOf(/:| :|  :/, x) == x) {
								if (constStart !== null) {
									ranges['keywords'].push(new vscode.Range(line, constStart, line, x));
									inMatch = false;
									constStart = null;
									keyWordStart = false;
								}
								ranges['punctuation'].push(new vscode.Range(line, x, line, x + 1));
							} else if (text.indexOf(/[),=]/, x) == x) {
								ranges['punctuation'].push(new vscode.Range(line, x, line, x + 1));
								valueEnd = true;
							} else if (text.indexOf(/[\(]/, x) == x) {
								ranges['punctuation'].push(new vscode.Range(line, x, line, x + 1));
								valueEnd = true;
								supportFunction = true;
							} else if (text.indexOf(/[;]/, x) == x) {
								ranges['punctuation'].push(new vscode.Range(line, x, line, x + 1));
								valueEnd = true;
								keyWordStart = true;
							} else if (text.indexOf(/[ ]/, x) == x) {
								valueEnd = true;
								if(keyWordStart){
									keyword = true;
								}
							} else if (x == end) {
								valueEnd = true;
								if(keyWordStart){
									keyword = true;
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
									ranges['string'].push(new vscode.Range(line, stringStart, line, x));
									stringStart = null;
								}
								if (numericStart !== null) {
									ranges['valueNumeric'].push(new vscode.Range(line, numericStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									numericStart = null;
								}
								if (constStart !== null) {
									if (supportFunction) {
										supportFunction = false;
										ranges['supportFunction'].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									} else if (keyword) {
										ranges['keywords'].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
									} else {
										ranges['valueConstant'].push(new vscode.Range(line, constStart, line, x + (x == end && isset(text[x + 1]) == false ? 1 : 0)));
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
	});

	application.activate();
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

