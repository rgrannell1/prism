;( function () {
	"use strict"
} )()

rhighlight = ( function () {
	/* global object for highlight.js (great name, huh?).
	  released under the GLP-3, copyright Ryan Grannell. */

		var StateMachine = function (states, outputs) {
			// returns a finite-state machine.

			var self = {
				depth: 0,
				transitions: states,
				htmlOutputRules: outputs( this.depth )
			}

			self.consumeToken = function (token) {
				/* takes a single token, updates internal state if
				 the token caused a state -> state transition. returns a
				 pretty html string to the user. */

				var htmlOutput = function (source, target, token) {
					/* takes a source state, target state and a token that
					 triggered the transition. returns a html string that
					 styles the input token. */

					var stateRules = self.htmlOutputRules[source][target]
					var htmlString = token

					for (var candidate in stateRules) {
						if (!stateRules.hasOwnProperty(candidate)) {
							continue
						}
						if (candidate !== '*nomatch*' && candidate === token) {
							htmlString = stateRules[candidate]
						}
					}

					return htmlString
				}

				var changeDelimiterDepth = function (source, target, depth) {
					// change r output depth based on transition

					var delimiterOpened =
						(source === 'normal' &&
							target === 'open_delim') ||
						(source === 'open_delim' &&
							target === 'open_delim')

					var delimitedClosed =
						(source === 'close_delim' &&
							target === 'normal') ||
						(source === 'close_delim' &&
							target === 'close_delim')

					if (delimiterOpened) {
						depth += 1
						if (depth > 13) depth = 0
					} else if (delimitedClosed) {
						depth -= 1
						if (depth < 0) depth = 13
					}

					self.depth = depth
					self.htmlOutputRules = htmlOutputRules(depth)

					return {
						"depth": depth,
						"htmlOutputRules": htmlOutputRules(depth)
					}
				}

				for (var transition in self.transitions) {
					if (!self.transitions.hasOwnProperty(transition)) {
						continue
					}

					if (self.transitions[transition].active) {
						var active = self.transitions[transition]
						var oldState = transition
					}
				}

				var newState = active.edges['*nomatch*']

				for (var edge in active.edges) {
					if (!active.edges.hasOwnProperty(edge)) {
						continue
					}
					if (token === edge) {
						newState = active.edges[edge]
					}
				}

				self.transitions[oldState].active = false
				self.transitions[newState].active = true

				changeDelimiterDepth(oldState, newState, self.depth)

				return htmlOutput(oldState, newState, token)

			}
			return self
		}

		var rTransitions = ( function () {
			/* returns an object which contains objects - one for each possible state -
			 which contain an active field (is this the state we're currently on?) and
			 edges: tokens that trigger a state change.

			 {
				'state name' (1): {
					active (2) : true or false,
					edges (3): {
						"pattern" (4): 'state name',
						"*nomatch*" (5): 'state name'
					}
				},
				...
			 }
			  1: 'state'. an arbitrary string, one of several states a machine may occupy.
			      key is bound to an object described below.

			  2: active. a boolean value, denoting whether the
			      enclosing state is currently active.

			  3: edges. an object containing pattern: newstate pairs. These pairs are
			      edges between state nodes on a graph, that are followed if the
			      pattern is matched exactly.

			  4: "pattern". an arbitrary string. If an incoming token matches pattern
			      then the edge is followed.

			  5: "*nomatch*": a special pattern inside each edges object; if no
			      pattern matches the token, use the state name bound to this object.
			      not currently required by highlight.

			 */

			return {
				// singly-quoted string.
				// can transition to normal state, or itself.

				'str_single': {
					'active': false,
					'edges': {
						"'": 		'normal',
						'*nomatch*': 	'str_single'
					}
				},
				// doubly-quoted string.
				// can transition to normal state, or itself.

				'str_double': {
					'active': false,
					'edges': {
						'"': 		'normal',
						'*nomatch*': 	'str_double'
					}
				},
				// normal
				// the starting state. transitions upon encountering
				// delimiters, strings or comments

				'normal': {
					'active': true,
					'edges': {
						"'": 		'str_single',
						'"': 		'str_double',
						'#': 		'comment',

						'(': 		'open_delim',
						'[': 		'open_delim',
						'{': 		'open_delim',

						'}': 		'close_delim',
						']': 		'close_delim',
						')': 		'close_delim',

						'*nomatch*': 	'normal'
					}
				},
				// open delimiter
				// transitions upon encountering
				// delimiters, strings or comments

				'open_delim': {
					'active': false,
					'edges': {
						"'": 		'str_single',
						'"': 		'str_double',
						'#': 		'comment',

						'(': 		'open_delim',
						'[': 		'open_delim',
						'{': 		'open_delim',

						'}': 		'close_delim',
						']': 		'close_delim',
						')': 		'close_delim',

						'*nomatch*': 	'normal'
					}
				},
				// close delimiter
				// transitions upon encountering
				// delimiters, strings or comments

				'close_delim': {
					'active': false,
					'edges': {
						"'": 		'str_single',
						'"': 		'str_double',
						'#': 		'comment',

						'(': 		'open_delim',
						'[': 		'open_delim',
						'{': 		'open_delim',

						'}': 		'close_delim',
						']': 		'close_delim',
						')': 		'close_delim',

						'*nomatch*': 	'normal'
					}
				},
				// comment
				// comment state reverts to normal on newline.
				'comment': {
					'active': false,
					'edges': {
						'\n': 		'normal',
						'*nomatch*': 	'comment'
					}
				}
			}
		} )()


		var htmlOutputRules = function (depth) {
			/* generates an object describing state-state transitions for
			  the R grammar highlighter each edge is associated with some html output.
			  The output is dependent on depth,
			  a global variable denoting how many depths nested the state machine
			  parsing this grammar currently is. Each input token is associated
			  with an output html string.

			  {
			      'state a name' (1): {
			          'state b name' (2): {
			              'token' (3): 'html',
			              '*nomatch*': '*token*' (4)
			          },
			          ...
			      },
			      ...
			  }

			  1. 'state a name'. an arbitrary string, the name of the state being transitioned from.

			  2. 'state b name'. an arbitrary string, the name of the state being transitioned to.

			  3. 'token'. a single input character to be styled with html.

			  4. '*token*'. not currently used, but will return the input token unmodified if
			      implemented in the future.


			*/

			var span = {
				// create span tags.
				open: function (htmlClass) {
					return '<span class = "' + htmlClass + '">'
				},
				close: function () {
					return '</span>'
				},
				both: function (htmlClass, content) {
					return '<span class="' + htmlClass + '">' + content + '</span>'
				}
			}

			var depthDependentOutput = function (depth) {
				/* the html output associated with certain tokens
				 when in normal or delimiter states. */

				return {
					'str_single': {
						"'": 		span.open("sstring") + "'"
					},
					'str_double': {
						'"': 		span.open("dstring") + '"'
					},
					'normal': {
						'$': 		span.both('dollar', '$'),
						',': 		span.both('comma lev' + depth, ','),
						'*nomatch*': 	'*token*'
					},
					'comment': {
						'#': 		span.open('comment') + '#'
					},
					'open_delim': {
						'(': 		span.both('lev' + depth, '('),
						'[': 		span.both('lev' + depth, '['),
						'{': 		span.both('lev' + depth, '{')
					},
					'close_delim': {
						')': 		span.both('lev' + depth, ')'),
						']': 		span.both('lev' + depth, ']'),
						'}': 		span.both('lev' + depth, '}')
					}
				}
			}

			return {
				'str_single': {
					'str_single': {
						'"': 			span.both("ssdouble", '"'),
						'*nomatch*': 	'*token*'
					},
					'normal': {
						"'": 			"'" + span.close()
					}
				},
				'str_double': {
					'str_double': {
						"'": 			span.both("dssingle", "'"),
						'*nomatch*': 	'*token*'
					},
					'normal': {
						'"': '			"' + span.close()
					}
				},
				'normal': 				depthDependentOutput(depth),
				'open_delim': 			depthDependentOutput(depth),
				'close_delim': 			depthDependentOutput(depth),
				'comment': {
					'normal': {
										'\n': '\n' + span.close()
					},
					'comment': {
										'*nomatch*': '*token*'
					}
				}
			}
		}


		var highlightText = function (text) {
			/* given (presumably legal) R code as a single string,
			 return a string of higlighted R code */

			var highlightedCode = ''
			var rStateMachine = StateMachine(rTransitions, htmlOutputRules)

			for (var ith = 0; ith < text.length; ith++) {

				var token = text.substring(ith, ith + 1)
				highlightedCode =
					highlightedCode + rStateMachine.consumeToken(token)

			}

			return highlightedCode
		}

		var highlightSelector = function (selector, tag) {
			/* run a state machine over all .r classes in
			   the DOM. */

			$(selector).replaceWith( function (index, content) {
				return tag( highlightText($(this).text()) )
			} )

		}

		return {
			StateMachine: 		StateMachine,
			highlightText: 		highlightText,
			highlightSelector: 	highlightSelector
		}

} )()
