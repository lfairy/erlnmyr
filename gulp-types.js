var assert = require('chai').assert;

var unit = 'unit';
var string = 'string';
var JSON = 'JSON';
var experiment = 'experiment';

var primitives = {unit: true, string: true, JSON: true, experiment: true};

function isPrimitive(type) {
  return primitives[type] == true || isTypeVar(type);
}

var typeVarID = 0;

function newTypeVar() {
  return {tVar: typeVarID++};
}

function isTypeVar(type) {
  return typeof type == 'object' && type.tVar !== undefined;
}

function List(type) {
  return {base: type};
}

function isList(type) {
  return typeof type == 'object' && type.base !== undefined;
}

function delist(type) {
  assert.isTrue(isList(type));
  return type.base;
}

function Tuple(left, right) {
  return {left: left, right: right};
}

function isTuple(type) {
  return typeof type == 'object' && type.left !== undefined && type.right !== undefined;
}

function leftType(type) {
  assert.isTrue(isTuple(type));
  return type.left;
}

function rightType(type) {
  assert.isTrue(isTuple(type));
  return type.right;
}

// string-keyed maps
function Map(type) {
  return {value: type};
}

function isMap(type) {
  return typeof type == 'object' && type.value !== undefined;
}

function demap(type) {
  assert.isTrue(isMap(type));
  return type.value;
}

function substitute(type, coersion) {
  assert.isTrue(isPrimitive(type) && isTypeVar(type), type + ' is a primitive type var');
  var subs = {};
  subs.value = coersion[type.tVar];
  subs.coersion = {};
  for (key in coersion) {
    if (key == type.tVar)
      continue;
    subs.coersion[key] = coersion[key];
  }
  return subs;
}

// TODO complete this, deal with multiple type vars if they ever arise.
function coerce(left, right, coersion, visited) {
  visited = visited || [];
  // 'a -> 'a, string -> string, JSON -> JSON, etc.
  if (left == right)
    return coersion;

  if (isList(left) && isList(right)) {
    return coerce(delist(left), delist(right), coersion);
  }

  if (isTuple(left) && isTuple(right)) {
    var leftCoerce = coerce(leftType(left), leftType(right), coersion);
    var rightCoerce = coerce(rightType(left), rightType(right), coersion);
    if (leftCoerce == undefined || rightCoerce == undefined)
      return undefined;
    for (key in rightCoerce)
      leftCoerce[key] = rightCoerce[key];
    return leftCoerce;
  }

  if (isMap(left) && isMap(right)) {
    return coerce(demap(left), demap(right), coersion);
  }

  // 'a -> 'b
  if (isTypeVar(left) && isTypeVar(right)) {
    var result = left;
    while (isTypeVar(result) && coersion[result.tVar] !== undefined)
      result = coersion[result.tVar];
    left = result;
  }

  // 'a -> string
  // In this instance, 'a has already been introduced,
  // so we must actually check that it type-matches the RHS.
  if (isTypeVar(left)) {
    var subs = substitute(left, coersion);
    if (subs.value == undefined) {
      coersion[left.tVar] = right;
      return coersion;
    }
    if (isTypeVar(subs.value) && visited.indexOf(subs.value.tVar) !== -1)
      return undefined;
    visited.push(subs.value.tVar);
    var coersion = coerce(subs.value, right, coersion, visited);
    return coersion;
  }

  // string -> 'a
  if (isTypeVar(right)) {
    coersion[right.tVar] = left;
    return coersion;
  }

  return undefined;
}

for (primitive in primitives)
  module.exports[primitive] = primitive;
module.exports.newTypeVar = newTypeVar;
module.exports.List = List;
module.exports.Tuple = Tuple;
module.exports.Map = Map;
module.exports.coerce = coerce;
 
