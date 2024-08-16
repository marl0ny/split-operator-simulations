/* Functions and classes for parsing simple mathematical expressions.

References:

Wikipedia - Shunting Yard Algorithm
https://en.wikipedia.org/wiki/Shunting_yard_algorithm

*/
const LETTERS = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
const OPS = '^/*+-';
const NUMBER_CHARACTERS_LIST = (() => {
    let vals = [];
    for (let i = 0; i < 10; i++)
        vals.push(String(i));
    // Include characters used in expressing floating point expressions
    for (let c of ['e', '-', '+', '.']) {
        vals.push(c);
    }
    return vals;
})();
const FUNCTIONS = {
    abs: Math.abs, 
    exp: Math.exp,
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    // acos: Math.acos, asin: Math.asin, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    // asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    log: Math.log, sqrt: Math.sqrt,
    step: z => (z >= 0.0)? 1.0: 0.0
};

const add = (a, b) => a + b;
const sub = (a, b) => a - b;
const mul = (a, b) => a*b;
const div = (a, b) => a/b;
const pow = (a, b) => Math.pow(a, b);


const PRECEDENCE_RANK = (() => {
    let precedenceRank = {};
    Object.keys(FUNCTIONS).forEach(e => precedenceRank[e] = 3);
    OPS.split('').forEach(e => {
        switch(e) {
            case '^':
                precedenceRank[e] = 2;
                break;
            case '/': case '*':
                precedenceRank[e] = 1;
                break;
            case '+': case '-':
                precedenceRank[e] = 0;
                break;
            default:
                break;
        }
    });
    return precedenceRank;
})();

function precedenceOf(c) {
    return PRECEDENCE_RANK[c];
}

function isSingleCharacterNumber(c) {
    return '1234567890'.split('').find(e => e === c);
}

function isValidNumericalCharacter(c) {
    return NUMBER_CHARACTERS_LIST.find(e => c === e);
}

function isSingleCharacterOp(c) {
    return OPS.split('').find(e => c === e);
}

function isALetter(c) {
    return LETTERS.split('').find(e => e === c);
}

function isBannedCharacter(c) {
    return !(isValidNumericalCharacter(c) || isSingleCharacterOp(c)
        || isALetter(c) || c === ' ');
}

function isParenthesis(c) {
    return c === '(' || c === ')';
}

function isLeftParenthesis(c) {
    return c === '(';
}

function isRightParenthesis(c) {
    return c === ')';
}

function isDecimalPoint(c) {
    return c === '.';
}

function parseVariable(inputStr, startIndex) {
    let variable = '';
    let j = startIndex;
    for (; (isSingleCharacterNumber(inputStr[j]) 
            || isALetter(inputStr[j])) && j < inputStr.length;
         j++) {
        variable += inputStr[j];
    }
    return {parsedVariable: variable, endIndex: j};
}

function parseInteger(inputStr, startIndex) {
    let valStr = '';
    let j = startIndex;
    for (; isSingleCharacterNumber(inputStr[j]) && j < inputStr.length;
         j++) {
        valStr += inputStr[j];
    }
    return {parsedNumber: valStr, endIndex: j};
}

function parseAfterExponent(inputStr, 
        valStrBeforeExponent, indexAfterExponent) {
    let j = indexAfterExponent;
    let valStr = valStrBeforeExponent + 'e';
    if (j === inputStr.length) {
        return {parseSuccess: false, parsedNumber: valStr, endIndex: j};
    }
    if (isSingleCharacterNumber(inputStr[j])) {
        let {parsedNumber: valStr2, endIndex: k} = parseInteger(inputStr, j);
        return {
            parseSuccess: true, parsedNumber: valStr + valStr2, endIndex: k};
    } else if (inputStr[j] === '+' || inputStr[j] === '-') {
        valStr += inputStr[j];
        j++;
        if (j === inputStr.length)
            return {parseSuccess: false, 
                    parsedNumber: valStr, endIndex: j};
    }

    if (isSingleCharacterNumber(inputStr[j])) {
        let {parsedNumber: valStr2, endIndex: k} = parseInteger(inputStr, j);
        if (k !== inputStr.length && inputStr[k] === '.')
            return {parseSuccess: false, 
                parsedNumber: valStr + valStr2, endIndex: k};
        return {
            parseSuccess: true, parsedNumber: valStr + valStr2, endIndex: k};   
    }
    return {parseSuccess: false, parsedNumber: valStr, endIndex: j};
}


function parseAfterDecimal(inputStr, valStrBeforeDecimal, indexAfterDecimal) {
    let j = indexAfterDecimal;
    let valStr = valStrBeforeDecimal + '.';
    if (isSingleCharacterNumber(inputStr[j])) {
        let {parsedNumber: valStr2, endIndex: k} = parseInteger(inputStr, j); 
        j = k;
        valStr += valStr2;
    }
    // If it's the end of the input string, early return.
    if (j === inputStr.length) 
        return {parseSuccess: true, parsedNumber: valStr, endIndex: j};
    if (isSingleCharacterOp(inputStr[j]) 
        || isRightParenthesis(inputStr[j])
        || inputStr[j] === ' ') {
        return {parseSuccess: true, 
                parsedNumber: valStr, endIndex: j};
    } else if (inputStr[j] === 'e') {
        return parseAfterExponent(inputStr, valStr, j + 1);
    }
    return {parseSuccess: false, parsedNumber: null, endIndex: -1};
}

function parseNumber(inputStr, startIndex) {

    // Parse an integer
    let {parsedNumber: valStr, endIndex: j} 
        = parseInteger(inputStr, startIndex);

    // If it's the end of the input string, early return.
    if (j === inputStr.length) 
        return {parseSuccess: true, parsedNumber: valStr, endIndex: j};

    // If a space, ')', or operator directly follows the string
    // of numbers, then it is an integer value, so return it.
    if (isSingleCharacterOp(inputStr[j]) 
        || isRightParenthesis(inputStr[j])
        || inputStr[j] === ' ') {
        return {parseSuccess: true, 
                parsedNumber: valStr, endIndex: j};
    // Else if there is a '.' or an 'e' directly after the string of
    // numbers, then we're dealing with a floating point value.
    } else if (inputStr[j] === 'e') {
        return parseAfterExponent(inputStr, valStr, j + 1);
    } else if (isDecimalPoint(inputStr[j])) {
        return parseAfterDecimal(inputStr, valStr, j + 1);
    // Any other character returns a failure.
    } else {
        return {parseSuccess: false, parsedNumber: null, endIndex: -1};
    }
}

/* Handle unary operators by placing zero before them.
*/
function handleUnaryOperators(expr) {
    if (expr[0] === '-' || expr[0] === '+')
        expr.unshift('0');
    for (let i = 0; i < expr.length-1; i++) {
        if (expr[i] === '(' && (expr[i+1] === '-' || expr[i+1] === '+')) {
            let newExpr = [];
            expr.forEach((e, j) => {if (j <= i) newExpr.push(e)});
            newExpr.push('0');
            expr.forEach((e, j) => {if (j >= i+1) newExpr.push(e)});
            expr = newExpr;
        }
    }
    return expr;
}

function checkIfParenthesesAreBalanced(inputStr) {
    let leftParenthesesStack = [];
    for (let i = 0; i < inputStr.length; i++) {
        if (isLeftParenthesis(inputStr[i])) {
            leftParenthesesStack.push(inputStr[i]);
        } else if (isRightParenthesis(inputStr[i])) {
            if (leftParenthesesStack.length === 0)
                return false;
            leftParenthesesStack.pop();
        }
    }
    return (leftParenthesesStack.length === 0)? true: false;
}

function getExpressionStack(inputStr) {
    if (!checkIfParenthesesAreBalanced(inputStr)) {
        console.error("Unbalanced parentheses");
        return [];
    }
    let expr = [];
    let i = 0;
    while (i < inputStr.length) {
        let c = inputStr[i];
        if (isSingleCharacterNumber(c)) {
            let {parseSuccess: success, parsedNumber: val, endIndex: endIndex}
                = parseNumber(inputStr, i);
            if (!success) {
                console.error("Invalid numerical value");
                return [];
            }
            i = endIndex;
            expr.push(val);
        } else if (isALetter(c)) {
            let {parsedVariable: val, endIndex: endIndex}
                = parseVariable(inputStr, i);
            i = endIndex;
            expr.push(val);
        } else if (isSingleCharacterOp(c) || isParenthesis(c)) {
            expr.push(c);
            i++;
        } else if (c === ' ') {
            i++;
        } else {
            console.error("Invalid expression");
            return [];
        }
    }
    expr = handleUnaryOperators(expr);
    expr.reverse();
    return expr;
}

function handleOperators(opNew, operatorStack, rpnList) {
    if (operatorStack.length > 0) {
        while (operatorStack.length > 0) {
            let opPrev = operatorStack.pop();
            if (isLeftParenthesis(opPrev) 
                || precedenceOf(opNew) > precedenceOf(opPrev)) {
                operatorStack.push(opPrev);
                operatorStack.push(opNew);
                break;
            } else {
                rpnList.push(opPrev);
                if (operatorStack.length === 0) {
                    operatorStack.push(opNew);
                    break;
                }
            }
        }
    } else { // Operator stack is empty
        operatorStack.push(opNew);
    }
}

function shuntingYard(exprStack) {
    let rpnList = []; // Reverse polish notation list
    let operatorStack = [];
    while (exprStack.length > 0) {
        let c = exprStack.pop();
        if (!isNaN(parseFloat(c))) { // Values
            rpnList.push(c);
        } else if (isLeftParenthesis(c)) {
            operatorStack.push(c);
        } else if (isRightParenthesis(c)) { 
            let e = operatorStack.pop();
            while(!isLeftParenthesis(e)) {
                rpnList.push(e);
                e = operatorStack.pop();
            }
        } else if (isSingleCharacterOp(c)) { // Operator
            handleOperators(c, operatorStack, rpnList);
        } else if (isALetter(c[0])) { // Variables and functions
            if (Object.keys(FUNCTIONS).find(e => e === c))
                handleOperators(c, operatorStack, rpnList);
            else
                rpnList.push(c);
        }
    }
    while (operatorStack.length) {
        rpnList.push(operatorStack.pop());
    }
    return rpnList;
}

function computeRPNExpression(rpnList, variables={}) {
    let rpnStack = [];
    while(rpnList.length > 0) {
        let e = rpnList.shift();
        if (!isNaN(parseFloat(e))) {
            rpnStack.push(parseFloat(e));
        } else if (isSingleCharacterOp(e)) {
            let opR = rpnStack.pop();
            let opL = rpnStack.pop();
            let val;
            switch (e) {
                case '+':
                    val = add(opL, opR);
                    break;
                case '-':
                    val = sub(opL, opR);
                    break;
                case '*':
                    val = mul(opL, opR);
                    break;
                case '/':
                    val = div(opL, opR);
                    break;
                case '^':
                    val = pow(opL, opR);
                    break;
                default:
                    break;
            }
            rpnStack.push(val);
        } else if (isALetter(e[0])) {
            if (Object.keys(FUNCTIONS).find(f => f === e)) {
                let val = rpnStack.pop();
                rpnStack.push(FUNCTIONS[e](val));
            } else {
                for (let k of Object.keys(variables)) {
                    if (k === e)
                        rpnStack.push(variables[k]); 
                }
            }
        }
    }
    return rpnStack.pop();
}

export function turnRPNExpressionToString(rpnList) {
    let rpnStack = [];
    while(rpnList.length > 0) {
        let e = rpnList.shift();
        if (!isNaN(parseFloat(e))) {
            rpnStack.push(`r2C(${parseFloat(e).toExponential()})`);
        } else if (isSingleCharacterOp(e)) {
            let opR = rpnStack.pop();
            let opL = rpnStack.pop();
            let val;
            switch (e) {
                case '+':
                    val = `add(${opL}, ${opR})`;
                    break;
                case '-':
                    val = `sub(${opL}, ${opR})`;
                    break;
                case '*':
                    val = `mul(${opL}, ${opR})`;
                    break;
                case '/':
                    val = `div(${opL}, ${opR})`;
                    break;
                case '^':
                    val = `powC(${opL}, ${opR})`;
                    break;
                default:
                    break;
            }
            rpnStack.push(val);
        } else if (isALetter(e[0])) {
            if (Object.keys(FUNCTIONS).find(f => f === e)) {
                let val = rpnStack.pop();
                rpnStack.push(`${e}C(${val})`);
            } else {
                rpnStack.push(e);
            }
        }
    }
    return rpnStack.pop();
}

export function turnRPNExpressionToLATEXString(rpnList) {
    let rpnStack = [];
    while(rpnList.length > 0) {
        let e = rpnList.shift();
        if (!isNaN(parseFloat(e))) {
            rpnStack.push(`${parseFloat(e)}`);
        } else if (isSingleCharacterOp(e)) {
            let opR = rpnStack.pop();
            let opL = rpnStack.pop();
            let val;
            switch (e) {
                case '+':
                    val = `${opL}+${opR}`;
                    break;
                case '-':
                    val = `${opL}-${opR}`;
                    break;
                case '*':
                    val = `${opL}${opR}`;
                    break;
                case '/':
                    val = `\\frac{${opL}}{${opR}}`;
                    break;
                case '^':
                    val = `\\{${opL}}^{${opR}}`;
                    break;
                default:
                    break;
            }
            rpnStack.push(val);
        } else if (isALetter(e[0])) {
            if (Object.keys(FUNCTIONS).find(f => f === e)) {
                let val = rpnStack.pop();
                rpnStack.push(`\\${e}(${val})`);
            } else {
                rpnStack.push(e);
            }
        }
    }
    return rpnStack.pop();
}

export function getRPNExprList(exprStr) {
    let exprStack = getExpressionStack(exprStr);
    return shuntingYard(exprStack);
}

export function getVariablesFromRPNList(rpnList) {
    let variables = new Set();
    for (let e of rpnList) {
        if (isALetter(e.toString()[0]) 
            && !Object.keys(FUNCTIONS).includes(e)) {
            variables.add(e);
        }
    }
    return variables;
}

export function computeExprStr(exprStr, variables={}) {
    let rpnList = getRPNExprList(exprStr);
    console.log(rpnList);
    let val = computeRPNExpression(rpnList, variables);
    return val;
}
