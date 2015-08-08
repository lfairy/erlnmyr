/*
  Copyright 2015 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

var stageLoader = require('../core/stage-loader');
var captureController = require('../lib/test-phases').controller;
var assert = require('chai').assert;

function testPipeline(stageList, incb) {
  var cb = function(data) { incb(); };
  var err = function(e) { throw e; };
  stageLoader.startPipeline(stageList).then(incb);
}

function experiment(name) {
  return [{name: 'input', options: {data: name + '.erlnmyr'}}, 'fileToString', 'doExperiment'];
}

function wentThrough(event, name) {
  for (var i = 0; i < event.tags.trace.length; i++) {
    if (event.tags.trace[i].phase.name == name)
      return true;
  }
  return false;
}

function assertPath(event, list) {
  assert(event.tags.trace.length <= list.length);
  for (var i = 0; i < list.length; i++)
    assert(event.tags.trace[i].phase.name == list[i]);
}


describe('experiments', function() {

  before(function() {
    process.chdir('tests/experiment');
  });
  after(function() {
    process.chdir('../..');
  });

  it('should be able to branch', function(done) {
    testPipeline(experiment('simple-branch'), function() {
      var events = captureController.getInvocations();
      assert(events.length == 2);
      assert(events[0].name == events[1].name, "data was duplicated in branch");
      assert(wentThrough(events[0], 't1To1') !== wentThrough(events[1], 't1To1'),
          "only one copy of data went through each branch");
      done();
    });
  });

  it('should deal with a harder branch scenario (1)', function(done) {
    testPipeline(experiment('harder-branch-1'), function() {
      var events = captureController.getInvocations();
      assert(events.length == 2);
      assert(events[0].name == events[1].name, "data was duplicated in branch");
      if (wentThrough(events[0], 't1To1')) {
        assertPath(events[0], ['t0ToN', 't1To1', 't1To1']);
        assert(!wentThrough(events[1], 't1To1'))
      } else {
        assertPath(events[1], ['t0ToN', 't1To1', 't1To1']);
        assert(!wentThrough(events[0], 't1To1'))
      }
      done();
    });
  });

  it('should deal with a harder branch scenario (2)', function(done) {
    testPipeline(experiment('harder-branch-2'), function() {
      var events = captureController.getInvocations();
      assert(events.length == 2);
      assert(events[0].name == events[1].name, "data was duplicated in branch");
      if (wentThrough(events[0], 't1To1')) {
        assertPath(events[0], ['t0ToN', 't1To1', 't1To1']);
        assert(!wentThrough(events[1], 't1To1'))
      } else {
        assertPath(events[1], ['t0ToN', 't1To1', 't1To1']);
        assert(!wentThrough(events[0], 't1To1'))
      }
      done();
    });
  });

  it('should collect multiple inputs in an N-to-1 phase', function(done) {
    testPipeline(experiment('n-to-1'), function() {
      var events = captureController.getInvocations();
      assert(events.length == 1);
      assert(events[0].tags.traceHistory.length == 5);
      done();
    });
  });

  it('should collect multiple inputs in an N-to-1 phase with a fork', function(done) {
    testPipeline(experiment('n-to-1-fork'), function() {
      var events = captureController.getInvocations();
      assert(events.length == 1);
      assert(events[0].tags.traceHistory.length == 5);
      done();
    });
  });

  it('should deal with inputs from multiple sources', function(done) {
    testPipeline(experiment('multiple-inputs'), function() {
      var events = captureController.getInvocations();
      assert(events.length == 2);
      assert(events[0].input !== events[1].input, "data items are different");
      assert(events[0].tags.trace[0].name !== events[1].tags.trace[0].name,
          "data items did not originate from same input");
      done();
    });
  });

  it('should be able to recursively launch experiments', function(done) {
    testPipeline(experiment('load-experiment'), function() {
      var events = captureController.getInvocations();
      assert(events[1].input !== events[2].input, "data items are different");
      assert(events[1].tags.trace[0].name !== events[2].tags.trace[0].name,
          "data items did not originate from same input");
      done();
    });
  });
});

