
let valid_function_names_cached = []
async function get_api_function_names() {
  let api_doc_text = await fetch('API.md').then(x => x.text())
  let lines_with_functions = api_doc_text.split('\n').filter(x => x.startsWith('[const {'))
<<<<<<< HEAD
  console.log('getting function names')
  console.log(lines_with_functions)
  var function_names = {}
  for (let index in lines_with_functions) {
    let line = lines_with_functions[index]
    var start = line.indexOf("{")
    var end = line.indexOf("}")
    let function_name = line.substr(start + 1, end - start - 1)
    start = line.indexOf("[") 
    end = line.indexOf("]")
    let require_call = line.substr(start + 1, end - start - 1)
    function_names[function_name] = require_call
  }
  console.log(function_names)
  return function_names
}

async function declares_api_function(declaration, function_names) {
  console.log("reached 1")
  if(declaration.type != "VariableDeclarator") return false
  // check id statement
  console.log("reached 2")
  if(declaration.id.type != "ObjectPattern") return false
  console.log("reached 3")
  let property = declaration.id.properties[0]
  console.log("reached 4")
  if(property.type != "Property") return false
  console.log("reached 5")
  if(property.key.type != "Identifier") return false
  console.log("reached 6")
  console.log(property.key.name)
  console.log(function_names)
  if(!(property.key.name in function_names)) return false
  //check init statement
  console.log("reached 7")
  if(declaration.init.type != "CallExpression") return false
  console.log("reached 8")
  if(declaration.init.callee.type != "Identifier" || declaration.callee.name != "require") return false
  console.log("reached 9")
  if(declaration.init.arguments.length != 1) return false
  console.log("reached 10")
  let arg = declaration.init.arguments[0]
  if(arg.type != "Literal") return false
  console.log("reached 11")
  return arg.value == function_names[property.key.name]
}

async function list_missing_imports(ast, output) {
  console.log("listing missing imports")
  console.log(ast)
  let function_names = await get_api_function_names()
  for (let index in ast.body) {
    let line_ast = ast.body[index]
    switch (line_ast.type) {
      case "VariableDeclaration": {
        let does_declare_api_function = await declares_api_function(line_ast.declarations[0], function_names)
        console.log(does_declare_api_function)
        break
      }
      case "ExpressionStatement": {
        break
      }
      default: {
        console.log('unexpected case')
        break
      }
    }
  }
  output.push({
    column: 0,
    line: 2,
    endColumn: 6,
    endLine: 2,
    message: 'list missing imports'
  })
=======
  functions = {}
  for(let line of lines_with_functions) {
    let name = line.substring(line.indexOf('{') + 1, line.indexOf('}'))
    let require_statement = line.substring(line.indexOf('[') + 1, line.indexOf(']'))
    functions[name] = require_statement
  }
  console.log(functions)
  return functions
}

function is_api_import_declaration(declaration, api_function_names) {
  if(declaration.type != 'VariableDeclarator') return false
  if(declaration.id.type != 'ObjectPattern') return false
  if(declaration.id.properties.length != 1) {
    console.log('unknown case, number of properties != 1')
    return false
  }
  let property = declaration.id.properties[0]
  if(property.type != 'Property' || property.kind != 'init') return false
  if(property.key.type != 'Identifier') return false
  let func_name = property.key.name
  if(declaration.init.type != 'CallExpression') return false
  if(declaration.init.callee.type != 'Identifier') return false
  let func_call = declaration.init.callee.name
  if(declaration.init.arguments.length != 1) {
    console.log('arguments is not 1, case unaccounted for')
    return false
  }
  let arg0 = declaration.init.arguments[0].raw
  if(api_function_names[func_name] == 'const {' + func_name + '} = ' + func_call + '(' + arg0 + ')') return true
}

function is_api_call_missing_require(expression, imported_api_functions, api_function_names) {
  // expression is not a call expression
  if(expression.type != 'CallExpression') return false
  // callee function is not an api function
  if(expression.callee.type != 'Identifier') return false
  if(Object.keys(api_function_names).indexOf(expression.callee.name) == -1) return false
  // api function call was already required
  if(imported_api_functions.indexOf(expression.callee.name) >= 0) return false
  return true
}

async function list_all_api_calls_missing_require(ast, api_function_names) {
  let api_calls_missing_require = []
  let imported_api_functions = []
  for(let line of ast.body) {
    console.log(imported_api_functions)
    let expressions = []
    switch(line.type) {
      case 'ExpressionStatement':
        if(is_api_call_missing_require(line.expression, imported_api_functions, api_function_names))
          api_calls_missing_require.push(line.expression)
        break;
      case 'VariableDeclaration':
        for(let declaration of line.declarations) {
          if(is_api_import_declaration(declaration, api_function_names)) {
            console.log('is api import decl')
            imported_api_functions.push(declaration.id.properties[0].key.name)
          }
          else if(is_api_call_missing_require(declaration.init, imported_api_functions, api_function_names))
            api_calls_missing_require.push(declaration.init)
        }
        break;
      default:
        console.log('AST type not accounted for ' + line.type);
        break;
    }
  }
  console.log(api_calls_missing_require)
  return api_calls_missing_require
}

async function list_missing_imports(js_editor, ast, output, text) {
  console.log(ast)
  let api_function_names = await get_api_function_names()
  let api_calls_missing_require = await list_all_api_calls_missing_require(ast, api_function_names)
  output = await remove_api_call_eslint_errors(output, api_function_names)
  for(let api_call of api_calls_missing_require) {
    let start = js_editor.session.doc.indexToPosition(api_call.callee.start)
    let end = js_editor.session.doc.indexToPosition(api_call.callee.end)
    output.push({
      message: 'API call missing import. Use ' + api_function_names[api_call.callee.name],
      line: start.row + 1,
      column: start.column + 1,
      endLine: end.row + 1,
      endColumn: end.column + 1
    })
  }
  return output
}

async function remove_api_call_eslint_errors(output, api_function_names) {
  for(let i = 0; i < output.length; i++) {
    let error = output[i]
    regex = /\'.*\' is not defined./
    if(error.message.match(regex) != null) {
      let undefined_call = error.message.split("'")[1]
      for(let name in api_function_names) {
        if(name == undefined_call) {
          output.splice(i, 1)
          i--;
        } 
      }
    }
  }
  return output
>>>>>>> 760b1822e37f10ac19720919150a688b10142dce
}

let espree_cached = null
async function get_espree() {
  if (espree_cached) {
    return espree_cached
  }
  espree_cached = await SystemJS.import('espree')
  return espree_cached
}

let eslint_cached = null
async function get_eslint() {
  if (eslint_cached) {
    return eslint_cached
  }
  eslint_cached = await SystemJS.import('eslint')
  return eslint_cached
}

async function run_eslint_checks(text) {
  let eslint = await get_eslint()
  let eslint_config = {"parserOptions":{"sourceType":"module","ecmaVersion":8,"ecmaFeatures":{"impliedStrict":1}},"extends":["eslint:recommended","plugin:import/errors","plugin:import/warnings","plugin:habitlab/standard"],"env":{"es6":1,"browser":1,"webextensions":1,"commonjs":1},"globals":{"SystemJS":1,"require":1,"require_component":1,"exports":1,"module":1,"console":1,"Polymer":true,"intervention":true,"positive_goal_info":true,"goal_info":true,"tab_id":true,"Buffer":true,"dlog":true,"parameters":true,"set_default_parameters":true},
<<<<<<< HEAD
  "rules":{"no-console":0,"no-unused-vars":1,"require-yield":1,"no-undef":1,"comma-dangle":["warn","only-multiline"]}}
=======
    "rules":{"no-console":0,"no-unused-vars":1,"require-yield":1,"no-undef":1,"comma-dangle":["warn","only-multiline"]}}
>>>>>>> 760b1822e37f10ac19720919150a688b10142dce
  let errors = eslint.linter.verify(text, eslint_config)
  return errors
}

async function parse_text(text) {
  let espree = await get_espree()
  return espree.parse(text, {tolerant: true, ecmaVersion: 8})
}

async function run_all_checks(js_editor, text) {
  let output = await run_eslint_checks(text)
  let ast = await parse_text(text)
  let rules = [
    list_missing_imports
  ]
  for (let rule of rules) {
    output = await rule(js_editor, ast, output, text)
  }
  return output
}

module.exports = {
  run_all_checks
}

