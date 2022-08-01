module.exports = function () {

	this.isset = function (object) {
		if (typeof object != 'undefined' && object !== null) {

			//return NaN as false
			if (typeof object == 'number' && object.toString() == 'NaN') {
				return false;
			}

			return true;
		}
		return false;
	}
	this.is_array = function (object) {
		if (isset(object) && object instanceof Array) {
			return true;
		}
		return false;
	}
	this.is_int = function (value) {
		if (typeof value == 'number' && value.toString() != 'NaN' && value.toString() != 'Infinity' && value.toString() != '-Infinity') {
			return value.toString().indexOf('.') < 0;
		}
		return false;
	}
	this.is_bool = function (object) {
		if (typeof object == 'boolean') {
			return true;
		}
		return false;
	}
	this.is_string = function (object) {
		if (typeof object == 'string') {
			return true;
		}
		return false;
	}
	this.is_true = function (object) {
		if ((is_bool(object) && object === true) || (is_int(object) && object === 1)) {
			return true;
		}
		return false;
	}
	this.is_false = function (object) {
		if ((is_bool(object) && object === false) || (is_int(object) && object === 0)) {
			return true;
		}
		return false;
	}
	this.is_numeric = function (value) {

		if (typeof value == 'number' && value.toString() != 'NaN' && value.toString() != 'Infinity') {
			return true;
		}

		if (is_string(value)) {
			var regInt = /^-?[0-9]+$/;
			if (regInt.test(value)) {
				return true;
			}

			var regFloat = /^-?[0-9]+(\.[0-9]+)?$/;
			if (regFloat.test(value)) {
				return true;
			}
		}

		return false;
	}
	this.is_function = function (object) {
		if (typeof object == 'function') {
			return true;
		}
		return false;
	}
	this.in_string = function (needle, haystack) {
		if (is_string(haystack)) {
			if (haystack.indexOf(needle) > -1) {
				return true;
			}
		}
		return false;
	}
	this.in_array = function (needle, haystack) {
		if (is_array(haystack)) {
			for (var i in haystack) {
				if (haystack[i] == needle) {
					return true;
				}
			}
		}
		return false;
	}
	this.array_column = function (array, columnName) {
		var table;
		if (is_string(array)) {
			table = columnName;
			columnName = array;
		} else {
			table = array;
		}

		var list = new Array;

		if (is_array(columnName)) {
			for (var i in table) {
				var row = {};
				for (var c in columnName) {
					if (isset(table[i][columnName[c]])) {
						row[columnName[c]] = table[i][columnName[c]];
					}
				}
				list.push(row);
			}
		} else {
			for (var i in table) {
				if (isset(table[i][columnName])) {
					list.push(table[i][columnName]);
				}
			}
		}
		return list;
	}
	this.array_diff = function (array1, array2) {

		var retArr = new Array;
		var x = 0;
		for (var i in array1) {
			if (in_array(array1[i], array2) == false) {
				retArr[x] = array1[i];
				x++;
			}
		}
		return retArr;
	}
	this.array_merge = function (array1, array2, unique) {

		for (var i in array2) {
			array1.push(array2[i]);
		}

		if (is_false(unique)) {
			return array1;
		}

		return array_unique(array1);
	}
	this.array_unique = function (array) {
		return array.filter(function (el, index, arr) {
			return index == arr.indexOf(el);
		});
	}
	this.array_min = function(array){
		return Math.min.apply(null, array);
	}
	this.array_max = function(array){
		return Math.max.apply(null, array);
	}
	this.trim = function (str, charlist) {

		if (str === null) {
			return '';
		}

		var whitespace, l = 0,
			i = 0;
		str += '';

		if (!charlist) {
			// default list
			whitespace =
				' \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000';
		} else {
			// preg_quote custom list
			charlist += '';
			whitespace = charlist.replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '$1');
		}

		l = str.length;
		for (i = 0; i < l; i++) {
			if (whitespace.indexOf(str.charAt(i)) === -1) {
				str = str.substring(i);
				break;
			}
		}

		l = str.length;
		for (i = l - 1; i >= 0; i--) {
			if (whitespace.indexOf(str.charAt(i)) === -1) {
				str = str.substring(0, i + 1);
				break;
			}
		}

		return whitespace.indexOf(str.charAt(0)) === -1 ? str : '';
	}
	this.str_replace = function (find, replace, text) {

		if (find !== replace && isset(replace)) {
			if (is_array(find) == false) {
				find = [find];
			}
			if (is_string(text)) {
				for (var i in find) {
					if (find[i] instanceof RegExp) {
						text = text.replace(find[i], replace)
					} else {
						if (in_string(find[i], text)) {
							text = text.split(find[i]).join(replace);
						}
					}
				}
			}
		}

		return text;
	}
	this.length = function (object) {

		var x = 0;

		if (is_array(object)) {
			//I dont like relying on .length as it doesnt always work as expected
			//array[0] = ''
			//array[5] = ''
			//produces length of 5 when its really 2
			for (var i in object) {
				++x;
			}
		} else if (is_array(object)) {
			if (isset(object.byteLength) == true) {
				x = object.byteLength;
			} else if (isset(Object['keys'])) {
				x = Object['keys'](object).length;
			} else {
				for (var i in object) {
					++x;
				}
			}
		} else if (is_string(object)) {
			x = object.length;
		} else if (is_numeric(object)) {
			x = object.toString().length;
		}

		return x;
	}
	this.ceil = function (value, decPlaces, multiple) {

		if (is_int(decPlaces) == false) {
			decPlaces = 0;
		}

		var placeHolderValue = (decPlaces > 0 ? Math.pow(10, decPlaces) : 1)
		value = (Math.ceil(fixNumberValue(value) * placeHolderValue) / placeHolderValue).toFixed(decPlaces);

		if (isset(multiple)) {
			value = (Math.ceil(value / multiple) * multiple).toFixed(decPlaces);
		}

		return parseFloat(value);

	}
	this.floor = function (value, decPlaces, multiple) {

		if (is_int(decPlaces) == false) {
			decPlaces = 0;
		}

		var placeHolderValue = (decPlaces > 0 ? Math.pow(10, decPlaces) : 1);
		value = (Math.floor(fixNumberValue(value) * placeHolderValue) / placeHolderValue).toFixed(decPlaces);

		if (isset(multiple)) {
			value = (Math.floor(value / multiple) * multiple).toFixed(decPlaces);
		}

		return parseFloat(value);
	}
	this.round = function (value, decPlaces, multiple) {

		if (is_int(decPlaces) == false) {
			decPlaces = 0;
		}

		var placeHolderValue = (decPlaces > 0 ? Math.pow(10, decPlaces) : 1)
		value = (Math.round(fixNumberValue(value) * placeHolderValue) / placeHolderValue).toFixed(decPlaces);

		if (isset(multiple)) {
			value = (Math.round(value / multiple) * multiple).toFixed(decPlaces);
		}

		return parseFloat(value);
	}
	var indexOf = String.prototype.indexOf;
	String.prototype.indexOf = function (value, startPos) {
		if (value instanceof RegExp) {
			var x = this.substring(startPos || 0).search(value);
			return (x >= 0) ? (x + (startPos || 0)) : x;
		}
		return indexOf.call(this, value, startPos);
	};
	var lastIndexOf = String.prototype.lastIndexOf;
	String.prototype.lastIndexOf = function (value, startPos) {
		if (value instanceof RegExp) {
			value = (value.global) ? value : new RegExp(value.source, "g" + (value.ignoreCase ? "i" : "") + (value.multiLine ? "m" : ""));
			if (typeof (startPos) == "undefined") {
				startPos = string.length;
			} else if (startPos < 0) {
				startPos = 0;
			}
			var stringToWorkWith = this.substring(0, startPos + 1);
			var x = -1;
			var nextStop = 0;
			while ((result = value.exec(stringToWorkWith)) != null) {
				x = result.index;
				value.lastIndex = ++nextStop;
			}
			return x;
		}
		return lastIndexOf.call(this, value, startPos);
	}
}