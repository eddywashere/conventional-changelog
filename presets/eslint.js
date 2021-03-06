'use strict';
var dateFormat = require('dateformat');
var Q = require('q');
var readFile = Q.denodeify(require('fs').readFile);
var resolve = require('path').resolve;
var semver = require('semver');
var through = require('through2');

var regex = /tag:\s*[v=]?(.+?)[,\)]/gi;

function presetOpts(cb) {
  var parserOpts = {
    headerPattern: /^(\w*)\: (.*?)(?:\((.*)\))?$/,
    headerCorrespondence: [
      'tag',
      'message'
    ]
  };

  var transform = through.obj(function(chunk, enc, cb) {
    if (typeof chunk.gitTags === 'string') {
      var match = regex.exec(chunk.gitTags);
      regex.lastIndex = 0;

      if (match) {
        chunk.version = match[1];
      }
    }

    if (chunk.committerDate) {
      chunk.committerDate = dateFormat(chunk.committerDate, 'yyyy-mm-dd', true);
    }

    cb(null, chunk);
  });

  var writerOpts = {
    transform: function(commit) {
      if (!commit.tag || typeof commit.tag !== 'string') {
        return;
      }

      return commit;
    },
    groupBy: 'tag',
    commitGroupsSort: 'title',
    commitsSort: ['tag', 'message'],
    generateOn: function(commit) {
      return semver.valid(commit.version);
    }
  };

  Q.all([
    readFile(resolve(__dirname, '../templates/eslint/template.hbs'), 'utf-8'),
    readFile(resolve(__dirname, '../templates/eslint/header.hbs'), 'utf-8'),
    readFile(resolve(__dirname, '../templates/eslint/commit.hbs'), 'utf-8')
  ])
    .spread(function(template, header, commit) {
      writerOpts.mainTemplate = template;
      writerOpts.headerPartial = header;
      writerOpts.commitPartial = commit;

      cb(null, {
        parserOpts: parserOpts,
        transform: transform,
        writerOpts: writerOpts
      });
    });
}

module.exports = presetOpts;
