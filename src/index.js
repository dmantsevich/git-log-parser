'use strict';

const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
var traverse = require('traverse');
var fields   = require('./fields');
var toArgv   = require('argv-formatter').format;

var END = '==END==';
var FIELD = '==FIELD==';

function format (fieldMap) {
  return fieldMap.map((field) => `%${field.key}`).join(FIELD) + END;
}

function args (config, fieldMap) {
  config.format = format(fieldMap);
  return toArgv(config);
}

async function extractLogs(args) {
  const { stdout, stderr } = await exec(`git --no-pager log ${args.join(' ')}`);
  if (stderr) {
    console.error(stderr);
    return null;
  }
  return stdout;
}

exports.parse = async function parse (config, onCommit) {
  config  = config || {};
  const map = fields.map();
  const results = await extractLogs(args(config, map));
  results && results.toString().split(END).map((chunk) => {
    const fields = chunk.toString('utf8').trim().split(FIELD);
    const commit = map.reduce((parsed, field, index) => {
      var value = fields[index];
      traverse(parsed).set(field.path, field.type ? new field.type(value) : value);
      return parsed;
    }, {});
    commit.subject && onCommit && onCommit(commit);
  });
  return results;
};

exports.fields = fields.config;
