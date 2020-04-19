// @flow

import {
  ClassDoc,
  MethodDoc,
  Tag,
} from '@webdoc/js-docmodel';

import {
  Node,
} from '@babel/types';

const TAG_MAP = {
  'class': ClassDoc,
  'method': MethodDoc,
};

const NODE_MAP = {
  'ClassDeclaration': ClassDoc,
  'ClassMethod': MethodDoc,
};

function createDoc(options) {
  const {tags, node} = options;

  for (let i = 0; i < tags.length; i++) {
    if (TAG_MAP[tags[i].name]) {
      return new TAG_MAP[tags[i].name](options);
    }
  }

  if (node && NODE_MAP[node.type]) {
    return new NODE_MAP[node.type](options);
  }

  return null;
}

function getLocalName(node: Node) {
  if (node.id) {
    return node.id.name;
  } else if (node.key) {
    return node.key.name;
  }

  return null;
}

/**
 * Transforms the Babel AST node into a Doc, if documentation has been added.
 * @param {Node} node
 * @param {RootDoc} root - the documentation tree
 * @return {Doc}
 */
export function transform(node, root) {
  if (!node.leadingComments) {
    return;
  }
  let input = node.leadingComments[node.leadingComments.length - 1].value;

  if (!input) {
    return;
  }

  input = input.split('\n');

  const tags = [];

  for (let i = 0; i < input.length; i++) {
    input[i] = input[i].trim();

    if (input[i].startsWith('*')) {
      input[i] = input[i].replace('*', '').trimStart();
    }

    if (input[i].startsWith('@')) {
      const tokens = input[i].split(' ');
      const tag = tokens[0].replace('@', '');

      //      console.log(tokens);
      tags.push(new Tag({name: tag}));
      // result.node = node;
    }
  }

  const doc = createDoc({
    tags,
    localName: getLocalName(node),
    node,
  });

  for (let i = 0; i < tags.length; i++) {
    tags.doc = doc;
  }

  return doc;
}
