// ReactSymbols: 为了防止滥用ReactElement,给ReactElement定义一个独一无二的值
const supportSymbol = typeof Symbol === 'function' && Symbol.for;

export const REACT_ELEMENT_TYPE = supportSymbol
	? Symbol.for('react.element')
	: 0xeac7;
