import BinOperationNode from "./AST/BinOperationNode";
import ExpressionNode from "./AST/ExpressionNode";
import NumberNode from "./AST/NumberNode";
import StatementsNode from "./AST/StatementsNode";
import UnarOperationNode from "./AST/UnarOperationNode";
import VariableNode from "./AST/VariableNode";
import Token from "./Token";
import TokenType, { tokenTypeList } from "./TokenType";

export default class Parser {
    tokens: Token[]
    pos: number = 0;
    scope: any = {};

    constructor (tokens: Token[]) {
        this.tokens = tokens
    }

    match(...expected: TokenType[]): Token | null {
        if (this.pos < this.tokens.length) {
            const currentToken = this.tokens[this.pos]
            if(expected.find(type => type.name === currentToken.type.name)) {
                this.pos += 1
                return currentToken
            }
        }
        return null
    }

    require(...expected: TokenType[]): Token {
        const token = this.match(...expected)
        if(!token) {
            throw new Error(`на позиции ${this.pos} ожидается ${expected[0].name}`)
        }
        return token
    }

    parseVariableOrNumber() : ExpressionNode {
        const number = this.match(tokenTypeList.NUMBER)
        if (number != null) {
            return new NumberNode(number)
        }
        const variable = this.match(tokenTypeList.VARIABLE)
        if (variable != null) {
            return new VariableNode(variable)
        }
        throw new Error(`Ожидается переменная или число на ${this.pos} позиции`)
    }

    parsePrint(): ExpressionNode {
        const operatorLog = this.match(tokenTypeList.LOG)
        if (operatorLog != null) {
            return new UnarOperationNode(operatorLog, this.parseFormula())
        }
        throw new Error(`Ожидается унарный оператор КОНСОЛЬ на ${this.pos} позиции`)
    }

    parseParentheses() : ExpressionNode {
        if(this.match(tokenTypeList.LPAR) != null) {
            const node = this.parseFormula()
            this.require(tokenTypeList.RPAR)
            return node
        } else {
            return this.parseVariableOrNumber()
        }
    }

    parseFormula(): ExpressionNode {
        let leftNode = this.parseParentheses()
        let operator = this.match(tokenTypeList.MINUS, tokenTypeList.PLUS)
        while (operator != null) {
            const rightNode = this.parseParentheses()
            leftNode = new BinOperationNode(operator, leftNode, rightNode)
            operator = this.match(tokenTypeList.MINUS, tokenTypeList.PLUS)
        }
        return leftNode
    }

    parseExpression(): ExpressionNode {
        if (this.match(tokenTypeList.VARIABLE) == null) {
            const printNode = this.parsePrint()
            return printNode
        }
        this.pos -= 1
        let variableNode = this.parseVariableOrNumber()
        const assignOperator = this.match(tokenTypeList.ASSIGN)
        if (assignOperator != null) {
            const rightFormulaNode = this.parseFormula()
            const binaryNode = new BinOperationNode(assignOperator, variableNode, rightFormulaNode)
            return binaryNode
        }
        throw new Error(`После переменной ожидается оператор присвоения на позиции ${this.pos}`)
    }

    parseCode(): ExpressionNode {
        const root = new StatementsNode()
        while (this.pos < this.tokens.length) {
            const codeStringNode = this.parseExpression()
            this.require(tokenTypeList.SEMICOLON)
            root.addNode(codeStringNode)
        }
        return root
    }

    run(node: ExpressionNode): any {
        if (node instanceof NumberNode) {
            return parseInt(node.number.text)
        }
        if (node instanceof UnarOperationNode) {
            switch (node.operator.type.name) {
                case tokenTypeList.LOG.name:
                    console.log(this.run(node.operand))
                    return
            }
        }
        if (node instanceof BinOperationNode) {
            switch (node.operator.type.name) {
                case tokenTypeList.PLUS.name:
                    return this.run(node.leftNode) + this.run(node.rightNode)
                case tokenTypeList.MINUS.name:
                    return this.run(node.leftNode) - this.run(node.rightNode)
                case tokenTypeList.ASSIGN.name:
                    const result = this.run(node.rightNode)
                    const variableNode = <VariableNode>node.leftNode
                    this.scope[variableNode.variable.text] = result
                    return result
            }
        }
        if (node instanceof VariableNode) {
            if(this.scope[node.variable.text]) {
                return this.scope[node.variable.text]
            } else {
                throw new Error(`Переменная с названием ${node.variable.text} не обнаружена`)
            }
        }
        if (node instanceof StatementsNode) {
            node.codeStrings.forEach(codeString => {
                this.run(codeString)
            })
            return
        }
        throw new Error('Ошибка')
    }
}